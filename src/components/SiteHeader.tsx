"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { useRequestAccess } from "./RequestAccessModal";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { openModal } = useRequestAccess();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 flex h-14 items-center justify-between gap-3 px-4 transition-colors duration-300 md:px-6 ${
        scrolled ? "bg-bg/90 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Agamemnon homepage">
        <Logo />
      </Link>

      <div className="flex items-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={openModal}
          className="inline-flex h-9 items-center bg-white px-3 text-[13px] font-medium text-black transition hover:bg-white/90 sm:px-4"
        >
          Get Started
        </button>
      </div>
    </header>
  );
}
