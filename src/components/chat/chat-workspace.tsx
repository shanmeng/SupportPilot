"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentStep, StopReason } from "@/lib/agent/document-agent";
import { historyClient, type HistoryClient } from "@/lib/api/investigations-client";
import { askDocumentation, type AskResult } from "@/lib/api/search-client";
import type { ScopeInput } from "@/lib/business/scope";
import type { InvestigationSummary } from "@/lib/investigations/types";
import { evidenceKey } from "@/lib/rag/evidence";
import type { EvidenceSource } from "@/types/evidence";
import { Composer } from "./composer";
import { EvidenceCitationList } from "./evidence-citation-card";

type Turn = {
  id: number;
  question: string;
  scope: ScopeInput | null;
  status: "loading" | "done" | "error";
  sources: EvidenceSource[];
  answer: string | null;
  stopReason: StopReason | null;
  steps: AgentStep[];
  error: string | null;
};

const EXAMPLES = [
  "What happens after a webhook endpoint returns HTTP 410?",
  "How do I verify a webhook signature?",
  "What does error FP-4021 mean?",
];

const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f6b442]";

type ChatWorkspaceProps = {
  /** Answers a question with evidence, optionally inside an investigation scope. Defaults to the answers API. */
  ask?: (question: string, scope?: ScopeInput) => Promise<AskResult>;
  /** Saved investigations. Defaults to the investigations API. */
  history?: HistoryClient;
};

const defaultAsk = (question: string, scope?: ScopeInput) => askDocumentation(question, fetch, scope);
const EMPTY_SCOPE = { accountId: "", environment: "", paymentId: "" };

function toScope(fields: typeof EMPTY_SCOPE): ScopeInput | null {
  const scope: ScopeInput = {};
  if (fields.accountId.trim()) scope.accountId = fields.accountId.trim();
  if (fields.environment === "production" || fields.environment === "sandbox") scope.environment = fields.environment;
  if (fields.paymentId.trim()) scope.paymentId = fields.paymentId.trim();
  return Object.keys(scope).length > 0 ? scope : null;
}

