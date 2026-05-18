import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { TaskCard } from "@/components/ui/TaskCard";

export const metadata = { title: "Check your email · StarUp" };

export default function VerifyRequestPage() {
  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-md px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <LogoMark className="h-5 w-5 text-outline-blue" />
            <span className="inline-flex items-center gap-2"><LogoMark className="h-5 w-5 text-outline-blue" /><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span></span>
          </Link>
        </header>

        <TaskCard tone="mint" className="mt-16 p-8">
          <h1 className="text-[28px] font-semibold leading-[1.2] tracking-heading-sm text-ink">
            Check your email.
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-ink/80">
            We sent you a sign-in link. Open it on this device to continue.
          </p>
          <p className="mt-6 text-[13px] text-ink/60">
            The link works for 24 hours. If it doesn't arrive in a minute, check spam.
          </p>
        </TaskCard>
      </div>
    </main>
  );
}
