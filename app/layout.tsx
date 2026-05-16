import type { Metadata } from "next";
import { DM_Sans, Geist } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans-loaded",
  weight: ["400", "500", "700"],
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-loaded",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zarg — Your daily ops briefing, written by an AI that knows your business",
  description:
    "Zarg onboards your small business in a 10-minute discovery conversation, then delivers a Telegram briefing every morning with what to focus on today.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${geist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
