// admin.auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string(),
});

const passwordSchema = z
  .string()
  .min(8, "Mot de passe trop court (min. 8 caractères)")
  .refine((v) => /[A-Z]/.test(v) || /\d/.test(v), {
    message: "Ajoutez au moins 1 majuscule ou 1 chiffre",
  });

export const signupSchema = z.object({
  email: z.email("Email invalide"),
  password: passwordSchema,
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "Vous devez accepter les conditions",
  }),
});

export const signupUiSchema = signupSchema
  .extend({
    confirmPassword: z.string().min(1, "Confirmez le mot de passe."),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas.",
      });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SignupUiInput = z.infer<typeof signupUiSchema>;

