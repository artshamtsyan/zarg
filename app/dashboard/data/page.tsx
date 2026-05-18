import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { and, desc, eq } from "drizzle-orm";
import { GhostCard } from "@/components/ui/GhostCard";

export const metadata = { title: "Demo data · StarUp" };
export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toLocaleString("en-US")} ${currency}`;
}

export default async function DataPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");
  const tenantId = session.user.tenantId;

  const db = getDb();
  const [people, events, bookings, payments, pkgs] = await Promise.all([
    db.select().from(schema.people).where(eq(schema.people.tenantId, tenantId)).limit(50),
    db
      .select()
      .from(schema.events)
      .where(eq(schema.events.tenantId, tenantId))
      .orderBy(desc(schema.events.startsAt))
      .limit(40),
    db.select().from(schema.bookings).where(eq(schema.bookings.tenantId, tenantId)).limit(40),
    db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.tenantId, tenantId))
      .orderBy(desc(schema.payments.paidAt))
      .limit(40),
    db
      .select()
      .from(schema.packages)
      .where(and(eq(schema.packages.tenantId, tenantId), eq(schema.packages.status, "active")))
      .limit(40),
  ]);

  const empty = people.length + events.length === 0;

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <LogoMark className="h-5 w-5 text-outline-blue" />
            <span className="inline-flex items-center gap-2"><LogoMark className="h-5 w-5 text-outline-blue" /><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span></span>
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            Dashboard
          </Link>
        </header>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-whisper-gray bg-canvas-ice px-3 py-1 text-[11px] uppercase tracking-[1.5px] text-slate">
            <span className="h-1.5 w-1.5 rounded-full bg-whisper-gray" />
            synthetic — head-start baseline
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-blue bg-ghost-blue px-3 py-1 text-[11px] uppercase tracking-[1.5px] text-outline-blue">
            <span className="h-1.5 w-1.5 rounded-full bg-outline-blue" />
            you taught StarUp
          </span>
        </div>

        <h1 className="mt-5 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
          Operational dataset
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-[1.5] text-slate">
          A synthetic 4-week baseline gives your dashboard a head start. Every row you teach StarUp
          on <Link href="/dashboard/learn" className="text-outline-blue underline underline-offset-2">/dashboard/learn</Link> lands here in real time and gradually replaces the
          synthetic noise.
        </p>

        {empty && (
          <GhostCard className="mt-8 p-5">
            <p className="text-[15px] text-ink">
              No data yet. Finish discovery first — StarUp seeds your dataset when you click{" "}
              <em>Looks good — let&apos;s go</em>.
            </p>
          </GhostCard>
        )}

        <Section title={`People (${people.length})`}>
          <Table
            cols={["Name", "Status", "Segment", "Joined", "Source"]}
            rows={people.slice(0, 16).map((p) => [
              p.name,
              p.status,
              p.segment ?? "—",
              formatDate(p.joinedAt),
              renderSource(p.source),
            ])}
          />
        </Section>

        <Section title={`Events (${events.length})`}>
          <Table
            cols={["Starts", "Staff", "Type", "Status", "Source"]}
            rows={events.slice(0, 16).map((e) => [
              formatDate(e.startsAt),
              e.staffName ?? "—",
              e.type ?? "—",
              e.status,
              renderSource(e.source),
            ])}
          />
        </Section>

        <Section title={`Bookings (${bookings.length})`}>
          <Table
            cols={["Booking ID", "Status", "Attendance", "Booked at", "Source"]}
            rows={bookings.slice(0, 16).map((b) => [
              b.id.slice(0, 8),
              b.status,
              b.attendance ?? "—",
              formatDate(b.bookedAt),
              renderSource(b.source),
            ])}
          />
        </Section>

        <Section title={`Payments (${payments.length})`}>
          <Table
            cols={["Amount", "Method", "Status", "Kind", "Paid at", "Source"]}
            rows={payments.slice(0, 16).map((p) => [
              money(p.amountMinor, p.currency),
              p.method,
              p.status,
              p.kind,
              formatDate(p.paidAt),
              renderSource(p.source),
            ])}
          />
        </Section>

        <Section title={`Active packages (${pkgs.length})`}>
          <Table
            cols={["Kind", "Total", "Remaining", "Expires"]}
            rows={pkgs.slice(0, 12).map((p) => [
              p.kind,
              String(p.visitsTotal),
              String(p.visitsRemaining),
              formatDate(p.expiresAt),
            ])}
          />
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function renderSource(source: string): string {
  // Returned as a plain string for the Table; the component below
  // converts the "synthetic"/"owner_logged" strings into pills.
  return source;
}

function SourcePill({ source }: { source: string }) {
  if (source === "owner_logged") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-outline-blue bg-ghost-blue px-2 py-0.5 text-[10px] uppercase tracking-[0.8px] text-outline-blue">
        you
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-whisper-gray bg-canvas-ice px-2 py-0.5 text-[10px] uppercase tracking-[0.8px] text-slate">
      synthetic
    </span>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="text-[13px] text-slate">No rows.</p>;
  }
  return (
    <div className="overflow-hidden rounded-[24px] border border-whisper-gray/40 bg-canvas-ice">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-whisper-gray/40">
            {cols.map((c) => (
              <th
                key={c}
                className="px-4 py-3 text-[11px] uppercase tracking-[1.2px] text-slate"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-whisper-gray/20 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-[13px] text-ink/85">
                  {cols[j] === "Source" ? <SourcePill source={cell} /> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
