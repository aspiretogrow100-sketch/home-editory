type AdSlotProps = {
  label?: string;
  format?: "banner" | "rectangle";
};

/**
 * Placeholder container for a Google AdSense unit. Drop the AdSense
 * <ins class="adsbygoogle"> markup inside once the account is approved.
 */
export function AdSlot({ label = "Advertisement", format = "banner" }: AdSlotProps) {
  const height = format === "banner" ? "h-24 md:h-28" : "h-64";
  return (
    <div
      data-ad-slot={format}
      className={`flex ${height} w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/60 text-xs uppercase tracking-[0.2em] text-muted-foreground`}
    >
      {label}
    </div>
  );
}
