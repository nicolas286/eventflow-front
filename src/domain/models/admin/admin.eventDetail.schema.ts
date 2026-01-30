import { z } from "zod";

import { eventSchema } from "../db/db.event.schema";
import { eventProductsSchema } from "../db/db.eventProducts.schema";
import { eventFormFieldSchema } from "../db/db.eventFormFields.schema";
import { orderSchema } from "../db/db.order.schema";
import { orderItemsSchema } from "../db/db.orderItems.schema";
import { paymentsSchema } from "../db/db.payment.schema";
import { attendeesSchema } from "../db/db.attendee.schema";
import { attendeesAnswersSchema } from "../db/db.attendeeAnswers.schema";

/**
 * RPC: get_event_detail_admin
 * Retour:
 * {
 *  event,
 *  orgBranding,
 *  products,
 *  formFields,
 *  orders: {limit, offset, rows},
 *  orderItems,
 *  payments,
 *  attendees: {limit, offset, rows},
 *  attendeeAnswers
 * }
 */

export const adminEventDetailEventSchema = eventSchema
  .omit({
    bannerUrl: true, 
    createdAt: true,
    updatedAt: true,
    orgId: true, 
  })
  .extend({
    bannerUrlRaw: z.string().nullable(),
    bannerUrlEffective: z.string().min(5).max(2048),
  });

export const adminEventDetailOrgBrandingSchema = z.object({
  logoUrl: z.string().min(5).max(2048),
  defaultEventBannerUrl: z.string().min(5).max(2048),
});

export const eventFormFieldsSchema = z.array(eventFormFieldSchema);

export const ordersPageSchema = z.object({
  limit: z.number().int().min(1).max(200),
  offset: z.number().int().min(0),
  rows: z.array(orderSchema),
});

export const attendeesPageSchema = z.object({
  limit: z.number().int().min(1).max(1000),
  offset: z.number().int().min(0),
  rows: attendeesSchema,
});

export const eventDetailAdminSchema = z.object({
  event: adminEventDetailEventSchema,
  orgBranding: adminEventDetailOrgBrandingSchema,

  products: eventProductsSchema,
  formFields: eventFormFieldsSchema,

  orders: ordersPageSchema,
  orderItems: orderItemsSchema,
  payments: paymentsSchema,

  attendees: attendeesPageSchema,
  attendeeAnswers: attendeesAnswersSchema,
});

export type EventDetailAdmin = z.infer<typeof eventDetailAdminSchema>;
