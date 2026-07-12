import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';

// ── CHANGE THIS LAUNCH DATE AND TIME ──
// Format: "YYYY-MM-DDTHH:mm:ss" (Example: "2026-05-04T10:17:00" for May 4, 2026 at 10:17 AM)
const LAUNCH_DATE = new Date("2026-05-04T10:17:00").getTime();

export default function LaunchCountdown({ children }: { children: React.ReactNode }) {
  const [timeLeft, setTimeLeft] = useState(LAUNCH_DATE - new Date().getTime());
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Secret bypass check
  const [isBypassed, setIsBypassed] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    // If the URL has ?bypass=admin, we store it in sessionStorage
    if (searchParams.get('bypass') === 'admin') {
      sessionStorage.setItem('launch_bypass', 'true');
    }
    
    // Check if bypass is active or if user is a search engine crawler
    const isCrawler = /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent);
    if (sessionStorage.getItem('launch_bypass') === 'true' || isCrawler) {
      setIsBypassed(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let fireworkInterval: any;

    const triggerFireworks = () => {
      const duration = 30 * 1000; // 30 seconds
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100002 };

      fireworkInterval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(fireworkInterval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
      }, 250);

      setShowWelcomeModal(true);
    };

    // Test mode
    if (searchParams.get('test_confetti') === 'true' && !sessionStorage.getItem('test_celebrated')) {
      sessionStorage.setItem('test_celebrated', 'true');
      triggerFireworks();
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = LAUNCH_DATE - now;
      setTimeLeft(distance);

      // Trigger celebration if launch just happened
      if (distance <= 0 && !sessionStorage.getItem('launch_celebrated') && !location.pathname.startsWith('/admin')) {
        sessionStorage.setItem('launch_celebrated', 'true');
        triggerFireworks();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (fireworkInterval) clearInterval(fireworkInterval);
    };
  }, [location.pathname, searchParams]);
  const welcomeModal = showWelcomeModal && (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center border-4 border-[#f5a623]/20 scale-in-center">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <img 
            src="/director_photo.jpg" 
            alt="Director S.P. Jha" 
            className="w-24 h-24 rounded-full object-cover object-top border-4 border-white shadow-xl bg-white"
          />
        </div>
        <div className="mt-10">
          <h2 className="text-2xl font-black text-[#0f2a5c] mb-2">Welcome to Sunrise!</h2>
          <p className="text-[#f5a623] font-bold text-sm uppercase tracking-widest mb-4">New Digital Home</p>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            "Aapka swagat hai Sunrise Classes & Academy ki official website par! Ab yahan aapko daily videos, notices, aur results sab ek jagah milenge. Padhai hogi aur bhi aasan!"
            <br/><br/>
            <strong>- S.P. Jha (Director)</strong>
          </p>
          <button 
            onClick={() => setShowWelcomeModal(false)}
            className="w-full bg-[linear-gradient(135deg,_#f5a623,_#ffb740)] text-[#0f2a5c] font-black text-lg py-3 rounded-xl shadow-[0_8px_20px_rgba(245,166,35,0.3)] hover:-translate-y-1 transition-all duration-200"
          >
            Start Exploring
          </button>
        </div>
      </div>
    </div>
  );

  // Admin panel or bypassed users can always access the site
  if (location.pathname.startsWith('/admin') || isBypassed) {
    return (
      <>
        {welcomeModal}
        {children}
      </>
    );
  }

  // If time is up, show the actual website
  if (timeLeft <= 0) {
    return (
      <>
        {welcomeModal}
        {children}
      </>
    );
  }

  // Calculate time components
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <div className="min-h-screen bg-[#0f2a5c] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#f5a623]/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700">
        <div className="bg-white p-4 rounded-3xl mb-8 shadow-2xl shadow-black/50">
          <img src="/sunrise-logo.png" alt="Sunrise Classes Logo" className="h-24 w-24 object-contain" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
          We Are Launching Soon
        </h1>
        <p className="text-blue-200 text-lg md:text-xl font-medium max-w-lg mb-12">
          The all-new digital portal for Sunrise Classes & Academy is almost ready. Stay tuned!
        </p>

        {/* Countdown Grid */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <TimeUnit value={days} label="Days" />
          <TimeUnit value={hours} label="Hours" />
          <TimeUnit value={minutes} label="Minutes" />
          <TimeUnit value={seconds} label="Seconds" />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 md:w-28 md:h-28 bg-white/10 backdrop-blur-md rounded-2xl md:rounded-3xl flex items-center justify-center border border-white/20 shadow-xl mb-2 md:mb-3">
        <span className="text-3xl md:text-5xl font-black text-white">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-blue-200 font-bold text-xs md:text-sm uppercase tracking-wider">{label}</span>
    </div>
  );
}
