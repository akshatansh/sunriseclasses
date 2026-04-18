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

const ALLORIGINS = 'https://corsproxy.io/?';

/** YouTube Atom feed — newest entries first. */
function rssUrlForChannel(channelId: string) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

/**
 * Latest videos from channel RSS (no API key). Uses allorigins.win to bypass CORS.
 * May fail if the proxy is down or YouTube rate-limits the proxy.
 */
export async function fetchLatestVideosFromRss(
  channelId: string,
  limit: number
): Promise<YouTubeVideo[]> {
  const target = rssUrlForChannel(channelId);
  const res = await fetch(`${ALLORIGINS}${encodeURIComponent(target)}`);
  if (!res.ok) throw new Error(`RSS proxy HTTP ${res.status}`);

  const data = await res.text();
  const xml = data;
  if (typeof xml !== 'string' || !xml.includes('<entry')) {
    throw new Error('RSS proxy returned empty or invalid body');
  }

  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('RSS XML parse error');
  }

  const entries = doc.querySelectorAll('entry');
  const out: YouTubeVideo[] = [];

  entries.forEach((entry) => {
    const idText = entry.querySelector('id')?.textContent?.trim() ?? '';
    const id = idText.startsWith('yt:video:') ? idText.slice('yt:video:'.length) : '';
    if (!id) return;

    const titleEl = entry.getElementsByTagName('title')[0];
    const title = titleEl?.textContent?.trim() || 'Video';
    const description =
      entry.getElementsByTagName('media:description')[0]?.textContent?.trim() ||
      entry.querySelector('description')?.textContent?.trim() ||
      '';
    const published =
      entry.getElementsByTagName('published')[0]?.textContent ||
      entry.getElementsByTagName('updated')[0]?.textContent ||
      new Date().toISOString();

    out.push({
      id,
      title,
      description,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: published,
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
