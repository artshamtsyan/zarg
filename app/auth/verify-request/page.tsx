import Link from "next/link";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export const metadata = { title: "Check your email · Zarg" };

export default function VerifyRequestPage() {
  return (
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-md px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white"
          >
            Zarg
          </Link>
        </header>

        <SpotlightCard className="mt-16">
          <h1 className="font-geist text-[32px] leading-[1.14] text-canvas-white">
            Check your email.
          </h1>
          <p className="font-dm-sans mt-3 text-[16px] leading-[1.55] tracking-[0.4px] text-ghost-white">
            We sent you a sign-in link. Open it on this device to continue.
          </p>
          <p className="font-dm-sans mt-6 text-[13px] tracking-[0.35px] text-slate-text">
            The link works for 24 hours. If it doesn't arrive in a minute, check spam.
          </p>
        </SpotlightCard>
      </div>
    </main>
  );
}
