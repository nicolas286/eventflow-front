import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { camelToSnake } from "@helpers/camelToSnake";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  dbPromoCodeSchema,
  type DbPromoCode,
} from "@shared/models/db/db.promoCode.schema";

import {
  createPromoCodeInputSchema,
  updatePromoCodePatchSchema,
  deletePromoCodeInputSchema,
  type CreatePromoCodeInput,
  type UpdatePromoCodePatch,
  type DeletePromoCodeInput,
} from "../schemas/admin.promoCode.schema";

function normalizePatch(patch: UpdatePromoCodePatch): UpdatePromoCodePatch {
  const out: UpdatePromoCodePatch = { ...patch };

  if ("code" in out) {
    out.code = out.code?.trim().toUpperCase() ?? out.code;
  }

  if ("maxUses" in out) {
    out.maxUses = out.maxUses ?? null;
  }

  if ("startsAt" in out) {
    out.startsAt = out.startsAt ?? null;
  }

  if ("endsAt" in out) {
    out.endsAt = out.endsAt ?? null;
  }

  return out;
}

export function adminPromoCodesRepo(supabase: SupabaseClient) {
  return {
    async listEventPromoCodes(input: {
      eventId: string;
    }): Promise<DbPromoCode[]> {
      const eventId = input.eventId;
      if (!eventId) throw new Error("VALIDATION_ERROR: eventId is required");

      const rows = await supabaseSafe(() =>
        supabase
          .from("promo_codes")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
      );

      return (rows ?? []).map((row) =>
        dbPromoCodeSchema.parse(snakeToCamel(row))
      );
    },

    async createPromoCode(input: CreatePromoCodeInput): Promise<DbPromoCode> {
      const validated = createPromoCodeInputSchema.parse(input);

      const payload = camelToSnake({
        ...validated,
        code: validated.code.trim().toUpperCase(),
        maxUses: validated.maxUses ?? null,
        startsAt: validated.startsAt ?? null,
        endsAt: validated.endsAt ?? null,
        isActive: validated.isActive ?? true,
      });

      const row = await supabaseSafe(() =>
        supabase
          .from("promo_codes")
          .insert(payload)
          .select("*")
          .single()
      );

      return dbPromoCodeSchema.parse(snakeToCamel(row));
    },

    async updatePromoCode(input: {
      promoCodeId: string;
      patch: UpdatePromoCodePatch;
    }): Promise<DbPromoCode> {
      const promoCodeId = input.promoCodeId;
      if (!promoCodeId) throw new Error("VALIDATION_ERROR: promoCodeId is required");

      if (Object.keys(input.patch).length === 0) {
        const row = await supabaseSafe(() =>
          supabase
            .from("promo_codes")
            .select("*")
            .eq("id", promoCodeId)
            .single()
        );

        return dbPromoCodeSchema.parse(snakeToCamel(row));
      }

      const validated = updatePromoCodePatchSchema.parse(input.patch);
      const normalizedPatch = normalizePatch(validated);

      const payload = camelToSnake(normalizedPatch);

      const row = await supabaseSafe(() =>
        supabase
          .from("promo_codes")
          .update(payload)
          .eq("id", promoCodeId)
          .select("*")
          .single()
      );

      return dbPromoCodeSchema.parse(snakeToCamel(row));
    },

    async deletePromoCode(input: DeletePromoCodeInput): Promise<void> {
      const validated = deletePromoCodeInputSchema.parse(input);

      await supabaseSafe(() =>
        supabase
          .from("promo_codes")
          .delete()
          .eq("id", validated.id)
      );
    },
  };
}