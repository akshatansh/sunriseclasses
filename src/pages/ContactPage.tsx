import Seo from '../components/Seo';
import Contact from '../components/Contact';

export default function ContactPage() {
  return (
    <div className="pt-[116px]">
      <Seo
        title="Admissions & Contact | Sunrise Classes Champanagar"
        description="Admission open at Sunrise Classes, Purnia for Class 8, 9 & 10. Contact SP Jha sir at 9973152070 or visit our coaching center near Cinema Hall, Champanagar."
        keywords="Sunrise Classes admission Champanagar, contact Sunrise Classes Purnia, Sunrise Classes phone number, coaching admission Class 8 9 10 Purnia Bihar, SP Jha contact, coaching center address Champanagar, Class 8 9 10 admission Purnia, Sunrise Classes enquiry, coaching near cinema hall Champanagar Purnia"
        url="/contact"
      />
      <Contact />
    </div>
  );
}