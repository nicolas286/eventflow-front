import { z } from "zod";
import { eventOverviewRowsSchema } from "./eventOverviewRow.schema";

export const eventsOverviewSchema = z.object({
  orgId: z.uuid(),
  events: eventOverviewRowsSchema,
});

export type EventsOverview = z.infer<typeof eventsOverviewSchema>;
