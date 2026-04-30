import Seo from '../components/Seo';
import Videos from '../components/Videos';

export default function VideosPage() {
  return (
    <div>
      <Seo
        title="Videos"
        description="Watch free educational videos from Sunrise Classes & Academy for Class 9 and 10 exam revision, concept clarity, and practice lessons tailored for Bihar board students."
        url="/videos"
      />
      <Videos />
    </div>
  );
}