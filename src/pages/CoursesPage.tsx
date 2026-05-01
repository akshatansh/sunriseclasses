import Seo from '../components/Seo';
import Courses from '../components/Courses';

export default function CoursesPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Coaching Courses for Class 9 & 10 Board Exams - Champanagar Purnia Bihar"
        description="Explore coaching programs at Sunrise Classes & Academy, Champanagar Purnia Bihar — Class 9 & 10 board exam prep, science & maths coaching, and offline classroom batches with expert faculty."
        keywords="courses at Sunrise Classes, Class 9 coaching Champanagar Purnia, Class 10 board exam coaching Purnia Bihar, Bihar Board preparation classes, science maths coaching Champanagar, offline tuition Champanagar Purnia Bihar, best coaching courses Purnia"
        url="/courses"
      />
      <Courses />
    </div>
  );
}
