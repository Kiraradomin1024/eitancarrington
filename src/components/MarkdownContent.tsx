import { cn } from "@/lib/utils";

/**
 * Discord-style Markdown renderer. Handles:
 * - `# H1`, `## H2`, `### H3`, etc.
 * - `**bold**`, `*italic*`, `__underline__`, `~~strikethrough~~`
 * - `***bold italic***`, `__*underline italic*__`, etc.
 * - `> quote` (single line) and `>>> multi-line quote`
 * - `- item` or `* item` (unordered lists)
 * - `1. item` (ordered lists)
 * - `` `inline code` `` and ``` ```code block``` ```
 * - `||spoiler||`
 * - `![alt](url)` → images
 * - `[text](url)` → links
 * - `---` → horizontal rule
 */
export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const html = markdownToHtml(content);

  return (
    <div
      className={cn("markdown-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Extracts headings from markdown content for generating a table of contents.
 */
export function extractHeadings(
  content: string
): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slugify(text);
      headings.push({ level, text, id });
    }
  }
  return headings;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function headingSizeClass(level: number): string {
  switch (level) {
    case 1: return "text-3xl mt-10 mb-4";
    case 2: return "text-2xl mt-8 mb-3";
    case 3: return "text-xl mt-6 mb-2";
    default: return "text-lg mt-4 mb-2";
  }
}

function markdownToHtml(md: string): string {
  // Pre-process: handle >>> multi-line block quotes
  // Replace >>> ... (rest of text until next blank double-line or end) with a marker
  const preprocessed = md.replace(/^>>>[ \t]*([\s\S]*?)(?=\n{2,}(?!>)|$)/gm, (_, content) => {
    const lines = (content as string).split("\n").map(l => `> ${l}`);
    return lines.join("\n");
  });

  // Pre-process: handle ```code blocks``` — extract them before block splitting
  const codeBlocks: string[] = [];
  const withCodePlaceholders = preprocessed.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const idx = codeBlocks.length;
      const langStr = lang ? ` data-lang="${escapeHtml(lang)}"` : "";
      codeBlocks.push(
        `<pre class="rounded-xl bg-surface-2 border border-border p-4 overflow-x-auto my-4"><code${langStr} class="text-sm font-mono text-foreground/90">${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`
      );
      return `\n%%CODEBLOCK_${idx}%%\n`;
    }
  );

  const blocks = withCodePlaceholders.split(/\n{2,}/);
  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Code block placeholder
    const cbMatch = trimmed.match(/^%%CODEBLOCK_(\d+)%%$/);
    if (cbMatch) {
      htmlBlocks.push(codeBlocks[parseInt(cbMatch[1])]);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      htmlBlocks.push('<hr class="my-6 border-border" />');
      continue;
    }

    const lines = trimmed.split("\n");

    // Block quote: all lines start with >
    if (lines.every(l => l.trim().startsWith(">"))) {
      const quoteContent = lines
        .map(l => {
          const stripped = l.trim().replace(/^>\s?/, "");
          return inlineMarkdown(escapeHtml(stripped));
        })
        .join("<br/>");
      htmlBlocks.push(
        `<blockquote class="border-l-4 border-accent/50 pl-4 py-2 my-4 text-foreground/80 italic bg-accent-soft/30 rounded-r-lg">${quoteContent}</blockquote>`
      );
      continue;
    }

    // Unordered list: lines start with - or *
    if (lines.every(l => /^\s*[-*]\s/.test(l.trim()))) {
      const items = lines
        .map(l => {
          const text = l.trim().replace(/^[-*]\s+/, "");
          return `<li class="ml-4 pl-1">${inlineMarkdown(escapeHtml(text))}</li>`;
        })
        .join("");
      htmlBlocks.push(`<ul class="list-disc my-3 space-y-1 text-foreground/85">${items}</ul>`);
      continue;
    }

    // Ordered list: lines start with 1. 2. etc
    if (lines.every(l => /^\s*\d+\.\s/.test(l.trim()))) {
      const items = lines
        .map(l => {
          const text = l.trim().replace(/^\d+\.\s+/, "");
          return `<li class="ml-4 pl-1">${inlineMarkdown(escapeHtml(text))}</li>`;
        })
        .join("");
      htmlBlocks.push(`<ol class="list-decimal my-3 space-y-1 text-foreground/85">${items}</ol>`);
      continue;
    }

    // Process lines individually: headings, images, text
    let paragraphLines: string[] = [];

    function flushParagraph() {
      if (paragraphLines.length > 0) {
        htmlBlocks.push(
          `<p class="leading-relaxed text-foreground/85 mb-4">${paragraphLines.join("<br/>")}</p>`
        );
        paragraphLines = [];
      }
    }

    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;

      // Heading line
      const hMatch = l.match(/^(#{1,6})\s+(.+)$/);
      if (hMatch) {
        flushParagraph();
        const level = hMatch[1].length;
        const text = hMatch[2].trim();
        const id = slugify(text);
        htmlBlocks.push(
          `<h${level} id="${id}" class="font-display ${headingSizeClass(level)} text-foreground title-rule scroll-mt-24">${inlineMarkdown(escapeHtml(text))}</h${level}>`
        );
        continue;
      }

      // Quote line (single > in a mixed block)
      if (l.startsWith("> ") || l === ">") {
        flushParagraph();
        const qText = l.replace(/^>\s?/, "");
        htmlBlocks.push(
          `<blockquote class="border-l-4 border-accent/50 pl-4 py-2 my-2 text-foreground/80 italic bg-accent-soft/30 rounded-r-lg">${inlineMarkdown(escapeHtml(qText))}</blockquote>`
        );
        continue;
      }

      // Image-only line
      const inlineImgMatch = l.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (inlineImgMatch) {
        flushParagraph();
        const alt = escapeHtml(inlineImgMatch[1]);
        const src = escapeHtml(inlineImgMatch[2]);
        htmlBlocks.push(
          `<figure class="my-6"><img src="${src}" alt="${alt}" class="rounded-xl border border-border shadow-sm max-w-full mx-auto" loading="lazy" />${alt ? `<figcaption class="text-center text-xs text-muted mt-2 font-hand">${alt}</figcaption>` : ""}</figure>`
        );
        continue;
      }

      // List item in mixed block
      const ulMatch = l.match(/^[-*]\s+(.*)/);
      if (ulMatch) {
        flushParagraph();
        htmlBlocks.push(`<ul class="list-disc my-2 text-foreground/85"><li class="ml-4 pl-1">${inlineMarkdown(escapeHtml(ulMatch[1]))}</li></ul>`);
        continue;
      }

      // Regular text line
      paragraphLines.push(inlineMarkdown(escapeHtml(l)));
    }

    flushParagraph();
  }

  return htmlBlocks.join("\n");
}

