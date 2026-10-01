"""Loading and feature engineering for CICIDS2017-improved flow telemetry."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .config import (
    ALL_DAYS,
    ATTEMPTED_SUFFIX,
    BENIGN_LABEL,
    DAY_FILES,
    IDENTIFIER_COLUMNS,
    LABEL_COLUMNS,
    sanitize_feature_name,
)

__all__ = ["FlowPreprocessor", "load_days", "load_day", "build_xy", "DAY_COLUMN"]

#: Column injected by :func:`load_days` recording which capture a flow came
#: from.  It is *never* a model feature - it exists to enable day-wise splits.
DAY_COLUMN = "__day__"

_NUMERIC_DTYPES = [np.float32, np.float64, np.int16, np.int32, np.int64]


# ------------------------------------------------------------------- io -----
def load_day(day: str, data_dir) -> pd.DataFrame:
    """Read one capture. ``day`` is the short token, e.g. ``"wed"``."""
    if day not in DAY_FILES:
        raise KeyError(f"unknown day token {day!r}; expected one of {sorted(DAY_FILES)}")
    path = data_dir / DAY_FILES[day]
    frame = pd.read_csv(path, encoding="latin-1", low_memory=False)
    frame.columns = [str(c).strip() for c in frame.columns]
    frame[DAY_COLUMN] = day
    return frame


def load_days(days=None, data_dir=None) -> pd.DataFrame:
    """Concatenate the requested captures (all five by default)."""
    from .config import DEFAULT_DATA_DIR

    days = list(ALL_DAYS if days is None else days)
    data_dir = DEFAULT_DATA_DIR if data_dir is None else data_dir
    frames = [load_day(d, data_dir) for d in days]
    return pd.concat(frames, ignore_index=True)


# --------------------------------------------------------- preprocessing ---
def _subnet(ip: str) -> str:
    """Coarse /24 segment - a stable proxy for 'internal zone' in a SOC."""
    ip = str(ip)
    parts = ip.split(".")
    if len(parts) == 4:
        return ".".join(parts[:3])
    return ip


def _hour_of_day(timestamp: pd.Series) -> pd.Series:
    """Cyclical hour-of-day. Falls back to NaN (routed by LightGBM) if unparseable."""
    parsed = pd.to_datetime(timestamp, errors="coerce", format="mixed")
    return parsed.dt.hour.astype(np.float32)


#: Side -> source column, in the order the derived features are appended.
_SUBNET_SOURCES: tuple[tuple[str, str], ...] = (("src", "Src IP"), ("dst", "Dst IP"))


def _subnet_columns(df: pd.DataFrame) -> list[str]:
    """Which subnet features apply to *this* frame (order is fixed)."""
    return [side for side, col in _SUBNET_SOURCES if col in df.columns]


def _subnet_codes(
    derived: pd.DataFrame, side: str, vocab: dict[str, int]
) -> pd.Series:
    """Segment ids for one side of the flow; -1 marks an unseen segment.

    Unknown segments are not an error - a SOC routinely sees new /24s, and
    bucketing them as their own value is exactly the behaviour we want.
    """
    col = dict(_SUBNET_SOURCES)[side]
    if col not in derived.columns:
        return pd.Series(-1, index=derived.index, dtype=np.float32)
    return (
        derived[col]
        .map(_subnet)
        .map(lambda seg: vocab.get(seg, -1))
        .astype(np.float32)
    )


class FlowPreprocessor:
    """Turn raw flow records into the model's numeric feature matrix.

    Responsibilities (kept in one place so training and live inference cannot
    drift apart):

    * drop capture identifiers and the disguised label column,
    * derive calendar + network-segment features,
    * neutralise ``inf`` (division-by-zero artefacts in the CIC ratio columns),
    * expose a median-imputed view for stage 1, which - unlike LightGBM - cannot
      route missing values through its splits.

    Missing values are *not* imputed for stage 2: NaN is a first-class citizen
    in LightGBM's histogram splits and preserves real signal, whereas blanket
    median imputation destroys the "this flow had a zero-duration divide"
    signal entirely.
    """

    def __init__(self) -> None:
        self.raw_features_: list[str] = []
        self.rename_map_: dict[str, str] = {}
        self.feature_names_: list[str] = []
        self.subnet_vocab_: dict[str, int] = {}
        self.medians_: pd.Series | None = None

    # -- fitting ---------------------------------------------------------
    def fit(self, df: pd.DataFrame) -> "FlowPreprocessor":
        derived = self._derive(df)
        dropped = set(IDENTIFIER_COLUMNS) | set(LABEL_COLUMNS) | {DAY_COLUMN, "Label"}
        self.raw_features_ = [c for c in derived.columns if c not in dropped]

        vocab: dict[str, int] = {}
        for col in ("Src IP", "Dst IP"):
            if col in df.columns:
                for seg in df[col].map(_subnet).unique():
                    vocab.setdefault(seg, len(vocab))
        self.subnet_vocab_ = vocab

        # Raw -> sanitised name map, fixed at fit time. `transform` renames with
        # this dict rather than assigning a positional index, so a frame that
        # omits a column (and therefore has fewer subnet columns) cannot
        # misalign every feature downstream.
        self.rename_map_ = {
            c: sanitize_feature_name(c) for c in self.raw_features_
        }
        names = list(self.rename_map_.values())
        names += [f"{s}_subnet_id" for s in _subnet_columns(df)]
        self.feature_names_ = names

        matrix = self._assemble(df, derived).rename(columns=self.rename_map_)
        matrix = matrix.reindex(columns=self.feature_names_)
        finite = matrix.replace([np.inf, -np.inf], np.nan)
        self.medians_ = finite.median().fillna(0.0).astype(np.float32)
        return self

    # -- transform -------------------------------------------------------
    def transform(self, df: pd.DataFrame, impute: bool = False) -> pd.DataFrame:
        """Return the float32 feature matrix.

        ``impute=True`` fills NaN/inf with the training medians and is required
        by :class:`sklearn.ensemble.IsolationForest`.

        Column order comes from ``fit``, never from the incoming frame, and any
        flow field the model was trained on but the caller omitted comes back as
        NaN rather than shifting every subsequent feature by one - that keeps
        single-record inference safe even when a sensor reports a subset of the
        CIC header.
        """
        if not self.feature_names_:
            raise RuntimeError("FlowPreprocessor.fit must be called before transform")
        derived = self._derive(df)
        # _assemble reindexes onto the fitted *raw* column list, so any flow field
        # the caller omitted arrives as an all-NaN column rather than shifting the
        # rest of the matrix. Rename via the fitted map, then reindex onto the
        # full feature list to restore the fixed order (and to add subnet columns
        # this particular frame lacked). Both come from fit, never from input.
        matrix = self._assemble(df, derived).rename(columns=self.rename_map_)
        matrix = matrix.reindex(columns=self.feature_names_)
        if impute:
            assert self.medians_ is not None, "medians_ required for imputation"
            matrix = matrix.replace([np.inf, -np.inf], np.nan).fillna(self.medians_)
        return matrix.astype(np.float32)

    def flow_metadata(self, df: pd.DataFrame) -> pd.DataFrame:
        """Identity fields we echo back inside SOC alerts (never modelled)."""
        wanted = ["Flow ID", "Src IP", "Src Port", "Dst IP", "Dst Port",
                  "Protocol", "Timestamp"]
        cols = [c for c in wanted if c in df.columns]
        return df[cols].reset_index(drop=True)

    # -- internals -------------------------------------------------------
    @staticmethod
    def _derive(df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        if "Timestamp" in out.columns:
            hour = _hour_of_day(out["Timestamp"])
            out["Hour Of Day"] = hour
            # sin/cos encode the wrap-around at midnight that a raw hour cannot.
            radians = 2.0 * np.pi * hour.fillna(12.0) / 24.0
            out["Hour Cyclic Sin"] = np.sin(radians)
            out["Hour Cyclic Cos"] = np.cos(radians)
        return out

    def _assemble(self, df: pd.DataFrame, derived: pd.DataFrame) -> pd.DataFrame:
        matrix = derived.reindex(columns=self.raw_features_).copy()
        numeric = matrix.select_dtypes(include=_NUMERIC_DTYPES).columns
        matrix[numeric] = matrix[numeric].astype(np.float32)

        for side in _subnet_columns(df):
            matrix[f"{side}_subnet_id"] = _subnet_codes(
                derived, side, self.subnet_vocab_
            )

        return matrix.replace([np.inf, -np.inf], np.nan)


# -------------------------------------------------------------- labelling ---
def normalise_labels(series: pd.Series, include_attempted: bool = True) -> pd.Series:
    """Map CICIDS2017 label strings to ``{0: benign, 1: attack, 2: unattempted}``.

    ``X - Attempted`` flows carry the malicious *intent* of a scan or exploit
    that did not complete.  SOCs want to see them, but they are materially
    easier to separate than successful attacks, so they are kept as a distinct
    class rather than being silently merged into either extreme.
    """
    text = series.astype(str).str.strip()
    attempted = text.str.endswith(ATTEMPTED_SUFFIX)
    out = pd.Series(np.where(text == BENIGN_LABEL, 0, 1), index=text.index, dtype=np.int8)
    if not include_attempted:
        out[attempted] = 0
    return out


def attack_family(series: pd.Series, include_attempted: bool = True) -> pd.Series:
    """Attack family name (used only by the optional triage head)."""
    text = series.astype(str).str.strip()
    if include_attempted:
        text = text.str.replace(ATTEMPTED_SUFFIX, "", regex=False)
    return text.str.strip()


def build_xy(
    df: pd.DataFrame, pre: FlowPreprocessor | None = None, impute: bool = False
) -> tuple[pd.DataFrame, np.ndarray]:
    """``(features, binary label)`` for stage 1 / stage 2 training."""
    pre = pre or FlowPreprocessor().fit(df)
    x = pre.transform(df, impute=impute)
    y = normalise_labels(df["Label"], include_attempted=True)
    return x, y.to_numpy()