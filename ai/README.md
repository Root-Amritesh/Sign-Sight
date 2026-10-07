# SignSight ML NIDS

A two-stage network intrusion detector that generates **SOC triage alerts** from
netflow telemetry. Stage 1 is an unsupervised Isolation Forest fitted on clean
traffic; stage 2 is a supervised LightGBM classifier that consumes the flow
features *plus* the stage 1 anomaly score.

Trained on **CICIDS2017-improved** (`datasets/cicimp/`), 2.1M flows across five
working days, 78 engineered features.

---

## Quick start

```bash
pip install -r requirements.txt

# full leave-one-day-out evaluation + production artefact (~10 min)
python -m model.train

# tighter SOC budget, or a subset of days for a quick smoke run
python -m model.train --max-fpr 0.0005
python -m model.train --days mon,tue

# zero-day scenario: train Mon-Thu, test Fri (Portscan/DDoS never seen)
python -m model.train --strategy holdout

# score flows
python -m model.infer --input flows.csv --summary
python -m model.infer --input flows.csv --format ndjson > alerts.jsonl
python -m model.infer --json '{"Src IP":"10.0.0.5","Dst Port":4444,"Flow Duration":120}'
```

Artefacts land in `model/artifacts/`:

| file | purpose |
| --- | --- |
| `signsight_hybrid.joblib` | the deployed model (both stages + preprocessor + threshold) |
| `model_card.json` | architecture, params, operating point, top features, env versions |
| `evaluation.json` | LODO metrics, per-fold breakdown, stage 1 ablation, recall/FPR curve |
| `feature_importance.csv` | stage 2 gain share per feature, tagged `stage1` or `flow` |
| `sample_soc_alerts.json` | example alert payloads in the wire format |
| `config.json` | the resolved run configuration |

---

## Architecture

```
raw flow records
      |
      v
  [ FlowPreprocessor ]      drop ids/labels, derive hour + /24 segment,
      |                    inf -> NaN
      v
  [ Stage 1: IsolationForest ]   fitted on BENIGN FLOWS ONLY
      |                           -> anomaly score (higher = further from normal)
      v
  [ Stage 2: LightGBM ]      78 flow features + 1 anomaly score
      |                       -> P(attack)
      v
  [ threshold solver ]      FPR budget + Wilson upper bound
      |
      v
  SOC alert  (schema: signsight.soc-alert/v1)
```

### Stage 1 - Isolation Forest (unsupervised)

Fitted on benign traffic only, so it maps the *boundary* of normal behaviour
rather than memorising attack signatures. Emits a continuous anomaly score per
flow. Because it never saw an attack, it keeps reacting to traffic the
supervised stage has never encountered - the evasion/zero-day path.

### Stage 2 - LightGBM (supervised)

Leaf-wise tree growth over the raw flow features plus the stage 1 score. Known
attacks get precise multivariate boundaries; disguised attacks lean on the
elevated anomaly score to break the benign side of the boundary.

### Operating point

Stage 2 does not pick its own cut-off. The threshold is solved separately
against an explicit false-positive budget, using a **Wilson upper confidence
bound** so the constraint holds on unseen traffic rather than only on the
validation sample. See `model/thresholds.py`.

---

## Two design decisions worth explaining

**No feature scaler.** Both stages are tree ensembles; a monotonic transform of
the inputs cannot change a single split decision. A `RobustScaler` here is pure
overhead and a source of train/serve skew.

**No `class_weight="balanced"`.** Attacks are genuinely rare (~1% of flows) and
that scarcity is informative. Reweighting to a 1:1 ratio inflates every benign
score, destroys calibration, and leaves the threshold solver nothing to tune.
Natural priors are kept and recall is bought at the operating point instead.

---

## Evaluation: leave-one-day-out

CICIDS2017 records a different attack family each day (DoS on Wed, Portscan/DDoS
on Fri). A random `train_test_split` puts near-duplicate neighbours of every
attack on both sides of the split and produces numbers that collapse on contact
with real traffic.

