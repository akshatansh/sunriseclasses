import { useState } from 'react';
import { Star, Trophy, Medal, ChevronUp, ChevronDown, Quote, Sparkles, ArrowRight, BadgeCheck } from 'lucide-react';

const successStories = [
  // 2026
  {
    name: 'Swati Kumari',
    class: 'Class 10',
    score: '456/500',
    year: '2026',
    photo: '/gallery/Untitled design (21).jpg',
    story: 'Sir, aapki coaching mein padhkar humein bahut achha laga. Aapka padhane ka tareeka bahut hi alag aur achha hai. Aap har topic ko itni aasani se samjhate hain ki padhai interesting lagti hai.\n\nAapne humein sirf padhai hi nahi, discipline aur sabka respect karna bhi sikhaya hai. Aap har student ko motivate karte hain aur hamesha support karte hain.\n\nSir, aap jaise teacher milna hamare liye bahut khushi ki baat hai. Dil se thank you Sir.✨',
  },
  {
    name: 'Nitish Kumar',
    class: 'Class 10',
    score: '417/500',
    year: '2026',
    photo: '/gallery/Untitled design (22).jpg',
    story: 'Main Nitish Kumar, kaksha 10vi mein Bihar Board se 417 ank prapt kiya. Ismein sabse bada yogdan Champanagar ke Sunrise Classes & Academy ka raha hai, jahan humein S.P. Jha Sir padhate hain.\n\nYahan har subject ko achhe se samjhaya jaata hai aur sabhi doubts clear karaye jaate hain. Sabhi chapters samay par complete hote hain.\n\nSaath hi humein weekly test ka bhi fayda milta hai.',
  },
  {
    name: 'Anshu Kumar',
    class: 'Class 10',
    score: '369/500',
    year: '2026',
    photo: '/gallery/Untitled design (23).jpg',
    story: 'Main Anshu Kumar. Maine 9th aur 10th ki padhai Sunrise Classes & Academy se ki hai.\n\nYeh coaching shiksha, anushasan aur safalta ka bahut achha sangam hai. Mujhe 9th aur 10th mein yahan se bahut help mili aur mera experience bahut achha raha.\n\nYahan har hafte exam hota hai, jisse humein apni progress ka pata chalta rehta hai. S.P. Jha Sir bahut experienced teacher hain aur padhane ke saath motivate bhi karte hain.\n\nMaine bhi yahan se padhkar 73.8% marks prapt kiya hai.',
  },
  {
    name: 'Anshuman Shree',
    class: 'Class 10',
    score: '367/500',
    year: '2026',
    photo: '/gallery/Untitled design (24).jpg',
    story: 'Main Anshuman Shree. Maine apne 10th ki padhai Sunrise Classes & Academy se poori ki hai.\n\nYeh Bihar Board ke 10th students ke liye bahut achha platform hai. Mera yahan ka experience bahut achha raha hai. Yahan ke teachers sirf padhate nahi, balki mentor ki tarah guide bhi karte hain.\n\nYahan ka mahol motivating hai aur har hafte test hone se progress ka pata chalta rehta hai. S.P. Jha Sir experienced teacher hain, jo samjhane aur motivate karne mein bahut madad karte hain.\n\nMaine bhi yahan se padhkar 73.4% marks prapt kiya hai.',
  },
  // 2025
  {
    name: 'Lakshi Raj',
    class: 'Class 10',
    score: '432/500',
    year: '2025',
    photo: '/gallery/Untitled design (28).jpg',
    story: 'Mera naam Lakshi Raj hai aur maine apni 10th ki padhai Sunrise Coaching Centre se ki thi. Jisse mujhe board exam mein 432 marks mile.\n\nHamare guru S.P. Sir Champanagar ke best teachers mein se ek hain. Sir bachchon ko shiksha ke saath sanskar bhi sikhate hain. Unhone humein padhai ke saath life mein mehnat, vinamrata aur dusron ki madad karna bhi sikhaya hai.\n\nSir hamesha motivate karte hain ki asafalta se ghabrana nahi chahiye, khud par vishwas rakhkar hard work karna chahiye. S.P. Sir mere liye inspiration hain.',
  },
  {
    name: 'Shabnam Kumari',
    class: 'Class 10',
    score: '429/500',
    year: '2025',
    photo: '/gallery/Untitled design (29).jpg',
    story: 'Pranaam sir 🙏Mera naam Shabnam Kumari hai. Maine 10th Board mein 429 ank prapt kiye. Ye sab aapki wajah se hi ho paya, kyunki aapne hume 0 se nahi balki minus (-) se padhaya jiski wajah se main itna achha marks la paayi. Coaching ka environment bahut hi achha aur disciplined hai jahan padhai ke liye positive mahaul milta hai. Aap har student par personal dhyaan dete hain aur mushkil topics ko bhi bahut easily samjha dete hain. Jo student aapki classes regular attend kare aur aapki baaton ko follow kare wo board mein zarur achha karega. Thank you so much sir 😊🙏❤️ hamare liye itne efforts lagane ke liye.',
  },
  {
    name: 'Diya Kumari',
    class: 'Class 10',
    score: '418/500',
    year: '2025',
    photo: '/gallery/Untitled design (30).jpg',
    story: 'Sunrise Coaching Centre keval ek coaching sansthan nahi, balki ek aisa prerna sthal hai jahan har student ke sapno ko samajhkar unhe saakar karne ki disha mein lagataar kaam kiya jata hai.\n\nYahan shiksha ke saath-saath discipline, self-confidence aur mehnat ka mahatva bhi sikhaya jata hai, taaki har student na sirf padhai mein achha kare, balki life ke har field mein success paa sake.\n\nIs sansthan ka uddeshya sirf achhe marks dilana nahi, balki ek strong, aware aur successful personality banana hai, jisse har student apne bright future ki taraf confidence ke saath badh sake.\n\nThank you Sir 🙏',
  },
  {
    name: 'Laxmi Kumari',
    class: 'Class 10',
    score: '408/500',
    year: '2025',
    photo: '/gallery/Untitled design (27).jpg',
    story: 'Pranam Sir,\n\nMera naam Laxmi Kumari hai. Maine class 10th mein 81.6% (408 marks) score kiya hai. Is safalta ka bada shrey aapko jata hai Sir.\n\nAap bahut achha padhate hain aur har topic ko aasaan tareeke se samjhate hain. Aapka padhane ka style clear aur interesting hai.\n\nAap hamesha students ko motivate karte hain aur coaching ka environment bhi positive aur disciplined hai. Aapki wajah se mujhme confidence aaya aur main apna best de payi.\n\nDil se dhanyavaad Sir.',
  },
  // 2024
  {
    name: 'Priya Rani',
    class: 'Class 10',
    score: '412/500',
    year: '2024',
    photo: '/gallery/Untitled design (17) copy.jpg',
    story: 'Mera naam Priya hai aur maine 10th me 412 marks prapt kiye hain. Main Sunrise Classes and Academic ki student hoon. Yahan discipline ko bahut achhe se follow kiya jata hai. Sir bahut achhe se padhate hain aur sabhi students par barabar dhyan dete hain. Coaching me regular tests aur year-wise question bank ka practice karwaya jata hai. Yahan sabhi subjects achhe se padhaye jate hain, jisse result bahut achha aata hai.',
  },
  {
    name: 'Anju Kumari',
    class: 'Class 10',
    score: '390/500',
    year: '2024',
    photo: '/gallery/Untitled design (26).jpg',
    story: 'Mera naam Anju hai aur maine apni 10th ki padhai Sunrise Classes and Academy se ki hu. Ye coaching centre padhai ke liye bahot achha h. Yha ka mahol anushasit or padhai ke liye bahot achha h. Sir ne mujhe padhai ko aasani se samajhne me madad kiye. Unke padhane ka tarika Saral or prabhavi h. Jisse meri padhai me kafi sudhar hua or main achhe number se pass hui. Thankyou sir.',
  },
  {
    name: 'Coming Soon',
    class: '',
    score: '',
    year: '2024',
    photo: '',
    story: 'Coming Soon',
    comingSoon: true,
  },
  {
    name: 'Coming Soon',
    class: '',
    score: '',
    year: '2024',
    photo: '',
    story: 'Coming Soon',
    comingSoon: true,
  },
  // 2023
  {
    name: 'Mithi Kumari',
    class: 'Class 10',
    score: '431/500',
    year: '2023',
    photo: '/gallery/Untitled design (17).jpg',
    story: 'Main Mithi Kumari..... Hamari coaching Sunrise Classes & Academy sirf padhne ka nahi, balki students ke future ko mazboot banane ka sthaan hai..... Humne apni coaching se bahut saari cheezein seekhi hain, jo hamare future ke liye bahut zaroori hai..... Top result yun hi nahi aate, iske peeche hamari coaching ka sahi guidance aur lagataar mehnat chhupi hoti hai. Dil se dhanyavaad Sir aapko humein itna kuch sikhane ke liye....✨❤️',
  },
  {
    name: 'Ayush Kumar',
    class: 'Class 10',
    score: '408/500',
    year: '2023',
    photo: '/gallery/Untitled design (20).jpg',
    story: 'Main Ayush.... Sunrise Coaching Classes mein padhai ratkar nahi, samajhkar karai jaati hai. Yahan har subject ko aasan tareeke se samjhaya jaata hai, jisse padhai mein ruchi bani rehti hai. Har concept achhe se clear hua, isliye question solve karna aasan ho gaya. Yeh coaching students ko sahi disha aur mazboot aadhar deti hai. Isi sahi margdarshan aur mehnat se maine achhe ank prapt kiye.',
  },
  {
    name: 'Raunak Kumari',
    class: 'Class 10',
    score: '400/500',
    year: '2023',
    photo: '/gallery/Untitled design (19).jpg',
    story: 'Ye Sir aur unke institute ke liye mere dil se bahut respect hai. Sir sirf padhate hi nahi, balki har topic ko itni achhi tarah samjhate hain ki concepts easily clear ho jaate hain. Jab bhi koi problem aati hai, chahe padhai se related ho ya kisi aur cheez se, sir hamesha patiently uska solution dete hain. Unka support aur guidance students ke liye bahut valuable hai. Institute ka environment bhi bahut positive aur motivating hai, jahan padhai karne ka mann khud hi karta hai. Sach me, aise teacher aur aisa institute milna bahut lucky baat hai... thank you so much sir for everything🙏',
  },
  {
    name: 'Muskan Kumari',
    class: 'Class 10',
    score: '393/500',
    year: '2023',
    photo: '/gallery/Untitled design (18).jpg',
    story: 'Mai Muskan Kumari.... Mere coaching Sansthan Sunrise Classes and Academy mein sirf acche bacchon per nahin balki sabhi kamjor bacchon per bhi Dhyan Diya jata hai sabhi ko ek najar se dekha jata hai padhaane ka tarika har kamjor bacchon ke liye sahi hai unka concept itna easy hota hai ki koi bhi aasani se samajh le. Hamare Sir Surya Prakash Jha jo hamesha kamjor bacchon ke support mein rahte hain, unhen inspired karte hain ki taki vah achche se padhai kar saken aur vah jyada se jyada kamjor bacchon par dhyan dete hain taki unka bhavishya ujjwal ho. Wo hame students ke tarah hamen treat karke ek friend ke tarah treat kiya jata hai.',
  },
  // 2022
  {
    name: 'Sania',
    class: 'Class 10',
    score: '452/500',
    year: '2022',
    photo: '/gallery/Untitled design (31).jpg',
    story: 'Hello, main Sania hoon. Maine 10th class mein S.P. Sir se tuition li thi aur apna experience share karna chahti hoon.\n\nExam se sirf 3 mahine pehle maine coaching join ki thi, aur itne kam samay mein hi Sir ne mujhe bahut achhi guidance di. Unhone syllabus ko chhote parts mein samjhaya, pehle concept clear kiya, fir practice aur daily tests se meri preparation strong ho gayi.\n\nMere weak topics bhi strong ho gaye aur mujhme confidence aa gaya. Result mein main achhe marks se pass hui aur mere parents bhi proud feel karte hain.\n\nMain Sir ki dil se shukraguzar hoon.',
  },
  {
    name: 'Sakshi Kumari',
    class: 'Class 10',
    score: '439/500',
    year: '2022',
    photo: '/gallery/Untitled design (32).jpg',
    story: 'Sir aapki teaching style itni clear hai ki tough topic bhi easy lagne lagta hai.\n\nSir aap sirf padhate nhi, balki istrah se samjhate hain ki koi doubt hi nahi bachta hai. Yeh aapki sabse badi quality hai.\n\nSir aapka dedication aur patience ham students ke liye inspiration hai.\n\nSir aapki coaching padhai ke liye ak perfect environment deti hai. Sath hi sath yahan concept clarity or sabse jyda focus hota hai, yahan ka discipline aur guidance success ke liye best hai.',
  },
  {
    name: 'Coming Soon',
    class: '',
    score: '',
    year: '2022',
    photo: '',
    story: 'Coming Soon',
    comingSoon: true,
  },
  {
    name: 'Coming Soon',
    class: '',
    score: '',
    year: '2022',
    photo: '',
    story: 'Coming Soon',
    comingSoon: true,
  },
];

