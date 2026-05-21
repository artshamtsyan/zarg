import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { getDb, schema } from "@/lib/db/client";
import { env } from "@/lib/env";
import { TaskCard } from "@/components/ui/TaskCard";
import { GhostCard } from "@/components/ui/GhostCard";
import { TelegramPanel } from "./TelegramPanel";

export const metadata = { title: "Telegram · StarUp" };
export const dynamic = "force-dynamic";

export default async function TelegramPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  const db = getDb();
  const [owner] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1);
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, session.user.tenantId))
    .limit(1);

  const botUsername = env.telegramBotUsername();
  const hasTelegram = env.hasTelegram();

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-5 w-auto" /></span>
          </Link>
          <Link href="/dashboard" className="text-[13px] text-slate hover:text-ink">
            Dashboard
          </Link>
        </header>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Telegram delivery</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            Link your Telegram. Get the briefing.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-slate">
            Connect Telegram once and your daily briefing arrives every morning. You can pause,
            regenerate, or preview from your phone with simple commands.
          </p>
        </div>

        {!hasTelegram ? (
          <TaskCard tone="yellow" className="mt-8 p-7">
            <p className="text-[11px] uppercase tracking-[1.5px] text-ink/60">Server setup needed</p>
            <h2 className="mt-2 text-[20px] font-semibold text-ink">Bot token not configured</h2>
            <p className="mt-3 text-[15px] leading-[1.55] text-ink/80">
              The platform admin needs to add <code className="rounded bg-canvas-ice px-1.5 py-0.5 text-[13px] text-ink">TELEGRAM_BOT_TOKEN</code> and{" "}
              <code className="rounded bg-canvas-ice px-1.5 py-0.5 text-[13px] text-ink">TELEGRAM_WEBHOOK_SECRET</code> environment variables and register the
              webhook. Once that's done, this page will show your linking code.
            </p>
          </TaskCard>
        ) : (
          <TelegramPanel
            initialState={{
              linked: Boolean(owner?.telegramChatId),
              telegramChatId: owner?.telegramChatId ?? null,
              code: owner?.telegramLinkCode ?? null,
              codeExpiresAt: owner?.telegramLinkExpiresAt?.toISOString() ?? null,
              botUsername,
              tenantStatus: tenant?.status ?? "active",
              briefingLocalTime: tenant?.briefingLocalTime ?? "08:00",
              timezone: tenant?.timezone ?? "Asia/Yerevan",
            }}
          />
        )}

        <GhostCard className="mt-8 p-6">
          <p className="text-[11px] uppercase tracking-[1.5px] text-slate">What you can do in Telegram</p>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-[1.55] text-ink/85">
            <li>• <code className="rounded bg-canvas-ice px-1.5 py-0.5 text-[13px] text-ink">/preview</code> — generate today's briefing now</li>
            <li>• <code className="rounded bg-canvas-ice px-1.5 py-0.5 text-[13px] text-ink">/pause</code> — stop daily briefings</li>
            <li>• <code className="rounded bg-canvas-ice px-1.5 py-0.5 text-[13px] text-ink">/resume</code> — turn them back on</li>
            <li>• Tap inline buttons on any briefing to <strong>Regenerate</strong>, <strong>Pause</strong>, or <strong>Open dashboard</strong></li>
          </ul>
        </GhostCard>
      </div>
    </main>
  );
}