So the headline metric is **LODO**: five folds, each training on four days and
scoring the fifth. Every reported probability is out-of-fold - the flow was
always scored by a model that had never seen its capture. The alert threshold
is solved once on the pooled OOF scores, then locked onto a production model
refit on all five days. The threshold is therefore never chosen from data the
production model trained on.

`evaluation.json` includes a **stage 1 ablation**: LightGBM-only retrained on
identical folds at the identical budget, so the anomaly feature's contribution
is measured rather than assumed.

---

## Alert contract

```json
{
  "schema": "signsight.soc-alert/v1",
  "event_id": "IDS-ML-0481239755",
  "timestamp": "2026-10-01T09:14:22.481203+00:00",
  "verdict": "ATTACK_NOVEL",
  "severity": "CRITICAL",
  "action": "NOTIFY_SOC_ANALYST",
  "blocking": false,
  "flow": {
    "flow_id": "172.16.0.1-172.16.0.2-4444-22-6",
    "src_ip": "172.16.0.1", "src_port": 4444,
    "dst_ip": "172.16.0.2", "dst_port": 22,
    "protocol": 6, "timestamp": "2017-07-28 15:03:11.2"
  },
  "scores": {
    "attack_probability": 0.998311,
    "stage1_anomaly_score": -0.481203,
    "stage1_novelty_cut": -0.455120,
    "alert_threshold": 0.104322
  },
  "detection": {
    "stage1_outlier": true,
    "stage2_alert": true,
    "signature_independent": true
  },
  "triage": {
    "predicted_family": "Portscan",
    "family_confidence": 0.9731,
    "true_label": "Portscan"
  },
  "recommended_action": "Page on-call; isolate the source host pending confirmation.",
  "model": { "name": "signsight-hybrid-if-lgbm", "version": "1.0.0", "architecture": "IsolationForest -> LightGBM" }
}
```

### Fields the backend cares about

- **`action` is always `NOTIFY_SOC_ANALYST`** and **`blocking` is always
  `false`**. An ML score is never sufficient on its own for an inline drop, so
  the pipeline is advisory by construction.
- **`verdict`** - `ATTACK`, `ATTACK_NOVEL` (classified *and* outside the benign
  envelope, so the detection does not depend on a prior signature),
  `NOVEL_SUSPICIOUS` (stage 1 fired, stage 2 lukewarm).
- **`severity`** - `CRITICAL` / `HIGH` / `MEDIUM`, driven by probability plus
  stage 1 novelty.
- **`scores.stage1_anomaly_score`** is sklearn's inverted convention: higher =
  further from normal. `stage1_novelty_cut` is the contamination quantile of the
  benign training scores, i.e. the structural outlier boundary.
- **`triage.true_label` is ground truth** and only present because the sample
  file is scored against labelled data. Strip it in production.
- `event_id` is a CRC32 of the flow ID, so it is stable across processes
  (Python salts string hashing per interpreter).

---

## Layout

```
model/
  config.py       hyperparameters, day->file map, dropped-column policy
  data.py         loading, FlowPreprocessor, label normalisation
  thresholds.py   FPR-budgeted threshold solver + Wilson bound
  pipeline.py     HybridNIDSModel (both stages + alert generation)
  train.py        LODO / holdout evaluation, ablation, artefact export
  infer.py        scoring CLI
  artifacts/      trained model, model card, metrics
```

### Notable API surface

```python
from model import HybridNIDSModel

m = HybridNIDSModel.load("model/artifacts/signsight_hybrid.joblib")

m.attack_probability(frame)   # P(attack) per flow
m.anomaly_score(frame)        # stage 1 only
m.predict(frame)              # binary at the budgeted threshold
m.triage(frame)               # list of SOC alert dicts
m.set_threshold(0.05)         # per-site retune
m.feature_importance()        # gain share, tagged stage1 vs flow
m.summary()                   # human-readable operating point
```

`infer.py` accepts partial records: any flow field omitted comes back as NaN
rather than shifting the feature matrix, so a sensor reporting a subset of the
CIC header works without error.