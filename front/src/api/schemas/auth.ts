import { z } from 'zod';
import { UserRoleSchema } from './common';

export const UserSchema = z
  .object({
    id: z.number(),
    username: z.string(),
    email: z.string().email().optional(),
    role: UserRoleSchema,
    date_joined: z.string().optional(),
    last_login: z.string().nullable().optional(),
  })
  .passthrough();

export type User = z.infer<typeof UserSchema>;

export const LoginResponseSchema = z
  .object({
    access: z.string(),
    refresh: z.string().optional(),
    user: UserSchema.optional(),
  })
  .passthrough();

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const GoogleLoginResponseSchema = z
  .object({
    access: z.string(),
    refresh: z.string().optional(),
    user: UserSchema,
    created: z.boolean().optional(),
  })
  .passthrough();

export type GoogleLoginResponse = z.infer<typeof GoogleLoginResponseSchema>;

export const RefreshResponseSchema = z
  .object({
    access: z.string(),
    refresh: z.string().optional(),
  })
  .passthrough();

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const HealthCheckComponentSchema = z.union([
  z.string().transform((val) => ({ status: val })),
  z
    .object({
      status: z.string(),
      latency_ms: z.number().optional(),
      active_workers: z.number().optional(),
      version: z.string().optional(),
      loaded_at: z.string().optional(),
      error: z.string().optional(),
    })
    .passthrough(),
]);

export const HealthCheckResponseSchema = z
  .object({
    status: z.enum(['healthy', 'degraded']),
    checks: z
      .object({
        database: HealthCheckComponentSchema.optional(),
        redis: HealthCheckComponentSchema.optional(),
        celery: HealthCheckComponentSchema.optional(),
        model: HealthCheckComponentSchema.optional(),
      })
      .passthrough(),
    timestamp: z.string().optional(),
  })
  .passthrough();

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
