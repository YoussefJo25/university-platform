"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_SITE_SETTINGS,
  mergeSiteSettingsRows,
  type SiteSettings,
} from "@/lib/siteSettings";
import { ROLE_FALLBACK_TITLE, ROLE_ORDER, type LeadershipMember, type RoleKey } from "@/lib/leadership";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import ContentTree from "@/components/admin/ContentTree";

const MAX_BOOK_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_BIO_LENGTH = 500;

// بنستخدم history API مباشرة (مش next/navigation) عشان تحديث الرابط ده
// مجرد "بوكماركينج" بصري بعد كل اختيار — مفيش داعي لأي navigation حقيقية
// أو لإعادة تشغيل أي data fetching بتاع الصفحة.
function getUrlParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

function setUrlParam(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (value === null) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/object/public/books/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

function getStoragePathFromSiteAssetsUrl(publicUrl: string): string | null {
  const marker = "/object/public/site-assets/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

type University = {
  id: number;
  name: string;
  logo_url: string | null;
  description: string | null;
  order_index: number;
};
type Year = { id: number; name: string; year_number: number; university_id: number | null };
type Term = { id: number; year_id: number; term_number: number; name: string };
type CourseCategory = "academic" | "learning_path";
type Course = {
  id: number;
  name: string;
  description: string | null;
  year_id: number | null;
  term_id: number | null;
  category: CourseCategory;
  parent_course_id: number | null;
  view_count: number;
  order_index: number;
};
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
  group_name: string | null;
};
type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  created_at: string;
  university_id: number | null;
  year_id: number | null;
  is_active: boolean;
  gender: string | null;
};
type YearManagerRow = {
  id: number;
  profile_id: string;
  year_id: number;
  years: {
    id: number;
    name: string;
    year_number: number;
    university_id: number;
    universities: { name: string } | null;
  } | null;
};
type ManagedYear = { id: number; name: string; universityName: string };
type AuditLogRow = {
  id: number;
  actor_name: string;
  action_type: string;
  target_description: string;
  created_at: string;
};
type ContentReportRow = {
  id: number;
  course_id: number;
  item_type: "video" | "book" | "course";
  item_title: string;
  issue_type: "broken_link" | "wrong_content" | "other";
  description: string | null;
  status: "open" | "resolved";
  created_at: string;
};

// التابات دي محصورة على super_admin بس (تختفي تمامًا من واجهة year_admin)
const SUPER_ADMIN_ONLY_TABS: TabKey[] = [
  "universities",
  "users",
  "settings",
  "leadership",
  "auditLog",
  "reports",
  "stats",
];

type TabKey =
  | "universities"
  | "users"
  | "courses"
  | "books"
  | "playlists"
  | "settings"
  | "leadership"
  | "auditLog"
  | "reports"
  | "stats";

const tabs: { key: TabKey; label: string }[] = [
  { key: "universities", label: "الجامعات" },
  { key: "users", label: "المستخدمين" },
  { key: "courses", label: "المواد" },
  { key: "books", label: "الكتب" },
  { key: "playlists", label: "الفيديوهات" },
  { key: "settings", label: "إعدادات الموقع" },
  { key: "leadership", label: "القيادة" },
  { key: "auditLog", label: "سجل النشاط" },
  { key: "reports", label: "البلاغات" },
  { key: "stats", label: "الإحصائيات" },
];

const inputClasses =
  "w-full rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-gold";

