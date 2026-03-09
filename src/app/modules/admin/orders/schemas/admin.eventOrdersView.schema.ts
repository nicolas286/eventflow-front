import { z } from "zod";

import { ordersUISchema } from "./admin.ordersSchema";
import { orderItemsSchema } from "@shared/models/db/db.orderItems.schema";
import { paymentsUISchema } from "@shared/models/db/db.payment.schema";
import { attendeesSchema } from "@shared/models/db/db.attendee.schema";
import { attendeesAnswersSchema } from "@shared/models/db/db.attendeeAnswers.schema";

export const eventAdminOrdersViewSchema = z.object({
  orders: ordersUISchema,
  orderItems: orderItemsSchema,
  payments: paymentsUISchema,
  attendees: attendeesSchema,
  attendeeAnswers: attendeesAnswersSchema,
});

export type EventAdminOrdersView = z.infer<typeof eventAdminOrdersViewSchema>;