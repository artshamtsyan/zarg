"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "@/components/ui/TaskCard";
import { Pill } from "@/components/ui/Pill";
import { Ghost } from "@/components/ui/Ghost";
import { updateTenant, setTenantStatusViaProfile } from "@/lib/actions/profile";

interface Initial {
  name: string;
  domain: string;
  location: string;
  timezone: string;
  briefingLocalTime: string;
  eveningRecapTime: string;
  language: string;
  status: string;
}

const inputClass =
  "mt-1.5 block w-full rounded-[10px] border border-whisper-gray bg-canvas-ice px-3 py-2.5 text-[15px] text-ink placeholder:text-whisper-gray outline-none focus:border-outline-blue";

export function SettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    draft.name !== initial.name ||
    draft.domain !== initial.domain ||
    draft.location !== initial.location ||
    draft.timezone !== initial.timezone ||
    draft.briefingLocalTime !== initial.briefingLocalTime ||
    draft.eveningRecapTime !== initial.eveningRecapTime ||
    draft.language !== initial.language;

  const save = useCallback(() => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await updateTenant({
        name: draft.name,
        domain: draft.domain,
        location: draft.location,
        timezone: draft.timezone,
        briefingLocalTime: draft.briefingLocalTime,
        eveningRecapTime: draft.eveningRecapTime,
        language: draft.language,
      });
      if (r.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(r.error ?? "Couldn't save");
      }
    });
  }, [draft, router]);

  const togglePause = useCallback(() => {
    startTransition(async () => {
      await setTenantStatusViaProfile(draft.status === "paused" ? "active" : "paused");
      router.refresh();
    });
  }, [draft.status, router]);

  return (
    <div className="mt-8 space-y-5">
      <TaskCard tone="ice" className="p-6">
        <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Business basics</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] uppercase tracking-[1px] text-slate">Name</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              maxLength={120}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-[12px] uppercase tracking-[1px] text-slate">Domain</span>
            <input
              value={draft.domain}
              onChange={(e) => setDraft((d) => ({ ...d, domain: e.target.value }))}
              maxLength={60}
              placeholder="yoga / salon / tutoring / clinic / other"
              className={inputClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[12px] uppercase tracking-[1px] text-slate">Location</span>
            <input
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              maxLength={120}
              placeholder="Yerevan, Armenia"
              className={inputClass}
            />
          </label>
        </div>
      </TaskCard>

      <TaskCard tone="ice" className="p-6">
        <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Daily briefing</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] uppercase tracking-[1px] text-slate">Where are you?</span>
            <select
              value={draft.timezone}
              onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
              className={inputClass}
            >
              <optgroup label="Armenia & Caucasus">
                <option value="Asia/Yerevan">Yerevan</option>
                <option value="Asia/Tbilisi">Tbilisi</option>
                <option value="Asia/Baku">Baku</option>
              </optgroup>
              <optgroup label="Europe">
                <option value="Europe/Moscow">Moscow</option>
                <option value="Europe/Istanbul">Istanbul</option>
                <option value="Europe/Berlin">Berlin</option>
                <option value="Europe/London">London</option>
              </optgroup>
              <optgroup label="Middle East">
                <option value="Asia/Dubai">Dubai</option>
                <option value="Asia/Tehran">Tehran</option>
              </optgroup>
              <optgroup label="Americas">
                <option value="America/New_York">New York</option>
                <option value="America/Chicago">Chicago</option>
                <option value="America/Los_Angeles">Los Angeles</option>
              </optgroup>
            </select>
            <span className="mt-1 block text-[12px] text-slate">
              Used to know when &quot;morning&quot; is for you.
            </span>
          </label>
          <label className="block">
            <span className="text-[12px] uppercase tracking-[1px] text-slate">Morning briefing at</span>
            <input
              type="time"
              value={draft.briefingLocalTime}
              onChange={(e) => setDraft((d) => ({ ...d, briefingLocalTime: e.target.value }))}
              className={inputClass}
            />
            <span className="mt-1 block text-[12px] text-slate">
              Your local time. Default 08:00.
            </span>
          </label>
          <label className="block">
            <span className="text-[12px] uppercase tracking-[1px] text-slate">Evening recap at</span>
            <input
              type="time"
              value={draft.eveningRecapTime}
              onChange={(e) => setDraft((d) => ({ ...d, eveningRecapTime: e.target.value }))}
              className={inputClass}
            />
            <span className="mt-1 block text-[12px] text-slate">
              Default 20:00. A one-tap &quot;how did today go?&quot; nudge in Telegram.
            </span>
          </label>
          <label className="block">
            <span className="text-[12px] uppercase tracking-[1px] text-slate">Language</span>
            <select
              value={draft.language}
              onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}
              className={inputClass}
            >
              <option value="en">English</option>
              <option value="hy">Armenian (հայերեն) — coming soon</option>
              <option value="ru">Русский — coming soon</option>
            </select>
            <span className="mt-1 block text-[12px] text-slate">
              The briefing is English-only for now; we&apos;re wiring Armenian + Russian next.
            </span>
          </label>
        </div>
      </TaskCard>

      <TaskCard tone="ice" className="p-6">
        <p className="text-[11px] uppercase tracking-[1.5px] text-slate">Status</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className={
              draft.status === "paused"
                ? "inline-flex items-center gap-2 rounded-full bg-task-card-yellow px-3 py-1 text-[12px] uppercase tracking-[1px] text-ink"
                : "inline-flex items-center gap-2 rounded-full bg-task-card-mint px-3 py-1 text-[12px] uppercase tracking-[1px] text-ink"
            }
          >
            <span
              className={
                draft.status === "paused"
                  ? "h-1.5 w-1.5 rounded-full bg-accent-orange"
                  : "h-1.5 w-1.5 rounded-full bg-accent-teal"
              }
            />
            {draft.status === "paused" ? "Paused" : "Active"}
          </span>
          <Ghost onClick={togglePause} disabled={pending}>
            {draft.status === "paused" ? "Resume briefings" : "Pause briefings"}
          </Ghost>
        </div>
        <p className="mt-3 text-[12px] text-slate">
          When paused, the daily cron skips you. The dashboard stays available.
        </p>
      </TaskCard>

      <div className="flex flex-wrap items-center gap-3">
        <Pill onClick={save} disabled={!dirty || pending} size="lg">
          {pending ? "Saving…" : "Save changes"}
        </Pill>
        {saved && <span className="text-[13px] text-accent-teal">Saved.</span>}
        {error && <span className="text-[13px] text-accent-orange">{error}</span>}
      </div>
    </div>
  );
}
