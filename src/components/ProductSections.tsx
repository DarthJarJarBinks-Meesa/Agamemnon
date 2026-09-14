import { LazyVideo } from "./LazyVideo";

type ProductSectionProps = {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  videoSrc: string;
  reverse?: boolean;
};

export function ProductSection({
  id,
  index,
  eyebrow,
  title,
  description,
  videoSrc,
  reverse = false,
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
            href="#platforms"
            className="mt-8 inline-flex h-10 items-center border border-border-strong px-4 text-sm transition hover:bg-white hover:text-black"
          >
            Learn more
          </a>
        </div>

        <div className="relative overflow-hidden border border-border bg-bg-panel">
          <LazyVideo
            src={videoSrc}
            className="aspect-[16/10] w-full object-cover"
          />
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
            Our software powers examination decisions across the USPTO stack — from intake to
            allowance — on closed networks and with public-safe inquiry layers.
          </h2>
        </div>
      </section>

      <ProductSection
        id="athena"
        index="/0.1"
        eyebrow="Athena"
        title="Ask nonsensitive questions across the classified patent corpus"
        description="A chatbot interface for inventors, counsel, and the public to explore active USPTO patents without exposing restricted examination material. Answers stay within nonsensitive disclosure boundaries."
        videoSrc="/videos/athena.mp4"
      />

      <ProductSection
        id="prioris"
        index="/0.2"
        eyebrow="Prioris"
        title="Prior art search and viability scoring for examiners"
        description="Prioris reads claims against the full historical corpus, ranks relevant art, and surfaces novelty and obviousness signals so examiners can move faster with higher confidence."
        videoSrc="/videos/prioris.mp4"
        reverse
      />

      <ProductSection
        id="lexicon"
        index="/0.3"
        eyebrow="Lexicon"
        title="Classify every active patent into a living taxonomy"
        description="Extend the existing USPTO classification system with model-assisted labels that stay current as technology evolves — searchable, auditable, and examiner-overridable."
        videoSrc="/videos/lexicon.mp4"
      />

      <ProductSection
        id="nexus"
        index="/0.4"
        eyebrow="Nexus"
        title="Streamline examiner and filer interaction"
        description="Nexus replaces fragmented email and portal threads with structured claim discussion, attachment trails, and status that both sides can trust."
        videoSrc="/videos/nexus.mp4"
        reverse
      />

      <ProductSection
        id="vault"
        index="/0.5"
        eyebrow="Vault"
        title="Offline, closed-source model trained on patent data"
        description="Vault never phones home. Deploy on air-gapped USPTO infrastructure with a model trained exclusively on patent literature — built for custody, audit, and sovereign control."
        videoSrc="/videos/vault.mp4"
      />
    </div>
  );
}
