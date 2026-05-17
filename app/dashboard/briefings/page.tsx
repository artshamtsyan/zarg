import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";
import { TaskCard } from "@/components/ui/TaskCard";
import { GhostCard } from "@/components/ui/GhostCard";
import { BriefingBody } from "@/components/briefing/BriefingBody";
import { PreviewButton } from "./PreviewButton";

export const metadata = { title: "Briefings · Zarg" };
export const dynamic = "force-dynamic";

export default async function BriefingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");
  const tenantId = session.user.tenantId;

  const db = getDb();
  const briefings = await db
    .select()
    .from(schema.briefings)
    .where(eq(schema.briefings.tenantId, tenantId))
    .orderBy(desc(schema.briefings.forDate))
    .limit(30);

  const today = briefings[0] ?? null;
  const earlier = briefings.slice(1);

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-tight text-ink">
            Zarg
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            Dashboard
          </Link>
        </header>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Daily briefings</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            What lands on Telegram every morning.
          </h1>
        </div>

        <TaskCard tone="sky" className="mt-8 p-7 md:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">
                {today ? "Latest briefing" : "Preview"}
              </p>
              <h2 className="mt-1 text-[22px] font-semibold text-ink">
                {today ? today.forDate : "Generate today's briefing"}
              </h2>
            </div>
            <PreviewButton hasExisting={Boolean(today)} />
          </div>

          {today ? (
            <div className="mt-5">
              <BriefingBody markdown={today.bodyMarkdown} />
            </div>
          ) : (
            <p className="mt-4 text-[15px] text-ink/80">
              No briefing yet. Tap <em>Generate now</em> to produce one and we'll persist it for today.
            </p>
          )}
        </TaskCard>

        <section className="mt-12">
          <h2 className="text-[20px] font-semibold text-ink">Earlier briefings</h2>
          {earlier.length === 0 ? (
            <p className="mt-3 text-[13px] text-slate">
              No earlier briefings yet — they'll appear here once Zarg sends one each day.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {earlier.map((b) => (
                <details key={b.id} className="group">
                  <summary className="cursor-pointer list-none">
                    <GhostCard className="p-4 transition-colors group-hover:border-outline-blue">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[16px] font-semibold text-ink">{b.forDate}</p>
                          <p className="text-[12px] text-slate">
                            {b.status === "sent" ? "Sent" : b.status === "queued" ? "Generated" : b.status}
                          </p>
                        </div>
                        <span className="text-[13px] text-slate group-open:hidden">Expand</span>
                        <span className="hidden text-[13px] text-slate group-open:inline">Collapse</span>
                      </div>
                    </GhostCard>
                  </summary>
                  <div className="mt-2 rounded-[24px] border border-whisper-gray/40 bg-canvas-ice p-6">
                    <BriefingBody markdown={b.bodyMarkdown} />
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
