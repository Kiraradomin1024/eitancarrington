import { cn } from "@/lib/utils";

/**
 * Lightweight Markdown renderer. Handles:
 * - `## Heading` → <h2>, `### Heading` → <h3>
 * - `**bold**` → <strong>
 * - `*italic*` → <em>
 * - `![alt](url)` → <img>
 * - `[text](url)` → <a>
 * - Blank lines → paragraph breaks
 * - `---` → <hr>
 *
 * Returns rendered HTML inside a styled container.
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

function markdownToHtml(md: string): string {
  const blocks = md.split(/\n{2,}/);
  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      htmlBlocks.push('<hr class="my-6 border-border" />');
      continue;
    }

    // Check if the block is a sequence of headings (each line starts with ##)
    const lines = trimmed.split("\n");
    let allHeadings = true;
    for (const line of lines) {
      if (line.trim() && !line.trim().match(/^#{1,6}\s/)) {
        allHeadings = false;
        break;
      }
    }

    if (allHeadings && lines.some((l) => l.trim())) {
      for (const line of lines) {
        const headingMatch = line.trim().match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2].trim();
          const id = slugify(text);
          const sizeClass =
            level === 1
              ? "text-3xl mt-10 mb-4"
              : level === 2
                ? "text-2xl mt-8 mb-3"
                : level === 3
                  ? "text-xl mt-6 mb-2"
                  : "text-lg mt-4 mb-2";
          htmlBlocks.push(
            `<h${level} id="${id}" class="font-display ${sizeClass} text-foreground title-rule scroll-mt-24">${inlineMarkdown(escapeHtml(text))}</h${level}>`
          );
        }
      }
      continue;
    }

    // Process lines individually: headings become h tags, rest becomes paragraphs
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
        const sizeClass =
          level === 1
            ? "text-3xl mt-10 mb-4"
            : level === 2
              ? "text-2xl mt-8 mb-3"
              : level === 3
                ? "text-xl mt-6 mb-2"
                : "text-lg mt-4 mb-2";
        htmlBlocks.push(
          `<h${level} id="${id}" class="font-display ${sizeClass} text-foreground title-rule scroll-mt-24">${inlineMarkdown(escapeHtml(text))}</h${level}>`
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

      // Regular text line
      paragraphLines.push(inlineMarkdown(escapeHtml(l)));
    }

    flushParagraph();
  }

  return htmlBlocks.join("\n");
}

/** Process inline markdown: bold, italic, inline code, links, inline images */
function inlineMarkdown(text: string): string {
  return (
    text
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
      // Bold: **text**
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      // Italic: *text*
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // Inline code: `text`
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-sm">$1</code>'
      )
  );
}
