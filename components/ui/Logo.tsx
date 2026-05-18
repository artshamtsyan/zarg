import { cn } from "@/lib/utils";

/**
 * StarUp logo — a 5-point star whose top point is elongated upward
 * like an arrow, embodying the "Star + Up" idea in a single mark.
 *
 * Uses currentColor so it inherits text color from the parent;
 * change tone via Tailwind text-* utilities (default: text-outline-blue).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("text-outline-blue", className)}
      aria-hidden="true"
    >
      <path d="M12 1.5L13.6 10L21 10.6L14.8 14L16.8 21.5L12 17L7.2 21.5L9.2 14L3 10.6L10.4 10Z" />
    </svg>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  wordmarkClassName?: string;
}

const sizeMap: Record<NonNullable<LogoProps["size"]>, { mark: string; word: string; gap: string }> = {
  sm: { mark: "h-4 w-4", word: "text-[16px]", gap: "gap-1.5" },
  md: { mark: "h-5 w-5", word: "text-[20px]", gap: "gap-2" },
  lg: { mark: "h-8 w-8", word: "text-[28px]", gap: "gap-2.5" },
};

/**
 * Full StarUp logo — mark + wordmark, inline-flex. Drop into headers.
 */
export function Logo({ size = "md", className, wordmarkClassName }: LogoProps) {
  const s = sizeMap[size];
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <LogoMark className={s.mark} />
      <span
        className={cn(
          "font-semibold tracking-tight text-ink",
          s.word,
          wordmarkClassName
        )}
      >
        StarUp
      </span>
    </span>
  );
}
