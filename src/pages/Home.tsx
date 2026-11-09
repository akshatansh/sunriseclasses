import Seo from '../components/Seo';
import Hero from '../components/Hero';
import NoticeBoard from '../components/NoticeBoard';
import About from '../components/About';
import Courses from '../components/Courses';
import Videos from '../components/Videos';
import Gallery from '../components/Gallery';
import SeoContentBlock from '../components/SeoContentBlock';
import Contact from '../components/Contact';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <Seo
        title="Sunrise Classes Champanagar | Class 8, 9, 10 Coaching Purnia"
        description="Sunrise Classes & Academy in Champanagar, Purnia: Best Bihar Board coaching for Class 8, 9 & 10 by SP Jha. Daily tests, offline batches. Call: 9973152070."
        keywords="Sunrise Classes Champanagar, Sunrise Classes Purnia Bihar, Sunrise Classes & Academy, SP Jha coaching Champanagar Purnia, best coaching in Champanagar Purnia, Class 8 coaching Champanagar, Class 9 coaching Champanagar, Class 10 coaching Purnia, BSEB Bihar Board coaching Purnia, offline tuition Champanagar Purnia, Bihar Board exam preparation, coaching institute near Champanagar Purnia, board exam coaching Purnia Bihar"
        url="/"
      />
      <Hero />

      {/* STSE 2027 Mega Announcement Banner */}
      <section className="bg-[#06162f] py-4 sm:py-6 px-4 sm:px-6 lg:px-8 border-y border-[#f5a623]/30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-[#0f2a5c] via-[#153e75] to-[#0f2a5c] p-4 sm:p-6 rounded-2xl border-2 border-[#f5a623]/60 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f5a623] to-[#d48806] text-[#0f2a5c] flex items-center justify-center shrink-0 shadow-lg text-2xl">
              🏆
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#f5a623]/20 border border-[#f5a623]/40 text-[#f5a623] text-[11px] font-black uppercase tracking-wider mb-1">
                <Sparkles size={12} /> चंपानगर का सबसे बड़ा टैलेंट टेस्ट
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-white">
                सनराइज प्रतिभा खोज परीक्षा 2027 (STSE) — Class 10th बैच
              </h3>
              <p className="text-amber-200/90 text-xs sm:text-sm mt-0.5">
                Top 10 को <strong>Smartwatch, Trophies व 100% तक फीस माफ़ी</strong>! हर छात्र को फ्री <strong>Exam Kit + Certificate</strong>!
              </p>
            </div>
          </div>
          <Link
            to="/stse"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#f5a623] to-[#d48806] text-[#0f2a5c] font-black text-sm shrink-0 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>फ्री फॉर्म भरें व एडमिट कार्ड पाएं</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,_#143772_0%,_#f8fbff_100%)] pt-10 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <NoticeBoard />
        </div>
      </section>
      <About />
      <Courses />
      <Videos />
      <Gallery previewCount={3} showViewAll />
      <SeoContentBlock />
      <Contact />
    </div>
  );
}
