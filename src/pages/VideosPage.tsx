import Seo from '../components/Seo';
import Videos from '../components/Videos';

export default function VideosPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Free Video Lessons (Class 8, 9, 10) | Sunrise Classes"
        description="Free Class 8, 9 & 10 Bihar Board video lessons by Sunrise Classes, Purnia. Revision videos for Maths, Science, Hindi & Sanskrit by SP Jha. Watch now!"
        keywords="Sunrise Classes YouTube, Sunrise Classes videos Champanagar, free Class 8 9 10 videos Purnia Bihar, Bihar Board video lessons, SP Jha teaching videos, Class 10 Maths Science video Purnia, BSEB revision videos, free coaching videos Champanagar Bihar"
        url="/videos"
      />
      <Videos />
    </div>
  );
}