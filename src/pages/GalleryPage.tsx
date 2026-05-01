import Seo from '../components/Seo';
import Gallery from '../components/Gallery';

export default function GalleryPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Gallery - Sunrise Classes Activities & Student Events | Champanagar Purnia"
        description="Browse the photo gallery of Sunrise Classes & Academy, Champanagar Purnia Bihar. See classroom activities, student events, toppers celebrations, and coaching center highlights."
        keywords="Sunrise Classes gallery, coaching center photos Champanagar Purnia, student events Purnia Bihar, classroom activities Sunrise Classes, coaching institute Purnia Bihar photos, student achievements Champanagar"
        url="/gallery"
      />
      <Gallery />
    </div>
  );
}
