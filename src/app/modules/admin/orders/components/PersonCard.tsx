import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@ui/components";
import { toDisplayText } from "@helpers/normalize";
import type { Attendee } from "@shared/models/db/db.attendee.schema";
import type { FilledField, Identity } from "./OrdersPeopleList";

import "./PersonCard.css";

type FilledFieldGroupSection = {
  id: string | null;
  label: string | null;
  fields: FilledField[];
};

type PersonCardProps = {
  att: Attendee;
  identity: Identity;
  filled: FilledField[];
  filledGrouped?: FilledFieldGroupSection[];
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

function isTruthyCheckboxValue(value: string) {
  return value === "true" || value === "Oui";
}

function isFalsyCheckboxValue(value: string) {
  return value === "false" || value === "Non";
}

export function PersonCard({
  att,
  identity,
  filled,
  filledGrouped,
  onEdit,
  footer,
}: PersonCardProps) {
  const [expanded, setExpanded] = useState(false);

  const flatFields = useMemo(() => {
    if (filledGrouped && filledGrouped.length > 0) {
      return filledGrouped.flatMap((section) => section.fields);
    }
    return filled;
  }, [filled, filledGrouped]);

  const limit = DEFAULT_VISIBLE_FIELDS;
  const hasMore = flatFields.length > limit;

  const visibleCount = !hasMore ? flatFields.length : expanded ? flatFields.length : limit;

  const visibleGrouped = useMemo(() => {
    if (!filledGrouped || filledGrouped.length === 0) return null;

    let remaining = visibleCount;

    return filledGrouped
      .map((section) => {
        if (remaining <= 0) {
          return { ...section, fields: [] };
        }

        const nextFields = section.fields.slice(0, remaining);
        remaining -= nextFields.length;

        return {
          ...section,
          fields: nextFields,
        };
      })
      .filter((section) => section.fields.length > 0);
  }, [filledGrouped, visibleCount]);

  const visibleFields = useMemo(() => {
    if (visibleGrouped) return [];
    if (!hasMore) return filled;
    return expanded ? filled : filled.slice(0, limit);
  }, [filled, expanded, hasMore, visibleGrouped]);

  const hiddenCount = hasMore ? flatFields.length - visibleCount : 0;

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

      {visibleGrouped && visibleGrouped.length > 0 ? (
        <div className="adminFilledGroups">
          {visibleGrouped.map((section) => (
            <div
              key={section.id ?? "ungrouped"}
              className="adminFilledGroupSection"
            >
              {section.label ? (
                <div className="adminFilledGroupTitle">{section.label}</div>
              ) : null}

              <div className="adminFilledGrid">
                {section.fields.map((f) => {
                  const isCheckbox = f.fieldType === "checkbox";
                  const displayValue = toDisplayText(f.value);

                  return (
                    <div key={f.key} className="adminFieldLine">
                      <span className="adminFieldLabel">{f.label}</span>

                      {isCheckbox ? (
                        <span
                          className={[
                            "adminFieldValue",
                            "adminFieldValueBool",
                            isTruthyCheckboxValue(String(f.value)) ? "isYes" : "",
                            isFalsyCheckboxValue(String(f.value)) ? "isNo" : "",
                          ].join(" ")}
                        >
                          {displayValue}
                        </span>
                      ) : (
                        <span className="adminFieldValue">{displayValue}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="adminFilledGrid">
          {visibleFields.length > 0 ? (
            visibleFields.map((f) => {
              const isCheckbox = f.fieldType === "checkbox";
              const displayValue = toDisplayText(f.value);

              return (
                <div key={f.key} className="adminFieldLine">
                  <span className="adminFieldLabel">{f.label}</span>

                  {isCheckbox ? (
                    <span
                      className={[
                        "adminFieldValue",
                        "adminFieldValueBool",
                        isTruthyCheckboxValue(String(f.value)) ? "isYes" : "",
                        isFalsyCheckboxValue(String(f.value)) ? "isNo" : "",
                      ].join(" ")}
                    >
                      {displayValue}
                    </span>
                  ) : (
                    <span className="adminFieldValue">{displayValue}</span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="adminFilledEmpty">Aucun champ rempli.</div>
          )}
        </div>
      )}

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