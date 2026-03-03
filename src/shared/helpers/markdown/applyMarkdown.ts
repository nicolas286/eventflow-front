export type MarkdownWrapParams = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  left: string;
  right?: string;
  placeholder?: string;
};

export type MarkdownInsertParams = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  text: string;
};

export type MarkdownResult = {
  nextValue: string;
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Wrap la sélection avec des marqueurs markdown
 */
export function applyMarkdownWrap({
  value,
  selectionStart,
  selectionEnd,
  left,
  right,
  placeholder = "texte",
}: MarkdownWrapParams): MarkdownResult {
  const r = right ?? left;

  const hasSelection = selectionEnd > selectionStart;
  const selected = value.slice(selectionStart, selectionEnd);
  const middle = hasSelection ? selected : placeholder;

  const nextValue =
    value.slice(0, selectionStart) +
    left +
    middle +
    r +
    value.slice(selectionEnd);

  const newStart = selectionStart + left.length;
  const newEnd = newStart + middle.length;

  return {
    nextValue,
    selectionStart: newStart,
    selectionEnd: newEnd,
  };
}

/**
 * Insère du texte à la position du curseur
 */
export function applyMarkdownInsert({
  value,
  selectionStart,
  selectionEnd,
  text,
}: MarkdownInsertParams): MarkdownResult {
  const nextValue =
    value.slice(0, selectionStart) +
    text +
    value.slice(selectionEnd);

  const caret = selectionStart + text.length;

  return {
    nextValue,
    selectionStart: caret,
    selectionEnd: caret,
  };
}