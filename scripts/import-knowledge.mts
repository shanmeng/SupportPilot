/**
 * Imports knowledge-base Markdown files into PostgreSQL (documents + chunks + embeddings).
 *
 *   npm run db:import-knowledge                 # reads $FLOWPAY_DATASET_PATH/knowledge
 *   npm run db:import-knowledge -- <directory>  # or an explicit directory
 *
 * Only `language: en` documents are imported. With OPENAI_API_KEY set, chunks are embedded;
 * without it they are stored for keyword search only. The dataset itself is never committed.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { getQueryEmbedder } from "@/lib/rag/embedder";
import { importKnowledgeFiles, type KnowledgeFile } from "@/lib/rag/importer";

function listMarkdown(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return listMarkdown(full);
      return name.endsWith(".md") && name !== "README.md" ? [full] : [];
    });
}

async function main() {
  const args = process.argv.slice(2);
  const argDir = args.find((arg) => !arg.startsWith("--"));
  const datasetPath = process.env.FLOWPAY_DATASET_PATH;
  if (!argDir && !datasetPath) {
    console.error("Set FLOWPAY_DATASET_PATH or pass the knowledge directory as an argument.");
    process.exit(2);
  }
  const dir = resolve(argDir ?? join(datasetPath as string, "knowledge"));
  const files: KnowledgeFile[] = listMarkdown(dir).map((path) => ({ path, raw: readFileSync(path, "utf8") }));
  if (files.length === 0) {
    console.error(`No Markdown files found in ${dir}`);
    process.exit(2);
  }

  const embedder = getQueryEmbedder();
  console.log(
    `Importing ${files.length} files from ${dir} (${embedder ? `embeddings: ${embedder.model}` : "no OPENAI_API_KEY: keyword search only"})`,
  );
  const summary = await importKnowledgeFiles(files, { embedder, force: args.includes("--force") });

  console.log(`Imported: ${summary.imported.length}  Skipped (unchanged): ${summary.skipped.length}  Rejected: ${summary.rejected.length}`);
  for (const { path, reason } of summary.rejected) console.log(`  rejected ${path}: ${reason}`);
  process.exit(summary.rejected.length > 0 ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
