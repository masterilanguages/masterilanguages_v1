"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/portal/dashboard", emoji: "🏠", label: "Home" },
  { href: "/portal/learn",     emoji: "🎒", label: "Learn" },
  { href: "/portal/practice",  emoji: "🗣️", label: "Practice" },
  { href: "/portal/library",   emoji: "📚", label: "Library" },
  { href: "/portal/sessions",  emoji: "📅", label: "Sessions" },
  { href: "/portal/progress",  emoji: "📈", label: "Progress" },
  { href: "/portal/settings",  emoji: "⚙️", label: "Settings" },
];

export default function StudentHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header
      style={{
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        borderBottom: "1px solid rgba(150,120,255,0.2)",
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex flex-col items-start leading-none select-none">
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 500,
              fontSize: "1.1rem",
              letterSpacing: "0.25em",
              color: "#D4AF6A",
              lineHeight: 1,
            }}
          >
            MASTERI
          </span>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontSize: "0.55rem",
              letterSpacing: "0.35em",
              color: "#A89050",
              lineHeight: 1.4,
              borderTop: "1px solid rgba(212,175,106,0.4)",
              paddingTop: "2px",
              marginTop: "2px",
              width: "100%",
              textAlign: "center",
            }}
          >
            LANGUAGES
          </span>
        </div>

        {/* Right: logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#FCA5A5",
            fontFamily: "Jost, Inter, sans-serif",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          <span className="hidden sm:inline">{loggingOut ? "Logging out…" : "Logout"}</span>
        </button>
      </div>

      {/* Nav tabs */}
      <div
        className="px-4 py-2"
        style={{ borderTop: "1px solid rgba(96,165,250,0.1)" }}
      >
        <div className="grid grid-cols-7 gap-1.5 max-w-2xl mx-auto">
          {NAV.map(({ href, emoji, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center py-2 rounded-xl transition-all"
                style={{
                  background: active
                    ? "rgba(96,165,250,0.15)"
                    : "rgba(96,165,250,0.05)",
                  border: `1px solid ${active ? "rgba(96,165,250,0.4)" : "rgba(96,165,250,0.12)"}`,
                }}
              >
                <span className="text-lg">{emoji}</span>
                <span
                  className="text-xs font-medium mt-0.5"
                  style={{
                    color: active ? "#BFDBFE" : "#93C5FD",
                    fontFamily: "Jost, Inter, sans-serif",
                    letterSpacing: "0.03em",
                  }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
