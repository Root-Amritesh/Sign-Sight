import type { ModelMetricsResponse, ModelVersion } from '../schemas/models';

export interface UIModelVersion {
  version: string;
  isActive: boolean;
  modelType: string;
  deployedAt?: string;
  deployedBy?: string;
  dataset: string;
  accuracy?: number;
  aucMacro?: number;
}

export interface UIClassMetric {
  precision?: number;
  recall?: number;
  f1?: number;
  auc?: number;
  prAuc?: number;
  support?: number;
}

export interface UIModelMetrics {
  activeModel?: {
    version: string;
    deployedAt?: string;
    modelType?: string;
    stages?: string[];
    dataset?: string;
    trainingDate?: string;
  };
  stage1Metrics?: {
    noveltyFpr?: number;
    anomalyAucAttackVsNormal?: number;
    anomalyScorePercentiles?: {
      p50?: number;
      p90?: number;
      p95?: number;
      p99?: number;
    };
  };
  stage2Metrics?: {
    accuracy?: number;
    precisionMacro?: number;
    recallMacro?: number;
    f1Macro?: number;
    fpr?: number;
    aucMacro?: number;
    prAucMacro?: number;
    perClass?: Record<string, UIClassMetric>;
    confusionMatrix?: {
      labels: string[];
      matrix: number[][];
    };
    classImbalanceNote?: string;
  };
}

export function adaptModelVersion(raw: ModelVersion): UIModelVersion {
  return {
    version: raw.version,
    isActive: raw.is_active,
    modelType: raw.model_type || 'IsolationForest+LGBMClassifier',
    deployedAt: raw.deployed_at ?? undefined,
    deployedBy: raw.deployed_by ?? undefined,
    dataset: raw.dataset || 'NSL-KDD',
    accuracy: raw.accuracy ?? undefined,
    aucMacro: raw.auc_macro ?? undefined,
  };
}

export function adaptModelMetrics(raw: ModelMetricsResponse): UIModelMetrics {
  return {
    activeModel: raw.active_model
      ? {
          version: raw.active_model.version,
          deployedAt: raw.active_model.deployed_at,
          modelType: raw.active_model.model_type,
          stages: raw.active_model.stages,
          dataset: raw.active_model.dataset,
          trainingDate: raw.active_model.training_date,
        }
      : undefined,
    stage1Metrics: raw.stage1_metrics
      ? {
          noveltyFpr: raw.stage1_metrics.novelty_fpr,
          anomalyAucAttackVsNormal: raw.stage1_metrics.anomaly_auc_attack_vs_normal,
          anomalyScorePercentiles: raw.stage1_metrics.anomaly_score_percentiles,
        }
      : undefined,
    stage2Metrics: raw.stage2_metrics
      ? {
          accuracy: raw.stage2_metrics.accuracy,
          precisionMacro: raw.stage2_metrics.precision_macro,
          recallMacro: raw.stage2_metrics.recall_macro,
          f1Macro: raw.stage2_metrics.f1_macro,
          fpr: raw.stage2_metrics.fpr,
          aucMacro: raw.stage2_metrics.auc_macro,
          prAucMacro: raw.stage2_metrics.pr_auc_macro,
          perClass: raw.stage2_metrics.per_class
            ? Object.fromEntries(
                Object.entries(raw.stage2_metrics.per_class).map(([cls, m]) => [
                  cls,
                  {
                    precision: m.precision,
                    recall: m.recall,
                    f1: m.f1,
                    auc: m.auc,
                    prAuc: m.pr_auc,
                    support: m.support,
                  },
                ])
              )
            : undefined,
          confusionMatrix: raw.stage2_metrics.confusion_matrix,
          classImbalanceNote: raw.stage2_metrics.class_imbalance_note,
        }
      : undefined,
  };
}
