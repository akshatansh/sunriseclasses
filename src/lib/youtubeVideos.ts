/**
 * Fetch latest public videos without YouTube Data API:
 * RSS feed is read via a public CORS proxy (browser cannot call youtube.com directly).
 */

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

const RSS2JSON_URL = 'https://api.rss2json.com/v1/api.json?rss_url=';

/** YouTube Atom feed — newest entries first. */
function rssUrlForChannel(channelId: string) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

/**
 * Latest videos from channel RSS (no API key). Uses rss2json to bypass CORS and parse XML.
 */
export async function fetchLatestVideosFromRss(
  channelId: string,
  limit: number
): Promise<YouTubeVideo[]> {
  const target = rssUrlForChannel(channelId);
  const res = await fetch(`${RSS2JSON_URL}${encodeURIComponent(target)}`);
  
  if (!res.ok) {
    throw new Error(`RSS to JSON API HTTP ${res.status}`);
  }

  const data = await res.json();
  
  if (data.status !== 'ok' || !data.items) {
    throw new Error('RSS to JSON API returned error or empty items');
  }

  const out: YouTubeVideo[] = [];

  data.items.forEach((item: any) => {
    const link = item.link || '';
    // YouTube link format: https://www.youtube.com/watch?v=VIDEO_ID
    const idMatch = link.match(/v=([^&]+)/);
    const id = idMatch ? idMatch[1] : '';
    
    if (!id) return;

    out.push({
      id,
      title: item.title || 'Video',
      description: item.description || '',
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: item.pubDate || new Date().toISOString(),
    });
  });

  return out.slice(0, limit);
}

export async function fetchLatestVideosFromApi(
  channelId: string,
  apiKey: string,
  limit: number
): Promise<YouTubeVideo[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    maxResults: String(limit),
    order: 'date',
    type: 'video',
    key: apiKey,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn('YouTube Data API error', res.status, err);
    return [];
  }

  const data = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
      };
    }>;
  };

  if (!data.items?.length) return [];

  const mapped = data.items
    .map((item) => {
      const id = item.id?.videoId;
      if (!id) return null;
      const sn = item.snippet;
      const thumb =
        sn?.thumbnails?.high?.url ||
        sn?.thumbnails?.medium?.url ||
        sn?.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      return {
        id,
        title: sn?.title || 'Video',
        description: sn?.description || '',
        thumbnail: thumb,
        publishedAt: sn?.publishedAt || new Date().toISOString(),
      };
    })
    .filter((v): v is YouTubeVideo => v !== null);

  return mapped.slice(0, limit);
}
