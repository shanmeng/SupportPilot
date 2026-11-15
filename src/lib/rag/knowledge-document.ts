import { createHash } from "node:crypto";
import { z } from "zod";

export const documentKinds = [
  "api_doc",
  "business_rule",
  "troubleshooting",
  "support_case",
  "release_note",
  "migration_guide",
] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const documentAuthorities = ["official", "operational_guidance", "historical_case"] as const;
export type DocumentAuthority = (typeof documentAuthorities)[number];

export type KnowledgeDocument = {
  id: string;
  title: string;
  kind: DocumentKind;
  authority: DocumentAuthority;
  language: string;
  productAreas: string[];
  ruleIds: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourcePath: string;
  body: string;
  contentHash: string;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const frontMatterSchema = z.object({
  doc_id: z
    .string({ error: "doc_id is required" })
    .regex(/^[A-Z]+(-[A-Z0-9]+)+$/, "doc_id must look like KB-API-001"),
  title: z.string({ error: "title is required" }).min(1, "title is required"),
  doc_type: z.enum(documentKinds, { error: `doc_type must be one of ${documentKinds.join(", ")}` }),
  authority: z.enum(documentAuthorities, {
    error: `authority must be one of ${documentAuthorities.join(", ")}`,
  }),
  language: z.string({ error: "language is required" }).min(2),
  product_areas: z.array(z.string()).default([]),
  rule_ids: z.array(z.string()).default([]),
  effective_from: isoDate.nullable().default(null),
  effective_to: isoDate.nullable().default(null),
});

type FrontMatterValue = string | string[] | null;

function parseScalar(raw: string): FrontMatterValue {
  const value = raw.trim();
  if (value === "" || value === "null" || value === "~") return null;
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner === "" ? [] : inner.split(",").map((item) => unquote(item.trim()));
  }
  return unquote(value);
}

function unquote(value: string): string {
  const quoted = /^(["'])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value;
}

/** Parses the flat `key: value` front matter used by the FlowPay knowledge base (scalars and inline lists). */
function parseFrontMatter(block: string): Record<string, FrontMatterValue> {
  const result: Record<string, FrontMatterValue> = {};
  for (const line of block.split("\n")) {
    const match = /^([A-Za-z_][\w-]*):(.*)$/.exec(line);
    if (match) result[match[1]] = parseScalar(match[2]);
  }
  return result;
}

/**
 * Parses one knowledge Markdown file. Identifiers come only from the file's front matter:
 * a missing or malformed `doc_id` is an error, never a generated ID.
 */
export function parseKnowledgeDocument(raw: string, sourcePath: string): KnowledgeDocument {
  const text = raw.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${sourcePath}: missing front matter`);

  const parsed = frontMatterSchema.safeParse(parseFrontMatter(match[1]));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`${sourcePath}: invalid front matter (${issues})`);
  }
  const fm = parsed.data;

  return {
    id: fm.doc_id,
    title: fm.title,
    kind: fm.doc_type,
    authority: fm.authority,
    language: fm.language,
    productAreas: fm.product_areas,
    ruleIds: fm.rule_ids,
    effectiveFrom: fm.effective_from,
    effectiveTo: fm.effective_to,
    sourcePath,
    body: match[2].trim(),
    contentHash: createHash("sha256").update(text).digest("hex"),
  };
}
