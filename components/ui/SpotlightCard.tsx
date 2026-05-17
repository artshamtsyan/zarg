import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Spotlight/feature card — light surface with a thin whisper-gray border for soft separation.
export function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] bg-canvas-ice px-7 py-6 md:px-8 md:py-7",
        "border border-whisper-gray/40",
        className
      )}
    >
      {children}
    </div>
  );
}
