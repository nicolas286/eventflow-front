import { z } from "zod";
import { eventDbSchema } from "@shared/models/db/db.event.schema";
import { validateEventDateConsistency } from "@shared/models/db/db.event.schema";

export const eventOverviewEventSchema = eventDbSchema
  .omit({
    description: true,
    bannerUrl: true,
    depositCents: true,
  })
  .superRefine(validateEventDateConsistency);

export const eventOverviewRowSchema = z.object({
  event: eventOverviewEventSchema,
  ordersCount: z.number().int().min(0),
  paidCents: z.number().int().min(0),
});

export const eventOverviewRowsSchema = z.array(eventOverviewRowSchema);

export const eventsOverviewSchema = z.object({
  orgId: z.uuid(),
  events: eventOverviewRowsSchema,
});


export type EventOverviewEvent = z.infer<typeof eventOverviewEventSchema>;
export type EventOverviewRow = z.infer<typeof eventOverviewRowSchema>;
export type EventOverviewRows = z.infer<typeof eventOverviewRowsSchema>;
export type EventsOverview = z.infer<typeof eventsOverviewSchema>;

