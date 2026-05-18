import { PillLink } from "@/components/ui/Pill";
import { LogoMark } from "@/components/ui/Logo";
import { GhostLink } from "@/components/ui/Ghost";
import { TaskCard } from "@/components/ui/TaskCard";

const features = [
  {
    tone: "pink" as const,
    title: "Discovery as signup",
    body:
      "Ten minutes of chat. StarUp learns how your business runs today and builds your operations profile. No forms.",
  },
  {
    tone: "violet" as const,
    title: "A briefing that knows you",
    body:
      "Every morning at 8:00, a Telegram DM: today's schedule, money, people, and three actions tied to your goals.",
  },
  {
    tone: "mint" as const,
    title: "One platform, any business",
    body:
      "Yoga studio, hair salon, tutoring, clinic — the same agent, adapted to your vocabulary and your workflow.",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-aboard min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2"><span className="text-[20px] font-semibold tracking-tight text-ink">StarUp</span><LogoMark className="h-5 w-auto" /></span>
          <div className="flex items-center gap-2.5">
            <GhostLink href="/concept" className="hidden sm:inline-flex">
              How it works
            </GhostLink>
            <PillLink href="/signup">Get your daily briefing</PillLink>
          </div>
        </header>

        <section className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-outline-blue bg-ghost-blue px-3 py-1 text-[12px] text-outline-blue">
              Operations co-pilot · Telegram-first
            </span>
            <h1 className="mt-5 text-[44px] font-semibold leading-[1.05] tracking-heading text-ink sm:text-[56px] sm:leading-[1.0] sm:tracking-heading-lg">
              Your daily ops briefing,
              <br />
              written by an AI that
              <br />
              knows your business.
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-[1.5] text-slate">
              Sign up, have a short discovery conversation, and start receiving a Telegram briefing every
              morning — focused on what matters today.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <PillLink href="/signup" size="lg">
                Get your daily briefing
              </PillLink>
              <GhostLink href="/concept">See the concept</GhostLink>
            </div>
            <p className="mt-6 text-[13px] text-slate">Free during the prototype. No credit card.</p>
          </div>

          <div className="flex items-center">
            <TaskCard tone="sky" className="w-full">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas-ice text-[15px] font-semibold text-outline-blue">
                  Z
                </div>
                <div>
                  <p className="text-[15px] font-medium text-ink">StarUpBot</p>
                  <p className="text-[12px] text-slate">Daily briefing · 08:00</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-[14px] leading-[1.55] text-ink">
                <p className="font-medium">Good morning, Anush.</p>
                <p>
                  <span className="font-semibold">Today</span> (Saturday, May 16)
                  <br />· 4 classes scheduled: 09:00, 11:00, 17:30, 19:00
                  <br />· 22 students booked, 6 spots open
                </p>
                <p>
                  <span className="font-semibold">Money</span>
                  <br />· Yesterday: 38,000 AMD
                  <br />· Pending: 2 payments (12,000 AMD)
                </p>
                <p>
                  <span className="font-semibold">Suggested actions</span>
                  <br />1. Message Maria, Anush, Lilit — packages expire this week
                  <br />2. Confirm Diana's trial for the 17:30 class
                  <br />3. Post the schedule change for Tuesday
                </p>
              </div>
            </TaskCard>
          </div>
        </section>

        <section id="how-it-works" className="mt-32">
          <h2 className="text-[32px] font-semibold leading-[1.15] tracking-heading-sm text-ink sm:text-[36px]">
            Three things, every day.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <TaskCard key={feature.title} tone={feature.tone} className="p-7">
                <h3 className="text-[20px] font-semibold text-ink">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.5] text-ink/80">{feature.body}</p>
              </TaskCard>
            ))}
          </div>
        </section>

        <footer className="mt-32 border-t border-whisper-gray/40 pt-8">
          <p className="text-[13px] text-slate">StarUp · A DINNO prototype · Built in 2026</p>
        </footer>
      </div>
    </main>
  );
}
