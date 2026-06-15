import { z } from "zod";

import { eventDbSchema } from "@shared/models/db/db.event.schema";

import { eventProductsSchema } from "@shared/models/db/db.eventProducts.schema";
import { eventFormFieldGroupSchema, eventFormFieldSchema } from "@shared/models/db/db.eventFormFields.schema";
import { orderItemsSchema } from "@shared/models/db/db.orderItems.schema";
import { paymentsUISchema } from "@shared/models/db/db.payment.schema";
import { attendeesSchema } from "@shared/models/db/db.attendee.schema";
import { attendeesAnswersSchema } from "@shared/models/db/db.attendeeAnswers.schema";
import { ordersUISchema } from "../../orders/schemas/admin.ordersSchema";

/**
 * RPC: get_event_detail_admin
 * Retour historique:
 * {
 *  event,
 *  orgBranding,
 *  products,
 *  formFields,
 *  orders: {limit, offset, rows},
 *  orderItems,
 *  payments,
 *  attendees: {limit, offset, total, rows},
 *  attendeeAnswers
 * }
 */

export const adminEventDetailEventSchema = eventDbSchema
  .omit({
    bannerUrl: true,
    createdAt: true,
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
export const eventFormFieldGroupsSchema = z.array(eventFormFieldGroupSchema);


export const attendeesPageSchema = z.object({
  limit: z.number().int().min(1).max(1000),
  offset: z.number().int().min(0),
  total: z.number().int().min(0),
  rows: attendeesSchema,
});

export const eventDetailAdminSchema = z.object({
  event: adminEventDetailEventSchema,
  orgBranding: adminEventDetailOrgBrandingSchema,

  products: eventProductsSchema,
  formFields: eventFormFieldsSchema,

  orders: ordersUISchema,
  orderItems: orderItemsSchema,
  payments: paymentsUISchema,

  attendees: attendeesPageSchema,
  attendeeAnswers: attendeesAnswersSchema,
});

export const eventDetailAdminCoreSchema = z.object({
  event: adminEventDetailEventSchema,
  orgBranding: adminEventDetailOrgBrandingSchema,
  products: eventProductsSchema,
  formFields: eventFormFieldsSchema,
  formFieldsGroups: eventFormFieldGroupsSchema,
});

export const eventDetailAdminParticipantsSchema = z.object({
  attendees: attendeesPageSchema,
  attendeeAnswers: attendeesAnswersSchema,
});

export type AttendeesPage = z.infer<typeof attendeesPageSchema>;
export type AdminEventDetailEvent = z.infer<typeof adminEventDetailEventSchema>;
export type EventDetailAdmin = z.infer<typeof eventDetailAdminSchema>;
export type EventDetailAdminCore = z.infer<typeof eventDetailAdminCoreSchema>;
export type EventDetailAdminParticipants = z.infer<typeof eventDetailAdminParticipantsSchema>;