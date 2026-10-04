import { z } from 'zod';
import { SeveritySchema } from './common';

export const SeverityTierConfigSchema = z
  .object({
    min_confidence: z.number(),
  })
  .passthrough();

export const AlertThresholdsConfigSchema = z
  .object({
    min_confidence_to_alert: z.number().optional().default(0.4),
    normal_uncertainty_threshold: z.number().optional().default(0.7),
    // Supports both API_SPEC and ML_DATA_PIPELINE naming variants
    novelty_threshold: z.number().nullable().optional(),
    anomaly_score_novelty_threshold: z.number().nullable().optional(),
    novelty_severity: SeveritySchema.optional().default('high'),
    novel_suspicious_max_severity: SeveritySchema.optional(),
    severity_tiers: z
      .object({
        critical: SeverityTierConfigSchema.optional().default({ min_confidence: 0.95 }),
        high: SeverityTierConfigSchema.optional().default({ min_confidence: 0.85 }),
        medium: SeverityTierConfigSchema.optional().default({ min_confidence: 0.7 }),
        low: SeverityTierConfigSchema.optional().default({ min_confidence: 0.5 }),
        info: SeverityTierConfigSchema.optional().default({ min_confidence: 0.4 }),
      })
      .passthrough()
      .optional(),
    attack_type_severity_boost: z
      .object({
        u2r: z.number().optional().default(1),
        r2l: z.number().optional().default(1),
        dos: z.number().optional().default(0),
        probe: z.number().optional().default(0),
      })
      .passthrough()
      .optional(),
    notification_severities: z.array(z.string()).optional().default(['critical', 'high']),
  })
  .passthrough();

export type AlertThresholdsConfig = z.infer<typeof AlertThresholdsConfigSchema>;
