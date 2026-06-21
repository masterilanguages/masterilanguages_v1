import Link from "next/link";

const PLAN_NAMES: Record<string, string> = {
  kickstart: "Kickstart — 4 Weeks",
  fluency: "Fluency Accelerator — 8 Weeks",
  intensive: "Intensive — 8 Weeks",
};

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const plan = searchParams.plan ?? "";
  const planName = PLAN_NAMES[plan] ?? "your program";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-3xl">
          ✓
        </div>
        <h1 className="text-3xl font-extrabold">Payment Confirmed</h1>
        <p className="mt-3 text-slate-400">
          You&apos;re enrolled in <span className="text-white font-semibold">{planName}</span>.
          We&apos;ll be in touch within 24 hours to get you started.
        </p>
        <p className="mt-2 text-slate-500 text-sm">
          Questions? Email us at hello@masterilanguages.com
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-teal-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
