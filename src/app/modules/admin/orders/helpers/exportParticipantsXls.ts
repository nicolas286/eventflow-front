/**
 * Génère et télécharge un fichier Excel (.xlsx) contenant la liste des participants d’un événement.
 *
 * Fonction pure côté métier (aucune dépendance UI) :
 * - Trie les participants par ordre alphabétique via `computeIdentityTitle`.
 * - Construit les colonnes fixes (Réf commande, Statut, Billet, Index).
 * - Ajoute dynamiquement une colonne par champ du formulaire (`regFields`),
 *   en utilisant le label si disponible (sinon `fieldKey`).
 * - Remplit chaque ligne avec les réponses du participant (`filledFieldsByAttendeeId`).
 * - Définit des largeurs de colonnes confortables.
 * - Génère un nom de fichier sûr via `safeFilename`.
 *
 * Important :
 * - `localAttendees` contrôle exactement quels participants sont exportés
 *   (ex: tous, uniquement confirmés, ou selon filtres UI).
 * - `computeIdentityTitle` doit toujours retourner une string exploitable pour le tri.
 *
 * Cette fonction ne modifie aucun état et déclenche uniquement le téléchargement
 * du fichier côté navigateur.
 */

import * as XLSX from "xlsx";
import { getFirst, sortAlpha } from "@helpers/logic";
import type { EventDetailAdmin } from "../../singleEvent/schemas/admin.eventDetail.schema";
import type { EventFormField } from "@shared/models/db/db.eventFormFields.schema";
import type { Attendee } from "@shared/models/db/db.attendee.schema";
import { safeFilename } from "@helpers/normalize";

const FIXED_COLS = ["Réf commande", "Statut", "Billet", "Index"] as const;
type FixedCol = typeof FIXED_COLS[number];
type XlsRow = Record<FixedCol, string | number | null> & Record<string, unknown>;

export type ExportParticipantsXlsInput = {
    data: EventDetailAdmin;
    regFields: EventFormField[];
    localAttendees: Attendee[];
    filledFieldsByAttendeeId: Map<string, { key: string; value: unknown }[]>;
    computeIdentityTitle: (attendeeId: string) => string;
};

export function exportParticipantsXls(input: ExportParticipantsXlsInput) {

    const { data, regFields, localAttendees, filledFieldsByAttendeeId, computeIdentityTitle } = input;

    const formCols = regFields.map((f) => (f.label?.trim() ? f.label.trim() : f.fieldKey));
    const headers = [...FIXED_COLS, ...formCols];

    const attendeesSorted = sortAlpha(localAttendees, (att) => computeIdentityTitle(att.id));

    const rows: XlsRow[] = attendeesSorted.map((att) => {
        const orderId = String(att.orderId ?? "");
        const orderRef = orderId.slice(0, 8);

        const filled = filledFieldsByAttendeeId.get(att.id) ?? [];
        const filledByKey = new Map(filled.map((x) => [x.key, x.value]));

        const row: XlsRow = {
            "Réf commande": orderRef,
            Statut: att.status ?? "",
            Billet: att.productNameSnapshot ?? "",
            Index: att.attendeeIndex ?? "",
        };

        for (const f of regFields) {
            const label = f.label?.trim() ? f.label.trim() : f.fieldKey;
            row[label] = filledByKey.get(f.fieldKey) ?? "";
        }

        return row;
        });

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws["!cols"] = headers.map((h) => ({ wch: Math.min(Math.max(h.length, 14), 38) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");

    const safeEventTitle = safeFilename(
    getFirst(data?.event, ["title", "name"]) ?? "event",
    "event",
    60
    );

XLSX.writeFile(wb, `participants-${safeEventTitle}.xlsx`);
}