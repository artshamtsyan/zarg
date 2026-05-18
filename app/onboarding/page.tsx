import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { DiscoveryClient } from "./DiscoveryClient";
import { env } from "@/lib/env";

export const metadata = { title: "Discovery · StarUp" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <LogoMark className="h-5 w-5 text-outline-blue" />
            <span className="inline-flex items-center gap-2"><LogoMark className="h-5 w-5 text-outline-blue" /><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span></span>
          </Link>
          <span className="text-[12px] text-slate">Discovery · {session.user.email}</span>
        </header>

        <DiscoveryClient
          ownerName={session.user.fullName ?? session.user.name ?? null}
          hasAnthropic={env.hasAnthropic()}
        />
      </div>
    </main>
  );
}
