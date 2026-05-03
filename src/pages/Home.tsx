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
        title="Sunrise Classes Champanagar - #1 Class 9 & 10 Coaching in Purnia Bihar | SP Jha"
        description="Sunrise Classes & Academy, Champanagar Purnia — Best Bihar Board coaching for Class 9 & 10. SP Jha sir, 15+ yrs experience, daily tests, offline batches. Enroll: 9973152070."
        keywords="Sunrise Classes Champanagar, Sunrise Classes Purnia Bihar, Sunrise Classes & Academy, SP Jha coaching Champanagar Purnia, best coaching in Champanagar Purnia, Class 9 coaching Champanagar, Class 10 coaching Purnia, BSEB Bihar Board coaching Purnia, offline tuition Champanagar Purnia, Bihar Board exam preparation, coaching institute near Champanagar Purnia, board exam coaching Purnia Bihar"
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
