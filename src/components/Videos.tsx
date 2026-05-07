import { Youtube, Play, Bell, ExternalLink, Loader, BookOpen, Sparkles } from 'lucide-react';
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
const LATEST_VIDEO_FETCH_COUNT = 50;
const LATEST_VIDEO_COUNT = 4;

const VIDEO_CATEGORIES = [
  {
    id: 'math',
    title: 'Math',
    description: 'Formula, practice questions aur board exam ke important concepts.',
    searchQuery: 'math',
    keywords: [
      'math',
      'maths',
      'mathematics',
      'ganit',
      'गणित',
      'algebra',
      'geometry',
      'trigonometry',
      'calculus',
      'arithmetic',
      'numbers',
      'equation',
      'formula',
      'coordinate',
      'distance formula',
      'section formula',
      'area of triangle',
      'दूरी',
      'सूत्र',
      'विभाजन',
      'त्रिभुज',
      'क्षेत्रफल',
      'निर्देशांक',
      'ज्यामिति',
    ],
  },
  {
    id: 'science',
    title: 'Science',
    description: 'Physics, Chemistry aur Biology ke simple explanation videos.',
    searchQuery: 'science',
    keywords: [
      'science',
      'physics',
      'chemistry',
      'biology',
      'jeev',
      'rasaayan',
      'bhautik',
      'vigyan',
      'atom',
      'molecule',
      'cell',
      'force',
      'light',
      'heat',
      'human eye',
      'eye',
      'colourful world',
      'मानव',
      'नेत्र',
      'रंग',
      'संसार',
    ],
  },
];

const FALLBACK_LATEST_VIDEOS: YouTubeVideo[] = [
  // Math Fallbacks
  {
    id: 'fI1BE3anzeU',
    title: 'दूरी सूत्र | Distance Formula | Questions, Answers & Objective | Coordinate Geometry BSEB Bihar Board',
    description: 'Class 10 Bihar Board Maths distance formula questions and answers.',
    thumbnail: 'https://i.ytimg.com/vi/fI1BE3anzeU/hqdefault.jpg',
    publishedAt: '2026-04-18T02:50:19+00:00',
  },
  {
    id: 'pawn1Br2szg',
    title: 'दूरी सूत्र | Distance Formula | Questions & Answers | BSEB Bihar Board | Class 10th',
    description: 'Maths coordinate geometry distance formula practice for Class 10.',
    thumbnail: 'https://i.ytimg.com/vi/pawn1Br2szg/hqdefault.jpg',
    publishedAt: '2026-04-17T02:40:00+00:00',
  },
  {
    id: 'FSMPBuAxzfU',
    title: 'त्रिभुज का क्षेत्रफल | Class 10th BSEB Board | Area Of Triangle',
    description: 'Maths area of triangle and coordinate geometry for BSEB board.',
    thumbnail: 'https://i.ytimg.com/vi/FSMPBuAxzfU/hqdefault.jpg',
    publishedAt: '2026-04-16T02:45:03+00:00',
  },
  {
    id: 'WCVzRv7BWn4',
    title: 'दूरी सूत्र | Distance Formula Questions Answers Objective | Coordinate Geometry | BSEB Class 10',
    description: 'Class 10 Maths distance formula questions and objective for board exam.',
    thumbnail: 'https://i.ytimg.com/vi/WCVzRv7BWn4/hqdefault.jpg',
    publishedAt: '2026-04-15T10:00:00+00:00',
  },
  // Science Fallbacks
  {
    id: 'pl1QdO5TpSU',
    title: 'मानव नेत्र तथा रंग बिरंगा संसार | Human Eye And Colourful World | Class 10th | Bihar Board',
    description: 'Class 10 Bihar Board Science human eye and colourful world explanation.',
    thumbnail: 'https://i.ytimg.com/vi/pl1QdO5TpSU/hqdefault.jpg',
    publishedAt: '2026-04-18T02:50:01+00:00',
  },
  {
    id: 'BeM03E3Moj0',
    title: 'मानव नेत्र तथा रंग बिरंगा संसार | Human Eye And Colourful World , Star Points And Some Q / A BSEB',
    description: 'Science human eye and colourful world Star Points and Q/A.',
    thumbnail: 'https://i.ytimg.com/vi/BeM03E3Moj0/hqdefault.jpg',
    publishedAt: '2026-04-19T02:50:01+00:00',
  },
  {
    id: 'owZA8TFybbA',
    title: 'मानव नेत्र तथा रंग बिरंगा संसार | NCERT Questions & Answers | Class 10 Science BSEB | PART - 4',
    description: 'Class 10 Science BSEB NCERT questions and answers part 4.',
    thumbnail: 'https://i.ytimg.com/vi/owZA8TFybbA/hqdefault.jpg',
    publishedAt: '2026-04-20T02:50:01+00:00',
  },
  {
    id: 'vXd1P-XTxPI',
    title: 'Human Eye & Colourful World | Extra Questions | Class 10 Bihar Board | Easy Hindi Explanation |',
    description: 'Human eye and colourful world extra questions class 10.',
    thumbnail: 'https://i.ytimg.com/vi/vXd1P-XTxPI/hqdefault.jpg',
    publishedAt: '2026-04-21T02:50:01+00:00',
  },
];

