import React, { useState, useEffect, useRef } from 'react';
import { Download, Search, AlertCircle, CheckCircle, Phone, MapPin, Clock, ArrowRight, Camera, X } from 'lucide-react';
import { registerForSTSE, getRegistrationByRollOrPhone, getSTSEConfig } from '../lib/stse';
import { generateAdmitCardPDF, resizeImageToPassportSize, STSERegistration, STSEConfig } from '../lib/admitCardPdf';

const LOCAL_SCHOOLS = [
  'राजकीय उच्च विद्यालय, चंपानगर (Govt High School Champanagar)',
  'उच्च माध्यमिक विद्यालय, श्रीनगर (High School Srinagar)',
  'उत्क्रमित माध्यमिक विद्यालय (Upgraded High School)',
  'आदर्श मध्य विद्यालय, चंपानगर',
  'एस.एन.एस. हाई स्कूल (SNS High School)',
  'संत जोसेफ / होली क्रॉस स्कूल',
  'ज्ञान भारती पब्लिक स्कूल',
  'डी.ए.वी. पब्लिक स्कूल / अन्य निजी विद्यालय',
  'अन्य स्कूल (Other School)',
];

const LOCAL_VILLAGES = [
  'चंपानगर (Champanagar)',
  'श्रीनगर (Srinagar)',
  'खुटी धुनैली (Khuthi Dhunaili)',
  'झौआरी / कदवा (Jhouari / Kadwa)',
  'बनमनखी रोड क्षेत्र (Banmankhi Road Area)',
  'महाराजपुर / रामपुर (Maharajpur / Rampur)',
  'अन्य 8 KM का गांव/क्षेत्र (Other Area within 8km)',
];

