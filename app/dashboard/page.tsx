import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { GhostCard } from "@/components/ui/GhostCard";
import { PillLink } from "@/components/ui/Pill";
import { BriefingBody } from "@/components/briefing/BriefingBody";

export const metadata = { title: "Dashboard · Zarg" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");
  const tenantId = session.user.tenantId;

  const db = getDb();
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId)).limit(1);

  const [latestBriefing] = await db
    .select()
    .from(schema.briefings)
    .where(eq(schema.briefings.tenantId, tenantId))
    .orderBy(desc(schema.briefings.forDate))
    .limit(1);

  const counts = await Promise.all([
    db.$count(schema.people, eq(schema.people.tenantId, tenantId)),
    db.$count(schema.events, eq(schema.events.tenantId, tenantId)),
    db.$count(schema.payments, eq(schema.payments.tenantId, tenantId)),
  ]);

  return (
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white">
            Zarg
          </Link>
          <span className="font-dm-sans text-[14px] tracking-[0.35px] text-slate-text">
            {tenant?.name} · {session.user.email}
          </span>
        </header>

        <SpotlightCard className="mt-10">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-dm-sans text-[13px] uppercase tracking-[1.5px] text-ash-text">
                {latestBriefing ? "Latest briefing" : "Briefing"}
              </p>
              <h1 className="font-geist mt-1 text-[26px] tracking-tight text-canvas-white">
                {latestBriefing ? latestBriefing.forDate : "Generate today's briefing"}
              </h1>
            </div>
            <PillLink href="/dashboard/briefings">Open briefings</PillLink>
          </div>
          {latestBriefing ? (
            <div className="mt-5">
              <BriefingBody markdown={latestBriefing.bodyMarkdown} />
            </div>
          ) : (
            <p className="mt-4 font-dm-sans text-[15px] tracking-[0.35px] text-ghost-white">
              No briefings yet. Open the briefings page and tap <em>Generate now</em> — Zarg will read your
              data and write today's ops summary.
            </p>
          )}
        </SpotlightCard>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <DashboardLink
            href="/dashboard/data"
            label="Data"
            value={`${counts[0]} people · ${counts[1]} events`}
            footer="Demo dataset Zarg seeded for you"
          />
          <DashboardLink
            href="/dashboard/telegram"
            label="Telegram"
            value="Link your bot"
            footer="Daily briefing comes to your phone"
          />
          <DashboardLink
            href="/dashboard/profile"
            label="Business profile"
            value="What Zarg knows"
            footer="Edit anything from discovery"
          />
        </div>
      </div>
    </main>
  );
}

function DashboardLink({ href, label, value, footer }: { href: string; label: string; value: string; footer: string }) {
  return (
    <Link href={href} className="block">
      <GhostCard className="h-full p-5 transition-colors hover:bg-[rgba(229,229,229,0.08)]">
        <p className="font-dm-sans text-[12px] uppercase tracking-[1.8px] text-ash-text">{label}</p>
        <p className="font-geist mt-2 text-[18px] tracking-tight text-canvas-white">{value}</p>
        <p className="font-dm-sans mt-2 text-[13px] tracking-[0.35px] text-slate-text">{footer}</p>
      </GhostCard>
    </Link>
  );
}
