// features/admin/hooks/useSaveOrgInfo.ts
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { updateOrgInfoRepo } from "../../../gateways/supabase/repositories/dashboard/updateOrgInfoRepo";

import type {
  UpdateOrgInfoPatch,
  UpdateOrgInfoResult,
} from "../../../domain/models/admin/admin.updateOrgPatch.schema";

import { normalizeError } from "../../../domain/errors/errors";

/* ------------------------------------------------------------------ */
/* Types UI                                                            */
/* ------------------------------------------------------------------ */

export type OrgInfoForm = {
  type: "association" | "person";
  name: string;
  status: "active" | "suspended";

  description: string | null;
  publicEmail: string | null;
  phone: string | null;
  website: string | null;
};

type SaveInput = {
  orgId: string;
  initial: OrgInfoForm;
  current: OrgInfoForm;
};

type State = {
  loading: boolean;
  error: string | null;
  updated: UpdateOrgInfoResult | null;
};

/* ------------------------------------------------------------------ */
/* Helper : build patch minimal                                        */
/* ------------------------------------------------------------------ */

function normStr(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

function toNullableLoose(v: string | null) {
  if (v === null) return null;
  return v === "" ? null : v;
}

function toNullableTrimmed(v: string | null) {
  if (v === null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}


function buildOrgInfoPatch(
  initial: OrgInfoForm,
  current: OrgInfoForm
): Omit<UpdateOrgInfoPatch, "orgId"> {
  const patch: Record<string, unknown> = {};

  // organizations
  if (current.type !== initial.type) patch.type = current.type;

  if (normStr(current.name) !== normStr(initial.name)) {
    patch.name = normStr(current.name);
  }

  if (current.status !== initial.status) patch.status = current.status;

  // organization_profile
    const curDesc = toNullableLoose(current.description);
    const iniDesc = toNullableLoose(initial.description);
    if (curDesc !== iniDesc) patch.description = curDesc;


    const curEmail = toNullableTrimmed(current.publicEmail);
    const iniEmail = toNullableTrimmed(initial.publicEmail);
    if (curEmail !== iniEmail) patch.publicEmail = curEmail;

    const curPhone = toNullableTrimmed(current.phone);
    const iniPhone = toNullableTrimmed(initial.phone);
    if (curPhone !== iniPhone) patch.phone = curPhone;

    const curWeb = toNullableTrimmed(current.website);
    const iniWeb = toNullableTrimmed(initial.website);
    if (curWeb !== iniWeb) patch.website = curWeb;


  return patch as Omit<UpdateOrgInfoPatch, "orgId">;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useSaveOrgInfo(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => updateOrgInfoRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    updated: null,
  });

  async function saveOrgInfo(input: SaveInput): Promise<UpdateOrgInfoResult | null> {
    try {
      setState((s) => ({
        ...s,
        loading: true,
        error: null,
        updated: null,
      }));

      const patch = buildOrgInfoPatch(input.initial, input.current);

      // sécurité : rien à sauver
      if (Object.keys(patch).length === 0) {
        setState((s) => ({ ...s, loading: false }));
        return null;
      }

      const updated = await repo.updateOrgInfo({
        orgId: input.orgId,
        ...patch,
      });

      setState({
        loading: false,
        error: null,
        updated,
      });

      return updated;
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

  function hasChanges(initial: OrgInfoForm, current: OrgInfoForm): boolean {
    return Object.keys(buildOrgInfoPatch(initial, current)).length > 0;
  }

  return {
    ...state,
    saveOrgInfo,
    hasChanges,
    reset,
  };
}
