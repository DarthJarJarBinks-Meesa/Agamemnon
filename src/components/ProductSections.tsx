import { LazyVideo } from "./LazyVideo";

type ProductSectionProps = {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  videoSrc?: string;
  reverse?: boolean;
  href?: string;
  cta?: string;
};

export function ProductSection({
  id,
  index,
  eyebrow,
  title,
  description,
  videoSrc,
  reverse = false,
  href = "#platforms",
  cta = "Learn more",
}: ProductSectionProps) {
  return (
    <section
      id={id}
      className="border-t border-border px-4 py-20 md:px-6 md:py-28"
    >
      <div
        className={`mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div className="animate-fade-up">
          <p className="font-mono text-xs tracking-[0.2em] text-fg-dim">{index}</p>
          <p className="mt-4 text-sm text-fg-muted">{eyebrow}</p>
          <h2 className="mt-3 max-w-xl text-[clamp(1.8rem,3.4vw,3rem)] font-medium leading-[1.12] tracking-[-0.02em]">
            {title}
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-fg-muted">
            {description}
          </p>
          <a
            href={href}
            className="mt-8 inline-flex h-10 items-center border border-border-strong px-4 text-sm transition hover:bg-white hover:text-black"
          >
            {cta}
          </a>
        </div>

        <div className="relative overflow-hidden border border-border bg-bg-panel">
          {videoSrc ? (
            <LazyVideo src={videoSrc} className="aspect-[16/10] w-full object-cover" />
          ) : (
            <ol className="flex aspect-[16/10] flex-col justify-center gap-4 px-8 text-sm leading-relaxed text-fg-muted">
              <li>1. Split the draft into separate facts.</li>
              <li>2. Hold back any sentence that contains a number.</li>
              <li>3. Propose a public note. Publish it only after approval.</li>
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

export function ProductSections() {
  return (
    <div>
      <section className="px-4 pt-20 pb-4 md:px-6 md:pt-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[clamp(1.7rem,3.5vw,2.75rem)] font-medium leading-tight tracking-[-0.02em] text-fg">
            Automate examination workflows,
            <br />
            from prior art to office action
          </p>
          <h2 className="mt-6 text-2xl font-normal leading-relaxed text-fg-muted md:text-[1.75rem]">
            Our software powers examination decisions across the USPTO stack, from intake to
            allowance, on closed networks and with public-safe inquiry layers.
          </h2>
        </div>
      </section>

      <ProductSection
        id="athena"
        index="/0.1"
        eyebrow="Athena"
        title="Ask about approved public science"
        description="Athena answers from reviewer-signed public notes. It does not read private patents or send a question to a patent office. Restricted requests receive one fixed reply."
        videoSrc="/videos/athena.mp4"
        href="/athena"
        cta="Try the demo"
      />

      <ProductSection
        id="prioris"
        index="/0.2"
        eyebrow="Prioris"
        title="Prior art search and viability scoring for examiners"
        description="Prioris searches USPTO records, global patent claims, and technical literature, then ranks the closest art and flags novelty and obviousness questions for examiner review."
        videoSrc="/videos/prioris.mp4"
        reverse
        href="/prioris"
        cta="Try the demo"
      />

      <ProductSection
        id="sentinel"
        index="/0.3"
        eyebrow="Sentinel"
        title="Review a draft before it can be quoted"
        description="Sentinel withholds numbers and proposes a public note from the approved library. A proposal stays unpublished until a person approves that exact text."
        href="/sentinel"
        cta="Try the demo"
      />

      <ProductSection
        id="lexicon"
        index="/0.4"
        eyebrow="Lexicon"
        title="Classify every active patent into a living taxonomy"
        description="Extend the existing USPTO classification system with model-assisted labels that stay current as technology evolves: searchable, auditable, and examiner-overridable."
        videoSrc="/videos/lexicon.mp4"
      />

      <ProductSection
        id="nexus"
        index="/0.5"
        eyebrow="Nexus"
        title="Streamline examiner and filer interaction"
        description="Nexus replaces fragmented email and portal threads with structured claim discussion, attachment trails, and status that both sides can trust."
        videoSrc="/videos/nexus.mp4"
        reverse
      />

      <ProductSection
        id="vault"
        index="/0.6"
        eyebrow="Vault"
        title="Offline, closed-source model trained on patent data"
        description="Vault never phones home. Deploy on air-gapped USPTO infrastructure with a model trained exclusively on patent literature: built for custody, audit, and sovereign control."
        videoSrc="/videos/vault.mp4"
      />
    </div>
  );
}
