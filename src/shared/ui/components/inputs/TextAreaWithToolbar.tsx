import type React from "react";

import TextArea from "./TextArea";
import { useMarkdownTextarea } from "@shared/hooks/useMarkdownTextarea";

type Props = {
  value: string;
  onChange: (next: string) => void;

  label?: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;

  className?: string;
  textAreaClassName?: string;
  rows?: number;

  tools?: Partial<{
    bold: boolean;
    italic: boolean;
    strike: boolean;
    bullet: boolean;
    h3: boolean;
    divider: boolean;
    link: boolean;
  }>;
};

const defaultTools = {
  bold: true,
  italic: true,
  strike: true,
  bullet: true,
  h3: true,
  divider: true,
  link: true,
};

export function TextareaWithToolbar({
  value,
  onChange,
  label,
  error,
  hint,
  className,
  textAreaClassName,
  rows = 6,
  tools,
}: Props) {
  const md = useMarkdownTextarea({ value, setValue: onChange });

  const t = { ...defaultTools, ...(tools ?? {}) };

  const mdAction =
    (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      fn();
    };

  return (
    <div className={className}>
      <div className="mdToolbar">
        {t.bold && (
          <button type="button" className="mdBtn" onMouseDown={mdAction(md.actions.bold)}>
            B
          </button>
        )}
        {t.italic && (
          <button type="button" className="mdBtn" onMouseDown={mdAction(md.actions.italic)}>
            I
          </button>
        )}
        {t.strike && (
          <button type="button" className="mdBtn" onMouseDown={mdAction(md.actions.strike)}>
            /
          </button>
        )}

        <span className="mdSep" />

        {t.bullet && (
          <button type="button" className="mdBtn" onMouseDown={mdAction(md.actions.bullet)}>
            •
          </button>
        )}
        {t.h3 && (
          <button type="button" className="mdBtn" onMouseDown={mdAction(md.actions.h3)}>
            H
          </button>
        )}
        {t.divider && (
          <button type="button" className="mdBtn" onMouseDown={mdAction(md.actions.divider)}>
            —
          </button>
        )}

        <span className="mdSep" />

        {t.link && (
          <button type="button" className="mdBtn" onMouseDown={mdAction(md.actions.link)}>
            🔗
          </button>
        )}
      </div>

      <TextArea
        ref={(node) => md.bindRef(node)}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        textAreaClassName={textAreaClassName}
        />

      {error && <div className="formError">{error}</div>}
      {hint && <div className="adminEventHint">{hint}</div>}
    </div>
  );
}