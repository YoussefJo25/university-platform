"use client";

import { Compass } from "lucide-react";
import { useTodaysCompassMessage } from "@/hooks/useTodaysCompassMessage";

export default function CompassOfTheDay() {
  const { loading, message } = useTodaysCompassMessage();

  if (loading || !message) return null;

  return (
    <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-gold/30 bg-panel px-5 py-3 shadow-sm">
      <Compass className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{message}</p>
    </div>
  );
}
