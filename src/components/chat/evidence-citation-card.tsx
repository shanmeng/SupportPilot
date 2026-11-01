import { useId } from "react";
import type { EvidenceSource, EvidenceSourceKind } from "@/types/evidence";

const KIND_LABELS: Record<EvidenceSourceKind, string> = {
  document: "Document",
  record: "Record",
};

export interface EvidenceCitationCardProps {
  source: EvidenceSource;
  /** When provided, the card becomes a keyboard-operable button. */
  onSelect?: (source: EvidenceSource) => void;
}

/** Presentational card that shows a source's fields exactly as supplied; it never derives or formats identifiers. */
export function EvidenceCitationCard({ source, onSelect }: EvidenceCitationCardProps) {
  const titleId = useId();
  const kindLabel = KIND_LABELS[source.kind];

  const content = (
    <>
      <span className="block text-[11px] font-bold uppercase tracking-wide text-[#3768c9]">
        {kindLabel}
      </span>
      <span id={titleId} className="mt-1.5 block text-[13px] font-semibold text-[#182539]">
        {source.title}
      </span>
      <code className="mt-1 block font-mono text-[11px] text-[#5f6f88] [overflow-wrap:anywhere]">
        {source.id}
      </code>
      <span className="mt-2.5 block text-xs leading-normal text-[#586982]">
        {source.excerpt}
      </span>
    </>
  );

  return (
    <article
      aria-labelledby={titleId}
      className="min-w-0 rounded-[11px] border border-[#dde5f0] bg-[#fbfcff]"
    >
      {onSelect ? (
        <button
          type="button"
          aria-label={`View ${source.kind} ${source.title} (${source.id})`}
          onClick={() => onSelect(source)}
          className="block w-full cursor-pointer rounded-[11px] p-3.5 text-left hover:bg-[#f3f7fd] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#f6b442] focus-visible:outline-solid"
        >
          {content}
        </button>
      ) : (
        <div className="p-3.5">{content}</div>
      )}
    </article>
  );
}

export interface EvidenceCitationListProps {
  sources: readonly EvidenceSource[];
  onSelect?: (source: EvidenceSource) => void;
}

export function EvidenceCitationList({ sources, onSelect }: EvidenceCitationListProps) {
  if (sources.length === 0) {
    return (
      <p className="rounded-[11px] border border-dashed border-[#dde5f0] bg-[#fbfcff] p-3.5 text-xs text-[#586982]">
        No verified sources
      </p>
    );
  }

  return (
    <ul aria-label="Evidence sources" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {sources.map((source) => (
        <li key={`${source.kind}:${source.id}`} className="min-w-0">
          <EvidenceCitationCard source={source} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
