import Seo from '../components/Seo';
import Gallery from '../components/Gallery';

export default function GalleryPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Activities & Events Gallery | Sunrise Classes Purnia"
        description="View classroom activities, events, and toppers celebrations at Sunrise Classes & Academy in Champanagar, Purnia. See our learning environment in photos."
        keywords="Sunrise Classes gallery, coaching center photos Champanagar Purnia, student events Purnia Bihar, classroom activities Sunrise Classes, coaching institute Purnia Bihar photos, student achievements Champanagar"
        url="/gallery"
      />
      <Gallery />
    </div>
  );
}
