"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, ListChecks, Plus, Star } from "lucide-react";
import type { Task, TaskList } from "./types";

export type TasksView =
  | { type: "all" }
  | { type: "starred" }
  | { type: "list"; listId: string };

function viewsEqual(a: TasksView, b: TasksView): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "list" && b.type === "list") return a.listId === b.listId;
  return true;
}

// لون ثابت لكل قائمة (مشتق من الـ id نفسه) بس عشان دائرة التمييز الصغيرة
// جنب اسمها في الشريط الجانبي — مفيش عمود لون في السكيما أصلاً، فده مجرد
// تفاصيل بصرية محسوبة، مش بيانات متخزّنة.
function colorForList(listId: string): string {
  let hash = 0;
  for (let i = 0; i < listId.length; i += 1) {
    hash = (hash * 31 + listId.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 55%, 55%)`;
}

export default function TasksSidebar({
  lists,
  tasks,
  activeView,
  onSelectView,
  onCreateList,
  onQuickAddTask,
}: {
  lists: TaskList[];
  tasks: Task[];
  activeView: TasksView;
  onSelectView: (view: TasksView) => void;
  onCreateList: (title: string) => void;
  onQuickAddTask: (title: string) => void;
}) {
  const [isListsOpen, setIsListsOpen] = useState(true);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  const starredCount = tasks.filter((task) => task.is_starred && !task.is_completed).length;

  function unfinishedCountForList(listId: string): number {
    return tasks.filter((task) => task.list_id === listId && !task.is_completed).length;
  }

  function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newListTitle.trim();
    if (!title) return;
    onCreateList(title);
    setNewListTitle("");
    setIsCreatingList(false);
  }

  function handleQuickAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = quickAddTitle.trim();
    if (!title) return;
    onQuickAddTask(title);
    setQuickAddTitle("");
    setIsQuickAddOpen(false);
  }

  const itemBaseClasses =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  return (
    <div className="flex w-full flex-col gap-1 sm:w-64 sm:shrink-0">
      <button
        type="button"
        onClick={() => setIsQuickAddOpen((prev) => !prev)}
        className="mb-3 flex items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-ink shadow-sm transition-transform hover:scale-[1.02]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        إنشاء
      </button>

      {isQuickAddOpen && (
        <form onSubmit={handleQuickAdd} className="mb-2">
          <input
            autoFocus
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onBlur={() => !quickAddTitle.trim() && setIsQuickAddOpen(false)}
            placeholder="اسم التاسك الجديد..."
            className="w-full rounded-lg border border-gold/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
          />
        </form>
      )}

      <button
        type="button"
        onClick={() => onSelectView({ type: "all" })}
        className={`${itemBaseClasses} ${
          activeView.type === "all" ? "bg-gold/10 text-gold" : "text-muted hover:bg-card hover:text-ink"
        }`}
      >
        <ListChecks className="h-4 w-4" aria-hidden="true" />
        كل المهام
      </button>

      <button
        type="button"
        onClick={() => onSelectView({ type: "starred" })}
        className={`${itemBaseClasses} ${
          activeView.type === "starred" ? "bg-gold/10 text-gold" : "text-muted hover:bg-card hover:text-ink"
        }`}
      >
        <Star className="h-4 w-4" aria-hidden="true" />
        المميزة بنجمة
        {starredCount > 0 && <span className="mr-auto text-xs text-muted">{starredCount}</span>}
      </button>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setIsListsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted"
        >
          القوائم
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${isListsOpen ? "" : "-rotate-90"}`}
            aria-hidden="true"
          />
        </button>

        {isListsOpen && (
          <div className="mt-1 flex flex-col gap-1">
            {lists.map((list) => {
              const view: TasksView = { type: "list", listId: list.id };
              const unfinished = unfinishedCountForList(list.id);
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => onSelectView(view)}
                  className={`${itemBaseClasses} ${
                    viewsEqual(activeView, view)
                      ? "bg-gold/10 text-gold"
                      : "text-muted hover:bg-card hover:text-ink"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border-2"
                    style={{ borderColor: colorForList(list.id) }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-right">{list.title}</span>
                  {unfinished > 0 && <span className="text-xs text-muted">{unfinished}</span>}
                </button>
              );
            })}

            {isCreatingList ? (
              <form onSubmit={handleCreateList} className="px-1 py-1">
                <input
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onBlur={() => !newListTitle.trim() && setIsCreatingList(false)}
                  placeholder="اسم القائمة الجديدة..."
                  className="w-full rounded-lg border border-gold/40 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreatingList(true)}
                className={`${itemBaseClasses} text-muted hover:bg-card hover:text-ink`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                إنشاء قائمة جديدة
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
