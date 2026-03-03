import { z } from "zod";

const uuid = z.string().uuid();
const intPos = z.number().int().positive();

export const invoiceListCursorSchema = z.object({
  issuedAt: z.string().nullable(), 
  id: uuid,
});

export const listInvoicesParamsSchema = z
  .object({
    orgId: uuid,
    limit: intPos.max(100).optional().default(25),
    cursor: invoiceListCursorSchema.nullable().optional(),
  })
  .strict();

export type ListInvoicesParams = z.infer<typeof listInvoicesParamsSchema>;

export const rpcListInvoicesArgsSchema = z
  .object({
    p_org_id: uuid,
    p_limit: z.number().int().min(1).max(100).default(25),
    p_cursor_issued_at: z.string().nullable().optional(),
    p_cursor_id: uuid.nullable().optional(),
  })
  .strict();

export type RpcListInvoicesArgs = z.infer<typeof rpcListInvoicesArgsSchema>;
