import Seo from '../components/Seo';
import About from '../components/About';

export default function AboutPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="About Us"
        description="Learn about Sunrise Classes & Academy in Champanagar, Purnia, Bihar — expert teachers, proven board exam strategies, and a student-first learning environment."
        keywords="about Sunrise Classes, coaching institute in Champanagar Purnia, best teachers in Champanagar Purnia, Bihar Board coaching institute, Class 9 and 10 coaching in Champanagar Purnia, student focused coaching academy Bihar"
        url="/about"
      />
      <About />
    </div>
  );
}
