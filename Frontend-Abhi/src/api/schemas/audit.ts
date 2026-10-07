import { z } from 'zod';
import { createPaginatedResponseSchema } from './common';

export const AuditRecordSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    timestamp: z.string(),
    actor: z
      .union([
        z.object({ id: z.number(), username: z.string() }).passthrough(),
        z.string(),
      ])
      .nullable()
      .optional(),
    action: z.string(),
    target_type: z.string().optional(),
    target_id: z.string().nullable().optional(),
    changes: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough();

export type AuditRecord = z.infer<typeof AuditRecordSchema>;

export const PaginatedAuditRecordsSchema = createPaginatedResponseSchema(AuditRecordSchema);
export type PaginatedAuditRecords = z.infer<typeof PaginatedAuditRecordsSchema>;
