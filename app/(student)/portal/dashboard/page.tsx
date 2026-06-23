import Link from "next/link";

const SECTIONS = [
  {
    href: "/portal/dashboard",
    emoji: "🏠",
    label: "Dashboard",
    description: "Your overview and daily summary",
  },
  {
    href: "/portal/learn",
    emoji: "🎒",
    label: "Learn",
    description: "Lessons, units, and curriculum",
  },
  {
    href: "/portal/practice",
    emoji: "🗣️",
    label: "Practice",
    description: "Speaking and conversation drills",
  },
  {
    href: "/portal/library",
    emoji: "📚",
    label: "Library",
    description: "Resources, vocab, and reference materials",
  },
  {
    href: "/portal/sessions",
    emoji: "📅",
    label: "Sessions",
    description: "Upcoming and past coaching sessions",
  },
  {
    href: "/portal/progress",
    emoji: "📈",
    label: "Progress",
    description: "Track your fluency milestones",
  },
  {
    href: "/portal/settings",
    emoji: "⚙️",
    label: "Settings",
    description: "Account, notifications, and preferences",
  },
];

export default function PortalDashboard() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Student Portal</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">Welcome back.</h1>
        <p className="mt-2 text-slate-400">Where would you like to go today?</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-teal-600 hover:bg-slate-800"
          >
            <span className="text-3xl">{s.emoji}</span>
            <div>
              <p className="font-bold text-white group-hover:text-teal-400 transition">{s.label}</p>
              <p className="mt-1 text-sm text-slate-500">{s.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
