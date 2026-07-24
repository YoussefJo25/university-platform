"use client";

import { useState } from "react";
import { getYoutubeEmbedUrl } from "@/lib/youtube";

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
};

type CourseTabsProps = {
  description: string | null;
  books: BookRow[];
  playlists: PlaylistRow[];
};

const tabs = [
  { key: "overview", label: "نظرة عامة" },
  { key: "books", label: "الكتب" },
  { key: "videos", label: "الفيديوهات" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function CourseTabs({ description, books, playlists }: CourseTabsProps) {
  const [active, setActive] = useState<TabKey>("overview");

  return (
    <div>
      <div className="flex w-full rounded-full border border-navy/10 bg-navy/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            aria-pressed={active === tab.key}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-6 ${
              active === tab.key
                ? "bg-gradient-to-l from-navy to-turquoise text-white shadow-sm"
                : "text-navy/70 hover:text-navy"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-6 shadow-sm">
        {active === "overview" && (
          <div>
            <h2 className="text-lg font-bold text-navy">نظرة عامة</h2>
            <p className="mt-3 text-sm leading-7 text-navy/70">
              {description || "لا يوجد وصف لهذه المادة حاليًا."}
            </p>
          </div>
        )}

        {active === "books" && (
          <div>
            <h2 className="text-lg font-bold text-navy">الكتب</h2>
            {books.length === 0 ? (
              <p className="mt-3 text-sm text-navy/60">لا توجد كتب مضافة بعد</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {books.map((book) => (
                  <li
                    key={book.id}
                    className="flex flex-col gap-3 rounded-xl border border-navy/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-navy">{book.title}</p>
                      {book.author && <p className="text-sm text-navy/60">{book.author}</p>}
                    </div>
                    {book.file_url && (
                      <a
                        href={book.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-navy to-turquoise px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
                      >
                        عرض الكتاب
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {active === "videos" && (
          <div>
            <h2 className="text-lg font-bold text-navy">الفيديوهات</h2>
            {playlists.length === 0 ? (
              <p className="mt-3 text-sm text-navy/60">لا توجد فيديوهات مضافة بعد</p>
            ) : (
              <div className="mt-4 flex flex-col gap-8">
                {playlists.map((playlist) => {
                  const embedUrl = getYoutubeEmbedUrl(playlist.youtube_url);
                  return (
                    <div key={playlist.id}>
                      <p className="mb-3 font-semibold text-navy">{playlist.title}</p>
                      {embedUrl ? (
                        <div className="aspect-video w-full overflow-hidden rounded-xl border border-navy/10 shadow-sm">
                          <iframe
                            src={embedUrl}
                            title={playlist.title}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                          الرابط غير صالح
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
