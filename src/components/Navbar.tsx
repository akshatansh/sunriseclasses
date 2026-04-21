import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Courses', path: '/courses' },
  { label: 'Videos', path: '/videos' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Success Stories', path: '/success-stories' },
  { label: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#0f2a5c] shadow-lg' : 'bg-[#0f2a5c]/90 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <img
              src="/sunrise-logo.png"
              alt="Sunrise Classes Logo"
              width={44}
              height={44}
              className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl object-contain bg-white border-2 border-[#f5a623] shadow-sm flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white font-bold text-[11px] sm:text-sm leading-tight truncate">Sunrise Classes</p>
              <p className="text-[#f5a623] text-[8px] sm:text-xs leading-tight truncate">& Academy, Champanagar</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-gray-200 hover:text-[#f5a623] text-sm font-medium transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#f5a623] group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
            <Link
              to="/contact"
              className="bg-[#f5a623] text-[#0f2a5c] text-sm font-bold px-4 py-2 rounded-md hover:bg-[#e09010] transition-colors duration-200"
            >
              Enroll Now
            </Link>
          </div>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-[#0c2250] border-t border-[#1a3a7a] px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className="text-gray-200 hover:text-[#f5a623] text-sm font-medium transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            onClick={() => setOpen(false)}
            className="bg-[#f5a623] text-[#0f2a5c] text-sm font-bold px-4 py-2 rounded-md text-center hover:bg-[#e09010] transition-colors duration-200"
          >
            Enroll Now
          </Link>
        </div>
      )}
    </nav>
  );
}
