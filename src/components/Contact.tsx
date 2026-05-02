import { MapPin, Phone, Mail, Clock, Send, Sparkles, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const WEB3FORMS_KEY = 'e2c63024-5003-46ff-a44f-0356db65047f'; // Provided Web3Forms key

/** Always use Web3Forms since key is provided. */
const canSubmitContact = true;

const info = [
  {
    icon: MapPin,
    title: 'Our Location',
    lines: ['Champanagar, Purnia', 'Bihar – 854201, India'],
  },
  {
    icon: Phone,
    title: 'Call Us',
    lines: ['+91 9973152070', '+91 7979732764', 'Mon – Sat, 8 AM – 6 PM'],
  },
  {
    icon: Mail,
    title: 'Email Us',
    lines: ['spjhaclasses@gmail.com', 'We reply within 24 hours'],
  },
  {
    icon: Clock,
    title: 'Class Timings',
    lines: ['Morning: 7 AM – 10 AM', 'Evening: 4 PM – 7 PM'],
  },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', course: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNote, setEmailNote] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailNote('');

    setLoading(true);

    try {
      const bodyText = [
        `Phone: ${form.phone}`,
        form.course ? `Course: ${form.course}` : null,
        form.email ? `Email: ${form.email}` : null,
        '',
        form.message,
      ]
        .filter(Boolean)
        .join('\n');

      const w3 = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `[Sunrise Classes] New message from ${form.name}`,
          from_name: form.name,
          email: (form.email || '').trim() || 'noreply@example.com',
          phone: form.phone,
          message: bodyText,
        }),
      });

      const w3data = (await w3.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!w3.ok || !w3data.success) {
        throw new Error(w3data.message || 'Could not send. Please try again or call us.');
      }

      setSent(true);
      setForm({ name: '', phone: '', email: '', message: '', course: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-20 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_40%,_#fffaf0_100%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img
              src="/sunrise-logo.png"
              alt="Sunrise Classes Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 object-contain drop-shadow-md"
            />
          </div>
          <span className="inline-flex items-center gap-2 text-[#f5a623] text-xs sm:text-sm font-semibold uppercase tracking-widest">
            <Sparkles size={14} />
            Get In Touch
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f2a5c] mt-2">Contact Sunrise Classes - Best Coaching in Champanagar, Purnia</h2>
          <div className="w-12 sm:w-16 h-1 bg-[#f5a623] mx-auto mt-3 sm:mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#0f2a5c] mb-4 sm:mb-6">Reach Out To Us</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mb-6 sm:mb-8">
              {info.map(({ icon: Icon, title, lines }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 p-4 bg-white rounded-[1.5rem] border border-gray-100 hover:border-[#f5a623]/40 hover:shadow-sm transition-all duration-300"
                >
                  <div className="w-10 h-10 bg-[#f5a623]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-[#f5a623]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0f2a5c] text-sm">{title}</p>
                    {lines.map((l) => (
                      <p key={l} className="text-gray-500 text-xs mt-0.5">{l}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] overflow-hidden border border-[#d9e5ff] bg-white shadow-[0_20px_60px_rgba(15,42,92,0.08)]">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-[linear-gradient(135deg,_#f8fbff,_#fff8ea)]">
                <h3 className="text-lg font-bold text-[#0f2a5c]">Find Us on Map</h3>
                <p className="text-sm text-slate-500 mt-1">Sunrise Classes & Academy, Champanagar, Purnia</p>
              </div>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1794.4321560835356!2d87.32824255818029!3d25.906830710435056!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39efeffa528e6173%3A0x7e5cfdea397b5429!2sSunrise%20Coaching%20Centre.!5e0!3m2!1sen!2sin!4v1777567335414!5m2!1sen!2sin"
                width="600"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[320px] w-full"
                title="Sunrise Classes & Academy location on Google Maps"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-[0_20px_60px_rgba(15,42,92,0.08)]">
            <h3 className="text-lg sm:text-xl font-bold text-[#0f2a5c] mb-4 sm:mb-6">Enroll for Board Exam Coaching in Champanagar, Purnia</h3>
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={24} className="text-green-600" />
                </div>
                <h4 className="text-green-800 font-bold text-lg mb-2">Message Sent!</h4>
                <p className="text-green-600 text-sm">Thank you for reaching out. We&apos;ll contact you within 24 hours.</p>
                {emailNote && (
                  <p className="text-amber-800 text-xs mt-3 text-left bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {emailNote}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmailNote('');
                  }}
                  className="mt-4 text-[#0f2a5c] text-sm underline underline-offset-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 transition-all duration-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Course Interested In</label>
                  <select
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 transition-all duration-200 bg-white"
                  >
                    <option value="">Select a course</option>
                    <option>Class 9</option>
                    <option>Class 10</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Message *</label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Write your query or message here..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 transition-all duration-200 resize-none"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {error}
                  </div>
                )}
                {!canSubmitContact && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-xs space-y-2">
                    <p>
                      Sabse aasaan: <code className="bg-white px-1 rounded">web3forms.com</code> par free account → access key
                      copy karke <code className="bg-white px-1 rounded">VITE_WEB3FORMS_ACCESS_KEY</code> <code className="bg-white px-1 rounded">.env</code> mein daalo — admin ko email aa jayegi.
                    </p>
                    <p>
                      Ya Supabase + Edge Function + Resend (see <code className="bg-white px-1 rounded">.env.example</code>).
                    </p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !canSubmitContact}
                  className="w-full bg-[#0f2a5c] text-white font-bold py-3 rounded-full hover:bg-[#173873] disabled:bg-gray-400 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-[#0f2a5c]/20 hover:-translate-y-0.5"
                >
                  <Send size={17} />
                  {loading ? 'Sending...' : 'Send Message'}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
