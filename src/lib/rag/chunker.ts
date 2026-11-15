export type Chunk = { index: number; section: string; content: string };

type Section = { heading: string | null; lines: string[]; hasText: boolean };

const HEADING = /^(#{1,3})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, lines: [], hasText: false };
  let inFence = false;

  for (const line of body.split("\n")) {
    if (FENCE.test(line)) inFence = !inFence;
    const heading = inFence ? null : HEADING.exec(line);
    if (heading) {
      if (current.lines.length > 0) sections.push(current);
      current = { heading: heading[2], lines: [line], hasText: false };
    } else {
      current.lines.push(line);
      if (line.trim() !== "") current.hasText = true;
    }
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

/** Splits text into blank-line paragraphs, keeping fenced code blocks whole. */
function splitParagraphs(text: string): string[] {
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === "") {
      if (buffer.length > 0) paragraphs.push(buffer.join("\n"));
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.length > 0) paragraphs.push(buffer.join("\n"));
  return paragraphs;
}

function hardSplit(text: string, maxChars: number): string[] {
  const parts: string[] = [];
  for (let start = 0; start < text.length; start += maxChars) parts.push(text.slice(start, start + maxChars));
  return parts;
}

function pack(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const parts: string[] = [];
  let current = "";
  for (const paragraph of splitParagraphs(text)) {
    const joined = current ? `${current}\n\n${paragraph}` : paragraph;
    if (joined.length <= maxChars) {
      current = joined;
      continue;
    }
    if (paragraph.length <= maxChars) {
      if (current) parts.push(current);
      current = paragraph;
      continue;
    }
    // Oversized paragraph: fill the room left in the current chunk, then hard-split the rest.
    let rest = paragraph;
    const room = current ? maxChars - current.length - 2 : 0;
    if (room > 0) {
      parts.push(`${current}\n\n${rest.slice(0, room)}`);
      rest = rest.slice(room);
    } else if (current) {
      parts.push(current);
    }
    const pieces = hardSplit(rest, maxChars);
    parts.push(...pieces.slice(0, -1));
    current = pieces.at(-1) ?? "";
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Splits a Markdown body into retrieval chunks: one per H1–H3 section, at most `maxChars` each.
 * A heading with no text of its own (such as the document title) is merged into the next section.
 */
export function chunkMarkdown(body: string, options: { maxChars?: number } = {}): Chunk[] {
  const maxChars = options.maxChars ?? 1000;
  const chunks: Chunk[] = [];
  let carry: string[] = [];

  for (const section of splitSections(body.trim())) {
    if (!section.hasText) {
      carry = [...carry, ...section.lines];
      continue;
    }
    const text = [...carry, ...section.lines].join("\n").trim();
    carry = [];
    const name = section.heading ?? "Introduction";
    for (const content of pack(text, maxChars)) {
      chunks.push({ index: chunks.length, section: name, content: content.trim() });
    }
  }
  return chunks;
}
