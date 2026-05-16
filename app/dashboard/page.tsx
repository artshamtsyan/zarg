import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export const metadata = { title: "Dashboard · Zarg" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  return (
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white"
          >
            Zarg
          </Link>
          <span className="font-dm-sans text-[14px] tracking-[0.35px] text-slate-text">
            {session.user.email}
          </span>
        </header>

        <SpotlightCard className="mt-16">
          <p className="font-dm-sans text-[14px] uppercase tracking-[2px] text-ash-text">
            Phase 4–6 · Coming soon
          </p>
          <h1 className="font-geist mt-3 text-[32px] leading-[1.14] text-canvas-white">
            Your dashboard lives here.
          </h1>
          <p className="font-dm-sans mt-4 text-[16px] leading-[1.55] tracking-[0.4px] text-ghost-white">
            Once briefings ship, this screen will preview tomorrow's Telegram message at the top,
            with quick cards for Telegram linking, profile, and your seeded data view. Bottom-bar
            navigation will appear when the dashboard shell lands.
          </p>
        </SpotlightCard>
      </div>
    </main>
  );
}
