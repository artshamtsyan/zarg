import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { TaskCard } from "@/components/ui/TaskCard";
import { readProfilePlainText } from "@/lib/profile-text";
import { vocabFor } from "@/lib/vocab";
import { ProfileEditor, type ProfileSlotProps } from "./ProfileEditor";

export const metadata = { title: "About your business · StarUp" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, session.user.tenantId))
    .limit(1);
  const [profile] = await db
    .select()
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.tenantId, session.user.tenantId))
    .limit(1);
  const vocab = await vocabFor(session.user.tenantId);

  const slots: ProfileSlotProps[] = [
    {
      slot: "business_summary",
      label: "What your business does",
      tone: "violet",
      description: "Short paragraph — the daily briefing reads this to set context.",
      placeholder:
        "We're a yoga studio in Avan with 20+ regulars, 7 classes a week across 3 instructors, drop-in or 8-class subscription.",
      multi: true,
      initial: readProfilePlainText("business_summary", profile ?? null),
    },
    {
      slot: "goals",
      label: "Your goals",
      tone: "pink",
      description: "What you want StarUp to optimize for. One goal per line.",
      placeholder:
        "Convert trial visitors into subscribers\nKeep my 20+ regulars showing up\nReduce no-shows",
      multi: true,
      initial: readProfilePlainText("goals", profile ?? null),
    },
    {
      slot: "people_label",
      label: `What you call your ${vocab.people}`,
      tone: "mint",
      description: "Singular or plural — StarUp uses your word in the briefing.",
      placeholder: vocab.people,
      multi: false,
      initial: readProfilePlainText("people_label", profile ?? null) || vocab.people,
    },
    {
      slot: "events_label",
      label: `What you call your ${vocab.events}`,
      tone: "mint",
      description: "Classes, appointments, sessions — whatever you say.",
      placeholder: vocab.events,
      multi: false,
      initial: readProfilePlainText("events_label", profile ?? null) || vocab.events,
    },
    {
      slot: "kpis",
      label: "Numbers you care about",
      tone: "yellow",
      description: "Whatever you track — attendance, retention, renewals. One per line.",
      placeholder: "Class fill rate\nMonthly subscription renewals\nNo-show rate",
      multi: true,
      initial: readProfilePlainText("kpis", profile ?? null),
    },
    {
      slot: "workflows",
      label: "How you run things today",
      tone: "sky",
      description: "Brief notes on your manual processes. One workflow per line.",
      placeholder:
        "Student messages me on Telegram to book\nI manually note their 8-class subscription balance\nI remind everyone before class",
      multi: true,
      initial: readProfilePlainText("workflows", profile ?? null),
    },
    {
      slot: "risks",
      label: "What could go wrong",
      tone: "yellow",
      description: "Anything to watch out for. StarUp flags these in the briefing.",
      placeholder: "No-show rate creeping up\nSubscription churn after April vacation",
      multi: true,
      initial: readProfilePlainText("risks", profile ?? null),
    },
  ];

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-7 md:px-6 md:pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-[19px] font-semibold tracking-tight text-ink">StarUp</span>
            <LogoMark className="h-4 w-auto" />
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            ← Dashboard
          </Link>
        </header>

        <div className="mt-7">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">About your business</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.15] tracking-heading-sm text-ink sm:text-[32px]">
            What StarUp knows about you.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-slate">
            Edit any of this in plain language. Tomorrow&apos;s briefing picks up your changes.
          </p>
        </div>

        <TaskCard tone="ice" className="mt-7 p-6">
          <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Business basics</p>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Name" value={tenant?.name ?? "—"} />
            <Field label="Type" value={tenant?.domain ?? "—"} />
            <Field label="Location" value={tenant?.location ?? "—"} />
          </dl>
          <p className="mt-4 text-[12px] text-slate">
            Edit these on{" "}
            <Link href="/dashboard/settings" className="text-outline-blue underline underline-offset-2">
              Settings
            </Link>
            .
          </p>
        </TaskCard>

        <ProfileEditor slots={slots} />
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[1.2px] text-slate">{label}</dt>
      <dd className="mt-1 text-[15px] text-ink">{value}</dd>
    </div>
  );
}
