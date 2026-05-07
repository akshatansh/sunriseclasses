import Seo from '../components/Seo';
import About from '../components/About';

export default function AboutPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="About Sunrise Classes & Academy | SP Jha - Best Coaching Champanagar Purnia Bihar"
        description="Sunrise Classes & Academy, Champanagar Purnia — led by SP Jha sir (15+ yrs). Expert Class 8, 9 & 10 Bihar Board coaching, concept-based teaching, proven toppers since 2010."
        keywords="about Sunrise Classes, SP Jha Champanagar Purnia, Sunrise Classes director SP Jha, coaching institute Champanagar Purnia, best teacher Purnia Bihar, Bihar Board coaching institute Champanagar, Class 8 9 10 coaching Purnia, S.P. Jha coaching"
        url="/about"
      />
      <About />
    </div>
  );
}
