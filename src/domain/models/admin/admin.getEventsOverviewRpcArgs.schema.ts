import { z } from "zod";

export const getEventsOverviewRpcArgsSchema = z
  .object({
    p_org_id: z.uuid(),
  })
  .strict();

export type GetEventsOverviewRpcArgs = z.infer<typeof getEventsOverviewRpcArgsSchema>;
