import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";
import Badge from "../../ui/components/badge/Badge";

import { PublicEventHeader } from "./checkout/PublicEventHeader";
import { loadDraft, saveDraft } from "./checkout/checkoutStore";


import "../../styles/publicPages.css";

type Field = {
  id: string;
  label: string;
  fieldKey: string;
  fieldType: string;
  isRequired: boolean;
  options: any;
  sortOrder: number;
};

type Draft = ReturnType<typeof loadDraft>;

// ✅ on garde un “slot” participant avec son productId + ses réponses
type AttendeeSlot = Record<string, unknown> & {
  eventProductId: string;
};

export function EventAttendeesPage() {
  const navigate = useNavigate();
  const { orgSlug, eventSlug } = useParams<{ orgSlug: string; eventSlug: string }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  // ✅ Draft in state (stable hooks)
  const [draft, setDraft] = useState<Draft | null>(null);

  // Load draft when route changes
  useEffect(() => {
    if (!orgSlug || !eventSlug) return;
    setDraft(loadDraft(orgSlug, eventSlug));
  }, [orgSlug, eventSlug]);

  // Helper: persist draft
  function persist(next: Draft) {
    setDraft(next);
    saveDraft(next);
  }

  const quantities = draft?.quantities ?? {};

  const totalSelected = useMemo(() => {
    return Object.values(quantities).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  }, [quantities]);

  // Sort fields once data is available
  const fields: Field[] = useMemo(() => {
    const ff = data?.formFields ?? [];
    return [...ff].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [data?.formFields]);

  // ✅ Build the attendee "slots" we expect, based on selected products
  const expectedSlots: AttendeeSlot[] = useMemo(() => {
    const products = [...(data?.products ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );

    const slots: AttendeeSlot[] = [];

    for (const p of products) {
      const qty = Number(quantities[p.id] ?? 0) || 0;
      if (!p.createsAttendees) continue;

      const perUnit = p.attendeesPerUnit ?? 0;
      const count = qty * perUnit;

      for (let i = 0; i < count; i++) {
        slots.push({ eventProductId: p.id });
      }
    }

    return slots;
  }, [data?.products, quantities]);

  const attendeesCount = expectedSlots.length;

  // ✅ Ensure draft.attendees matches expected slots (length + eventProductId)
  useEffect(() => {
    if (!orgSlug || !eventSlug) return;
    if (!data) return;
    if (!draft) return;

    const current = (draft.attendees ?? []) as Array<Record<string, unknown>>;

    // construit next en conservant les réponses existantes par index
    const next = expectedSlots.map((slot, idx) => {
      const prev = current[idx] ?? {};
      // Force eventProductId du slot, tout en gardant les réponses de l’utilisateur
      return { ...prev, eventProductId: slot.eventProductId } as AttendeeSlot;
    });

    // évite de persister si identique (préviens loops)
    const sameLength = next.length === current.length;
    const sameIds =
      sameLength &&
      next.every((a, i) => a.eventProductId === (current[i] as any)?.eventProductId);

    if (sameIds) return;

    persist({
      ...draft,
      attendees: next as any,
      acceptedTerms: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedSlots, data, orgSlug, eventSlug, draft]);

  const attendees = (draft?.attendees ?? []) as AttendeeSlot[];

  function setAnswer(attendeeIndex: number, fieldKey: string, value: unknown) {
    if (!draft) return;

    const nextAttendees = attendees.map((a, idx) =>
      idx === attendeeIndex ? { ...a, [fieldKey]: value } : a
    );

    persist({
      ...draft,
      attendees: nextAttendees as any,
      acceptedTerms: false,
    });
  }

  function isFieldFilled(field: Field, attendee: Record<string, unknown>) {
    const v = attendee[field.fieldKey];

    if (field.fieldType === "checkbox") return v === true;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "boolean") return true; // already handled checkbox above, but safe
    return v != null;
  }

  const allValid = useMemo(() => {
    if (attendeesCount === 0) return true;
    if (fields.length === 0) return true;

    return attendees.every((a) =>
      fields.every((f) => (!f.isRequired ? true : isFieldFilled(f, a)))
    );
  }, [attendees, attendeesCount, fields]);

  function goBack() {
    if (!orgSlug || !eventSlug) return;
    navigate(`/o/${orgSlug}/e/${eventSlug}/billets`);
  }

  function goNext() {
    if (!orgSlug || !eventSlug) return;
    navigate(`/o/${orgSlug}/e/${eventSlug}/paiement`);
  }

  // ---------------- RENDER (returns only after hooks) ----------------

  if (loading || !orgSlug || !eventSlug) {
    return (
      <div className="publicPage">
        <Container>Chargement…</Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="publicPage">
        <Container>Erreur : {error}</Container>
      </div>
    );
  }

  if (!data?.event) {
    return (
      <div className="publicPage">
        <Container>Événement introuvable.</Container>
      </div>
    );
  }

  const { org, event } = data;

  return (
    <div className="publicPage">
      {org?.logoUrl ? (
        <Link to={`/o/${orgSlug}`} className="publicCornerLogoWrap">
          <img src={org.logoUrl} alt={org.slug} className="publicCornerLogo" />
        </Link>
      ) : null}

      <Container>
        <div className="publicSurface">
          <PublicEventHeader orgSlug={orgSlug} org={org} event={event} />

          <div className="publicDivider" />

          <div className="publicSectionTitle">2/3 — Participants</div>

          {totalSelected <= 0 ? (
            <div className="publicEmpty">
              Aucun billet sélectionné. Reviens à l’étape “Billets”.
            </div>
          ) : attendeesCount === 0 ? (
            <div className="publicEmpty">
              Aucun formulaire participant n’est requis pour ces billets.
            </div>
          ) : fields.length === 0 ? (
            <div className="publicEmpty">Aucun champ configuré pour le formulaire.</div>
          ) : (
            <div className="publicGutter">
              <div className="publicList">
                {attendees.map((att, idx) => (
                  <Card key={idx}>
                    <CardHeader
                      title={<div className="publicCardTitle">Participant {idx + 1}</div>}
                      right={
                        <Badge
                          tone="neutral"
                          label={fields.some((f) => f.isRequired) ? "Champs requis" : "Optionnel"}
                        />
                      }
                    />
                    <CardBody>
                      <div className="publicGrid2">
                        {fields.map((f) => {
                          const value = (att as any)?.[f.fieldKey];

                          const commonStyle: React.CSSProperties = {
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.10)",
                            outline: "none",
                          };

                          const label = (
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>
                              {f.label}{" "}
                              {f.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
                            </div>
                          );

                          if (f.fieldType === "textarea") {
                            return (
                              <div key={f.id}>
                                {label}
                                <textarea
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.value)}
                                  style={{ ...commonStyle, minHeight: 90, resize: "vertical" }}
                                />
                              </div>
                            );
                          }

                          if (f.fieldType === "select") {
                            const opts = Array.isArray(f.options) ? f.options : [];
                            return (
                              <div key={f.id}>
                                {label}
                                <select
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.value)}
                                  style={commonStyle}
                                >
                                  <option value="">—</option>
                                  {opts.map((o: any, i: number) => (
                                    <option key={i} value={String(o.value ?? o)}>
                                      {String(o.label ?? o)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          }

                          if (f.fieldType === "checkbox") {
                            return (
                              <div
                                key={f.id}
                                style={{ display: "flex", alignItems: "center", gap: 10 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={value === true}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.checked)}
                                  style={{ width: 18, height: 18 }}
                                />
                                <div style={{ fontWeight: 800 }}>
                                  {f.label}{" "}
                                  {f.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
                                </div>
                              </div>
                            );
                          }

                          const inputType =
                            f.fieldType === "email"
                              ? "email"
                              : f.fieldType === "number"
                              ? "number"
                              : "text";

                          return (
                            <div key={f.id}>
                              {label}
                              <input
                                type={inputType}
                                value={
                                  inputType === "number"
                                    ? typeof value === "number"
                                      ? value
                                      : ""
                                    : typeof value === "string"
                                    ? value
                                    : ""
                                }
                                onChange={(e) =>
                                  setAnswer(
                                    idx,
                                    f.fieldKey,
                                    inputType === "number"
                                      ? e.target.value === ""
                                        ? ""
                                        : Number(e.target.value)
                                      : e.target.value
                                  )
                                }
                                style={commonStyle}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="publicDivider" />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="secondary" label="Retour aux billets" onClick={goBack} />
            <Button
              label="Continuer"
              onClick={goNext}
              disabled={totalSelected <= 0 || !allValid}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}

export default EventAttendeesPage;
