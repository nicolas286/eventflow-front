import type { ReactNode } from "react";
import  Button  from "../button/Button"; // adapte si besoin
import "../../../styles/desktop/ui.filterBar.css"

type FilterBarOption = {
  value: string;
  label: string;
  group?: string; // ex: "Champs participant"
};

type Props = {
  /** valeur de l'input */
  query: string;
  onQueryChange: (next: string) => void;

  /** placeholder custom (sinon calculé avec select) */
  placeholder?: string;

  /** si tu veux afficher un select (participants) */
  selectValue?: string;
  onSelectChange?: (next: string) => void;
  selectOptions?: FilterBarOption[];

  /** label bouton reset */
  resetLabel?: string;

  /** disable input/select */
  disabled?: boolean;

  /** slot à droite (ex: boutons actions) */
  right?: ReactNode;

  className?: string;
};

function groupOptions(options: FilterBarOption[]) {
  const groups = new Map<string, FilterBarOption[]>();
  const flat: FilterBarOption[] = [];

  for (const opt of options) {
    if (opt.group) {
      const arr = groups.get(opt.group) ?? [];
      arr.push(opt);
      groups.set(opt.group, arr);
    } else {
      flat.push(opt);
    }
  }

  return { flat, groups };
}

export function FilterBar({
  query,
  onQueryChange,
  placeholder,

  selectValue,
  onSelectChange,
  selectOptions,

  resetLabel = "Réinitialiser",
  disabled = false,

  right,
  className = "",
}: Props) {
  const showSelect = Boolean(selectOptions?.length && selectValue !== undefined && onSelectChange);

  const computedPlaceholder =
    placeholder ??
    (showSelect
      ? "Rechercher…"
      : "Rechercher…");

  const canReset = Boolean(query.trim());

  const { flat, groups } = showSelect ? groupOptions(selectOptions!) : { flat: [], groups: new Map() };

  return (
    <div className={["uiFilterBar", className].join(" ")}>
      {showSelect ? (
        <select
          className="uiFilterBarSelect"
          value={selectValue}
          onChange={(e) => onSelectChange?.(e.target.value)}
          disabled={disabled}
        >
          {flat.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}

          {Array.from(groups.entries()).map(([group, opts]) => (
            <optgroup key={group} label={group}>
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : null}

      <input
        className="uiFilterBarInput"
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={computedPlaceholder}
        disabled={disabled}
      />

      {canReset ? (
        <Button variant="ghost" onClick={() => onQueryChange("")} disabled={disabled}>
          {resetLabel}
        </Button>
      ) : null}

      {right ? <div className="uiFilterBarRight">{right}</div> : null}
    </div>
  );
}
