import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { camelToSnake } from "@helpers/camelToSnake";
import { snakeToCamel } from "@helpers/snakeToCamel";

import { createEventProductSchema,
  type CreateEventProductInput
 } from "../schemas/admin.createEventProduct.schema";

import {
  eventProductSchema,
  type EventProduct,
} from "@shared/models/db/db.eventProducts.schema";

type CreateEventProductRpcResult = string; 

export function createEventProductRepo(supabase: SupabaseClient) {
  return {
    async createEventProduct(input: CreateEventProductInput): Promise<EventProduct> {
      const validated = createEventProductSchema.parse(input);

      const normalized: CreateEventProductInput = {
        ...validated,
        currency: validated.currency ?? "EUR",
        isActive: validated.isActive ?? true,
        sortOrder: validated.sortOrder ?? 1,
        createsAttendees: validated.createsAttendees ?? true,
        attendeesPerUnit: validated.attendeesPerUnit ?? 1,
        isGatekeeper: validated.isGatekeeper ?? false,
        closeEventWhenSoldOut: validated.closeEventWhenSoldOut ?? false,
        stockQty: validated.stockQty === 0 ? null : (validated.stockQty ?? null),
        description: validated.description ?? null,
      };

      const payload = camelToSnake(normalized);
      const rawId = await supabaseSafe<CreateEventProductRpcResult>(
        () => supabase.rpc("create_event_product", { p_input: payload })
      );

      const productId = String(rawId);

     const row = await supabaseSafe<EventProduct>(
        () =>
          supabase
            .from("event_products")
            .select("*")
            .eq("id", productId)
            .single(),
      );


      const camel = snakeToCamel(row);
      return eventProductSchema.parse(camel);
    },
  };
}
