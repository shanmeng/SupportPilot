export type EvidenceSourceKind = "document" | "record";

export interface EvidenceSource {
  /** Exact source identifier as returned by retrieval or a record query. */
  id: string;
  title: string;
  kind: EvidenceSourceKind;
  excerpt: string;
}

const KIND_LABELS: Record<EvidenceSourceKind, string> = {
  document: "Document",
  record: "Record",
};

export const MAX_EXCERPT_LENGTH = 280;

/** Shortens an excerpt to at most `maxLength` characters, breaking on a word where possible. */
export function shortenExcerpt(excerpt: string, maxLength = MAX_EXCERPT_LENGTH): string {
  const text = excerpt.trim().replace(/\s+/g, " ");
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:]+$/, "")}…`;
}

export function EvidenceCitationCard({ source }: { source: EvidenceSource }) {
  return (
    <article
      aria-label={`${KIND_LABELS[source.kind]}: ${source.title}`}
      className="flex h-full min-w-0 flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <span
        data-kind={source.kind}
        className={`w-fit rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
          source.kind === "document"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        }`}
      >
        {KIND_LABELS[source.kind]}
      </span>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{source.title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <span className="sr-only">Source ID: </span>
        <code className="font-mono [overflow-wrap:anywhere]">{source.id}</code>
      </p>
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {shortenExcerpt(source.excerpt)}
      </p>
    </article>
  );
}

export function EvidenceCitations({
  sources,
  heading = "Evidence sources",
}: {
  sources: readonly EvidenceSource[];
  heading?: string;
}) {
  return (
    <section aria-label={heading} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {heading}
        {sources.length > 0 && (
          <>
            {" "}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              ({sources.length})
            </span>
          </>
        )}
      </h3>
      {sources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No evidence sources were cited for this answer.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sources.map((source, index) => (
            <li key={`${source.kind}:${source.id}:${index}`} className="min-w-0">
              <EvidenceCitationCard source={source} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
