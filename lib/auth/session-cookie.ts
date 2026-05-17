import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

// NextAuth v5 uses the __Secure- prefix in production (HTTPS) and a bare
// name otherwise. Match its expectation so cookies we set are recognized
// by auth().
//
// See: https://authjs.dev/reference/nextjs#cookies

export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

interface SetParams {
  cookieStore: ResponseCookies | Awaited<ReturnType<typeof import("next/headers").cookies>>;
  token: string;
  expires: Date;
}

export function setSessionCookie({ cookieStore, token, expires }: SetParams) {
  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set({
    name: sessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProd,
    expires,
  });
}
