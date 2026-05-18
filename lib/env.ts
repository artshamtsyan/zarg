function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function need(name: string): string {
  const v = get(name);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  appUrl: get("APP_URL") ?? "http://localhost:3000",

  databaseUrl: () => need("DATABASE_URL"),
  hasDatabaseUrl: () => Boolean(get("DATABASE_URL")),

  authSecret: () => need("AUTH_SECRET"),
  hasAuthSecret: () => Boolean(get("AUTH_SECRET")),

  resendApiKey: () => need("RESEND_API_KEY"),
  resendFrom: () => need("RESEND_FROM"),
  hasResend: () => Boolean(get("RESEND_API_KEY") && get("RESEND_FROM")),

  anthropicApiKey: () => need("ANTHROPIC_API_KEY"),
  hasAnthropic: () => Boolean(get("ANTHROPIC_API_KEY")),
  discoveryModel: () => get("ANTHROPIC_DISCOVERY_MODEL") ?? "claude-opus-4-7",
  briefingModel: () => get("ANTHROPIC_BRIEFING_MODEL") ?? "claude-sonnet-4-6",

  telegramBotToken: () => need("TELEGRAM_BOT_TOKEN"),
  telegramWebhookSecret: () => need("TELEGRAM_WEBHOOK_SECRET"),
  telegramBotUsername: () => get("TELEGRAM_BOT_USERNAME") ?? "StarUpBot",
  hasTelegram: () => Boolean(get("TELEGRAM_BOT_TOKEN") && get("TELEGRAM_WEBHOOK_SECRET")),
};

export type ServiceStatus = {
  ready: boolean;
  missing: string[];
};

export function serviceStatus(): {
  db: ServiceStatus;
  auth: ServiceStatus;
  email: ServiceStatus;
  anthropic: ServiceStatus;
  telegram: ServiceStatus;
} {
  return {
    db: { ready: env.hasDatabaseUrl(), missing: env.hasDatabaseUrl() ? [] : ["DATABASE_URL"] },
    auth: { ready: env.hasAuthSecret(), missing: env.hasAuthSecret() ? [] : ["AUTH_SECRET"] },
    email: { ready: env.hasResend(), missing: env.hasResend() ? [] : ["RESEND_API_KEY", "RESEND_FROM"] },
    anthropic: { ready: env.hasAnthropic(), missing: env.hasAnthropic() ? [] : ["ANTHROPIC_API_KEY"] },
    telegram: {
      ready: env.hasTelegram(),
      missing: env.hasTelegram() ? [] : ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"],
    },
  };
}
