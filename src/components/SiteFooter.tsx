import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer id="footer" className="border-t border-border bg-bg-elevated px-4 py-12 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Offline patent intelligence for examiners, filers, and the public.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <nav className="flex gap-4 text-sm text-fg-muted" aria-label="Demos">
            <a href="/athena" className="transition hover:text-white">
              Athena demo
            </a>
            <a href="/sentinel" className="transition hover:text-white">
              Sentinel demo
            </a>
            <a href="/prioris" className="transition hover:text-white">
              Prioris demo
            </a>
          </nav>
          <p className="text-xs text-fg-dim">
            © {new Date().getFullYear()} Agamemnon. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
