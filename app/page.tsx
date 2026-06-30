import Link from "next/link";
import PricingSection from "@/components/PricingSection";
import NewsletterForm from "@/components/NewsletterForm";

export const metadata = {
  title: "Masteri Languages — Master a New Language Through Music, Conversation & Memory",
  description:
    "High-level language coaching through music, real conversation, and memory techniques. 1-on-1 results for people who want to actually speak.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-mesh text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050a1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-shine">Masteri Languages</span>
          <div className="flex items-center gap-3">
            <a
              href="https://masteri.backpacksystems.com/login?from=%2F"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-300"
            >
              Student Login
            </a>
            <a
              href="#programs"
              className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_-4px_rgba(45,212,191,0.6)] transition hover:brightness-110"
            >
              See Programs
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-32 text-center">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-teal-400">
          1-on-1 Language Coaching
        </p>
        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
          This Is Not Another<br />
          <span className="text-shine">Language App</span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-xl font-medium text-slate-300">
          Know what to practice, when to practice, how to remember it, and when to use it.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="/assessment"
            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-400 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_30px_-6px_rgba(45,212,191,0.6)] transition hover:brightness-110"
          >
            Start Learning →
          </a>
          <a
            href="#how"
            className="rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:border-cyan-400/50 hover:bg-white/5"
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* Learn in a way that sticks */}
      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Learn the Language You Need for Your Career
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            No boring textbook lessons. No random apps. No memorizing words you&apos;ll never use.
          </p>
          <p className="mt-2 text-lg text-slate-400">Choose to learn from:</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Real Estate scenarios",
              "Life Insurance scenarios",
              "Sales conversations",
              "Business vocabulary",
              "Personalized coaching",
              "English for Event Specialists",
            ].map((item) => (
              <li
                key={item}
                className="glass-panel flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium text-slate-100"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for People Who Want to Speak
          </h2>
          <p className="mt-3 text-slate-400">Masteri is for you if:</p>
          <ul className="mt-6 space-y-4">
            {[
              "You want to understand native speakers when they talk.",
              "You want to speak without freezing.",
              "You want to connect to a culture through its language.",
              "You've tried apps before but didn't stay consistent.",
              "You need structure, accountability, and someone guiding you.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 text-xs font-bold text-slate-950 shadow-[0_0_10px_-1px_rgba(45,212,191,0.7)]">
                  ✓
                </span>
                <span className="text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The Masteri Method */}
      <section id="how" className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-400">The Masteri Method</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              A proven system that combines coaching,<br className="hidden sm:block" /> accountability, and memory science to help<br className="hidden sm:block" /> you speak confidently faster.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Assess",
                hook: "Discover your level, goals, and learning style.",
                body: "We evaluate where you are today and identify the fastest path to fluency.",
              },
              {
                step: "2",
                title: "Structure",
                hook: "Build your personalized fluency system.",
                body: "Receive a clear roadmap with lessons, speaking drills, vocabulary, and daily accountability.",
              },
              {
                step: "3",
                title: "Practice",
                hook: "Speak consistently with expert coaching.",
                body: "Build confidence through real conversations, immediate feedback, and guided repetition.",
              },
              {
                step: "4",
                title: "Retain",
                hook: "Remember more and progress faster.",
                body: "Masteri's mnemonic system helps vocabulary stick through stories, visual associations, and active recall.",
              },
            ].map(({ step, title, hook, body }) => (
              <div key={step} className="glass-panel glow-border flex flex-col rounded-2xl p-7 transition hover:border-cyan-400/30">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 text-sm font-bold text-slate-950 shadow-[0_0_14px_-2px_rgba(45,212,191,0.7)]">
                  {step}
                </div>
                <h3 className="text-lg font-extrabold text-white">{title}</h3>
                <p className="mt-2 text-sm font-semibold text-teal-300">{hook}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* CTA */}
      <section id="cta" className="border-t border-white/10 px-6 py-28 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Start Speaking With Confidence
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
          Apply now and we&apos;ll see if Masteri is the right fit for you.
        </p>
        <a
          href="/book"
          className="mt-10 inline-block rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 px-10 py-5 text-lg font-bold text-slate-950 shadow-[0_0_40px_-8px_rgba(45,212,191,0.7)] transition hover:brightness-110"
        >
          Book Your Strategy Call
        </a>
        <p className="mt-4 text-sm text-slate-500">
          Or email us directly at hello@masterilanguages.com
        </p>
      </section>

      {/* Newsletter */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-white">Get the Free Fluency Toolkit</h2>
          <p className="mt-3 text-slate-400 text-base leading-relaxed">
            Learn the vocabulary, memory, and speaking techniques our students use to accelerate fluency.
          </p>
          <div className="mt-6">
            <NewsletterForm />
          </div>
          <p className="mt-4 text-xs text-slate-500">Free. No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Masteri Languages · All rights reserved ·{" "}
        <Link href="/dashboard" className="hover:text-slate-300">
          Admin
        </Link>
      </footer>
    </div>
  );
}
