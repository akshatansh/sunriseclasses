import { Youtube, Play, Bell, ExternalLink, Loader } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_CHANNEL_URL,
  YOUTUBE_UPLOADS_PLAYLIST_ID,
} from '../config/youtube';
import {
  fetchLatestVideosFromApi,
  fetchLatestVideosFromRss,
  type YouTubeVideo,
} from '../lib/youtubeVideos';

const REFRESH_MS = 15 * 60 * 1000;
const LATEST_VIDEO_COUNT = 4;

function getChannelId(): string {
  return import.meta.env.VITE_YOUTUBE_CHANNEL_ID || YOUTUBE_CHANNEL_ID;
}

export default function Videos() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const channelId = getChannelId();
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

    let list: YouTubeVideo[] = [];

    try {
      try {
        list = await fetchLatestVideosFromRss(channelId, LATEST_VIDEO_COUNT);
      } catch (rssErr) {
        console.warn('YouTube RSS (no API) failed:', rssErr);
      }

      if (list.length === 0 && apiKey) {
        list = await fetchLatestVideosFromApi(channelId, apiKey, LATEST_VIDEO_COUNT);
      }

      if (list.length > 0) {
        setVideos(list);
        setUseEmbedFallback(false);
      } else {
        setVideos([]);
        setUseEmbedFallback(true);
      }
    } catch (e) {
      console.error(e);
      setVideos([]);
      setUseEmbedFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <section id="videos" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="flex justify-center mb-4">
            <img
              src="/sunrise-logo.png"
              alt=""
              className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-md"
            />
          </div>
          <span className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest">Daily Learning</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">Educational YouTube Videos for Board Exams</h2>
          <div className="w-16 h-1 bg-[#f5a623] mx-auto mt-4 rounded-full" />
          <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm">
            Daily educational videos for Class 9 & 10 board exam preparation in Purnia, Bihar. Subscribe to our YouTube channel for free coaching videos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <a
            href={YOUTUBE_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5"
          >
            <Youtube size={20} />
            Visit Our Channel
            <ExternalLink size={14} />
          </a>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
            <Bell size={18} className="text-[#f5a623]" />
            <span className="text-gray-600 text-sm font-medium">New videos on the channel</span>
          </div>
        </div>

        {useEmbedFallback && (
          <p className="text-center text-gray-500 text-sm max-w-2xl mx-auto mb-6">
            Thumbnail list could not load right now — your channel playlist is below. Refresh the page or try again later.
            Optional backup: set <code className="text-xs bg-gray-100 px-1 rounded">VITE_YOUTUBE_API_KEY</code> in{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">.env</code>.
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="text-[#f5a623] animate-spin" />
          </div>
        ) : useEmbedFallback ? (
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-black aspect-video">
            <iframe
              className="w-full h-full min-h-[220px]"
              src={`https://www.youtube.com/embed/videoseries?list=${YOUTUBE_UPLOADS_PLAYLIST_ID}`}
              title="Sunrise Classes — latest videos from @sunriseclasses81"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {videos.map((video) => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer block"
              >
                <div className="relative overflow-hidden aspect-video">
                  <img
                    src={video.thumbnail}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-[#0f2a5c]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                      <Play size={22} className="text-white ml-1" fill="white" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <Youtube size={12} />
                    YouTube
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-[#f5a623] text-xs font-semibold uppercase tracking-wide">@sunriseclasses81</span>
                  <h4 className="text-[#0f2a5c] font-bold text-sm mt-1 leading-snug line-clamp-2">{video.title}</h4>
                  <div className="flex items-center justify-end mt-3">
                    <span className="text-gray-400 text-xs">{formatDate(video.publishedAt)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <a
            href={YOUTUBE_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border-2 border-[#0f2a5c] text-[#0f2a5c] font-bold px-6 py-3 rounded-xl hover:bg-[#0f2a5c] hover:text-white transition-all duration-200"
          >
            View All Videos
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
