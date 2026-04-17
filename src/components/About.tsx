import { CheckCircle, Target, Heart, Lightbulb } from 'lucide-react';

const values = [
  { icon: Target, title: 'Our Mission', desc: 'To provide quality education accessible to every child in rural Bihar, bridging the gap between aspiration and achievement.' },
  { icon: Heart, title: 'Our Values', desc: 'We believe in dedication, discipline, and compassion. Every student deserves personalised attention and the best guidance.' },
  { icon: Lightbulb, title: 'Our Vision', desc: 'To become the leading educational institution in Purnia district, producing future leaders and professionals.' },
];

const highlights = [
  'Specialized in Class 9 & 10 Board Exams',
  'Director with 15+ years of teaching experience',
  'Daily YouTube educational videos',
<<<<<<< HEAD
  'Offline classroom batches available',
=======
>>>>>>> 2aca30a6daa0a386edac1934849eaacd553f62ed
  'Individual attention to every student',
  'Regular mock tests and practice papers',
  'Comprehensive study materials provided',
];

export default function About() {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
<<<<<<< HEAD
          <div className="flex justify-center mb-4">
            <img
              src="/sunrise-logo.png"
              alt=""
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-md"
            />
          </div>
          <span className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest">Who We Are</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">About Sunrise Classes & Academy - Best Coaching in Purnia</h2>
=======
          <span className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest">Who We Are</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">About Sunrise Classes & Academy</h2>
>>>>>>> 2aca30a6daa0a386edac1934849eaacd553f62ed
          <div className="w-16 h-1 bg-[#f5a623] mx-auto mt-4 rounded-full" />
        </div>

        <div className="flex flex-col lg:flex-row gap-14 items-center mb-16">
          <div className="flex-shrink-0 flex flex-col items-center gap-4 w-full lg:w-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-[#f5a623]/20 rounded-2xl blur-xl" />
              <img
                src="/WhatsApp_Image_2026-04-04_at_11.56.16.jpeg"
                alt="Director S.P. Jha"
                className="relative w-64 h-72 sm:w-72 sm:h-80 rounded-2xl object-cover shadow-2xl border-4 border-[#f5a623]/40"
              />
            </div>
            <div className="text-center bg-[#0f2a5c] text-white px-6 py-3 rounded-xl shadow-lg">
              <p className="font-bold text-lg">S.P. Jha</p>
              <p className="text-[#f5a623] text-sm">Director & Founder</p>
              <p className="text-gray-300 text-xs mt-1">Sunrise Classes & Academy</p>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-[#0f2a5c] mb-4">
              Empowering Students Since Day One
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Sunrise Classes & Academy, located in Champanagar, Purnia, Bihar, specializes in
              Class 9 & 10 board exam preparation with a proven track record of success. Under the
              visionary leadership of <strong>S.P. Jha</strong> with <strong>15+ years of teaching
<<<<<<< HEAD
              experience in board exam coaching</strong>, the academy has become the trusted choice for serious students aiming
              for excellence in their board exams in rural Bihar.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              We combine excellent teaching with modern technology, including our
              popular YouTube channel where new educational videos are uploaded daily to help
              students learn at their own pace and revise effectively.
=======
              experience</strong>, the academy has become the trusted choice for serious students aiming
              for excellence in their board exams.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              We combine rigorous teaching excellence with modern technology, including our
              popular YouTube channel where new educational videos are uploaded daily to help
              students learn at their own pace and revise effectively. We also acknowledge the
              support of <span className="text-[#f5a623] font-semibold">Nikhar Gramin Vikash Sansthan</span> in
              promoting education and development in our community.
>>>>>>> 2aca30a6daa0a386edac1934849eaacd553f62ed
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle size={18} className="text-[#f5a623] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {values.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#f5a623]/40 transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-[#f5a623]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#f5a623]/20 transition-colors duration-300">
                <Icon size={24} className="text-[#f5a623]" />
              </div>
              <h4 className="text-[#0f2a5c] font-bold text-lg mb-2">{title}</h4>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
