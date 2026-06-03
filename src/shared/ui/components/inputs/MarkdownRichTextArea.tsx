import type React from "react";

import "@mdxeditor/editor/style.css";
import "./MarkdownRichTextArea.css";

import {
  MDXEditor,
  toolbarPlugin,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  thematicBreakPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  CreateLink,
  UndoRedo,
  Separator,
} from "@mdxeditor/editor";

type Props = {
  value: string;
  onChange: (next: string) => void;

  label?: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;

  className?: string;
  editorClassName?: string;

  tools?: Partial<{
    bold: boolean;
    italic: boolean;
    bullet: boolean;
    h3: boolean;
    divider: boolean;
    link: boolean;
  }>;
};

const defaultTools = {
  bold: true,
  italic: true,
  bullet: true,
  h3: true,
  divider: true,
  link: true,
};

export function MarkdownRichTextarea({
  value,
  onChange,
  label,
  error,
  hint,
  className,
  editorClassName,
  tools,
}: Props) {
  const t = { ...defaultTools, ...(tools ?? {}) };

  return (
    <div className={className}>
      {label ? <div className="adminEventLabel">{label}</div> : null}

      <div className={`markdownRichTextarea ${editorClassName ?? ""}`}>
        <MDXEditor
          markdown={value}
          onChange={onChange}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            linkPlugin(),
            thematicBreakPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />

                  {(t.bold || t.italic) && <Separator />}
                  {(t.bold || t.italic) && <BoldItalicUnderlineToggles />}

                  {t.bullet && (
                    <>
                      <Separator />
                      <ListsToggle />
                    </>
                  )}

                  {t.link && (
                    <>
                      <Separator />
                      <CreateLink />
                    </>
                  )}
                </>
              ),
            }),
          ]}
        />
      </div>

      {error && <div className="formError">{error}</div>}
      {hint && <div className="adminEventHint">{hint}</div>}
    </div>
  );
}