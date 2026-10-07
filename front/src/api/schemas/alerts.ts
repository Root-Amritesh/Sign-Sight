import { z } from 'zod';
import {
  SeveritySchema,
  StatusSchema,
  ResolutionSchema,
  AlertTypeSchema,
  AttackLabelSchema,
  createPaginatedResponseSchema,
} from './common';

// Slim alert item returned in list view
export const AlertListItemSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
    severity: SeveritySchema,
    status: StatusSchema,
    predicted_label: AttackLabelSchema,
    confidence: z.number(),
    model_version: z.string(),
    anomaly_score: z.number().optional(),
    alert_type: AlertTypeSchema.optional(),
  })
  .passthrough();

export type AlertListItem = z.infer<typeof AlertListItemSchema>;

export const PaginatedAlertsSchema = createPaginatedResponseSchema(AlertListItemSchema);
export type PaginatedAlerts = z.infer<typeof PaginatedAlertsSchema>;

// Feature contribution explanation item (LightGBM pred_contrib)
export const FeatureContributionSchema = z
  .object({
    feature: z.string(),
    contribution: z.number(),
  })
  .passthrough();

export const ExplanationSchema = z
  .object({
    method: z.string().optional(),
    predicted_class: z.string().optional(),
    top_features: z.array(FeatureContributionSchema).optional(),
  })
  .passthrough();

export const TrafficRecordSchema = z
  .object({
    id: z.string().optional(),
    ingested_at: z.string().optional(),
    duration: z.number().optional(),
    protocol_type: z.string().optional(),
    service: z.string().optional(),
    flag: z.string().optional(),
    src_bytes: z.number().optional(),
    dst_bytes: z.number().optional(),
    count: z.number().optional(),
    srv_count: z.number().optional(),
  })
  .passthrough();

// Full alert detail
export const AlertDetailSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    severity: SeveritySchema,
    status: StatusSchema,
    resolution: ResolutionSchema.optional(),
    alert_type: AlertTypeSchema.optional(),
    predicted_label: AttackLabelSchema,
    confidence: z.number(),
    anomaly_score: z.number().optional(),
    probabilities: z.record(z.string(), z.number()).optional(),
    explanation: ExplanationSchema.nullable().optional(),
    model_version: z.string(),
    mitre_tactic: z.string().nullable().optional(),
    mitre_technique: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    resolved_by: z
      .union([
        z.object({ id: z.number(), username: z.string() }).passthrough(),
        z.number(),
        z.string(),
      ])
      .nullable()
      .optional(),
    recommendation: z.string().nullable().optional(),
    traffic_record: TrafficRecordSchema.nullable().optional(),
    source_ip: z.string().nullable().optional(),
    dest_ip: z.string().nullable().optional(),
    source_port: z.number().nullable().optional(),
    dest_port: z.number().nullable().optional(),
  })
  .passthrough();

export type AlertDetail = z.infer<typeof AlertDetailSchema>;

// Alert update request / response
export const AlertUpdateRequestSchema = z.object({
  status: StatusSchema.optional(),
  resolution: ResolutionSchema.optional(),
  notes: z.string().nullable().optional(),
});

export type AlertUpdateRequest = z.infer<typeof AlertUpdateRequestSchema>;

export const AlertUpdateResponseSchema = z
  .object({
    id: z.string(),
    status: StatusSchema,
    resolution: ResolutionSchema.optional(),
    notes: z.string().nullable().optional(),
    resolved_by: z
      .union([
        z.object({ id: z.number(), username: z.string() }).passthrough(),
        z.number(),
        z.string(),
      ])
      .nullable()
      .optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export type AlertUpdateResponse = z.infer<typeof AlertUpdateResponseSchema>;

// Alert stats
export const AlertStatsSchema = z
  .object({
    period: z.string().optional(),
    total_alerts: z.number(),
    by_severity: z
      .object({
        critical: z.number().optional().default(0),
        high: z.number().optional().default(0),
        medium: z.number().optional().default(0),
        low: z.number().optional().default(0),
        info: z.number().optional().default(0),
      })
      .passthrough(),
    by_status: z
      .object({
        new: z.number().optional().default(0),
        viewed: z.number().optional().default(0),
        resolved: z.number().optional().default(0),
        escalated: z.number().optional().default(0),
      })
      .passthrough(),
    by_alert_type: z
      .object({
        known_attack: z.number().optional().default(0),
        novel_suspicious: z.number().optional().default(0),
        uncertain_normal: z.number().optional().default(0),
      })
      .passthrough()
      .optional(),
    by_label: z
      .object({
        dos: z.number().optional().default(0),
        probe: z.number().optional().default(0),
        r2l: z.number().optional().default(0),
        u2r: z.number().optional().default(0),
        normal: z.number().optional().default(0),
      })
      .passthrough()
      .optional(),
    resolution_breakdown: z
      .object({
        true_positive: z.number().optional().default(0),
        false_positive: z.number().optional().default(0),
      })
      .passthrough()
      .optional(),
    false_positive_rate: z.number().optional(),
    mean_time_to_resolve_seconds: z.number().optional(),
  })
  .passthrough();

export type AlertStats = z.infer<typeof AlertStatsSchema>;
