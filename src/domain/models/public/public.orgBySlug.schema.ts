import { z } from "zod";

export const publicOrganizationSchema = z.object({
  id: z.uuid(),
  type: z.enum(["association", "person"]),
  name: z.string().min(3).max(120),
});

export const publicOrganizationProfileSchema = z.object({
  slug: z.string().min(3).max(80),


  displayName: z.string().min(3).max(120).nullable(),

  description: z.string().max(1000).nullable(),
  publicEmail: z.email().nullable(),
  phone: z.string().min(3).max(32).nullable(),
  website: z.string().min(5).max(2048).nullable(),

  logoUrl: z.string().min(5).max(2048).nullable(),
  primaryColor: z.string().min(4).max(20).nullable(),
  defaultEventBannerUrl: z.string().min(5).max(2048).nullable(),
});

export const publicOrgBySlugSchema = z.object({
  org: publicOrganizationSchema,
  profile: publicOrganizationProfileSchema,
});

export type PublicOrganization = z.infer<typeof publicOrganizationSchema>;
export type PublicOrganizationProfile = z.infer<
  typeof publicOrganizationProfileSchema
>;
export type PublicOrgBySlug = z.infer<typeof publicOrgBySlugSchema>;
