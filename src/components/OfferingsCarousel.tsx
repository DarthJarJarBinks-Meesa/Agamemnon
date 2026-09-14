"use client";

import { useEffect, useRef, useState } from "react";

const slides = [
  {
    id: "prior-art-os",
    label: "Prior Art OS",
    title: "Prior Art OS",
    subtitle: "Surface relevant art across the full USPTO corpus in seconds",
    image:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "examiner-copilot",
    label: "Examiner Copilot",
    title: "Examiner Copilot",
    subtitle: "Viability signals, claim charts, and office-action drafts in one workspace",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "filer-workspace",
    label: "Filer Workspace",
    title: "Filer Workspace",
    subtitle: "Structured dialogue between applicants and examiners without the noise",
    image:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "classification",
    label: "Classification Engine",
    title: "Classification Engine",
    subtitle: "Map every active patent into a living classified taxonomy",
    image:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "public-chat",
    label: "Public Patent Chat",
    title: "Public Patent Chat",
    subtitle: "Nonsensitive answers for inventors, counsel, and the curious public",
    image:
      "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "vault",
    label: "Vault",
    title: "Vault",
    subtitle: "Offline, closed-source model trained exclusively on patent data",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80",
  },
];

export function OfferingsCarousel() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const hasUserNavigated = useRef(false);

  useEffect(() => {
    // Avoid scrollIntoView on first paint — it was pulling the whole page down on load.
    if (!hasUserNavigated.current) return;

    const track = trackRef.current;
    const node = track?.children[active] as HTMLElement | undefined;
    if (!track || !node) return;

    const left = node.offsetLeft - (track.clientWidth - node.clientWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  const select = (index: number) => {
    hasUserNavigated.current = true;
    setActive(index);
  };

  const next = () => {
    hasUserNavigated.current = true;
    setActive((i) => (i + 1) % slides.length);
  };

  return (
    <section id="slides" className="border-t border-border bg-bg pt-10 pb-16">
      <div className="mb-8 flex flex-wrap items-center gap-2 px-4 md:px-6">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => select(index)}
            className={`h-9 px-3 text-[13px] transition ${
              active === index
                ? "bg-white text-black"
                : "border border-border text-fg-muted hover:border-border-strong hover:text-fg"
            }`}
          >
            {slide.label}
          </button>
        ))}
      </div>

      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 md:gap-5 md:px-6"
      >
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            className={`relative min-w-[85%] snap-center overflow-hidden border border-border sm:min-w-[70%] lg:min-w-[58%] ${
              active === index ? "opacity-100" : "opacity-70"
            }`}
          >
            <div className="relative aspect-[16/9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-7">
                <div>
                  <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
                    {slide.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-white/75 md:text-base">
                    {slide.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={next}
                  className="hidden h-10 shrink-0 items-center border border-white/40 px-4 text-sm text-white transition hover:bg-white hover:text-black sm:inline-flex"
                >
                  Next
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
