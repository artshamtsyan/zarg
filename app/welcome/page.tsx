import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { WelcomeForm } from "./WelcomeForm";

export const metadata = { title: "Welcome · Zarg" };

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signup");
  if (session.user.tenantId) redirect("/onboarding");

  return (
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-md px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white"
          >
            Zarg
          </Link>
          <span className="font-dm-sans text-[14px] tracking-[0.35px] text-slate-text">
            {session.user.email}
          </span>
        </header>

        <SpotlightCard className="mt-16">
          <h1 className="font-geist text-[32px] leading-[1.14] text-canvas-white">
            Hi. Tell us who you are.
          </h1>
          <p className="font-dm-sans mt-3 text-[15px] leading-[1.55] tracking-[0.35px] text-ghost-white">
            Two quick fields, then we'll start the discovery conversation.
          </p>
          <div className="mt-8">
            <WelcomeForm />
          </div>
        </SpotlightCard>
      </div>
    </main>
  );
}
