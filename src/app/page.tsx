import { EvidenceCitations, type EvidenceSource } from "@/components/EvidenceCitations";

interface SampleExchange {
  question: string;
  answer: string;
  sources: EvidenceSource[];
}

// Illustrative placeholders from docs/mockups/dashboard.html, not verified dataset records.
const SAMPLE_EXCHANGES: SampleExchange[] = [
  {
    question: "My payment succeeded, but why wasn't its webhook delivered?",
    answer:
      "This example shows how a support engineer might investigate a successful payment with a failed webhook delivery. The final product must verify the payment and delivery records before claiming a specific cause.",
    sources: [
      {
        id: "doc_webhook_retry_example",
        title: "Webhook Retry Policy",
        kind: "document",
        excerpt: "Sample excerpt: Delivery failures may trigger retry attempts according to policy.",
      },
      {
        id: "delivery_example_01",
        title: "Webhook Delivery Record",
        kind: "record",
        excerpt:
          "Sample excerpt: A verified delivery record would appear here, including status and attempts.",
      },
    ],
  },
  {
    question: "Why did this payment fail?",
    answer:
      "I need an account ID, an environment (production or sandbox) and a payment ID before I can look up any records. I won't guess a status from documentation alone.",
    sources: [],
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-slate-100 font-sans dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-7 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          SupportPilot
        </h1>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Payment Investigation
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sample answers with illustrative placeholder citations.
          </p>
        </div>
        {SAMPLE_EXCHANGES.map((exchange) => (
          <div key={exchange.question} className="flex flex-col gap-4">
            <p className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-blue-700 px-5 py-3.5 text-sm leading-relaxed text-white">
              {exchange.question}
            </p>
            <section
              aria-label="Assistant answer"
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <p>{exchange.answer}</p>
              <EvidenceCitations sources={exchange.sources} />
            </section>
          </div>
        ))}
      </main>
    </div>
  );
}
