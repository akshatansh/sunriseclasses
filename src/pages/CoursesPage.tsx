import Seo from '../components/Seo';
import Courses from '../components/Courses';

export default function CoursesPage() {
  return (
    <div>
      <Seo
        title="Courses"
        description="Explore Sunrise Classes coaching programs for Class 9 and 10 board exam preparation, competitive exam readiness, and spoken English training in Purnia, Bihar."
        url="/courses"
      />
      <Courses />
    </div>
  );
}