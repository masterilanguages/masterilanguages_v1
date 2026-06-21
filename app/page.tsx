import Link from "next/link";
import PricingSection from "@/components/PricingSection";

export const metadata = {
  title: "Masteri Languages — Master a New Language Through Music, Conversation & Memory",
  description:
    "High-level language coaching through music, real conversation, and memory techniques. 1-on-1 results for people who want to actually speak.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-teal-700">Masteri Languages</span>
          <a
            href="#programs"
            className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            See Programs
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-950 px-6 py-28 text-center text-white">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-teal-400">
          1-on-1 Language Coaching
        </p>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Master a New Language Through Music,{" "}
          <span className="text-teal-400">Conversation,</span> and Memory
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Most people don&apos;t fail at learning a language because they&apos;re not smart.
          <br />
          <strong className="text-white">They fail because they forget.</strong>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          Masteri Languages is high-level content, music, real conversation, emotional memory, and
          repetition — all with 1-on-1 results.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="/book"
            className="rounded-xl bg-teal-500 px-8 py-4 text-base font-bold text-white transition hover:bg-teal-400"
          >
            Book Your Strategy Call
          </a>
          <a
            href="#how"
            className="rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
          >
            See How It Works
          </a>
        </div>
      </section>

      {/* Learn in a way that sticks */}
      <section className="border-b border-slate-100 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Learn a Language in a Way That Finally Sticks
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No boring textbook lessons. No random apps. No memorizing words you never use.
          </p>
          <p className="mt-2 text-lg text-slate-600">You&apos;ll learn through:</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Personal coaching",
              "Real conversations",
              "Music",
              "Speaking practice",
              "Visual memory anchors",
              "Repetition that builds confidence",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 px-5 py-4 text-sm font-medium text-teal-900"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-slate-950 px-6 py-20 text-white">
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
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                  ✓
                </span>
                <span className="text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-slate-100 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "We Find Your Level",
                body: "We start with your current level, goals, schedule, and interests.",
              },
              {
                step: "2",
                title: "You Get a Custom Plan",
                body: "Your lessons are built around real language: phrases, songs, conversations, and videos.",
              },
              {
                step: "3",
                title: "You Practice With a Coach",
                body: "You speak, repeat, make mistakes, get corrected, and improve.",
              },
              {
                step: "4",
                title: "You Remember More",
                body: "We use memory techniques, music, images, and repetition so words actually stay in your head.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Not an app */}
      <section className="border-b border-slate-100 px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            This Is Not Another Language App
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Apps give you words. Masteri gives you a system.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            You&apos;ll know what to practice, when to practice, how to remember it, and how to
            actually use it in conversation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="bg-slate-950 px-6 py-28 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Start Speaking With Confidence
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
          Apply now and we&apos;ll see if Masteri is the right fit for you.
        </p>
        <a
          href="/book"
          className="mt-10 inline-block rounded-2xl bg-teal-500 px-10 py-5 text-lg font-bold text-white transition hover:bg-teal-400"
        >
          Book Your Strategy Call
        </a>
        <p className="mt-4 text-sm text-slate-500">
          Or email us directly at hello@masterilanguages.com
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Masteri Languages · All rights reserved ·{" "}
        <Link href="/dashboard" className="hover:text-slate-600">
          Admin
        </Link>
      </footer>
    </div>
  );
}
