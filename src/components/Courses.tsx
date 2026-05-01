import { Calculator, FlaskConical, Sparkles, ArrowRight } from 'lucide-react';

const courses = [
  { icon: FlaskConical, title: 'Class 9 Coaching', sub: 'CBSE & State Board', desc: 'Comprehensive Class 9 coaching in Champanagar, Purnia with Science, Maths, Social Studies, and Languages. Regular mock tests and doubt clearing sessions for board exam success.', color: 'bg-green-50 border-green-200 text-green-600' },
  { icon: Calculator, title: 'Class 10 Coaching', sub: 'Board Exam Focused', desc: 'Intensive Class 10 board exam preparation in Champanagar, Purnia. Practice tests, model papers, and expert guidance covering CBSE & Bihar state syllabus.', color: 'bg-amber-50 border-amber-200 text-amber-600' },
];

const courseFeatures = [
  'Chapter-wise concept teaching for Maths, Science, English, Social Science, and other school subjects',
  'Weekly tests, model papers, and revision sessions for Bihar Board and school exam preparation',
  'Doubt solving support for weak and average students along with extra motivation and mentoring',
  'Offline coaching classes in Champanagar, Purnia with a disciplined learning environment',
];

export default function Courses() {
  return (
    <section id="courses" className="py-16 sm:py-20 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_40%,_#fffaf1_100%)]">
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
            What We Offer
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f2a5c] mt-2">Board Exam Coaching Classes in Champanagar, Purnia, Bihar</h2>
          <div className="w-12 sm:w-16 h-1 bg-[#f5a623] mx-auto mt-3 sm:mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {courses.map(({ icon: Icon, title, sub, desc, color }) => (
            <div
              key={title}
              className={`relative overflow-hidden border rounded-[1.75rem] p-6 ${color} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
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
              <div className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#0f2a5c]">
                Learn More
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white/90 p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl sm:text-2xl font-bold text-[#0f2a5c] mb-4">
              Detailed Board Exam Preparation for Class 9 and Class 10 Students
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our courses are designed for students who want strong school performance as well as
              better board exam results. Whether you need Class 9 coaching in Champanagar, Purnia to improve your
              basics or Class 10 coaching in Champanagar, Purnia for Bihar Board preparation, Sunrise Classes offers
              structured lessons, regular practice, and close teacher guidance.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We focus on syllabus completion at the right pace, repeated revision, and exam-oriented
              preparation so that students feel ready before internal exams, final exams, and board exams.
              This makes our academy a reliable choice for parents searching for an offline coaching institute
              in Champanagar, Purnia.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#f5a623]/30 bg-[linear-gradient(135deg,_#fff8ea,_#ffffff)] p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg sm:text-xl font-bold text-[#0f2a5c] mb-4">What Students Get</h3>
            <div className="space-y-3">
              {courseFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#f5a623] flex-shrink-0" />
                  <p className="text-sm text-gray-600 leading-relaxed">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
