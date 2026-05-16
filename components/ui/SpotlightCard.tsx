import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[42px] px-7 py-6",
        "bg-[rgba(0,0,0,0.2)] backdrop-blur-[4px]",
        "border border-[rgba(229,229,229,0.08)]",
        className
      )}
      style={{
        boxShadow:
          "rgba(255, 255, 255, 0.02) 0px 3px 4.5px, rgba(0, 0, 0, 0.04) 0px 10px 8px, rgba(0, 0, 0, 0.1) 0px 4px 3px",
      }}
    >
      {children}
    </div>
  );
}
