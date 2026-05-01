import Seo from '../components/Seo';
import SuccessStories from '../components/SuccessStories';

export default function SuccessStoriesPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Success Stories"
        description="Discover top achievers from Sunrise Classes & Academy in Champanagar, Purnia, Bihar, with year-wise board exam success stories, high scorers, and coaching results."
        keywords="Sunrise Classes results, student success stories Champanagar Purnia, Bihar Board toppers in Champanagar Purnia, coaching results Champanagar Purnia, Class 10 toppers Sunrise Classes, best coaching success stories Bihar"
        url="/success-stories"
      />
      <SuccessStories />
    </div>
  );
}
