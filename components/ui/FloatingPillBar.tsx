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
          "bg-[rgba(10,10,10,0.7)] backdrop-blur-[10px]",
          "border border-[rgba(229,229,229,0.08)]",
          "p-1"
        )}
      >
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-[14px] tracking-[0.35px] transition-colors",
                active
                  ? "bg-canvas-white text-storm-gray"
                  : "text-ghost-white hover:bg-[rgba(229,229,229,0.08)]"
              )}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center opacity-90">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
