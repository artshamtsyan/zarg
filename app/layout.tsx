import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StarUp — Your daily ops briefing, written by an AI that knows your business",
  description:
    "StarUp onboards your small business in a 10-minute discovery conversation, then delivers a Telegram briefing every morning with what to focus on today.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
