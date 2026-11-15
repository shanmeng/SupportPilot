/**
 * A short, readable excerpt of a stored chunk for citation cards.
 * Leading heading lines are dropped (the section is shown separately); the remaining
 * text is only whitespace-collapsed and cut at a word boundary, never rewritten.
 */
export function toExcerpt(content: string, maxChars = 280): string {
  const lines = content.split("\n");
  while (lines.length > 0 && (lines[0].trim() === "" || /^#{1,6}\s/.test(lines[0]))) lines.shift();
  const text = lines.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;

  const cut = text.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : text.slice(0, maxChars)).trimEnd()}…`;
}
