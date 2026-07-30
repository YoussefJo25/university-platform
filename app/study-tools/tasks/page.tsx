"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TasksSidebar, { type TasksView } from "@/components/study-tools/TasksSidebar";
import TaskListColumn from "@/components/study-tools/TaskListColumn";
import type { SortOption, Task, TaskList } from "@/components/study-tools/types";

export default function TasksPage() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<TasksView>({ type: "all" });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let listRows = (
        await supabase.from("task_lists").select("*").eq("user_id", user.id).order("created_at")
      ).data;

      // أول ما المستخدم يفتح صفحة التاسكات لأول مرة، بننشئله قائمة
      // افتراضية واحدة تلقائيًا — القائمة دي مينفعش تتحذف (is_default).
      if (!listRows || listRows.length === 0) {
        const { data: created } = await supabase
          .from("task_lists")
          .insert({ user_id: user.id, title: "مهامي", is_default: true })
          .select()
          .single();
        listRows = created ? [created] : [];
      }

      const taskRows = (
        await supabase.from("tasks").select("*").eq("user_id", user.id).order("order_index")
      ).data;

      setLists((listRows ?? []) as TaskList[]);
      setTasks((taskRows ?? []) as Task[]);
      setLoading(false);
    }

    load();
  }, []);

  async function handleToggleComplete(taskId: string) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    const nextCompleted = !target.is_completed;
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, is_completed: nextCompleted, completed_at: nextCompletedAt } : task
      )
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: nextCompleted, completed_at: nextCompletedAt })
      .eq("id", taskId);

    if (error) {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? target : task)));
    }
  }

  async function handleToggleStar(taskId: string) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;
    const nextStarred = !target.is_starred;
    const nextStarredAt = nextStarred ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, is_starred: nextStarred, starred_at: nextStarredAt } : task
      )
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ is_starred: nextStarred, starred_at: nextStarredAt })
      .eq("id", taskId);

    if (error) {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? target : task)));
    }
  }

  async function handleAddTask(listId: string, title: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const maxOrder = tasks
      .filter((task) => task.list_id === listId)
      .reduce((max, task) => Math.max(max, task.order_index), 0);

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticTask: Task = {
      id: tempId,
      list_id: listId,
      title,
      is_completed: false,
      is_starred: false,
      starred_at: null,
      due_date: null,
      order_index: maxOrder + 1,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    setTasks((prev) => [...prev, optimisticTask]);

    const { data, error } = await supabase
      .from("tasks")
      .insert({ list_id: listId, user_id: user.id, title, order_index: maxOrder + 1 })
      .select()
      .single();

    if (error || !data) {
      setTasks((prev) => prev.filter((task) => task.id !== tempId));
      return;
    }

    setTasks((prev) => prev.map((task) => (task.id === tempId ? (data as Task) : task)));
  }

  async function handleQuickAddTask(title: string) {
    const defaultList = lists.find((list) => list.is_default) ?? lists[0];
    if (!defaultList) return;
    await handleAddTask(defaultList.id, title);
  }

  async function handleDeleteTask(taskId: string) {
    const previous = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) setTasks(previous);
  }

  async function handleRenameList(listId: string, title: string) {
    const previous = lists;
    setLists((prev) => prev.map((list) => (list.id === listId ? { ...list, title } : list)));

    const supabase = createClient();
    const { error } = await supabase.from("task_lists").update({ title }).eq("id", listId);
    if (error) setLists(previous);
  }

  async function handleChangeSortBy(listId: string, sortBy: SortOption) {
    const previous = lists;
    setLists((prev) => prev.map((list) => (list.id === listId ? { ...list, sort_by: sortBy } : list)));

    const supabase = createClient();
    const { error } = await supabase.from("task_lists").update({ sort_by: sortBy }).eq("id", listId);
    if (error) setLists(previous);
  }

  async function handleDeleteList(listId: string) {
    const list = lists.find((l) => l.id === listId);
    if (!list || list.is_default) return;
    if (!confirm(`هل أنت متأكد من حذف قائمة "${list.title}"؟ كل التاسكات فيها هتتحذف كمان.`)) return;

    const previousLists = lists;
    const previousTasks = tasks;
    setLists((prev) => prev.filter((l) => l.id !== listId));
    setTasks((prev) => prev.filter((task) => task.list_id !== listId));
    if (activeView.type === "list" && activeView.listId === listId) {
      setActiveView({ type: "all" });
    }

    const supabase = createClient();
    const { error } = await supabase.from("task_lists").delete().eq("id", listId);
    if (error) {
      setLists(previousLists);
      setTasks(previousTasks);
    }
  }

  async function handleDeleteCompleted(listId: string) {
    const completedIds = tasks
      .filter((task) => task.list_id === listId && task.is_completed)
      .map((task) => task.id);
    if (completedIds.length === 0) return;
    if (!confirm("هل أنت متأكد من حذف كل التاسكات المكتملة في هذه القائمة؟")) return;

    const previous = tasks;
    setTasks((prev) => prev.filter((task) => !completedIds.includes(task.id)));

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("list_id", listId)
      .eq("is_completed", true);
    if (error) setTasks(previous);
  }

  async function handleCreateList(title: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticList: TaskList = { id: tempId, title, is_default: false, sort_by: "my_order" };
    setLists((prev) => [...prev, optimisticList]);

    const { data, error } = await supabase
      .from("task_lists")
      .insert({ user_id: user.id, title, is_default: false })
      .select()
      .single();

    if (error || !data) {
      setLists((prev) => prev.filter((list) => list.id !== tempId));
      return;
    }

    setLists((prev) => prev.map((list) => (list.id === tempId ? (data as TaskList) : list)));
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas py-24">
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      </div>
    );
  }

  const listById = new Map(lists.map((list) => [list.id, list]));
  const starredTasks = tasks.filter((task) => task.is_starred);

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-subtle bg-panel px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold font-display text-ink sm:text-4xl">التاسكات</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">نظّم مهامك في قوائم منفصلة حسب أولويتك</p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row">
          <TasksSidebar
            lists={lists}
            tasks={tasks}
            activeView={activeView}
            onSelectView={setActiveView}
            onCreateList={handleCreateList}
            onQuickAddTask={handleQuickAddTask}
          />

          <div className="min-w-0 flex-1">
            {activeView.type === "starred" ? (
              <div className="rounded-2xl border border-subtle bg-card p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
                  <Star className="h-4 w-4 text-gold" fill="currentColor" aria-hidden="true" />
                  المميزة بنجمة
                </h2>
                {starredTasks.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">لسه مفيش تاسكات مميّزة بنجمة</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {starredTasks.map((task) => (
                      <li
                        key={task.id}
                        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-panel"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(task.id)}
                          className="shrink-0 text-gold"
                        >
                          <Star className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                        </button>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            task.is_completed ? "text-muted line-through" : "text-ink"
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted">
                          {listById.get(task.list_id)?.title ?? ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : activeView.type === "list" ? (
              (() => {
                const list = listById.get(activeView.listId);
                if (!list) return null;
                return (
                  <TaskListColumn
                    list={list}
                    tasks={tasks.filter((task) => task.list_id === list.id)}
                    onToggleComplete={handleToggleComplete}
                    onToggleStar={handleToggleStar}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onRenameList={handleRenameList}
                    onDeleteList={handleDeleteList}
                    onChangeSortBy={handleChangeSortBy}
                    onDeleteCompleted={handleDeleteCompleted}
                  />
                );
              })()
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lists.map((list) => (
                  <TaskListColumn
                    key={list.id}
                    list={list}
                    tasks={tasks.filter((task) => task.list_id === list.id)}
                    onToggleComplete={handleToggleComplete}
                    onToggleStar={handleToggleStar}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onRenameList={handleRenameList}
                    onDeleteList={handleDeleteList}
                    onChangeSortBy={handleChangeSortBy}
                    onDeleteCompleted={handleDeleteCompleted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
