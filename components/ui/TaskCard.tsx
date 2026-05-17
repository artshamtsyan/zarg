import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TaskCardTone = "pink" | "violet" | "mint" | "sky" | "yellow" | "ice";

const toneClasses: Record<TaskCardTone, string> = {
  pink: "bg-task-card-pink",
  violet: "bg-task-card-violet",
  mint: "bg-task-card-mint",
  sky: "bg-task-card-sky",
  yellow: "bg-task-card-yellow",
  ice: "bg-canvas-ice border border-whisper-gray/40",
};

interface TaskCardProps {
  tone?: TaskCardTone;
  children: ReactNode;
  className?: string;
}

export function TaskCard({ tone = "violet", children, className }: TaskCardProps) {
  return (
    <div className={cn("rounded-[24px] p-6 md:p-8", toneClasses[tone], className)}>
      {children}
    </div>
  );
}
