import React, { useEffect, useState } from 'react';
import { getNotificationText } from '../lib/siteSettings';
import { Sparkles, BellRing } from 'lucide-react';

const NotificationBar = () => {
  const [text, setText] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchText = async () => {
      const data = await getNotificationText();
      if (data && data.trim() !== '') {
        setText(data);
        setIsVisible(true);
      }
    };
    fetchText();
  }, []);

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden bg-[#0a1930] text-white py-2.5 px-4 z-50 shadow-[0_4px_20px_rgba(15,42,92,0.4)] border-b border-[#f5a623]/30">
      {/* Animated subtle background glow */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(245,166,35,0.1),transparent)] animate-[pulse_3s_ease-in-out_infinite]" />
      
      <div className="w-full flex items-center whitespace-nowrap overflow-hidden relative">
        <div className="animate-marquee flex items-center gap-8 text-sm font-bold tracking-wider">
          
          {/* Item 1 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#f5a623] to-[#ffb347] text-[#0a1930] px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest font-extrabold shadow-[0_0_10px_rgba(245,166,35,0.5)] animate-pulse">
              <BellRing size={12} className="animate-bounce" />
              Update
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {text}
            </span>
            <Sparkles size={16} className="text-[#f5a623] shrink-0" />
          </div>

          {/* Item 2 (Repeated for Marquee) */}
          <div className="flex items-center gap-3 ml-8">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#f5a623] to-[#ffb347] text-[#0a1930] px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs uppercase tracking-widest font-extrabold shadow-[0_0_10px_rgba(245,166,35,0.5)] animate-pulse">
              <BellRing size={12} className="animate-bounce" />
              Update
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {text}
            </span>
            <Sparkles size={16} className="text-[#f5a623] shrink-0" />
          </div>

        </div>
      </div>
    </div>
  );
};

export default NotificationBar;
