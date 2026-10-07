# results-schema.md — SignSight Model Evaluation Export Schema

This JSON schema defines the format for exported model evaluation metrics from the `ai/` training and evaluation pipeline (`evaluation.json`).

The frontend loads this format from `src/data/results.json` (or `/api/metrics/model/` when baseline metrics are returned) to populate the **Results Comparison** page (`/app/results`).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ModelEvaluationResults",
  "type": "object",
  "required": [
    "dataset_name",
    "split_strategy",
    "model_version",
    "baseline_version",
    "evaluated_at",
    "sample_count",
    "macro_summary",
    "per_class",
    "confusion_matrices",
    "novel_suspicious_catch"
  ],
  "properties": {
    "dataset_name": { "type": "string", "example": "CIC-IDS2017" },
    "split_strategy": { "type": "string", "example": "Leave-one-day-out / Holdout 20%" },
    "model_version": { "type": "string", "example": "if-lgbm-v2.4.1" },
    "baseline_version": { "type": "string", "example": "lgbm-baseline-v1.0.0" },
    "evaluated_at": { "type": "string", "format": "date-time" },
    "sample_count": { "type": "integer", "example": 225745 },
    "is_demo_data": { "type": "boolean", "example": true },
    "macro_summary": {
      "type": "object",
      "properties": {
        "hybrid": {
          "type": "object",
          "properties": {
            "pr_auc": { "type": "number" },
            "f1_score": { "type": "number" },
            "fpr": { "type": "number" },
            "latency_p95_ms": { "type": "number" }
          }
        },
        "baseline": {
          "type": "object",
          "properties": {
            "pr_auc": { "type": "number" },
            "f1_score": { "type": "number" },
            "fpr": { "type": "number" },
            "latency_p95_ms": { "type": "number" }
          }
        }
      }
    },
    "per_class": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["family", "support", "hybrid", "baseline"],
        "properties": {
          "family": { "type": "string", "enum": ["dos", "probe", "r2l", "u2r", "normal"] },
          "support": { "type": "integer" },
          "hybrid": {
            "type": "object",
            "properties": {
              "precision": { "type": "number" },
              "recall": { "type": "number" },
              "f1_score": { "type": "number" },
              "fpr": { "type": "number" },
              "pr_auc": { "type": "number" }
            }
          },
          "baseline": {
            "type": "object",
            "properties": {
              "precision": { "type": "number" },
              "recall": { "type": "number" },
              "f1_score": { "type": "number" },
              "fpr": { "type": "number" },
              "pr_auc": { "type": "number" }
            }
          }
        }
      }
    },
    "confusion_matrices": {
      "type": "object",
      "properties": {
        "labels": { "type": "array", "items": { "type": "string" } },
        "hybrid": { "type": "array", "items": { "type": "array", "items": { "type": "integer" } } },
        "baseline": { "type": "array", "items": { "type": "array", "items": { "type": "integer" } } }
      }
    },
    "novel_suspicious_catch": {
      "type": "object",
      "properties": {
        "total_novel_flows": { "type": "integer" },
        "hybrid_flagged_novel": { "type": "integer" },
        "baseline_missed_as_normal": { "type": "integer" },
        "stage1_isolation_forest_contributions": { "type": "integer" },
        "description": { "type": "string" }
      }
    }
  }
}
```
