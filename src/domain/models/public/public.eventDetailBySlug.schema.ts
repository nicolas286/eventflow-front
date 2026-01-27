import { z } from "zod";
import { eventProductSchema } from "../db/db.eventProducts.schema";
import { eventSchema } from "../db/db.event.schema";
import { organizationProfileSchema } from "../db/db.organizationProfile.schema";


export const publicOrgProfileOverviewForEventPageSchema = organizationProfileSchema.pick({
  slug: true,
  defaultEventBannerUrl: true,
  logoUrl: true,
});

export const publicEventSchema = eventSchema.pick({
  id: true,
  slug: true,
  title: true,
  description: true,
  location: true,
  bannerUrl: true,
  startsAt: true,
  endsAt: true,
});

export const publicEventProductSchema = eventProductSchema.pick({
  id: true,
  name: true,
  description: true,
  currency: true,
  priceCents: true,
  stockQty: true,
  createsAttendees: true,
  attendeesPerUnit: true,
  sortOrder: true,
});


export const publicFormFieldOptionsSchema = z.union([
  z.array(z.string()),
  z.array(z.object({ label: z.string(), value: z.string() })),
  z.record(z.string(), z.any()),
  z.null(),
]);

export const publicEventFormFieldSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  fieldKey: z.string().min(1),
  fieldType: z.string().min(1), 
  isRequired: z.boolean(),
  options: publicFormFieldOptionsSchema.optional().nullable(),
  sortOrder: z.number().int(),
});

export const publicEventDetailSchema = z.object({
  org: publicOrgProfileOverviewForEventPageSchema,
  event: publicEventSchema,
  products: z.array(publicEventProductSchema),
  formFields: z.array(publicEventFormFieldSchema),
});

export type PublicEventDetail = z.infer<typeof publicEventDetailSchema>;
