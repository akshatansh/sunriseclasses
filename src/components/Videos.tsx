import { Youtube, Play, Bell, ExternalLink, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

const videoPlaceholders = [
  { title: 'Mathematics – Algebra Basics', subject: 'Class 9 Math', views: '1.2k views', date: '2 days ago', thumb: 'https://images.pexels.com/photos/6238050/pexels-photo-6238050.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { title: 'Science – Newton\'s Laws of Motion', subject: 'Class 9 Science', views: '980 views', date: '3 days ago', thumb: 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { title: 'English Grammar – Tenses', subject: 'Grammar', views: '2.1k views', date: '5 days ago', thumb: 'https://images.pexels.com/photos/6238297/pexels-photo-6238297.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

export default function Videos() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYouTubeVideos = async () => {
      try {
        const channelResponse = await fetch(
          'https://www.youtube.com/@sunriseclasses81'
        );

        const rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCS4AY8MhS5sV7qqTzqPXCvw';

        const response = await fetch(rssUrl);
        if (!response.ok) {
          setVideos([]);
          return;
        }

        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const entries = xmlDoc.querySelectorAll('entry');

        const parsedVideos: YouTubeVideo[] = Array.from(entries)
          .slice(0, 6)
          .map((entry) => {
            const idElement = entry.querySelector('yt\\:videoId, videoId');
            const id = idElement?.textContent || '';
            const title = entry.querySelector('title')?.textContent || '';
            const published = entry.querySelector('published')?.textContent || '';

            return {
              id,
              title,
              thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
              publishedAt: published,
            };
          });

        setVideos(parsedVideos.length > 0 ? parsedVideos : []);
      } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchYouTubeVideos();
    const interval = setInterval(fetchYouTubeVideos, 3600000);
    return () => clearInterval(interval);
  }, []);

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

  const displayVideos = videos.length > 0 ? videos : videoPlaceholders;
  return (
    <section id="videos" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest">Daily Learning</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">Our YouTube Channel</h2>
          <div className="w-16 h-1 bg-[#f5a623] mx-auto mt-4 rounded-full" />
          <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm">
            New educational videos uploaded daily. Subscribe to stay updated and never miss a lecture from our expert faculty.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <a
            href="https://www.youtube.com/@sunriseclasses81"
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
            <span className="text-gray-600 text-sm font-medium">New video every day!</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="text-[#f5a623] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayVideos.map((video, idx) => (
              <a
                key={video.id || idx}
                href={video.id ? `https://www.youtube.com/watch?v=${video.id}` : 'https://www.youtube.com/@sunriseclasses81'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer block"
              >
                <div className="relative overflow-hidden aspect-video">
                  <img
                    src={'thumb' in video ? video.thumb : video.thumbnail}
                    alt={video.title}
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
                  <span className="text-[#f5a623] text-xs font-semibold uppercase tracking-wide">Sunrise Classes</span>
                  <h4 className="text-[#0f2a5c] font-bold text-sm mt-1 leading-snug line-clamp-2">{video.title}</h4>
                  <div className="flex items-center justify-between mt-3">
                    {('subject' in video) && <span className="text-gray-400 text-xs">{video.views}</span>}
                    {('publishedAt' in video) && <span className="text-gray-400 text-xs">{formatDate(video.publishedAt)}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <a
            href="https://www.youtube.com/@sunriseclasses81"
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
