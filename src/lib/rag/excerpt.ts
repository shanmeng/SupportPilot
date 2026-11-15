const FENCE = /^\s*(```|~~~)/;

function stripCodeBlocks(lines: string[]): string[] {
  const kept: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) kept.push(line);
  }
  return kept;
}

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

/** Table rows become "cell · cell"; separator rows are dropped. Cell text is unchanged. */
function readableTables(lines: string[]): string[] {
  return lines
    .filter((line) => !TABLE_SEPARATOR.test(line))
    .map((line) => {
      if (!line.trim().startsWith("|")) return line;
      return line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim())
        .join(" · ");
    });
}

function collapse(lines: string[]): string {
  return readableTables(lines).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * A short, readable excerpt of a stored chunk for citation cards.
 * Heading lines are dropped (the section is shown separately) and prose is preferred over code
 * blocks; the remaining text is only whitespace-collapsed and cut at a word boundary, never rewritten.
 */
export function toExcerpt(content: string, maxChars = 280): string {
  const lines = content.split("\n").filter((line) => !/^#{1,6}\s/.test(line));
  const prose = collapse(stripCodeBlocks(lines));
  const text = prose || collapse(lines.filter((line) => !FENCE.test(line)));
  if (text.length <= maxChars) return text;

  const cut = text.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : text.slice(0, maxChars)).trimEnd()}…`;
}
