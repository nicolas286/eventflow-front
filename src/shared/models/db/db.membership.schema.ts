import { z } from "zod";

export const memberSchema = z.object({
  orgId: z.uuid(),      
  userId: z.uuid(),
  role: z.enum(["admin", "owner"]),
  createdAt: z.string(),
});

export const membershipSchema = z
  .union([
    z.array(memberSchema),
    memberSchema,
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]));

export type Member = z.infer<typeof memberSchema>;
export type Membership = z.infer<typeof membershipSchema>;
