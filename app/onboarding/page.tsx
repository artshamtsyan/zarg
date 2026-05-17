import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { DiscoveryClient } from "./DiscoveryClient";
import { env } from "@/lib/env";

export const metadata = { title: "Discovery · Zarg" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-tight text-ink">
            Zarg
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
