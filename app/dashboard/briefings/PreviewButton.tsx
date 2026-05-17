"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill } from "@/components/ui/Pill";

export function PreviewButton({ hasExisting }: { hasExisting: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const r = await fetch("/api/briefings/preview", { method: "POST" });
      if (!r.ok) {
        setError(`Generation failed: ${r.status}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Pill onClick={handleClick} disabled={pending}>
        {pending ? "Generating…" : hasExisting ? "Regenerate" : "Generate now"}
      </Pill>
      {error && (
        <p className="font-dm-sans text-[13px] tracking-[0.35px] text-[#ff9a8a]">{error}</p>
      )}
    </div>
  );
}
