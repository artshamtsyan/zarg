import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { TaskCard } from "@/components/ui/TaskCard";

export const metadata = {
  title: "Sign up · Zarg",
};

export default function SignupPage() {
  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-md px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-tight text-ink">
            Zarg
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
            Enter your email. We'll send a magic link. No password.
          </p>
          <div className="mt-8">
            <SignupForm />
          </div>
          <p className="mt-6 text-[12px] text-whisper-gray">
            By signing up, you agree to be lovely.
          </p>
        </TaskCard>
      </div>
    </main>
  );
}
