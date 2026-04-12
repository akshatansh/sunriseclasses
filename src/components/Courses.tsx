import { BookOpen, Calculator, FlaskConical, Globe, Music, Cpu } from 'lucide-react';

const courses = [
  { icon: FlaskConical, title: 'Class 9', sub: 'CBSE & State Board', desc: 'Comprehensive preparation with Science, Maths, Social Studies, and Languages. Regular mock tests and doubt clearing sessions.', color: 'bg-green-50 border-green-200 text-green-600' },
  { icon: Calculator, title: 'Class 10', sub: 'Board Exam Focused', desc: 'Intensive board exam preparation with practice tests, model papers, and expert guidance. Covering all CBSE & state syllabus.', color: 'bg-amber-50 border-amber-200 text-amber-600' },
];

export default function Courses() {
  return (
    <section id="courses" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest">What We Offer</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">Our Courses & Programs</h2>
          <div className="w-16 h-1 bg-[#f5a623] mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
