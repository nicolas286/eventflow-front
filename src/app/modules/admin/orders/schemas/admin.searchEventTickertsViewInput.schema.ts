import { z } from "zod";

export const searchEventAdminTicketsViewRpcArgsSchema = z.object({
  p_event_id: z.string().uuid(),
  p_query: z.string(),
  p_limit: z.number().int().min(1).max(1000),
  p_offset: z.number().int().min(0),
});

export type SearchEventAdminTicketsViewRpcArgs = z.infer<
  typeof searchEventAdminTicketsViewRpcArgsSchema
>;
