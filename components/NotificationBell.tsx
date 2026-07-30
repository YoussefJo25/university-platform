"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useClickOutside } from "@/hooks/useClickOutside";
import { formatRelativeTime } from "@/lib/relativeTime";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

const POLL_INTERVAL_MS = 60 * 1000;

const TYPE_ICONS: Record<string, string> = {
  qa_reply: "💬",
  new_content: "📢",
  achievement: "🏆",
  inactivity_reminder: "👋",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, link_url, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(15);

    setNotifications((data ?? []) as NotificationRow[]);
  }

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleOpenNotification(notification: NotificationRow) {
    setIsOpen(false);
    if (notification.is_read) return;

    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="الإشعارات"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-card hover:text-ink"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gold/25 bg-card p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold text-ink">الإشعارات</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-gold hover:underline"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="mt-1 flex max-h-96 flex-col gap-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted">لا توجد إشعارات</p>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link_url || "/"}
                  onClick={() => handleOpenNotification(notification)}
                  className={`flex items-start gap-2 rounded-lg px-2 py-2 text-right transition-colors hover:bg-panel ${
                    notification.is_read ? "" : "bg-gold/5"
                  }`}
                >
                  <span className="text-base">{TYPE_ICONS[notification.type] ?? "🔔"}</span>
                  <span className="flex-1">
                    <span className="block text-xs font-medium text-ink">
                      {notification.title}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </span>
                  {!notification.is_read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
