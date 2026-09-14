"use client";

import { useRequestAccess } from "./RequestAccessModal";

const platforms = [
  {
    name: "Athena",
    blurb: "Public-safe patent chatbot for nonsensitive inquiry.",
  },
  {
    name: "Prioris",
    blurb: "Examiner prior-art and viability engine.",
  },
  {
    name: "Lexicon",
    blurb: "Living classification across active USPTO patents.",
  },
  {
    name: "Nexus",
    blurb: "Structured examiner–filer collaboration.",
  },
  {
    name: "Vault",
    blurb: "Offline closed-source patent foundation model.",
  },
];

export function Platforms() {
  const { openModal } = useRequestAccess();

  return (
    <section id="platforms" className="border-t border-border px-4 py-20 md:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="text-[clamp(1.8rem,3.2vw,2.75rem)] font-medium tracking-[-0.02em]">
            Build and manage ontology-powered patent software, with a complete examination platform
          </h2>
          <p className="mt-5 text-fg-muted">
            The central system for orchestrating decisions across human examiners and AI assistance:
            deployable in sovereign, offline environments.
          </p>
        </div>

        <div className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
          {platforms.map((platform) => (
            <a
              key={platform.name}
              href={`#${platform.name.toLowerCase()}`}
              className="group bg-bg-elevated p-6 transition hover:bg-bg-panel"
            >
              <h3 className="text-lg font-medium group-hover:underline group-hover:underline-offset-4">
                {platform.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{platform.blurb}</p>
            </a>
          ))}
        </div>

        <div className="mt-20 border border-border bg-[linear-gradient(135deg,#101010,#070707)] px-6 py-16 text-center md:px-12">
          <h3 className="text-[clamp(1.6rem,3vw,2.4rem)] font-medium tracking-tight">
            There is so much left to examine
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-fg-muted">
            Agamemnon exists to make the patent system legible, classified, searchable, and fair,
            without compromising the security posture of examination.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-8 inline-flex h-11 items-center bg-white px-5 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Request access
          </button>
        </div>
      </div>
    </section>
  );
}
