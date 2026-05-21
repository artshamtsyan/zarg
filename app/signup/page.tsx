import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { SignupForm } from "./SignupForm";
import { TaskCard } from "@/components/ui/TaskCard";
import { env } from "@/lib/env";

export const metadata = {
  title: "Sign up · StarUp",
};

export default function SignupPage() {
  const demoMode = !env.hasResend() && process.env.AUTH_DEV_BACKDOOR === "true";

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-md px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-5 w-auto" /></span>
          </Link>
          <Link href="/" className="text-[13px] text-slate hover:text-ink">
            Back
          </Link>
        </header>

        <TaskCard tone="ice" className="mt-16 p-8">
          <h1 className="text-[28px] font-semibold leading-[1.2] tracking-heading-sm text-ink">
            Get your daily briefing.
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-slate">
            {demoMode
              ? "Demo mode — type any email and you'll be signed in directly."
              : "Enter your email. We'll send a magic link. No password."}
          </p>
          <div className="mt-8">
            <SignupForm demoMode={demoMode} />
          </div>
          <p className="mt-6 text-[12px] text-whisper-gray">
            By signing up, you agree to be lovely.
          </p>
        </TaskCard>
      </div>
    </main>
  );
}
