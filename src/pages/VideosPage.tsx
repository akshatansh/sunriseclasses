import Seo from '../components/Seo';
import Videos from '../components/Videos';

export default function VideosPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Sunrise Classes YouTube Videos - Free Class 8, 9 & 10 Lessons | Champanagar Purnia Bihar"
        description="Watch free Class 8, 9 & 10 video lessons by Sunrise Classes & Academy Champanagar Purnia. Bihar Board Maths, Science, Hindi revision videos by SP Jha sir. Subscribe now!"
        keywords="Sunrise Classes YouTube, Sunrise Classes videos Champanagar, free Class 8 9 10 videos Purnia Bihar, Bihar Board video lessons, SP Jha teaching videos, Class 10 Maths Science video Purnia, BSEB revision videos, free coaching videos Champanagar Bihar"
        url="/videos"
      />
      <Videos />
    </div>
  );
}