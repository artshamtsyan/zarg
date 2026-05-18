import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { TaskCard } from "@/components/ui/TaskCard";
import { GhostCard } from "@/components/ui/GhostCard";
import { ProfileEditor } from "./ProfileEditor";

export const metadata = { title: "Business profile · StarUp" };
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

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-[20px] font-semibold tracking-tight text-ink">
            StarUp
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            Dashboard
          </Link>
        </header>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Business profile</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            What StarUp knows about you.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-slate">
            Everything captured during discovery — edit any field, save, and the next briefing
            picks up the changes.
          </p>
        </div>

        <TaskCard tone="ice" className="mt-8 p-6">
          <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Business basics</p>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Name" value={tenant?.name ?? "—"} />
            <Field label="Domain" value={tenant?.domain ?? "—"} />
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

        <ProfileEditor
          initial={{
            currentState: profile?.currentState ?? null,
            goals: profile?.goals ?? null,
            kpis: profile?.kpis ?? null,
            entities: profile?.entities ?? null,
            keyWorkflows: profile?.keyWorkflows ?? null,
            proposedFlow: profile?.proposedFlow ?? null,
            mvpScope: profile?.mvpScope ?? null,
            risks: profile?.risks ?? null,
          }}
        />

        <GhostCard className="mt-8 p-5">
          <p className="text-[12px] text-slate">
            These are jsonb fields — edits expect valid JSON. Save errors will tell you what's wrong.
          </p>
        </GhostCard>
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
