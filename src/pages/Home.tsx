import Seo from '../components/Seo';
import Hero from '../components/Hero';
import About from '../components/About';
import Courses from '../components/Courses';
import Videos from '../components/Videos';
import Gallery from '../components/Gallery';
import Contact from '../components/Contact';

export default function Home() {
  return (
    <div>
      <Seo
        title="Home"
        description="Sunrise Classes & Academy offers the best Class 9 and 10 board exam coaching in Champanagar, Purnia, Bihar with daily revision videos, offline batches, and personalized study plans."
        keywords="Sunrise Classes Champanagar Purnia, best coaching in Champanagar Purnia, Class 9 coaching in Champanagar Purnia, Class 10 coaching in Champanagar Purnia, Bihar Board coaching, board exam preparation in Champanagar Purnia, offline coaching classes in Champanagar Purnia, school tuition in Champanagar Purnia Bihar"
        url="/"
      />
      <Hero />
      <About />
      <Courses />
      <Videos />
      <Gallery />
      <Contact />
    </div>
  );
}
