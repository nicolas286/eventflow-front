import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../../styles/structurePanel.css";

import { Button, Input, TextArea, Select, Badge } from "../../../ui/components";

import { supabase } from "../../../gateways/supabase/supabaseClient";
import { useSaveOrgInfo } from "../hooks/useSaveOrgInfo";
import { useStartMollieConnect } from "../hooks/useStartMollieConnect";

export type OrgStructure = {
  // editable
  type: "association" | "person";
  name: string;
  status: "active" | "suspended";

  description: string | null;
  publicEmail: string | null;
  phone: string | null;
  website: string | null;

  // read-only display
  slug: string;
  paymentsStatus: "not_connected" | "pending" | "connected" | "revoked";
  paymentsLiveReady: boolean;
};

type Props = {
  orgId: string;
  org: OrgStructure;
  onSaved: () => Promise<void>;
};

type Form = {
  type: OrgStructure["type"];
  name: string;
  status: OrgStructure["status"];
  description: string | null;
  publicEmail: string | null;
  phone: string | null;
  website: string | null;
};

function toForm(o: OrgStructure): Form {
  return {
    type: o.type,
    name: o.name,
    status: o.status,
    description: o.description ?? null,
    publicEmail: o.publicEmail ?? null,
    phone: o.phone ?? null,
    website: o.website ?? null,
  };
}

function toNullable(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

function prettyPaymentLabel(s: OrgStructure["paymentsStatus"]) {
  if (s === "not_connected") return "Non connecté";
  if (s === "pending") return "En attente";
  if (s === "connected") return "Connecté";
  if (s === "revoked") return "Révoqué";
  return s;
}

export default function StructurePanel({ orgId, org, onSaved }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const { loading, error, updated, saveOrgInfo, reset, hasChanges } = useSaveOrgInfo({ supabase });

  const {
    loading: connecting,
    error: connectError,
    startMollieConnect,
    reset: resetConnect,
  } = useStartMollieConnect({ supabase });

  // ✅ initial dépend de org (pas juste orgId)
  const initial = useMemo<Form>(() => toForm(org), [orgId, org]);

  // form local (on n’édite pas org directement tant que pas save)
  const [form, setForm] = useState<Form>(initial);

  // resync quand bootstrap/refetch modifie org
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const dirty = hasChanges(initial, form);

  const effectiveSlug = useMemo(() => {
    // priorité à la réponse RPC si elle existe (immédiat), sinon org (bootstrap)
    return updated?.profile?.slug ?? org.slug ?? "";
  }, [updated?.profile?.slug, org.slug]);

  /* -------- Mollie return flash -------- */

  const [connectFlash, setConnectFlash] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const connect = qs.get("connect");
    if (!connect) return;

    const errorCode = qs.get("error");
    const reason = qs.get("reason");

    if (connect === "1") {
      setConnectFlash({ ok: true, message: "Mollie connecté avec succès ✅" });
      onSaved().catch(() => null);
    } else {
      setConnectFlash({
        ok: false,
        message: reason
          ? `Connexion Mollie échouée : ${reason}`
          : errorCode
          ? `Connexion Mollie échouée : ${errorCode}`
          : "Connexion Mollie échouée",
      });
      onSaved().catch(() => null);
    }

    // ✅ Nettoyage URL après un petit délai (sinon tu ne vois jamais les params / flash)
    setTimeout(() => {
      qs.delete("connect");
      qs.delete("error");
      qs.delete("reason");

      const newSearch = qs.toString();
      navigate(
        {
          pathname: location.pathname,
          search: newSearch ? `?${newSearch}` : "",
        },
        { replace: true }
      );
    }, 300);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.pathname, navigate]);

  /* -------- actions -------- */

  async function handleSave() {
    reset();

    const res = await saveOrgInfo({
      orgId,
      initial,
      current: form,
    });

    if (!res) return;

    // ✅ On ne set plus org ici.
    // On refresh le bootstrap, qui redescendra dans org -> initial -> form.
    await onSaved();

    // ✅ Et on resync immédiatement le form avec la réponse RPC (UX instant)
    setForm({
      type: res.type as Form["type"],
      name: res.name,
      status: res.status as Form["status"],
      description: res.profile.description ?? null,
      publicEmail: res.profile.publicEmail ?? null,
      phone: res.profile.phone ?? null,
      website: res.profile.website ?? null,
    });
  }

