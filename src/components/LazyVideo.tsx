"use client";

import { useEffect, useRef } from "react";

type LazyVideoProps = {
  src: string;
  className?: string;
  /** When true, start loading sooner (hero). Default false = load only near viewport. */
  eager?: boolean;
};

export function LazyVideo({ src, className, eager = false }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let loadStarted = false;

    const ensureSource = () => {
      if (loadStarted) return;
      loadStarted = true;
      if (!video.getAttribute("src")) {
        video.src = src;
      }
      video.load();
    };

    const playSafe = () => {
      ensureSource();
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          /* Autoplay can be blocked; ignore — muted+playsInline usually works. */
        });
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            playSafe();
          } else {
            video.pause();
          }
        }
      },
      {
        root: null,
        // Start a bit before fully on-screen so playback feels instant
        rootMargin: eager ? "200px 0px" : "120px 0px",
        threshold: 0.15,
      },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [src, eager]);

  return (
    <video
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      autoPlay
      preload="none"
      // src set only when near viewport — avoids downloading all clips on first paint
    />
  );
}
