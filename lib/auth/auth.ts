import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { env } from "@/lib/env";
import { authConfig } from "./config";
import { sendMagicLinkEmail } from "./email";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string | null;
      fullName: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getDb();
  return {
    ...authConfig,
    adapter: DrizzleAdapter(db, {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      sessionsTable: schema.sessions,
      verificationTokensTable: schema.verificationTokens,
    }),
    session: { strategy: "database" },
    secret: process.env.AUTH_SECRET ?? "dev-secret-please-replace",
    providers: [
      Resend({
        apiKey: process.env.RESEND_API_KEY ?? "",
        from: process.env.RESEND_FROM ?? "onboarding@example.com",
        async sendVerificationRequest({ identifier, url }) {
          if (!env.hasResend()) {
            console.warn(
              `[zarg] Magic link not sent — RESEND_API_KEY missing. Link would be: ${url}`
            );
            return;
          }
          await sendMagicLinkEmail({ to: identifier, url });
        },
      }),
    ],
    callbacks: {
      async session({ session, user }) {
        const row = await db.query.users.findFirst({
          where: eq(schema.users.id, user.id),
          columns: { tenantId: true, fullName: true },
        });
        session.user.id = user.id;
        session.user.tenantId = row?.tenantId ?? null;
        session.user.fullName = row?.fullName ?? null;
        return session;
      },
    },
  };
});
