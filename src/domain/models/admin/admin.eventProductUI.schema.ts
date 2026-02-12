import { z } from "zod";
import { eventProductSchema } from "../db/db.eventProducts.schema";

export const eventProductUISchema = eventProductSchema.pick({
    id: true,
    name: true,
    priceCents: true,
    currency: true,
    sortOrder: true,
    soldQty: true,
    stockQty: true,
    reservedQty: true,
    createsAttendees: true,
    attendeesPerUnit: true,
}); 

export type EventProductUI = z.infer<typeof eventProductUISchema>;


