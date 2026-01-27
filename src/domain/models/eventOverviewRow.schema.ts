import { z } from "zod";

export const eventOverviewEventSchema = z.object({
  id: z.uuid(),
  orgId: z.uuid(),
  title: z.string().min(3).max(200),
  location: z.string().max(5000, "L'emplacement est trop long").nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  isPublished: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const eventOverviewRowSchema = z.object({
  event: eventOverviewEventSchema,
  ordersCount: z.number().int().min(0),
  paidCents: z.number().int().min(0),
});

export const eventOverviewRowsSchema = z.array(eventOverviewRowSchema);

export type EventOverviewEvent = z.infer<typeof eventOverviewEventSchema>;
export type EventOverviewRow = z.infer<typeof eventOverviewRowSchema>;
export type EventOverviewRows = z.infer<typeof eventOverviewRowsSchema>;
