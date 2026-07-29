import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

export default function StatCard({
  icon: Icon,
  label,
  value,
  changePercent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  /** نسبة التغيّر عن الفترة السابقة؛ سيبها undefined لو المؤشر مالوش فترة سابقة يتقارن بيها */
  changePercent?: number | null;
}) {
  const hasChange =
    changePercent !== undefined && changePercent !== null && Number.isFinite(changePercent);
  const isPositive = hasChange && changePercent! >= 0;

  return (
    <div className="rounded-2xl border border-gold/25 bg-panel p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {hasChange && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-600/10 text-red-600"
            }`}
          >
            {isPositive ? (
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-3 w-3" aria-hidden="true" />
            )}
            {Math.abs(changePercent!).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-ink">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}
