import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export const metadata = { title: "Discovery · Zarg" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  return (
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
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
            Phase 2 · Coming next
          </p>
          <h1 className="font-geist mt-3 text-[32px] leading-[1.14] text-canvas-white">
            The discovery conversation lands here.
          </h1>
          <p className="font-dm-sans mt-4 text-[16px] leading-[1.55] tracking-[0.4px] text-ghost-white">
            On this screen you'll have a ~10-turn chat with an agent following the Telegram
            Automation Discovery skill. On the right, your business profile will fill in field by
            field as the agent learns about your studio. When discovery finishes, your tenant flips
            to active and we seed a 4-week operational dataset to make the dashboard immediately
            useful.
          </p>
          <p className="font-dm-sans mt-6 text-[14px] tracking-[0.35px] text-slate-text">
            Tenant id: {session.user.tenantId}
          </p>
        </SpotlightCard>
      </div>
    </main>
  );
}
