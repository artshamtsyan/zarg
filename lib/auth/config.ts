import type { NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.RESEND_FROM ?? "onboarding@example.com";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/signup",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  providers: [Resend({ apiKey, from })],
} satisfies NextAuthConfig;
