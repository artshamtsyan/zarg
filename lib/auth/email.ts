import { Resend } from "resend";
import { env } from "@/lib/env";

const RESEND_CACHE: { client?: Resend } = {};

function client(): Resend {
  if (!RESEND_CACHE.client) {
    RESEND_CACHE.client = new Resend(env.resendApiKey());
  }
  return RESEND_CACHE.client;
}

interface MagicLinkParams {
  to: string;
  url: string;
}

export async function sendMagicLinkEmail({ to, url }: MagicLinkParams) {
  const subject = "Sign in to StarUp";
  const text = `Sign in to StarUp by opening this link:\n\n${url}\n\nThe link is valid for 24 hours.\n\nIf you didn't request this, you can ignore this email.`;
  const html = renderHtml({ url });
  const { error } = await client().emails.send({
    from: env.resendFrom(),
    to,
    subject,
    text,
    html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}

function renderHtml({ url }: { url: string }) {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'DM Sans',-apple-system,system-ui,sans-serif;color:#e5e5e5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:48px 24px;">
      <table role="presentation" width="100%" style="max-width:480px;text-align:left;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-family:'Geist',-apple-system,system-ui,sans-serif;font-size:24px;color:#ffffff;font-weight:600;letter-spacing:-0.5px;">StarUp</span>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <h1 style="margin:0;font-family:'Geist',-apple-system,system-ui,sans-serif;font-size:32px;line-height:1.15;color:#ffffff;font-weight:600;">Your sign-in link</h1>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <p style="margin:0;font-size:16px;line-height:1.55;color:#e5e5e5;">Click the button below to sign in. The link is valid for 24 hours.</p>
        </td></tr>
        <tr><td style="padding-bottom:40px;">
          <a href="${url}" style="display:inline-block;background:#ffffff;color:#161616;text-decoration:none;font-weight:500;padding:12px 20px;border-radius:9999px;font-size:15px;">Sign in to StarUp</a>
        </td></tr>
        <tr><td style="padding-top:24px;border-top:1px solid rgba(229,229,229,0.08);">
          <p style="margin:0;font-size:13px;color:#686868;">If you didn't request this, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