export function ChatWorkspace({ ask = defaultAsk, history = historyClient }: ChatWorkspaceProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [selected, setSelected] = useState<EvidenceSource | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeFields, setScopeFields] = useState(EMPTY_SCOPE);
  const [recent, setRecent] = useState<InvestigationSummary[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    history
      .list()
      .then((items) => active && setRecent(items))
      .catch(() => active && setHistoryError("Recent cases could not be loaded."));
    return () => {
      active = false;
    };
  }, [history]);
  const nextId = useRef(1);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((turn) => turn.status === "loading");

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [turns]);

  function update(id: number, patch: Partial<Turn>) {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
  }

  async function run(id: number, question: string, scope: ScopeInput | null) {
    update(id, { status: "loading", error: null });
    try {
      const result = scope ? await ask(question, scope) : await ask(question);
      update(id, {
        status: "done",
        sources: result.sources,
        answer: result.answer ?? null,
        stopReason: result.stopReason ?? null,
        steps: result.steps ?? [],
      });
      const investigationId = result.investigationId;
      if (investigationId) {
        setRecent((current) => [
          { id: investigationId, question, scope, stopReason: result.stopReason ?? null, ownerName: null, createdAt: new Date().toISOString() },
          ...current.filter((item) => item.id !== investigationId),
        ]);
      }
    } catch (error) {
      update(id, { status: "error", error: error instanceof Error ? error.message : "Something went wrong." });
    }
  }

  function submit(question: string) {
    if (busy) return;
    const id = nextId.current++;
    const scope = toScope(scopeFields);
    setTurns((current) => [
      ...current,
      { id, question, scope, status: "loading", sources: [], answer: null, stopReason: null, steps: [], error: null },
    ]);
    void run(id, question, scope);
  }

  async function openCase(id: string) {
    if (busy) return;
    const turnId = nextId.current++;
    setSelected(null);
    setTurns([{ id: turnId, question: "Opening saved case…", scope: null, status: "loading", sources: [], answer: null, stopReason: null, steps: [], error: null }]);
    try {
      const saved = await history.get(id);
      setTurns([
        {
          id: turnId,
          question: saved.question,
          scope: saved.scope,
          status: "done",
          sources: saved.citations,
          answer: saved.answer,
          stopReason: saved.stopReason,
          steps: saved.steps,
          error: null,
        },
      ]);
    } catch (error) {
      update(turnId, { status: "error", error: error instanceof Error ? error.message : "Could not open the case." });
    }
  }

  function reset() {
    setTurns([]);
    setSelected(null);
    setScopeFields(EMPTY_SCOPE);
    composerRef.current?.focus();
  }

  return (
    <div className="grid flex-1 grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_270px]">
      <aside
        aria-label="Investigations"
        className="border-b border-[#dde5f0] bg-[#fbfcfe] p-3 md:border-r md:border-b-0 md:px-4 md:py-6"
      >
        <button
          type="button"
          onClick={reset}
          className={`rounded-[9px] bg-[#2459d3] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4bb8] md:w-full ${focusRing}`}
        >
          <span aria-hidden="true">+ </span>New investigation
        </button>
        <p className="mt-7 mb-3 hidden px-2 text-[11px] font-extrabold tracking-[0.09em] text-[#7c8aa2] uppercase md:block">
          Recent cases
        </p>
        {historyError ? (
          <p className="hidden px-2 text-[13px] text-[#8a2c2c] md:block">{historyError}</p>
        ) : recent.length === 0 ? (
          <p className="hidden px-2 text-[13px] text-[#75839a] md:block">No saved investigations yet</p>
        ) : (
          <ul aria-label="Recent cases" className="mt-2 flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {recent.map((item) => (
              <li key={item.id} className="min-w-0 shrink-0 md:shrink">
                <button
                  type="button"
                  aria-label={`Open case: ${item.question}`}
                  onClick={() => void openCase(item.id)}
                  className={`block w-full max-w-56 truncate rounded-[9px] px-3 py-2 text-left text-[13px] text-[#51627b] hover:bg-[#e7eefc] hover:text-[#1748a3] md:max-w-none ${focusRing}`}
                >
                  {item.question}
                  {item.ownerName ? (
                    <span className="block truncate text-[11px] text-[#8a97aa]">{item.ownerName}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="flex min-w-0 flex-col gap-6 px-4 pt-6 sm:px-[max(22px,6%)] md:pt-9">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Payment Investigation</h1>
          <p className="mt-1.5 text-sm text-[#75839a]">Ask questions, investigate records, verify evidence.</p>
        </header>

        {turns.length === 0 ? (
          <section aria-labelledby="empty-title" className="rounded-[14px] border border-dashed border-[#c9d6e8] bg-white p-6">
            <h2 id="empty-title" className="text-base font-semibold">
              Ask about payments and webhooks
            </h2>
            <p className="mt-1.5 text-sm text-[#586982]">
              SupportPilot searches the FlowPay documentation and shows the exact sources it found. Try one of these:
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    aria-label={`Ask: ${example}`}
                    onClick={() => submit(example)}
                    className={`rounded-[9px] border border-[#dde5f0] bg-[#f7f9fd] px-3 py-2 text-left text-sm text-[#1748a3] hover:bg-[#e7eefc] ${focusRing}`}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <ol aria-label="Conversation" className="flex flex-col gap-5">
            {turns.map((turn) => (
              <li key={turn.id} className="flex flex-col gap-4">
                <div className="flex max-w-[92%] flex-col items-end gap-1 self-end sm:max-w-[79%]">
                  {turn.scope ? (
                    <span className="rounded-md bg-[#e7eefc] px-2 py-0.5 font-mono text-[11px] text-[#1748a3]">
                      {[turn.scope.accountId, turn.scope.environment, turn.scope.paymentId].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                  <p className="rounded-[15px_15px_3px_15px] bg-[#2459d3] px-4.5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap text-white">
                    {turn.question}
                  </p>
                </div>
                <TurnAnswer
                  turn={turn}
                  selectedId={selected ? evidenceKey(selected) : null}
                  onSelect={setSelected}
                  onRetry={() => void run(turn.id, turn.question, turn.scope)}
                />
              </li>
            ))}
          </ol>
        )}

        <div ref={endRef} className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-[#f2f5fa] pt-2 pb-4">
          <ScopeFields
            open={scopeOpen}
            onToggle={() => setScopeOpen((open) => !open)}
            fields={scopeFields}
            onChange={setScopeFields}
          />
          <Composer ref={composerRef} busy={busy} onSubmit={submit} />
        </div>
      </main>

      <aside
        aria-label="Selected evidence"
        className="border-t border-[#dde5f0] bg-[#fbfcfe] p-4 md:col-start-2 xl:col-start-auto xl:border-t-0 xl:border-l xl:py-6"
      >
        <p className="mb-3 text-[11px] font-extrabold tracking-[0.09em] text-[#7c8aa2] uppercase">Selected evidence</p>
        {selected ? (
          <div className="rounded-xl border border-[#dbe3ee] bg-white p-4 text-[13px] leading-relaxed">
            <span className="rounded-md bg-[#edf4fb] px-2 py-1 text-[11px] text-[#557089] uppercase">{selected.kind}</span>
            <p className="mt-3 font-semibold">{selected.title}</p>
            <p className="text-xs text-[#7b89a0]">
              Source ID: <code className="font-mono [overflow-wrap:anywhere]">{selected.id}</code>
            </p>
            {selected.detail ? <p className="text-xs text-[#7b89a0]">{selected.detail}</p> : null}
            <p className="mt-3 text-[#65748b]">{selected.excerpt}</p>
          </div>
        ) : (
          <p className="text-[13px] text-[#75839a]">Select a source to see its excerpt here.</p>
        )}
      </aside>
    </div>
  );
}

type ScopeFieldsProps = {
  open: boolean;
  onToggle: () => void;
  fields: typeof EMPTY_SCOPE;
  onChange: (fields: typeof EMPTY_SCOPE) => void;
};

/** Optional investigation scope (Flow B). The account and environment are never chosen by the model. */
function ScopeFields({ open, onToggle, fields, onChange }: ScopeFieldsProps) {
  const input =
    "w-full rounded-[8px] border border-[#d9e3f0] bg-white px-2.5 py-2 font-mono text-[13px] text-[#182539] focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-[#f6b442]";
  const active = toScope(fields);
  return (
    <div className="rounded-[12px] border border-[#d9e3f0] bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="scope-fields"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-sm font-semibold text-[#1748a3] ${focusRing}`}
      >
        Investigate a payment
        <span aria-hidden="true" className="text-xs font-normal text-[#75839a]">
          {active ? [active.accountId, active.environment, active.paymentId].filter(Boolean).join(" · ") : open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div id="scope-fields" className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-3">
          <label className="text-xs text-[#51627b]">
            Account ID
            <input
              className={input}
              value={fields.accountId}
              placeholder="acct_bg_001"
              onChange={(event) => onChange({ ...fields, accountId: event.target.value })}
            />
          </label>
          <label className="text-xs text-[#51627b]">
            Environment
            <select
              className={input}
              value={fields.environment}
              onChange={(event) => onChange({ ...fields, environment: event.target.value })}
            >
              <option value="">Select…</option>
              <option value="production">production</option>
              <option value="sandbox">sandbox</option>
            </select>
          </label>
          <label className="text-xs text-[#51627b]">
            Payment ID
            <input
              className={input}
              value={fields.paymentId}
              placeholder="pay_bg_001_0003"
              onChange={(event) => onChange({ ...fields, paymentId: event.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

type TurnAnswerProps = {
  turn: Turn;
  selectedId: string | null;
  onSelect: (source: EvidenceSource) => void;
  onRetry: () => void;
};

function TurnAnswer({ turn, selectedId, onSelect, onRetry }: TurnAnswerProps) {
  const card = "rounded-[14px] border border-[#dde5f0] bg-white p-5 text-sm leading-relaxed shadow-[0_4px_12px_#1a3a6910]";

  if (turn.status === "loading") {
    return (
      <div role="status" className={`${card} text-[#586982]`}>
        <span aria-hidden="true" className="mr-2 inline-block size-2 animate-pulse rounded-full bg-[#2459d3]" />
        {turn.scope?.paymentId && turn.scope.accountId && turn.scope.environment
          ? `Investigating ${turn.scope.paymentId} in ${turn.scope.accountId} (${turn.scope.environment})…`
          : "Searching documentation…"}
      </div>
    );
  }

  if (turn.status === "error") {
    return (
      <div role="alert" className={`${card} border-[#f1c9c9] bg-[#fff8f8] text-[#8a2c2c]`}>
        <p>{turn.error}</p>
        <button
          type="button"
          onClick={onRetry}
          className={`mt-3 rounded-[9px] border border-[#e3b4b4] bg-white px-3 py-1.5 text-sm font-semibold text-[#8a2c2c] hover:bg-[#fdeeee] ${focusRing}`}
        >
          Try again
        </button>
      </div>
    );
  }

  const count = turn.sources.length;
  const citations = (
    <>
      <h3 className="mt-4 mb-2 text-xs font-bold text-[#3a4a63]">Evidence sources</h3>
      <EvidenceCitationList sources={turn.sources} onSelect={onSelect} selectedId={selectedId} />
    </>
  );

  if (turn.answer !== null) {
    const pill = STOP_PILLS[turn.stopReason ?? "answered"];
    return (
      <section aria-label={`Answer to: ${turn.question}`} className={card}>
        <span className={`mb-3 inline-block rounded-full px-2.5 py-1 text-xs ${pill.className}`}>{pill.text}</span>
        <p className="whitespace-pre-wrap text-[#182539]">{turn.answer}</p>
        <p className="mt-2 text-xs text-[#75839a]">
          AI-generated answer: check it against the sources below. Only sources the agent actually retrieved are shown.
          Documentation describes general policy; it does not confirm the status of a specific payment.
        </p>
        {turn.steps.length > 0 ? (
          <ol aria-label="Agent steps" className="mt-3 flex flex-wrap gap-2">
            {turn.steps.map((step, index) => (
              <li
                key={index}
                aria-label={`${step.label}: ${STEP_OUTCOME_TEXT[step.outcome]}`}
                title={STEP_OUTCOME_TEXT[step.outcome]}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#f2f5fa] px-2 py-1 text-[11px] text-[#51627b]"
              >
                <span aria-hidden="true" className={`size-1.5 rounded-full ${STEP_DOT[step.outcome]}`} />
                {step.label}
              </li>
            ))}
          </ol>
        ) : null}
        {citations}
      </section>
    );
  }

  return (
    <section aria-label={`Answer to: ${turn.question}`} className={card}>
      <span className="mb-3 inline-block rounded-full bg-[#e7f7ed] px-2.5 py-1 text-xs text-[#2a7159]">
        ✓ Search complete
      </span>
      <p className="text-[#182539]">
        {count > 0
          ? `Found ${count} matching documentation ${count === 1 ? "source" : "sources"}. These are retrieved passages, not an AI-written answer.`
          : "No matching documentation found. Try different words or an error code such as FP-4021."}
      </p>
      {count > 0 ? (
        <p className="mt-1 text-xs text-[#75839a]">
          Documentation describes general policy; it does not confirm the status of a specific payment.
        </p>
      ) : null}
      {citations}
    </section>
  );
}

const STOP_PILLS: Record<StopReason, { text: string; className: string }> = {
  answered: { text: "✓ Answer ready", className: "bg-[#e7f7ed] text-[#2a7159]" },
  no_evidence: { text: "No documentation found", className: "bg-[#fff6e5] text-[#8a5a00]" },
  budget_exhausted: { text: "Stopped at the step limit", className: "bg-[#fff6e5] text-[#8a5a00]" },
  error: { text: "Assistant unavailable", className: "bg-[#fdeeee] text-[#8a2c2c]" },
  needs_scope: { text: "Needs more information", className: "bg-[#eaf1fd] text-[#1748a3]" },
};

const STEP_OUTCOME_TEXT: Record<AgentStep["outcome"], string> = {
  ok: "found results",
  empty: "nothing found",
  duplicate: "skipped (duplicate)",
  rejected: "rejected (invalid request)",
  error: "failed",
  budget: "skipped (step limit reached)",
};

const STEP_DOT: Record<AgentStep["outcome"], string> = {
  ok: "bg-[#2a7159]",
  empty: "bg-[#c59a3a]",
  duplicate: "bg-[#9aa7b8]",
  rejected: "bg-[#b54848]",
  error: "bg-[#b54848]",
  budget: "bg-[#c59a3a]",
};
