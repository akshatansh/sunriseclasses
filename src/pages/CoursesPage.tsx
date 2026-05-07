import Seo from '../components/Seo';
import Courses from '../components/Courses';

export default function CoursesPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Sunrise Classes Champanagar - Class 8, 9 & 10 Coaching Courses | Purnia Bihar"
        description="Sunrise Classes, Champanagar Purnia — Class 8, 9 & 10 offline coaching for Maths, Science, Hindi, SST & Sanskrit. Bihar Board focused, affordable fee, expert faculty by SP Jha sir."
        keywords="Sunrise Classes courses Champanagar, Class 8 9 10 subjects coaching Purnia, Maths coaching Champanagar Purnia, Science coaching Purnia Bihar, Hindi coaching Class 10 Purnia, Bihar Board subjects coaching, offline tuition Champanagar, coaching fee Purnia Bihar, Class 8 9 Math Science coaching"
        url="/courses"
      />
      <Courses />
    </div>
  );
}
