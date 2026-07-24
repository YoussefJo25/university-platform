export function extractPlaylistId(url: string): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") {
    return null;
  }

  return parsed.searchParams.get("list");
}

export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") {
    return null;
  }

  const listId = parsed.searchParams.get("list");
  if (listId) {
    return `https://www.youtube.com/embed/videoseries?list=${listId}`;
  }

  if (host === "youtu.be") {
    const videoId = parsed.pathname.slice(1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (parsed.pathname === "/watch") {
    const videoId = parsed.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (parsed.pathname.startsWith("/shorts/")) {
    const videoId = parsed.pathname.split("/")[2];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (parsed.pathname.startsWith("/embed/")) {
    return url;
  }

  return null;
}
