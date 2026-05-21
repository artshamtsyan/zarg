import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { TaskCard } from "@/components/ui/TaskCard";
import { GhostCard } from "@/components/ui/GhostCard";
import { PillLink } from "@/components/ui/Pill";
import { LogoMark } from "@/components/ui/Logo";

export const metadata = { title: "Sources · StarUp" };
export const dynamic = "force-dynamic";

interface IntegrationConfig {
  filename?: string;
  rowCount?: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  importedAt?: string;
  url?: string;
}

function fmt(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SourcesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  const db = getDb();
  const integrations = await db
    .select()
    .from(schema.tenantIntegrations)
    .where(eq(schema.tenantIntegrations.tenantId, session.user.tenantId))
    .orderBy(desc(schema.tenantIntegrations.createdAt));

  const csvUploads = integrations.filter((i) => i.kind === "csv_upload");
  const icalSources = integrations.filter((i) => i.kind === "ical");

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5">
            <span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span>
            <LogoMark className="h-5 w-auto" />
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            Dashboard
          </Link>
        </header>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Data sources</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            Where your real data comes from.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-slate">
            Connect your customer list and your calendar. StarUp will replace synthetic baseline
            rows with real ones, and the daily briefing will start talking about your actual people.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          <TaskCard tone="sky" className="p-7">
            <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Customer list</p>
            <h2 className="mt-2 text-[20px] font-semibold text-ink">Upload a CSV</h2>
            <p className="mt-3 text-[14px] leading-[1.55] text-ink/80">
              Export your customers from Excel, Google Sheets, or any CRM as CSV.
              StarUp maps columns, dedups by name, and writes them in as real people.
            </p>
            <div className="mt-5">
              <PillLink href="/dashboard/sources/upload">Upload customers</PillLink>
            </div>
          </TaskCard>

          <TaskCard tone="violet" className="p-7">
            <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Schedule</p>
            <h2 className="mt-2 text-[20px] font-semibold text-ink">iCal calendar feed</h2>
            <p className="mt-3 text-[14px] leading-[1.55] text-ink/80">
              Paste a public iCal URL (Google Calendar, Apple Calendar, etc.). StarUp polls hourly
              and writes events into your schedule.
            </p>
            <p className="mt-4 text-[12px] uppercase tracking-[1px] text-ink/60">Coming this week</p>
          </TaskCard>
        </div>

        <section className="mt-12">
          <h2 className="text-[18px] font-semibold text-ink">Imports so far ({csvUploads.length})</h2>
          {csvUploads.length === 0 ? (
            <GhostCard className="mt-3 p-5">
              <p className="text-[14px] text-slate">
                No customer lists imported yet. Upload your first CSV above.
              </p>
            </GhostCard>
          ) : (
            <div className="mt-4 space-y-3">
              {csvUploads.map((u) => {
                const c = (u.config as IntegrationConfig) ?? {};
                return (
                  <GhostCard key={u.id} className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-ink">{c.filename ?? "customers.csv"}</p>
                        <p className="text-[12px] text-slate">{fmt(u.lastSyncAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="rounded-full bg-task-card-mint px-2 py-0.5 text-ink">
                          {c.inserted ?? 0} new
                        </span>
                        <span className="rounded-full bg-ghost-blue px-2 py-0.5 text-outline-blue">
                          {c.updated ?? 0} updated
                        </span>
                        {c.skipped !== undefined && c.skipped > 0 && (
                          <span className="rounded-full bg-task-card-yellow px-2 py-0.5 text-ink">
                            {c.skipped} skipped
                          </span>
                        )}
                      </div>
                    </div>
                  </GhostCard>
                );
              })}
            </div>
          )}
        </section>

        {icalSources.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[18px] font-semibold text-ink">iCal feeds ({icalSources.length})</h2>
            <div className="mt-4 space-y-3">
              {icalSources.map((s) => {
                const c = (s.config as IntegrationConfig) ?? {};
                return (
                  <GhostCard key={s.id} className="p-4">
                    <p className="text-[15px] font-semibold text-ink truncate">{c.url}</p>
                    <p className="text-[12px] text-slate">Last sync {fmt(s.lastSyncAt)}</p>
                  </GhostCard>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
