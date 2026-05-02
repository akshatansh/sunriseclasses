import React from 'react';
import { BookOpen, Target, CheckCircle } from 'lucide-react';

export default function SeoContentBlock() {
  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2a5c] mb-6 text-center">
            Why Sunrise Classes & Academy is the Best Coaching in Champanagar, Purnia
          </h2>
          
          <div className="prose prose-lg text-gray-600 max-w-none">
            <p className="mb-4">
              Finding the right guidance for your child’s education is crucial, especially during their formative years. 
              <strong> Sunrise Classes & Academy</strong> is widely recognized as the <strong>best coaching in Champanagar, Purnia</strong> for 
              students preparing for their board exams. Located conveniently in Champanagar, Bihar, we specialize in providing 
              top-tier education and <strong>Class 9 and 10 coaching</strong> tailored specifically for the Bihar Board syllabus.
            </p>
            
            <p className="mb-6">
              Under the expert leadership of Director <strong>S.P. Jha</strong>, who brings over 15+ years of teaching 
              experience, we focus on building a strong foundation. Our comprehensive approach ensures that students 
              do not just memorize facts, but truly understand concepts in Mathematics, Science, Social Science, and languages.
            </p>

            <div className="bg-[#f8fbff] rounded-2xl p-6 sm:p-8 mb-8 border border-[#d9e5ff]">
              <h3 className="text-xl font-bold text-[#0f2a5c] mb-4 flex items-center gap-2">
                <Target size={20} className="text-[#f5a623]" />
                Top Coaching for Class 10 in Purnia
              </h3>
              <p className="mb-4 text-sm sm:text-base">
                Board exams are a turning point in a student's life. As the <strong>top coaching for class 10 in Purnia</strong>, 
                we provide:
              </p>
              <ul className="space-y-2 mb-0">
                {[
                  'Daily practice papers and weekly mock tests.',
                  'Detailed focus on Bihar Board previous year question papers.',
                  'Specialized doubt-clearing sessions.',
                  'Personalized attention to track every student’s progress.'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm sm:text-base">
                    <CheckCircle size={18} className="text-[#f5a623] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h3 className="text-xl font-bold text-[#0f2a5c] mb-4">
              Comprehensive Bihar Board Coaching
            </h3>
            <p className="mb-4">
              Unlike generic coaching centers, Sunrise Classes & Academy is deeply rooted in the local educational ecosystem. 
              Our <strong>Bihar board coaching</strong> methodology is designed to cater to the specific exam patterns and 
              scoring techniques required for BSEB exams. We also run a successful YouTube channel where students can revise 
              concepts at home, ensuring that their learning never stops.
            </p>

            <p>
              If you are searching for the most trusted and results-driven educational institute, your search ends here. 
              Join Sunrise Classes & Academy today and give your child the direction they need for a bright future. 
              Enroll in the <strong>best coaching in Champanagar, Purnia</strong> and experience the difference in education.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
