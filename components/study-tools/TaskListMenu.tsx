"use client";

import { useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { SORT_LABELS, type SortOption } from "./types";

export default function TaskListMenu({
  isDefault,
  currentSortBy,
  onSortChange,
  onRename,
  onDelete,
  onDeleteCompleted,
  onPrint,
}: {
  isDefault: boolean;
  currentSortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onRename: () => void;
  onDelete: () => void;
  onDeleteCompleted: () => void;
  onPrint: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSortSubmenuOpen, setIsSortSubmenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => {
    setIsOpen(false);
    setIsSortSubmenuOpen(false);
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="خيارات القائمة"
        aria-expanded={isOpen}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-xl border border-gold/25 bg-card p-1.5 text-sm shadow-lg">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortSubmenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-muted transition-colors hover:bg-panel hover:text-ink"
            >
              <span>ترتيب حسب</span>
              <span className="text-xs text-gold">{SORT_LABELS[currentSortBy]}</span>
            </button>
            {isSortSubmenuOpen && (
              <div className="mt-1 flex flex-col gap-0.5 rounded-lg bg-panel p-1">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onSortChange(option);
                      setIsSortSubmenuOpen(false);
                      setIsOpen(false);
                    }}
                    className={`rounded-md px-3 py-1.5 text-right text-xs transition-colors ${
                      currentSortBy === option ? "font-semibold text-gold" : "text-muted hover:text-ink"
                    }`}
                  >
                    {SORT_LABELS[option]} {currentSortBy === option && "✓"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onRename();
              setIsOpen(false);
            }}
            className="block w-full rounded-lg px-3 py-2 text-right text-muted transition-colors hover:bg-panel hover:text-ink"
          >
            إعادة تسمية القائمة
          </button>

          {isDefault ? (
            <p
              title="القائمة الافتراضية لا يمكن حذفها"
              className="cursor-not-allowed rounded-lg px-3 py-2 text-right text-muted/40"
            >
              حذف القائمة
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-right text-red-600 transition-colors hover:bg-panel"
            >
              حذف القائمة
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onDeleteCompleted();
              setIsOpen(false);
            }}
            className="block w-full rounded-lg px-3 py-2 text-right text-muted transition-colors hover:bg-panel hover:text-ink"
          >
            حذف كل التاسكات المكتملة
          </button>

          <button
            type="button"
            onClick={() => {
              onPrint();
              setIsOpen(false);
            }}
            className="block w-full rounded-lg px-3 py-2 text-right text-muted transition-colors hover:bg-panel hover:text-ink"
          >
            طباعة القائمة
          </button>
        </div>
      )}
    </div>
  );
}
