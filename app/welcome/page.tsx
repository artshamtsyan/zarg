import { redirect } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { TaskCard } from "@/components/ui/TaskCard";
import { WelcomeForm } from "./WelcomeForm";

export const metadata = { title: "Welcome · StarUp" };

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (session.user.tenantId) redirect("/onboarding");

  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-md px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-2"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-5 w-auto" /></span>
          </Link>
          <span className="text-[13px] text-slate">{session.user.email}</span>
        </header>

        <TaskCard tone="violet" className="mt-16 p-8">
          <h1 className="text-[28px] font-semibold leading-[1.2] tracking-heading-sm text-ink">
            Hi. Tell us who you are.
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-ink/80">
            Two quick fields, then we'll start the discovery conversation.
          </p>
          <div className="mt-8">
            <WelcomeForm />
          </div>
        </TaskCard>
      </div>
    </main>
  );
}