/** Process inline markdown: bold+italic, bold, italic, underline, strikethrough, spoiler, code, links, images */
function inlineMarkdown(text: string): string {
  return (
    text
      // Inline code: `text` (process first to protect content inside)
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-sm font-mono">$1</code>'
      )
      // Inline images: ![alt](url)
      .replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" class="inline-block rounded max-h-64 my-1" loading="lazy" />'
      )
      // Links: [text](url)
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-accent hover:underline" target="_blank" rel="noopener">$1</a>'
      )
      // Spoiler: ||text||
      .replace(
        /\|\|([^|]+)\|\|/g,
        '<span class="bg-foreground/80 text-transparent hover:text-foreground hover:bg-transparent rounded px-1 cursor-pointer transition-all select-all" title="Spoiler">$1</span>'
      )
      // Bold italic: ***text***
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
      // Bold: **text**
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      // Underline italic: __*text*__
      .replace(/__\*([^*]+)\*__/g, "<u><em>$1</em></u>")
      // Underline bold: __**text**__
      .replace(/__\*\*([^*]+)\*\*__/g, "<u><strong>$1</strong></u>")
      // Underline: __text__
      .replace(/__([^_]+)__/g, "<u>$1</u>")
      // Italic: *text*
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // Strikethrough: ~~text~~
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
  );
}
