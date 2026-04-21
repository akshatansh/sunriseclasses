import { Calculator, FlaskConical } from 'lucide-react';

const courses = [
  { icon: FlaskConical, title: 'Class 9 Coaching', sub: 'CBSE & State Board', desc: 'Comprehensive Class 9 coaching in Purnia with Science, Maths, Social Studies, and Languages. Regular mock tests and doubt clearing sessions for board exam success.', color: 'bg-green-50 border-green-200 text-green-600' },
  { icon: Calculator, title: 'Class 10 Coaching', sub: 'Board Exam Focused', desc: 'Intensive Class 10 board exam preparation in Champanagar, Purnia. Practice tests, model papers, and expert guidance covering CBSE & Bihar state syllabus.', color: 'bg-amber-50 border-amber-200 text-amber-600' },
];

export default function Courses() {
  return (
    <section id="courses" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img
              src="/sunrise-logo.png"
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 object-contain drop-shadow-md"
            />
          </div>
          <span className="text-[#f5a623] text-xs sm:text-sm font-semibold uppercase tracking-widest">What We Offer</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f2a5c] mt-2">Board Exam Coaching Classes in Purnia, Bihar</h2>
          <div className="w-12 sm:w-16 h-1 bg-[#f5a623] mx-auto mt-3 sm:mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {courses.map(({ icon: Icon, title, sub, desc, color }) => (
            <div
              key={title}
              className={`border rounded-2xl p-6 ${color} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Icon size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-[#0f2a5c] text-base leading-tight">{title}</h4>
                  <p className="text-xs text-gray-500 font-medium">{sub}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
