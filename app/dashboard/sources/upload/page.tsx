import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { TaskCard } from "@/components/ui/TaskCard";
import { LogoMark } from "@/components/ui/Logo";
import { UploadClient } from "./UploadClient";

export const metadata = { title: "Upload customers · StarUp" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (!session.user.tenantId) redirect("/welcome");

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span>
            <LogoMark className="h-5 w-auto" />
          </Link>
          <Link href="/dashboard/sources" className="text-[13px] text-slate hover:text-ink">
            ← Sources
          </Link>
        </header>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[1.8px] text-slate">Customer list upload</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink">
            Upload your customers.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-slate">
            CSV file from Excel, Google Sheets, or your CRM. StarUp will read the headers, let you
            map them, and write the rows in as real people. Duplicates by name get updated, not
            re-added.
          </p>
        </div>

        <TaskCard tone="ice" className="mt-8 p-6 md:p-8">
          <UploadClient />
        </TaskCard>
      </div>
    </main>
  );
}
