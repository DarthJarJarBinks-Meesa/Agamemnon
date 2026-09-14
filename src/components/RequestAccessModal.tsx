"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

type RequestAccessContextValue = {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const RequestAccessContext = createContext<RequestAccessContextValue | null>(null);

export function useRequestAccess() {
  const ctx = useContext(RequestAccessContext);
  if (!ctx) {
    throw new Error("useRequestAccess must be used within RequestAccessProvider");
  }
  return ctx;
}

export function RequestAccessProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <RequestAccessContext.Provider value={{ open, openModal, closeModal }}>
      {children}
      <RequestAccessModal />
    </RequestAccessContext.Provider>
  );
}

function RequestAccessModal() {
  const { open, closeModal } = useRequestAccess();
  const titleId = useId();
  const [email, setEmail] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail("");
      setInquiry("");
      setStatus("idle");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      // Submit from the browser so FormSubmit sees the real site origin
      // (server-side proxy fails / needs re-activation per domain on Vercel).
      const res = await fetch(
        "https://formsubmit.co/ajax/sepehrkhavari13@gmail.com",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email,
            inquiry,
            message: `New Agamemnon access request from ${email}\n\nInquiry:\n${inquiry}`,
            _subject: "Agamemnon — Request Access",
            _template: "table",
            _cc: "dillan.prasad17@gmail.com",
            _captcha: "false",
          }),
        },
      );

      const data = (await res.json().catch(() => ({}))) as {
        success?: string | boolean;
        message?: string;
      };

      const message = data.message ?? "";
      const ok = data.success === true || data.success === "true";

      if (/activation|activate form|needs activation/i.test(message)) {
        throw new Error(
          "Check sepehrkhavari13@gmail.com (and Spam) for a FormSubmit email, then click Activate Form. After that, try again.",
        );
      }

      if (!res.ok || !ok) {
        throw new Error(message || "Could not send your request. Please try again shortly.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 animate-fade-in"
      role="presentation"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md border border-border-strong bg-bg-elevated p-6 shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-medium tracking-tight text-white">
              Request access
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              Leave your email and we&apos;ll follow up.
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-border-strong text-fg-muted transition hover:text-fg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {status === "success" ? (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-fg">
              Thanks — we received your request and will be in touch.
            </p>
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex h-11 w-full items-center justify-center bg-white text-sm font-medium text-black transition hover:bg-white/90"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs tracking-wide text-fg-dim uppercase">
                Email
              </span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.com"
                className="h-11 w-full border border-border-strong bg-bg px-3 text-sm text-white outline-none placeholder:text-fg-dim focus:border-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs tracking-wide text-fg-dim uppercase">
                Nature of inquiry
              </span>
              <textarea
                required
                rows={4}
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                placeholder="Tell us a bit about what you’re looking for…"
                className="w-full resize-y border border-border-strong bg-bg px-3 py-2.5 text-sm text-white outline-none placeholder:text-fg-dim focus:border-white"
              />
            </label>
            {status === "error" && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex h-11 w-full items-center justify-center bg-white text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {status === "loading" ? "Sending…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
