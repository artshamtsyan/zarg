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
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white"
          >
            Zarg
          </Link>
          <span className="font-dm-sans text-[13px] tracking-[0.35px] text-slate-text">
            Discovery · {session.user.email}
          </span>
        </header>

        <DiscoveryClient
          ownerName={session.user.fullName ?? session.user.name ?? null}
          hasAnthropic={env.hasAnthropic()}
        />
      </div>
    </main>
  );
}
