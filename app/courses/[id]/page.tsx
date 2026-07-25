import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { extractPlaylistId, getYoutubeEmbedUrl } from "@/lib/youtube";
import { getPlaylistVideos } from "@/lib/youtubeApi";
import CourseTabs from "@/components/CourseTabs";

export const dynamic = "force-dynamic";

type CourseRow = {
  id: number;
  name: string;
  description: string | null;
  year_id: number | null;
  category: "academic" | "learning_path";
  parent_course_id: number | null;
  years: { name: string; year_number: number } | null;
};

type ChildCourseRow = {
  id: number;
  name: string;
  description: string | null;
};

type ParentCourseRow = {
  id: number;
  name: string;
};

type BookRow = {
  id: number;
  title: string;
  author: string | null;
  file_url: string | null;
  folder_id: number | null;
};

type BookFolderRow = {
  id: number;
  name: string;
  order_index: number;
};

type BookFolderGroup = {
  id: number;
  name: string;
  books: BookRow[];
};

type PlaylistRow = {
  id: number;
  title: string;
  youtube_url: string;
  order_index: number;
  group_name: string | null;
};

type VideoItem = {
  id: string;
  title: string;
  embedUrl: string | null;
};

type PlaylistGroup = {
  id: number;
  title: string;
  group_name: string | null;
  videos: VideoItem[];
};

async function fetchPlaylistRows(courseId: string): Promise<PlaylistRow[]> {
  const full = await supabase
    .from("playlists")
    .select("id, title, youtube_url, order_index, group_name")
    .eq("course_id", courseId)
    .order("order_index")
    .order("title");

  if (!full.error) {
    return (full.data ?? []) as PlaylistRow[];
  }

  // group_name ممكن يكون لسه معملوش migration (playlist_groups_setup.sql)
  const fallback = await supabase
    .from("playlists")
    .select("id, title, youtube_url, order_index")
    .eq("course_id", courseId)
    .order("order_index")
    .order("title");

  return ((fallback.data ?? []) as Omit<PlaylistRow, "group_name">[]).map((row) => ({
    ...row,
    group_name: null,
  }));
}

async function expandPlaylistRow(row: PlaylistRow): Promise<VideoItem[]> {
  const playlistId = extractPlaylistId(row.youtube_url);

  if (playlistId) {
    const playlistVideos = await getPlaylistVideos(playlistId);

    if (playlistVideos.length > 0) {
      return playlistVideos
        .sort((a, b) => a.position - b.position)
        .map((video) => ({
          id: `${row.id}-${video.videoId}`,
          title: video.title,
          embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
        }));
    }
  }

  return [
    {
      id: `row-${row.id}`,
      title: row.title,
      embedUrl: getYoutubeEmbedUrl(row.youtube_url),
    },
  ];
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select("id, name, description, year_id, category, parent_course_id, years(name, year_number)")
    .eq("id", id)
    .single();

  if (courseError) {
    // parent_course_id ممكن يكون لسه معملوش migration (course_sections_setup.sql)
    // حتى لو category أصلاً متاح - نرجع لاستعلام بيحافظ على category الحقيقي
    const withoutParent = await supabase
      .from("courses")
      .select("id, name, description, year_id, category, years(name, year_number)")
      .eq("id", id)
      .single();

    if (!withoutParent.error && withoutParent.data) {
      courseData = { ...withoutParent.data, parent_course_id: null };
      courseError = null;
    } else {
      // category كمان ممكن يكون لسه معملوش migration (learning_path_setup.sql)
      // نرجع للاستعلام القديم تمامًا عشان المواد الأكاديمية الموجودة تفضل شغالة
      const fallback = await supabase
        .from("courses")
        .select("id, name, description, year_id, years(name, year_number)")
        .eq("id", id)
        .single();

      if (!fallback.error && fallback.data) {
        courseData = { ...fallback.data, category: "academic", parent_course_id: null };
        courseError = null;
      }
    }
  }

  if (courseError || !courseData) {
    notFound();
  }

  const course = courseData as unknown as CourseRow;

  const [childrenRes, parentRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, description")
      .eq("parent_course_id", id)
      .order("name"),
    course.parent_course_id
      ? supabase.from("courses").select("id, name").eq("id", course.parent_course_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const children = (childrenRes.error ? [] : (childrenRes.data ?? [])) as ChildCourseRow[];
  const parent = (parentRes.error ? null : parentRes.data) as ParentCourseRow | null;
  const hasChildren = children.length > 0;

  let bookFolders: BookFolderGroup[] = [];
  let unfiledBooks: BookRow[] = [];
  let playlistGroups: PlaylistGroup[] = [];

  if (!hasChildren) {
    const [{ data: booksData }, { data: folderRows }, playlistRows] = await Promise.all([
      supabase
        .from("books")
        .select("id, title, author, file_url, folder_id")
        .eq("course_id", id)
        .order("title"),
      supabase
        .from("book_folders")
        .select("id, name, order_index")
        .eq("course_id", id)
        .order("order_index")
        .order("name"),
      fetchPlaylistRows(id),
    ]);

    const books = (booksData ?? []) as BookRow[];
    const bookFolderRows = (folderRows ?? []) as BookFolderRow[];
    bookFolders = bookFolderRows.map((folder) => ({
      id: folder.id,
      name: folder.name,
      books: books.filter((book) => book.folder_id === folder.id),
    }));
    unfiledBooks = books.filter((book) => !book.folder_id);
    playlistGroups = await Promise.all(
      playlistRows.map(async (row) => ({
        id: row.id,
        title: row.title,
        group_name: row.group_name,
        videos: await expandPlaylistRow(row),
      }))
    );
  }

  const backLink =
    course.category === "learning_path"
      ? course.parent_course_id && parent
        ? { href: `/courses/${course.parent_course_id}`, label: `الرجوع لـ ${parent.name}` }
        : { href: "/learning-path", label: "الرجوع لمسارات تعلم البرمجة" }
      : {
          href: `/academic-years/${course.year_id}`,
          label: `الرجوع لمواد ${course.years?.name ?? "السنة الدراسية"}`,
        };

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-panel border-b border-subtle px-4 py-14 text-center sm:px-6">
        {course.category === "learning_path" ? (
          <p className="text-xs font-medium text-muted sm:text-sm">مسار تعلم البرمجة</p>
        ) : (
          course.years && (
            <p className="text-xs font-medium text-muted sm:text-sm">{course.years.name}</p>
          )
        )}
        <h1 className="mt-2 text-2xl font-extrabold font-display text-ink sm:text-4xl">{course.name}</h1>
      </section>

      <section className="flex-1 bg-canvas px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href={backLink.href}
            className="mb-8 inline-block text-sm font-medium text-ink transition-colors hover:text-gold"
          >
            {backLink.label}
          </Link>

          {hasChildren ? (
            <div>
              {course.description && (
                <p className="mb-8 text-sm leading-7 text-muted">{course.description}</p>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/courses/${child.id}`}
                    className="rounded-2xl border border-subtle bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <h2 className="text-lg font-bold text-ink">{child.name}</h2>
                    {child.description && (
                      <p className="mt-2 text-sm text-muted">{child.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <CourseTabs
              description={course.description}
              bookFolders={bookFolders}
              unfiledBooks={unfiledBooks}
              playlistGroups={playlistGroups}
            />
          )}
        </div>
      </section>
    </div>
  );
}
