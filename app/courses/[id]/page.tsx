import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CourseTabs from "@/components/CourseTabs";

export const dynamic = "force-dynamic";

type CourseRow = {
  id: number;
  name: string;
  description: string | null;
  year_id: number;
  years: { name: string; year_number: number } | null;
};

type BookRow = {
  id: number;
  title: string;
  author: string | null;
  file_url: string | null;
};

type PlaylistRow = {
  id: number;
  title: string;
  youtube_url: string;
  order_index: number;
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select("id, name, description, year_id, years(name, year_number)")
    .eq("id", id)
    .single();

  if (courseError || !courseData) {
    notFound();
  }

  const course = courseData as unknown as CourseRow;

  const [{ data: booksData }, { data: playlistsData }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, file_url")
      .eq("course_id", id)
      .order("title"),
    supabase
      .from("playlists")
      .select("id, title, youtube_url, order_index")
      .eq("course_id", id)
      .order("order_index")
      .order("title"),
  ]);

  const books = (booksData ?? []) as BookRow[];
  const playlists = (playlistsData ?? []) as PlaylistRow[];

  return (
    <div className="flex flex-1 flex-col">
      <section className="bg-gradient-to-l from-navy to-turquoise px-4 py-14 text-center sm:px-6">
        {course.years && (
          <p className="text-xs font-medium text-white/70 sm:text-sm">{course.years.name}</p>
        )}
        <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-4xl">{course.name}</h1>
      </section>

      <section className="flex-1 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/academic-years/${course.year_id}`}
            className="mb-8 inline-block text-sm font-medium text-navy transition-colors hover:text-turquoise"
          >
            الرجوع لمواد {course.years?.name ?? "السنة الدراسية"}
          </Link>

          <CourseTabs description={course.description} books={books} playlists={playlists} />
        </div>
      </section>
    </div>
  );
}
