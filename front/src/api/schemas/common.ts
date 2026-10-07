import { z } from 'zod';

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof SeveritySchema>;

export const StatusSchema = z.enum(['new', 'viewed', 'escalated', 'resolved']);
export type AlertStatus = z.infer<typeof StatusSchema>;

export const ResolutionSchema = z.enum(['true_positive', 'false_positive']).nullable();
export type AlertResolution = z.infer<typeof ResolutionSchema>;

export const AlertTypeSchema = z.enum(['known_attack', 'novel_suspicious', 'uncertain_normal']);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const AttackLabelSchema = z.enum(['normal', 'dos', 'probe', 'r2l', 'u2r']);
export type AttackLabel = z.infer<typeof AttackLabelSchema>;

export const UserRoleSchema = z.enum(['analyst', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .object({
      count: z.number().int().nonnegative(),
      next: z.string().nullable().optional(),
      previous: z.string().nullable().optional(),
      results: z.array(itemSchema),
    })
    .passthrough();
}

export const ApiErrorResponseSchema = z
  .object({
    detail: z.string().optional(),
    message: z.string().optional(),
    code: z.string().optional(),
    errors: z.record(z.string(), z.array(z.string())).optional(),
    record_id: z.string().optional(),
    retry_after: z.number().optional(),
  })
  .passthrough();

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
