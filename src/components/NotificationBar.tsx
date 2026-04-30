import React, { useEffect, useState } from 'react';
import { getNotificationText } from '../lib/siteSettings';
import { Sparkles } from 'lucide-react';

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
    <div className="bg-gradient-to-r from-[#0f2a5c] via-[#173873] to-[#0f2a5c] text-white py-2 px-4 overflow-hidden relative z-50 flex items-center shadow-md border-b border-[#f5a623]/20">
      <div className="w-full flex items-center whitespace-nowrap overflow-hidden">
        <div className="animate-marquee flex items-center gap-4 text-sm sm:text-base font-semibold tracking-wide">
          <Sparkles size={16} className="text-[#f5a623] shrink-0" />
          <span>{text}</span>
          <Sparkles size={16} className="text-[#f5a623] shrink-0 ml-12" />
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
};

export default NotificationBar;
