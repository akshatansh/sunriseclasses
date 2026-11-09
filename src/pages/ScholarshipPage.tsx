import React, { useState, useEffect } from 'react';
import { 
  Trophy, Award, Gift, Clock, MapPin, CheckCircle, ArrowRight, Download, 
  Sparkles, BookOpen, Star, HelpCircle, Phone, AlertCircle, Search, Calendar,
  ShieldCheck, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { registerForSTSE, getRegistrationByRollOrPhone, getSTSEConfig } from '../lib/stse';
import { generateAdmitCardPDF, STSERegistration, STSEConfig } from '../lib/admitCardPdf';

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
    exam_date: 'To be announced (रविवार को)',
    venue: 'Sunrise Classes & Academy Campus, Main Market, Champanagar, Purnia (Bihar)',
    shifts: ['Shift 1: 09:30 AM - 10:30 AM', 'Shift 2: 11:30 AM - 12:30 PM'],
  });

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

  const [loading, setLoading] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState<STSERegistration | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Lookup state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<STSERegistration | null>(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    getSTSEConfig().then(cfg => {
      setConfig(cfg);
      if (cfg.shifts && cfg.shifts.length > 0) {
        setFormData(prev => ({ ...prev, shift_preference: cfg.shifts![0] }));
      }
    });
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Ignore if confetti not supported
    }
  };

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
      ? formData.custom_school.trim()
      : formData.school_name;

    const finalVillage = formData.village_area === 'अन्य 8 KM का गांव/क्षेत्र (Other Area within 8km)' && formData.custom_village.trim()
      ? formData.custom_village.trim()
      : formData.village_area;

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
    });

    setLoading(false);

    if (res.success && res.registration) {
      setSuccessRegistration(res.registration);
      triggerConfetti();
      // Auto-trigger admit card download
      setTimeout(() => {
        generateAdmitCardPDF(res.registration!, config);
      }, 800);
    } else {
      setErrorMessage(res.error || 'रजिस्ट्रेशन में समस्या आई। कृपया पुनः प्रयास करें।');
    }
  };

  const handleSearchLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);

    if (!searchQuery.trim()) {
      setSearchError('कृपया रोल नंबर या मोबाइल नंबर दर्ज करें।');
      return;
    }

    setSearchLoading(true);
    const result = await getRegistrationByRollOrPhone(searchQuery.trim());
    setSearchLoading(false);

    if (result) {
      setSearchResult(result);
    } else {
      setSearchError('कोई एडमिट कार्ड नहीं मिला। कृपया सही रोल नंबर या 10-अंकों का मोबाइल नंबर दर्ज करें।');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 1. TOP HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1931] via-[#0f2a5c] to-[#153e75] text-white py-16 md:py-24">
        {/* Glow circles background */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#f5a623]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f5a623]/20 border border-[#f5a623]/40 text-[#f5a623] text-sm font-bold tracking-wide uppercase mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              चंपानगर का सबसे बड़ा टैलेंट हंट व स्कॉलरशिप टेस्ट
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4 text-white">
              सनराइज प्रतिभा खोज परीक्षा <span className="text-[#f5a623]">2027</span>
              <span className="block text-xl sm:text-2xl md:text-3xl font-semibold text-blue-200 mt-2">
                STSE: Sunrise Talent Search Examination
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg text-slate-200 mb-8 leading-relaxed">
              जो छात्र अब <strong>Class 10th (मैट्रिक 2027)</strong> में जाने वाले हैं, उनके लिए सुनहरा अवसर! 
              जीतो <strong>Smartwatch, Champion Trophies, 100% फीस माफ़ी</strong> और हर छात्र के लिए <strong>फ्री एग्जाम किट</strong>!
            </p>

            {/* Quick Meta Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-10 text-xs sm:text-sm">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[#f5a623] shrink-0" />
                <div className="text-left">
                  <div className="text-slate-300 text-[11px]">स्थान (Offline)</div>
                  <div className="font-bold text-white">सनराइज कैंपस, चंपानगर</div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-green-400 shrink-0" />
                <div className="text-left">
                  <div className="text-slate-300 text-[11px]">परीक्षा समय</div>
                  <div className="font-bold text-white">60 मिनट (50 MCQs)</div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-pink-400 shrink-0" />
                <div className="text-left">
                  <div className="text-slate-300 text-[11px]">रजिस्ट्रेशन शुल्क</div>
                  <div className="font-bold text-green-300">100% बिल्कुल FREE</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#register-section"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#f5a623] to-[#d48806] text-[#0f2a5c] font-extrabold text-base sm:text-lg shadow-xl shadow-[#f5a623]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>फ्री रजिस्ट्रेशन करें (Free Register)</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#admit-card-section"
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5 text-[#f5a623]" />
                <span>एडमिट कार्ड डाउनलोड करें</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MEGA INCENTIVES / PRIZES SECTION (LALACH CARDS) */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#f5a623] tracking-wider uppercase bg-[#f5a623]/10 px-3 py-1 rounded-full">
              Prizes & Scholarships
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">
              छात्रों के लिए शानदार पुरस्कार व स्कॉलरशिप
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              मेहनत आपकी, सम्मान और इनाम हमारा! टॉप 10 को बड़े उपहार और हर छात्र के लिए गारंटीड गिफ्ट!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rank 1 Card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-amber-50 to-white border-2 border-[#f5a623] p-6 shadow-lg shadow-amber-500/10 hover:-translate-y-1 transition-all">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-[#f5a623] text-white px-4 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow">
                🥇 1st Rank (Topper)
              </div>
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 mt-2">
                <Trophy className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-1">
                स्मार्टवॉच + 100% फ्री ट्यूशन
              </h3>
              <div className="text-center text-xs font-semibold text-amber-700 bg-amber-100/60 py-1 px-3 rounded-lg w-fit mx-auto mb-4">
                पूरे 1 साल की फीस ₹0 (Zero)
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Branded Smartwatch</strong> (boAt / Noise) ⌚</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Golden Champion Trophy</strong> 🏆</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>100% Free Tuition Fees</strong> (Class 10th Full Year)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Sunrise VIP School Bag + Complete Kit</span>
                </li>
              </ul>
            </div>

            {/* Rank 2 & 3 Card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-50 to-white border-2 border-slate-300 p-6 shadow-md hover:-translate-y-1 transition-all">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-4 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow">
                🥈 Rank 2 & 3 (Runners-Up)
              </div>
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4 mt-2">
                <Award className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-1">
                स्पोर्ट्स वॉच + 75% फीस माफ़ी
              </h3>
              <div className="text-center text-xs font-semibold text-slate-700 bg-slate-200 py-1 px-3 rounded-lg w-fit mx-auto mb-4">
                ₹9,000+ की सीधी बचत
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Digital Sports Wristwatch</strong> ⌚</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Silver Trophy + Medal</strong> 🥈</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>75% Tuition Fee Scholarship</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Sunrise Premium School Bag</span>
                </li>
              </ul>
            </div>

            {/* Rank 4 to 10 Card */}
            <div className="relative rounded-2xl bg-gradient-to-b from-blue-50/50 to-white border-2 border-blue-200 p-6 shadow-md hover:-translate-y-1 transition-all">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow">
                🥉 Rank 4 से 10 (Star Scholars)
              </div>
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 mt-2">
                <Star className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 mb-1">
                बुक्स किट + 50% फीस माफ़ी
              </h3>
              <div className="text-center text-xs font-semibold text-blue-700 bg-blue-100 py-1 px-3 rounded-lg w-fit mx-auto mb-4">
                आधी फीस माफ़ (50% Off)
              </div>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Class 10th Complete Books Guide Kit</strong> 📚</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Bronze Medal + Trophy</strong> 🥉</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>50% Fees Scholarship</strong> (आधी फीस फ्री!)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Sunrise School Bag + Certificate</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Guaranteed Gift for EVERY attendee */}
          <div className="mt-8 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                <Gift className="w-9 h-9 text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                  🎁 Guaranteed Gift for Every Student (कोई खाली हाथ नहीं जाएगा!)
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  परीक्षा केंद्र पर आते ही फ्री Sunrise Exam Kit + Certificate!
                </h3>
                <p className="text-emerald-100 text-sm mt-1">
                  हर शामिल होने वाले छात्र को <strong>Sunrise Writing Board/Pad</strong>, <strong>2 स्पेशल OMR Ball Pens</strong> और आधिकारिक <strong>Certificate of Merit</strong> मिलेगा!
                </p>
              </div>
            </div>
            <a
              href="#register-section"
              className="px-6 py-3.5 rounded-xl bg-white text-emerald-800 font-extrabold text-sm sm:text-base shrink-0 shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
            >
              अभी फ्री सीट बुक करें →
            </a>
          </div>
        </div>
      </section>

      {/* 3. EXAM PATTERN & SYLLABUS SECTION */}
      <section className="py-14 sm:py-20 bg-slate-100 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-100 px-3 py-1 rounded-full">
              Exam Pattern & Syllabus
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2a5c] mt-2">
              परीक्षा का पैटर्न और सिलेबस (Class 9th आधारित)
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              क्योंकि आप 9वीं पास करके 10वीं में आ रहे हैं, प्रश्न 9वीं के मुख्य अध्यायों से ही पूछे जाएंगे!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-[#0f2a5c]">गणित (Mathematics)</h4>
                <span className="text-xs font-extrabold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">20 Questions</span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-600">
                <li>• संख्या पद्धति (Number System)</li>
                <li>• बहुपद (Polynomials)</li>
                <li>• दो चर वाले रैखिक समीकरण</li>
                <li>• त्रिभुज एवं चतुर्भुज</li>
                <li>• पृष्ठीय क्षेत्रफल और आयतन</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-[#0f2a5c]">विज्ञान (Science)</h4>
                <span className="text-xs font-extrabold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md">20 Questions</span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-600">
                <li>• गति एवं बल के नियम (Physics)</li>
                <li>• गुरुत्वाकर्षण (Gravitation)</li>
                <li>• हमारे आस-पास के पदार्थ (Chemistry)</li>
                <li>• परमाणु एवं अणु</li>
                <li>• कोशिका एवं ऊतक (Biology)</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-[#0f2a5c]">तर्कशक्ति (Mental Ability)</h4>
                <span className="text-xs font-extrabold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md">10 Questions</span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-600">
                <li>• नंबर व अल्फाबेट सीरीज</li>
                <li>• कोडिंग - डिकोडिंग</li>
                <li>• मिसिंग नंबर लॉजिक</li>
                <li>• दिशा व ब्लड रिलेशन बेसिक्स</li>
                <li>• तार्किक पैटर्न प्रश्न</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl p-4 border border-slate-200 text-xs sm:text-sm text-slate-600 flex flex-wrap items-center justify-around gap-4 text-center">
            <div>⏱️ <strong>समय:</strong> 60 मिनट (1 घंटा)</div>
            <div>📝 <strong>पैटर्न:</strong> 50 वस्तुनिष्ठ प्रश्न (MCQ)</div>
            <div>⭕ <strong>माध्यम:</strong> OMR शीट (गोला भरने वाली शीट)</div>
            <div>✅ <strong>नेगेटिव मार्किंग:</strong> बिल्कुल नहीं (No Negative)</div>
          </div>
        </div>
      </section>

      {/* 4. REGISTRATION FORM SECTION */}
      <section id="register-section" className="py-16 sm:py-24 bg-white relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-green-700 tracking-wider uppercase bg-green-100 px-3 py-1 rounded-full">
              Free Registration Form
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">
              STSE 2027 ऑनलाइन फॉर्म भरें
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              फॉर्म भरते ही तुरंत आधिकारिक <strong>Admit Card (PDF)</strong> डाउनलोड हो जाएगा!
            </p>
          </div>

          {/* Success State Card */}
          {successRegistration ? (
            <div className="bg-gradient-to-b from-emerald-50 to-white border-2 border-emerald-500 rounded-2xl p-6 sm:p-8 text-center shadow-xl animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-emerald-900 mb-1">
                बधाई हो! रजिस्ट्रेशन सफल रहा 🎉
              </h3>
              <p className="text-emerald-700 text-sm mb-6">
                आपका STSE 2027 परीक्षा के लिए रजिस्ट्रेशन हो चुका है।
              </p>

              <div className="bg-white border border-emerald-200 rounded-xl p-4 max-w-md mx-auto mb-6 text-left text-sm space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">रोल नंबर (Roll No):</span>
                  <span className="font-extrabold text-lg text-[#0f2a5c]">{successRegistration.roll_number}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">छात्र का नाम:</span>
                  <span className="font-bold text-slate-800">{successRegistration.student_name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">परीक्षा शिफ्ट:</span>
                  <span className="font-semibold text-slate-800">{successRegistration.shift_preference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">परीक्षा केंद्र:</span>
                  <span className="font-semibold text-slate-800">सनराइज क्लासेज, चंपानगर</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => generateAdmitCardPDF(successRegistration, config)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold rounded-xl shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  <span>एडमिट कार्ड दोबारा डाउनलोड करें (PDF)</span>
                </button>
                <button
                  onClick={() => {
                    setSuccessRegistration(null);
                    setFormData({
                      student_name: '',
                      father_name: '',
                      phone: '',
                      whatsapp: '',
                      school_name: LOCAL_SCHOOLS[0],
                      custom_school: '',
                      village_area: LOCAL_VILLAGES[0],
                      custom_village: '',
                      shift_preference: config.shifts?.[0] || 'Shift 1: 09:30 AM - 10:30 AM',
                      class_target: 'Class 10th (Matric 2027)',
                    });
                  }}
                  className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all text-sm"
                >
                  दूसरा फॉर्म भरें
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-10">
              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      छात्र / छात्रा का नाम (Student Name) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा: Rahul Kumar"
                      value={formData.student_name}
                      onChange={e => setFormData({ ...formData, student_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0f2a5c] focus:ring-2 focus:ring-[#0f2a5c]/20 outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      पिता का नाम (Father's Name) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा: Shri Rajesh Sharma"
                      value={formData.father_name}
                      onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0f2a5c] focus:ring-2 focus:ring-[#0f2a5c]/20 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      मोबाइल नंबर (Mobile / Calling) *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10 अंकों का मोबाइल नंबर"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0f2a5c] focus:ring-2 focus:ring-[#0f2a5c]/20 outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      WhatsApp नंबर (एडमिट कार्ड व रिजल्ट के लिए)
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="व्हाट्सएप नंबर (यदि अलग है)"
                      value={formData.whatsapp}
                      onChange={e => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0f2a5c] focus:ring-2 focus:ring-[#0f2a5c]/20 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                {/* School Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    वर्तमान स्कूल का नाम (School Name) *
                  </label>
                  <select
                    value={formData.school_name}
                    onChange={e => setFormData({ ...formData, school_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0f2a5c] focus:ring-2 focus:ring-[#0f2a5c]/20 outline-none text-sm font-medium bg-white"
                  >
                    {LOCAL_SCHOOLS.map((sch, i) => (
                      <option key={i} value={sch}>{sch}</option>
                    ))}
                  </select>
                  {formData.school_name === 'अन्य स्कूल (Other School)' && (
                    <input
                      type="text"
                      placeholder="अपने स्कूल का नाम लिखें"
                      value={formData.custom_school}
                      onChange={e => setFormData({ ...formData, custom_school: e.target.value })}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#0f2a5c] outline-none text-sm font-medium"
                    />
                  )}
                </div>

                {/* Village / Area */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    गांव / मोहल्ला (Village / Area within 8km) *
                  </label>
                  <select
                    value={formData.village_area}
                    onChange={e => setFormData({ ...formData, village_area: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0f2a5c] focus:ring-2 focus:ring-[#0f2a5c]/20 outline-none text-sm font-medium bg-white"
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
                      className="w-full mt-2 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#0f2a5c] outline-none text-sm font-medium"
                    />
                  )}
                </div>

                {/* Shift preference */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    पसंदीदा परीक्षा शिफ्ट (Shift Preference)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(config.shifts || ['Shift 1: 09:30 AM - 10:30 AM', 'Shift 2: 11:30 AM - 12:30 PM']).map((s, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          formData.shift_preference === s
                            ? 'border-[#0f2a5c] bg-[#0f2a5c]/5 font-bold text-[#0f2a5c]'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shift"
                          checked={formData.shift_preference === s}
                          onChange={() => setFormData({ ...formData, shift_preference: s })}
                          className="w-4 h-4 text-[#0f2a5c]"
                        />
                        <span className="text-sm">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#0f2a5c] to-[#1e4a8a] text-white font-extrabold text-base shadow-lg hover:from-[#153e75] hover:to-[#225aa5] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <span>रजिस्ट्रेशन हो रहा है...</span>
                  ) : (
                    <>
                      <span>फ्री रजिस्ट्रेशन करें व एडमिट कार्ड पाएं</span>
                      <ArrowRight className="w-5 h-5 text-[#f5a623]" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-500 mt-2">
                  🔒 आपकी जानकारी सुरक्षित है। रजिस्ट्रेशन बिल्कुल निःशुल्क है।
                </p>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* 5. DOWNLOAD ADMIT CARD LOOKUP SECTION */}
      <section id="admit-card-section" className="py-14 sm:py-16 bg-slate-100 border-t border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#0f2a5c]/10 text-[#0f2a5c] flex items-center justify-center mx-auto mb-3">
            <Download className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-[#0f2a5c] mb-2">
            पहले से रजिस्टर्ड हैं? एडमिट कार्ड डाउनलोड करें
          </h3>
          <p className="text-slate-600 text-sm mb-6">
            अपना रोल नंबर या 10-अंकों का मोबाइल नंबर दर्ज करके कभी भी एडमिट कार्ड PDF डाउनलोड करें।
          </p>

          <form onSubmit={handleSearchLookup} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="रोल नंबर या मोबाइल नंबर"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-grow px-4 py-3 rounded-xl border border-slate-300 focus:border-[#0f2a5c] outline-none text-sm font-medium"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="px-6 py-3 bg-[#0f2a5c] text-white font-bold rounded-xl hover:bg-[#153e75] transition-all text-sm shrink-0 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>{searchLoading ? 'खोज रहे हैं...' : 'खोजें'}</span>
            </button>
          </form>

          {searchError && (
            <p className="text-red-600 text-xs mt-3">{searchError}</p>
          )}

          {searchResult && (
            <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 text-left max-w-md mx-auto shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[#0f2a5c] text-base">{searchResult.student_name}</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {searchResult.roll_number}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-1 mb-4">
                <div>पिता का नाम: {searchResult.father_name}</div>
                <div>स्कूल: {searchResult.school_name}</div>
                <div>शिफ्ट: {searchResult.shift_preference}</div>
              </div>
              <button
                onClick={() => generateAdmitCardPDF(searchResult, config)}
                className="w-full py-2.5 bg-gradient-to-r from-[#f5a623] to-[#d48806] text-[#0f2a5c] font-bold rounded-lg text-sm flex items-center justify-center gap-2 shadow"
              >
                <Download className="w-4 h-4" />
                <span>एडमिट कार्ड PDF डाउनलोड करें</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 6. PARENTS ORIENTATION & WHY SUNRISE */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-[#0f2a5c] to-[#153e75] rounded-3xl p-8 sm:p-12 text-white shadow-xl">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f5a623] bg-[#f5a623]/20 px-3 py-1 rounded-full">
                अभिभावकों के लिए विशेष (For Parents)
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold mt-3 leading-snug">
                परीक्षा के दौरान: 15-मिनट का निःशुल्क करियर व बोर्ड गाइडेंस सेमिनार
              </h2>
              <p className="text-slate-200 text-sm sm:text-base mt-3 leading-relaxed">
                जब आपके बच्चे परीक्षा कक्ष में टेस्ट दे रहे होंगे, उस समय कोचिंग सभागार में अभिभावकों के लिए विशेष सत्र आयोजित होगा:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="flex items-start gap-3 bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <ShieldCheck className="w-5 h-5 text-[#f5a623] shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <strong>450+ अंक की रणनीति:</strong> बिहार बोर्ड मैट्रिक में स्टेट व जिला टॉप कैसे करें।
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/10 p-3.5 rounded-xl border border-white/10">
                  <Users className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <strong>डिजिटल अटेंडेंस व वीकली टेस्ट:</strong> सनराइज में हर छात्र की निगरानी कैसे होती है।
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4 text-xs sm:text-sm text-slate-300">
                <Phone className="w-5 h-5 text-[#f5a623]" />
                <span>किसी भी प्रश्न या पूछताछ के लिए कॉल करें: <strong>+91 9973152070</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
