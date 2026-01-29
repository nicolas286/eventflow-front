import { z } from "zod";
import { profileSchema } from "../db/db.profile.schema";

export const adminProfileFormSchema = profileSchema
  .omit({
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    firstName: z.string().max(80).optional().nullable(),
    lastName: z.string().max(80).optional().nullable(),
    phone: z.string().max(32).optional().nullable(),
    addressLine1: z.string().max(120).optional().nullable(),
    addressLine2: z.string().max(120).optional().nullable(),
    postalCode: z.string().max(20).optional().nullable(),
    city: z.string().max(80).optional().nullable(),
    country: z.string().max(80).optional().nullable(),
    countryCode: z.string().length(2).optional().nullable(),
  });

export type AdminProfileForm = z.infer<typeof adminProfileFormSchema>;


export const adminProfilePatchSchema = profileSchema
  .omit({
    createdAt: true,
    updatedAt: true,
  })
  .partial()
  .extend({
    firstName: z.string().min(2).max(80).nullable().optional(),
    lastName: z.string().min(2).max(80).nullable().optional(),
    phone: z.string().min(3).max(32).nullable().optional(),
    addressLine1: z.string().min(3).max(120).nullable().optional(),
    addressLine2: z.string().min(3).max(120).nullable().optional(),
    postalCode: z.string().min(2).max(20).nullable().optional(),
    city: z.string().min(2).max(80).nullable().optional(),
    country: z.string().min(2).max(80).nullable().optional(),
    countryCode: z.string().length(2).nullable().optional(),
  })
  .strict();

export const updateAdminProfileInputSchema = z.object({
  userId: z.uuid(),
  patch: adminProfilePatchSchema,
});

export type UpdateAdminProfileInput = z.infer<typeof updateAdminProfileInputSchema>;
export type AdminProfile = z.infer<typeof profileSchema>;
export type AdminProfilePatch = z.infer<typeof adminProfilePatchSchema>;