export default function SuccessStories() {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  const getOptimizedPhoto = (photo: string) => {
    if (!photo.startsWith('/gallery/')) {
      return photo;
    }

    return photo.replace('/gallery/', '/gallery/optimized/');
  };

  const toggleReview = (id: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedReviews(newExpanded);
  };

  // Group stories by year in descending order
  const groupedByYear = successStories.reduce((acc: { [key: string]: typeof successStories }, story) => {
    if (!acc[story.year]) {
      acc[story.year] = [];
    }
    acc[story.year].push(story);
    return acc;
  }, {});

  const sortedYears = Object.keys(groupedByYear).sort((a, b) => parseInt(b) - parseInt(a));

  // Get medal colors and ranks
  const getMedalColor = (rank: number) => {
    if (rank === 0) return { bg: 'from-yellow-400 to-yellow-500', text: 'text-yellow-600', label: '1st' };
    if (rank === 1) return { bg: 'from-gray-300 to-gray-400', text: 'text-gray-700', label: '2nd' };
    if (rank === 2) return { bg: 'from-orange-300 to-orange-400', text: 'text-orange-700', label: '3rd' };
    return { bg: 'from-blue-100 to-blue-200', text: 'text-blue-700', label: `${rank + 1}th` };
  };

  const totalStudents = successStories.length;
  const numericScores = successStories
    .map((story) => parseInt(story.score, 10))
    .filter((score) => !Number.isNaN(score));
  const totalScoredStudents = numericScores.length;
  const maxScore = totalScoredStudents > 0 ? Math.max(...numericScores) : 0;
  const maxScorePercentage = totalScoredStudents > 0 ? ((maxScore / 500) * 100).toFixed(0) : '0';
  const studentsWith95Plus = successStories.filter((s) => {
    const score = parseInt(s.score, 10);
    return !Number.isNaN(score) && score >= 475;
  }).length;
  const studentsWith90Plus = successStories.filter((s) => {
    const score = parseInt(s.score, 10);
    return !Number.isNaN(score) && score >= 450;
  }).length;
  const avgMarks = totalScoredStudents > 0 ? (numericScores.reduce((sum, score) => sum + score, 0) / totalScoredStudents).toFixed(0) : '0';
  const spotlightStudents = successStories
    .slice()
    .filter((story) => !Number.isNaN(parseInt(story.score, 10)))
    .sort((a, b) => parseInt(b.score, 10) - parseInt(a.score, 10))
    .slice(0, 3);
  const heroStats = [
    { label: 'Top Score', value: `${maxScore}/500`, hint: `${maxScorePercentage}% highest result`, accent: 'from-amber-400 via-orange-400 to-yellow-300' },
    { label: '90%+ Achievers', value: `${studentsWith90Plus}`, hint: 'Strong board performance', accent: 'from-sky-400 via-cyan-400 to-blue-400' },
    { label: 'Years Featured', value: `${sortedYears.length}`, hint: 'Consistent results archive', accent: 'from-emerald-400 via-teal-400 to-green-400' },
  ];

  return (
    <section id="success" className="relative overflow-hidden py-20 bg-[radial-gradient(circle_at_top,_rgba(245,166,35,0.18),_transparent_24%),radial-gradient(circle_at_85%_10%,_rgba(15,42,92,0.16),_transparent_22%),linear-gradient(180deg,_#fffdf8_0%,_#eef5ff_48%,_#ffffff_100%)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#f5a623]/20 blur-3xl" />
        <div className="absolute top-32 right-0 h-52 w-52 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-16 left-0 h-48 w-48 rounded-full bg-[#0f2a5c]/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="relative mb-16 rounded-[2rem] border border-white/60 bg-white/70 px-5 py-8 shadow-[0_24px_80px_rgba(15,42,92,0.12)] backdrop-blur sm:px-8 lg:px-10 lg:py-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f5a623]/30 bg-[#fff6df] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#0f2a5c]">
                <Sparkles size={14} className="text-[#f5a623]" />
                Student Achievements
              </div>
              <div className="flex justify-center lg:justify-start mb-4">
                <img
                  src="/sunrise-logo.png"
                  alt=""
                  className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-md"
                />
              </div>
              <h2 className="max-w-3xl text-3xl font-extrabold leading-tight text-[#0f2a5c] sm:text-4xl lg:text-5xl">
                Real Results, Real Reviews, Real Momentum for Students
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Every success story on this page represents disciplined practice, concept clarity,
                weekly testing, and the kind of personal mentoring that helps students in Champanagar,
                Purnia move from doubt to confidence.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <div className="rounded-full bg-[#0f2a5c] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0f2a5c]/20">
                  {totalStudents}+ student stories
                </div>
                <div className="rounded-full border border-[#0f2a5c]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0f2a5c]">
                  Bihar Board focus
                </div>
                <div className="rounded-full border border-[#f5a623]/20 bg-[#fff8eb] px-4 py-2 text-sm font-semibold text-[#9a5b00]">
                  Champanagar, Purnia
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-4 shadow-lg shadow-slate-200/60 backdrop-blur"
                >
                  <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${stat.accent}`} />
                  <p className="pl-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{stat.label}</p>
                  <div className="mt-2 pl-4">
                    <p className="text-2xl font-black text-[#0f2a5c] sm:text-3xl">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{stat.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-14 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-[#d8e4ff] bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,42,92,0.08)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f2a5c] text-white shadow-lg shadow-[#0f2a5c]/20">
                <Quote size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why This Page Matters</p>
                <h3 className="text-xl font-bold text-[#0f2a5c]">Proof that the teaching system works</h3>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              These student success stories reflect why many families consider Sunrise Classes & Academy
              one of the trusted coaching institutes in Champanagar, Purnia for Bihar Board and school exam preparation.
              From high scorers to students who improved step by step, this page highlights the impact of
              regular tests, personal attention, concept clarity, and disciplined offline coaching.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#ffe1a6] bg-[linear-gradient(135deg,_rgba(255,246,223,0.95),_rgba(255,255,255,0.96))] p-6 shadow-[0_18px_60px_rgba(245,166,35,0.16)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a5b00]">Spotlight Toppers</p>
            <div className="mt-4 space-y-3">
              {spotlightStudents.map((student, index) => (
                <div key={`${student.name}-${student.year}`} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f2a5c] text-sm font-black text-white">
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#0f2a5c]">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.year} • {student.class}</p>
                  </div>
                  <div className="rounded-full bg-[#fff3d3] px-3 py-1 text-sm font-bold text-[#9a5b00]">
                    {student.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Success Metrics - Featured Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-16">
          <div className="rounded-3xl border border-yellow-200/80 bg-white/85 p-4 shadow-lg shadow-yellow-100/60 backdrop-blur sm:p-6 min-h-[140px] sm:min-h-[168px]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-yellow-700 font-semibold mb-1">Highest Score</p>
                  <p className="text-2xl sm:text-3xl font-black text-yellow-700">{maxScorePercentage}%</p>
                </div>
                <Trophy size={32} className="text-yellow-600 opacity-30 sm:h-10 sm:w-10 shrink-0" />
              </div>
              <div>
                <p className="text-xs text-yellow-600 mt-3">{maxScore}/500 marks</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200/80 bg-white/85 p-4 shadow-lg shadow-blue-100/60 backdrop-blur sm:p-6 min-h-[140px] sm:min-h-[168px]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-blue-700 font-semibold mb-1">Students Scored</p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-700">90%+</p>
                </div>
                <Star size={32} className="text-blue-600 opacity-30 sm:h-10 sm:w-10 shrink-0" />
              </div>
              <div>
                <p className="text-xs text-blue-600 mt-3">{studentsWith90Plus} top performers</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200/80 bg-white/85 p-4 shadow-lg shadow-orange-100/60 backdrop-blur sm:p-6 min-h-[140px] sm:min-h-[168px]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-orange-700 font-semibold mb-1">Average Score</p>
                  <p className="text-2xl sm:text-3xl font-black text-orange-700">{avgMarks}</p>
                </div>
                <Medal size={32} className="text-orange-600 opacity-30 sm:h-10 sm:w-10 shrink-0" />
              </div>
              <div>
                <p className="text-xs text-orange-600 mt-3">All Students</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-green-200/80 bg-white/85 p-4 shadow-lg shadow-green-100/60 backdrop-blur sm:p-6 min-h-[140px] sm:min-h-[168px]">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm text-green-700 font-semibold mb-1">Result Coverage</p>
                  <p className="text-2xl sm:text-3xl font-black text-green-700">{sortedYears.length} Yrs</p>
                </div>
                <Star size={32} className="text-green-600 opacity-30 fill-current sm:h-10 sm:w-10 shrink-0" />
              </div>
              <div>
                <p className="text-xs text-green-600 mt-3">Consistent year-wise results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Highlights Banner */}
        <div className="relative mb-16 overflow-hidden rounded-[2rem] border border-[#f5a623]/25 bg-[linear-gradient(120deg,_#0f2a5c_0%,_#173873_52%,_#0b2149_100%)] p-5 shadow-[0_24px_80px_rgba(15,42,92,0.22)] sm:p-8">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_center,_rgba(245,166,35,0.22),_transparent_60%)]" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center text-white">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#f5a623] mb-2">{sortedYears.length}</p>
              <p className="text-xs sm:text-sm opacity-90">Years of Excellence</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#f5a623] mb-2">{totalStudents}+</p>
              <p className="text-xs sm:text-sm opacity-90">Success Stories</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#f5a623] mb-2">{maxScorePercentage}%</p>
              <p className="text-xs sm:text-sm opacity-90">Max Score</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-[#f5a623] mb-2">{studentsWith90Plus}</p>
              <p className="text-xs sm:text-sm opacity-90">Students Above 90%</p>
            </div>
          </div>
        </div>

        {/* Year-wise Success Stories */}
        {sortedYears.map((year) => {
          const yearStudents = groupedByYear[year];
          const yearScores = yearStudents
            .map((student) => parseInt(student.score, 10))
            .filter((score) => !Number.isNaN(score));
          const yearStarCount = yearScores.filter((score) => score >= 450).length;
          const yearHighestMark = yearScores.length > 0 ? Math.max(...yearScores) : 0;
          const yearAvgScore = yearScores.length > 0 ? Math.round(yearScores.reduce((sum, score) => sum + score, 0) / yearScores.length) : 0;

          return (
            <div key={year} className="mb-20">
              {/* Year Header with Badge */}
              <div className="mb-10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                        <Sparkles size={12} className="text-[#f5a623]" />
                        Results Archive
                      </div>
                      <h3 className="text-3xl sm:text-4xl font-bold text-[#0f2a5c] mb-2">Year {year}</h3>
                      <div className="h-1 w-16 bg-[#f5a623] rounded-full" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[...Array(yearStarCount)].map((_, i) => (
                        <Star key={i} size={24} className="fill-[#f5a623] text-[#f5a623]" />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:flex">
                    <div className="rounded-2xl border border-[#0f2a5c]/10 bg-white/90 px-4 py-3 shadow-md">
                      <p className="text-xs font-semibold text-slate-500">Total Toppers</p>
                      <p className="text-2xl font-black text-[#0f2a5c]">{yearStudents.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[#f5a623]/20 bg-[#fff7e6] px-4 py-3 shadow-md">
                      <p className="text-xs font-semibold text-[#9a5b00]">Highest Mark</p>
                      <p className="text-2xl font-black text-[#9a5b00]">{yearHighestMark}/500</p>
                    </div>
                    <div className="col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-md lg:col-span-1">
                      <p className="text-xs font-semibold text-emerald-700">Avg Score</p>
                      <p className="text-2xl font-black text-emerald-700">{yearAvgScore}/500</p>
                      <p className="mt-1 text-[10px] font-medium text-emerald-600">Overall Student</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toppers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {yearStudents.map((student, rank) => {
                  const medal = getMedalColor(rank);
                  const isTopRank = rank < 3;

                  return (
                    <div key={rank} className="group h-full">
                      <div className={`relative h-full overflow-hidden rounded-[1.75rem] border transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgba(15,42,92,0.16)] ${isTopRank ? 'border-[#f5a623]/40 bg-[linear-gradient(180deg,_rgba(255,248,231,0.88),_rgba(255,255,255,0.98))] shadow-[0_16px_40px_rgba(245,166,35,0.14)]' : 'border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/60'}`}>
                        <div className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-r from-transparent via-[#f5a623] to-transparent opacity-70" />
                        {/* Rank Badge */}
                        {rank < 4 && !student.comingSoon && (
                          <div className={`absolute top-0 right-0 z-20 flex h-20 w-20 items-center justify-center rounded-bl-3xl bg-gradient-to-br ${medal.bg} shadow-lg sm:h-24 sm:w-24`}>
                            <div className="text-center">
                              {rank < 3 && <Medal size={24} className={`${medal.text} mx-auto mb-1 fill-current`} />}
                              <p className={`${medal.text} font-black text-sm sm:text-base`}>{medal.label}</p>
                              <p className={`${medal.text} font-bold text-xs`}>Rank</p>
                            </div>
                          </div>
                        )}

                        {/* Photo */}
                        <div className="relative h-[24rem] overflow-hidden bg-white md:h-[18rem] xl:h-[18rem] flex items-center justify-center">
                          {student.comingSoon ? (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-center text-xl font-bold uppercase tracking-[0.12em] text-slate-500">
                              Coming Soon
                            </div>
                          ) : (
                            <img
                              src={getOptimizedPhoto(student.photo)}
                              alt={student.name}
                              loading="lazy"
                              decoding="async"
                              fetchPriority="low"
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
                              onError={(e) => {
                                if (e.currentTarget.src.includes('/gallery/optimized/')) {
                                  e.currentTarget.src = student.photo;
                                  return;
                                }

                                e.currentTarget.src = '/sunrise-logo.png';
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#06162f] via-[#06162f]/40 to-transparent" />
                          <div className="absolute left-4 top-4 z-10 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
                            {student.year}
                          </div>
                          {/* Score Overlay */}
                          {student.score && (
                            <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 pt-10">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Board Score</p>
                              <p className="text-white text-4xl font-black">{student.score}</p>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-5">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="line-clamp-2 text-lg font-bold text-[#0f2a5c]">{student.name}</h4>
                              <p className="mt-1 text-sm font-semibold text-[#f5a623]">{student.class}</p>
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Review
                            </div>
                          </div>

                          {/* Feedback */}
                          <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(239,246,255,0.9))] p-4">
                            <div className="mb-3 flex items-center gap-2 text-[#0f2a5c]">
                              <Quote size={16} className="text-[#f5a623]" />
                              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Student Words</span>
                            </div>
                            {/* Desktop - Show Full Story */}
                            <p className="hidden text-xs italic leading-relaxed text-gray-700 lg:block">
                              "{student.comingSoon ? 'Coming Soon' : student.story}"
                            </p>
                            
                            {/* Mobile/Tablet - Show Truncated with Read More */}
                            <p className="text-xs italic leading-relaxed text-gray-700 lg:hidden">
                              "{student.comingSoon ? 'Coming Soon' : (student.story.length > 150 && !expandedReviews.has(`${student.name}-${student.year}`) ? 
                                `${student.story.substring(0, 150)}...` : 
                                student.story)}"
                            </p>
                            {student.story.length > 150 && !student.comingSoon && (
                              <button
                                onClick={() => toggleReview(`${student.name}-${student.year}`)}
                                className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#fff4da] px-3 py-1 text-xs font-semibold text-[#9a5b00] transition-colors hover:bg-[#ffe8b0] lg:hidden"
                              >
                                {expandedReviews.has(`${student.name}-${student.year}`) ? (
                                  <>
                                    Read Less <ChevronUp size={12} />
                                  </>
                                ) : (
                                  <>
                                    Read More <ChevronDown size={12} />
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Star Rating */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  className="fill-[#f5a623] text-[#f5a623]"
                                />
                              ))}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Trusted
                              </span>
                              <BadgeCheck size={16} className="mt-1 text-emerald-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Success Testimonial Footer */}
        <div className="mt-20 pt-12 border-t border-slate-200/80">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#f5a623]/20 bg-[linear-gradient(135deg,_rgba(245,166,35,0.12),_rgba(15,42,92,0.08),_rgba(255,255,255,0.96))] p-8 text-center shadow-[0_24px_80px_rgba(15,42,92,0.12)] sm:p-10">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#f5a623]/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" />
            <Trophy size={48} className="text-[#f5a623] mx-auto mb-4 relative" />
            <h3 className="relative mb-4 text-2xl font-bold text-[#0f2a5c] sm:text-3xl">Join Our Success Story</h3>
            <p className="relative mx-auto mb-6 max-w-2xl text-gray-700">
              Our Class 9 and Class 10 coaching in Champanagar, Purnia is built around concept clarity, regular
              testing, and personal guidance. Across the student stories shown here, the average score
              is <span className="font-bold text-[#f5a623]">{avgMarks}/500</span>, the top recorded score is
              <span className="font-bold text-[#f5a623]"> {maxScore}/500</span>, and
              <span className="font-bold text-[#f5a623]"> {studentsWith95Plus} students</span> have scored 95% or above.
              If you want a disciplined coaching institute in Champanagar, Purnia for Bihar Board preparation,
              Sunrise Classes & Academy is ready to support your journey.
            </p>
            <div className="relative flex flex-wrap justify-center gap-4">
              <button className="inline-flex items-center gap-2 rounded-full bg-[#0f2a5c] px-8 py-3 font-bold text-white shadow-lg shadow-[#0f2a5c]/20 transition-all hover:-translate-y-0.5 hover:bg-[#173873]">
                Enroll Now
                <ArrowRight size={16} />
              </button>
              <button className="rounded-full border-2 border-[#0f2a5c] px-8 py-3 font-bold text-[#0f2a5c] transition-all hover:-translate-y-0.5 hover:bg-[#0f2a5c] hover:text-white">
                Get in Touch
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
