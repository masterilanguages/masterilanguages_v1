import { cn } from "@/lib/utils";
import type { Stat } from "@/lib/types";

export default function StatCard({ stat }: { stat: Stat }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_30px_-12px_rgba(56,189,248,0.3)]">
      <p className="text-sm font-medium text-slate-400">{stat.label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
        {stat.value}
      </p>
      {stat.change && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            stat.trend === "up" && "text-emerald-600",
            stat.trend === "down" && "text-red-600",
            (!stat.trend || stat.trend === "flat") && "text-slate-400"
          )}
        >
          {stat.change}
        </p>
      )}
    </div>
  );
}
