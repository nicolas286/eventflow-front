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

export const publicEventDetailSchema = z.object({
  org: publicOrgProfileOverviewForEventPageSchema,
  event: publicEventSchema,
  products: z.array(publicEventProductSchema),
  formFields: z.array(eventFormFieldSchema),
});

export type PublicEventDetail = z.infer<typeof publicEventDetailSchema>;
