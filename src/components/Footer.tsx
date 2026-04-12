import { Youtube, Phone, MapPin, Heart } from 'lucide-react';

const quickLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About Us', href: '#about' },
  { label: 'Courses', href: '#courses' },
  { label: 'YouTube Videos', href: '#videos' },
  { label: 'Contact Us', href: '#contact' },
];

const courses = [
  'Primary Classes',
  'Middle School',
  'Secondary / Matric',
  'Higher Secondary',
  'Competitive Exams',
  'Spoken English',
];

export default function Footer() {
  return (
    <footer className="bg-[#08193a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/Sunrise_Classes_&_Academy_(1).jpg"
                alt="Logo"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#f5a623]"
              />
              <div>
                <p className="font-bold text-white text-sm leading-tight">Sunrise Classes</p>
                <p className="text-[#f5a623] text-xs">& Academy</p>
              </div>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Illuminating minds in Champanagar, Purnia, Bihar. Quality education for every child's brighter tomorrow.
            </p>
            <p className="text-[#f5a623]/80 text-xs italic">"तमसो मा ज्योतिर्गमय"</p>

            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.youtube.com/@SunriseClassesAcademy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors duration-200"
                aria-label="YouTube"
              >
                <Youtube size={17} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-gray-400 text-xs hover:text-[#f5a623] transition-colors duration-200"
                  >
                    {l.label}
                  </a>
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
                <span className="text-gray-400 text-xs">Champanagar, Purnia, Bihar – 854201</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#f5a623] flex-shrink-0" />
                <span className="text-gray-400 text-xs">+91 9973152070</span>
              </div>
            </div>

            <div className="mt-6 bg-[#0f2a5c]/60 border border-[#1a3a7a] rounded-xl p-4">
              <p className="text-[#f5a623] font-bold text-xs mb-1">Supported by</p>
              <p className="text-white text-sm font-semibold leading-snug">Nikhar Gramin Vikash Sansthan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs text-center sm:text-left">
            &copy; {new Date().getFullYear()} Sunrise Classes & Academy, Champanagar, Purnia, Bihar. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs flex items-center gap-1">
            Made with <Heart size={11} className="text-red-500" fill="currentColor" /> for better education
          </p>
        </div>
      </div>
    </footer>
  );
}
