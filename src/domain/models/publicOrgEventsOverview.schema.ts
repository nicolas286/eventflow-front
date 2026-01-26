import { z } from "zod";

export const publicEventOverviewSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1).max(200),
  title: z.string().min(3).max(200),

  description: z.string().max(5000).nullable().optional(),
  bannerUrl: z.string().nullable().optional(),

  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

export const publicOrgEventsOverviewSchema = z.object({
  orgSlug: z.string().min(1),
  events: z.array(publicEventOverviewSchema),
});

export type PublicEventOverview = z.infer<typeof publicEventOverviewSchema>;
export type PublicOrgEventsOverview = z.infer<
  typeof publicOrgEventsOverviewSchema
>;