async function handleConnect(mode: "test" | "live") {
  resetConnect();
  setConnectFlash(null);

  const url = await startMollieConnect({ orgId, mode });
  console.log("[mollie] start url =", url);

  if (url) window.location.href = url;
}


  /* -------- render -------- */

  return (
    <div className="structurePanel">
      <div className="structurePanel__grid2">
        {/* ---------------- Organisation ---------------- */}
        <div className="structurePanel__block">
          <div className="structurePanel__labelRow">
            <div>
              <div className="structurePanel__label">Organisation</div>
              <div className="structurePanel__hint">
                Le nom impacte le slug public. Si tu changes le nom, l’URL publique change.
              </div>
            </div>

            <Badge tone={dirty ? "warning" : "info"} label={dirty ? "Modifs" : "OK"} />
          </div>

          <div className="structurePanel__field">
            <div className="structurePanel__fieldLabel">Type</div>
            <Select
              value={form.type}
              onChange={(e: any) =>
                setForm((s) => ({ ...s, type: e.target.value as Form["type"] }))
              }
            >
              <option value="association">Association</option>
              <option value="person">Personne</option>
            </Select>
          </div>

          <div className="structurePanel__field">
            <Input
              label="Nom"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Nom de l’organisation"
            />
            <div className="structurePanel__help">
              Slug : <span className="structurePanel__mono">{effectiveSlug || "—"}</span>
            </div>
          </div>

          <div className="structurePanel__field">
            <div className="structurePanel__fieldLabel">Statut</div>
            <Select
              value={form.status}
              onChange={(e: any) =>
                setForm((s) => ({ ...s, status: e.target.value as Form["status"] }))
              }
            >
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
            </Select>
          </div>
        </div>

        {/* ---------------- Infos publiques ---------------- */}
        <div className="structurePanel__block">
          <div className="structurePanel__labelRow">
            <div>
              <div className="structurePanel__label">Infos publiques</div>
              <div className="structurePanel__hint">
                Affichées sur les pages publiques si tu les utilises (contact, event page, etc.)
              </div>
            </div>
          </div>

          <div className="structurePanel__field">
            <TextArea
              label="Description"
              value={form.description ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              rows={5}
              placeholder="Décrivez votre organisation…"
            />
          </div>

          <div className="structurePanel__grid2Inner">
            <Input
              label="Email public"
              value={form.publicEmail ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, publicEmail: toNullable(e.target.value) }))}
              placeholder="contact@..."
            />

            <Input
              label="Téléphone"
              value={form.phone ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, phone: toNullable(e.target.value) }))}
              placeholder="+32 ..."
            />
          </div>

          <div className="structurePanel__field">
            <Input
              label="Site web"
              value={form.website ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, website: toNullable(e.target.value) }))}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* ---------------- Mollie Connect ---------------- */}
      <div className="structurePanel__block">
        <div className="structurePanel__labelRow">
          <div>
            <div className="structurePanel__label">Paiements (Mollie)</div>
            <div className="structurePanel__hint">
              Lance le flow Mollie Connect. Le statut se met à jour au retour Mollie.
            </div>
          </div>

          <div className="structurePanel__chip">
            <span className="structurePanel__chipLabel">Statut</span>
            <span className="structurePanel__chipValue">{prettyPaymentLabel(org.paymentsStatus)}</span>
            {org.paymentsLiveReady ? (
              <span className="structurePanel__chipOk">live prêt</span>
            ) : (
              <span className="structurePanel__chipWarn">live non prêt</span>
            )}
          </div>
        </div>

        <div className="structurePanel__actionsBar">
          <div className="structurePanel__actions">
            <Button
              variant="secondary"
              label={connecting ? "Ouverture…" : "Connecter (test)"}
              onClick={() => handleConnect("test")}
              disabled={connecting}
            />
            <Button
              variant="primary"
              label={connecting ? "Ouverture…" : "Connecter (live)"}
              onClick={() => handleConnect("live")}
              disabled={connecting}
            />
          </div>

          <div className="structurePanel__status">
            {connectError ? <div className="structurePanel__error">{connectError}</div> : null}
            {connectFlash ? (
              <div className={connectFlash.ok ? "structurePanel__success" : "structurePanel__error"}>
                {connectFlash.message}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ---------------- Save bar ---------------- */}
      <div className="structurePanel__actionsBar">
        <div className="structurePanel__status">
          {error ? <div className="structurePanel__error">{error}</div> : null}
          {updated ? <div className="structurePanel__success">Infos sauvegardées</div> : null}
        </div>

        <div className="structurePanel__actions">
          <Button
            variant="primary"
            label={loading ? "Sauvegarde…" : "Sauvegarder"}
            onClick={handleSave}
            disabled={!dirty || loading}
          />
        </div>
      </div>
    </div>
  );
}
