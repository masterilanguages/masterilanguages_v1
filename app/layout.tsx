import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masteri Admin",
  description: "Admin panel for Masteri Languages",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
