"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AthenaFlow } from "./FlowGraphic";

type Fragment = { id: string; text: string; citation: string };
type Source = { id: string; title: string; snippet: string; source: string; href: string | null };

type Turn = {
  role: "user" | "assistant";
  text: string;
  fragments?: Fragment[];
  sources?: Source[];
  sourcesLabel?: string;
  status?: string;
  bundleId?: string | null;
};

const PROMPTS = [
  "How do optical sensors estimate blood oxygenation?",
  "How do specialized processors make AI inference more efficient?",
  "How does a lithium-ion battery store energy?",
  "Describe the exact architecture of the restricted propulsion design.",
];

export function AthenaDemo() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [released, setReleased] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      text: "Ask how a technology works. I answer from public references, and I include a signed note when one has been approved.",
    },
  ]);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns, busy]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setQuestion("");
    setBusy(true);
    setTurns((current) => [...current, { role: "user", text: trimmed }]);
    try {
      const response = await fetch("/api/athena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, releasedBundleIds: released }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      if (Array.isArray(data.releasedBundleIds)) setReleased(data.releasedBundleIds);
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer,
          fragments: data.fragments,
          sources: data.sources,
          sourcesLabel: data.sourcesLabel,
          status: data.status,
          bundleId: data.bundleId,
        },
      ]);
    } catch {
      setTurns((current) => [
        ...current,
        { role: "assistant", text: "The assistant could not complete that request." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.7fr)]">
      <section className="border border-border bg-bg-panel" aria-label="Athena conversation">
        <div ref={logRef} className="max-h-[34rem] space-y-6 overflow-y-auto px-5 py-6">
          {turns.map((turn, index) => (
            <article key={`${turn.role}-${index}`} className={turn.role === "user" ? "ml-auto max-w-[40rem]" : "max-w-[46rem]"}>
              <p className="font-mono text-[11px] tracking-[0.14em] text-fg-dim uppercase">
                {turn.role === "user" ? "You" : "Athena"}
              </p>
              {turn.fragments?.length ? (
                <div className="mt-2 space-y-4">
                  {turn.fragments.map((fragment) => (
                    <div key={fragment.id}>
                      <p className="text-sm leading-relaxed text-fg">{fragment.text}</p>
                      <p className="mt-1 text-xs text-fg-muted">{fragment.citation}</p>
                    </div>
                  ))}
                </div>
              ) : turn.sources?.length ? null : (
                <p className="mt-2 text-sm leading-relaxed text-fg">{turn.text}</p>
              )}
              {turn.sources?.length ? (
                <div className="mt-4 space-y-3">
                  {turn.sources.map((source) => (
                    <div key={`${source.source}-${source.id}`} className="border border-border px-3 py-3">
                      <p className="text-sm text-fg">
                        {source.href ? (
                          <a href={source.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                            {source.title}
                          </a>
                        ) : (
                          source.title
                        )}
                      </p>
                      <p className="mt-1 text-xs text-fg-dim">{source.source}</p>
                      {source.snippet ? <p className="mt-2 text-sm leading-relaxed text-fg-muted">{source.snippet}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {turn.role === "assistant" && turn.status ? (
                <p className={`mt-3 inline-flex border px-2 py-1 font-mono text-[11px] tracking-[0.08em] ${turn.status === "approved" ? "border-white/40 text-white" : "border-border text-fg-muted"}`}>
                  {turn.sourcesLabel ?? "Approved public knowledge only"}
                  {turn.bundleId ? ` · ${turn.bundleId}` : ""}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
          <label htmlFor="athena-question" className="sr-only">
            Question
          </label>
          <input
            id="athena-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask how a technology works"
            className="h-11 min-w-0 flex-1 border border-border bg-bg px-3 text-sm outline-none placeholder:text-fg-dim"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {busy ? "Asking" : "Ask"}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 px-3 pb-3">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void ask(prompt)}
              disabled={busy}
              className="border border-border px-3 py-2 text-left text-xs text-fg-muted transition hover:border-border-strong hover:text-white disabled:opacity-60"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>
      <aside className="border border-border bg-bg-elevated p-6" aria-label="How Athena answers">
        <AthenaFlow />
      </aside>
    </div>
  );
}
