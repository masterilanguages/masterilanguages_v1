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
      <section className="bg-slate-950 px-6 py-32 text-center text-white">
        <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-teal-400">
          1-on-1 Language Coaching
        </p>
        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
          This Is Not Another<br />
          <span className="text-teal-400">Language App</span>
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-xl font-medium text-slate-300">
          Apps give you words. Masteri gives you a system.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400 leading-relaxed">
          You&apos;ll know what to practice, when to practice, how to remember it, and how to
          actually use it in conversation.
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

      {/* The Masteri Method */}
      <section id="how" className="border-b border-slate-100 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-600">The Masteri Method</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
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
              <div key={step} className="flex flex-col rounded-2xl border border-slate-200 p-7 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm font-semibold text-teal-700">{hook}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{body}</p>
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

      {/* Newsletter */}
      <section className="bg-slate-900 px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-white">Stay in the Loop</h2>
          <p className="mt-2 text-slate-400 text-sm">
            Tips, resources, and updates from Masteri Languages — straight to your inbox.
          </p>
          <div className="mt-6 text-left">
            <NewsletterForm />
          </div>
        </div>
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
