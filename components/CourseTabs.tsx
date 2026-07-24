"use client";

import { useState } from "react";

type BookRow = {
  id: number;
  title: string;
  author: string | null;
  file_url: string | null;
};

type VideoItem = {
  id: string;
  title: string;
  embedUrl: string | null;
};

type CourseTabsProps = {
  description: string | null;
  books: BookRow[];
  videos: VideoItem[];
};

const tabs = [
  { key: "overview", label: "نظرة عامة" },
  { key: "books", label: "الكتب" },
  { key: "videos", label: "الفيديوهات" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function CourseTabs({ description, books, videos }: CourseTabsProps) {
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
            {videos.length === 0 ? (
              <p className="mt-3 text-sm text-navy/60">لا توجد فيديوهات مضافة بعد</p>
            ) : (
              <VideoPlayer videos={videos} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoPlayer({ videos }: { videos: VideoItem[] }) {
  const [selectedId, setSelectedId] = useState(videos[0]?.id);
  const selected = videos.find((v) => v.id === selectedId) ?? videos[0];

  return (
    <div className="mt-4 flex flex-col gap-6 sm:flex-row-reverse">
      <div className="flex-1">
        {selected.embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-navy/10 shadow-sm">
            <iframe
              key={selected.id}
              src={selected.embedUrl}
              title={selected.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            الرابط غير صالح
          </div>
        )}
        <p className="mt-3 font-semibold text-navy">{selected.title}</p>
      </div>

      {videos.length > 1 && (
        <ul className="flex flex-col gap-2 sm:w-72 sm:shrink-0">
          {videos.map((video) => (
            <li key={video.id}>
              <button
                type="button"
                onClick={() => setSelectedId(video.id)}
                aria-pressed={video.id === selected.id}
                className={`w-full rounded-xl px-4 py-3 text-right text-sm font-medium transition-colors ${
                  video.id === selected.id
                    ? "bg-gradient-to-l from-navy to-turquoise text-white shadow-sm"
                    : "bg-navy/5 text-navy/80 hover:bg-navy/10"
                }`}
              >
                {video.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
