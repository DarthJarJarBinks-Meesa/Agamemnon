import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { SentinelDemo } from "@/components/SentinelDemo";

export const metadata: Metadata = {
  title: "Sentinel",
  description:
    "Review a draft with Sentinel. Numbers stay unpublished until a person approves a separate public note.",
  alternates: { canonical: "/sentinel" },
};

export default function SentinelPage() {
  return (
    <MarketingShell>
      <main className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs tracking-[0.2em] text-fg-dim">/0.3</p>
          <p className="mt-4 text-sm text-fg-muted">Sentinel</p>
          <h1 className="mt-3 max-w-3xl text-[clamp(1.8rem,3.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.02em]">
            Review a draft before Athena can quote it
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted">
            Sentinel reads a draft, withholds numbers, and proposes a public note that already exists in the approved library. Approve, then publish. The proposal alone does not publish, and this page does not open the private patent file.
          </p>
          <SentinelDemo />
          <p className="mt-10 text-sm text-fg-muted">
            <Link href="/athena" className="text-white underline underline-offset-4">
              Athena
            </Link>{" "}
            answers from notes that are already approved.{" "}
            <Link href="/prioris" className="text-white underline underline-offset-4">
              Prioris
            </Link>{" "}
            searches prior art.
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
