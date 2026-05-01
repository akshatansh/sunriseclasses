import Seo from '../components/Seo';
import Gallery from '../components/Gallery';

export default function GalleryPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Gallery"
        description="See Sunrise Classes classroom activities, student events, and achievement highlights from our coaching center in Champanagar, Purnia, Bihar."
        url="/gallery"
      />
      <Gallery />
    </div>
  );
}
