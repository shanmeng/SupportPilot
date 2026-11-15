import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(process.cwd(), "tests/fixtures/knowledge");

export type FixtureFile = { path: string; raw: string };

/** Handwritten synthetic knowledge documents (not dataset content). */
export function loadKnowledgeFixtures(options: { includeUntranslated?: boolean } = {}): FixtureFile[] {
  const files: FixtureFile[] = [];
  for (const category of readdirSync(root).sort()) {
    if (category === "untranslated" && !options.includeUntranslated) continue;
    for (const name of readdirSync(join(root, category)).sort()) {
      const full = join(root, category, name);
      files.push({ path: relative(process.cwd(), full), raw: readFileSync(full, "utf8") });
    }
  }
  return files;
}

export const fixtureDocuments = {
  "KB-FIX-001": { title: "Webhook Delivery Retries", kind: "api_doc" },
  "KB-FIX-002": { title: "Troubleshooting a Missing Webhook Notification", kind: "troubleshooting" },
  "KB-FIX-003": { title: "Tenant Isolation Rules", kind: "business_rule" },
} as const;
