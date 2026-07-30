export type SortOption = "my_order" | "date" | "deadline" | "starred_recently" | "title";

export type TaskList = {
  id: string;
  title: string;
  is_default: boolean;
  sort_by: SortOption;
};

export type Task = {
  id: string;
  list_id: string;
  title: string;
  is_completed: boolean;
  is_starred: boolean;
  starred_at: string | null;
  due_date: string | null;
  order_index: number;
  created_at: string;
  completed_at: string | null;
};

export const SORT_LABELS: Record<SortOption, string> = {
  my_order: "ترتيبي (My order)",
  date: "بالتاريخ",
  deadline: "بالموعد النهائي",
  starred_recently: "الأحدث تمييزًا بنجمة",
  title: "أبجدي (العنوان)",
};

export function sortTasks(tasks: Task[], sortBy: SortOption): Task[] {
  const copy = [...tasks];
  switch (sortBy) {
    case "date":
      return copy.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case "deadline":
      return copy.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    case "starred_recently":
      return copy.sort((a, b) => {
        if (a.is_starred && !b.is_starred) return -1;
        if (!a.is_starred && b.is_starred) return 1;
        if (a.starred_at && b.starred_at) return b.starred_at.localeCompare(a.starred_at);
        return 0;
      });
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    case "my_order":
    default:
      return copy.sort((a, b) => a.order_index - b.order_index);
  }
}
