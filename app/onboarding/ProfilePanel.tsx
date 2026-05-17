"use client";

import { GhostCard } from "@/components/ui/GhostCard";

export interface TenantShape {
  id: string;
  name: string;
  domain: string;
  location: string | null;
  status: string;
}

export interface ProfileShape {
  currentState?: unknown;
  goals?: unknown;
  keyWorkflows?: unknown;
  kpis?: unknown;
  entities?: unknown;
  proposedFlow?: unknown;
  mvpScope?: unknown;
  risks?: unknown;
}

interface Props {
  tenant: TenantShape | null;
  profile: ProfileShape | null;
  finalized: boolean;
}

function hasContent(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v ?? "");
}

interface RowProps {
  label: string;
  value: unknown;
  multi?: boolean;
}

function Row({ label, value, multi }: RowProps) {
  const filled = hasContent(value);
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[1.2px] text-slate">{label}</span>
        {filled ? (
          <span className="rounded-full bg-ghost-blue px-2 py-0.5 text-[10px] uppercase tracking-[0.8px] text-outline-blue">
            captured
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.8px] text-whisper-gray">empty</span>
        )}
      </div>
      <div className="mt-1.5">
        {filled ? (
          multi || typeof value === "object" ? (
            <pre className="whitespace-pre-wrap text-[13px] leading-[1.5] text-ink">
              {asString(value)}
            </pre>
          ) : (
            <p className="text-[14px] leading-[1.5] text-ink">{asString(value)}</p>
          )
        ) : (
          <p className="text-[13px] text-whisper-gray">—</p>
        )}
      </div>
    </div>
  );
}

export function ProfilePanel({ tenant, profile, finalized }: Props) {
  return (
    <aside className="lg:sticky lg:top-6 lg:h-[72vh] lg:overflow-y-auto">
      <GhostCard className="p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-semibold text-ink">Your business profile</h2>
          <span className="text-[11px] uppercase tracking-[1.2px] text-slate">
            {finalized ? "Finalized" : "Building"}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-slate">
          Fields fill in as Zarg learns about your business.
        </p>
        <div className="mt-4 divide-y divide-whisper-gray/30">
          <Row label="Name" value={tenant?.name} />
          <Row
            label="Domain"
            value={tenant?.domain && tenant.domain !== "other" ? tenant.domain : null}
          />
          <Row label="Location" value={tenant?.location} />
          <Row label="Current state" value={profile?.currentState} multi />
          <Row label="Goals" value={profile?.goals} multi />
          <Row label="Entity vocabulary" value={profile?.entities} multi />
          <Row label="Key workflows" value={profile?.keyWorkflows} multi />
          <Row label="KPIs" value={profile?.kpis} multi />
          <Row label="Proposed flow / assessment" value={profile?.proposedFlow} multi />
          <Row label="MVP scope" value={profile?.mvpScope} multi />
          <Row label="Risks" value={profile?.risks} multi />
        </div>
      </GhostCard>
    </aside>
  );
}