export default function ScholarshipPage() {
  const [config, setConfig] = useState<STSEConfig>({
    exam_date: 'शीघ्र घोषित होगी (To Be Announced)',
    venue: 'Sunrise Classes & Academy Campus, Main Market, Champanagar, Purnia (Bihar)',
    shifts: ['Shift 1: 09:30 AM - 10:30 AM', 'Shift 2: 11:30 AM - 12:30 PM'],
  });

  const [activeTab, setActiveTab] = useState<'register' | 'admit'>('register');

  const [formData, setFormData] = useState({
    student_name: '',
    father_name: '',
    phone: '',
    whatsapp: '',
    school_name: LOCAL_SCHOOLS[0],
    custom_school: '',
    village_area: LOCAL_VILLAGES[0],
    custom_village: '',
    shift_preference: 'Shift 1: 09:30 AM - 10:30 AM',
    class_target: 'Class 10th (Matric 2027)',
  });

  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState<STSERegistration | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<STSERegistration | null>(null);
  const [searchError, setSearchError] = useState('');

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('कृपया मान्य फोटो फाइल (JPG, PNG या WEBP) चुनें।');
      return;
    }

    try {
      setPhotoLoading(true);
      const resized = await resizeImageToPassportSize(file);
      setPhotoBase64(resized);
      setErrorMessage('');
    } catch (err) {
      console.error('Photo resize error', err);
      setErrorMessage('फोटो लोड करने में समस्या आई। कृपया दूसरी फोटो चुनें।');
    } finally {
      setPhotoLoading(false);
    }
  };

  const removePhoto = () => {
    setPhotoBase64('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    getSTSEConfig().then(cfg => {
      setConfig(cfg);
      if (cfg.shifts && cfg.shifts.length > 0) {
        setFormData(prev => ({ ...prev, shift_preference: cfg.shifts![0] }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.student_name.trim() || !formData.father_name.trim() || !formData.phone.trim()) {
      setErrorMessage('कृपया सभी आवश्यक जानकारी (नाम, पिता का नाम और मोबाइल नंबर) भरें।');
      return;
    }
    if (formData.phone.trim().length < 10) {
      setErrorMessage('कृपया मान्य 10-अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    setLoading(true);
    const finalSchool = formData.school_name === 'अन्य स्कूल (Other School)' && formData.custom_school.trim()
      ? formData.custom_school.trim() : formData.school_name;
    const finalVillage = formData.village_area === 'अन्य 8 KM का गांव/क्षेत्र (Other Area within 8km)' && formData.custom_village.trim()
      ? formData.custom_village.trim() : formData.village_area;

    const res = await registerForSTSE({
      student_name: formData.student_name.trim(),
      father_name: formData.father_name.trim(),
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
      school_name: finalSchool,
      village_area: finalVillage,
      shift_preference: formData.shift_preference,
      class_target: formData.class_target,
      exam_date: config.exam_date,
      photo_base64: photoBase64 || undefined,
    });

    setLoading(false);
    if (res.success && res.registration) {
      setSuccessRegistration(res.registration);
      setTimeout(() => { generateAdmitCardPDF(res.registration!, config); }, 800);
    } else {
      setErrorMessage(res.error || 'रजिस्ट्रेशन में समस्या आई। कृपया पुनः प्रयास करें।');
    }
  };

  const handleSearchLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    if (!searchQuery.trim()) { setSearchError('कृपया रोल नंबर या मोबाइल नंबर दर्ज करें।'); return; }
    setSearchLoading(true);
    const result = await getRegistrationByRollOrPhone(searchQuery.trim());
    setSearchLoading(false);
    if (result) { setSearchResult(result); }
    else { setSearchError('कोई रजिस्ट्रेशन नहीं मिला। कृपया सही रोल नंबर या 10-अंकों का मोबाइल नंबर दर्ज करें।'); }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-gray-800 font-sans">

      {/* ═══════════════════════════════════════════════
          INSTITUTIONAL HEADER
      ═══════════════════════════════════════════════ */}
      <header className="bg-[#0f2a5c] text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center gap-4">
          {/* Logo + Institute Name */}
          <div className="flex items-center gap-4 flex-1">
            <img src="/sunrise-logo.png" alt="Sunrise Classes Logo"
              className="w-16 h-16 object-contain rounded bg-white p-1 shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <div className="text-[11px] font-semibold tracking-widest uppercase text-[#f5a623] mb-0.5">
                Sunrise Classes &amp; Academy
              </div>
              <div className="text-xl sm:text-2xl font-bold leading-tight text-white">
                सनराइज क्लासेज एवं अकादमी
              </div>
              <div className="text-xs text-blue-200 mt-0.5">
                Main Market, Champanagar, Purnia — Bihar — 854330
              </div>
            </div>
          </div>
          {/* Contact */}
          <div className="text-right shrink-0">
            <a href="tel:9973152070" className="flex items-center gap-2 text-[#f5a623] font-bold text-base hover:underline justify-end">
              <Phone className="w-4 h-4" />
              +91 99731 52070
            </a>
            <div className="text-xs text-blue-200 mt-0.5">सोम–शनि: सुबह 7 से शाम 7 बजे</div>
          </div>
        </div>
        {/* Gold divider bar */}
        <div className="h-1 bg-[#f5a623]" />
      </header>

      {/* ═══════════════════════════════════════════════
          EXAM NOTIFICATION BANNER (Government Notice Style)
      ═══════════════════════════════════════════════ */}
      <section className="bg-white border-b-4 border-[#0f2a5c]">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
          <div className="text-center">
            {/* Official notice top label */}
            <div className="inline-block border border-[#0f2a5c] text-[#0f2a5c] text-xs font-bold uppercase tracking-widest px-4 py-1 mb-4">
              आधिकारिक सूचना | OFFICIAL NOTIFICATION
            </div>
            {/* Exam full name */}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0f2a5c] leading-snug mb-1">
              सनराइज प्रतिभा खोज एवं छात्रवृत्ति परीक्षा
            </h1>
            <div className="text-base sm:text-xl font-semibold text-[#f5a623] tracking-wide mb-4">
              STSE 2027 — Sunrise Talent Search Examination
            </div>
            {/* Intro para — institutional language */}
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-relaxed">
              सनराइज क्लासेज एवं अकादमी, चंपानगर द्वारा कक्षा 9वीं उत्तीर्ण (10वीं में प्रवेशार्थी) छात्र-छात्राओं के लिए
              एक विशेष प्रतिभा खोज परीक्षा का आयोजन किया जा रहा है। इस परीक्षा में भाग लेने के लिए कोई शुल्क नहीं है।
              योग्य छात्रों को <strong>शत-प्रतिशत (100%) से 25% तक फीस में छूट</strong> एवं विशेष पुरस्कार प्रदान किए जाएंगे।
            </p>
            {/* Key info row */}
            <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0f2a5c]" />
                <span>परीक्षा तिथि: <strong className="text-[#0f2a5c]">{config.exam_date}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0f2a5c]" />
                <span>परीक्षा केंद्र: <strong className="text-[#0f2a5c]">सनराइज कैंपस, चंपानगर</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-green-700" />
                <span>पंजीकरण शुल्क: <strong className="text-green-700">निःशुल्क (Free)</strong></span>
              </div>
            </div>
            {/* CTA Buttons */}
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => setActiveTab('register')}
                className="px-8 py-3 bg-[#f5a623] text-[#0f2a5c] font-bold rounded text-sm hover:bg-amber-400 transition-colors shadow">
                ➤ ऑनलाइन पंजीकरण (Free Registration)
              </button>
              <button onClick={() => setActiveTab('admit')}
                className="px-8 py-3 bg-white border-2 border-[#0f2a5c] text-[#0f2a5c] font-bold rounded text-sm hover:bg-blue-50 transition-colors">
                ↓ एडमिट कार्ड डाउनलोड करें
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ═══════════════════════════════════════════════
            DIRECTOR'S MESSAGE
        ═══════════════════════════════════════════════ */}
        <section className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <div className="bg-[#0f2a5c] text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider">
            निदेशक महोदय का संदेश — Director's Message
          </div>
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6">
            {/* Director photo */}
            <div className="shrink-0 mx-auto sm:mx-0">
              <img
                src="/director_photo.jpg"
                alt="Director — Sunrise Classes"
                className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded border-2 border-[#f5a623]"
                onError={e => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                }}
              />
              <div className="text-center mt-1.5 text-xs text-gray-500 leading-tight">
                <div className="font-bold text-gray-700">निदेशक</div>
                <div>सनराइज क्लासेज</div>
              </div>
            </div>
            {/* Message text */}
            <div>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3">
                प्रिय अभिभावक एवं छात्र-छात्राओं,
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                STSE 2027 का उद्देश्य हमारे क्षेत्र — चंपानगर एवं आसपास के गांवों — के प्रतिभाशाली बच्चों को एक मंच
                देना है, जहाँ वे अपनी योग्यता साबित कर सकें और कम फीस में गुणवत्तापूर्ण शिक्षा प्राप्त कर सकें।
                यह परीक्षा कक्षा 9वीं के पाठ्यक्रम पर आधारित होगी। <strong>प्रथम स्थान पाने वाले छात्र को
                स्मार्टवॉच एवं पूरे वर्ष 100% फीस माफ़ी</strong> दी जाएगी।
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                परीक्षा में भाग लेना बिल्कुल निःशुल्क है। हर भाग लेने वाले छात्र को <strong>Sunrise Exam Kit
                एवं सहभागिता प्रमाण-पत्र</strong> दिया जाएगा। अपना पंजीकरण आज ही करें।
              </p>
              <div className="mt-4 text-xs text-gray-500 font-medium">
                — निदेशक, सनराइज क्लासेज एवं अकादमी, चंपानगर
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            PRIZE & SCHOLARSHIP TABLE
        ═══════════════════════════════════════════════ */}
        <section className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <div className="bg-[#0f2a5c] text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider">
            पुरस्कार एवं छात्रवृत्ति विवरण — Prize &amp; Scholarship Details
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs text-gray-500 mb-3 italic">
              * शीर्ष 10 छात्रों को पुरस्कार एवं फीस छूट दी जाएगी। सभी उपस्थित छात्रों को Exam Kit एवं Certificate मिलेगा।
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f5a623]/15 text-[#0f2a5c]">
                    <th className="border border-gray-300 px-3 py-2.5 text-left font-bold w-32">रैंक (Rank)</th>
                    <th className="border border-gray-300 px-3 py-2.5 text-left font-bold">फीस में छूट</th>
                    <th className="border border-gray-300 px-3 py-2.5 text-left font-bold">पुरस्कार / Prize</th>
                    <th className="border border-gray-300 px-3 py-2.5 text-left font-bold">अन्य लाभ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-amber-50/60">
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-amber-900">Rank 1 (Topper)</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-green-700">100% फीस माफ़ (Full Year)</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-medium">ब्रांडेड स्मार्टवॉच + स्वर्ण ट्रॉफी</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-600">Sunrise VIP बैग + संपूर्ण किट + मेरिट प्रमाण-पत्र</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-gray-700">Rank 2 एवं 3</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-green-700">75% फीस माफ़</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-medium">डिजिटल स्पोर्ट्स वॉच + रजत ट्रॉफी</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-600">प्रीमियम स्कूल बैग + एग्जाम किट + प्रमाण-पत्र</td>
                  </tr>
                  <tr className="bg-gray-50/70">
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-gray-700">Rank 4 से 10</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-green-700">50% से 25% फीस माफ़</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-medium">कांस्य मेडल + Class 10th गाइड बुक किट</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-600">स्कूल बैग + एग्जाम किट + प्रमाण-पत्र</td>
                  </tr>
                  <tr className="bg-green-50/60">
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-green-800">सभी उपस्थित परीक्षार्थी</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-600">—</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-medium text-green-800">
                      Sunrise राइटिंग बोर्ड + 2 OMR बॉल पेन
                    </td>
                    <td className="border border-gray-300 px-3 py-2.5 font-medium text-green-800">
                      आधिकारिक सहभागिता प्रमाण-पत्र (Certificate)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            EXAM PATTERN TABLE
        ═══════════════════════════════════════════════ */}
        <section className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <div className="bg-[#0f2a5c] text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider">
            परीक्षा पैटर्न एवं पाठ्यक्रम — Exam Pattern &amp; Syllabus
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs text-gray-500 mb-4">
              परीक्षा कक्षा 9वीं के Bihar Board पाठ्यक्रम पर आधारित होगी। प्रश्न-पत्र हिंदी एवं अंग्रेजी दोनों माध्यम में होगा।
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f5a623]/15 text-[#0f2a5c]">
                    <th className="border border-gray-300 px-3 py-2.5 text-left font-bold">विषय (Subject)</th>
                    <th className="border border-gray-300 px-3 py-2.5 text-left font-bold w-28">प्रश्न संख्या</th>
                    <th className="border border-gray-300 px-3 py-2.5 text-left font-bold">मुख्य अध्याय (Topics)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2.5 font-semibold text-[#0f2a5c]">गणित (Mathematics)</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-center">20</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-600 text-xs">
                      संख्या पद्धति, बहुपद, दो चर वाले रैखिक समीकरण, त्रिभुज, पृष्ठीय क्षेत्रफल और आयतन
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2.5 font-semibold text-[#0f2a5c]">विज्ञान (Science)</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-center">20</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-600 text-xs">
                      गति एवं बल के नियम, गुरुत्वाकर्षण, पदार्थ की संरचना, परमाणु-अणु, कोशिका एवं ऊतक
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2.5 font-semibold text-[#0f2a5c]">तर्कशक्ति (Mental Ability)</td>
                    <td className="border border-gray-300 px-3 py-2.5 font-bold text-center">10</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-600 text-xs">
                      नंबर सीरीज, कोडिंग-डिकोडिंग, मिसिंग नंबर, दिशा ज्ञान, तार्किक पैटर्न
                    </td>
                  </tr>
                  <tr className="bg-[#f5a623]/10 font-bold">
                    <td className="border border-gray-300 px-3 py-2.5 text-[#0f2a5c]">कुल (Total)</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-center text-[#0f2a5c]">50</td>
                    <td className="border border-gray-300 px-3 py-2.5 text-gray-700 text-xs">
                      OMR शीट आधारित | समय: 60 मिनट | नेगेटिव मार्किंग: नहीं
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Exam quick facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              {[
                { label: 'कुल प्रश्न', value: '50 MCQ' },
                { label: 'परीक्षा समय', value: '60 मिनट' },
                { label: 'माध्यम', value: 'OMR शीट' },
                { label: 'नेगेटिव मार्किंग', value: 'बिल्कुल नहीं' },
              ].map(f => (
                <div key={f.label} className="bg-gray-50 border border-gray-200 rounded p-2.5">
                  <div className="text-gray-500 mb-0.5">{f.label}</div>
                  <div className="font-bold text-[#0f2a5c]">{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            REGISTRATION / ADMIT CARD TABS
        ═══════════════════════════════════════════════ */}
        <section className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden" id="register-section">
          {/* Tab Header */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${
                activeTab === 'register'
                  ? 'bg-[#0f2a5c] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              ➤ नया पंजीकरण (New Registration)
            </button>
            <button
              onClick={() => setActiveTab('admit')}
              className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${
                activeTab === 'admit'
                  ? 'bg-[#0f2a5c] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              ↓ एडमिट कार्ड डाउनलोड
            </button>
          </div>

          <div className="p-5 sm:p-7">
            {/* ─── REGISTRATION FORM TAB ─── */}
            {activeTab === 'register' && (
              <>
                {successRegistration ? (
                  /* SUCCESS STATE */
                  <div className="max-w-lg mx-auto text-center">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-1">पंजीकरण सफल!</h3>
                    <p className="text-gray-600 text-sm mb-5">आपका STSE 2027 परीक्षा के लिए पंजीकरण हो चुका है।</p>
                    <div className="bg-gray-50 border border-gray-200 rounded text-left p-4 mb-5 text-sm flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                      {successRegistration.photo_base64 && (
                        <div className="w-20 h-24 border border-[#0f2a5c] rounded overflow-hidden bg-white shrink-0 shadow-sm">
                          <img src={successRegistration.photo_base64} alt="Student" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                          <span className="text-gray-500">रोल नंबर:</span>
                          <span className="font-bold text-[#0f2a5c] text-base">{successRegistration.roll_number}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                          <span className="text-gray-500">छात्र का नाम:</span>
                          <span className="font-semibold">{successRegistration.student_name}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-2">
                          <span className="text-gray-500">परीक्षा शिफ्ट:</span>
                          <span className="font-semibold">{successRegistration.shift_preference}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">परीक्षा केंद्र:</span>
                          <span className="font-semibold">सनराइज कैंपस, चंपानगर</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => generateAdmitCardPDF(successRegistration, config)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0f2a5c] text-white font-bold rounded text-sm hover:bg-[#1a3a7a] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        एडमिट कार्ड PDF डाउनलोड करें
                      </button>
                      <button
                        onClick={() => {
                          setSuccessRegistration(null);
                          setPhotoBase64('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          setFormData({
                            student_name: '', father_name: '', phone: '', whatsapp: '',
                            school_name: LOCAL_SCHOOLS[0], custom_school: '',
                            village_area: LOCAL_VILLAGES[0], custom_village: '',
                            shift_preference: config.shifts?.[0] || 'Shift 1: 09:30 AM - 10:30 AM',
                            class_target: 'Class 10th (Matric 2027)',
                          });
                        }}
                        className="px-5 py-3 border border-gray-300 text-gray-700 font-semibold rounded text-sm hover:bg-gray-50 transition-colors"
                      >
                        दूसरा फॉर्म भरें
                      </button>
                    </div>
                  </div>
                ) : (
                  /* REGISTRATION FORM */
                  <>
                    <div className="mb-5 pb-4 border-b border-gray-100">
                      <h2 className="text-base font-bold text-[#0f2a5c]">STSE 2027 — पंजीकरण प्रपत्र</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        फॉर्म भरते ही तुरंत एडमिट कार्ड (PDF) डाउनलोड हो जाएगा। सभी जानकारी सही-सही भरें।
                      </p>
                    </div>

                    {errorMessage && (
                      <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Row 1 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            छात्र / छात्रा का नाम <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text" required
                            placeholder="जैसे: Rahul Kumar"
                            value={formData.student_name}
                            onChange={e => setFormData({ ...formData, student_name: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c] focus:ring-1 focus:ring-[#0f2a5c]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            पिता का नाम <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text" required
                            placeholder="जैसे: Shri Rajesh Kumar"
                            value={formData.father_name}
                            onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c] focus:ring-1 focus:ring-[#0f2a5c]/30"
                          />
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            मोबाइल नंबर <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel" required maxLength={10}
                            placeholder="10 अंकों का नंबर"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c] focus:ring-1 focus:ring-[#0f2a5c]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            WhatsApp नंबर <span className="text-gray-400 font-normal">(यदि अलग है)</span>
                          </label>
                          <input
                            type="tel" maxLength={10}
                            placeholder="WhatsApp नंबर"
                            value={formData.whatsapp}
                            onChange={e => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c] focus:ring-1 focus:ring-[#0f2a5c]/30"
                          />
                        </div>
                      </div>

                      {/* School */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          वर्तमान विद्यालय का नाम <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.school_name}
                          onChange={e => setFormData({ ...formData, school_name: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c] bg-white"
                        >
                          {LOCAL_SCHOOLS.map((sch, i) => (
                            <option key={i} value={sch}>{sch}</option>
                          ))}
                        </select>
                        {formData.school_name === 'अन्य स्कूल (Other School)' && (
                          <input
                            type="text"
                            placeholder="अपने स्कूल का पूरा नाम लिखें"
                            value={formData.custom_school}
                            onChange={e => setFormData({ ...formData, custom_school: e.target.value })}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c]"
                          />
                        )}
                      </div>

                      {/* Village */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          गांव / मोहल्ला / क्षेत्र <span className="text-red-500">*</span>
                          <span className="text-gray-400 font-normal ml-1">(8 km के अंदर)</span>
                        </label>
                        <select
                          value={formData.village_area}
                          onChange={e => setFormData({ ...formData, village_area: e.target.value })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c] bg-white"
                        >
                          {LOCAL_VILLAGES.map((v, i) => (
                            <option key={i} value={v}>{v}</option>
                          ))}
                        </select>
                        {formData.village_area === 'अन्य 8 KM का गांव/क्षेत्र (Other Area within 8km)' && (
                          <input
                            type="text"
                            placeholder="अपने गांव या क्षेत्र का नाम लिखें"
                            value={formData.custom_village}
                            onChange={e => setFormData({ ...formData, custom_village: e.target.value })}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c]"
                          />
                        )}
                      </div>

                      {/* Shift */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          पसंदीदा परीक्षा शिफ्ट (Shift Preference)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(config.shifts || ['Shift 1: 09:30 AM - 10:30 AM', 'Shift 2: 11:30 AM - 12:30 PM']).map((s, idx) => (
                            <label
                              key={idx}
                              className={`flex items-center gap-3 p-3 border rounded cursor-pointer text-sm transition-colors ${
                                formData.shift_preference === s
                                  ? 'border-[#0f2a5c] bg-blue-50 font-semibold text-[#0f2a5c]'
                                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <input
                                type="radio" name="shift"
                                checked={formData.shift_preference === s}
                                onChange={() => setFormData({ ...formData, shift_preference: s })}
                                className="w-4 h-4"
                              />
                              {s}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Passport Size Photo Upload */}
                      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50/80">
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          छात्र / छात्रा का पासपोर्ट साइज फोटो (Passport Photo)
                          <span className="text-gray-400 font-normal ml-1">(एडमिट कार्ड पर प्रिंट होगा)</span>
                        </label>

                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                          id="passport-photo-input"
                        />

                        {photoBase64 ? (
                          <div className="flex items-center gap-4 mt-2">
                            <div className="relative w-20 h-24 sm:w-24 sm:h-32 border-2 border-[#0f2a5c] rounded overflow-hidden bg-white shadow-sm shrink-0">
                              <img
                                src={photoBase64}
                                alt="Student Preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={removePhoto}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow"
                                title="फोटो हटाएं"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="font-semibold text-green-700 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                फोटो सफलतापूर्वक लोड हो गया
                              </div>
                              <p className="text-gray-500">
                                यह फोटो सीधे आपके आधिकारिक एडमिट कार्ड पर पासपोर्ट बॉक्स में प्रिंट होगा।
                              </p>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[#0f2a5c] underline font-medium hover:text-[#1a3a7a]"
                              >
                                दूसरी फोटो बदलें
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 border-2 border-dashed border-gray-300 rounded cursor-pointer p-4 text-center hover:border-[#0f2a5c] hover:bg-white transition-all"
                          >
                            <Camera className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
                            <div className="text-xs font-bold text-[#0f2a5c]">
                              {photoLoading ? 'फोटो प्रोसेस हो रही है...' : 'पासपोर्ट साइज फोटो अपलोड करें (गैलरी या कैमरा)'}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              JPG, PNG फोटो चुनें — जिससे आपका एडमिट कार्ड आधिकारिक बोर्ड परीक्षा जैसा दिखेगा।
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        type="submit" disabled={loading}
                        className="w-full py-3.5 bg-[#0f2a5c] text-white font-bold rounded text-sm hover:bg-[#1a3a7a] active:scale-[0.99] transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? (
                          'पंजीकरण हो रहा है... कृपया प्रतीक्षा करें'
                        ) : (
                          <>
                            <span>निःशुल्क पंजीकरण करें एवं एडमिट कार्ड प्राप्त करें</span>
                            <ArrowRight className="w-4 h-4 text-[#f5a623]" />
                          </>
                        )}
                      </button>
                      <p className="text-center text-xs text-gray-400 mt-1">
                        🔒 आपकी व्यक्तिगत जानकारी पूर्णतः सुरक्षित रहेगी। पंजीकरण बिल्कुल निःशुल्क है।
                      </p>
                    </form>
                  </>
                )}
              </>
            )}

            {/* ─── ADMIT CARD TAB ─── */}
            {activeTab === 'admit' && (
              <div className="max-w-md mx-auto">
                <div className="mb-5 pb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-[#0f2a5c]">एडमिट कार्ड डाउनलोड</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    अपना रोल नंबर या पंजीकृत मोबाइल नंबर दर्ज करके एडमिट कार्ड PDF डाउनलोड करें।
                  </p>
                </div>

                <form onSubmit={handleSearchLookup} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      रोल नंबर या मोबाइल नंबर दर्ज करें
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Roll No. या 10-अंकों का मोबाइल नंबर"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-grow px-3 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0f2a5c]"
                      />
                      <button
                        type="submit" disabled={searchLoading}
                        className="px-5 py-2.5 bg-[#0f2a5c] text-white font-bold rounded text-sm hover:bg-[#1a3a7a] transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <Search className="w-4 h-4" />
                        {searchLoading ? 'खोज रहे...' : 'खोजें'}
                      </button>
                    </div>
                  </div>
                </form>

                {searchError && (
                  <div className="mt-4 p-3 border border-red-200 bg-red-50 rounded text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {searchError}
                  </div>
                )}

                {searchResult && (
                  <div className="mt-5 border border-gray-200 rounded bg-gray-50 p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start mb-3">
                      {searchResult.photo_base64 && (
                        <div className="w-20 h-24 border border-[#0f2a5c] rounded overflow-hidden bg-white shrink-0 shadow-sm">
                          <img src={searchResult.photo_base64} alt="Student" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 w-full">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-[#0f2a5c]">{searchResult.student_name}</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-[#0f2a5c] text-white rounded">
                            Roll: {searchResult.roll_number}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>पिता का नाम: <span className="font-medium text-gray-800">{searchResult.father_name}</span></div>
                          <div>विद्यालय: <span className="font-medium text-gray-800">{searchResult.school_name}</span></div>
                          <div>परीक्षा शिफ्ट: <span className="font-medium text-gray-800">{searchResult.shift_preference}</span></div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => generateAdmitCardPDF(searchResult, config)}
                      className="w-full py-2.5 bg-[#f5a623] text-[#0f2a5c] font-bold rounded text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      एडमिट कार्ड PDF डाउनलोड करें
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════
            PARENTS' ORIENTATION NOTE
        ═══════════════════════════════════════════════ */}
        <section className="bg-[#0f2a5c] text-white rounded shadow-sm overflow-hidden">
          <div className="bg-[#f5a623] text-[#0f2a5c] px-5 py-2.5 text-sm font-bold uppercase tracking-wider">
            अभिभावकों के लिए विशेष सूचना — Notice for Parents
          </div>
          <div className="p-5 sm:p-7">
            <p className="text-sm text-blue-100 leading-relaxed mb-5">
              जब आपके बच्चे परीक्षा दे रहे होंगे, उस समय कोचिंग सभागार में अभिभावकों के लिए एक <strong className="text-white">निःशुल्क
              मार्गदर्शन सत्र (Guidance Session)</strong> आयोजित किया जाएगा, जिसमें निम्न विषयों पर चर्चा होगी:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
              {[
                'Bihar Board Matric 2027 में 450+ अंक लाने की रणनीति',
                'Sunrise में डिजिटल उपस्थिति व साप्ताहिक परीक्षा प्रणाली',
                'Class 10th पाठ्यक्रम एवं परीक्षा की तैयारी कैसे करें',
                'अपने बच्चे की पढ़ाई में अभिभावक की भूमिका',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-blue-100">
                  <span className="text-[#f5a623] mt-0.5">▸</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[#f5a623]" />
                <span className="text-blue-200">किसी भी जानकारी के लिए संपर्क करें:</span>
                <a href="tel:9973152070" className="font-bold text-white hover:text-[#f5a623] transition-colors">
                  +91 99731 52070
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm sm:ml-4">
                <MapPin className="w-4 h-4 text-[#f5a623]" />
                <span className="text-blue-200">सनराइज कैंपस, मेन मार्केट, चंपानगर, पूर्णिया</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="text-center text-xs text-gray-400 pb-4">
          © Sunrise Classes &amp; Academy, Champanagar, Purnia, Bihar — STSE 2027
        </div>

      </div>
    </div>
  );
}
