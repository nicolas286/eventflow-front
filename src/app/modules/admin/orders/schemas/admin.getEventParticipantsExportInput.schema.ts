import { z } from "zod";

export const getEventParticipantsExportArgsSchema = z
  .object({
    p_event_id: z.string().uuid().optional(),
    p_org_id: z.string().uuid().optional(),
    p_event_slug: z.string().trim().min(1).optional(),
    p_confirmed_only: z.boolean().optional(),
  })
  .refine(
    (v) =>
      !!v.p_event_id ||
      (!!v.p_org_id &&
        typeof v.p_event_slug === "string" &&
        v.p_event_slug.length > 0),
    {
      message: "p_event_id or (p_org_id + p_event_slug) is required",
    },
  );

export type GetEventParticipantsExportArgs = z.infer<
  typeof getEventParticipantsExportArgsSchema
>;