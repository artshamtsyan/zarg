import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { TaskCard } from "@/components/ui/TaskCard";
import { GhostCard } from "@/components/ui/GhostCard";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings · StarUp" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, session.user.tenantId))
    .limit(1);

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-2"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-5 w-auto" /></span>
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            Dashboard
          </Link>
        </header>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Settings</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            How StarUp runs for you.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-slate">
            Business basics, timezone, and when the daily briefing should land.
          </p>
        </div>

        <SettingsForm
          initial={{
            name: tenant?.name ?? "",
            domain: tenant?.domain ?? "other",
            location: tenant?.location ?? "",
            timezone: tenant?.timezone ?? "Asia/Yerevan",
            briefingLocalTime: tenant?.briefingLocalTime ?? "08:00",
            language: tenant?.language ?? "en",
            status: tenant?.status ?? "active",
          }}
        />

        <GhostCard className="mt-6 p-5">
          <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Account</p>
          <p className="mt-2 text-[14px] text-ink">{session.user.email}</p>
        </GhostCard>
      </div>
    </main>
  );
}
