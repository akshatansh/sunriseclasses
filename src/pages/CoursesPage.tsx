import Seo from '../components/Seo';
import Courses from '../components/Courses';

export default function CoursesPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Courses"
        description="Explore Sunrise Classes coaching programs for Class 9 and 10 board exam preparation, competitive exam readiness, and spoken English training in Champanagar, Purnia, Bihar."
        keywords="courses at Sunrise Classes, Class 9 coaching in Champanagar Purnia, Class 10 board exam coaching in Champanagar Purnia, Bihar Board preparation classes, science maths coaching in Champanagar Purnia, offline tuition classes in Champanagar Purnia Bihar"
        url="/courses"
      />
      <Courses />
    </div>
  );
}
