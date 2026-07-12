import { CheckCircle, Target, Heart, Lightbulb, Sparkles, Quote } from 'lucide-react';

const values = [
  { icon: Target, title: 'Our Mission', desc: 'To provide quality education accessible to every child in rural Bihar, bridging the gap between aspiration and achievement.' },
  { icon: Heart, title: 'Our Values', desc: 'We believe in dedication, discipline, and compassion. Every student deserves personalised attention and the best guidance.' },
  { icon: Lightbulb, title: 'Our Vision', desc: 'To become the leading educational institution in Champanagar, Purnia district, producing future leaders and professionals.' },
];

const highlights = [
  'Specialized in Class 8, 9 & 10 Board Exams',
  'Director with B.Ed (75%) and CTET Qualified (Paper I & II)',
  '15+ years of teaching experience',
  'Daily YouTube educational videos',
  'Offline classroom batches available',
  'Individual attention to every student',
  'Regular mock tests and practice papers',
  'Comprehensive study materials provided',
];

const trustPoints = [
  {
    title: 'Local Understanding',
    desc: 'As a coaching institute in Champanagar, Purnia, we understand the learning needs of Bihar Board and school students from nearby areas.',
  },
  {
    title: 'Strong Concept Building',
    desc: 'Our focus is not only on completing the syllabus but also on building strong basics in Maths, Science, English, and Social Science.',
  },
  {
    title: 'Parent Confidence',
    desc: 'Families choose Sunrise Classes & Academy because we maintain discipline, regular tests, and clear progress tracking for every student.',
  },
];

export default function About() {
  return (
    <section id="about" className="py-16 sm:py-20 bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_48%,_#fffaf0_100%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img
              src="/sunrise-logo.png"
              alt="Sunrise Classes Logo"
              className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 object-contain drop-shadow-md"
            />
          </div>
          <span className="inline-flex items-center gap-2 text-[#f5a623] text-xs sm:text-sm font-semibold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block" />
            Who We Are
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f2a5c] mt-2">About Sunrise Classes & Academy - Best Coaching in Champanagar, Purnia</h2>
          <div className="w-12 sm:w-16 h-1 bg-[#f5a623] mx-auto mt-3 sm:mt-4 rounded-full" />
        </div>

        <div className="rounded-[2rem] border border-white bg-white/85 p-6 sm:p-8 shadow-[0_24px_80px_rgba(15,42,92,0.08)] backdrop-blur">
          <div className="flex flex-col lg:flex-row gap-8 sm:gap-14 items-center mb-12 sm:mb-16">
            <div className="flex-shrink-0 flex flex-col items-center gap-3 sm:gap-4 w-full lg:w-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-[#f5a623]/20 rounded-2xl blur-xl" />
                <img
                  src="/director_photo.jpg"
                  alt="Director S.P. Jha"
                  className="relative w-56 h-64 sm:w-64 sm:h-72 rounded-2xl object-cover object-top shadow-2xl border-4 border-[#f5a623]/40"
                />
              </div>
              <div className="text-center bg-[linear-gradient(135deg,_#0f2a5c,_#173873)] text-white px-4 sm:px-6 py-3 rounded-2xl shadow-lg text-sm sm:text-base w-full">
                <p className="font-bold text-base sm:text-lg">S.P. Jha</p>
                <p className="text-[#f5a623] text-[11px] sm:text-xs font-semibold tracking-wider mt-0.5">B.Ed (75%) &bull; CTET Qualified</p>
                <p className="text-gray-300 text-xs mt-1.5 pt-1 border-t border-white/10">Director & Founder</p>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-[#0f2a5c] mb-3 sm:mb-4">
                Empowering Students Since Day One
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Sunrise Classes & Academy, located in Champanagar, Purnia, Bihar, specializes in
                Class 8, 9 & 10 board exam preparation with a proven track record of success. Under the
                visionary leadership of <strong>S.P. Jha (B.Ed Qualified with 75% and C.TET Qualified for Paper I & II: Class 1 to 5 and 6 to 8)</strong> with <strong>15+ years of teaching
                experience in board exam coaching</strong>, the academy has become the trusted choice for serious students aiming
                for excellence in their board exams in rural Bihar.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                We combine excellent teaching with modern technology, including our
                popular YouTube channel where new educational videos are uploaded daily to help
                students learn at their own pace and revise effectively.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                If you are searching for the best coaching in Champanagar, Purnia for Class 8, 9 and Class 10 students,
                Sunrise Classes & Academy offers a balanced approach of classroom teaching, regular revision,
                board-oriented practice, and personal mentoring. Our goal is to help students improve confidence,
                strengthen fundamentals, and score better in school and board examinations.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-2xl bg-[#f8fbff] border border-slate-100 px-4 py-3">
                    <CheckCircle size={18} className="text-[#f5a623] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.75rem] border border-[#d9e5ff] bg-[#f8fbff] p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f2a5c] text-white">
                  <Quote size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Our Promise</p>
                  <h3 className="text-xl font-bold text-[#0f2a5c]">Teaching that feels practical and personal</h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Hum sirf syllabus complete nahi karte. Hum students ko samajhkar unke weak areas par kaam karte hain,
                basics strong karte hain, aur exam ke liye confidence build karte hain. Isi balance ki wajah se
                parents aur students dono Sunrise Classes ko trust karte hain.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-[#ffe2ae] bg-[linear-gradient(135deg,_#fff7e7,_#ffffff)] p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a5b00]">Why It Works</p>
              <div className="mt-4 space-y-3">
                {['Concept clarity first', 'Regular tests and revision', 'Discipline with motivation'].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-[#0f2a5c] shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {values.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white/90 border border-gray-200 rounded-[1.75rem] p-6 shadow-sm hover:shadow-md hover:border-[#f5a623]/40 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-[#f5a623]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#f5a623]/20 transition-colors duration-300">
                <Icon size={24} className="text-[#f5a623]" />
              </div>
              <h4 className="text-[#0f2a5c] font-bold text-lg mb-2">{title}</h4>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 bg-[linear-gradient(135deg,_rgba(15,42,92,0.04),_rgba(245,166,35,0.08),_rgba(255,255,255,0.96))] rounded-[2rem] border border-gray-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-xl sm:text-2xl font-bold text-[#0f2a5c] mb-4">
            Why Students and Parents Prefer Our Coaching Institute in Champanagar, Purnia
          </h3>
          <p className="text-gray-600 leading-relaxed mb-6">
            Sunrise Classes & Academy is known as a trusted coaching centre in Champanagar, Purnia because we keep
            our teaching practical, disciplined, and result-oriented. Students preparing for Bihar Board
            exams need more than notes; they need daily consistency, doubt support, answer-writing practice,
            and motivation. That is exactly what our academy aims to provide in every batch.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trustPoints.map((point) => (
              <div key={point.title} className="rounded-2xl bg-gray-50 border border-gray-200 p-5">
                <h4 className="text-[#0f2a5c] font-bold mb-2">{point.title}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
