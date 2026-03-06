import { z } from "zod";

export const getEventDetailAdminParticipantsRpcArgsSchema = z
  .object({
    p_event_id: z.string().uuid().optional(),
    p_org_id: z.string().uuid().optional(),
    p_event_slug: z.string().min(1).optional(),

    p_attendees_limit: z.number().int().min(1).max(1000),
    p_attendees_offset: z.number().int().min(0),
  })
  .refine(
    (v) =>
      !!v.p_event_id || (!!v.p_org_id && typeof v.p_event_slug === "string" && v.p_event_slug.length > 0),
    {
      message: "p_event_id or (p_org_id + p_event_slug) is required",
    },
  );

export type GetEventDetailAdminParticipantsRpcArgs = z.infer<
  typeof getEventDetailAdminParticipantsRpcArgsSchema
>;