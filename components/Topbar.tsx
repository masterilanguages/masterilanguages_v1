"use client";

import { useParams, usePathname } from "next/navigation";
import { getCompany } from "@/lib/companies";
import CompanySwitcher from "./CompanySwitcher";
import { MenuIcon } from "./Icons";

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const params = useParams<{ companyId?: string }>();
  const pathname = usePathname();
  const company = params.companyId ? getCompany(params.companyId) : undefined;
  const isControlPanel = pathname === "/";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#070d24]/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-400 transition hover:bg-white/10 lg:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {company ? company.name : isControlPanel ? "Control Panel" : "All Companies"}
          </p>
          <p className="hidden truncate text-xs text-slate-400 sm:block">
            {company ? company.tagline : isControlPanel ? "Masteri Languages" : "Portfolio overview"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <CompanySwitcher />
        <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-semibold text-white shadow-[0_0_16px_-2px_rgba(56,189,248,0.6)] sm:flex">
          ML
        </div>
      </div>
    </header>
  );
}
