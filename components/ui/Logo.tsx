import { cn } from "@/lib/utils";

/**
 * StarUp mark — orange star + blue up-arrow, paired horizontally.
 * Each glyph corresponds to half of the wordmark: "Star" ★ + "Up" ↑.
 *
 * Colors are hardcoded to brand: accent-orange #ff6800 and outline-blue
 * #008ae8 (both also exist in the Aboard @theme palette). The interior
 * sparkle is white so it reads cleanly on light surfaces.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 22"
      className={cn(className)}
      role="img"
      aria-label="StarUp mark"
    >
      {/* Orange star */}
      <path
        fill="#ff6800"
        d="M11 1L13 8L20.5 8.5L14.5 13.5L16.5 20.5L11 16.5L5.5 20.5L7.5 13.5L1.5 8.5L9 8Z"
      />
      {/* White sparkle in the middle */}
      <path
        fill="#ffffff"
        d="M11 7L11.8 9.8L14.5 10L11.8 10.3L11 13L10.2 10.3L7.5 10L10.2 9.8Z"
      />
      {/* Blue up-arrow */}
      <path
        fill="#008ae8"
        d="M40 1L48 9H44.5V20.5H35.5V9H32Z"
      />
    </svg>
  );
}

/**
 * Standalone star — used for the favicon and any place we want just the
 * "Star" half.
 */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(className)} role="img" aria-label="StarUp star">
      <path
        fill="#ff6800"
        d="M12 1.5L14.6 8.4L22.5 9.1L16.4 14L18.6 21.5L12 17L5.4 21.5L7.6 14L1.5 9.1L9.4 8.4Z"
      />
      <path
        fill="#ffffff"
        d="M12 8L12.9 10.7L15.7 11L13 11.3L12 14L11 11.3L8.3 11L11.1 10.7Z"
      />
    </svg>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  wordmarkClassName?: string;
}

const sizeMap: Record<NonNullable<LogoProps["size"]>, { mark: string; word: string; gap: string }> = {
  sm: { mark: "h-4 w-auto", word: "text-[16px]", gap: "gap-2" },
  md: { mark: "h-5 w-auto", word: "text-[20px]", gap: "gap-2.5" },
  lg: { mark: "h-8 w-auto", word: "text-[28px]", gap: "gap-3" },
};

/**
 * Full StarUp logo — wordmark followed by the star+arrow mark, as in the
 * official brand artwork.
 */
export function Logo({ size = "md", className, wordmarkClassName }: LogoProps) {
  const s = sizeMap[size];
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <span
        className={cn(
          "font-semibold tracking-tight text-ink",
          s.word,
          wordmarkClassName
        )}
      >
        StarUp
      </span>
      <LogoMark className={s.mark} />
    </span>
  );
}
