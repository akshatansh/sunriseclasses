import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

// ── CHANGE THIS LAUNCH DATE AND TIME ──
// Format: "YYYY-MM-DDTHH:mm:ss" (Example: "2026-05-04T10:17:00" for May 4, 2026 at 10:17 AM)
const LAUNCH_DATE = new Date("2026-05-04T10:17:00").getTime();

export default function LaunchCountdown({ children }: { children: React.ReactNode }) {
  const [timeLeft, setTimeLeft] = useState(LAUNCH_DATE - new Date().getTime());
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Secret bypass check
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    // If the URL has ?bypass=admin, we store it in sessionStorage
    if (searchParams.get('bypass') === 'admin') {
      sessionStorage.setItem('launch_bypass', 'true');
    }
    
    // Check if bypass is active
    if (sessionStorage.getItem('launch_bypass') === 'true') {
      setIsBypassed(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = LAUNCH_DATE - now;
      setTimeLeft(distance);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Admin panel or bypassed users can always access the site
  if (location.pathname.startsWith('/admin') || isBypassed) {
    return <>{children}</>;
  }

  // If time is up, show the actual website
  if (timeLeft <= 0) {
    return <>{children}</>;
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
