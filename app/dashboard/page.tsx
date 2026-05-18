import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";
import { TaskCard } from "@/components/ui/TaskCard";
import { PillLink } from "@/components/ui/Pill";
import { BriefingBody } from "@/components/briefing/BriefingBody";

export const metadata = { title: "Dashboard · StarUp" };
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
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <LogoMark className="h-5 w-5 text-outline-blue" />
            <span className="inline-flex items-center gap-2"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-5 w-auto" /></span>
          </Link>
          <span className="text-[12px] text-slate">
            {tenant?.name} · {session.user.email}
          </span>
        </header>

        <TaskCard tone="sky" className="mt-10 p-7 md:p-9">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">
                {latestBriefing ? "Latest briefing" : "Briefing"}
              </p>
              <h1 className="mt-1 text-[26px] font-semibold tracking-heading-sm text-ink">
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
            <p className="mt-4 text-[15px] leading-[1.5] text-ink/80">
              No briefings yet. Open the briefings page and tap <em>Generate now</em> — StarUp will read
              your data and write today's ops summary.
            </p>
          )}
        </TaskCard>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DashboardLink
            href="/dashboard/learn"
            tone="mint"
            label="Self-learning"
            value="Tell StarUp what happened"
            footer="Real bookings, payments, attendance — typed in plain language"
          />
          <DashboardLink
            href="/dashboard/data"
            tone="pink"
            label="Data"
            value={`${counts[0]} people · ${counts[1]} events`}
            footer="Synthetic baseline + everything you've taught StarUp"
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DashboardLink
            href="/dashboard/telegram"
            tone="violet"
            label="Telegram"
            value="Link your bot"
            footer="Daily briefing comes to your phone"
          />
          <DashboardLink
            href="/dashboard/profile"
            tone="yellow"
            label="Business profile"
            value="What StarUp knows"
            footer="Edit anything from discovery"
          />
        </div>
      </div>
    </main>
  );
}

function DashboardLink({
  href,
  tone,
  label,
  value,
  footer,
}: {
  href: string;
  tone: "pink" | "violet" | "yellow" | "mint" | "sky";
  label: string;
  value: string;
  footer: string;
}) {
  return (
    <Link href={href} className="block">
      <TaskCard tone={tone} className="h-full p-6 transition-transform hover:-translate-y-0.5">
        <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">{label}</p>
        <p className="mt-2 text-[18px] font-semibold text-ink">{value}</p>
        <p className="mt-2 text-[13px] text-ink/70">{footer}</p>
      </TaskCard>
    </Link>
  );
}
