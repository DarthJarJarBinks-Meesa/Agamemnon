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
        <p className="text-xs text-fg-dim">
          © {new Date().getFullYear()} Agegmemnon. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
