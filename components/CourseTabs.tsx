"use client";

import { useEffect, useRef, useState } from "react";
import ReportIssueButton from "@/components/ReportIssueButton";

type BookRow = {
  id: number;
  title: string;
  author: string | null;
  file_url: string | null;
};

type BookFolderGroup = {
  id: number;
  name: string;
  books: BookRow[];
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

type SourceGroup = {
  key: string;
  members: PlaylistGroup[];
};

function buildSourceGroups(playlistGroups: PlaylistGroup[]): SourceGroup[] {
  const sourceGroups: SourceGroup[] = [];
  const bySourceName = new Map<string, SourceGroup>();

  for (const playlistGroup of playlistGroups) {
    if (playlistGroup.group_name) {
      let sourceGroup = bySourceName.get(playlistGroup.group_name);
      if (!sourceGroup) {
        sourceGroup = { key: `source-${playlistGroup.group_name}`, members: [] };
        bySourceName.set(playlistGroup.group_name, sourceGroup);
        sourceGroups.push(sourceGroup);
      }
      sourceGroup.members.push(playlistGroup);
    } else {
      sourceGroups.push({ key: `single-${playlistGroup.id}`, members: [playlistGroup] });
    }
  }

  return sourceGroups;
}

type CourseTabsProps = {
  courseId: number;
  description: string | null;
  bookFolders: BookFolderGroup[];
  unfiledBooks: BookRow[];
  playlistGroups: PlaylistGroup[];
};

const tabs = [
  { key: "overview", label: "نظرة عامة" },
  { key: "books", label: "الكتب" },
  { key: "videos", label: "الفيديوهات" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function CourseTabs({
  courseId,
  description,
  bookFolders,
  unfiledBooks,
  playlistGroups,
}: CourseTabsProps) {
  const [active, setActive] = useState<TabKey>("overview");

  return (
    <div>
      <div className="flex w-full rounded-full border border-subtle bg-panel p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            aria-pressed={active === tab.key}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-6 ${
              active === tab.key
                ? "bg-gold text-gold-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-subtle bg-card p-6 shadow-sm">
        {active === "overview" && (
          <div>
            <h2 className="text-lg font-bold text-ink">نظرة عامة</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              {description || "لا يوجد وصف لهذه المادة حاليًا."}
            </p>
          </div>
        )}

        {active === "books" && (
          <div>
            <h2 className="text-lg font-bold text-ink">الكتب</h2>
            {bookFolders.length === 0 && unfiledBooks.length === 0 ? (
              <p className="mt-3 text-sm text-muted">لا توجد كتب مضافة بعد</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {bookFolders.map((folder) => (
                  <BookFolderAccordion
                    key={folder.id}
                    courseId={courseId}
                    name={folder.name}
                    books={folder.books}
                  />
                ))}
                {unfiledBooks.length > 0 && (
                  <BookFolderAccordion
                    courseId={courseId}
                    name="ملفات عامة"
                    books={unfiledBooks}
                    defaultOpen={bookFolders.length === 0}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {active === "videos" && (
          <div>
            <h2 className="text-lg font-bold text-ink">الفيديوهات</h2>
            {playlistGroups.length === 0 ? (
              <p className="mt-3 text-sm text-muted">لا توجد فيديوهات مضافة بعد</p>
            ) : (
              <VideoPlayer courseId={courseId} playlistGroups={playlistGroups} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoPlayer({
  courseId,
  playlistGroups,
}: {
  courseId: number;
  playlistGroups: PlaylistGroup[];
}) {
  const [selectedGroupId, setSelectedGroupId] = useState(playlistGroups[0]?.id);
  const selectedGroup = playlistGroups.find((g) => g.id === selectedGroupId) ?? playlistGroups[0];

  const [selectedVideoId, setSelectedVideoId] = useState(selectedGroup.videos[0]?.id);
  const selectedVideo =
    selectedGroup.videos.find((v) => v.id === selectedVideoId) ?? selectedGroup.videos[0];

  const sourceGroups = buildSourceGroups(playlistGroups);

  function handleSelectGroup(group: PlaylistGroup) {
    setSelectedGroupId(group.id);
    setSelectedVideoId(group.videos[0]?.id);
  }

  return (
    <div className="mt-4">
      {playlistGroups.length > 1 && (
        <div className="mb-6 flex w-full flex-wrap gap-1 rounded-full border border-subtle bg-panel p-1">
          {sourceGroups.map((sourceGroup) =>
            sourceGroup.members.length > 1 ? (
              <SourceGroupSelector
                key={sourceGroup.key}
                sourceGroup={sourceGroup}
                selectedGroupId={selectedGroup.id}
                onSelect={handleSelectGroup}
              />
            ) : (
              <button
                key={sourceGroup.key}
                type="button"
                onClick={() => handleSelectGroup(sourceGroup.members[0])}
                aria-pressed={sourceGroup.members[0].id === selectedGroup.id}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-6 ${
                  sourceGroup.members[0].id === selectedGroup.id
                    ? "bg-gold text-gold-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {sourceGroup.members[0].title}
              </button>
            )
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row-reverse">
        <div className="flex-1">
          {selectedVideo.embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-subtle bg-card shadow-sm">
              <iframe
                key={selectedVideo.id}
                src={selectedVideo.embedUrl}
                title={selectedVideo.title}
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
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-semibold text-ink">{selectedVideo.title}</p>
            <ReportIssueButton
              courseId={courseId}
              itemType="video"
              itemTitle={selectedVideo.title}
            />
          </div>
        </div>

        {selectedGroup.videos.length > 1 && (
          <ul className="flex flex-col gap-2 sm:w-72 sm:shrink-0">
            {selectedGroup.videos.map((video) => (
              <li key={video.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedVideoId(video.id)}
                  aria-pressed={video.id === selectedVideo.id}
                  className={`flex-1 rounded-xl px-4 py-3 text-right text-sm font-medium transition-colors ${
                    video.id === selectedVideo.id
                      ? "bg-gold text-gold-ink shadow-sm"
                      : "bg-panel text-muted hover:bg-card"
                  }`}
                >
                  {video.title}
                </button>
                <ReportIssueButton courseId={courseId} itemType="video" itemTitle={video.title} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SourceGroupSelector({
  sourceGroup,
  selectedGroupId,
  onSelect,
}: {
  sourceGroup: SourceGroup;
  selectedGroupId: number;
  onSelect: (group: PlaylistGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = sourceGroup.members.some((member) => member.id === selectedGroupId);
  const groupLabel = sourceGroup.members[0].group_name ?? sourceGroup.members[0].title;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex w-full items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-6 ${
          isActive
            ? "bg-gold text-gold-ink shadow-sm"
            : "text-muted hover:text-ink"
        }`}
      >
        {groupLabel}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-xl border border-subtle bg-card shadow-lg">
          {sourceGroup.members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                onSelect(member);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2.5 text-right text-sm transition-colors ${
                member.id === selectedGroupId
                  ? "bg-panel font-semibold text-ink"
                  : "text-muted hover:bg-panel"
              }`}
            >
              {member.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookFolderAccordion({
  courseId,
  name,
  books,
  defaultOpen = false,
}: {
  courseId: number;
  name: string;
  books: BookRow[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-subtle bg-card">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-right"
      >
        <span className="font-semibold text-ink">{name}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-5 w-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-subtle bg-card p-4">
          {books.length === 0 ? (
            <p className="text-sm text-muted">لا توجد ملفات في هذا الفولدر بعد</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {books.map((book) => (
                <li
                  key={book.id}
                  className="flex flex-col gap-3 rounded-xl border border-subtle bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-ink">{book.title}</p>
                    {book.author && <p className="text-sm text-muted">{book.author}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <ReportIssueButton courseId={courseId} itemType="book" itemTitle={book.title} />
                    {book.file_url && (
                      <a
                        href={book.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-gold text-gold-ink px-4 py-2 text-xs font-semibold shadow-sm transition-transform hover:scale-105"
                      >
                        تحميل الكتاب
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
