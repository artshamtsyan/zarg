"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

interface FloatingPillBarProps {
  items: NavItem[];
}

export function FloatingPillBar({ items }: FloatingPillBarProps) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div
        className={cn(
          "flex items-center gap-1 rounded-full",
          "bg-canvas-ice/85 backdrop-blur",
          "border border-whisper-gray/50",
          "p-1 shadow-[0_6px_24px_rgba(38,38,38,0.06)]"
        )}
      >
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition-colors",
                active
                  ? "bg-ghost-blue text-outline-blue"
                  : "text-slate hover:bg-ghost-blue/60 hover:text-outline-blue"
              )}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
