import { BookOpen, Users, Award, TrendingUp } from 'lucide-react';

const stats = [
  { icon: Users, value: '500+', label: 'Students' },
  { icon: BookOpen, value: '10+', label: 'Subjects' },
  { icon: Award, value: '5+', label: 'Years Experience' },
  { icon: TrendingUp, value: '95%', label: 'Success Rate' },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col justify-center bg-gradient-to-br from-[#0a1e4a] via-[#0f2a5c] to-[#1a3f7a] overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#f5a623]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#f5a623]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f5a623]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#f5a623]/20 border border-[#f5a623]/30 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-[#f5a623] rounded-full animate-pulse" />
              <span className="text-[#f5a623] text-xs font-semibold tracking-wide uppercase">
                Champanagar, Purnia, Bihar
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
              Sunrise Classes
              <span className="block text-[#f5a623]">&amp; Academy</span>
            </h1>

            <p className="text-[#8ba8d4] text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-4 leading-relaxed">
              Illuminating minds with quality education since inception. We are committed to
              nurturing every student's potential through dedicated teaching and modern learning
              methods.
            </p>

            <p className="text-[#f5a623]/80 text-sm italic mb-8 font-medium">
              "तमसो मा ज्योतिर्गमय" — Lead me from darkness to light
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="#contact"
                className="bg-[#f5a623] text-[#0f2a5c] font-bold px-8 py-3 rounded-lg hover:bg-[#e09010] transition-all duration-200 shadow-lg hover:shadow-[#f5a623]/30 hover:-translate-y-0.5"
              >
                Enroll Today
              </a>
              <a
                href="#about"
                className="border border-[#f5a623]/50 text-[#f5a623] font-semibold px-8 py-3 rounded-lg hover:bg-[#f5a623]/10 transition-all duration-200"
              >
                Learn More
              </a>
            </div>

            <p className="mt-6 text-[#6b8ab8] text-xs">
              With the help of{' '}
              <span className="text-[#f5a623] font-semibold">Nikhar Gramin Vikash Sansthan</span>
            </p>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#f5a623]/30 rounded-full blur-2xl scale-110" />
              <img
                src="/Sunrise_Classes_&_Academy_(1).jpg"
                alt="Sunrise Classes & Academy Logo"
                className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-full object-contain bg-white shadow-2xl border-4 border-[#f5a623]/60 p-3"
              />
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:bg-white/10 hover:border-[#f5a623]/30 transition-all duration-300 group"
            >
              <Icon className="mx-auto mb-3 text-[#f5a623] group-hover:scale-110 transition-transform duration-300" size={28} />
              <p className="text-2xl font-extrabold text-white">{value}</p>
              <p className="text-[#8ba8d4] text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
