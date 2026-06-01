import Seo from '../components/Seo';
import SuccessStories from '../components/SuccessStories';

export default function SuccessStoriesPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Success Stories & Toppers | Sunrise Classes Champanagar"
        description="Explore success stories of board toppers from Sunrise Classes in Purnia, Bihar. See high scorers and achievements of Class 8, 9 & 10 students."
        keywords="Sunrise Classes toppers, student success stories Champanagar Purnia, Bihar Board toppers Champanagar Purnia, coaching results Purnia, Class 10 toppers Sunrise Classes, Class 8 9 board exam results Bihar, best coaching results Purnia Bihar"
        url="/success-stories"
      />
      <SuccessStories />
    </div>
  );
}
