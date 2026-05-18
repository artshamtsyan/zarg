import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { and, eq, gte } from "drizzle-orm";
import { TaskCard } from "@/components/ui/TaskCard";
import { GhostCard } from "@/components/ui/GhostCard";
import { LearnChat } from "./LearnChat";

export const metadata = { title: "Teach StarUp · StarUp" };
export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");
  const tenantId = session.user.tenantId;

  const db = getDb();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [ownerLoggedPeople, ownerLoggedBookings, ownerLoggedPayments] = await Promise.all([
    db.$count(schema.people, and(eq(schema.people.tenantId, tenantId), eq(schema.people.source, "owner_logged"))),
    db.$count(schema.bookings, and(eq(schema.bookings.tenantId, tenantId), eq(schema.bookings.source, "owner_logged"), gte(schema.bookings.bookedAt, since))),
    db.$count(schema.payments, and(eq(schema.payments.tenantId, tenantId), eq(schema.payments.source, "owner_logged"), gte(schema.payments.paidAt, since))),
  ]);

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <LogoMark className="h-5 w-5 text-outline-blue" />
            <span className="inline-flex items-center gap-2"><LogoMark className="h-5 w-5 text-outline-blue" /><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span></span>
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            Dashboard
          </Link>
        </header>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Self-learning</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            Tell StarUp what happened.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-slate">
            Type what's going on in your studio in plain language. StarUp will record real people,
            classes, bookings, and payments — and the next briefing will be grounded in this real
            data instead of the synthetic baseline.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          <LearnChat />

          <aside className="space-y-4">
            <TaskCard tone="mint" className="p-5">
              <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">What StarUp already knows from you</p>
              <ul className="mt-4 space-y-2 text-[15px] text-ink">
                <li className="flex items-center justify-between">
                  <span>Clients added</span>
                  <span className="font-semibold">{ownerLoggedPeople}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Bookings (7d)</span>
                  <span className="font-semibold">{ownerLoggedBookings}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Payments (7d)</span>
                  <span className="font-semibold">{ownerLoggedPayments}</span>
                </li>
              </ul>
            </TaskCard>

            <GhostCard className="p-5">
              <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Examples</p>
              <ul className="mt-3 space-y-1.5 text-[13px] leading-[1.55] text-ink/80">
                <li>"Maria came to today's 7pm class, paid 5,000 cash"</li>
                <li>"Anush bought the 8-class subscription, 28,000 AMD by card"</li>
                <li>"Add a new client Lilit, her number is +374 91 555 111"</li>
                <li>"Tomorrow at 10am Hatha class with Ellada, capacity 12"</li>
                <li>"Diana didn't show up to yesterday's 6pm class"</li>
              </ul>
            </GhostCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
