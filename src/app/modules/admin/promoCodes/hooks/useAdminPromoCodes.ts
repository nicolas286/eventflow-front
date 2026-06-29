import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { adminPromoCodesRepo } from "../data/promoCodeRepo";
import { normalizeError } from "@errors/errors";

import type { DbPromoCode } from "@shared/models/db/db.promoCode.schema";
import type {
  CreatePromoCodeInput,
  UpdatePromoCodePatch,
  DeletePromoCodeInput,
} from "../schemas/admin.promoCode.schema";

type State = {
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
  promoCodes: DbPromoCode[];
};

export function useAdminPromoCodes(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => adminPromoCodesRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    saving: false,
    deleting: false,
    error: null,
    promoCodes: [],
  });

  async function loadPromoCodes(input: { eventId: string }): Promise<DbPromoCode[]> {
    try {
      setState((s) => ({
        ...s,
        loading: true,
        error: null,
      }));

      const promoCodes = await repo.listEventPromoCodes(input);

      setState((s) => ({
        ...s,
        loading: false,
        error: null,
        promoCodes,
      }));

      return promoCodes;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de charger les codes promo");

      setState((s) => ({
        ...s,
        loading: false,
        error: ne.message,
      }));

      return [];
    }
  }

  async function createPromoCode(input: CreatePromoCodeInput): Promise<DbPromoCode | null> {
    try {
      setState((s) => ({
        ...s,
        saving: true,
        error: null,
      }));

      const created = await repo.createPromoCode(input);

      setState((s) => ({
        ...s,
        saving: false,
        error: null,
        promoCodes: [created, ...s.promoCodes],
      }));

      return created;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de créer le code promo");

      setState((s) => ({
        ...s,
        saving: false,
        error: ne.message,
      }));

      return null;
    }
  }

  async function updatePromoCode(input: {
    promoCodeId: string;
    patch: UpdatePromoCodePatch;
  }): Promise<DbPromoCode | null> {
    try {
      setState((s) => ({
        ...s,
        saving: true,
        error: null,
      }));

      const updated = await repo.updatePromoCode(input);

      setState((s) => ({
        ...s,
        saving: false,
        error: null,
        promoCodes: s.promoCodes.map((code) =>
          code.id === updated.id ? updated : code
        ),
      }));

      return updated;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de modifier le code promo");

      setState((s) => ({
        ...s,
        saving: false,
        error: ne.message,
      }));

      return null;
    }
  }

  async function deletePromoCode(input: DeletePromoCodeInput): Promise<boolean> {
    try {
      setState((s) => ({
        ...s,
        deleting: true,
        error: null,
      }));

      await repo.deletePromoCode(input);

      setState((s) => ({
        ...s,
        deleting: false,
        error: null,
        promoCodes: s.promoCodes.filter((code) => code.id !== input.id),
      }));

      return true;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de supprimer le code promo");

      setState((s) => ({
        ...s,
        deleting: false,
        error: ne.message,
      }));

      return false;
    }
  }

  function reset() {
    setState({
      loading: false,
      saving: false,
      deleting: false,
      error: null,
      promoCodes: [],
    });
  }

  function clearError() {
    setState((s) => ({
      ...s,
      error: null,
    }));
  }

  return {
    ...state,
    loadPromoCodes,
    createPromoCode,
    updatePromoCode,
    deletePromoCode,
    reset,
    clearError,
  };
}