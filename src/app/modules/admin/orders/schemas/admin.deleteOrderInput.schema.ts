import { z } from "zod";

export const deleteOrderInputSchema = z.object({
  id: z.uuid(),
});

export type DeleteOrderInput = z.infer<typeof deleteOrderInputSchema>;
