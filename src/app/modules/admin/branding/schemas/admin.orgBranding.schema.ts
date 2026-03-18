import { z } from "zod";
import { organizationProfileSchema } from "@shared/models/db/db.organizationProfile.schema";

export const orgBrandingSchema = organizationProfileSchema.pick({
  orgId: true,
  displayName: true,
  primaryColor: true,
  logoUrl: true,
  defaultEventBannerUrl: true,
  widgetBg: true,
  widgetCard: true,
  widgetText: true,
  widgetButton: true,
});

export const orgBrandingUISchema = orgBrandingSchema.omit({ orgId: true });

export const orgBrandingFormSchema = orgBrandingSchema.omit({
  orgId: true,
});

export const orgBrandingPatchSchema = z
  .object({
    displayName: organizationProfileSchema.shape.displayName.optional(),
    primaryColor: organizationProfileSchema.shape.primaryColor.optional(),
    logoUrl: organizationProfileSchema.shape.logoUrl.optional(),
    defaultEventBannerUrl: organizationProfileSchema.shape.defaultEventBannerUrl.optional(),
    widgetBg: organizationProfileSchema.shape.widgetBg.optional(),
    widgetCard: organizationProfileSchema.shape.widgetCard.optional(),
    widgetText: organizationProfileSchema.shape.widgetText.optional(),
    widgetButton: organizationProfileSchema.shape.widgetButton.optional(),
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
export type OrgBrandingUI = z.infer<typeof orgBrandingUISchema>;