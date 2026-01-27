import { z } from "zod";

export const organizationProfileSchema = z.object({
  orgId: z.uuid(), 
  slug: z.string().min(3, "Le slug est trop court").max(80, "Le slug est trop long"),
  displayName: z.string().min(3, "Le nom est trop court").max(120, "Le nom est trop long"),
  description: z.string().max(1000, "La description est trop longue").nullable(),
  publicEmail: z.email("Email invalide").nullable(),
  phone: z.string().min(3, "Le numéro de téléphone est trop court").max(32, "Le numéro de téléphone est trop long").nullable(),
  website: z.string().min(5, "L'URL est trop courte").max(2048, "L'URL est trop longue").nullable(),
  logoUrl: z.string().min(5, "L'URL du logo est trop courte").max(2048, "L'URL du logo est trop longue").nullable(),
  primaryColor: z.string().min(4, "La couleur primaire est trop courte").max(20, "La couleur primaire est trop longue").nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  defaultEventBannerUrl: z.string().min(5, "L'URL de la bannière est trop courte").max(2048, "L'URL de la bannière est trop longue").nullable(),
});

export type OrganizationProfile = z.infer<typeof organizationProfileSchema>;