import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { TaskCard } from "@/components/ui/TaskCard";
import { PillLink } from "@/components/ui/Pill";
import { loadProfile } from "@/lib/db/discovery";
import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export const metadata = { title: "Profile ready · StarUp" };
export const dynamic = "force-dynamic";

function pretty(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 2);
}

export default async function OnboardingDonePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, session.user.tenantId))
    .limit(1);
  const profile = await loadProfile(session.user.tenantId);

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-2"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-5 w-auto" /></span>
          </Link>
        </header>

        <TaskCard tone="mint" className="mt-12 p-8 md:p-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-canvas-ice px-3 py-1 text-[12px] text-outline-blue">
            Discovery complete
          </span>
          <h1 className="mt-4 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            {tenant?.name} — operations spec
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-ink/80">
            Here's what StarUp learned. You can edit any of this later from the dashboard.
          </p>

          <section className="mt-8 space-y-5">
            <Block title="Business" body={`${tenant?.name} · ${tenant?.domain} · ${tenant?.location ?? "—"}`} />
            <Block title="Current state" body={pretty(profile?.currentState)} />
            <Block title="Goals" body={pretty(profile?.goals)} />
            <Block title="Entity vocabulary" body={pretty(profile?.entities)} />
            <Block title="Key workflows" body={pretty(profile?.keyWorkflows)} />
            <Block title="Proposed flow" body={pretty(profile?.proposedFlow)} />
            <Block title="MVP scope" body={pretty(profile?.mvpScope)} />
            <Block title="Risks" body={pretty(profile?.risks)} />
          </section>

          <div className="mt-10">
            <PillLink href="/dashboard" size="lg">
              Open the dashboard
            </PillLink>
          </div>
        </TaskCard>
      </div>
    </main>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[16px] bg-canvas-ice p-4">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <pre className="mt-2 whitespace-pre-wrap text-[13px] leading-[1.55] text-ink/80">{body}</pre>
    </div>
  );
}
