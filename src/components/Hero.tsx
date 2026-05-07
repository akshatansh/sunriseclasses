import { BookOpen, Users, Award, TrendingUp, Sparkles, ArrowRight, PlayCircle } from 'lucide-react';

const stats = [
  { icon: Users, value: '500+', label: 'Students' },
  { icon: BookOpen, value: '10+', label: 'Subjects' },
  { icon: Award, value: '15+', label: 'Years Experience' },
  { icon: TrendingUp, value: '95%', label: 'Success Rate' },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col justify-start lg:justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(245,166,35,0.14),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(120,180,255,0.12),_transparent_24%),linear-gradient(135deg,_#06162f_0%,_#0c2450_48%,_#143772_100%)]"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#f5a623]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sky-300/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f5a623]/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 sm:pt-44 pb-12 sm:pb-16 mt-auto mb-auto">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#f5a623]/15 border border-[#f5a623]/25 rounded-full px-4 py-2 mb-6 backdrop-blur">
              <Sparkles size={14} className="text-[#f5a623]" />
              <span className="text-[#f5a623] text-xs font-semibold tracking-wide uppercase">
                Champanagar, Purnia, Bihar
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
              Best Coaching in Champanagar Purnia
              <span className="block bg-gradient-to-r from-[#f5a623] via-[#ffd978] to-[#fff0ba] bg-clip-text text-transparent">Sunrise Classes & Academy</span>
            </h1>

            <p className="text-[#c1d4f1] text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 mb-4 leading-relaxed">
              Expert coaching for Class 8, 9 & 10 board exams in Champanagar, Purnia, Bihar. 
              With 15+ years of teaching experience, we provide personalized education, daily YouTube educational videos, and comprehensive study materials for rural students in Bihar.
              We also offer offline classroom batches for in-person learning.
            </p>

            <p className="text-[#f5a623]/80 text-sm italic mb-8 font-medium">
              "तमसो मा ज्योतिर्गमय" — Lead me from darkness to light
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 bg-[#f5a623] text-[#0f2a5c] font-bold px-8 py-3 rounded-full hover:bg-[#e09010] transition-all duration-200 shadow-lg hover:shadow-[#f5a623]/30 hover:-translate-y-0.5"
              >
                Enroll Today
                <ArrowRight size={16} />
              </a>
              <a
                href="/videos"
                className="inline-flex items-center justify-center gap-2 border border-white/15 bg-white/5 text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition-all duration-200 backdrop-blur"
              >
                Watch Classes
                <PlayCircle size={16} />
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center gap-5">
            <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-white/8 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur">
              <div className="absolute inset-0 bg-[#f5a623]/10 rounded-[2rem] blur-2xl scale-110" />
              <img
                src="/sunrise-logo.png"
                alt="Sunrise Classes & Academy Logo"
                width={320}
                height={320}
                className="relative mx-auto w-64 h-64 sm:w-80 sm:h-80 max-w-[85vw] rounded-[1.75rem] object-contain bg-white shadow-2xl border-4 border-[#f5a623]/60 p-2"
              />
              <div className="relative mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#0f2a5c]/70 p-4 text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f5a623]">Board Focus</p>
                  <p className="mt-2 text-lg font-black text-white">Class 8, 9 & 10</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f5a623]">Mode</p>
                  <p className="mt-2 text-lg font-black text-white">Offline + Videos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
          {stats.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="bg-white/6 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-center hover:bg-white/10 hover:border-[#f5a623]/30 transition-all duration-300 group backdrop-blur"
            >
              <Icon className="mx-auto mb-2 sm:mb-3 text-[#f5a623] group-hover:scale-110 transition-transform duration-300" size={22} />
              <p className="text-lg sm:text-2xl font-extrabold text-white">{value}</p>
              <p className="text-[#8ba8d4] text-[10px] sm:text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
