import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GhostCardProps {
  children: ReactNode;
  className?: string;
}

export function GhostCard({ children, className }: GhostCardProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] p-4",
        "bg-[rgba(212,212,212,0.06)]",
        "border border-[rgba(229,229,229,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}
