"use client";

import { useEffect } from "react";

/** Ensure cold loads and refreshes always start at the top of the page. */
export function ScrollToTop() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return null;
}
