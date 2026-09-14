import { LazyVideo } from "./LazyVideo";

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-3.5rem)] items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <LazyVideo
          src="/videos/hero.mp4"
          className="hero-media h-full w-full object-cover opacity-55 brightness-[1.5]"
          eager
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center animate-fade-up">
        <h1 className="text-[clamp(2.1rem,5.2vw,4.35rem)] font-medium leading-[1.08] tracking-[-0.02em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.65)]">
          Sovereign Patent Intelligence
          <br />
          for Every Examination
        </h1>
      </div>
    </section>
  );
}
