"use client";

import { useState, type FormEvent } from "react";
import { Circle, CheckCircle2, Star, X } from "lucide-react";
import TaskListMenu from "./TaskListMenu";
import { sortTasks, type SortOption, type Task, type TaskList } from "./types";

function buildPrintHtml(listTitle: string, tasks: Task[]): string {
  const rows = tasks
    .map(
      (task) =>
        `<li style="${task.is_completed ? "text-decoration:line-through;color:#888;" : ""}">${task.title}</li>`
    )
    .join("");

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charSet="utf-8" />
    <title>${listTitle}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;} h1{font-size:20px;} ul{padding-inline-start:20px;}</style>
    </head><body><h1>${listTitle}</h1><ul>${rows}</ul></body></html>`;
}

export default function TaskListColumn({
  list,
  tasks,
  onToggleComplete,
  onToggleStar,
  onAddTask,
  onDeleteTask,
  onRenameList,
  onDeleteList,
  onChangeSortBy,
  onDeleteCompleted,
  hideMenu = false,
}: {
  list: TaskList;
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onAddTask: (listId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRenameList: (listId: string, title: string) => void;
  onDeleteList: (listId: string) => void;
  onChangeSortBy: (listId: string, sort: SortOption) => void;
  onDeleteCompleted: (listId: string) => void;
  hideMenu?: boolean;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(list.title);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const sorted = sortTasks(tasks, list.sort_by);
  const incomplete = sorted.filter((task) => !task.is_completed);
  const completed = sorted.filter((task) => task.is_completed);

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    onAddTask(list.id, title);
    setNewTaskTitle("");
  }

  function commitRename() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== list.title) onRenameList(list.id, trimmed);
    else setRenameValue(list.title);
    setIsRenaming(false);
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) return;
    printWindow.document.write(buildPrintHtml(list.title, sorted));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="flex flex-col rounded-2xl border border-subtle bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenameValue(list.title);
                setIsRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-gold bg-panel px-2 py-1 text-sm font-bold text-ink outline-none"
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate font-bold text-ink">{list.title}</h3>
        )}

        {!hideMenu && (
          <TaskListMenu
            isDefault={list.is_default}
            currentSortBy={list.sort_by}
            onSortChange={(sort) => onChangeSortBy(list.id, sort)}
            onRename={() => {
              setRenameValue(list.title);
              setIsRenaming(true);
            }}
            onDelete={() => onDeleteList(list.id)}
            onDeleteCompleted={() => onDeleteCompleted(list.id)}
            onPrint={handlePrint}
          />
        )}
      </div>

      <form onSubmit={handleAddTask} className="mt-3">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="+ إضافة تاسك"
          className="w-full rounded-lg border border-dashed border-gold/40 bg-transparent px-3 py-2 text-sm text-gold placeholder:text-gold/70 outline-none focus:border-gold"
        />
      </form>

      {incomplete.length === 0 && completed.length === 0 ? (
        <p className="mt-4 text-center text-xs text-muted">لسه مفيش تاسكات في القائمة دي</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-0.5">
          {incomplete.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onToggleStar={onToggleStar}
              onDelete={onDeleteTask}
            />
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <details className="mt-3" open>
          <summary className="cursor-pointer select-none text-xs font-medium text-muted">
            مكتملة ({completed.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-0.5">
            {completed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onToggleStar={onToggleStar}
                onDelete={onDeleteTask}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggleComplete,
  onToggleStar,
  onDelete,
}: {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onToggleStar: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  return (
    <li className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-panel">
      <button
        type="button"
        onClick={() => onToggleComplete(task.id)}
        className="shrink-0 text-muted transition-colors hover:text-gold"
        aria-label={task.is_completed ? "تحديد كغير مكتمل" : "تحديد كمكتمل"}
      >
        {task.is_completed ? (
          <CheckCircle2 className="h-5 w-5 text-gold" aria-hidden="true" />
        ) : (
          <Circle className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      <span className={`min-w-0 flex-1 truncate text-sm ${task.is_completed ? "text-muted line-through" : "text-ink"}`}>
        {task.title}
      </span>

      <button
        type="button"
        onClick={() => onToggleStar(task.id)}
        aria-label={task.is_starred ? "إلغاء التمييز بنجمة" : "تمييز بنجمة"}
        className={`shrink-0 transition-opacity hover:text-gold ${
          task.is_starred ? "text-gold opacity-100" : "text-muted opacity-0 group-hover:opacity-100"
        }`}
      >
        <Star className="h-4 w-4" fill={task.is_starred ? "currentColor" : "none"} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label="حذف التاسك"
        className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
