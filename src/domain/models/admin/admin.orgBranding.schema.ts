import { z } from "zod";
import { organizationProfileSchema } from "../db/db.organizationProfile.schema";

export const orgBrandingSchema = organizationProfileSchema.pick({
  orgId: true,
  displayName: true,
  primaryColor: true,
  logoUrl: true,
  defaultEventBannerUrl: true,
});

export const orgBrandingFormSchema = orgBrandingSchema.omit({
  orgId: true,
});

export const orgBrandingPatchSchema = z
  .object({
    displayName: organizationProfileSchema.shape.displayName.optional(),
    primaryColor: organizationProfileSchema.shape.primaryColor.optional(),
    logoUrl: organizationProfileSchema.shape.logoUrl.optional(),
    defaultEventBannerUrl: organizationProfileSchema.shape.defaultEventBannerUrl.optional(),
  })
  .strict();

export const updateOrgBrandingInputSchema = z.object({
  orgId: z.uuid(),
  patch: orgBrandingPatchSchema,
});

export type UpdateOrgBrandingInput = z.infer<typeof updateOrgBrandingInputSchema>;
export type OrgBrandingPatch = z.infer<typeof orgBrandingPatchSchema>;
export type OrgBrandingForm = z.infer<typeof orgBrandingFormSchema>;
export type OrgBranding = z.infer<typeof orgBrandingSchema>;
