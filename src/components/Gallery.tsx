import { useState } from 'react';
import { Sparkles, ImageIcon, Expand } from 'lucide-react';
import { Link } from 'react-router-dom';

const images = [
  '/gallery/WhatsApp Image 2026-04-29 at 21.13.45.jpeg',
  '/gallery/WhatsApp Image 2026-04-29 at 21.13.45 (1).jpeg',
  '/gallery/WhatsApp Image 2026-04-29 at 21.13.46.jpeg',
  '/gallery/WhatsApp Image 2026-04-29 at 21.13.46 (1).jpeg',
  '/gallery/WhatsApp Image 2026-04-29 at 21.13.47.jpeg',
  '/gallery/WhatsApp Image 2026-04-29 at 21.13.47 (1).jpeg',
  '/gallery/WhatsApp Image 2026-04-29 at 21.13.47 (2).jpeg',
];

interface GalleryProps {
  previewCount?: number;
  showViewAll?: boolean;
}

export default function Gallery({ previewCount, showViewAll = false }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const visibleImages = previewCount ? images.slice(0, previewCount) : images;

  return (
    <section id="gallery" className="py-20 bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_50%,_#fffaf0_100%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img
              src="/sunrise-logo.png"
              alt="Sunrise Classes Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 object-contain drop-shadow-md"
            />
          </div>
          <span className="inline-flex items-center gap-2 text-[#f5a623] text-xs sm:text-sm font-semibold uppercase tracking-widest">
            <Sparkles size={14} />
            Our Gallery
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f2a5c] mt-2">Sunrise Classes & Academy</h2>
          <div className="w-12 sm:w-16 h-1 bg-[#f5a623] mx-auto mt-3 sm:mt-4 rounded-full" />
          <p className="text-gray-500 mt-3 sm:mt-4 max-w-xl mx-auto text-xs sm:text-sm">
            Take a glimpse of our classrooms, students, and faculty at Sunrise Classes in Champanagar, Purnia, Bihar.
          </p>
        </div>

        <div className="mb-10 rounded-[2rem] border border-[#d8e4ff] bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2a5c] text-white">
                <ImageIcon size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Campus Highlights</p>
                <h3 className="text-xl font-bold text-[#0f2a5c]">Moments from classrooms, guidance, and achievements</h3>
              </div>
            </div>
            {showViewAll ? (
              <Link
                to="/gallery"
                className="inline-flex items-center justify-center rounded-full bg-[#0f2a5c] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#173873]"
              >
                View Full Gallery
              </Link>
            ) : (
              <div className="rounded-full bg-[#fff7e6] px-4 py-2 text-sm font-semibold text-[#9a5b00]">
                Tap any image to view larger
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visibleImages.map((src, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-[1.75rem] shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white"
              onClick={() => setSelectedImage(src)}
            >
              <img
                src={src}
                alt={`Sunrise Classes Champanagar Purnia - Classroom Photo ${index + 1}`}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.src = '/sunrise-logo.png'; // Fallback to logo if image fails
                }}
              />
              <div className="absolute inset-0 bg-[#0f2a5c]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white text-center">
                  <div className="w-12 h-12 bg-[#f5a623] rounded-full flex items-center justify-center mx-auto mb-2">
                    <Expand size={20} />
                  </div>
                  <p className="text-sm font-medium">View Image</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showViewAll && (
          <div className="mt-8 text-center">
            <Link
              to="/gallery"
              className="inline-flex items-center justify-center rounded-full border-2 border-[#0f2a5c] px-6 py-3 text-sm font-bold text-[#0f2a5c] transition-all hover:bg-[#0f2a5c] hover:text-white"
            >
              Explore All Photos
            </Link>
          </div>
        )}

        {selectedImage && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-4xl max-h-full">
              <img src={selectedImage} alt="Sunrise Classes Event Preview" className="max-w-full max-h-full object-contain" />
              <button
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
