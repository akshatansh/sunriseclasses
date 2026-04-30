import Seo from '../components/Seo';
import Contact from '../components/Contact';

export default function ContactPage() {
  return (
    <div className="pt-28">
      <Seo
        title="Contact Us"
        description="Get in touch with Sunrise Classes & Academy for Class 9 and 10 board exam coaching, study plans, and admissions in Champanagar, Purnia, Bihar."
        url="/contact"
      />
      <Contact />
    </div>
  );
}