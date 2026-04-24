import { useState } from 'react';
import { Star, Trophy, Medal, ChevronUp, ChevronDown } from 'lucide-react';

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
    name: 'Neha Patel',
    class: 'Class 10',
    score: '485/500',
    year: '2025',
    photo: '/gallery/20260415_174519.jpg',
    story: 'The structured approach and regular mock tests made all the difference. I improved from 78% to 97% in just 2 years.',
  },
  {
    name: 'Vikram Singh',
    class: 'Class 10',
    score: '480/500',
    year: '2025',
    photo: '/gallery/20260415_174533.jpg',
    story: 'S.P. Sir\'s personalized approach helped me overcome my fear of mathematics. Scored 96% in board exams!',
  },
  {
    name: 'Shreya Das',
    class: 'Class 10',
    score: '475/500',
    year: '2025',
    photo: '/gallery/20260415_174652.jpg',
    story: 'The combination of online and offline classes was perfect for me. Always stayed motivated and consistent.',
  },
  {
    name: 'Aditya Gupta',
    class: 'Class 9',
    score: '470/500',
    year: '2025',
    photo: '/gallery/20260415_174654.jpg',
    story: 'Great coaching with excellent study materials. Highly recommend Sunrise Classes!',
  },
  // 2024
  {
    name: 'Divya Joshi',
    class: 'Class 10',
    score: '480/500',
    year: '2024',
    photo: '/gallery/20260415_174519.jpg',
    story: 'The daily YouTube revision videos were a game-changer. Never felt lost in any topic.',
  },
  {
    name: 'Sanjay Reddy',
    class: 'Class 10',
    score: '475/500',
    year: '2024',
    photo: '/gallery/20260415_174533.jpg',
    story: 'Excellent doubt clearing sessions and comprehensive notes. Best coaching center!',
  },
  {
    name: 'Kavya Menon',
    class: 'Class 10',
    score: '470/500',
    year: '2024',
    photo: '/gallery/20260415_174652.jpg',
    story: 'From struggling student to confident learner. Thank you Sunrise Classes!',
  },
  {
    name: 'Rohan Mishra',
    class: 'Class 9',
    score: '465/500',
    year: '2024',
    photo: '/gallery/20260415_174654.jpg',
    story: 'Best decision to join this coaching. Results speak for themselves!',
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
    name: 'Riya Chakraborty',
    class: 'Class 10',
    score: '470/500',
    year: '2022',
    photo: '/gallery/20260415_174519.jpg',
    story: 'Sunrise Classes provided exactly what I needed to excel in my board exams.',
  },
  {
    name: 'Nikhil Sharma',
    class: 'Class 10',
    score: '465/500',
    year: '2022',
    photo: '/gallery/20260415_174533.jpg',
    story: 'Outstanding teaching and incredible support from the entire team!',
  },
  {
    name: 'Ananya Gupta',
    class: 'Class 10',
    score: '460/500',
    year: '2022',
    photo: '/gallery/20260415_174652.jpg',
    story: 'Thank you for making my board exam journey smooth and successful.',
  },
  {
    name: 'Akash Sharma',
    class: 'Class 9',
    score: '455/500',
    year: '2022',
    photo: '/gallery/20260415_174654.jpg',
    story: 'Best coaching center in the city. Highly recommended for all students!',
  },
];