export default function AdminPage() {
  const supabase = createClient();

  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    const fromUrl = getUrlParam("tab") as TabKey | null;
    return fromUrl && tabs.some((t) => t.key === fromUrl) ? fromUrl : "courses";
  });
  const [universities, setUniversities] = useState<University[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [folders, setFolders] = useState<BookFolder[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [leadershipMembers, setLeadershipMembers] = useState<LeadershipMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [yearManagers, setYearManagers] = useState<YearManagerRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogRow[]>([]);
  const [contentReports, setContentReports] = useState<ContentReportRow[]>([]);
  const [activeManagedYearId, setActiveManagedYearId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // بيتفعّل مرة واحدة بس أول ما أي تحميل ينجح، وبيفضل true بعد كده — عشان
  // الشجرة/الفورمات مايترمنتيش (يفقدوا الـ state المحلي زي العقد المفتوحة
  // والمادة المختارة) كل مرة onChange بيعمل reload كامل للبيانات بعد أي
  // إضافة/تعديل. الرسالة الكبيرة "جارٍ التحميل..." تظهر أول مرة بس؛ بعد
  // كده أي reload لاحق بيفضل التاب زي ما هو وبيوضّح مؤشر بسيط مكانه.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setActiveTab(tab: TabKey) {
    setActiveTabState(tab);
    setUrlParam("tab", tab);
    // كل تاب بيستخدم مفتاح خاص بيه (courseId لتاب المواد، booksCourseId
    // لتاب الكتب، playlistsCourseId لتاب الفيديوهات) عشان مايبقاش فيه أي
    // احتمال إن تاب يقرأ اختيار مادة كان لتاب تاني بالغلط. بنصفّرهم
    // الثلاثة هنا كمان كل ما نغيّر تاب، عشان كل تاب يبدأ بلا اختيار
    // موروث من قبل كده.
    setUrlParam("courseId", null);
    setUrlParam("booksCourseId", null);
    setUrlParam("playlistsCourseId", null);
  }

  async function fetchCourses() {
    const withOrder = await supabase
      .from("courses")
      .select(
        "id, name, description, year_id, term_id, category, parent_course_id, view_count, order_index"
      )
      .order("order_index")
      .order("name");

    if (!withOrder.error) return withOrder;

    // order_index ممكن يكون لسه معملوش migration (course_order_setup.sql)
    const withViewCount = await supabase
      .from("courses")
      .select("id, name, description, year_id, term_id, category, parent_course_id, view_count")
      .order("name");

    if (!withViewCount.error) {
      return { ...withViewCount, data: (withViewCount.data ?? []).map((c) => ({ ...c, order_index: 0 })) };
    }

    // view_count ممكن يكون لسه معملوش migration (content_stats_setup.sql)
    const full = await supabase
      .from("courses")
      .select("id, name, description, year_id, term_id, category, parent_course_id")
      .order("name");

    if (!full.error) {
      return {
        ...full,
        data: (full.data ?? []).map((c) => ({ ...c, view_count: 0, order_index: 0 })),
      };
    }

    // parent_course_id ممكن يكون لسه معملوش migration (course_sections_setup.sql)
    // نرجع لاستعلام بدونه عشان باقي التاب مايتوقفش بالكامل
    const withoutParent = await supabase
      .from("courses")
      .select("id, name, description, year_id, term_id, category")
      .order("name");

    if (!withoutParent.error) {
      return {
        ...withoutParent,
        data: (withoutParent.data ?? []).map((c) => ({
          ...c,
          parent_course_id: null,
          view_count: 0,
          order_index: 0,
        })),
      };
    }

    return withOrder;
  }

  async function fetchPlaylists() {
    const full = await supabase
      .from("playlists")
      .select("id, title, youtube_url, course_id, order_index, group_name")
      .order("order_index")
      .order("title");

    if (!full.error) return full;

    // group_name ممكن يكون لسه معملوش migration (playlist_groups_setup.sql)
    // نرجع لاستعلام بدونه عشان باقي التاب مايتوقفش بالكامل
    const withoutGroupName = await supabase
      .from("playlists")
      .select("id, title, youtube_url, course_id, order_index")
      .order("order_index")
      .order("title");

    if (!withoutGroupName.error) {
      return {
        ...withoutGroupName,
        data: (withoutGroupName.data ?? []).map((p) => ({ ...p, group_name: null })),
      };
    }

    return full;
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    const [
      userRes,
      universitiesRes,
      yearsRes,
      termsRes,
      coursesRes,
      booksRes,
      foldersRes,
      playlistsRes,
      settingsRes,
      leadershipRes,
      profilesRes,
      yearManagersRes,
      auditLogRes,
      contentReportsRes,
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("universities")
        .select("id, name, logo_url, description, order_index")
        .order("order_index"),
      supabase.from("years").select("id, name, year_number, university_id").order("year_number"),
      supabase.from("terms").select("id, year_id, term_number, name").order("term_number"),
      fetchCourses(),
      supabase
        .from("books")
        .select("id, title, author, file_url, course_id, folder_id")
        .order("title"),
      supabase
        .from("book_folders")
        .select("id, course_id, name, order_index")
        .order("order_index")
        .order("name"),
      fetchPlaylists(),
      supabase.from("site_settings").select("key, value"),
      supabase
        .from("leadership_members")
        .select("id, role_key, name, title, bio, photo_url, order_index")
        .order("order_index"),
      // profiles/year_managers محكومين بـ RLS: year_admin/student بيرجعله
      // صفوفه هو بس، super_admin بيرجعله كل الصفوف — نفس الاستعلام للكل.
      supabase
        .from("profiles")
        .select(
          "id, email, full_name, phone, role, created_at, university_id, year_id, is_active, gender"
        )
        .order("created_at"),
      supabase
        .from("year_managers")
        .select("id, profile_id, year_id, years(id, name, year_number, university_id, universities(name))"),
      supabase
        .from("admin_audit_log")
        .select("id, actor_name, action_type, target_description, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("content_reports")
        .select("id, course_id, item_type, item_title, issue_type, description, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    setCurrentUserId(userRes.data.user?.id ?? null);

    if (
      universitiesRes.error ||
      yearsRes.error ||
      termsRes.error ||
      coursesRes.error ||
      booksRes.error ||
      foldersRes.error ||
      playlistsRes.error
    ) {
      setError("حدث خطأ أثناء تحميل البيانات.");
    } else {
      setUniversities((universitiesRes.data ?? []) as University[]);
      setYears((yearsRes.data ?? []) as Year[]);
      setTerms((termsRes.data ?? []) as Term[]);
      setCourses((coursesRes.data ?? []) as Course[]);
      setBooks((booksRes.data ?? []) as Book[]);
      setFolders((foldersRes.data ?? []) as BookFolder[]);
      setPlaylists((playlistsRes.data ?? []) as Playlist[]);
    }

    // إعدادات الموقع وبيانات القيادة منفصلين عن باقي البيانات عشان لو
    // migration معملوش لسه، باقي التابات تفضل شغالة عادي بالقيم الافتراضية
    if (!settingsRes.error) {
      setSettings(
        mergeSiteSettingsRows((settingsRes.data ?? []) as { key: string; value: string | null }[])
      );
    }

    if (!leadershipRes.error) {
      setLeadershipMembers((leadershipRes.data ?? []) as LeadershipMember[]);
    }

    if (!profilesRes.error) {
      setProfiles((profilesRes.data ?? []) as ProfileRow[]);
    }

    if (!auditLogRes.error) {
      setAuditLog((auditLogRes.data ?? []) as AuditLogRow[]);
    }

    if (!contentReportsRes.error) {
      setContentReports((contentReportsRes.data ?? []) as ContentReportRow[]);
    }

    if (!yearManagersRes.error) {
      const rows = (yearManagersRes.data ?? []) as unknown as YearManagerRow[];
      setYearManagers(rows);
      setActiveManagedYearId((prev) => {
        if (prev && rows.some((row) => row.year_id === prev)) return prev;
        const mine = rows.filter((row) => row.profile_id === userRes.data.user?.id);
        return mine[0]?.year_id ?? null;
      });
    }

    setLoading(false);
    setHasLoadedOnce(true);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewerRole = profiles.find((p) => p.id === currentUserId)?.role ?? null;
  const isSuperAdmin = viewerRole === "super_admin";
  const isYearAdmin = viewerRole === "year_admin";

  const managedYears: ManagedYear[] = yearManagers
    .filter((row) => row.profile_id === currentUserId && row.years)
    .map((row) => ({
      id: row.years!.id,
      name: row.years!.name,
      universityName: row.years!.universities?.name ?? "",
    }));

  const visibleTabs = isSuperAdmin
    ? tabs
    : tabs.filter((tab) => !SUPER_ADMIN_ONLY_TABS.includes(tab.key));

  useEffect(() => {
    if (viewerRole === null) return;
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key ?? "courses");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerRole, activeManagedYearId]);

  // نطاق أدمن الفرقة: بس الفرقة اللي مختارها حاليًا من الـ switcher (لو
  // بيدير أكتر من فرقة). super_admin مالوش أي تقييد (arrays كاملة زي ما هي).
  const scopedYear = isYearAdmin ? years.find((y) => y.id === activeManagedYearId) ?? null : null;
  const visibleUniversities = isYearAdmin
    ? universities.filter((u) => u.id === scopedYear?.university_id)
    : universities;
  const visibleYears = isYearAdmin ? (scopedYear ? [scopedYear] : []) : years;
  const visibleCourses = isYearAdmin
    ? courses.filter((c) => c.year_id === activeManagedYearId)
    : courses;
  const visibleCourseIds = new Set(visibleCourses.map((c) => c.id));
  const visibleFolders = isYearAdmin
    ? folders.filter((f) => visibleCourseIds.has(f.course_id))
    : folders;
  const visibleBooks = isYearAdmin ? books.filter((b) => visibleCourseIds.has(b.course_id)) : books;
  const visiblePlaylists = isYearAdmin
    ? playlists.filter((p) => visibleCourseIds.has(p.course_id))
    : playlists;

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-ink sm:text-4xl">لوحة تحكم الأدمن</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">
          إضافة وتعديل وحذف المواد والكتب وقوائم الفيديوهات
        </p>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <div
          className={`mx-auto ${
            activeTab === "courses" || activeTab === "books" || activeTab === "playlists"
              ? "max-w-6xl"
              : "max-w-4xl"
          }`}
        >
          {isYearAdmin && managedYears.length > 0 && (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-ink">
                بتدير حاليًا:{" "}
                {managedYears.find((y) => y.id === activeManagedYearId)?.universityName}
                {" — "}
                {managedYears.find((y) => y.id === activeManagedYearId)?.name}
              </span>
              {managedYears.length > 1 && (
                <select
                  value={activeManagedYearId ?? ""}
                  onChange={(e) => setActiveManagedYearId(Number(e.target.value))}
                  className="w-full rounded-lg border border-subtle bg-card px-3 py-1.5 text-sm text-ink outline-none focus:border-gold sm:w-auto"
                >
                  {managedYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.universityName} — {y.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex w-full rounded-full border border-subtle bg-panel p-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-6 ${
                  activeTab === tab.key
                    ? "bg-gold text-gold-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}

          {!hasLoadedOnce ? (
            <p className="mt-6 text-center text-sm text-muted">جارٍ التحميل...</p>
          ) : (
            <div className="mt-6">
              {loading && (
                <p className="mb-3 text-xs text-muted">جارٍ التحديث...</p>
              )}
              {activeTab === "universities" && (
                <UniversitiesTab
                  universities={universities}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "users" && (
                <UsersTab
                  profiles={profiles}
                  yearManagers={yearManagers}
                  universities={universities}
                  years={years}
                  currentUserId={currentUserId}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "courses" && (
                <CoursesTab
                  universities={visibleUniversities}
                  years={visibleYears}
                  terms={terms}
                  courses={visibleCourses}
                  books={visibleBooks}
                  playlists={visiblePlaylists}
                  restrictToAcademic={isYearAdmin}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "books" && (
                <BooksTab
                  universities={visibleUniversities}
                  years={visibleYears}
                  terms={terms}
                  courses={visibleCourses}
                  books={visibleBooks}
                  folders={visibleFolders}
                  showLearningPath={!isYearAdmin}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "playlists" && (
                <PlaylistsTab
                  universities={visibleUniversities}
                  years={visibleYears}
                  terms={terms}
                  courses={visibleCourses}
                  playlists={visiblePlaylists}
                  showLearningPath={!isYearAdmin}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "settings" && (
                <SettingsTab settings={settings} supabase={supabase} onChange={loadAll} />
              )}
              {activeTab === "leadership" && (
                <LeadershipTab
                  members={leadershipMembers}
                  supabase={supabase}
                  onChange={loadAll}
                />
              )}
              {activeTab === "auditLog" && <AuditLogTab entries={auditLog} />}
              {activeTab === "reports" && (
                <ReportsTab reports={contentReports} supabase={supabase} onChange={loadAll} />
              )}
              {activeTab === "stats" && (
                <StatsTab courses={courses} universities={universities} years={years} />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type SupabaseClient = ReturnType<typeof createClient>;

function UniversitiesTab({
  universities,
  supabase,
  onChange,
}: {
  universities: University[];
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const empty: { name: string; description: string; order_index: number | string } = {
    name: "",
    description: "",
    order_index: universities.length,
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function startEdit(university: University) {
    setEditingId(university.id);
    setForm({
      name: university.name,
      description: university.description ?? "",
      order_index: university.order_index,
    });
    setLogoUrl(university.logo_url);
    setLogoFile(null);
    setFormError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", description: "", order_index: universities.length });
    setLogoUrl(null);
    setLogoFile(null);
    setFormError(null);
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFormError(null);

    if (!selected) {
      setLogoFile(null);
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(selected.type)) {
      setFormError("الشعار لازم يكون صورة بصيغة PNG أو JPEG أو WebP.");
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
    setSaving(true);

    let finalLogoUrl = logoUrl;

    if (logoFile) {
      const path = `universities/${Date.now()}-${sanitizeFileName(logoFile.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(path, logoFile);

      if (uploadError) {
        setSaving(false);
        setFormError(`فشل رفع الشعار: ${uploadError.message}`);
        return;
      }

      finalLogoUrl = supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      logo_url: finalLogoUrl,
      order_index: Number(form.order_index) || 0,
    };

    const { error } = editingId
      ? await supabase.from("universities").update(payload).eq("id", editingId)
      : await supabase.from("universities").insert(payload);

    setSaving(false);

    if (error) {
      setFormError(`فشل حفظ الجامعة: ${error.message}`);
      return;
    }

    resetForm();
    onChange();
  }

  async function handleDelete(university: University) {
    if (
      !confirm(
        `هل أنت متأكد من حذف جامعة "${university.name}"؟ سيتم حذف كل فرقها الدراسية وترميناتها وموادها المرتبطة بها.`
      )
    )
      return;

    if (university.logo_url) {
      const path = getStoragePathFromSiteAssetsUrl(university.logo_url);
      if (path) {
        await supabase.storage.from("site-assets").remove([path]);
      }
    }

    await supabase.from("universities").delete().eq("id", university.id);
    onChange();
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-ink">
          {editingId ? "تعديل جامعة" : "إضافة جامعة جديدة"}
        </h2>

        <input
          required
          placeholder="اسم الجامعة"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClasses}
        />
        <textarea
          placeholder="الوصف (اختياري)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClasses}
          rows={3}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            الشعار (PNG أو JPEG أو WebP، بحد أقصى 2 ميجابايت)
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoChange}
            className={inputClasses}
          />
          {logoUrl && !logoFile && (
            <p className="mt-2 text-sm text-muted">
              الشعار الحالي:{" "}
              <a
                href={logoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gold hover:underline"
              >
                عرض
              </a>
            </p>
          )}
          {logoFile && (
            <p className="mt-2 text-sm text-muted">الشعار المختار: {logoFile.name}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            ترتيب العرض (اختياري)
          </label>
          <input
            type="number"
            value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: e.target.value })}
            className={inputClasses}
          />
        </div>

        {!editingId && (
          <p className="text-xs text-muted">
            هيتم إنشاء 4 فرق دراسية (الأولى إلى الرابعة) وترمين لكل فرقة تلقائيًا عند الإضافة.
          </p>
        )}

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {universities.length === 0 ? (
          <p className="text-sm text-muted">لا توجد جامعات مضافة بعد</p>
        ) : (
          universities.map((university) => (
            <li
              key={university.id}
              className="flex flex-col gap-3 rounded-xl border border-subtle bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-ink">{university.name}</p>
                {university.description && (
                  <p className="text-sm text-muted">{university.description}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(university)}
                  className="text-sm font-medium text-gold hover:underline"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(university)}
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

function UsersTab({
  profiles,
  yearManagers,
  universities,
  years,
  currentUserId,
  supabase,
  onChange,
}: {
  profiles: ProfileRow[];
  yearManagers: YearManagerRow[];
  universities: University[];
  years: Year[];
  currentUserId: string | null;
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assignUniversityId, setAssignUniversityId] = useState<number | string>("");
  const [assignYearId, setAssignYearId] = useState<number | string>("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    universityId: "" as number | string,
    yearId: "" as number | string,
  });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function yearsForUniversity(universityId: number | string): Year[] {
    return years.filter((y) => String(y.university_id) === String(universityId));
  }

  function actorName(): string {
    const actor = profiles.find((p) => p.id === currentUserId);
    return actor?.full_name || actor?.email || "غير معروف";
  }

  async function logAction(actionType: string, targetDescription: string) {
    await supabase.from("admin_audit_log").insert({
      actor_id: currentUserId,
      actor_name: actorName(),
      action_type: actionType,
      target_description: targetDescription,
    });
  }

  function startAssign(userId: string) {
    setFormError(null);
    setEditingUserId(null);
    setAssigningUserId(userId);
    const firstUniversity = universities[0]?.id ?? "";
    setAssignUniversityId(firstUniversity);
    setAssignYearId(yearsForUniversity(firstUniversity)[0]?.id ?? "");
  }

  function cancelAssign() {
    setAssigningUserId(null);
    setFormError(null);
  }

  function startEdit(profile: ProfileRow) {
    setFormError(null);
    setAssigningUserId(null);
    setEditingUserId(profile.id);
    const uniId = profile.university_id ?? universities[0]?.id ?? "";
    setEditForm({
      fullName: profile.full_name ?? "",
      phone: profile.phone ?? "",
      universityId: uniId,
      yearId: profile.year_id ?? yearsForUniversity(uniId)[0]?.id ?? "",
    });
  }

  function cancelEdit() {
    setEditingUserId(null);
    setFormError(null);
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUserId) return;

    const target = profiles.find((p) => p.id === editingUserId);
    setFormError(null);
    setBusyUserId(editingUserId);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        university_id: editForm.universityId ? Number(editForm.universityId) : null,
        year_id: editForm.yearId ? Number(editForm.yearId) : null,
      })
      .eq("id", editingUserId);

    if (error) {
      setBusyUserId(null);
      setFormError(`فشل التعديل: ${error.message}`);
      return;
    }

    await logAction("edit_user", target?.full_name || target?.email || editingUserId);

    setBusyUserId(null);
    setEditingUserId(null);
    onChange();
  }

  async function handleToggleActive(profile: ProfileRow) {
    const activating = !profile.is_active;
    const label = profile.full_name || profile.email;

    if (!activating && !confirm(`هل أنت متأكد من تعطيل حساب "${label}"؟`)) return;

    setBusyUserId(profile.id);

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: activating })
      .eq("id", profile.id);

    if (error) {
      setBusyUserId(null);
      alert(`فشل ${activating ? "التفعيل" : "التعطيل"}: ${error.message}`);
      return;
    }

    await logAction(activating ? "activate_user" : "deactivate_user", label);

    setBusyUserId(null);
    onChange();
  }

  async function handleDeleteUser(profile: ProfileRow) {
    const label = profile.full_name || profile.email;
    if (!confirm(`هل أنت متأكد من حذف حساب "${label}" نهائيًا؟ الإجراء ده مينفعش يتراجع فيه.`)) {
      return;
    }

    setBusyUserId(profile.id);

    const { error } = await supabase.rpc("admin_delete_user", { target_id: profile.id });

    setBusyUserId(null);

    if (error) {
      alert(`فشل الحذف: ${error.message}`);
      return;
    }

    onChange();
  }

  async function handleAssignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningUserId || !assignYearId) return;

    setFormError(null);
    setBusyUserId(assigningUserId);

    const { error } = await supabase.rpc("assign_year_admin", {
      target_profile_id: assigningUserId,
      target_year_id: Number(assignYearId),
    });

    setBusyUserId(null);

    if (error) {
      setFormError(`فشل التعيين: ${error.message}`);
      return;
    }

    setAssigningUserId(null);
    onChange();
  }

  async function handleUnassign(userId: string, yearId: number) {
    if (!confirm("هل أنت متأكد من إلغاء تعيين هذا الأدمن على هذه الفرقة؟")) return;

    setBusyUserId(userId);

    const { error } = await supabase.rpc("unassign_year_admin", {
      target_profile_id: userId,
      target_year_id: yearId,
    });

    setBusyUserId(null);

    if (error) {
      alert(`فشل الإلغاء: ${error.message}`);
      return;
    }

    onChange();
  }

  // حساب/سنة null، أو أي دور مش "student" (زي super_admin/year_admin اللي
  // ممكن يكون لسه شايل university_id/year_id من وقت ما كان طالب قبل الترقية)
  // بيروحوا لقسم "غير مصنّف / حسابات إدارية" بدل ما يتوهوا داخل فرقة معينة.
  function isUnclassified(profile: ProfileRow): boolean {
    if (profile.role !== "student") return true;
    return !years.some((y) => y.id === profile.year_id);
  }

  const classifiedProfiles = profiles.filter((p) => !isUnclassified(p));
  const unclassifiedProfiles = profiles.filter(isUnclassified);

  const GENDER_GROUPS: { key: string; label: string; match: (p: ProfileRow) => boolean }[] = [
    { key: "male", label: "ذكور", match: (p) => p.gender === "male" },
    { key: "female", label: "إناث", match: (p) => p.gender === "female" },
    {
      key: "unspecified",
      label: "غير محدد",
      match: (p) => p.gender !== "male" && p.gender !== "female",
    },
  ];

  function groupByGender(yearProfiles: ProfileRow[]) {
    return GENDER_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      profiles: yearProfiles.filter(g.match),
    })).filter((g) => g.profiles.length > 0);
  }

  const universityGroups = universities
    .map((university) => {
      const uniYears = years.filter((y) => y.university_id === university.id);
      const yearGroups = uniYears
        .map((year) => ({
          year,
          profiles: classifiedProfiles.filter((p) => p.year_id === year.id),
        }))
        .filter((group) => group.profiles.length > 0);
      const totalCount = yearGroups.reduce((sum, group) => sum + group.profiles.length, 0);
      return { university, yearGroups, totalCount };
    })
    .filter((group) => group.totalCount > 0);

  function renderProfileRow(profile: ProfileRow) {
    const assignments = yearManagers.filter((ym) => ym.profile_id === profile.id);
    const isAssigning = assigningUserId === profile.id;
    const isEditing = editingUserId === profile.id;
    const isBusy = busyUserId === profile.id;
    const isSuperAdminRow = profile.role === "super_admin";

    return (
      <li
        key={profile.id}
        className={`rounded-xl border border-subtle bg-card p-4 ${
          !profile.is_active ? "opacity-70" : ""
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink">{profile.full_name || profile.email}</p>
            <p className="text-sm text-muted">{profile.email}</p>
            {profile.phone && <p className="text-sm text-muted">{profile.phone}</p>}
            <p className="mt-1 text-xs text-muted">
              {new Date(profile.created_at).toLocaleDateString("ar-EG")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
            {!profile.is_active && (
              <span className="inline-flex items-center rounded-full bg-red-600/10 px-3 py-1 text-xs font-semibold text-red-600">
                معطّل
              </span>
            )}
            {!isSuperAdminRow && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => startAssign(profile.id)}
                  className="text-sm font-medium text-gold hover:underline disabled:opacity-60"
                >
                  {profile.role === "year_admin" ? "تعيين على فرقة إضافية" : "تعيين كأدمن فرقة"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => startEdit(profile)}
                  className="text-sm font-medium text-gold hover:underline disabled:opacity-60"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleToggleActive(profile)}
                  className="text-sm font-medium text-gold hover:underline disabled:opacity-60"
                >
                  {profile.is_active ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleDeleteUser(profile)}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  حذف
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <form
            onSubmit={handleEditSubmit}
            className="mt-3 flex flex-col gap-3 rounded-lg bg-panel p-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-ink">الاسم</label>
                <input
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className={inputClasses}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-ink">رقم الهاتف</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className={inputClasses}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-ink">الجامعة</label>
                <select
                  value={editForm.universityId}
                  onChange={(e) => {
                    const nextUniId = e.target.value;
                    setEditForm({
                      ...editForm,
                      universityId: nextUniId,
                      yearId: yearsForUniversity(nextUniId)[0]?.id ?? "",
                    });
                  }}
                  className={inputClasses}
                >
                  {universities.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-ink">الفرقة</label>
                <select
                  value={editForm.yearId}
                  onChange={(e) => setEditForm({ ...editForm, yearId: e.target.value })}
                  className={inputClasses}
                >
                  {yearsForUniversity(editForm.universityId).length === 0 && (
                    <option value="">لا توجد فرق دراسية لهذه الجامعة</option>
                  )}
                  {yearsForUniversity(editForm.universityId).map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-full bg-gold text-gold-ink px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-60"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs font-medium text-muted hover:text-ink"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        {profile.role === "year_admin" && assignments.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2 border-t border-subtle bg-card pt-3">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">
                  {assignment.years?.universities?.name} — {assignment.years?.name}
                </span>
                <button
                  type="button"
                  disabled={busyUserId === profile.id}
                  onClick={() => handleUnassign(profile.id, assignment.year_id)}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  إلغاء
                </button>
              </li>
            ))}
          </ul>
        )}

        {isAssigning && (
          <form
            onSubmit={handleAssignSubmit}
            className="mt-3 flex flex-col gap-3 rounded-lg bg-panel p-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink">الجامعة</label>
              <select
                value={assignUniversityId}
                onChange={(e) => {
                  setAssignUniversityId(e.target.value);
                  setAssignYearId(yearsForUniversity(e.target.value)[0]?.id ?? "");
                }}
                className={inputClasses}
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-ink">الفرقة</label>
              <select
                value={assignYearId}
                onChange={(e) => setAssignYearId(e.target.value)}
                className={inputClasses}
              >
                {yearsForUniversity(assignUniversityId).length === 0 && (
                  <option value="">لا توجد فرق دراسية لهذه الجامعة</option>
                )}
                {yearsForUniversity(assignUniversityId).map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busyUserId === profile.id || !assignYearId}
                className="rounded-full bg-gold text-gold-ink px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-60"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={cancelAssign}
                className="text-xs font-medium text-muted hover:text-ink"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {formError && <p className="text-sm text-red-600">{formError}</p>}

      {profiles.length === 0 ? (
        <p className="text-sm text-muted">لا يوجد مستخدمين مسجلين بعد</p>
      ) : (
        <div className="flex flex-col gap-3">
          {universityGroups.map(({ university, yearGroups, totalCount }) => (
            <details key={university.id} className="rounded-xl border border-subtle bg-card" open>
              <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-ink">
                {university.name}{" "}
                <span className="font-normal text-muted">({totalCount})</span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-subtle p-4">
                {yearGroups.map(({ year, profiles: yearProfiles }) => (
                  <details key={year.id} className="rounded-lg border border-subtle bg-panel">
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-ink">
                      {year.name}{" "}
                      <span className="font-normal text-muted">
                        ({yearProfiles.length} طالب)
                      </span>
                    </summary>
                    <div className="flex flex-col gap-2 p-3 pt-0">
                      {groupByGender(yearProfiles).map((genderGroup) => (
                        <details
                          key={genderGroup.key}
                          className="rounded-md border border-subtle bg-card"
                        >
                          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-ink">
                            {genderGroup.label}{" "}
                            <span className="font-normal text-muted">
                              ({genderGroup.profiles.length})
                            </span>
                          </summary>
                          <ul className="flex flex-col gap-3 p-3 pt-0">
                            {genderGroup.profiles.map(renderProfileRow)}
                          </ul>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}

          {unclassifiedProfiles.length > 0 && (
            <details className="rounded-xl border border-subtle bg-card" open>
              <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-ink">
                غير مصنّف / حسابات إدارية{" "}
                <span className="font-normal text-muted">({unclassifiedProfiles.length})</span>
              </summary>
              <ul className="flex flex-col gap-3 p-4 pt-0">
                {unclassifiedProfiles.map(renderProfileRow)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  edit_user: "تعديل بيانات مستخدم",
  delete_user: "حذف حساب",
  deactivate_user: "تعطيل حساب",
  activate_user: "تفعيل حساب",
  assign_year_admin: "تعيين أدمن فرقة",
  unassign_year_admin: "إلغاء تعيين أدمن فرقة",
};

function AuditLogTab({ entries }: { entries: AuditLogRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-subtle bg-card shadow-sm">
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="border-b border-subtle text-xs text-muted">
            <th className="px-4 py-3 font-medium">المستخدم</th>
            <th className="px-4 py-3 font-medium">نوع الفعل</th>
            <th className="px-4 py-3 font-medium">الوصف</th>
            <th className="px-4 py-3 font-medium">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted">
                لا يوجد نشاط مسجّل بعد
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="border-b border-subtle last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{entry.actor_name}</td>
                <td className="px-4 py-3 text-muted">
                  {ACTION_TYPE_LABELS[entry.action_type] ?? entry.action_type}
                </td>
                <td className="px-4 py-3 text-muted">{entry.target_description}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">
                  {new Date(entry.created_at).toLocaleString("ar-EG")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  video: "فيديو",
  book: "كتاب",
  course: "مادة",
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  broken_link: "رابط معطّل",
  wrong_content: "محتوى غير صحيح",
  other: "أخرى",
};

function ReportsTab({
  reports,
  supabase,
  onChange,
}: {
  reports: ContentReportRow[];
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  // المفتوحة فوق، المُعالَجة تحتها — بدل ما تتحذف بيتغيّر لونها بس.
  const orderedReports = [...reports].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "open" ? -1 : 1;
  });

  async function handleToggleStatus(report: ContentReportRow) {
    setBusyId(report.id);
    const nextStatus = report.status === "open" ? "resolved" : "open";

    const { error } = await supabase
      .from("content_reports")
      .update({ status: nextStatus })
      .eq("id", report.id);

    setBusyId(null);

    if (error) {
      alert(`فشل تحديث حالة البلاغ: ${error.message}`);
      return;
    }

    onChange();
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-subtle bg-card shadow-sm">
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="border-b border-subtle text-xs text-muted">
            <th className="px-4 py-3 font-medium">النوع</th>
            <th className="px-4 py-3 font-medium">العنصر</th>
            <th className="px-4 py-3 font-medium">نوع المشكلة</th>
            <th className="px-4 py-3 font-medium">الوصف</th>
            <th className="px-4 py-3 font-medium">التاريخ</th>
            <th className="px-4 py-3 font-medium">الحالة</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {orderedReports.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-muted">
                لا توجد بلاغات حتى الآن
              </td>
            </tr>
          ) : (
            orderedReports.map((report) => (
              <tr
                key={report.id}
                className={`border-b border-subtle last:border-0 ${
                  report.status === "resolved" ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-3 text-muted">
                  {ITEM_TYPE_LABELS[report.item_type] ?? report.item_type}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{report.item_title}</td>
                <td className="px-4 py-3 text-muted">
                  {ISSUE_TYPE_LABELS[report.issue_type] ?? report.issue_type}
                </td>
                <td className="max-w-xs px-4 py-3 text-muted">{report.description || "—"}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted">
                  {new Date(report.created_at).toLocaleString("ar-EG")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      report.status === "open"
                        ? "bg-red-600/10 text-red-600"
                        : "bg-gold/10 text-gold"
                    }`}
                  >
                    {report.status === "open" ? "مفتوح" : "معالَج"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === report.id}
                    onClick={() => handleToggleStatus(report)}
                    className="text-sm font-medium text-gold hover:underline disabled:opacity-60"
                  >
                    {report.status === "open" ? "تحديد كمُعالَج" : "إعادة فتح"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatsTab({
  courses,
  universities,
  years,
}: {
  courses: Course[];
  universities: University[];
  years: Year[];
}) {
  const totalViews = courses.reduce((sum, c) => sum + (c.view_count || 0), 0);

  const topCourses = [...courses]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 15);

  function courseContext(course: Course): string {
    if (course.category === "learning_path") return "مسار تعلم برمجة";
    const year = years.find((y) => y.id === course.year_id);
    const university = universities.find((u) => u.id === year?.university_id);
    return [university?.name, year?.name].filter(Boolean).join(" — ") || "—";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        <p className="text-sm text-muted">إجمالي عدد الزيارات لكل المواد</p>
        <p className="mt-1 text-3xl font-extrabold text-ink">
          {totalViews.toLocaleString("ar-EG")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-subtle bg-card shadow-sm">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-subtle text-xs text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">المادة</th>
              <th className="px-4 py-3 font-medium">الجامعة / الفرقة</th>
              <th className="px-4 py-3 font-medium">عدد الزيارات</th>
            </tr>
          </thead>
          <tbody>
            {topCourses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  لا توجد بيانات كفاية بعد
                </td>
              </tr>
            ) : (
              topCourses.map((course, index) => (
                <tr key={course.id} className="border-b border-subtle last:border-0">
                  <td className="px-4 py-3 text-muted">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-ink">{course.name}</td>
                  <td className="px-4 py-3 text-muted">{courseContext(course)}</td>
                  <td className="px-4 py-3 font-semibold text-gold">{course.view_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoursesTab({
  universities,
  years,
  terms,
  courses,
  books,
  playlists,
  restrictToAcademic = false,
  supabase,
  onChange,
}: {
  universities: University[];
  years: Year[];
  terms: Term[];
  courses: Course[];
  books: Book[];
  playlists: Playlist[];
  restrictToAcademic?: boolean;
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  // نسخ مادة (super_admin بس، بشرط الدالة نفسها في duplicate_course_setup.sql)
  const [duplicatingCourse, setDuplicatingCourse] = useState<Course | null>(null);
  function yearsForUniversity(universityId: number | string): Year[] {
    return years.filter((y) => String(y.university_id) === String(universityId));
  }

  function termsForYear(yearId: number | string): Term[] {
    return terms.filter((t) => String(t.year_id) === String(yearId));
  }

  const initialUniversityId = universities[0]?.id ?? "";
  const initialYearId = yearsForUniversity(initialUniversityId)[0]?.id ?? "";

  type CourseFormState = {
    name: string;
    description: string;
    category: CourseCategory;
    university_id: number | string;
    year_id: number | string;
    term_id: number | string;
    parent_course_id: number | string;
  };

  function emptyForm(): CourseFormState {
    return {
      name: "",
      description: "",
      category: "academic",
      university_id: initialUniversityId,
      year_id: initialYearId,
      term_id: termsForYear(initialYearId)[0]?.id ?? "",
      parent_course_id: "",
    };
  }

  // فورم "إضافة مادة جديدة" — دايمًا ظاهر وله حالته الخاصة، منفصل تمامًا
  // عن فورم التعديل عشان اختيار عنصر من الشجرة للتعديل ميشيلش فورم
  // الإضافة من الشاشة (كان ده سبب اختفائه بعد ما اتحطت الشجرة).
  const [addForm, setAddForm] = useState<CourseFormState>(emptyForm);
  const [addSaving, setAddSaving] = useState(false);

  // فورم "تعديل مادة" — بيظهر لما تختار عنصر من الشجرة بس.
  const [editingId, setEditingIdState] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CourseFormState>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  // الـ id المستعاد من الرابط (لو موجود) — بيتستهلك مرة واحدة أول ما المادة
  // المطابقة تبقى متاحة في courses (زي لما يحصل reload حقيقي للصفحة أو
  // refresh يدوي وإنت واقف على مادة بتعدّلها).
  const pendingUrlCourseId = useRef<number | null>(
    (() => {
      const raw = getUrlParam("courseId");
      return raw ? Number(raw) : null;
    })()
  );

  function setEditingId(id: number | null) {
    setEditingIdState(id);
    setUrlParam("courseId", id ? String(id) : null);
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    const courseYear = years.find((y) => y.id === course.year_id);
    setEditForm({
      name: course.name,
      description: course.description ?? "",
      category: course.category,
      university_id: courseYear?.university_id ?? initialUniversityId,
      year_id: course.year_id ?? initialYearId,
      term_id: course.term_id ?? "",
      parent_course_id: course.parent_course_id ?? "",
    });
  }

  function resetEditForm() {
    setEditingId(null);
    setEditForm(emptyForm());
  }

  // بعد أي reload (سواء إضافة/تعديل عادي أو F5 حقيقي)، لو فيه courseId
  // جاي من الرابط ولسه مستهلكش، وربطنا الآن استلمنا بيانات المادة دي في
  // courses، افتحها للتعديل زي ما كانت بالظبط.
  useEffect(() => {
    if (pendingUrlCourseId.current !== null && editingId === null) {
      const course = courses.find((c) => c.id === pendingUrlCourseId.current);
      if (course) {
        startEdit(course);
        pendingUrlCourseId.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  // اختيار أي عنصر من الشجرة بيفتحه للتعديل دايمًا. ولو العنصر ده مادة في
  // مسار تعلم برمجة، بنقترحه كمان تلقائيًا كـ"قسم أب" في فورم الإضافة
  // (وبنحول نوع المحتوى فيه لـ"مسار تعلم برمجة" عشان الحقل يبان)، مع
  // إمكانية تغييره من الدروب داون في الفورم نفسه.
  function handleTreeSelect(courseId: number) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    startEdit(course);
    if (course.category === "learning_path") {
      setAddForm((prev) => ({ ...prev, category: "learning_path", parent_course_id: courseId }));
    }
  }

  function handleAddUniversityChange(newUniversityId: string) {
    const nextYears = yearsForUniversity(newUniversityId);
    const nextYearId = nextYears[0]?.id ?? "";
    const nextTerms = termsForYear(nextYearId);
    setAddForm((prev) => ({
      ...prev,
      university_id: newUniversityId,
      year_id: nextYearId,
      term_id: nextTerms[0]?.id ?? "",
    }));
  }

  function handleAddYearChange(newYearId: string) {
    const nextTerms = termsForYear(newYearId);
    setAddForm((prev) => ({ ...prev, year_id: newYearId, term_id: nextTerms[0]?.id ?? "" }));
  }

  function handleEditUniversityChange(newUniversityId: string) {
    const nextYears = yearsForUniversity(newUniversityId);
    const nextYearId = nextYears[0]?.id ?? "";
    const nextTerms = termsForYear(nextYearId);
    setEditForm((prev) => ({
      ...prev,
      university_id: newUniversityId,
      year_id: nextYearId,
      term_id: nextTerms[0]?.id ?? "",
    }));
  }

  function handleEditYearChange(newYearId: string) {
    const nextTerms = termsForYear(newYearId);
    setEditForm((prev) => ({ ...prev, year_id: newYearId, term_id: nextTerms[0]?.id ?? "" }));
  }

  function buildPayload(
    form: CourseFormState,
    isAcademic: boolean
  ): {
    name: string;
    description: string | null;
    category: CourseCategory;
    year_id: number | null;
    term_id: number | null;
    parent_course_id: number | null;
  } {
    return isAcademic
      ? {
          name: form.name,
          description: form.description || null,
          category: "academic",
          year_id: Number(form.year_id),
          term_id: form.term_id ? Number(form.term_id) : null,
          parent_course_id: null,
        }
      : {
          name: form.name,
          description: form.description || null,
          category: "learning_path",
          year_id: null,
          term_id: null,
          parent_course_id: form.parent_course_id ? Number(form.parent_course_id) : null,
        };
  }

  async function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddSaving(true);

    const { error } = await supabase
      .from("courses")
      .insert(buildPayload(addForm, addIsAcademic));

    setAddSaving(false);

    if (!error) {
      // بنسيب نوع المحتوى والقسم الأب (أو الجامعة/الفرقة/الترم) زي ما هما
      // عشان يقدر يضيف كذا مادة ورا بعض في نفس المكان (زي HTML وCSS
      // وJavaScript جوه Front_End) من غير ما يعيد الاختيار كل مرة.
      setAddForm((prev) => ({ ...prev, name: "", description: "" }));
      onChange();
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null) return;
    setEditSaving(true);

    const { error } = await supabase
      .from("courses")
      .update(buildPayload(editForm, editIsAcademic))
      .eq("id", editingId);

    setEditSaving(false);

    if (!error) {
      resetEditForm();
      onChange();
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
    await supabase.from("courses").delete().eq("id", id);
    if (id === editingId) resetEditForm();
    onChange();
  }

  async function handleReorder(id: number, newOrderIndex: number) {
    await supabase.from("courses").update({ order_index: newOrderIndex }).eq("id", id);
    onChange();
  }

  // أدمن الفرقة (restrictToAcademic) ميقدرش يدير مسارات تعلم البرمجة أصلًا
  // (مش مرتبطة بجامعة/فرقة، ومحجوزة لـ super_admin بس — نفس القيد اللي في
  // سياسات RLS بتاعة courses في roles_v2_policies_update.sql)، فبنقفل
  // الفورمين على "أكاديمية" دايمًا في الحالة دي.
  const addIsAcademic = restrictToAcademic || addForm.category === "academic";
  const addAvailableYears = yearsForUniversity(addForm.university_id);
  const addAvailableTerms = termsForYear(addForm.year_id);
  const addAvailableParents = courses.filter((c) => c.category === "learning_path");

  const editIsAcademic = restrictToAcademic || editForm.category === "academic";
  const editAvailableYears = yearsForUniversity(editForm.university_id);
  const editAvailableTerms = termsForYear(editForm.year_id);
  const editAvailableParents = courses.filter(
    (c) => c.category === "learning_path" && c.id !== editingId
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="lg:w-[300px] lg:shrink-0">
        <ContentTree
          universities={universities}
          years={years}
          terms={terms}
          courses={courses}
          selectedCourseId={editingId}
          onSelectCourse={handleTreeSelect}
          showLearningPath={!restrictToAcademic}
          disabled={addSaving || editSaving}
          onReorder={handleReorder}
          onDuplicate={
            restrictToAcademic
              ? undefined
              : (courseId) => {
                  const course = courses.find((c) => c.id === courseId);
                  if (course) setDuplicatingCourse(course);
                }
          }
        />
      </div>
      <div className="flex flex-1 flex-col gap-8">
        <form
          onSubmit={handleAddSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold text-ink">إضافة مادة جديدة</h2>

          {!restrictToAcademic && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">نوع المحتوى</label>
              <select
                required
                value={addForm.category}
                onChange={(e) =>
                  setAddForm({ ...addForm, category: e.target.value as CourseCategory })
                }
                className={inputClasses}
              >
                <option value="academic">مادة أكاديمية</option>
                <option value="learning_path">مسار تعلم برمجة</option>
              </select>
            </div>
          )}

          <input
            required
            placeholder="اسم المادة"
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            className={inputClasses}
          />
          <textarea
            placeholder="الوصف"
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
            className={inputClasses}
            rows={3}
          />

          {addIsAcademic ? (
            <>
              <select
                required
                value={addForm.university_id}
                onChange={(e) => handleAddUniversityChange(e.target.value)}
                className={inputClasses}
              >
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={addForm.year_id}
                onChange={(e) => handleAddYearChange(e.target.value)}
                className={inputClasses}
              >
                {addAvailableYears.length === 0 && (
                  <option value="">لا توجد فرق دراسية لهذه الجامعة</option>
                )}
                {addAvailableYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
              <select
                required
                value={addForm.term_id}
                onChange={(e) => setAddForm({ ...addForm, term_id: e.target.value })}
                className={inputClasses}
              >
                {addAvailableTerms.length === 0 && (
                  <option value="">لا توجد ترمين لهذه السنة</option>
                )}
                {addAvailableTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                قسم أب (اختياري)
              </label>
              <select
                value={addForm.parent_course_id}
                onChange={(e) => setAddForm({ ...addForm, parent_course_id: e.target.value })}
                className={inputClasses}
              >
                <option value="">بدون (مسار رئيسي)</option>
                {addAvailableParents.map((parentCourse) => (
                  <option key={parentCourse.id} value={parentCourse.id}>
                    {parentCourse.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted">
                اختيار مادة من الشجرة بيقترحها هنا تلقائيًا كقسم أب — وتقدر تغيّرها من الليستة دي.
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={addSaving}
              className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
            >
              {addSaving ? "جارٍ الإضافة..." : "إضافة"}
            </button>
          </div>
        </form>

        {editingId === null ? (
          <div className="rounded-2xl border border-dashed border-subtle bg-card p-6 text-center">
            <p className="text-sm text-muted">اختر مادة من الشجرة عشان تعدّلها من هنا.</p>
          </div>
        ) : (
          <form
            onSubmit={handleEditSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-ink">تعديل مادة</h2>

            {!restrictToAcademic && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">نوع المحتوى</label>
                <select
                  required
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value as CourseCategory })
                  }
                  className={inputClasses}
                >
                  <option value="academic">مادة أكاديمية</option>
                  <option value="learning_path">مسار تعلم برمجة</option>
                </select>
              </div>
            )}

            <input
              required
              placeholder="اسم المادة"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className={inputClasses}
            />
            <textarea
              placeholder="الوصف"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className={inputClasses}
              rows={3}
            />

            {editIsAcademic ? (
              <>
                <select
                  required
                  value={editForm.university_id}
                  onChange={(e) => handleEditUniversityChange(e.target.value)}
                  className={inputClasses}
                >
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={editForm.year_id}
                  onChange={(e) => handleEditYearChange(e.target.value)}
                  className={inputClasses}
                >
                  {editAvailableYears.length === 0 && (
                    <option value="">لا توجد فرق دراسية لهذه الجامعة</option>
                  )}
                  {editAvailableYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={editForm.term_id}
                  onChange={(e) => setEditForm({ ...editForm, term_id: e.target.value })}
                  className={inputClasses}
                >
                  {editAvailableTerms.length === 0 && (
                    <option value="">لا توجد ترمين لهذه السنة</option>
                  )}
                  {editAvailableTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  قسم أب (اختياري)
                </label>
                <select
                  value={editForm.parent_course_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, parent_course_id: e.target.value })
                  }
                  className={inputClasses}
                >
                  <option value="">بدون (مسار رئيسي)</option>
                  {editAvailableParents.map((parentCourse) => (
                    <option key={parentCourse.id} value={parentCourse.id}>
                      {parentCourse.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={editSaving}
                className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
              >
                {editSaving ? "جارٍ الحفظ..." : "حفظ التعديل"}
              </button>
              <button
                type="button"
                onClick={resetEditForm}
                className="text-sm font-medium text-muted hover:text-ink"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDelete(editingId)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                حذف المادة
              </button>
            </div>
          </form>
        )}
      </div>

      {duplicatingCourse && (
        <DuplicateCourseModal
          sourceCourse={duplicatingCourse}
          universities={universities}
          years={years}
          terms={terms}
          courses={courses}
          books={books}
          playlists={playlists}
          supabase={supabase}
          onClose={() => setDuplicatingCourse(null)}
          onDuplicated={(newCourseId) => {
            setDuplicatingCourse(null);
            // courses هنا لسه مش متحدّثة (onChange لسه بيحمّل)، فمنقدرش نفتح
            // النسخة الجديدة للتعديل فورًا. بنستخدم نفس آلية استعادة
            // courseId من الرابط اللي أصلًا بتتفعّل تلقائيًا أول ما courses
            // تتحدّث وفيها المادة الجديدة دي.
            resetEditForm();
            pendingUrlCourseId.current = newCourseId;
            onChange();
          }}
        />
      )}
    </div>
  );
}

function DuplicateCourseModal({
  sourceCourse,
  universities,
  years,
  terms,
  courses,
  books,
  playlists,
  supabase,
  onClose,
  onDuplicated,
}: {
  sourceCourse: Course;
  universities: University[];
  years: Year[];
  terms: Term[];
  courses: Course[];
  books: Book[];
  playlists: Playlist[];
  supabase: SupabaseClient;
  onClose: () => void;
  onDuplicated: (newCourseId: number) => void;
}) {
  function yearsForUniversity(universityId: number | string): Year[] {
    return years.filter((y) => String(y.university_id) === String(universityId));
  }

  function termsForYear(yearId: number | string): Term[] {
    return terms.filter((t) => String(t.year_id) === String(yearId));
  }

  // نبدأ بنفس مكان المادة الأصلية كافتراضي منطقي (يعني نسخة "شقيقة" لها)،
  // مع إمكانية تغييره بالكامل — مطابق لفورم "إضافة مادة جديدة".
  const sourceYear = years.find((y) => y.id === sourceCourse.year_id);
  const initialUniversityId = sourceYear?.university_id ?? universities[0]?.id ?? "";
  const initialYearId =
    sourceCourse.year_id ?? yearsForUniversity(initialUniversityId)[0]?.id ?? "";
  const initialTermId = sourceCourse.term_id ?? termsForYear(initialYearId)[0]?.id ?? "";

  const [name, setName] = useState(sourceCourse.name);
  const [category, setCategory] = useState<CourseCategory>(sourceCourse.category);
  const [universityId, setUniversityId] = useState<number | string>(initialUniversityId);
  const [yearId, setYearId] = useState<number | string>(initialYearId);
  const [termId, setTermId] = useState<number | string>(initialTermId);
  const [parentCourseId, setParentCourseId] = useState<number | string>(
    sourceCourse.parent_course_id ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    newCourseId: number;
    copiedPlaylists: number;
    copiedBooks: number;
    failedBooks: string[];
  } | null>(null);

  const isAcademic = category === "academic";
  const availableYears = yearsForUniversity(universityId);
  const availableTerms = termsForYear(yearId);
  const availableParents = courses.filter(
    (c) => c.category === "learning_path" && c.id !== sourceCourse.id
  );

  function handleUniversityChange(newUniversityId: string) {
    const nextYears = yearsForUniversity(newUniversityId);
    const nextYearId = nextYears[0]?.id ?? "";
    const nextTerms = termsForYear(nextYearId);
    setUniversityId(newUniversityId);
    setYearId(nextYearId);
    setTermId(nextTerms[0]?.id ?? "");
  }

  function handleYearChange(newYearId: string) {
    const nextTerms = termsForYear(newYearId);
    setYearId(newYearId);
    setTermId(nextTerms[0]?.id ?? "");
  }

  const sourcePlaylists = playlists.filter((p) => p.course_id === sourceCourse.id);
  const sourceBooks = books.filter((b) => b.course_id === sourceCourse.id);
  const childCourses = courses.filter((c) => c.parent_course_id === sourceCourse.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { data: rpcData, error: rpcError } = await supabase.rpc("duplicate_course", {
      source_course_id: sourceCourse.id,
      new_name: name,
      target_category: category,
      target_year_id: isAcademic && yearId ? Number(yearId) : null,
      target_term_id: isAcademic && termId ? Number(termId) : null,
      target_parent_course_id: !isAcademic && parentCourseId ? Number(parentCourseId) : null,
    });

    if (rpcError || rpcData === null) {
      setSaving(false);
      setError(`فشل النسخ: ${rpcError?.message ?? "خطأ غير متوقع"}`);
      return;
    }

    const newCourseId = Number(rpcData);

    // duplicate_course() نسخت صفوف book_folders نفسها بالفعل (بترتيب id
    // تصاعديًا)، فبنجيب فولدرات المصدر والنسخة الجديدة بنفس الترتيب
    // عشان نطابق كل فولدر قديم بالجديد المقابل له بالظبط قبل نسخ الكتب.
    const [{ data: sourceFolders }, { data: newFolders }] = await Promise.all([
      supabase.from("book_folders").select("id").eq("course_id", sourceCourse.id).order("id"),
      supabase.from("book_folders").select("id").eq("course_id", newCourseId).order("id"),
    ]);

    const folderIdMap = new Map<number, number>();
    (sourceFolders ?? []).forEach((folder: { id: number }, index: number) => {
      const newFolder = (newFolders ?? [])[index] as { id: number } | undefined;
      if (newFolder) folderIdMap.set(folder.id, newFolder.id);
    });

    const failedBooks: string[] = [];
    let copiedBooks = 0;

    // بالتتابع (مش Promise.all) عشان نتجنب ضغط دفعة كبيرة من طلبات نسخ
    // الملفات على Storage مرة واحدة — نفس التحذير اللي بيظهر للأدمن قبل
    // النسخ إن العملية ممكن تاخد كذا ثانية لو الكتب كتير.
    for (const book of sourceBooks) {
      const newFolderId = book.folder_id ? (folderIdMap.get(book.folder_id) ?? null) : null;
      let newFileUrl: string | null = null;

      if (book.file_url) {
        const oldPath = getStoragePathFromPublicUrl(book.file_url);
        if (oldPath) {
          const newPath = `${newCourseId}/${newFolderId ?? "unfiled"}/${book.id}-${Date.now()}-${sanitizeFileName(book.title)}.pdf`;
          const { error: copyError } = await supabase.storage.from("books").copy(oldPath, newPath);

          if (copyError) {
            failedBooks.push(book.title);
            continue;
          }

          newFileUrl = supabase.storage.from("books").getPublicUrl(newPath).data.publicUrl;
        }
      }

      // file_url بتاع النسخة الجديدة لازم يكون رابط الملف المنسوخ الجديد،
      // مش نفس رابط الأصل — عشان لو الكتاب الأصلي اتحذف بعدين، النسخة دي
      // متتأثرش خالص (مستقلة تمامًا زي ما هو مطلوب).
      const { error: insertBookError } = await supabase.from("books").insert({
        title: book.title,
        author: book.author,
        file_url: newFileUrl,
        course_id: newCourseId,
        folder_id: newFolderId,
      });

      if (insertBookError) {
        failedBooks.push(book.title);
        continue;
      }

      copiedBooks++;
    }

    setSaving(false);
    setResult({
      newCourseId,
      copiedPlaylists: sourcePlaylists.length,
      copiedBooks,
      failedBooks,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-subtle bg-card p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {result ? (
          <div className="flex flex-col gap-4 text-center">
            <h2 className="text-lg font-bold text-ink">تم النسخ بنجاح</h2>
            <p className="text-sm text-muted">
              اتنسخ {result.copiedPlaylists} فيديو و{result.copiedBooks} كتاب لمادة &quot;{name}&quot;
              الجديدة.
            </p>
            {result.failedBooks.length > 0 && (
              <p className="text-sm text-red-600">
                فشل نسخ {result.failedBooks.length} كتاب: {result.failedBooks.join("، ")}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onDuplicated(result.newCourseId)}
                className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-5 py-2 text-sm font-semibold shadow-sm"
              >
                افتح المادة الجديدة للتعديل
              </button>
              <a
                href={`/courses/${result.newCourseId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-subtle px-5 py-2 text-sm font-semibold text-ink"
              >
                عرضها في الموقع
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-ink">نسخ &quot;{sourceCourse.name}&quot;</h2>

            {childCourses.length > 0 && (
              <p className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs text-ink">
                ⚠️ المادة دي عندها {childCourses.length} قسم فرعي — النسخ الحالي هينسخ محتوى المادة
                نفسها بس (الفيديوهات والكتب المباشرة)، من غير الأقسام الفرعية جواها. نسخ الأقسام
                المتداخلة (Recursive) هيتضاف في مرحلة تانية.
              </p>
            )}

            <p className="rounded-xl border border-subtle bg-panel p-3 text-xs text-muted">
              هيتم نسخ {sourcePlaylists.length} فيديو و{sourceBooks.length} كتاب. النسخ ده بينسخ
              الملفات الفعلية في التخزين (مش مجرد لينك)، يعني هياخد مساحة تخزين إضافية بمعنى الكلمة
              مع كل نسخة، وممكن ياخد كذا ثانية لو الكتب كتير.
            </p>

            <input
              required
              placeholder="اسم المادة الجديدة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">نوع المحتوى</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CourseCategory)}
                className={inputClasses}
              >
                <option value="academic">مادة أكاديمية</option>
                <option value="learning_path">مسار تعلم برمجة</option>
              </select>
            </div>

            {isAcademic ? (
              <>
                <select
                  required
                  value={universityId}
                  onChange={(e) => handleUniversityChange(e.target.value)}
                  className={inputClasses}
                >
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={yearId}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className={inputClasses}
                >
                  {availableYears.length === 0 && (
                    <option value="">لا توجد فرق دراسية لهذه الجامعة</option>
                  )}
                  {availableYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className={inputClasses}
                >
                  {availableTerms.length === 0 && (
                    <option value="">لا توجد ترمين لهذه السنة</option>
                  )}
                  {availableTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  قسم أب (اختياري)
                </label>
                <select
                  value={parentCourseId}
                  onChange={(e) => setParentCourseId(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">بدون (مسار رئيسي)</option>
                  {availableParents.map((parentCourse) => (
                    <option key={parentCourse.id} value={parentCourse.id}>
                      {parentCourse.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-5 py-2 text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                {saving ? "جارٍ النسخ... ده ممكن ياخد كذا ثانية" : "نسخ"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="text-sm font-medium text-muted hover:text-ink disabled:opacity-60"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function BooksTab({
  universities,
  years,
  terms,
  courses,
  books,
  folders,
  showLearningPath,
  supabase,
  onChange,
}: {
  universities: University[];
  years: Year[];
  terms: Term[];
  courses: Course[];
  books: Book[];
  folders: BookFolder[];
  showLearningPath: boolean;
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [selectedCourseId, setSelectedCourseIdState] = useState<number | null>(() => {
    const raw = getUrlParam("booksCourseId");
    return raw ? Number(raw) : null;
  });
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  // بيتفعّل وقت أي حفظ فولدر/كتاب شغال فعلًا (Upload)، عشان نقفل الشجرة
  // مؤقتًا ومايبقاش فيه احتمال إن الاختيار يتغيّر ووسط عملية حفظ لسه ماخلصتش.
  const [childSaving, setChildSaving] = useState(false);
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;
  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;
  const courseFolders = folders.filter((f) => f.course_id === selectedCourseId);
  const unfiledBooks = books.filter((b) => !b.folder_id && b.course_id === selectedCourseId);

  function handleSelectCourse(courseId: number) {
    setSelectedCourseIdState(courseId);
    setUrlParam("booksCourseId", String(courseId));
    setSelectedFolderId(null);
  }

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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="lg:w-[300px] lg:shrink-0">
        <ContentTree
          universities={universities}
          years={years}
          terms={terms}
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={handleSelectCourse}
          showLearningPath={showLearningPath}
          disabled={childSaving}
        />
      </div>

      <div className="flex flex-1 flex-col gap-8">
        {!selectedCourse ? (
          <p className="rounded-2xl border border-subtle bg-card p-6 text-center text-sm text-muted shadow-sm">
            اختر مادة من الشجرة لإدارة كتبها
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm font-medium text-ink">
              بتدير كتب: {selectedCourse.name}
            </div>

            <FolderManager
              courseId={selectedCourse.id}
              folders={courseFolders}
              supabase={supabase}
              onChange={onChange}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onSavingChange={setChildSaving}
            />

            {selectedFolder && (
              <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-ink">
                    ملفات فولدر: {selectedFolder.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="text-sm font-medium text-muted hover:text-ink"
                  >
                    إغلاق
                  </button>
                </div>

                <BookUploadForm
                  folder={selectedFolder}
                  supabase={supabase}
                  onChange={onChange}
                  onSavingChange={setChildSaving}
                />

                <BookList
                  books={books.filter((b) => b.folder_id === selectedFolder.id)}
                  emptyMessage="لا توجد ملفات في هذا الفولدر بعد"
                  onDelete={handleDeleteBook}
                />
              </div>
            )}

            {unfiledBooks.length > 0 && (
              <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
                <h2 className="text-lg font-bold text-ink">ملفات عامة (بدون فولدر)</h2>
                <p className="mt-1 text-sm text-muted">
                  ملفات اتضافت قبل نظام الفولدرات، لسه موجودة ومتاحة للطلاب.
                </p>
                <BookList books={unfiledBooks} emptyMessage="" onDelete={handleDeleteBook} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FolderManager({
  courseId,
  folders,
  supabase,
  onChange,
  selectedFolderId,
  onSelectFolder,
  onSavingChange,
}: {
  courseId: number;
  folders: BookFolder[];
  supabase: SupabaseClient;
  onChange: () => void;
  selectedFolderId: number | null;
  onSelectFolder: (id: number | null) => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const empty = { name: "" };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function startEdit(folder: BookFolder) {
    setEditingId(folder.id);
    setForm({ name: folder.name });
  }

  function resetForm() {
    setEditingId(null);
    setForm(empty);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onSavingChange(true);

    // بناخد courseId من الـ prop مباشرة (جاي من selectedCourse.id بتاع
    // BooksTab وقت الرندر ده)، مش من متغيّر مخزّن قبل كده — والشجرة بقت
    // مقفولة أثناء الحفظ (disabled={childSaving} في BooksTab) فمفيش
    // احتمال إن الاختيار يتغيّر تحتنا لحد ما الطلب يخلص.
    const payload = { name: form.name, course_id: courseId };

    const { error } = editingId
      ? await supabase.from("book_folders").update(payload).eq("id", editingId)
      : await supabase.from("book_folders").insert(payload);

    setSaving(false);
    onSavingChange(false);

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
    <div className="flex flex-col gap-6 rounded-2xl border border-subtle bg-card p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-ink">
          {editingId ? "تعديل فولدر" : "إضافة فولدر جديد"}
        </h2>

        <input
          required
          placeholder="اسم الفولدر (مثلاً: ملازم، تلخيصات)"
          value={form.name}
          onChange={(e) => setForm({ name: e.target.value })}
          className={inputClasses}
        />

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة فولدر"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {folders.length === 0 ? (
          <p className="text-sm text-muted">لا توجد فولدرات مضافة بعد لهذه المادة</p>
        ) : (
          folders.map((folder) => (
            <li
              key={folder.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                folder.id === selectedFolderId ? "border-gold bg-gold/5" : "border-subtle bg-card"
              }`}
            >
              <p className="font-semibold text-ink">{folder.name}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectFolder(folder.id === selectedFolderId ? null : folder.id)}
                  className="text-sm font-medium text-gold hover:underline"
                >
                  {folder.id === selectedFolderId ? "إخفاء الملفات" : "إدارة الملفات"}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(folder)}
                  className="text-sm font-medium text-gold hover:underline"
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
  onSavingChange,
}: {
  folder: BookFolder;
  supabase: SupabaseClient;
  onChange: () => void;
  onSavingChange: (saving: boolean) => void;
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
    onSavingChange(true);

    const path = `${folder.course_id}/${folder.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("books").upload(path, file);

    if (uploadError) {
      setSaving(false);
      onSavingChange(false);
      setFormError(`فشل رفع الملف: ${uploadError.message}`);
      return;
    }

    const fileUrl = supabase.storage.from("books").getPublicUrl(path).data.publicUrl;

    // folder.course_id جاي من الـ prop (الفولدر المختار حاليًا)، مش من أي
    // متغيّر تاني — وحتى لو تغيّر اختيار المادة في الشجرة، الفولدر ده
    // (وبالتالي المادة اللي هيتربط بيها الكتاب) ثابت طول عملية الرفع.
    const { error } = await supabase.from("books").insert({
      title,
      author: author || null,
      file_url: fileUrl,
      course_id: folder.course_id,
      folder_id: folder.id,
    });

    setSaving(false);
    onSavingChange(false);

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
      className="flex flex-col gap-4 rounded-xl border border-subtle bg-panel p-4"
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
        <label htmlFor={`book-file-${folder.id}`} className="mb-1.5 block text-sm font-medium text-ink">
          ملف PDF (بحد أقصى 20 ميجابايت)
        </label>
        <input
          id={`book-file-${folder.id}`}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className={inputClasses}
        />
        {file && <p className="mt-2 text-sm text-muted">الملف المختار: {file.name}</p>}
      </div>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-fit items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
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
    return emptyMessage ? <p className="mt-4 text-sm text-muted">{emptyMessage}</p> : null;
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {books.map((book) => (
        <li
          key={book.id}
          className="flex flex-col gap-3 rounded-xl border border-subtle bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-ink">{book.title}</p>
            {book.author && <p className="text-sm text-muted">{book.author}</p>}
            {courses && (
              <p className="text-sm text-muted">
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
                className="text-sm font-medium text-gold hover:underline"
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
  universities,
  years,
  terms,
  courses,
  playlists,
  showLearningPath,
  supabase,
  onChange,
}: {
  universities: University[];
  years: Year[];
  terms: Term[];
  courses: Course[];
  playlists: Playlist[];
  showLearningPath: boolean;
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [selectedCourseId, setSelectedCourseIdState] = useState<number | null>(() => {
    const raw = getUrlParam("playlistsCourseId");
    return raw ? Number(raw) : null;
  });
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;
  const coursePlaylists = playlists.filter((p) => p.course_id === selectedCourseId);

  const empty: {
    title: string;
    youtube_url: string;
    order_index: number | string;
    group_name: string;
  } = {
    title: "",
    youtube_url: "",
    order_index: 0,
    group_name: "",
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  function startEdit(playlist: Playlist) {
    setEditingId(playlist.id);
    setForm({
      title: playlist.title,
      youtube_url: playlist.youtube_url,
      order_index: playlist.order_index,
      group_name: playlist.group_name ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(empty);
  }

  function handleSelectCourse(courseId: number) {
    setSelectedCourseIdState(courseId);
    setUrlParam("playlistsCourseId", String(courseId));
    resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) return;
    setSaving(true);

    // selectedCourseId مأخوذ من الـ state الحالي وقت الضغط على "إضافة"،
    // والشجرة بقت مقفولة أثناء الحفظ (disabled={saving} تحت) فمفيش
    // احتمال إنه يتغيّر تحتنا لحد ما الطلب يخلص.
    const payload = {
      title: form.title,
      youtube_url: form.youtube_url,
      course_id: selectedCourseId,
      order_index: Number(form.order_index) || 0,
      group_name: form.group_name.trim() || null,
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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="lg:w-[300px] lg:shrink-0">
        <ContentTree
          universities={universities}
          years={years}
          terms={terms}
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={handleSelectCourse}
          showLearningPath={showLearningPath}
          disabled={saving}
        />
      </div>

      <div className="flex flex-1 flex-col gap-8">
        {!selectedCourse ? (
          <p className="rounded-2xl border border-subtle bg-card p-6 text-center text-sm text-muted shadow-sm">
            اختر مادة من الشجرة لإدارة قوائم الفيديوهات بتاعتها
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm font-medium text-ink">
              بتدير فيديوهات: {selectedCourse.name}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 rounded-2xl border border-subtle bg-card p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-ink">
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
              <div>
                <label htmlFor="order_index" className="mb-1.5 block text-sm font-medium text-ink">
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
              <div>
                <label htmlFor="group_name" className="mb-1.5 block text-sm font-medium text-ink">
                  اسم المصدر/القناة (اختياري)
                </label>
                <input
                  id="group_name"
                  placeholder="مثلاً: أحمد عادل"
                  value={form.group_name}
                  onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                  className={inputClasses}
                />
                <p className="mt-1.5 text-xs text-muted">
                  لو كتبت نفس الاسم في أكتر من قايمة تشغيل، هيتجمعوا تحت اسم واحد جواه سهم في صفحة
                  المادة.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
                >
                  {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm font-medium text-muted hover:text-ink"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>

            <ul className="flex flex-col gap-3">
              {coursePlaylists.length === 0 ? (
                <p className="text-sm text-muted">لا توجد قوائم تشغيل مضافة بعد لهذه المادة</p>
              ) : (
                coursePlaylists.map((playlist) => (
                  <li
                    key={playlist.id}
                    className="flex flex-col gap-3 rounded-xl border border-subtle bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-ink">{playlist.title}</p>
                      {playlist.group_name && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">
                          {playlist.group_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-muted">
                        الترتيب
                        <input
                          type="number"
                          defaultValue={playlist.order_index}
                          onBlur={(e) => {
                            const value = Number(e.target.value) || 0;
                            if (value !== playlist.order_index) handleReorder(playlist.id, value);
                          }}
                          className="w-16 rounded-lg border border-subtle bg-card px-2 py-1 text-sm text-ink outline-none focus:border-gold"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => startEdit(playlist)}
                        className="text-sm font-medium text-gold hover:underline"
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
                ))
              )}
            </ul>
          </>
        )}
      </div>
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
      <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">الهوية</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">اسم الجامعة</label>
            <input
              required
              value={form.university_name}
              onChange={(e) => updateField("university_name", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              اللوجو (PNG أو JPEG أو WebP، بحد أقصى 2 ميجابايت)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoChange}
              className={inputClasses}
            />
            {form.logo_url && !logoFile && (
              <p className="mt-2 text-sm text-muted">
                اللوجو الحالي:{" "}
                <a
                  href={form.logo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gold hover:underline"
                >
                  عرض
                </a>
              </p>
            )}
            {logoFile && (
              <p className="mt-2 text-sm text-muted">اللوجو المختار: {logoFile.name}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">الصفحة الرئيسية</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
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
            <label className="mb-1.5 block text-sm font-medium text-ink">
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

      <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">التواصل</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
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
            <label className="mb-1.5 block text-sm font-medium text-ink">
              رقم الهاتف (اختياري)
            </label>
            <input
              value={form.support_phone}
              onChange={(e) => updateField("support_phone", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              رابط فيسبوك (اختياري)
            </label>
            <input
              value={form.social_facebook}
              onChange={(e) => updateField("social_facebook", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              رابط لينكد إن (اختياري)
            </label>
            <input
              value={form.social_linkedin}
              onChange={(e) => updateField("social_linkedin", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              رابط انستجرام (اختياري)
            </label>
            <input
              value={form.social_instagram}
              onChange={(e) => updateField("social_instagram", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">
              رقم الواتساب (اختياري)
            </label>
            <input
              value={form.whatsapp_number}
              onChange={(e) => updateField("whatsapp_number", e.target.value.replace(/\D/g, ""))}
              className={inputClasses}
              placeholder="201012345678"
            />
            <p className="mt-1.5 text-xs text-muted">
              أدخل الرقم بالصيغة الدولية بدون + أو مسافات، مثال: 201012345678
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink">الفوتر</h2>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-ink">نص حقوق الملكية</label>
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
          className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>
    </form>
  );
}

type MemberFormState = { name: string; title: string; bio: string; photo_url: string | null };

function buildMemberForms(members: LeadershipMember[]): Record<RoleKey, MemberFormState> {
  const byRole = new Map(members.map((member) => [member.role_key, member]));
  const result = {} as Record<RoleKey, MemberFormState>;

  for (const roleKey of ROLE_ORDER) {
    const member = byRole.get(roleKey);
    result[roleKey] = {
      name: member?.name ?? "",
      title: member?.title ?? "",
      bio: member?.bio ?? "",
      photo_url: member?.photo_url ?? null,
    };
  }

  return result;
}

function LeadershipTab({
  members,
  supabase,
  onChange,
}: {
  members: LeadershipMember[];
  supabase: SupabaseClient;
  onChange: () => void;
}) {
  const [memberForms, setMemberForms] = useState<Record<RoleKey, MemberFormState>>(() =>
    buildMemberForms(members)
  );
  const [memberFiles, setMemberFiles] = useState<Partial<Record<RoleKey, File>>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    setMemberForms(buildMemberForms(members));
  }, [members]);

  function updateMemberField(roleKey: RoleKey, field: keyof MemberFormState, value: string) {
    setMemberForms((prev) => ({ ...prev, [roleKey]: { ...prev[roleKey], [field]: value } }));
    setSuccessMessage(false);
  }

  function handlePhotoChange(roleKey: RoleKey, event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFormError(null);
    setSuccessMessage(false);

    if (!selected) {
      setMemberFiles((prev) => ({ ...prev, [roleKey]: undefined }));
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(selected.type)) {
      setFormError("الصورة لازم تكون بصيغة PNG أو JPEG أو WebP.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_LOGO_FILE_SIZE) {
      setFormError("حجم الصورة أكبر من الحد المسموح به (2 ميجابايت).");
      event.target.value = "";
      return;
    }

    setMemberFiles((prev) => ({ ...prev, [roleKey]: selected }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(false);

    for (const roleKey of ROLE_ORDER) {
      if (memberForms[roleKey].bio.length > MAX_BIO_LENGTH) {
        setFormError(
          `نبذة "${ROLE_FALLBACK_TITLE[roleKey]}" لازم تكون ${MAX_BIO_LENGTH} حرف أو أقل.`
        );
        return;
      }
    }

    setSaving(true);

    const updatedPhotoUrls: Partial<Record<RoleKey, string>> = {};

    for (const roleKey of ROLE_ORDER) {
      const file = memberFiles[roleKey];
      if (!file) continue;

      const path = `leadership/${roleKey}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(path, file);

      if (uploadError) {
        setSaving(false);
        setFormError(`فشل رفع صورة "${ROLE_FALLBACK_TITLE[roleKey]}": ${uploadError.message}`);
        return;
      }

      updatedPhotoUrls[roleKey] = supabase.storage.from("site-assets").getPublicUrl(path).data
        .publicUrl;
    }

    const memberUpdates = await Promise.all(
      ROLE_ORDER.map((roleKey) => {
        const form = memberForms[roleKey];
        return supabase
          .from("leadership_members")
          .update({
            name: form.name,
            title: form.title || null,
            bio: form.bio || null,
            photo_url: updatedPhotoUrls[roleKey] ?? form.photo_url,
          })
          .eq("role_key", roleKey);
      })
    );

    const failedMemberUpdate = memberUpdates.find((res) => res.error);

    setSaving(false);

    if (failedMemberUpdate) {
      setFormError(`فشل حفظ البيانات: ${failedMemberUpdate.error?.message}`);
      return;
    }

    setMemberFiles({});
    setSuccessMessage(true);
    onChange();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {ROLE_ORDER.map((roleKey) => (
        <div key={roleKey} className="rounded-2xl border border-subtle bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold text-ink">{ROLE_FALLBACK_TITLE[roleKey]}</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">الاسم</label>
              <input
                required
                value={memberForms[roleKey].name}
                onChange={(e) => updateMemberField(roleKey, "name", e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">المسمى</label>
              <input
                value={memberForms[roleKey].title}
                onChange={(e) => updateMemberField(roleKey, "title", e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                نبذة ({memberForms[roleKey].bio.length}/{MAX_BIO_LENGTH})
              </label>
              <textarea
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                value={memberForms[roleKey].bio}
                onChange={(e) => updateMemberField(roleKey, "bio", e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                الصورة (PNG أو JPEG أو WebP، بحد أقصى 2 ميجابايت)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handlePhotoChange(roleKey, e)}
                className={inputClasses}
              />
              {memberForms[roleKey].photo_url && !memberFiles[roleKey] && (
                <p className="mt-2 text-sm text-muted">
                  الصورة الحالية:{" "}
                  <a
                    href={memberForms[roleKey].photo_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gold hover:underline"
                  >
                    عرض
                  </a>
                </p>
              )}
              {memberFiles[roleKey] && (
                <p className="mt-2 text-sm text-muted">
                  الصورة المختارة: {memberFiles[roleKey]?.name}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {formError && <p className="text-sm text-red-600">{formError}</p>}
      {successMessage && <p className="text-sm text-green-600">تم حفظ البيانات بنجاح.</p>}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-6 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </div>
    </form>
  );
}
