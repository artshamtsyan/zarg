import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { desc, eq } from "drizzle-orm";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
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
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white">
            Zarg
          </Link>
          <Link href="/dashboard" className="font-dm-sans text-[14px] tracking-[0.35px] text-ash-text hover:text-ghost-white">
            Dashboard
          </Link>
        </header>

        <div className="mt-8">
          <p className="font-dm-sans text-[14px] uppercase tracking-[2px] text-ash-text">Daily briefings</p>
          <h1 className="font-geist mt-2 text-[32px] leading-[1.14] text-canvas-white">
            What lands on Telegram every morning.
          </h1>
        </div>

        <SpotlightCard className="mt-8">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-dm-sans text-[13px] uppercase tracking-[1.5px] text-ash-text">
                {today ? "Latest briefing" : "Preview"}
              </p>
              <h2 className="font-geist mt-1 text-[22px] tracking-tight text-canvas-white">
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
            <p className="mt-4 font-dm-sans text-[15px] tracking-[0.35px] text-ghost-white">
              No briefing yet. Tap <em>Generate now</em> to produce one and we'll persist it for today.
            </p>
          )}
        </SpotlightCard>

        <section className="mt-12">
          <h2 className="font-geist text-[20px] tracking-tight text-canvas-white">Earlier briefings</h2>
          {earlier.length === 0 ? (
            <p className="mt-3 font-dm-sans text-[14px] tracking-[0.35px] text-slate-text">
              No earlier briefings yet — they'll appear here once Zarg sends one each day.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {earlier.map((b) => (
                <details key={b.id} className="group">
                  <summary className="cursor-pointer list-none">
                    <GhostCard className="px-4 py-3 transition-colors group-hover:bg-[rgba(229,229,229,0.06)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-geist text-[16px] text-canvas-white">{b.forDate}</p>
                          <p className="font-dm-sans text-[12px] tracking-[0.35px] text-slate-text">
                            {b.status === "sent" ? "Sent" : b.status === "queued" ? "Generated" : b.status}
                          </p>
                        </div>
                        <span className="font-dm-sans text-[14px] tracking-[0.35px] text-ash-text group-open:hidden">
                          Expand
                        </span>
                        <span className="font-dm-sans hidden text-[14px] tracking-[0.35px] text-ash-text group-open:inline">
                          Collapse
                        </span>
                      </div>
                    </GhostCard>
                  </summary>
                  <div className="mt-2 rounded-[24px] border border-[rgba(229,229,229,0.06)] bg-[rgba(212,212,212,0.04)] p-5">
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
