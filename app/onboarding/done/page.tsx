import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { PillLink } from "@/components/ui/Pill";
import { loadProfile } from "@/lib/db/discovery";
import { getDb, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

export const metadata = { title: "Profile ready · Zarg" };
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
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white"
          >
            Zarg
          </Link>
        </header>

        <SpotlightCard className="mt-12">
          <p className="font-dm-sans text-[14px] uppercase tracking-[2px] text-ash-text">
            Discovery complete
          </p>
          <h1 className="font-geist mt-3 text-[32px] leading-[1.14] text-canvas-white">
            {tenant?.name} — operations spec
          </h1>
          <p className="font-dm-sans mt-3 text-[15px] leading-[1.55] tracking-[0.35px] text-ghost-white">
            Here's what Zarg learned. You can edit any of this later from the dashboard.
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
        </SpotlightCard>
      </div>
    </main>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-geist text-[16px] tracking-tight text-canvas-white">{title}</h2>
      <pre className="mt-2 whitespace-pre-wrap font-dm-sans text-[14px] leading-[1.55] tracking-[0.35px] text-ghost-white">
        {body}
      </pre>
    </div>
  );
}
