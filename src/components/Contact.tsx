import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const info = [
  {
    icon: MapPin,
    title: 'Our Location',
    lines: ['Champanagar, Purnia', 'Bihar – 854201, India'],
  },
  {
    icon: Phone,
    title: 'Call Us',
    lines: ['+91 9973152070', 'Mon – Sat, 8 AM – 6 PM'],
  },
  {
    icon: Mail,
    title: 'Email Us',
    lines: ['sunriseclasses@gmail.com', 'We reply within 24 hours'],
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/send-contact-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
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
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest">Get In Touch</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">Contact Us</h2>
          <div className="w-16 h-1 bg-[#f5a623] mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h3 className="text-xl font-bold text-[#0f2a5c] mb-6">Reach Out To Us</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
              {info.map(({ icon: Icon, title, lines }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#f5a623]/40 hover:shadow-sm transition-all duration-300"
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

            <div className="bg-gradient-to-br from-[#0f2a5c] to-[#1a3f7a] rounded-2xl p-6 text-white">
              <p className="font-bold text-base mb-1">Supported by</p>
              <p className="text-[#f5a623] font-extrabold text-lg">Nikhar Gramin Vikash Sansthan</p>
              <p className="text-gray-300 text-xs mt-2 leading-relaxed">
                Our work in rural education is strengthened through the support and collaboration of
                Nikhar Gramin Vikash Sansthan, dedicated to uplifting communities across Bihar.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#0f2a5c] mb-6">Send Us a Message</h3>
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={24} className="text-green-600" />
                </div>
                <h4 className="text-green-800 font-bold text-lg mb-2">Message Sent!</h4>
                <p className="text-green-600 text-sm">Thank you for reaching out. We'll contact you within 24 hours.</p>
                <button
                  onClick={() => setSent(false)}
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
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Message</label>
                  <textarea
                    name="message"
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#f5a623] text-[#0f2a5c] font-bold py-3 rounded-lg hover:bg-[#e09010] disabled:bg-gray-400 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-[#f5a623]/30 hover:-translate-y-0.5"
                >
                  <Send size={17} />
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
