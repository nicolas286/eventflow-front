import { z } from "zod";
import { eventSchema } from "../db/db.event.schema";

export const publicEventOverviewSchema = eventSchema.omit({
  orgId: true,
  description: true,
  bannerUrl: true, 
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  depositCents: true
});

export const publicOrgEventsOverviewSchema = z.object({
  orgSlug: z.string().min(3, "Le slug est trop court").max(80, "Le slug est trop long"),
  events: z.array(publicEventOverviewSchema),
});

export type PublicEventOverview = z.infer<typeof publicEventOverviewSchema>;
export type PublicOrgEventsOverview = z.infer<typeof publicOrgEventsOverviewSchema>;
