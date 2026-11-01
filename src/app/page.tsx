import { EvidenceCitationList } from "@/components/chat/evidence-citation-card";
import type { EvidenceSource } from "@/types/evidence";

// Illustrative placeholders copied from docs/mockups/dashboard.html; not verified dataset records.
const sampleSources: EvidenceSource[] = [
  {
    id: "doc_webhook_retry_example",
    title: "Webhook Retry Policy",
    excerpt: "Sample excerpt: Delivery failures may trigger retry attempts according to policy.",
    kind: "document",
  },
  {
    id: "delivery_example_01",
    title: "Webhook Delivery Record",
    excerpt:
      "Sample excerpt: A verified delivery record would appear here, including status and attempts.",
    kind: "record",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 text-[#182539] sm:px-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Payment Investigation</h1>
        <p className="mt-1.5 text-sm text-[#75839a]">
          Ask questions, investigate records, verify evidence.
        </p>
      </header>

      <p className="max-w-[92%] self-end rounded-[15px_15px_3px_15px] bg-[#2459d3] px-5 py-4 text-sm leading-relaxed text-white sm:max-w-[79%]">
        My payment succeeded, but why wasn&apos;t its webhook delivered?
      </p>

      <section
        aria-labelledby="sample-answer-heading"
        className="rounded-[14px] border border-[#dde5f0] bg-white p-5 text-sm leading-7 shadow-[0_4px_12px_#1a3a6910]"
      >
        <h2 id="sample-answer-heading" className="font-semibold">
          Preliminary explanation
        </h2>
        <p className="mt-2">
          This example shows how a support engineer might investigate a successful payment with a
          failed webhook delivery. The final product must verify the payment and delivery records
          before claiming a specific cause.
        </p>
        <h3 className="mt-4 mb-3 font-semibold">Evidence sources (illustrative placeholders)</h3>
        <EvidenceCitationList sources={sampleSources} />
      </section>

      <section
        aria-labelledby="empty-answer-heading"
        className="rounded-[14px] border border-[#dde5f0] bg-white p-5 text-sm leading-7 shadow-[0_4px_12px_#1a3a6910]"
      >
        <h2 id="empty-answer-heading" className="font-semibold">
          Answer without retrieved evidence
        </h2>
        <p className="mt-2">
          When retrieval returns nothing, the answer shows a neutral empty state instead of
          inventing source identifiers.
        </p>
        <h3 className="mt-4 mb-3 font-semibold">Evidence sources</h3>
        <EvidenceCitationList sources={[]} />
      </section>
    </main>
  );
}
