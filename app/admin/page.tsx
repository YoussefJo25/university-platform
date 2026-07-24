"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BOOK_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/object/public/books/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

type Year = { id: number; name: string; year_number: number };
type Course = { id: number; name: string; description: string | null; year_id: number };
type Book = { id: number; title: string; author: string | null; file_url: string | null; course_id: number };
type Playlist = {
  id: number;
  title: string;
  youtube_url: string;
  course_id: number;
  order_index: number;
};

type TabKey = "courses" | "books" | "playlists";

const tabs: { key: TabKey; label: string }[] = [
  { key: "courses", label: "المواد" },
  { key: "books", label: "الكتب" },
  { key: "playlists", label: "الفيديوهات" },
];

const inputClasses =
  "w-full rounded-xl border border-navy/15 px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-turquoise";

export default function AdminPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabKey>("courses");
  const [years, setYears] = useState<Year[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const [yearsRes, coursesRes, booksRes, playlistsRes] = await Promise.all([
      supabase.from("years").select("id, name, year_number").order("year_number"),
      supabase.from("courses").select("id, name, description, year_id").order("name"),
      supabase.from("books").select("id, title, author, file_url, course_id").order("title"),
      supabase
        .from("playlists")
        .select("id, title, youtube_url, course_id, order_index")
        .order("order_index")
        .order("title"),
    ]);

    if (yearsRes.error || coursesRes.error || booksRes.error || playlistsRes.error) {
      setError("حدث خطأ أثناء تحميل البيانات.");
    } else {
      setYears((yearsRes.data ?? []) as Year[]);
      setCourses((coursesRes.data ?? []) as Course[]);
      setBooks((booksRes.data ?? []) as Book[]);
      setPlaylists((playlistsRes.data ?? []) as Playlist[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-white sm:text-4xl">لوحة تحكم الأدمن</h1>
        <p className="mt-3 text-sm text-white/90 sm:text-base">
          إضافة وتعديل وحذف المواد والكتب وقوائم الفيديوهات
        </p>
      </section>

      <section className="flex-1 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex w-full rounded-full border border-navy/10 bg-navy/5 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-6 ${
                  activeTab === tab.key
                    ? "bg-gradient-to-l from-navy to-turquoise text-white shadow-sm"
                    : "text-navy/70 hover:text-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="mt-6 text-center text-sm text-navy/60">جارٍ التحميل...</p>
          ) : (
            <div className="mt-6">
              {activeTab === "courses" && (
                <CoursesTab years={years} courses={courses} supabase={supabase} onChange={loadAll} />
              )}
              {activeTab === "books" && (
                <BooksTab courses={courses} books={books} supabase={supabase} onChange={loadAll} />
              )}
              {activeTab === "playlists" && (
                <PlaylistsTab
                  courses={courses}
                  playlists={playlists}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type SupabaseClient = ReturnType<typeof createClient>;

function CoursesTab({
  years,
  courses,
  supabase,
  onChange,
}: {
  years: Year[];
  courses: Course[];
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const empty: { name: string; description: string; year_id: number | string } = {
    name: "",
    description: "",
    year_id: years[0]?.id ?? "",
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function startEdit(course: Course) {
    setEditingId(course.id);
    setForm({ name: course.name, description: course.description ?? "", year_id: course.year_id });
  }

  function resetForm() {
    setEditingId(null);
    setForm(empty);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description || null,
      year_id: Number(form.year_id),
    };

    const { error } = editingId
      ? await supabase.from("courses").update(payload).eq("id", editingId)
      : await supabase.from("courses").insert(payload);

    setSaving(false);

    if (!error) {
      resetForm();
      onChange();
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
    await supabase.from("courses").delete().eq("id", id);
    onChange();
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-navy/10 p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-navy">
          {editingId ? "تعديل مادة" : "إضافة مادة جديدة"}
        </h2>

        <input
          required
          placeholder="اسم المادة"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClasses}
        />
        <textarea
          placeholder="الوصف"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClasses}
          rows={3}
        />
        <select
          required
          value={form.year_id}
          onChange={(e) => setForm({ ...form, year_id: e.target.value })}
          className={inputClasses}
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-navy/60 hover:text-navy"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {courses.map((course) => (
          <li
            key={course.id}
            className="flex flex-col gap-3 rounded-xl border border-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-navy">{course.name}</p>
              <p className="text-sm text-navy/60">
                {years.find((y) => y.id === course.year_id)?.name}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => startEdit(course)}
                className="text-sm font-medium text-turquoise hover:underline"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => handleDelete(course.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BooksTab({
  courses,
  books,
  supabase,
  onChange,
}: {
  courses: Course[];
  books: Book[];
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const empty: { title: string; author: string; course_id: number | string } = {
    title: "",
    author: "",
    course_id: courses[0]?.id ?? "",
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function startEdit(book: Book) {
    setEditingId(book.id);
    setForm({ title: book.title, author: book.author ?? "", course_id: book.course_id });
    setExistingFileUrl(book.file_url);
    setFile(null);
    setFormError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(empty);
    setExistingFileUrl(null);
    setFile(null);
    setFormError(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFormError(null);

    if (!selected) {
      setFile(null);
      return;
    }

    const isPdf = selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFormError("الملف لازم يكون بصيغة PDF فقط.");
      event.target.value = "";
      setFile(null);
      return;
    }

    if (selected.size > MAX_BOOK_FILE_SIZE) {
      setFormError("حجم الملف أكبر من الحد المسموح به (20 ميجابايت).");
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selected);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!editingId && !file) {
      setFormError("من فضلك اختر ملف PDF لرفعه.");
      return;
    }

    setSaving(true);

    let fileUrl = existingFileUrl;

    if (file) {
      const path = `${form.course_id}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("books").upload(path, file);

      if (uploadError) {
        setSaving(false);
        setFormError(`فشل رفع الملف: ${uploadError.message}`);
        return;
      }

      fileUrl = supabase.storage.from("books").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      title: form.title,
      author: form.author || null,
      file_url: fileUrl,
      course_id: Number(form.course_id),
    };

    const { error } = editingId
      ? await supabase.from("books").update(payload).eq("id", editingId)
      : await supabase.from("books").insert(payload);

    setSaving(false);

    if (error) {
      setFormError(`فشل حفظ الكتاب: ${error.message}`);
      return;
    }

    resetForm();
    onChange();
  }

  async function handleDelete(book: Book) {
    if (!confirm("هل أنت متأكد من حذف هذا الكتاب؟")) return;

    if (book.file_url) {
      const path = getStoragePathFromPublicUrl(book.file_url);
      if (path) {
        await supabase.storage.from("books").remove([path]);
      }
    }

    await supabase.from("books").delete().eq("id", book.id);
    onChange();
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-navy/10 p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-navy">{editingId ? "تعديل كتاب" : "إضافة كتاب جديد"}</h2>

        <input
          required
          placeholder="عنوان الكتاب"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClasses}
        />
        <input
          placeholder="المؤلف"
          value={form.author}
          onChange={(e) => setForm({ ...form, author: e.target.value })}
          className={inputClasses}
        />
        <select
          required
          value={form.course_id}
          onChange={(e) => setForm({ ...form, course_id: e.target.value })}
          className={inputClasses}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        <div>
          <label htmlFor="book-file" className="mb-1.5 block text-sm font-medium text-navy">
            ملف الكتاب (PDF، بحد أقصى 20 ميجابايت)
          </label>
          <input
            id="book-file"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className={inputClasses}
          />
          {editingId && existingFileUrl && !file && (
            <p className="mt-2 text-sm text-navy/60">
              الملف الحالي:{" "}
              <a
                href={existingFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-turquoise hover:underline"
              >
                فتح الملف
              </a>{" "}
              — اختر ملفًا جديدًا لاستبداله، أو اتركه لإبقاء الملف الحالي.
            </p>
          )}
          {file && <p className="mt-2 text-sm text-navy/60">الملف المختار: {file.name}</p>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            {saving ? "جارٍ الرفع والحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-navy/60 hover:text-navy"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {books.map((book) => (
          <li
            key={book.id}
            className="flex flex-col gap-3 rounded-xl border border-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-navy">{book.title}</p>
              <p className="text-sm text-navy/60">
                {courses.find((c) => c.id === book.course_id)?.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {book.file_url && (
                <a
                  href={book.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-turquoise hover:underline"
                >
                  تحميل
                </a>
              )}
              <button
                type="button"
                onClick={() => startEdit(book)}
                className="text-sm font-medium text-turquoise hover:underline"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => handleDelete(book)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlaylistsTab({
  courses,
  playlists,
  supabase,
  onChange,
}: {
  courses: Course[];
  playlists: Playlist[];
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const empty: {
    title: string;
    youtube_url: string;
    course_id: number | string;
    order_index: number | string;
  } = {
    title: "",
    youtube_url: "",
    course_id: courses[0]?.id ?? "",
    order_index: 0,
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function startEdit(playlist: Playlist) {
    setEditingId(playlist.id);
    setForm({
      title: playlist.title,
      youtube_url: playlist.youtube_url,
      course_id: playlist.course_id,
      order_index: playlist.order_index,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(empty);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      youtube_url: form.youtube_url,
      course_id: Number(form.course_id),
      order_index: Number(form.order_index) || 0,
    };

    const { error } = editingId
      ? await supabase.from("playlists").update(payload).eq("id", editingId)
      : await supabase.from("playlists").insert(payload);

    setSaving(false);

    if (!error) {
      resetForm();
      onChange();
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف قائمة التشغيل؟")) return;
    await supabase.from("playlists").delete().eq("id", id);
    onChange();
  }

  async function handleReorder(id: number, newOrder: number) {
    await supabase.from("playlists").update({ order_index: newOrder }).eq("id", id);
    onChange();
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-navy/10 p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-navy">
          {editingId ? "تعديل قائمة تشغيل" : "إضافة قائمة تشغيل جديدة"}
        </h2>

        <input
          required
          placeholder="عنوان القائمة"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClasses}
        />
        <input
          required
          placeholder="رابط اليوتيوب"
          value={form.youtube_url}
          onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
          className={inputClasses}
        />
        <select
          required
          value={form.course_id}
          onChange={(e) => setForm({ ...form, course_id: e.target.value })}
          className={inputClasses}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
        <div>
          <label htmlFor="order_index" className="mb-1.5 block text-sm font-medium text-navy">
            ترتيب العرض (اختياري)
          </label>
          <input
            id="order_index"
            type="number"
            placeholder="0"
            value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: e.target.value })}
            className={inputClasses}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-navy/60 hover:text-navy"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {playlists.map((playlist) => (
          <li
            key={playlist.id}
            className="flex flex-col gap-3 rounded-xl border border-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-navy">{playlist.title}</p>
              <p className="text-sm text-navy/60">
                {courses.find((c) => c.id === playlist.course_id)?.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-navy/60">
                الترتيب
                <input
                  type="number"
                  defaultValue={playlist.order_index}
                  onBlur={(e) => {
                    const value = Number(e.target.value) || 0;
                    if (value !== playlist.order_index) handleReorder(playlist.id, value);
                  }}
                  className="w-16 rounded-lg border border-navy/15 px-2 py-1 text-sm text-navy outline-none focus:border-turquoise"
                />
              </label>
              <button
                type="button"
                onClick={() => startEdit(playlist)}
                className="text-sm font-medium text-turquoise hover:underline"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => handleDelete(playlist.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
