"use client";

import { useState } from "react";
import GeneralScheduleView from "@/components/study-tools/GeneralScheduleView";
import PersonalScheduleView from "@/components/study-tools/PersonalScheduleView";

type Tab = "general" | "personal";

export default function ClassSchedule() {
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex w-full rounded-full border border-subtle bg-panel p-1">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          aria-pressed={activeTab === "general"}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "general" ? "bg-gold text-gold-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          الجدول العام
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          aria-pressed={activeTab === "personal"}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "personal" ? "bg-gold text-gold-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          جدولي الشخصي
        </button>
      </div>

      {activeTab === "general" ? <GeneralScheduleView /> : <PersonalScheduleView />}
    </div>
  );
}
