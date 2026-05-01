import Seo from '../components/Seo';
import Videos from '../components/Videos';

export default function VideosPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Free Educational Videos for Class 9 & 10 - Sunrise Classes Purnia Bihar"
        description="Watch free Class 9 & 10 educational videos by Sunrise Classes & Academy, Champanagar Purnia Bihar. Daily revision, concept clarity, and exam-focused lessons for Bihar Board students."
        keywords="free educational videos Class 9 10, Sunrise Classes YouTube, Bihar Board revision videos, Class 9 maths science videos Purnia, coaching videos Champanagar, online study videos Bihar Board, exam preparation videos Purnia Bihar"
        url="/videos"
      />
      <Videos />
    </div>
  );
}