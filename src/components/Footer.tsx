import { Youtube, Phone, MapPin, Instagram, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { YOUTUBE_CHANNEL_URL } from '../config/youtube';

const quickLinks = [
  { label: 'Home', path: '/' },
  { label: 'About Us', path: '/about' },
  { label: 'Courses', path: '/courses' },
  { label: 'YouTube Videos', path: '/videos' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Success Stories', path: '/success-stories' },
  { label: 'Contact Us', path: '/contact' },
];

const courses = [
  'Class 9 Coaching',
  'Class 10 Coaching',
];

export default function Footer() {
  return (
    <footer className="bg-[#08193a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/sunrise-logo.png"
                alt="Logo"
                width={56}
                height={56}
                className="w-14 h-14 rounded-xl object-contain bg-white border-2 border-[#f5a623] shadow-sm"
              />
              <div>
                <p className="font-bold text-white text-sm leading-tight">Sunrise Classes</p>
                <p className="text-[#f5a623] text-xs">& Academy</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Leading coaching institute in Champanagar, Purnia, Bihar for Class 9 & 10 board exams. Quality education for rural Bihar students with expert faculty and modern teaching methods.
            </p>
            <p className="text-[#f5a623]/80 text-xs italic">"तमसो मा ज्योतिर्गमय"</p>

            <div className="flex items-center gap-3 mt-4">
              <a
                href={YOUTUBE_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors duration-200"
                aria-label="YouTube"
              >
                <Youtube size={17} />
              </a>
              <a
                href="https://instagram.com/sunriseclasses"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center hover:from-purple-600 hover:to-pink-600 transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram size={17} />
              </a>
              <a
                href="https://facebook.com/sunriseclasses"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook size={17} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.path}
                    className="text-gray-400 text-xs hover:text-[#f5a623] transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 text-white">Our Courses</h4>
            <ul className="space-y-2.5">
              {courses.map((c) => (
                <li key={c}>
                  <span className="text-gray-400 text-xs">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 text-white">Contact Info</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-[#f5a623] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-xs">Champanagar, Purnia, Bihar Near Cinema Hall – 854201</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#f5a623] flex-shrink-0" />
                <span className="text-gray-400 text-xs">+91 9973152070</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs text-center sm:text-left">
            &copy; {new Date().getFullYear()} Sunrise Classes & Academy, Champanagar, Purnia, Bihar. Best coaching for board exams in rural Bihar.
          </p>
          <p className="text-gray-500 text-xs flex items-center gap-1.5">
            <span>Made with</span>
            <a
              href="https://www.instagram.com/mr._akshat_ansh/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-[#f5a623]/40 bg-[#f5a623]/10 px-3 py-1 font-bold text-[#f5a623] shadow-sm shadow-[#f5a623]/10 transition-all duration-200 hover:bg-[#f5a623] hover:text-[#08193a] cursor-pointer"
            >
              Akshat Ansh
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
