import { z } from 'zod';

export const LabelDriftSchema = z
  .object({
    drift_score: z.number().optional(),
    warning_threshold: z.number().optional(),
    critical_threshold: z.number().optional(),
    training_distribution: z.record(z.string(), z.number()).optional(),
    current_distribution: z.record(z.string(), z.number()).optional(),
    deviation: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export const AnomalyScoreDriftSchema = z
  .object({
    method: z.string().optional(),
    training_percentiles: z.record(z.string(), z.number()).optional(),
    current_percentiles: z.record(z.string(), z.number()).optional(),
    psi_score: z.number().optional(),
    status: z.string().optional(),
    note: z.string().optional(),
  })
  .passthrough();

export const DriftHistoryItemSchema = z
  .object({
    timestamp: z.string(),
    label_drift_score: z.number().optional(),
    anomaly_psi_score: z.number().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const DriftMetricsResponseSchema = z
  .object({
    model_version: z.string().optional(),
    drift_status: z.enum(['healthy', 'warning', 'critical']).or(z.string()).optional(),
    latest_snapshot: z
      .object({
        timestamp: z.string().optional(),
        label_drift: LabelDriftSchema.optional(),
        anomaly_score_drift: AnomalyScoreDriftSchema.optional(),
      })
      .passthrough()
      .optional(),
    history: z.array(DriftHistoryItemSchema).optional().default([]),
    recommendation: z.string().nullable().optional(),
  })
  .passthrough();

export type DriftMetricsResponse = z.infer<typeof DriftMetricsResponseSchema>;