function getChannelId(): string {
  return import.meta.env.VITE_YOUTUBE_CHANNEL_ID || YOUTUBE_CHANNEL_ID;
}

function getVideoCategory(video: YouTubeVideo) {
  const searchableText = `${video.title} ${video.description}`.toLowerCase();

  for (const category of VIDEO_CATEGORIES) {
    if (category.keywords.some((keyword) => searchableText.includes(keyword.toLowerCase()))) {
      return category.id;
    }
  }

  return null;
}

export default function Videos() {
  const [categoryVideos, setCategoryVideos] = useState<Record<string, YouTubeVideo[]>>({});
  const [loading, setLoading] = useState(true);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const channelId = getChannelId();
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    const nextCategoryVideos: Record<string, YouTubeVideo[]> = {
      math: [],
      science: [],
    };

    try {
      let latestVideos: YouTubeVideo[] = [];
      if (apiKey) {
        latestVideos = await fetchLatestVideosFromApi(channelId, apiKey, LATEST_VIDEO_FETCH_COUNT);
      }

      if (latestVideos.length === 0) {
        latestVideos = await fetchLatestVideosFromRss(channelId, LATEST_VIDEO_FETCH_COUNT);
      }

      latestVideos.forEach((video) => {
        const categoryId = getVideoCategory(video);
        if (!categoryId) return;
        if (nextCategoryVideos[categoryId].length < LATEST_VIDEO_COUNT) {
          nextCategoryVideos[categoryId].push(video);
        }
      });

      // Fill empty slots with fallback videos to ensure exactly 4 videos are shown
      VIDEO_CATEGORIES.forEach((cat) => {
        if (nextCategoryVideos[cat.id].length < LATEST_VIDEO_COUNT) {
          FALLBACK_LATEST_VIDEOS.forEach((fallbackVideo) => {
            const fallbackCat = getVideoCategory(fallbackVideo);
            const isAlreadyAdded = nextCategoryVideos[cat.id].some(v => v.id === fallbackVideo.id);
            if (fallbackCat === cat.id && !isAlreadyAdded && nextCategoryVideos[cat.id].length < LATEST_VIDEO_COUNT) {
              nextCategoryVideos[cat.id].push(fallbackVideo);
            }
          });
        }
      });

      setCategoryVideos(nextCategoryVideos);
      setUseEmbedFallback(latestVideos.length === 0);
    } catch (e) {
      console.error(e);
      const fallbackCategoryVideos: Record<string, YouTubeVideo[]> = {
        math: [],
        science: [],
      };

      FALLBACK_LATEST_VIDEOS.forEach((video) => {
        const categoryId = getVideoCategory(video);
        if (!categoryId) return;
        if (fallbackCategoryVideos[categoryId].length < LATEST_VIDEO_COUNT) {
          fallbackCategoryVideos[categoryId].push(video);
        }
      });

      setCategoryVideos(fallbackCategoryVideos);
      setUseEmbedFallback(false);
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

  const videoSections = VIDEO_CATEGORIES.map((category) => ({
    ...category,
    videos: categoryVideos[category.id] || [],
  }));

  return (
    <section id="videos" className="py-16 sm:py-20 bg-[linear-gradient(180deg,_#fffaf0_0%,_#ffffff_35%,_#f8fbff_100%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img
              src="/sunrise-logo.png"
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 object-contain drop-shadow-md"
            />
          </div>
          <span className="inline-flex items-center gap-2 text-[#f5a623] text-sm font-semibold uppercase tracking-widest">
            <Sparkles size={14} />
            Daily Learning
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f2a5c] mt-2">Board Exams ke liye Free YouTube Classes</h2>
          <div className="w-16 h-1 bg-[#f5a623] mx-auto mt-4 rounded-full" />
          <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm">
            Class 8, 9 & 10 ke Math aur Science videos, easy explanation ke saath. Latest lectures yahin se watch karein ya channel par subscribe karein.
          </p>
        </div>

        <div className="mb-8 rounded-[2rem] border border-[#ffdca0] bg-[linear-gradient(135deg,_#fff7e8,_#ffffff)] p-5 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
            <a
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2 sm:gap-3 bg-red-600 hover:bg-red-700 text-white font-bold px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-2xl text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5"
            >
              <Youtube size={18} />
              Subscribe on YouTube
              <ExternalLink size={12} />
            </a>
            <div className="flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-lg sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 shadow-sm">
              <Bell size={16} className="text-[#f5a623]" />
              <span className="text-gray-600 text-xs sm:text-sm font-semibold">Latest uploads</span>
            </div>
          </div>
        </div>

        {useEmbedFallback && (
          <p className="text-center text-gray-500 text-sm max-w-2xl mx-auto mb-6">
            Abhi latest thumbnails load nahi ho paaye, isliye channel playlist neeche dikh rahi hai. Page refresh karein ya thodi der baad try karein.
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
          <div className="space-y-10">
            {videoSections.map((category) => {
              const videosForCategory = category.videos;
              return (
                <div key={category.id} className="rounded-[2rem] border border-gray-200 bg-white/90 shadow-sm p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#f5a623]/15 flex items-center justify-center shrink-0">
                        <BookOpen size={22} className="text-[#f5a623]" />
                      </div>
                      <div>
                        <p className="text-[#f5a623] text-xs font-semibold uppercase tracking-widest">{category.title}</p>
                        <h3 className="text-2xl font-extrabold text-[#0f2a5c] mt-1">{category.title} Videos</h3>
                        <p className="text-gray-500 text-sm mt-1 max-w-xl">{category.description}</p>
                      </div>
                    </div>
                    <a
                      href={
                        category.searchQuery
                          ? `${YOUTUBE_CHANNEL_URL}/search?query=${encodeURIComponent(category.searchQuery)}`
                          : YOUTUBE_CHANNEL_URL
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-[#0f2a5c] text-[#0f2a5c] font-semibold px-4 py-3 rounded-2xl hover:bg-[#0f2a5c] hover:text-white transition-all duration-200"
                    >
                      See more
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {videosForCategory.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {videosForCategory.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => setPlayingVideoId(video.id)}
                          className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer block"
                        >
                          <div className="relative overflow-hidden aspect-video">
                            <img
                              src={video.thumbnail}
                              alt=""
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
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
                            <div className="flex items-center justify-between mt-3">
                              <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold">
                                <Play size={12} fill="currentColor" />
                                Watch now
                              </span>
                              <span className="text-gray-400 text-xs">{formatDate(video.publishedAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                      <p className="text-gray-500">Abhi {category.title} videos load nahi ho paaye. Refresh karein ya full channel visit karein.</p>
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* Video Player Modal */}
      {playingVideoId && (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl scale-in-center">
            <button
              onClick={() => setPlayingVideoId(null)}
              className="absolute -top-12 right-0 text-white hover:text-[#f5a623] transition-colors font-bold text-lg flex items-center gap-2 z-50"
            >
              Close <span className="text-2xl">&times;</span>
            </button>
            <div className="aspect-video w-full bg-gray-900">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
