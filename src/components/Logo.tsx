export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="relative flex h-7 w-7 items-center justify-center border border-white/80"
      >
        <span className="absolute inset-[3px] border border-white/35" />
        <span className="h-2 w-2 bg-white" />
      </span>
      {!compact && (
        <span className="text-[15px] font-medium tracking-[0.02em] text-white">
          Agegmemnon
        </span>
      )}
    </span>
  );
}
