"use client";

import { type ReactNode } from "react";
import StudentHeader from "./StudentHeader";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#3b1f6e" }}>
      <StudentHeader />
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
