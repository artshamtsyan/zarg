import Link from "next/link";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
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
            Couldn't sign you in.
          </h1>
          <p className="font-dm-sans mt-3 text-[16px] leading-[1.55] tracking-[0.4px] text-ghost-white">
            {message}
          </p>
          <div className="mt-8">
            <PillLink href="/signup">Try again</PillLink>
          </div>
        </SpotlightCard>
      </div>
    </main>
  );
}
