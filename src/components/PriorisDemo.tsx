"use client";

import { FormEvent, useState } from "react";
import type { PriorisReport } from "@/lib/demo/prioris-types";

function labelText(label: string) {
  if (label === "explicit") return "Explicitly disclosed";
  if (label === "partial") return "Partially disclosed";
  return "Not disclosed";
}

function labelClass(label: string) {
  if (label === "explicit") return "text-white";
  if (label === "partial") return "text-fg-muted";
  return "text-fg-dim";
}

export function PriorisDemo() {
  const [demoKey, setDemoKey] = useState("analyst");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<PriorisReport | null>(null);

  function headers() {
    return { "X-Demo-Key": demoKey, "Content-Type": "application/json" };
  }

  async function loadSample() {
    setError("");
    const response = await fetch("/api/prioris/sample", { headers: { "X-Demo-Key": demoKey } });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "The sample could not be loaded.");
      return;
    }
    setText(data.text);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setReport(null);
    if (!text.trim()) {
      setError("Load the sample or paste an application.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/prioris", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "The analysis did not complete.");
        return;
      }
      setReport(data as PriorisReport);
    } catch {
      setError("The examiner service is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("This web demo reads .txt files. Paste the application text, or load the sample.");
      return;
    }
    file.text().then((value) => {
      setError("");
      setText(value);
    });
  }

  const columns = report?.candidates.slice(0, 4) ?? [];

  return (
    <div className="mt-12">
      <form onSubmit={onSubmit} className="grid gap-4 border border-border bg-bg-panel p-4 md:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-2 text-xs text-fg-muted">
            Demo key
            <input
              value={demoKey}
              onChange={(event) => setDemoKey(event.target.value)}
              autoComplete="off"
              className="h-10 w-36 border border-border bg-bg px-3 text-sm text-fg outline-none"
            />
          </label>
          <label className="grid gap-2 text-xs text-fg-muted">
            Application file
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={(event) => onFile(event.target.files?.[0])}
              className="text-sm text-fg-muted file:mr-3 file:h-10 file:border file:border-border file:bg-bg file:px-3 file:text-sm file:text-fg"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadSample()}
            className="inline-flex h-10 items-center border border-border-strong px-4 text-sm transition hover:bg-white hover:text-black"
          >
            Load sample
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {busy ? "Analyzing" : "Analyze"}
          </button>
        </div>
        <label className="grid gap-2 text-xs text-fg-muted">
          Application text
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste an application, or load the fictional wearable sample."
            className="min-h-40 w-full border border-border bg-bg px-3 py-3 text-sm leading-relaxed text-fg outline-none placeholder:text-fg-dim"
          />
        </label>
        <p className="text-sm text-fg-muted">Public demonstration key: analyst. Uploaded text is analyzed in this request and is not added to the corpus.</p>
        {error ? <p className="text-sm text-white">{error}</p> : null}
      </form>

      {report ? (
        <div className="mt-6 space-y-4">
          <section className="grid border border-border bg-bg-elevated sm:grid-cols-3">
            {[
              [report.claimsParsed, "Claims parsed"],
              [report.candidateCount, "Legal candidates"],
              [report.highPriority, "High-priority references"],
            ].map(([value, label]) => (
              <div key={String(label)} className="border-border px-5 py-5 sm:border-r sm:last:border-r-0">
                <p className="text-3xl font-medium tracking-[-0.03em]">{value}</p>
                <p className="mt-1 text-xs text-fg-muted">{label}</p>
              </div>
            ))}
          </section>

          {report.anticipationReferences.length ? (
            <p className="border border-border bg-bg-panel px-5 py-4 text-sm leading-relaxed text-fg-muted">
              <span className="text-fg">Single-reference coverage. </span>
              {report.anticipationReferences.join(", ")} explicitly covers every limitation. Review it for anticipation. This is not a legal determination.
            </p>
          ) : null}

          {report.obviousnessReview ? (
            <p className="border border-border bg-bg-panel px-5 py-4 text-sm leading-relaxed text-fg-muted">
              <span className="text-fg">Combination to review. </span>
              {report.obviousnessReview.references.join(" + ")}. {report.obviousnessReview.note}
            </p>
          ) : null}

          {columns.length ? (
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-bg-elevated font-mono text-[11px] tracking-[0.08em] text-fg-dim uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Claim limitation</th>
                    {columns.map((candidate) => (
                      <th key={candidate.patentId} className="px-4 py-3 font-medium">
                        {candidate.patentId}
                        <span className="mt-1 block font-sans text-xs tracking-normal text-fg-muted normal-case">
                          {candidate.title}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.limitations.map((limitation, index) => (
                    <tr key={limitation.index} className="border-t border-border align-top">
                      <th className="px-4 py-3 font-sans text-sm font-normal text-fg">{limitation.text}</th>
                      {columns.map((candidate) => {
                        const support = candidate.supports[index];
                        return (
                          <td key={candidate.patentId} className={`px-4 py-3 ${labelClass(support.label)}`}>
                            {labelText(support.label)}
                            {support.quote ? <span className="mt-2 block text-xs text-fg-dim">{support.quote}</span> : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {report.internalOverlap.length ? (
            <div className="border border-border px-5 py-4 text-sm text-fg-muted">
              <p className="text-fg">Technical overlap that is not statutory prior art</p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {report.internalOverlap.map((item) => (
                  <li key={item.patentId}>
                    {item.patentId} — {item.eligibilityReason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-sm leading-relaxed text-fg-muted">
            {report.corpusLimitation} {report.disclaimer}
          </p>
        </div>
      ) : null}
    </div>
  );
}
