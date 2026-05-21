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
      viewBox="0 0 38 22"
      className={cn(className)}
      role="img"
      aria-label="StarUp mark"
    >
      {/* Orange star — solid, no inner sparkle. Left edge flush at x=0 so the
          mark sits tight against the wordmark. */}
      <path
        fill="#ff6800"
        d="M9.5 1L11.5 8L19 8.5L13 13.5L15 20.5L9.5 16.5L4 20.5L6 13.5L0 8.5L7.5 8Z"
      />
      {/* Blue up-arrow — slim stem, tucked close to the star */}
      <path
        fill="#008ae8"
        d="M31 1L37.5 8H33V20.5H29V8H24.5Z"
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
    </svg>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  wordmarkClassName?: string;
}

const sizeMap: Record<NonNullable<LogoProps["size"]>, { mark: string; word: string; gap: string }> = {
  sm: { mark: "h-4 w-auto", word: "text-[16px]", gap: "gap-1" },
  md: { mark: "h-5 w-auto", word: "text-[20px]", gap: "gap-1.5" },
  lg: { mark: "h-8 w-auto", word: "text-[28px]", gap: "gap-2" },
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
