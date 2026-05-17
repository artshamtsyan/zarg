import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function devEnabled(): boolean {
  // Evaluated per-request so toggling AUTH_DEV_BACKDOOR via Vercel env doesn't
  // require a code change — only a redeploy to pick up the env var.
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_DEV_BACKDOOR === "true"
  );
}

// GET /api/dev/sign-in?email=...&name=...&business=...
// Creates the user/tenant/profile if missing, creates a session, sets the cookie,
// then redirects to /onboarding (or /welcome / /dashboard depending on state).
export async function GET(req: Request) {
  if (!devEnabled()) {
    return new Response(
      "Dev sign-in disabled in production. Set AUTH_DEV_BACKDOOR=true and redeploy.",
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "demo@zarg.test").toLowerCase();
  const name = url.searchParams.get("name") ?? "Demo Owner";
  const business = url.searchParams.get("business") ?? "Demo Studio";
  const skipWelcome = url.searchParams.get("skipWelcome") === "1";
  const attachTenantId = url.searchParams.get("tenantId");

  const db = getDb();

  // Find or create user
  let [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    const id = crypto.randomUUID();
    await db.insert(schema.users).values({
      id,
      email,
      name,
      fullName: name,
      emailVerified: new Date(),
    });
    [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  }

  // Optionally attach to an existing tenant
  if (attachTenantId && !user.tenantId) {
    await db
      .update(schema.users)
      .set({ tenantId: attachTenantId, fullName: name, name })
      .where(eq(schema.users.id, user.id));
    user.tenantId = attachTenantId;
  }

  // Optionally create tenant
  if (skipWelcome && !user.tenantId) {
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: business,
        status: "onboarding",
      })
      .returning({ id: schema.tenants.id });
    await db
      .insert(schema.businessProfiles)
      .values({ tenantId: tenant.id })
      .onConflictDoNothing();
    await db
      .update(schema.users)
      .set({ tenantId: tenant.id, fullName: name, name })
      .where(eq(schema.users.id, user.id));
    user.tenantId = tenant.id;
  }

  // Issue session
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(schema.sessions).values({
    sessionToken: token,
    userId: user.id,
    expires,
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: "authjs.session-token",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  const dest = !user.tenantId ? "/welcome" : "/onboarding";
  return Response.redirect(new URL(dest, url.origin), 302);
}
