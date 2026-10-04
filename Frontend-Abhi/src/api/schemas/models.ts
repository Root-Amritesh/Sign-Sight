import { z } from 'zod';

export const ModelVersionSchema = z
  .object({
    version: z.string(),
    is_active: z.boolean(),
    model_type: z.string().optional(),
    deployed_at: z.string().nullable().optional(),
    deployed_by: z.string().nullable().optional(),
    dataset: z.string().optional(),
    accuracy: z.number().nullable().optional(),
    auc_macro: z.number().nullable().optional(),
  })
  .passthrough();

export type ModelVersion = z.infer<typeof ModelVersionSchema>;

export const ModelsListResponseSchema = z
  .object({
    active_version: z.string().optional(),
    models: z.array(ModelVersionSchema),
  })
  .passthrough();

export type ModelsListResponse = z.infer<typeof ModelsListResponseSchema>;

export const ClassMetricSchema = z
  .object({
    precision: z.number().optional(),
    recall: z.number().optional(),
    f1: z.number().optional(),
    auc: z.number().optional(),
    pr_auc: z.number().optional(),
    support: z.number().optional(),
  })
  .passthrough();

export const ConfusionMatrixSchema = z
  .object({
    labels: z.array(z.string()),
    matrix: z.array(z.array(z.number())),
  })
  .passthrough();

export const Stage1MetricsSchema = z
  .object({
    novelty_fpr: z.number().optional(),
    anomaly_auc_attack_vs_normal: z.number().optional(),
    anomaly_score_percentiles: z
      .object({
        p50: z.number().optional(),
        p90: z.number().optional(),
        p95: z.number().optional(),
        p99: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const Stage2MetricsSchema = z
  .object({
    accuracy: z.number().optional(),
    precision_macro: z.number().optional(),
    recall_macro: z.number().optional(),
    f1_macro: z.number().optional(),
    fpr: z.number().optional(),
    auc_macro: z.number().optional(),
    pr_auc_macro: z.number().optional(),
    per_class: z.record(z.string(), ClassMetricSchema).optional(),
    confusion_matrix: ConfusionMatrixSchema.optional(),
    class_imbalance_note: z.string().optional(),
  })
  .passthrough();

export const ModelMetricsResponseSchema = z
  .object({
    active_model: z
      .object({
        version: z.string(),
        deployed_at: z.string().optional(),
        model_type: z.string().optional(),
        stages: z.array(z.string()).optional(),
        dataset: z.string().optional(),
        training_date: z.string().optional(),
      })
      .passthrough()
      .optional(),
    stage1_metrics: Stage1MetricsSchema.optional(),
    stage2_metrics: Stage2MetricsSchema.optional(),
  })
  .passthrough();

export type ModelMetricsResponse = z.infer<typeof ModelMetricsResponseSchema>;

export const DeployModelResponseSchema = z
  .object({
    version: z.string(),
    status: z.string().optional(),
    previous_version: z.string().nullable().optional(),
    deployed_at: z.string().optional(),
    metrics_summary: z.record(z.string(), z.unknown()).optional(),
    message: z.string().optional(),
  })
  .passthrough();

export type DeployModelResponse = z.infer<typeof DeployModelResponseSchema>;

export const RollbackModelResponseSchema = z
  .object({
    version: z.string(),
    status: z.string().optional(),
    previous_version: z.string().nullable().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export type RollbackModelResponse = z.infer<typeof RollbackModelResponseSchema>;
