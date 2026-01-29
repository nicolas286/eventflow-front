// features/admin/hooks/useSaveAdminProfile.ts
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { updateAdminProfileRepo } from "../../../gateways/supabase/repositories/dashboard/updateAdminProfileRepo";

import type {
  AdminProfileForm,
  AdminProfilePatch,
} from "../../../domain/models/admin/admin.updateAdminProfile.schema";

import { normalizeError } from "../../../domain/errors/errors";
import { inferCountryCode } from "../../../domain/helpers/countries";

type SaveInput = {
  userId: string;
  form: AdminProfileForm;
};

type State = {
  loading: boolean;
  error: string | null;
  updated: AdminProfileForm | null;
};

export function useSaveAdminProfile(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const profileRepo = useMemo(
    () => updateAdminProfileRepo(supabase),
    [supabase]
  );

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    updated: null,
  });

  function emptyToNull(v: unknown): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? null : t;
  }

  function buildPatch(form: AdminProfileForm): AdminProfilePatch {
    const country = emptyToNull(form.country);

    return {
      firstName: emptyToNull(form.firstName),
      lastName: emptyToNull(form.lastName),
      phone: emptyToNull(form.phone),
      addressLine1: emptyToNull(form.addressLine1),
      addressLine2: emptyToNull(form.addressLine2),
      postalCode: emptyToNull(form.postalCode),
      city: emptyToNull(form.city),
      countryCode: inferCountryCode(country),
    };
  }

  async function saveAdminProfile(input: SaveInput): Promise<AdminProfileForm | null> {
    try {
      setState({
        loading: true,
        error: null,
        updated: null,
      });

      const patch = buildPatch(input.form);

      const updated = await profileRepo.updateAdminProfile({
        userId: input.userId,
        patch,
      });

      const mapped: AdminProfileForm = {
        userId: updated.userId,
        firstName: updated.firstName ?? null,
        lastName: updated.lastName ?? null,
        phone: updated.phone ?? null,
        addressLine1: updated.addressLine1 ?? null,
        addressLine2: updated.addressLine2 ?? null,
        postalCode: updated.postalCode ?? null,
        city: updated.city ?? null,
        countryCode: updated.countryCode ?? null,
      };

      setState({
        loading: false,
        error: null,
        updated: mapped,
      });

      return mapped;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de sauvegarder le profil");
      setState({
        loading: false,
        error: ne.message,
        updated: null,
      });
      return null;
    }
  }

  function reset() {
    setState({
      loading: false,
      error: null,
      updated: null,
    });
  }

  return {
    ...state,
    saveAdminProfile,
    reset,
  };
}
