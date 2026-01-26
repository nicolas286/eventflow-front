import { z } from "zod";

export const profileSchema = z.object({
  userId: z.uuid(), 
  firstName: z.string().min(2, "Le prénom est trop court").max(80, "Le prénom est trop long").nullable(),
  lastName: z.string().min(2, "Le nom est trop court").max(80, "Le nom est trop long").nullable(),
  phone: z.string().min(3, "Le numéro de téléphone est trop court").max(32, "Le numéro de téléphone est trop long").nullable(),
  addressLine1: z.string().min(3, "L'adresse est trop courte").max(120, "L'adresse est trop longue").nullable(),
  addressLine2: z.string().min(3, "L'adresse est trop courte").max(120, "L'adresse est trop longue").nullable().optional(),


});

export const signupSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court"),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "Vous devez accepter les conditions",
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;