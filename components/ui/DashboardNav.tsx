"use client";

import { FloatingPillBar } from "./FloatingPillBar";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7l6-5 6 5v7a1 1 0 0 1-1 1h-3v-5H6v5H3a1 1 0 0 1-1-1V7z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/learn",
    label: "Teach",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h12M2 8h12M2 12h7" />
        <circle cx="12.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/dashboard/briefings",
    label: "Briefings",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="3" width="11" height="11" rx="2" />
        <path d="M5 6.5h6M5 9.5h6M5 12h3.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/sources",
    label: "Sources",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h10M3 9h10M3 13h6" />
        <circle cx="13" cy="13" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/dashboard/telegram",
    label: "Telegram",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3 1.5 8.2l3.7 1.4 1.4 3.7L14 3zM7.5 11l-2-2L14 3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2" />
        <path d="M13.2 8a5.2 5.2 0 0 0-.1-1l1.4-1.1-1.4-2.4-1.7.6a5.2 5.2 0 0 0-1.7-1L9.4 1.5h-2.8L6.3 3.1a5.2 5.2 0 0 0-1.7 1l-1.7-.6L1.5 5.9 2.9 7a5.2 5.2 0 0 0 0 2L1.5 10.1l1.4 2.4 1.7-.6a5.2 5.2 0 0 0 1.7 1l.3 1.6h2.8l.3-1.6a5.2 5.2 0 0 0 1.7-1l1.7.6 1.4-2.4L13.1 9a5.2 5.2 0 0 0 .1-1z" />
      </svg>
    ),
  },
];

export function DashboardNav() {
  return <FloatingPillBar items={NAV_ITEMS} />;
}
