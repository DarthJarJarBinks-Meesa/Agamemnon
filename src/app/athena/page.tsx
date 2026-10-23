import type { Metadata } from "next";
import Link from "next/link";
import { AthenaDemo } from "@/components/AthenaDemo";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Athena",
  description:
    "Try Athena, the public-safe patent chatbot. Answers are quoted from reviewer-approved fragments and do not reveal restricted records.",
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
            Ask nonsensitive questions across the classified patent corpus
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
            This demonstration answers from reviewer-signed notes only. The public assistant does not open the restricted patent store, and a refusal does not confirm or deny that a record exists.
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
