import Seo from '../components/Seo';
import About from '../components/About';

export default function AboutPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="About Sunrise Classes & Academy | SP Jha, Purnia"
        description="About Sunrise Classes & Academy, Purnia. Concept-based Bihar Board coaching for Class 8, 9 & 10 by SP Jha (15+ yrs experience). Proven toppers since 2010."
        keywords="about Sunrise Classes, SP Jha Champanagar Purnia, Sunrise Classes director SP Jha, coaching institute Champanagar Purnia, best teacher Purnia Bihar, Bihar Board coaching institute Champanagar, Class 8 9 10 coaching Purnia, S.P. Jha coaching"
        url="/about"
      />
      <About />
    </div>
  );
}
