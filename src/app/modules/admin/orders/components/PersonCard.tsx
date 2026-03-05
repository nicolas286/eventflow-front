import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@ui/components";
import { toDisplayText } from "@helpers/normalize";
import type { Attendee } from "@shared/models/db/db.attendee.schema";
import type { FilledField, Identity } from "./OrdersPeopleList";

type PersonCardProps = {
  att: Attendee;
  identity: Identity;
  filled: FilledField[];
  onEdit: () => void;
  footer?: ReactNode;
};

const STATUS_LABEL: Record<string, string> = {
  reserved: "Réservé",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  expired: "Expiré",
};

const DEFAULT_VISIBLE_FIELDS = 10;

export function PersonCard({ att, identity, filled, onEdit, footer }: PersonCardProps) {
  const [expanded, setExpanded] = useState(false);

  const limit = DEFAULT_VISIBLE_FIELDS;
  const hasMore = filled.length > limit;

  const visibleFields = useMemo(() => {
    if (!hasMore) return filled;
    return expanded ? filled : filled.slice(0, limit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled, expanded, hasMore]);

  const hiddenCount = hasMore ? filled.length - limit : 0;

  return (
    <div className={`adminPersonCard ${expanded ? "isExpanded" : ""}`}>
      <div className="adminPersonTop">
        <div>
          <div className="adminPersonName">
            {identity.title} <span className="adminPersonIndex">#{att.attendeeIndex}</span>
          </div>
          {identity.subtitle ? <div className="adminPersonSub">{identity.subtitle}</div> : null}
        </div>

        <div className="adminPersonBadges">
          <span className={`adminStatusBadge is-${att.status}`}>
            {STATUS_LABEL[att.status] ?? att.status}
          </span>
          <span className="adminProductBadge">{att.productNameSnapshot}</span>
        </div>
      </div>

      <div className="adminFilledGrid">
        {visibleFields.length > 0 ? (
          visibleFields.map((f) => (
            <div key={f.key} className="adminFieldLine">
              <span className="adminFieldLabel">{f.label}</span>
              <span className="adminFieldValue">{toDisplayText(f.value)}</span>
            </div>
          ))
        ) : (
          <div className="adminFilledEmpty">Aucun champ rempli.</div>
        )}
      </div>

      {hasMore ? (
        <button
          type="button"
          className="adminPersonExpand"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className={`adminChevron ${expanded ? "isOpen" : ""}`} aria-hidden="true">
            ▾
          </span>
          {expanded ? "Réduire" : `Voir ${hiddenCount} champ${hiddenCount > 1 ? "s" : ""} de plus`}
        </button>
      ) : null}

      <div className="adminPersonActionsBottom">
        <Button variant="secondary" onClick={onEdit}>
          Modifier
        </Button>
        {footer}
      </div>
    </div>
  );
}