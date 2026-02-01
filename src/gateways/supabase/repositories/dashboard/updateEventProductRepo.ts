import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";

import {
  eventProductSchema,
  type EventProduct,
} from "../../../../domain/models/db/db.eventProducts.schema";

import {
  createEventProductSchema,
  type CreateEventProductInput,
} from "../../../../domain/models/admin/admin.createEventProduct.schema";

const updateEventProductPatchSchema = createEventProductSchema.partial();
export type UpdateEventProductPatch = Partial<CreateEventProductInput>;

function normalizePatch(patch: UpdateEventProductPatch): UpdateEventProductPatch {

  const out: UpdateEventProductPatch = { ...patch };

  if ("currency" in out) out.currency = out.currency ?? "EUR"; // optionnel : garde si tu veux
  if ("description" in out) out.description = out.description ?? null;
  if ("stockQty" in out) out.stockQty = out.stockQty === 0 ? null : (out.stockQty ?? null);

  return out;
}

export function updateEventProductRepo(supabase: SupabaseClient) {
  return {
    async updateEventProduct(input: {
      productId: string;
      patch: UpdateEventProductPatch;
    }): Promise<EventProduct> {
      const productId = input.productId;
      if (!productId) throw new Error("VALIDATION_ERROR: productId is required");

      const validatedPatch = updateEventProductPatchSchema.parse(input.patch);

      const normalizedPatch = normalizePatch(validatedPatch);

      if (Object.keys(normalizedPatch).length === 0) {
        const row = await supabaseSafe(() =>
          supabase.from("event_products").select("*").eq("id", productId).single()
        );
        return eventProductSchema.parse(snakeToCamel(row));
      }

      const payload = camelToSnake(normalizedPatch);

      const row = await supabaseSafe(() =>
        supabase
          .from("event_products")
          .update(payload)
          .eq("id", productId)
          .select("*")
          .single()
      );

      return eventProductSchema.parse(snakeToCamel(row));
    },
  };
}
