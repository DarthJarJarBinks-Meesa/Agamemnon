import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { PriorisDemo } from "@/components/PriorisDemo";

export const metadata: Metadata = {
  title: "Prioris",
  description:
    "Search USPTO records, global patents, and literature with Prioris. Claim charts flag possible anticipation and obviousness for examiner review.",
  alternates: { canonical: "/prioris" },
};

export default function PriorisPage() {
  return (
    <MarketingShell>
      <main className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs tracking-[0.2em] text-fg-dim">/0.2</p>
          <p className="mt-4 text-sm text-fg-muted">Prioris</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(1.8rem,3.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.02em]">
            Prior art search and viability scoring for examiners
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
            Paste an application. Prioris searches USPTO file-wrapper records, PatSnap patent claims, and PatSnap literature, then separates earlier publications from technical overlap.
          </p>
          <PriorisDemo />
          <p className="mt-10 text-sm text-fg-muted">
            Looking for the public assistant?{" "}
            <Link href="/athena" className="text-white underline underline-offset-4">
              Open Athena
            </Link>
            .
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
