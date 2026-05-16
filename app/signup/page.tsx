import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export const metadata = {
  title: "Sign up · Zarg",
};

export default function SignupPage() {
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
          <Link
            href="/"
            className="font-dm-sans text-[14px] tracking-[0.35px] text-ash-text hover:text-ghost-white"
          >
            Back
          </Link>
        </header>

        <SpotlightCard className="mt-16">
          <h1 className="font-geist text-[32px] leading-[1.14] text-canvas-white">
            Get your daily briefing.
          </h1>
          <p className="font-dm-sans mt-3 text-[15px] leading-[1.55] tracking-[0.35px] text-ghost-white">
            Enter your email. We'll send a magic link. No password.
          </p>
          <div className="mt-8">
            <SignupForm />
          </div>
          <p className="font-dm-sans mt-6 text-[13px] tracking-[0.35px] text-slate-text">
            By signing up, you agree to be lovely.
          </p>
        </SpotlightCard>
      </div>
    </main>
  );
}
