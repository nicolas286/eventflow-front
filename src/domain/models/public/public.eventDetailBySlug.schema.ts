import { z } from "zod";
import { eventProductSchema } from "../db/db.eventProducts.schema";
import { eventSchema } from "../db/db.event.schema";
import { organizationProfileSchema } from "../db/db.organizationProfile.schema";
import { eventFormFieldSchema } from "../db/db.eventFormFields.schema";


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

export const publicFormFieldSchema = eventFormFieldSchema.pick({
  id: true,
  label: true,
  fieldKey: true,
  fieldType: true,
  isRequired: true,
  options: true,
  sortOrder: true,
});

export const publicEventDetailSchema =
 z.object({
  org: publicOrgProfileOverviewForEventPageSchema,
  event: publicEventSchema,
  products: z.array(publicEventProductSchema),
  formFields: z.array(publicFormFieldSchema),
});

export type PublicEventDetail = z.infer<typeof publicEventDetailSchema>;
