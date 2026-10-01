"""Inference CLI: score flow telemetry and emit SOC alerts.

This is the contract the backend team codes against. Point it at a CSV of raw
CIC-style flow records (or pipe a JSON object/array of flow fields) and it
prints ``signsight.soc-alert/v1`` JSON on stdout, ready to POST to a SIEM.

    # batch CSV -> NDJSON alerts
    python -m model.infer --input flows.csv --format ndjson

    # a single flow pasted from a Zeek/Suricata record
    python -m model.infer --json '{"Src IP":"10.0.0.5","Dst Port":4444, ...}'

    # summary only, no per-flow payload
    python -m model.infer --input flows.csv --summary

The model never blocks traffic. ``blocking`` is hard-coded false in the alert
schema - see :mod:`model.pipeline` for why.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from .config import DEFAULT_ARTIFACT_DIR
from .pipeline import HybridNIDSModel

__all__ = ["load_model", "score_frame", "main"]


def load_model(path=None) -> HybridNIDSModel:
    path = Path(path or DEFAULT_ARTIFACT_DIR / "signsight_hybrid.joblib")
    if not path.exists():
        raise SystemExit(
            f"model artefact not found at {path}\n"
            "train one first:  python -m model.train"
        )
    return HybridNIDSModel.load(path)


def _read_input(args) -> pd.DataFrame:
    if args.json:
        payload = json.loads(args.json)
        if isinstance(payload, dict):
            payload = [payload]
        frame = pd.DataFrame(payload)
        frame.columns = [str(c).strip() for c in frame.columns]
        return frame
    frame = pd.read_csv(args.input, encoding="latin-1", low_memory=False)
    frame.columns = [str(c).strip() for c in frame.columns]
    return frame


def score_frame(model: HybridNIDSModel, frame: pd.DataFrame) -> dict:
    """Single pass over a frame -> probabilities, alerts and a quick summary."""
    frame = frame.reset_index(drop=True)
    proba, anomaly = model.score_frame(frame)
    alerts = model.triage(frame)
    summary = {
        "n_flows": int(len(frame)),
        "n_alerts": len(alerts),
        "alert_rate": float(len(alerts) / len(frame)) if len(frame) else 0.0,
        "alert_threshold": float(model.threshold_),
        "max_attack_probability": float(proba.max()) if len(proba) else 0.0,
        "mean_attack_probability": float(proba.mean()) if len(proba) else 0.0,
        "n_stage1_outliers": int((anomaly > model.novelty_cut_).sum()),
        "severity_breakdown": {
            sev: sum(1 for a in alerts if a["severity"] == sev)
            for sev in ("CRITICAL", "HIGH", "MEDIUM")
        },
        "verdict_breakdown": _count(a["verdict"] for a in alerts),
    }
    return {"summary": summary, "alerts": alerts, "proba": proba, "anomaly": anomaly}


def _count(values) -> dict:
    out: dict[str, int] = {}
    for v in values:
        out[v] = out.get(v, 0) + 1
    return dict(sorted(out.items(), key=lambda kv: -kv[1]))


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(
        description="Score flow telemetry with the SignSight hybrid NIDS",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--input", help="CSV file of flow records")
    src.add_argument("--json", help="JSON object or array of flow records")
    parser.add_argument("--model", default=None, help="path to signsight_hybrid.joblib")
    parser.add_argument(
        "--format", choices=["json", "ndjson"], default="json",
        help="json = one array (SIEM bulk), ndjson = one object per line (streaming)",
    )
    parser.add_argument("--output", default=None, help="write here instead of stdout")
    parser.add_argument("--summary", action="store_true", help="summary only, no alerts")
    parser.add_argument("--limit", type=int, default=50, help="max alerts to print")
    parser.add_argument("--threshold", type=float, default=None, help="override alert cut")
    parser.add_argument(
        "--include-benign", action="store_true",
        help="emit an INFO record for every non-alerting flow (debug only)",
    )
    args = parser.parse_args(argv)

    model = load_model(args.model)
    if args.threshold is not None:
        model.set_threshold(args.threshold)

    frame = _read_input(args)
    result = score_frame(model, frame)
    result["summary"]["model"] = {
        "name": model.cfg.model_name,
        "version": model.cfg.version,
        "trained_at": model.fitted_at_,
    }

    if args.summary:
        payload: object = result["summary"]
    elif args.format == "ndjson":
        payload = [json.dumps(a) for a in result["alerts"][: args.limit]]
    else:
        payload = {
            "summary": result["summary"],
            "alerts": result["alerts"][: args.limit],
        }

    text = (
        "\n".join(payload)
        if isinstance(payload, list)
        else json.dumps(payload, indent=2, default=str)
    )
    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
        print(f"[*] wrote {args.output}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()