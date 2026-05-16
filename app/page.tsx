import { PillLink } from "@/components/ui/Pill";
import { GhostLink } from "@/components/ui/Ghost";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { GhostCard } from "@/components/ui/GhostCard";

const features = [
  {
    title: "Discovery as signup",
    body:
      "Ten minutes of chat. Zarg learns how your business runs today and builds your operations profile. No forms.",
  },
  {
    title: "A briefing that knows you",
    body:
      "Every morning at 8:00, a Telegram DM: today's schedule, money, people, and three actions tied to your goals.",
  },
  {
    title: "One platform, any business",
    body:
      "Yoga studio, hair salon, tutoring, clinic — the same agent, adapted to your vocabulary and your workflow.",
  },
];

export default function LandingPage() {
  return (
    <main className="bg-aura-radial min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <span className="font-geist text-[20px] font-semibold tracking-tight text-canvas-white">
            Zarg
          </span>
          <div className="flex items-center gap-2">
            <GhostLink href="/signup" className="hidden sm:inline-flex">
              See an example briefing
            </GhostLink>
            <PillLink href="/signup">Get your daily briefing</PillLink>
          </div>
        </header>

        <section className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col justify-center">
            <p className="font-dm-sans text-[14px] uppercase tracking-[2px] text-ash-text">
              Operations co-pilot · Telegram-first
            </p>
            <h1 className="font-geist mt-4 text-[48px] font-semibold leading-[1] tracking-[-0.672px] text-canvas-white sm:text-[56px]">
              Your daily ops briefing,
              <br />
              written by an AI that
              <br />
              knows your business.
            </h1>
            <p className="font-dm-sans mt-6 max-w-md text-[18px] leading-[1.5] tracking-[0.45px] text-ghost-white">
              Sign up, have a short discovery conversation, and start receiving a Telegram briefing every
              morning — focused on what matters today.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PillLink href="/signup" size="lg">
                Get your daily briefing
              </PillLink>
              <GhostLink href="#how-it-works">How it works</GhostLink>
            </div>
            <p className="font-dm-sans mt-6 text-[14px] tracking-[0.35px] text-slate-text">
              Free during the prototype. No credit card.
            </p>
          </div>

          <div className="flex items-center">
            <SpotlightCard className="w-full">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-canvas-white" />
                <div>
                  <p className="font-geist text-[16px] text-canvas-white">ZargBot</p>
                  <p className="font-dm-sans text-[13px] text-slate-text">Daily briefing · 08:00</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 font-dm-sans text-[15px] leading-[1.55] tracking-[0.35px] text-ghost-white">
                <p className="text-canvas-white">Good morning, Anush.</p>
                <p>
                  <span className="font-geist text-canvas-white">Today</span> (Saturday, May 16)
                  <br />· 4 classes scheduled: 09:00, 11:00, 17:30, 19:00
                  <br />· 22 students booked, 6 spots open
                </p>
                <p>
                  <span className="font-geist text-canvas-white">Money</span>
                  <br />· Yesterday: 38,000 AMD
                  <br />· Pending: 2 payments (12,000 AMD)
                </p>
                <p>
                  <span className="font-geist text-canvas-white">Suggested actions</span>
                  <br />1. Message Maria, Anush, Lilit — packages expire this week
                  <br />2. Confirm Diana's trial for the 17:30 class
                  <br />3. Post the schedule change for Tuesday
                </p>
              </div>
            </SpotlightCard>
          </div>
        </section>

        <section id="how-it-works" className="mt-32">
          <h2 className="font-geist text-[32px] leading-[1.14] text-canvas-white">
            Three things, every day.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <GhostCard key={feature.title} className="p-6">
                <h3 className="font-geist text-[20px] text-canvas-white">{feature.title}</h3>
                <p className="font-dm-sans mt-3 text-[15px] leading-[1.55] tracking-[0.35px] text-ghost-white">
                  {feature.body}
                </p>
              </GhostCard>
            ))}
          </div>
        </section>

        <footer className="mt-32 border-t border-[rgba(229,229,229,0.08)] pt-8">
          <p className="font-dm-sans text-[14px] tracking-[0.35px] text-slate-text">
            Zarg · A DINNO prototype · Built in 2026
          </p>
        </footer>
      </div>
    </main>
  );
}
