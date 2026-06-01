import Seo from '../components/Seo';
import Courses from '../components/Courses';

export default function CoursesPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Class 8, 9, 10 Coaching Courses | Sunrise Classes"
        description="Class 8, 9 & 10 offline coaching for Maths, Science, Hindi, SST & Sanskrit at Sunrise Classes, Purnia. Bihar Board focused exam prep by SP Jha."
        keywords="Sunrise Classes courses Champanagar, Class 8 9 10 subjects coaching Purnia, Maths coaching Champanagar Purnia, Science coaching Purnia Bihar, Hindi coaching Class 10 Purnia, Bihar Board subjects coaching, offline tuition Champanagar, coaching fee Purnia Bihar, Class 8 9 Math Science coaching"
        url="/courses"
      />
      <Courses />
    </div>
  );
}
