import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { TaskCard } from "@/components/ui/TaskCard";
import { LogoMark } from "@/components/ui/Logo";
import { vocabFor, cap } from "@/lib/vocab";
import { parseBriefing } from "@/lib/briefing-parse";
import { ActionCard } from "./ActionCard";

export const metadata = { title: "Today · StarUp" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");
  const tenantId = session.user.tenantId;

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  const [latestBriefing] = await db
    .select()
    .from(schema.briefings)
    .where(eq(schema.briefings.tenantId, tenantId))
    .orderBy(desc(schema.briefings.forDate))
    .limit(1);
  const vocab = await vocabFor(tenantId);

  const sections = latestBriefing ? parseBriefing(latestBriefing.bodyMarkdown) : null;

  const ownerName = session.user.fullName ?? "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-7 md:px-6 md:pt-8">
        {/* ─── Header ─────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5">
            <span className="text-[19px] font-semibold tracking-tight text-ink">StarUp</span>
            <LogoMark className="h-4 w-auto" />
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-[13px] text-slate hover:text-ink"
            title={tenant?.name ?? ""}
          >
            {tenant?.name ?? "Studio"}
          </Link>
        </header>

        {/* ─── Greeting + date ────────────────────────────────── */}
        <div className="mt-7">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-heading-sm text-ink sm:text-[32px]">
            {sections?.greeting ?? `Good morning, ${ownerName}.`}
          </h1>
          <p className="mt-1 text-[14px] text-slate">{today}</p>
        </div>

        {!latestBriefing && <NoBriefingYet />}

        {sections && (
          <div className="mt-7 space-y-4">
            <TodayCard
              bullets={sections.today.bullets}
              heading={sections.today.heading}
              eventsLabel={vocab.events}
            />
            <MoneyCard bullets={sections.money.bullets} />
            {sections.people.bullets.length > 0 && (
              <PeopleCard bullets={sections.people.bullets} peopleLabel={vocab.people} />
            )}
            {sections.actions.length > 0 && (
              <section>
                <p className="mb-3 ml-1 text-[11px] uppercase tracking-[1.8px] text-slate">
                  What to do today
                </p>
                <div className="space-y-3">
                  {sections.actions.map((a, i) => (
                    <ActionCard key={i} index={i} text={a} />
                  ))}
                </div>
              </section>
            )}
            {sections.headsUp.length > 0 && (
              <TaskCard tone="yellow" className="p-6">
                <p className="text-[11px] uppercase tracking-[1.5px] text-ink/65">Heads up</p>
                <ul className="mt-2 space-y-1.5 text-[15px] leading-[1.5] text-ink">
                  {sections.headsUp.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </TaskCard>
            )}
          </div>
        )}

        {/* ─── Quick links ────────────────────────────────────── */}
        <section className="mt-10">
          <p className="mb-3 ml-1 text-[11px] uppercase tracking-[1.8px] text-slate">
            Manage {tenant?.name ? `${tenant.name}` : "your studio"}
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <QuickLink
              href="/dashboard/learn"
              tone="mint"
              label="Tell StarUp"
              hint={`What happened with your ${vocab.people}`}
            />
            <QuickLink
              href="/dashboard/data"
              tone="pink"
              label={cap(vocab.people)}
              hint={`Your ${vocab.events} and payments too`}
            />
            <QuickLink
              href="/dashboard/sources/upload"
              tone="sky"
              label="Add list"
              hint={`Paste or upload ${vocab.people}`}
            />
            <QuickLink
              href="/dashboard/telegram"
              tone="violet"
              label="Telegram"
              hint="Briefings to your phone"
            />
          </div>
        </section>

        <p className="mt-10 text-center text-[12px] text-slate">
          <Link href="/dashboard/briefings" className="hover:text-ink">
            All briefings
          </Link>
          {" · "}
          <Link href="/dashboard/profile" className="hover:text-ink">
            Profile
          </Link>
          {" · "}
          <Link href="/dashboard/settings" className="hover:text-ink">
            Settings
          </Link>
        </p>
      </div>
    </main>
  );
}

// ─── Section cards ───────────────────────────────────────────

function TodayCard({
  bullets,
  heading,
  eventsLabel,
}: {
  bullets: string[];
  heading: string | null;
  eventsLabel: string;
}) {
  return (
    <TaskCard tone="sky" className="p-6 md:p-7">
      <p className="text-[11px] uppercase tracking-[1.5px] text-ink/65">
        Today {heading ? `· ${heading}` : `· ${eventsLabel}`}
      </p>
      {bullets.length === 0 ? (
        <p className="mt-3 text-[15px] text-ink/80">No {eventsLabel} today.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-[1.5] text-ink">
              <span className="text-outline-blue">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </TaskCard>
  );
}

function MoneyCard({ bullets }: { bullets: string[] }) {
  if (bullets.length === 0) return null;
  return (
    <TaskCard tone="pink" className="p-6 md:p-7">
      <p className="text-[11px] uppercase tracking-[1.5px] text-ink/65">Money</p>
      <ul className="mt-3 space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-[1.5] text-ink">
            <span className="text-accent-orange">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </TaskCard>
  );
}

function PeopleCard({ bullets, peopleLabel }: { bullets: string[]; peopleLabel: string }) {
  return (
    <TaskCard tone="yellow" className="p-6 md:p-7">
      <p className="text-[11px] uppercase tracking-[1.5px] text-ink/65">{cap(peopleLabel)}</p>
      <ul className="mt-3 space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-[1.5] text-ink">
            <span className="text-accent-orange">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </TaskCard>
  );
}

function NoBriefingYet() {
  return (
    <TaskCard tone="ice" className="mt-7 p-6">
      <p className="text-[15px] text-ink">
        No briefing yet. Generate today&apos;s from the{" "}
        <Link href="/dashboard/briefings" className="text-outline-blue underline underline-offset-2">
          briefings page
        </Link>{" "}
        — StarUp will write it in about ten seconds.
      </p>
    </TaskCard>
  );
}

function QuickLink({
  href,
  tone,
  label,
  hint,
}: {
  href: string;
  tone: "pink" | "violet" | "yellow" | "mint" | "sky";
  label: string;
  hint: string;
}) {
  return (
    <Link href={href} className="block">
      <TaskCard
        tone={tone}
        className="h-full p-4 transition-transform hover:-translate-y-0.5 md:p-5"
      >
        <p className="text-[15px] font-semibold text-ink">{label}</p>
        <p className="mt-1 text-[12px] text-ink/70">{hint}</p>
      </TaskCard>
    </Link>
  );
}
