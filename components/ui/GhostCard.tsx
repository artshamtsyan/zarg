import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Subtle informational card on Canvas Ice — used for grouped rows with minimal visual weight.
export function GhostCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] p-6",
        "bg-canvas-ice border border-whisper-gray/30",
        className
      )}
    >
      {children}
    </div>
  );
}
