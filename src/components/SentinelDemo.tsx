"use client";

import { FormEvent, useState } from "react";
import { SENTINEL_SAMPLE, type SentinelProposal, type SentinelReview } from "@/lib/demo/sentinel";

type ProposalState = SentinelProposal & { status: "REVIEW_REQUIRED" | "APPROVED" | "REJECTED" | "PUBLISHED" | "REVOKED" };

export function SentinelDemo() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<SentinelReview | null>(null);
  const [proposals, setProposals] = useState<ProposalState[]>([]);

  const published = proposals.filter((item) => item.status === "PUBLISHED");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    setReview(null);
    setProposals([]);
    try {
      const response = await fetch("/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The review did not complete.");
      setReview(data);
      setProposals(data.proposals);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The review did not complete.");
    } finally {
      setBusy(false);
    }
  }

  function setStatus(id: string, status: ProposalState["status"]) {
    setProposals((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (status === "APPROVED" && item.status !== "REVIEW_REQUIRED") return item;
        if (status === "REJECTED" && item.status !== "REVIEW_REQUIRED") return item;
        if (status === "PUBLISHED" && item.status !== "APPROVED" && item.status !== "REVOKED") return item;
        if (status === "REVOKED" && item.status !== "PUBLISHED") return item;
        return { ...item, status };
      }),
    );
  }

  return (
    <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
      <section className="border border-border bg-bg-panel" aria-label="Sentinel review">
        <form onSubmit={onSubmit} className="space-y-3 p-4">
          <label htmlFor="sentinel-text" className="text-sm text-fg-muted">
            Draft text
          </label>
          <textarea
            id="sentinel-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste a short technical draft."
            className="min-h-40 w-full border border-border bg-bg px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-fg-dim"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setText(SENTINEL_SAMPLE)}
              className="inline-flex h-10 items-center border border-border px-3 text-sm text-fg-muted transition hover:text-white"
            >
              Load example
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {busy ? "Reviewing" : "Review"}
            </button>
          </div>
          {error ? <p className="text-sm text-fg-muted">{error}</p> : null}
        </form>

        {review ? (
          <div className="space-y-6 border-t border-border px-4 py-5">
            <p className="font-mono text-[11px] tracking-[0.08em] text-fg-muted">Disposition {review.disposition}</p>
            <div className="space-y-3">
              {review.units.map((unit) => (
                <div key={unit.id} className="border border-border px-3 py-3">
                  <p className="font-mono text-[11px] tracking-[0.08em] text-fg-dim">{unit.kind}</p>
                  <p className="mt-2 text-sm leading-relaxed text-fg">{unit.withheld ? "Withheld from the public note." : unit.text}</p>
                  <p className="mt-1 text-xs text-fg-muted">{unit.reason}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {proposals.length ? (
                proposals.map((item) => (
                  <div key={item.id} className="border border-border px-3 py-3">
                    <p className="font-mono text-[11px] tracking-[0.08em] text-fg-dim">
                      {item.level} · {item.status}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-fg">{item.text}</p>
                    <p className="mt-1 text-xs text-fg-muted">{item.citation}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setStatus(item.id, "APPROVED")} className="border border-border px-2 py-1 text-xs text-fg-muted hover:text-white">
                        Approve
                      </button>
                      <button type="button" onClick={() => setStatus(item.id, "REJECTED")} className="border border-border px-2 py-1 text-xs text-fg-muted hover:text-white">
                        Reject
                      </button>
                      <button type="button" onClick={() => setStatus(item.id, "PUBLISHED")} className="border border-border px-2 py-1 text-xs text-fg-muted hover:text-white">
                        Publish
                      </button>
                      <button type="button" onClick={() => setStatus(item.id, "REVOKED")} className="border border-border px-2 py-1 text-xs text-fg-muted hover:text-white">
                        Revoke
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-fg-muted">No approved public note matches this draft. Nothing is proposed for Athena.</p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="border border-border bg-bg-elevated p-6">
        <h2 className="text-xl font-medium tracking-[-0.02em]">What Athena could say</h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Publish adds a note to this browser only. It does not change Athena for anyone else, and it never copies a withheld sentence.
        </p>
        <div className="mt-5 space-y-4">
          {published.length ? (
            published.map((item) => (
              <div key={item.id}>
                <p className="text-sm leading-relaxed text-fg">{item.text}</p>
                <p className="mt-1 text-xs text-fg-muted">{item.citation}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-fg-muted">Nothing is published yet.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
