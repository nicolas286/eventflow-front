import { z } from "zod";

const isoDateTimeNullable = z.string().datetime().nullable();

export const publicOrgProfileOverviewSchema = z.object({
  slug: z.string().min(1),
  logoUrl: z.string(),
  defaultEventBannerUrl: z.string(),
});

export const publicEventSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(5000).nullable(),
  location: z.string().max(180).nullable(),
  bannerUrl: z.string().url(),
  startsAt: isoDateTimeNullable,
  endsAt: isoDateTimeNullable,
});

export const publicEventProductSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1).max(10),
  stockQty: z.number().int().nonnegative().nullable(), // null = illimité
  createsAttendees: z.boolean(),
  attendeesPerUnit: z.number().int().positive(),
  sortOrder: z.number().int(),
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
  org: publicOrgProfileOverviewSchema,
  event: publicEventSchema,
  products: z.array(publicEventProductSchema),
  formFields: z.array(publicEventFormFieldSchema),
});

export type PublicEventDetail = z.infer<typeof publicEventDetailSchema>;
