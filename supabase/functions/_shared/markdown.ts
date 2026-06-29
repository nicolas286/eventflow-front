import { escapeHtml } from "./text.ts";

type SafeMarkdownOptions = {
  maxLength?: number;
};

function safeUrl(raw: string) {
  try {
    const url = new URL(raw);

    if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function renderInlineMarkdown(input: string) {
  let html = escapeHtml(input);

  // Links: [label](https://example.com)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, labelRaw, urlRaw) => {
      const label = escapeHtml(labelRaw);
      const url = safeUrl(String(urlRaw).trim());

      if (!url) return label;

      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#111;text-decoration:underline;">${label}</a>`;
    },
  );

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return html;
}

export function markdownToSafeHtml(
  markdown: unknown,
  options: SafeMarkdownOptions = {},
) {
  const maxLength = options.maxLength ?? 1200;

  const raw = String(markdown ?? "").trim();

  if (!raw) return "";

  const text =
    raw.length > maxLength
      ? raw.slice(0, maxLength - 1).trimEnd() + "…"
      : raw;

  const lines = text.split(/\r?\n/);

  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;

    html.push(
      `<p style="margin:0 0 10px;font-size:14px;color:#333;">${renderInlineMarkdown(
        paragraph.join(" "),
      )}</p>`,
    );

    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;

    html.push(
      `<ul style="margin:0 0 12px 20px;padding:0;font-size:14px;color:#333;">${listItems.join(
        "",
      )}</ul>`,
    );

    listItems = [];
  }

  for (const lineRaw of lines) {
    const line = lineRaw.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();

      html.push(
        `<div style="margin:14px 0 6px;font-weight:800;font-size:14px;color:#222;">${renderInlineMarkdown(
          line.slice(4),
        )}</div>`,
      );

      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();

      html.push(
        `<div style="margin:16px 0 8px;font-weight:900;font-size:15px;color:#111;">${renderInlineMarkdown(
          line.slice(3),
        )}</div>`,
      );

      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();

      html.push(
        `<div style="margin:16px 0 8px;font-weight:900;font-size:16px;color:#111;">${renderInlineMarkdown(
          line.slice(2),
        )}</div>`,
      );

      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);

    if (bulletMatch) {
      flushParagraph();

      listItems.push(
        `<li style="margin:4px 0;">${renderInlineMarkdown(
          bulletMatch[1],
        )}</li>`,
      );

      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return html.join("");
}