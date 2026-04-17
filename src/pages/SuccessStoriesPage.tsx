import Seo from '../components/Seo';
import SuccessStories from '../components/SuccessStories';

export default function SuccessStoriesPage() {
  return (
    <div>
      <Seo
        title="Success Stories"
        description="Discover top achievers from Sunrise Classes & Academy in Purnia, Bihar, with year-wise board exam success stories, high scorers, and coaching results."
        url="/success-stories"
      />
      <SuccessStories />
    </div>
  );
}