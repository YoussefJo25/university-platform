"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_SITE_SETTINGS,
  mergeSiteSettingsRows,
  type SiteSettings,
} from "@/lib/siteSettings";

const MAX_BOOK_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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
type Book = {
  id: number;
  title: string;
  author: string | null;
  file_url: string | null;
  course_id: number;
  folder_id: number | null;
};
type BookFolder = { id: number; course_id: number; name: string; order_index: number };
type Playlist = {
  id: number;
  title: string;
  youtube_url: string;
  course_id: number;
  order_index: number;
};

type TabKey = "courses" | "books" | "playlists" | "settings";

const tabs: { key: TabKey; label: string }[] = [
  { key: "courses", label: "المواد" },
  { key: "books", label: "الكتب" },
  { key: "playlists", label: "الفيديوهات" },
  { key: "settings", label: "إعدادات الموقع" },
];

const inputClasses =
  "w-full rounded-xl border border-navy/15 px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-turquoise";

export default function AdminPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabKey>("courses");
  const [years, setYears] = useState<Year[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [folders, setFolders] = useState<BookFolder[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const [yearsRes, coursesRes, booksRes, foldersRes, playlistsRes, settingsRes] =
      await Promise.all([
        supabase.from("years").select("id, name, year_number").order("year_number"),
        supabase.from("courses").select("id, name, description, year_id").order("name"),
        supabase
          .from("books")
          .select("id, title, author, file_url, course_id, folder_id")
          .order("title"),
        supabase
          .from("book_folders")
          .select("id, course_id, name, order_index")
          .order("order_index")
          .order("name"),
        supabase
          .from("playlists")
          .select("id, title, youtube_url, course_id, order_index")
          .order("order_index")
          .order("title"),
        supabase.from("site_settings").select("key, value"),
      ]);

    if (yearsRes.error || coursesRes.error || booksRes.error || foldersRes.error || playlistsRes.error) {
      setError("حدث خطأ أثناء تحميل البيانات.");
    } else {
      setYears((yearsRes.data ?? []) as Year[]);
      setCourses((coursesRes.data ?? []) as Course[]);
      setBooks((booksRes.data ?? []) as Book[]);
      setFolders((foldersRes.data ?? []) as BookFolder[]);
      setPlaylists((playlistsRes.data ?? []) as Playlist[]);
    }

    // إعدادات الموقع منفصلة عن باقي البيانات عشان لو جدول site_settings
    // لسه معملوش migration، باقي التابات تفضل شغالة عادي بالقيم الافتراضية
    if (!settingsRes.error) {
      setSettings(
        mergeSiteSettingsRows((settingsRes.data ?? []) as { key: string; value: string | null }[])
      );
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
                <BooksTab
                  courses={courses}
                  books={books}
                  folders={folders}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "playlists" && (
                <PlaylistsTab
                  courses={courses}
                  playlists={playlists}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "settings" && (
                <SettingsTab settings={settings} supabase={supabase} onChange={loadAll} />
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
  folders,
  supabase,
  onChange,
}: {
  courses: Course[];
  books: Book[];
  folders: BookFolder[];
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;
  const unfiledBooks = books.filter((b) => !b.folder_id);

  async function handleDeleteBook(book: Book) {
    if (!confirm("هل أنت متأكد من حذف هذا الملف؟")) return;

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
      <FolderManager
        courses={courses}
        folders={folders}
        supabase={supabase}
        onChange={onChange}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />

      {selectedFolder && (
        <div className="rounded-2xl border border-navy/10 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">ملفات فولدر: {selectedFolder.name}</h2>
            <button
              type="button"
              onClick={() => setSelectedFolderId(null)}
              className="text-sm font-medium text-navy/60 hover:text-navy"
            >
              إغلاق
            </button>
          </div>

          <BookUploadForm folder={selectedFolder} supabase={supabase} onChange={onChange} />

          <BookList
            books={books.filter((b) => b.folder_id === selectedFolder.id)}
            emptyMessage="لا توجد ملفات في هذا الفولدر بعد"
            onDelete={handleDeleteBook}
          />
        </div>
      )}

      {unfiledBooks.length > 0 && (
        <div className="rounded-2xl border border-navy/10 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-navy">ملفات عامة (بدون فولدر)</h2>
          <p className="mt-1 text-sm text-navy/60">
            ملفات اتضافت قبل نظام الفولدرات، لسه موجودة ومتاحة للطلاب.
          </p>
          <BookList
            books={unfiledBooks}
            emptyMessage=""
            onDelete={handleDeleteBook}
            courses={courses}
          />
        </div>
      )}
    </div>
  );
}

function FolderManager({
  courses,
  folders,
  supabase,
  onChange,
  selectedFolderId,
  onSelectFolder,
}: {
  courses: Course[];
  folders: BookFolder[];
  supabase: SupabaseClient;
  onChange: () => void;
  selectedFolderId: number | null;
  onSelectFolder: (id: number | null) => void;
}) {
  const empty: { name: string; course_id: number | string } = {
    name: "",
    course_id: courses[0]?.id ?? "",
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function startEdit(folder: BookFolder) {
    setEditingId(folder.id);
    setForm({ name: folder.name, course_id: folder.course_id });
  }

  function resetForm() {
    setEditingId(null);
    setForm(empty);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const payload = { name: form.name, course_id: Number(form.course_id) };

    const { error } = editingId
      ? await supabase.from("book_folders").update(payload).eq("id", editingId)
      : await supabase.from("book_folders").insert(payload);

    setSaving(false);

    if (!error) {
      resetForm();
      onChange();
    }
  }

  async function handleDelete(folder: BookFolder) {
    if (!confirm(`هل أنت متأكد من حذف فولدر "${folder.name}"؟ سيتم حذف كل الملفات بداخله.`)) return;

    const { data: folderBooks } = await supabase
      .from("books")
      .select("file_url")
      .eq("folder_id", folder.id);

    const paths = (folderBooks ?? [])
      .map((b) => (b.file_url ? getStoragePathFromPublicUrl(b.file_url) : null))
      .filter((p): p is string => Boolean(p));

    if (paths.length > 0) {
      await supabase.storage.from("books").remove(paths);
    }

    await supabase.from("book_folders").delete().eq("id", folder.id);

    if (selectedFolderId === folder.id) onSelectFolder(null);
    onChange();
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-navy/10 p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-navy">
          {editingId ? "تعديل فولدر" : "إضافة فولدر جديد"}
        </h2>

        <input
          required
          placeholder="اسم الفولدر (مثلاً: ملازم، تلخيصات)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة فولدر"}
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
        {folders.length === 0 ? (
          <p className="text-sm text-navy/60">لا توجد فولدرات مضافة بعد</p>
        ) : (
          folders.map((folder) => (
            <li
              key={folder.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                folder.id === selectedFolderId ? "border-turquoise bg-turquoise/5" : "border-navy/10"
              }`}
            >
              <div>
                <p className="font-semibold text-navy">{folder.name}</p>
                <p className="text-sm text-navy/60">
                  {courses.find((c) => c.id === folder.course_id)?.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectFolder(folder.id === selectedFolderId ? null : folder.id)}
                  className="text-sm font-medium text-turquoise hover:underline"
                >
                  {folder.id === selectedFolderId ? "إخفاء الملفات" : "إدارة الملفات"}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(folder)}
                  className="text-sm font-medium text-turquoise hover:underline"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(folder)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  حذف
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function BookUploadForm({
  folder,
  supabase,
  onChange,
}: {
  folder: BookFolder;
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

    if (!file) {
      setFormError("من فضلك اختر ملف PDF لرفعه.");
      return;
    }

    setSaving(true);

    const path = `${folder.course_id}/${folder.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("books").upload(path, file);

    if (uploadError) {
      setSaving(false);
      setFormError(`فشل رفع الملف: ${uploadError.message}`);
      return;
    }

    const fileUrl = supabase.storage.from("books").getPublicUrl(path).data.publicUrl;

    const { error } = await supabase.from("books").insert({
      title,
      author: author || null,
      file_url: fileUrl,
      course_id: folder.course_id,
      folder_id: folder.id,
    });

    setSaving(false);

    if (error) {
      setFormError(`فشل حفظ الملف: ${error.message}`);
      return;
    }

    setTitle("");
    setAuthor("");
    setFile(null);
    onChange();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-navy/5 p-4"
    >
      <input
        required
        placeholder="عنوان الملف"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputClasses}
      />
      <input
        placeholder="المؤلف (اختياري)"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        className={inputClasses}
      />
      <div>
        <label htmlFor={`book-file-${folder.id}`} className="mb-1.5 block text-sm font-medium text-navy">
          ملف PDF (بحد أقصى 20 ميجابايت)
        </label>
        <input
          id={`book-file-${folder.id}`}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className={inputClasses}
        />
        {file && <p className="mt-2 text-sm text-navy/60">الملف المختار: {file.name}</p>}
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-fit items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
      >
        {saving ? "جارٍ الرفع..." : "رفع الملف"}
      </button>
    </form>
  );
}

function BookList({
  books,
  emptyMessage,
  onDelete,
  courses,
}: {
  books: Book[];
  emptyMessage: string;
  onDelete: (book: Book) => void;
  courses?: Course[];
}) {
  if (books.length === 0) {
    return emptyMessage ? <p className="mt-4 text-sm text-navy/60">{emptyMessage}</p> : null;
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {books.map((book) => (
        <li
          key={book.id}
          className="flex flex-col gap-3 rounded-xl border border-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-navy">{book.title}</p>
            {book.author && <p className="text-sm text-navy/60">{book.author}</p>}
            {courses && (
              <p className="text-sm text-navy/60">
                {courses.find((c) => c.id === book.course_id)?.name}
              </p>
            )}
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
              onClick={() => onDelete(book)}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              حذف
            </button>
          </div>
        </li>
      ))}
    </ul>
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

function SettingsTab({
  settings,
  supabase,
  onChange,
}: {
  settings: SiteSettings;
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [form, setForm] = useState(settings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function updateField<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccessMessage(false);
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFormError(null);
    setSuccessMessage(false);

    if (!selected) {
      setLogoFile(null);
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(selected.type)) {
      setFormError("اللوجو لازم يكون صورة بصيغة PNG أو JPEG أو WebP.");
      event.target.value = "";
      setLogoFile(null);
      return;
    }

    if (selected.size > MAX_LOGO_FILE_SIZE) {
      setFormError("حجم الصورة أكبر من الحد المسموح به (2 ميجابايت).");
      event.target.value = "";
      setLogoFile(null);
      return;
    }

    setLogoFile(selected);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(false);

    if (form.hero_title.length > 100) {
      setFormError("عنوان الصفحة الرئيسية لازم يكون 100 حرف أو أقل.");
      return;
    }

    if (form.hero_subtitle.length > 300) {
      setFormError("وصف الصفحة الرئيسية لازم يكون 300 حرف أو أقل.");
      return;
    }

    setSaving(true);

    let logoUrl = form.logo_url;

    if (logoFile) {
      const path = `logo/${Date.now()}-${sanitizeFileName(logoFile.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(path, logoFile);

      if (uploadError) {
        setSaving(false);
        setFormError(`فشل رفع اللوجو: ${uploadError.message}`);
        return;
      }

      logoUrl = supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
    }

    const finalSettings: SiteSettings = { ...form, logo_url: logoUrl };
    const rows = Object.entries(finalSettings).map(([key, value]) => ({ key, value }));

    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });

    setSaving(false);

    if (error) {
      setFormError(`فشل حفظ الإعدادات: ${error.message}`);
      return;
    }

    setLogoFile(null);
    setSuccessMessage(true);
    onChange();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="rounded-2xl border border-navy/10 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-navy">الهوية</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">اسم الجامعة</label>
            <input
              required
              value={form.university_name}
              onChange={(e) => updateField("university_name", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              اللوجو (PNG أو JPEG أو WebP، بحد أقصى 2 ميجابايت)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoChange}
              className={inputClasses}
            />
            {form.logo_url && !logoFile && (
              <p className="mt-2 text-sm text-navy/60">
                اللوجو الحالي:{" "}
                <a
                  href={form.logo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-turquoise hover:underline"
                >
                  عرض
                </a>
              </p>
            )}
            {logoFile && (
              <p className="mt-2 text-sm text-navy/60">اللوجو المختار: {logoFile.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/10 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-navy">الصفحة الرئيسية</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              عنوان الـ Hero ({form.hero_title.length}/100)
            </label>
            <input
              required
              maxLength={100}
              value={form.hero_title}
              onChange={(e) => updateField("hero_title", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              الوصف ({form.hero_subtitle.length}/300)
            </label>
            <textarea
              required
              maxLength={300}
              rows={3}
              value={form.hero_subtitle}
              onChange={(e) => updateField("hero_subtitle", e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/10 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-navy">التواصل</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              إيميل الدعم الفني
            </label>
            <input
              type="email"
              required
              value={form.support_email}
              onChange={(e) => updateField("support_email", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              رقم الهاتف (اختياري)
            </label>
            <input
              value={form.support_phone}
              onChange={(e) => updateField("support_phone", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              رابط فيسبوك (اختياري)
            </label>
            <input
              value={form.social_facebook}
              onChange={(e) => updateField("social_facebook", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              رابط تويتر (اختياري)
            </label>
            <input
              value={form.social_twitter}
              onChange={(e) => updateField("social_twitter", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              رابط انستجرام (اختياري)
            </label>
            <input
              value={form.social_instagram}
              onChange={(e) => updateField("social_instagram", e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/10 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-navy">الفوتر</h2>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-navy">نص حقوق الملكية</label>
          <input
            required
            value={form.footer_text}
            onChange={(e) => updateField("footer_text", e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}
      {successMessage && <p className="text-sm text-green-600">تم حفظ الإعدادات بنجاح.</p>}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>
    </form>
  );
}
