"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import StudentSidebar from "./StudentSidebar";
import StudentTopbar from "./StudentTopbar";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const pathname = usePathname();

  // Gate the whole student portal: once the initial Supabase auth check resolves,
  // an unauthenticated visitor is bounced to the Backpack-hosted login (carrying
  // where they came from). This also prevents the "empty pages" flash — without a
  // session every RLS-protected query returns nothing.
  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      window.location.href = `https://masteri.backpacksystems.com/login?from=${encodeURIComponent(pathname || "/portal/schedule")}`;
    }
  }, [isLoadingAuth, isAuthenticated, pathname]);

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
          {isLoadingAuth ? "Loading…" : "Redirecting to sign in…"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <StudentTopbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
