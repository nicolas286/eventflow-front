import { useCallback, useRef } from "react";
import { applyMarkdownInsert, applyMarkdownWrap } from "@helpers/markdown/applyMarkdown";

type SetValueFn = (nextValue: string) => void;

type WrapOpts = {
  left: string;
  right?: string;
  placeholder?: string;
};

export function useMarkdownTextarea(params: { value: string; setValue: SetValueFn }) {
  const { value, setValue } = params;

  const ref = useRef<HTMLTextAreaElement | null>(null);

  // ✅ callback ref (pas de mutation depuis l'extérieur)
  const bindRef = useCallback((node: HTMLTextAreaElement | null) => {
    ref.current = node;
  }, []);

  const restoreSelection = useCallback((start: number, end: number) => {
    queueMicrotask(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }, []);

  const getSelection = useCallback(() => {
    const el = ref.current;
    if (!el) {
      const len = value?.length ?? 0;
      return { selectionStart: len, selectionEnd: len };
    }
    return {
      selectionStart: el.selectionStart ?? 0,
      selectionEnd: el.selectionEnd ?? 0,
    };
  }, [value]);

  const wrap = useCallback(
    (opts: WrapOpts) => {
      const { selectionStart, selectionEnd } = getSelection();

      const res = applyMarkdownWrap({
        value: value ?? "",
        selectionStart,
        selectionEnd,
        left: opts.left,
        right: opts.right,
        placeholder: opts.placeholder,
      });

      setValue(res.nextValue);
      restoreSelection(res.selectionStart, res.selectionEnd);
    },
    [getSelection, restoreSelection, setValue, value]
  );

  const insert = useCallback(
    (text: string) => {
      const { selectionStart, selectionEnd } = getSelection();

      const res = applyMarkdownInsert({
        value: value ?? "",
        selectionStart,
        selectionEnd,
        text,
      });

      setValue(res.nextValue);
      restoreSelection(res.selectionStart, res.selectionEnd);
    },
    [getSelection, restoreSelection, setValue, value]
  );

  const link = useCallback(() => {
    const el = ref.current;
    const current = value ?? "";

    const selectionStart = el?.selectionStart ?? current.length;
    const selectionEnd = el?.selectionEnd ?? current.length;

    const selected = current.slice(selectionStart, selectionEnd) || "lien";
    const text = `[${selected}](https://)`;

    const next = current.slice(0, selectionStart) + text + current.slice(selectionEnd);
    setValue(next);

    const urlStart = selectionStart + selected.length + 3;
    const urlEnd = urlStart + "https://".length;
    restoreSelection(urlStart, urlEnd);
  }, [restoreSelection, setValue, value]);

  return {
    bindRef, // ✅ à utiliser dans ref={}
    actions: {
      bold: () => wrap({ left: "**", placeholder: "gras" }),
      italic: () => wrap({ left: "_", placeholder: "italique" }),
      strike: () => wrap({ left: "~~", placeholder: "barré" }),
      bullet: () => insert("\n- "),
      h3: () => insert("\n\n### "),
      divider: () => insert("\n\n---\n\n"),
      link,
      wrap,
      insert,
    },
  };
}