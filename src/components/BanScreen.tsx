import { ShieldX, Clock, AlertTriangle, LogOut } from 'lucide-react';

interface BanInfo {
  type: 'permanent' | 'temporary';
  reason: string | null;
  until: string | null; // ISO date string, only for temporary
}

interface Props {
  student: {
    name: string;
    class_name: string;
    image?: string;
  };
  banInfo: BanInfo;
  onBack: () => void;
}

function formatTimeRemaining(until: string): string {
  const now = new Date();
  const end = new Date(until);
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} din ${hours} ghante`;
  if (hours > 0) return `${hours} ghante ${mins} minute`;
  return `${mins} minute`;
}

export default function BanScreen({ student, banInfo, onBack }: Props) {
  const isPermanent = banInfo.type === 'permanent';
  const isExpired = banInfo.type === 'temporary' && banInfo.until
    ? new Date(banInfo.until) <= new Date()
    : false;

  const banUntilDate = banInfo.until
    ? new Date(banInfo.until).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const timeLeft = banInfo.until ? formatTimeRemaining(banInfo.until) : null;

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/sunrise-logo.png" alt="Sunrise Classes" className="h-14 w-14 mx-auto mb-3 rounded-2xl bg-white p-1.5 shadow-lg" />
          <p className="text-slate-400 text-sm">Sunrise Classes &amp; Academy</p>
        </div>

        {/* Main Card */}
        <div className={`rounded-3xl border overflow-hidden shadow-2xl ${
          isPermanent
            ? 'bg-[#1a0808] border-red-900/60'
            : 'bg-[#0f0f1a] border-orange-900/60'
        }`}>

          {/* Header Bar */}
          <div className={`px-6 py-5 flex items-center gap-4 border-b ${
            isPermanent ? 'bg-red-950/60 border-red-900/40' : 'bg-orange-950/40 border-orange-900/30'
          }`}>
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isPermanent ? 'bg-red-500/20' : 'bg-orange-500/20'
            }`}>
              {isPermanent
                ? <ShieldX className="h-7 w-7 text-red-400" />
                : <Clock className="h-7 w-7 text-orange-400" />
              }
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${
                isPermanent ? 'text-red-500' : 'text-orange-500'
              }`}>
                {isPermanent ? 'Permanent Ban' : 'Temporary Ban'}
              </p>
              <h2 className="text-white font-black text-lg leading-tight">Test Access Restricted</h2>
            </div>
          </div>

          {/* Student Info */}
          <div className="px-6 py-5 flex items-center gap-4 border-b border-white/5">
            {student.image ? (
              <img
                src={student.image}
                alt={student.name}
                className="h-14 w-14 rounded-2xl object-cover object-top border border-white/10 shrink-0"
                onError={(e) => { e.currentTarget.src = '/sunrise-logo.png'; }}
              />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0">
                <span className="text-xl font-black text-slate-400">{student.name[0]}</span>
              </div>
            )}
            <div>
              <p className="text-white font-bold text-base">{student.name}</p>
              <p className="text-slate-400 text-sm">{student.class_name}</p>
            </div>
          </div>

          {/* Ban Details */}
          <div className="px-6 py-6 space-y-4">

            {/* Ban Message */}
            <div className={`rounded-2xl p-4 ${
              isPermanent ? 'bg-red-500/10 border border-red-500/20' : 'bg-orange-500/10 border border-orange-500/20'
            }`}>
              {isPermanent ? (
                <>
                  <p className="text-red-300 font-bold text-sm mb-1">Aap permanently online tests se ban hain.</p>
                  <p className="text-red-400/80 text-xs">Aapko online test portal access karne ki permission nahi hai.</p>
                </>
              ) : (
                <>
                  {isExpired ? (
                    <p className="text-green-300 font-bold text-sm">Aapka ban expire ho gaya hai. Kripya dobara login karein.</p>
                  ) : (
                    <>
                      <p className="text-orange-300 font-bold text-sm mb-1">Aapka online test access temporarily band hai.</p>
                      {banUntilDate && (
                        <p className="text-orange-400/80 text-xs">Ban tak: <span className="font-bold text-orange-300">{banUntilDate}</span></p>
                      )}
                      {timeLeft && (
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-orange-400" />
                          <p className="text-orange-300 text-xs font-bold">Bacha hua samay: {timeLeft}</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Reason */}
            {banInfo.reason && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Karan (Reason)</p>
                    <p className="text-white text-sm">{banInfo.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Note */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <p className="text-blue-300 text-xs font-bold mb-1">Admin se Sampark Karein</p>
              <p className="text-blue-400/80 text-xs leading-relaxed">
                Agar aapko lagta hai yeh galti se hua hai, toh S.P. Jha Sir se personal milein ya coaching centre par sampark karein.
              </p>
            </div>
          </div>

          {/* Back Button */}
          <div className="px-6 pb-6">
            <button
              onClick={onBack}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              Wapas Jaao
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">Sunrise Classes &amp; Academy — Champanagar, Purnia</p>
      </div>
    </div>
  );
}
