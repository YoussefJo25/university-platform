export type PlaylistVideo = {
  videoId: string;
  title: string;
  position: number;
  thumbnailUrl: string | null;
};

const PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems";

type PlaylistItemsResponse = {
  items?: {
    snippet?: {
      title?: string;
      position?: number;
      resourceId?: { videoId?: string };
      thumbnails?: { medium?: { url?: string } };
    };
    contentDetails?: { videoId?: string };
  }[];
  nextPageToken?: string;
};

export async function getPlaylistVideos(playlistId: string): Promise<PlaylistVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("YOUTUBE_API_KEY is not set; skipping playlist fetch for", playlistId);
    return [];
  }

  const videos: PlaylistVideo[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const url = new URL(PLAYLIST_ITEMS_URL);
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("playlistId", playlistId);
      url.searchParams.set("key", apiKey);
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url.toString(), {
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        console.warn(
          `YouTube API request failed for playlist ${playlistId}: ${response.status} ${response.statusText}`
        );
        break;
      }

      const data = (await response.json()) as PlaylistItemsResponse;

      for (const item of data.items ?? []) {
        const videoId = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title;

        if (!videoId || !title || title === "Deleted video" || title === "Private video") {
          continue;
        }

        videos.push({
          videoId,
          title,
          position: item.snippet?.position ?? videos.length,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? null,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (error) {
    console.warn(`Failed to fetch YouTube playlist ${playlistId}:`, error);
  }

  return videos;
}
