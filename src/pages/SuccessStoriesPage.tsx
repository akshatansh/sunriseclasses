import Seo from '../components/Seo';
import SuccessStories from '../components/SuccessStories';

export default function SuccessStoriesPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Student Success Stories & Toppers - Sunrise Classes Champanagar Purnia Bihar"
        description="Discover top achievers from Sunrise Classes & Academy, Champanagar Purnia Bihar. Year-wise board exam success stories, Class 9 & 10 toppers, high scorers, and real student results."
        keywords="Sunrise Classes toppers, student success stories Champanagar Purnia, Bihar Board toppers Champanagar Purnia, coaching results Purnia, Class 10 toppers Sunrise Classes, Class 9 board exam results Bihar, best coaching results Purnia Bihar"
        url="/success-stories"
      />
      <SuccessStories />
    </div>
  );
}