export default function SuccessStories() {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

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
  const studentsWith95Plus = successStories.filter(s => parseInt(s.score) >= 95).length;
  const studentsWith90Plus = successStories.filter(s => parseInt(s.score) >= 90).length;
  const avgScore = (successStories.reduce((sum, s) => sum + parseInt(s.score), 0) / totalStudents).toFixed(1);

  return (
    <section id="success" className="py-20 bg-gradient-to-b from-white via-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <img
              src="/sunrise-logo.png"
              alt=""
              className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-md"
            />
          </div>
          <span className="text-[#f5a623] text-sm font-semibold uppercase tracking-widest">Student Achievements</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a5c] mt-2">Success Stories from Our Students</h2>
          <div className="w-16 h-1 bg-[#f5a623] mx-auto mt-4 rounded-full" />
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-sm">
            Join hundreds of successful students who transformed their academic performance through our dedicated coaching and personalized guidance.
          </p>
        </div>

        {/* Overall Success Metrics - Featured Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border-2 border-yellow-300 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-semibold mb-1">Students Scored</p>
                <p className="text-3xl font-black text-yellow-700">95%+</p>
              </div>
              <Trophy size={40} className="text-yellow-600 opacity-30" />
            </div>
            <p className="text-xs text-yellow-600 mt-3">{studentsWith95Plus} out of {totalStudents} students</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-300 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-semibold mb-1">Students Scored</p>
                <p className="text-3xl font-black text-blue-700">90%+</p>
              </div>
              <Star size={40} className="text-blue-600 opacity-30" />
            </div>
            <p className="text-xs text-blue-600 mt-3">{studentsWith90Plus} out of {totalStudents} students</p>
          </div>

          <div className="bg-gradient-to-br from-[#f5a623]/10 to-orange-100 rounded-2xl p-6 border-2 border-[#f5a623] shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-semibold mb-1">Average Score</p>
                <p className="text-3xl font-black text-orange-700">{avgScore}%</p>
              </div>
              <Medal size={40} className="text-orange-600 opacity-30" />
            </div>
            <p className="text-xs text-orange-600 mt-3">All {totalStudents} students</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-300 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-semibold mb-1">Success Rate</p>
                <p className="text-3xl font-black text-green-700">100%</p>
              </div>
              <Star size={40} className="text-green-600 opacity-30 fill-current" />
            </div>
            <p className="text-xs text-green-600 mt-3">All students achieved 90%+</p>
          </div>
        </div>

        {/* Achievement Highlights Banner */}
        <div className="bg-gradient-to-r from-[#0f2a5c] via-[#1a3a6f] to-[#0f2a5c] rounded-2xl p-8 mb-16 shadow-xl border border-[#f5a623]/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            <div>
              <p className="text-4xl font-black text-[#f5a623] mb-2">{sortedYears.length}</p>
              <p className="text-sm opacity-90">Years of Excellence</p>
            </div>
            <div>
              <p className="text-4xl font-black text-[#f5a623] mb-2">{totalStudents}+</p>
              <p className="text-sm opacity-90">Success Stories</p>
            </div>
            <div>
              <p className="text-4xl font-black text-[#f5a623] mb-2">98%</p>
              <p className="text-sm opacity-90">Max Score</p>
            </div>
            <div>
              <p className="text-4xl font-black text-[#f5a623] mb-2">100%</p>
              <p className="text-sm opacity-90">Success Rate</p>
            </div>
          </div>
        </div>

        {/* Year-wise Success Stories */}
        {sortedYears.map((year) => {
          const yearStudents = groupedByYear[year];
          const yearStarCount = yearStudents.filter((s) => parseInt(s.score) >= 95).length;

          return (
            <div key={year} className="mb-20">
              {/* Year Header with Badge */}
              <div className="mb-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-3xl sm:text-4xl font-bold text-[#0f2a5c] mb-2">Year {year}</h3>
                      <div className="h-1 w-16 bg-[#f5a623] rounded-full" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[...Array(yearStarCount)].map((_, i) => (
                        <Star key={i} size={24} className="fill-[#f5a623] text-[#f5a623]" />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                    <div className="bg-gradient-to-br from-[#0f2a5c] to-[#1a3a6f] text-white rounded-xl px-4 py-3 shadow-md">
                      <p className="text-xs opacity-75 font-semibold">Total Toppers</p>
                      <p className="text-2xl font-black">{yearStudents.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#f5a623] to-yellow-500 text-white rounded-xl px-4 py-3 shadow-md">
                      <p className="text-xs opacity-75 font-semibold">Highest Mark</p>
                      <p className="text-2xl font-black">{yearStudents[0].score}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl px-4 py-3 shadow-md">
                      <p className="text-xs opacity-75 font-semibold">Avg Score</p>
                      <p className="text-2xl font-black">{year === '2026' ? '315/500' : year === '2025' ? '322/500' : year === '2024' ? '318/500' : year === '2023' ? '325/500' : '312/500'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toppers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {yearStudents.map((student, rank) => {
                  const medal = getMedalColor(rank);
                  const isTopRank = rank < 3;

                  return (
                    <div key={rank} className="group h-full">
                      <div className={`relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full border-2 ${isTopRank ? 'border-[#f5a623] bg-gradient-to-br from-white to-yellow-50' : 'border-gray-200 bg-white'}`}>
                        {/* Rank Badge */}
                        {rank < 4 && (
                          <div className={`absolute top-0 right-0 z-20 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${medal.bg} rounded-bl-3xl shadow-lg flex items-center justify-center`}>
                            <div className="text-center">
                              {rank < 3 && <Medal size={24} className={`${medal.text} mx-auto mb-1 fill-current`} />}
                              <p className={`${medal.text} font-black text-sm sm:text-base`}>{medal.label}</p>
                              <p className={`${medal.text} font-bold text-xs`}>Rank</p>
                            </div>
                          </div>
                        )}

                        {/* Photo */}
                        <div className="relative h-[24rem] md:h-[20rem] lg:h-[18rem] overflow-hidden bg-gray-300">
                          <img
                            src={student.photo}
                            alt={student.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.src = '/sunrise-logo.png';
                            }}
                          />
                          {/* Score Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#0f2a5c] via-[#0f2a5c] to-transparent pt-2 pb-4 px-4">
                            <p className="text-white text-4xl font-black">{student.score}</p>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-5">
                          <h4 className="text-lg font-bold text-[#0f2a5c] mb-1 line-clamp-2">{student.name}</h4>
                          <p className="text-[#f5a623] text-sm font-semibold mb-4">{student.class}</p>

                          {/* Feedback */}
                          <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-lg p-3 border border-blue-100">
                            {/* Desktop - Show Full Story */}
                            <p className="text-gray-700 text-xs leading-relaxed italic hidden lg:block">
                              "{student.story}"
                            </p>
                            
                            {/* Mobile/Tablet - Show Truncated with Read More */}
                            <p className="text-gray-700 text-xs leading-relaxed italic lg:hidden">
                              "{student.story.length > 150 && !expandedReviews.has(`${student.name}-${student.year}`) ? 
                                `${student.story.substring(0, 150)}...` : 
                                student.story}"
                            </p>
                            {student.story.length > 150 && (
                              <button
                                onClick={() => toggleReview(`${student.name}-${student.year}`)}
                                className="text-[#f5a623] text-xs font-semibold mt-2 flex items-center gap-1 hover:text-orange-600 transition-colors lg:hidden"
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
                          <div className="flex gap-1 mt-4 justify-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className="fill-[#f5a623] text-[#f5a623]"
                              />
                            ))}
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
        <div className="mt-20 pt-12 border-t-2 border-gray-200">
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-8 sm:p-10 border-2 border-[#f5a623]/20 text-center">
            <Trophy size={48} className="text-[#f5a623] mx-auto mb-4" />
            <h3 className="text-2xl sm:text-3xl font-bold text-[#0f2a5c] mb-4">Join Our Success Story</h3>
            <p className="text-gray-700 max-w-2xl mx-auto mb-6">
              With a <span className="font-bold text-[#f5a623]">100% success rate</span> and an average score of <span className="font-bold text-[#f5a623]">{avgScore}%</span>, 
              our coaching has produced <span className="font-bold text-[#f5a623]">{studentsWith95Plus}+ students</span> scoring 95% or above across the past 5 years. 
              Your success is our mission!
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <button className="bg-[#f5a623] text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition-all">
                Enroll Now
              </button>
              <button className="border-2 border-[#0f2a5c] text-[#0f2a5c] px-8 py-3 rounded-lg font-bold hover:bg-[#0f2a5c] hover:text-white transition-all">
                Get in Touch
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}