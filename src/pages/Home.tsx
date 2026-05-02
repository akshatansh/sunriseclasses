import Seo from '../components/Seo';
import Hero from '../components/Hero';
import NoticeBoard from '../components/NoticeBoard';
import About from '../components/About';
import Courses from '../components/Courses';
import Videos from '../components/Videos';
import Gallery from '../components/Gallery';
import SeoContentBlock from '../components/SeoContentBlock';
import Contact from '../components/Contact';

export default function Home() {
  return (
    <div>
      <Seo
        title="Best Class 9 & 10 Board Exam Coaching in Champanagar, Purnia Bihar"
        description="Sunrise Classes & Academy — Top coaching institute in Champanagar, Purnia, Bihar for Class 9 & 10 board exam preparation. Expert teachers, daily test practice, personalized attention & proven results."
        keywords="Sunrise Classes Champanagar Purnia, best coaching in Champanagar Purnia, Class 9 coaching Champanagar Purnia, Class 10 coaching Champanagar Purnia, Bihar Board coaching, board exam preparation Purnia, offline coaching classes Champanagar, school tuition Purnia Bihar, coaching institute Purnia Bihar"
        url="/"
      />
      <Hero />
      <section className="bg-[linear-gradient(180deg,_#143772_0%,_#f8fbff_100%)] pt-10 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <NoticeBoard />
        </div>
      </section>
      <About />
      <Courses />
      <Videos />
      <Gallery previewCount={3} showViewAll />
      <SeoContentBlock />
      <Contact />
    </div>
  );
}
