import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Courses', href: '#courses' },
  { label: 'Videos', href: '#videos' },
  { label: 'Contact', href: '#contact' },
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
          <a href="#home" className="flex items-center gap-3">
            <img
              src="/Sunrise_Classes_&_Academy_(1).jpg"
              alt="Sunrise Classes Logo"
              className="h-11 w-11 rounded-full object-cover border-2 border-[#f5a623]"
            />
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-tight">Sunrise Classes</p>
              <p className="text-[#f5a623] text-xs">& Academy, Champanagar</p>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-200 hover:text-[#f5a623] text-sm font-medium transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#f5a623] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
            <a
              href="#contact"
              className="bg-[#f5a623] text-[#0f2a5c] text-sm font-bold px-4 py-2 rounded-md hover:bg-[#e09010] transition-colors duration-200"
            >
              Enroll Now
            </a>
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
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-gray-200 hover:text-[#f5a623] text-sm font-medium transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="bg-[#f5a623] text-[#0f2a5c] text-sm font-bold px-4 py-2 rounded-md text-center hover:bg-[#e09010] transition-colors duration-200"
          >
            Enroll Now
          </a>
        </div>
      )}
    </nav>
  );
}
