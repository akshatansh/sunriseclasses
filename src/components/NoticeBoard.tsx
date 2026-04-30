import React, { useEffect, useState } from 'react';
import { Bell, Calendar, GraduationCap, AlertCircle, FileText } from 'lucide-react';
import { getNotices, type NoticeRecord } from '../lib/noticePortal';

const NoticeBoard = () => {
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      const data = await getNotices();
      setNotices(data);
      setLoading(false);
    };
    fetchNotices();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-6 w-1/3 rounded bg-slate-200"></div>
        <div className="h-20 rounded-2xl bg-slate-100"></div>
        <div className="h-20 rounded-2xl bg-slate-100"></div>
      </div>
    );
  }

  if (notices.length === 0) {
    return null; // Don't show anything if there are no notices
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'exam': return <GraduationCap className="text-red-500" size={20} />;
      case 'holiday': return <Calendar className="text-green-500" size={20} />;
      default: return <AlertCircle className="text-blue-500" size={20} />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'exam': return 'bg-red-50 text-red-600 border-red-200';
      case 'holiday': return 'bg-green-50 text-green-600 border-green-200';
      default: return 'bg-blue-50 text-blue-600 border-blue-200';
    }
  };

  return (
    <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/80 p-6 sm:p-8 shadow-lg backdrop-blur h-full">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5a623] text-white shadow-md">
          <Bell size={22} className="animate-[ring_3s_ease-in-out_infinite]" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-[#0f2a5c]">Notice Board</h2>
          <p className="text-sm text-slate-500">Latest updates & announcements</p>
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {notices.map((notice) => (
          <div key={notice.id} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[#f5a623]/30 group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#f5a623] to-[#ffb347]" />
            <div className="flex items-start gap-4 ml-1">
              <div className="mt-1 flex-shrink-0">
                {getIcon(notice.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h3 className="text-base font-bold text-[#0f2a5c]">{notice.title}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(notice.type)}`}>
                    {notice.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">{notice.content}</p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                  <Calendar size={12} />
                  {new Date(notice.date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          5%, 15%, 25% { transform: rotate(10deg); }
          10%, 20%, 30% { transform: rotate(-10deg); }
          35% { transform: rotate(0deg); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; rounded: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default NoticeBoard;
