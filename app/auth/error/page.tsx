import Link from "next/link";
import { TaskCard } from "@/components/ui/TaskCard";
import { PillLink } from "@/components/ui/Pill";

export const metadata = { title: "Sign-in error · Zarg" };

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

const messages: Record<string, string> = {
  Configuration: "Auth isn't fully configured on the server yet. Try again in a moment.",
  AccessDenied: "That sign-in link can't be used. Try requesting a new one.",
  Verification: "That sign-in link has expired or already been used. Request a new one.",
  Default: "Something went wrong signing in.",
};

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const { error } = await searchParams;
  const message = (error && messages[error]) || messages.Default;
  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-md px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-tight text-ink">
            Zarg
          </Link>
        </header>

        <TaskCard tone="yellow" className="mt-16 p-8">
          <h1 className="text-[28px] font-semibold leading-[1.2] tracking-heading-sm text-ink">
            Couldn't sign you in.
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-ink/80">{message}</p>
          <div className="mt-8">
            <PillLink href="/signup">Try again</PillLink>
          </div>
        </TaskCard>
      </div>
    </main>
  );
}
