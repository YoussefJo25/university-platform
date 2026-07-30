export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `من ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `من ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  if (diffDays < 30) return `من ${diffDays} يوم`;

  return new Date(iso).toLocaleDateString("ar-EG");
}
