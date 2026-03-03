import type React from "react";
import { Button, Input } from "@ui/components";
import { EditorHeader } from "@ui/components/editor/EditorHeader";
import { EditorFormGrid, type EditorNode } from "@ui/components/editor/EditorFormGrid";

type Props<EditState extends {
  name: string;
  priceCents: number;
  currency: string;
  stockQty: number | null;
  isActive: boolean;
  createsAttendees: boolean;
  attendeesPerUnit: number;
  description: string;
}> = {
  editing: EditState | null;
  creating: boolean;
  setEditing: React.Dispatch<React.SetStateAction<EditState | null>>;
  isSaving: boolean;
  nonNegInt: (v: string) => number;
  posInt: (v: string) => number;

  onApplyLocal: () => void;   // upsertLocalFromEditor
  onClose: () => void;        // closeEditor
};

export function EventTicketEditorNode<EditState extends {
  name: string;
  priceCents: number;
  currency: string;
  stockQty: number | null;
  isActive: boolean;
  createsAttendees: boolean;
  attendeesPerUnit: number;
  description: string;
}>({
  editing,
  creating,
  setEditing,
  isSaving,
  nonNegInt,
  posInt,
  onApplyLocal,
  onClose,
}: Props<EditState>) {
  if (!editing) return null;

  const nodes: EditorNode[] = [
    {
      key: "name",
      label: "Nom",
      element: (
        <input
          className="adminEventInput"
          value={editing.name}
          onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
          disabled={isSaving}
        />
      ),
    },
    {
      key: "price",
      label: "Prix (€)",
      element: (
        <Input
          format="price"
          priceLocale="fr"
          placeholder="0,00"
          disabled={isSaving}
          value={(editing.priceCents / 100).toFixed(2).replace(".", ",")}
          onValueChange={(v) => {
            if (v.kind !== "priceCommit") return;
            setEditing((prev) => (prev ? { ...prev, priceCents: v.cents } : prev));
          }}
        />
      ),
    },
    {
      key: "currency",
      label: "Devise",
      element: (
        <select className="adminEventInput" value={editing.currency} disabled>
          <option value="EUR">EUR</option>
        </select>
      ),
    },
    {
      key: "stockQty",
      label: "Stock (vide = illimité)",
      element: (
        <input
          className="adminEventInput"
          type="number"
          value={editing.stockQty ?? ""}
          onChange={(e) =>
            setEditing((prev) =>
              prev
                ? { ...prev, stockQty: e.target.value === "" ? null : nonNegInt(e.target.value) }
                : prev
            )
          }
          disabled={isSaving}
        />
      ),
    },
    {
      key: "isActive",
      label: "Actif",
      element: (
        <label className="adminEventToggle">
          <input
            type="checkbox"
            checked={Boolean(editing.isActive)}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, isActive: e.target.checked } : prev))}
            disabled={isSaving}
          />
          <span>{editing.isActive ? "Actif" : "Inactif"}</span>
        </label>
      ),
    },
    {
      key: "createsAttendees",
      label: "Crée des participants",
      element: (
        <label className="adminEventToggle">
          <input
            type="checkbox"
            checked={Boolean(editing.createsAttendees)}
            onChange={(e) =>
              setEditing((prev) => (prev ? { ...prev, createsAttendees: e.target.checked } : prev))
            }
            disabled={isSaving}
          />
          <span>{editing.createsAttendees ? "Oui" : "Non"}</span>
        </label>
      ),
    },
    {
      key: "attendeesPerUnit",
      label: "Participants / billet",
      element: (
        <input
          className="adminEventInput"
          type="number"
          value={editing.attendeesPerUnit}
          onChange={(e) =>
            setEditing((prev) => (prev ? { ...prev, attendeesPerUnit: posInt(e.target.value) } : prev))
          }
          disabled={!editing.createsAttendees || isSaving}
        />
      ),
    },
    {
      key: "description",
      label: "Description",
      span2: true,
      element: (
        <textarea
          className="adminEventTextarea"
          value={editing.description}
          onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
          disabled={isSaving}
        />
      ),
    },
  ];

  return (
    <div className="adminTicketsEditorCard">
      <EditorHeader creating={creating} type="ticket" />

      <EditorFormGrid nodes={nodes} />

      <div className="adminTicketsEditorFooter adminTicketsEditorFooterInline">
        <Button onClick={onApplyLocal} disabled={!String(editing.name ?? "").trim() || isSaving}>
          {creating ? "Ajouter (local)" : "Appliquer (local)"}
        </Button>

        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          Fermer
        </Button>
      </div>
    </div>
  );
}