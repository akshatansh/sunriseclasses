import Seo from '../components/Seo';
import About from '../components/About';

export default function AboutPage() {
  return (
    <div>
      <Seo
        title="About Us"
        description="Learn about Sunrise Classes & Academy in Champanagar, Purnia, Bihar — expert teachers, proven board exam strategies, and a student-first learning environment."
        url="/about"
      />
      <About />
    </div>
  );
}