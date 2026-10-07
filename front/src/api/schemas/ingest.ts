import { z } from 'zod';
import { SeveritySchema, StatusSchema, AttackLabelSchema } from './common';

export const IngestPredictionSchema = z
  .object({
    label: AttackLabelSchema,
    confidence: z.number(),
    probabilities: z.record(z.string(), z.number()).optional(),
    model_version: z.string().optional(),
    anomaly_score: z.number().optional(),
  })
  .passthrough();

export const IngestAlertInfoSchema = z
  .object({
    id: z.string(),
    severity: SeveritySchema,
    status: StatusSchema,
    created_at: z.string().optional(),
    alert_type: z.string().optional(),
    recommendation: z.string().optional(),
  })
  .passthrough();

export const IngestSingleResponseSchema = z
  .object({
    record_id: z.string(),
    prediction: IngestPredictionSchema,
    alert: IngestAlertInfoSchema.nullable(),
  })
  .passthrough();

export type IngestSingleResponse = z.infer<typeof IngestSingleResponseSchema>;

export const IngestBatchResponseSchema = z
  .object({
    task_id: z.string(),
    status: z.string(),
    message: z.string().optional(),
    status_url: z.string().optional(),
  })
  .passthrough();

export type IngestBatchResponse = z.infer<typeof IngestBatchResponseSchema>;

export const TaskProgressSchema = z
  .object({
    total_records: z.number().optional(),
    processed: z.number().optional(),
    alerts_created: z.number().optional(),
    errors: z.number().optional(),
    percent_complete: z.number().optional(),
  })
  .passthrough();

export const IngestTaskStatusResponseSchema = z
  .object({
    task_id: z.string(),
    status: z.string(),
    progress: TaskProgressSchema.optional(),
    started_at: z.string().optional(),
    completed_at: z.string().nullable().optional(),
    duration_seconds: z.number().nullable().optional(),
  })
  .passthrough();

export type IngestTaskStatusResponse = z.infer<typeof IngestTaskStatusResponseSchema>;

export const ReplayStartResponseSchema = z
  .object({
    task_id: z.string(),
    status: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type ReplayStartResponse = z.infer<typeof ReplayStartResponseSchema>;

export const ReplayStopResponseSchema = z
  .object({
    task_id: z.string().optional(),
    status: z.string(),
    records_processed: z.number().optional(),
  })
  .passthrough();

export type ReplayStopResponse = z.infer<typeof ReplayStopResponseSchema>;
