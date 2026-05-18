import { and, eq, gte, sql, sum } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

// Anthropic pricing in USD per million tokens (Nov 2026 sticker; update as
// pricing changes). Costs computed in *cents* (minor units of USD) to keep
// everything in integers.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-7": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 0.8, out: 4 },
  // Generic fallback per model family
  "claude-opus": { in: 15, out: 75 },
  "claude-sonnet": { in: 3, out: 15 },
  "claude-haiku": { in: 0.8, out: 4 },
};

function lookupPricing(model: string) {
  if (PRICING[model]) return PRICING[model];
  for (const key of Object.keys(PRICING)) {
    if (model.includes(key)) return PRICING[key];
  }
  // Conservative default if the model isn't recognized — match Sonnet.
  return PRICING["claude-sonnet"];
}

/** Compute cost in cents from token counts. */
export function costInCents(model: string, tokensIn: number, tokensOut: number): number {
  const p = lookupPricing(model);
  // dollars per million × tokens / 1_000_000 = dollars; × 100 = cents.
  const cents = ((tokensIn * p.in + tokensOut * p.out) * 100) / 1_000_000;
  return Math.ceil(cents);
}

export class BudgetExceededError extends Error {
  constructor(
    public readonly tenantId: string,
    public readonly capCents: number,
    public readonly spentCents: number
  ) {
    super(
      `Tenant ${tenantId} has hit today's LLM budget (${(spentCents / 100).toFixed(2)} USD of ${(capCents / 100).toFixed(2)} cap).`
    );
    this.name = "BudgetExceededError";
  }
}

interface RecordArgs {
  tenantId: string;
  kind: "discovery" | "seed" | "briefing" | "learn";
  model: string;
  tokensIn: number;
  tokensOut: number;
  metadata?: Record<string, unknown>;
}

export async function recordUsage(args: RecordArgs): Promise<{ costCents: number }> {
  const db = getDb();
  const costCents = costInCents(args.model, args.tokensIn, args.tokensOut);
  await db.insert(schema.usageEvents).values({
    tenantId: args.tenantId,
    kind: args.kind,
    model: args.model,
    tokensIn: args.tokensIn,
    tokensOut: args.tokensOut,
    costMinor: costCents,
    currency: "USD",
    metadata: args.metadata ?? null,
  });
  return { costCents };
}

// Default per-tenant daily ceiling in cents (50¢/day = ~$15/mo budget for LLM
// before margin). Overridable via env `LLM_DAILY_CAP_CENTS_PER_TENANT`.
export function dailyCapCents(): number {
  const fromEnv = process.env.LLM_DAILY_CAP_CENTS_PER_TENANT;
  if (fromEnv && /^\d+$/.test(fromEnv)) return parseInt(fromEnv, 10);
  return 50;
}

/** Today's spend in cents for one tenant (UTC midnight to now). */
export async function todaySpendCents(tenantId: string): Promise<number> {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [row] = await db
    .select({ total: sum(schema.usageEvents.costMinor) })
    .from(schema.usageEvents)
    .where(
      and(
        eq(schema.usageEvents.tenantId, tenantId),
        gte(schema.usageEvents.occurredAt, todayStart)
      )
    );
  return Number(row?.total ?? 0);
}

/** Throw BudgetExceededError if today's spend has hit the cap. */
export async function assertWithinBudget(tenantId: string): Promise<void> {
  const cap = dailyCapCents();
  const spent = await todaySpendCents(tenantId);
  if (spent >= cap) {
    throw new BudgetExceededError(tenantId, cap, spent);
  }
}
