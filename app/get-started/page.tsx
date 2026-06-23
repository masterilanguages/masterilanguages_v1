import Link from "next/link";

export default function GetStartedPage() {
  const options = [
    {
      title: "View Programs",
      description: "Browse our coaching programs and find the right fit for your goals.",
      href: "/#programs",
      icon: "📋",
    },
    {
      title: "Take Assessment",
      description: "Answer a few questions and get a personalized program recommendation.",
      href: "/assessment",
      icon: "🎯",
    },
    {
      title: "Book Consultation",
      description: "Speak with a coach to discuss your goals before committing.",
      href: "/book",
      icon: "📞",
    },
    {
      title: "Enroll Now",
      description: "Ready to start? Choose your program and enroll today.",
      href: "/#programs",
      icon: "✅",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16">
      <div className="w-full max-w-lg">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300">
          ← Back to Login
        </Link>

        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-400">Get Started</p>
        <h1 className="text-3xl font-extrabold text-white">Where would you like to begin?</h1>
        <p className="mt-3 text-slate-400">Choose the path that works best for you.</p>

        <div className="mt-8 space-y-3">
          {options.map((option) => (
            <a
              key={option.title}
              href={option.href}
              className="flex items-start gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-5 transition hover:border-teal-500 hover:bg-slate-800"
            >
              <span className="text-2xl">{option.icon}</span>
              <div>
                <p className="font-bold text-white">{option.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{option.description}</p>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-teal-400 hover:text-teal-300 font-medium">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
