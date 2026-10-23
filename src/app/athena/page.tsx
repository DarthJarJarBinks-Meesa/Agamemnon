import type { Metadata } from "next";
import Link from "next/link";
import { AthenaDemo } from "@/components/AthenaDemo";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Athena",
  description:
    "Ask Athena a technology question. Answers are copied from reviewer-approved public notes.",
  alternates: { canonical: "/athena" },
};

export default function AthenaPage() {
  return (
    <MarketingShell>
      <main className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs tracking-[0.2em] text-fg-dim">/0.1</p>
          <p className="mt-4 text-sm text-fg-muted">Athena</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(1.8rem,3.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.02em]">
            Ask about approved public science
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
            Athena answers from reviewer-signed public notes. It does not read private patents, and it does not send your question to USPTO or PatSnap. A request for restricted material gets one fixed reply, which does not confirm or deny a secret record. Prioris is the separate prior-art search.
          </p>
          <AthenaDemo />
          <p className="mt-10 text-sm text-fg-muted">
            Examining a draft application?{" "}
            <Link href="/prioris" className="text-white underline underline-offset-4">
              Open Prioris
            </Link>
            .
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
