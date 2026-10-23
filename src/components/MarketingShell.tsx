import type { ReactNode } from "react";
import { RequestAccessProvider } from "./RequestAccessModal";
import { ScrollToTop } from "./ScrollToTop";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <RequestAccessProvider>
      <ScrollToTop />
      <div id="top" className="min-h-screen bg-bg text-fg">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </RequestAccessProvider>
  );
}
