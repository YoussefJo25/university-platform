"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { createClient } from "@/lib/supabase/client";
import ChartSkeleton from "./ChartSkeleton";

type Period = 7 | 30 | 90;
type DailyVisitRow = { day: string; visit_count: number };
type ChartPoint = { date: string; visits: number };

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: "7 أيام" },
  { value: 30, label: "30 يوم" },
  { value: 90, label: "90 يوم" },
];

function formatDateLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function CustomTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-gold/30 bg-panel px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink">{label}</p>
      <p className="mt-1 font-medium text-gold">
        {Number(payload[0].value).toLocaleString("ar-EG")} زيارة
      </p>
    </div>
  );
}

export default function VisitsTimelineChart() {
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data: rows, error: rpcError } = await supabase.rpc("get_daily_visit_counts", {
        days_back: period,
      });

      if (cancelled) return;

      if (rpcError) {
        setError(rpcError.message);
        setData([]);
      } else {
        const points: ChartPoint[] = ((rows ?? []) as DailyVisitRow[]).map((row) => ({
          date: formatDateLabel(row.day),
          visits: Number(row.visit_count),
        }));
        setData(points);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (loading) return <ChartSkeleton />;

  const hasData = data.some((point) => point.visits > 0);

  return (
    <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">الزيارات عبر الوقت</p>
        <div className="flex rounded-full border border-subtle bg-panel p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                period === option.value ? "bg-gold text-gold-ink" : "text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-6 py-10 text-center text-sm text-red-600">
          تعذّر تحميل بيانات الزيارات: {error}
        </p>
      ) : !hasData ? (
        <p className="mt-6 py-10 text-center text-sm text-muted">لا توجد بيانات كفاية بعد</p>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="visitsGoldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={36}
              />
              <Tooltip content={CustomTooltip} />
              <Area
                type="monotone"
                dataKey="visits"
                stroke="#D4AF37"
                strokeWidth={2}
                fill="url(#visitsGoldGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
