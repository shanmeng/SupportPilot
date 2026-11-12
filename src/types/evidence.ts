export type EvidenceSourceKind = "document" | "record";

/** A source returned by retrieval or a scoped record query, shown verbatim to the user. */
export interface EvidenceSource {
  id: string;
  title: string;
  excerpt: string;
  kind: EvidenceSourceKind;
}
