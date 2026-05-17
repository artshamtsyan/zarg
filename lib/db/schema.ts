import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─── NextAuth tables (with Zarg extensions on `user`) ────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),

  // Zarg extensions — one user is one tenant owner
  fullName: text("full_name"),
  tenantId: uuid("tenant_id"),
  telegramChatId: text("telegram_chat_id").unique(),
  telegramLinkCode: text("telegram_link_code"),
  telegramLinkExpiresAt: timestamp("telegram_link_expires_at", { mode: "date" }),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({ compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }) })
);

// ─── Zarg core: tenants and the discovery profile ────────────────────────────

export const tenantStatus = ["onboarding", "active", "paused"] as const;
export type TenantStatus = (typeof tenantStatus)[number];

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  domain: text("domain").notNull().default("other"),
  location: text("location").default("Armenia"),
  timezone: text("timezone").notNull().default("Asia/Yerevan"),
  briefingLocalTime: varchar("briefing_local_time", { length: 5 }).notNull().default("08:00"),
  language: text("language").notNull().default("en"),
  status: text("status").$type<TenantStatus>().notNull().default("onboarding"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  currentState: jsonb("current_state").default({}),
  goals: jsonb("goals").default({}),
  keyWorkflows: jsonb("key_workflows").default([]),
  kpis: jsonb("kpis").default([]),
  entities: jsonb("entities").default({}),
  proposedFlow: jsonb("proposed_flow").default({}),
  mvpScope: jsonb("mvp_scope").default({}),
  risks: jsonb("risks").default({}),
  rawTranscript: jsonb("raw_transcript").default([]),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const discoveryMessages = pgTable("discovery_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant" | "tool"
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Synthetic operational data ──────────────────────────────────────────────

export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  segment: text("segment"),
  notes: text("notes"),
  source: text("source").notNull().default("synthetic"), // synthetic | owner_logged | imported
  joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
  durationMin: integer("duration_min").notNull().default(60),
  staffName: text("staff_name"),
  capacity: integer("capacity").notNull().default(12),
  type: text("type"),
  status: text("status").notNull().default("scheduled"),
  source: text("source").notNull().default("synthetic"),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("booked"),
  bookedAt: timestamp("booked_at", { mode: "date" }).notNull().defaultNow(),
  attendance: text("attendance"), // "attended" | "no_show" | null
  source: text("source").notNull().default("synthetic"),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
  amountMinor: integer("amount_minor").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("AMD"),
  method: text("method").notNull().default("card"),
  status: text("status").notNull().default("successful"),
  ref: text("ref"),
  paidAt: timestamp("paid_at", { mode: "date" }).notNull().defaultNow(),
  kind: text("kind").notNull().default("single"), // "single" | "package" | "trial"
  source: text("source").notNull().default("synthetic"),
});

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("8-class"),
  visitsTotal: integer("visits_total").notNull(),
  visitsRemaining: integer("visits_remaining").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  status: text("status").notNull().default("active"),
});

// ─── Briefings ───────────────────────────────────────────────────────────────

export const briefings = pgTable(
  "briefings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    forDate: date("for_date").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    telegramMessageId: integer("telegram_message_id"),
    status: text("status").notNull().default("queued"), // queued|sent|failed|skipped
    error: text("error"),
    generatedAt: timestamp("generated_at", { mode: "date" }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { mode: "date" }),
  },
  (b) => ({
    tenantDateIdx: uniqueIndex("briefings_tenant_date_idx").on(b.tenantId, b.forDate),
  })
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type DiscoveryMessage = typeof discoveryMessages.$inferSelect;
export type Briefing = typeof briefings.$inferSelect;
