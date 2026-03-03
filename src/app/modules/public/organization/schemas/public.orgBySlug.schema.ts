import { z } from "zod";
import { organizationSchema } from "@shared/models/db/db.organization.schema";
import { organizationProfileSchema } from "@shared/models/db/db.organizationProfile.schema";

export const publicOrganizationOverviewSchema = organizationSchema.pick({
  id: true,
  type: true,
  name: true
});

export const publicOrganizationProfileSchema = organizationProfileSchema.omit({
  orgId: true,
  createdAt: true,
  updatedAt: true, 
  emailReminderDaysBefore: true,
});

export const publicOrgBySlugSchema = z.object({
  org: publicOrganizationOverviewSchema,
  profile: publicOrganizationProfileSchema,
});

export type PublicOrganizationOverview = z.infer<typeof publicOrganizationOverviewSchema>;
export type PublicOrganizationProfile = z.infer<typeof publicOrganizationProfileSchema>;
export type PublicOrgBySlug = z.infer<typeof publicOrgBySlugSchema>;
