import type { EvidenceSource } from "@/types/evidence";
import type { DocumentKind } from "./knowledge-document";
import type { DocumentEvidence } from "./search";

const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  api_doc: "API doc",
  business_rule: "Business rule",
  troubleshooting: "Troubleshooting",
  support_case: "Support case (historical)",
  release_note: "Release note",
  migration_guide: "Migration guide",
};

export function documentKindLabel(kind: DocumentKind): string {
  return DOCUMENT_KIND_LABELS[kind];
}

/** Maps a search result to a citation. ID, title and excerpt are passed through unchanged. */
export function toEvidenceSource(evidence: DocumentEvidence): EvidenceSource {
  return {
    id: evidence.id,
    title: evidence.title,
    excerpt: evidence.excerpt,
    kind: "document",
    detail: `${DOCUMENT_KIND_LABELS[evidence.kind]} · ${evidence.section}`,
  };
}

/** Stable key for a source; documents and records may share an ID. */
export function evidenceKey(source: EvidenceSource): string {
  return `${source.kind}:${source.id}`;
}
