import { useState, useEffect } from 'react';
import { Menu, X, Sparkles, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import NotificationBar from './NotificationBar';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Courses', path: '/courses' },
  { label: 'Videos', path: '/videos' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Success Stories', path: '/success-stories' },
  { label: 'Results', path: '/results' },
  { label: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex flex-col ${
        scrolled
          ? 'bg-white/92 shadow-[0_20px_60px_rgba(7,26,63,0.16)] backdrop-blur-xl border-b border-slate-200/80'
          : 'bg-[#071a3f]/70 backdrop-blur-xl border-b border-white/5'
      }`}
    >
      <NotificationBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-[72px] py-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <img
              src="/sunrise-logo.png"
              alt="Sunrise Classes Logo"
              width={44}
              height={44}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl object-contain bg-white border-2 border-[#f5a623] shadow-sm flex-shrink-0"
            />
            <div className="min-w-0">
              <p className={`font-bold text-[11px] sm:text-sm leading-tight truncate ${scrolled ? 'text-[#0f2a5c]' : 'text-white'}`}>
                Sunrise Classes
              </p>
              <div className="flex items-center gap-1 text-[#f5a623] text-[8px] sm:text-xs leading-tight truncate">
                <Sparkles size={10} />
                <span>& Academy, Champanagar</span>
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.path
                    ? 'bg-white text-[#0f2a5c] shadow-sm'
                    : scrolled
                      ? 'text-slate-700 hover:text-[#0f2a5c] hover:bg-slate-100'
                      : 'text-gray-200 hover:text-[#f5a623] hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5a623] text-[#0f2a5c] text-sm font-bold px-5 py-2.5 hover:bg-[#e09010] transition-colors duration-200 shadow-lg shadow-[#f5a623]/20"
            >
              Enroll Now
              <ArrowRight size={14} />
            </Link>
          </div>

          <button
            className={`md:hidden p-2 rounded-xl border ${
              scrolled
                ? 'text-[#0f2a5c] border-slate-200 bg-slate-50'
                : 'text-white border-white/10 bg-white/5'
            }`}
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#071a3f]/95 backdrop-blur-xl px-4 py-4">
          <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                  location.pathname === link.path
                    ? 'bg-white text-[#0f2a5c]'
                    : 'text-gray-200 hover:text-[#f5a623] hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f5a623] text-[#0f2a5c] text-sm font-bold px-4 py-3 text-center hover:bg-[#e09010] transition-colors duration-200"
            >
              Enroll Now
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
