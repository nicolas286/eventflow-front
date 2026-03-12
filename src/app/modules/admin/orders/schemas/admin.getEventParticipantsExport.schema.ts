import { z } from "zod";
import { orderUISchema } from "./admin.ordersSchema";
import { orderItemSchema } from "@shared/models/db/db.orderItems.schema";
import { attendeeSchema } from "@shared/models/db/db.attendee.schema";
import { attendeeAnswersSchema } from "@shared/models/db/db.attendeeAnswers.schema";

export const eventParticipantsExportSchema = z.object({
  orders: z.object({
    rows: z.array(orderUISchema),
  }),
  orderItems: z.array(orderItemSchema),
  attendees: z.array(attendeeSchema),
  attendeeAnswers: z.array(attendeeAnswersSchema),
});

export type EventParticipantsExportData = z.infer<
  typeof eventParticipantsExportSchema
>;