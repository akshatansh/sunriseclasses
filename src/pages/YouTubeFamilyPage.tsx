import React, { useState, useEffect } from 'react';
import { Youtube, FileText, HelpCircle, Lightbulb, Download, ExternalLink, Send, CheckCircle, BookOpen, Star, Users, Search } from 'lucide-react';
import Seo from '../components/Seo';
import { 
  StudyMaterial, StudentDoubt,
  getStudyMaterials, submitDoubt, submitTopicRequest, getDoubts
} from '../lib/youtubeFamily';

// ── Fallback data shown until DB tables are ready ──────────────────────────
const FALLBACK_MATERIALS: StudyMaterial[] = [
  { id: 'f1', title: 'Class 10 Maths – Trigonometry Formulas & Tricks (SP Jha Sir)', subject: 'Mathematics', class_name: 'Class 10', youtube_link: 'https://www.youtube.com/@sunriseclasses81', drive_link: 'https://www.youtube.com/@sunriseclasses81', created_at: '' },
  { id: 'f2', title: 'Class 10 Science – Light: Reflection & Refraction Notes', subject: 'Science', class_name: 'Class 10', youtube_link: 'https://www.youtube.com/@sunriseclasses81', drive_link: 'https://www.youtube.com/@sunriseclasses81', created_at: '' },
  { id: 'f3', title: 'Class 10 Maths – Chapter 1: Real Numbers (Complete Notes)', subject: 'Mathematics', class_name: 'Class 10', youtube_link: 'https://www.youtube.com/@sunriseclasses81', drive_link: 'https://www.youtube.com/@sunriseclasses81', created_at: '' },
  { id: 'f4', title: 'Class 9 Science – Matter in Our Surroundings – Full Notes', subject: 'Science', class_name: 'Class 9', youtube_link: 'https://www.youtube.com/@sunriseclasses81', drive_link: 'https://www.youtube.com/@sunriseclasses81', created_at: '' },
  { id: 'f5', title: 'Class 9 Maths – Number System – Practice Questions PDF', subject: 'Mathematics', class_name: 'Class 9', youtube_link: 'https://www.youtube.com/@sunriseclasses81', drive_link: 'https://www.youtube.com/@sunriseclasses81', created_at: '' },
  { id: 'f6', title: 'Class 10 Hindi – Kshitij Chapter 1 Summary & Notes', subject: 'Hindi', class_name: 'Class 10', youtube_link: 'https://www.youtube.com/@sunriseclasses81', drive_link: 'https://www.youtube.com/@sunriseclasses81', created_at: '' },
];

const FALLBACK_DOUBTS: StudentDoubt[] = [
  { id: 'd1', student_name: 'Rahul Kumar', class_name: 'Class 10', subject: 'Mathematics', doubt_text: 'Sir, Trigonometry mein sin²θ + cos²θ = 1 kaise prove karte hain?', video_link: '', status: 'answered', answer_text: 'Bahut achha sawal hai Rahul! Right-angled triangle mein Pythagoras theorem se x² + y² = r² hota hai. Dono side r² se divide karo: cos²θ + sin²θ = 1. Practice karo, ho jayega! 💪', created_at: '' },
  { id: 'd2', student_name: 'Priya Singh', class_name: 'Class 10', subject: 'Science', doubt_text: 'Sir, light ka reflection aur refraction mein kya difference hai? Dono confuse ho jaate hain.', video_link: '', status: 'answered', answer_text: 'Simple baat yaad rakho: Reflection = Light usi medium mein wapas (mirror). Refraction = Light doosre medium mein jaake mudi (lens/paani). Mirror = Reflection, Lens = Refraction. ✨', created_at: '' },
  { id: 'd3', student_name: 'Deepak Paswan', class_name: 'Class 9', subject: 'Science', doubt_text: 'Sir evaporation aur boiling mein kya fark hai? Exam mein dono same lagte hain.', video_link: '', status: 'answered', answer_text: 'Yaad rakho: Evaporation = Surface se, kisi bhi temp par, slowly (kapde sukhna). Boiling = Poore liquid mein, specific temp par, rapidly (paani garam karna). Evaporation cooling deta hai, boiling nahi. 🔥', created_at: '' },
];
// ──────────────────────────────────────────────────────────────────────────

export default function YouTubeFamilyPage() {
  const [activeTab, setActiveTab] = useState<'notes' | 'doubts' | 'topics'>('notes');
  const [materials, setMaterials] = useState<StudyMaterial[]>(FALLBACK_MATERIALS);
  const [doubts, setDoubts] = useState<StudentDoubt[]>(FALLBACK_DOUBTS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [doubtForm, setDoubtForm] = useState({ student_name: '', student_email: '', class_name: '', subject: '', doubt_text: '', video_link: '' });
  const [topicForm, setTopicForm] = useState({ student_name: '', subject: '', topic_name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [materialsData, doubtsData] = await Promise.all([
        getStudyMaterials().catch(() => []),
        getDoubts().catch(() => [])
      ]);
      // Only override fallback if real data exists
      if (materialsData.length > 0) setMaterials(materialsData);
      const answered = doubtsData.filter(d => d.status === 'answered');
      if (answered.length > 0) setDoubts(answered);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleDoubtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await submitDoubt(doubtForm);
      setMessage({ type: 'success', text: 'Aapka doubt submit ho gaya hai! Sir jaldi hi iska jawab denge.' });
      setDoubtForm({ student_name: '', student_email: '', class_name: '', subject: '', doubt_text: '', video_link: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error submitting doubt. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await submitTopicRequest(topicForm);
      setMessage({ type: 'success', text: 'Topic request submit ho gaya hai! Thank you.' });
      setTopicForm({ student_name: '', subject: '', topic_name: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error submitting request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <Seo
        title="YouTube Family Zone – Free Notes, Doubts & Topic Requests | Sunrise Classes"
        description="SP Jha Sir ke YouTube students ke liye free Class 8, 9 & 10 notes download karein, doubts puchein aur naye video topics request karein. Sunrise Classes Champanagar, Purnia Bihar ka free online study portal."
        keywords="SP Jha Sir free notes, Sunrise Classes YouTube notes download, Class 10 free PDF Bihar, Class 8 notes Purnia, Class 9 notes Purnia, BSEB board exam notes free, doubt portal Bihar board, Champanagar coaching notes, free study material Bihar, SP Jha YouTube classes notes, Sunrise Classes Champanagar Purnia Bihar"
        url="/youtube-family"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-full mb-4">
            <Youtube className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0f2a5c] mb-4">
            YouTube Family Zone
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            SP Jha Sir ke sabhi YouTube students ke liye special portal. Yahan se notes download karein, doubts puchein aur naye video ki request karein!
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8">
          <button
            onClick={() => { setActiveTab('notes'); setMessage({ type: '', text: '' }); }}
            className={`flex items-center px-6 py-3 rounded-full font-semibold transition-all shadow-sm ${
              activeTab === 'notes'
                ? 'bg-red-600 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5 mr-2" />
            Class Notes & PDF
          </button>
          <button
            onClick={() => { setActiveTab('doubts'); setMessage({ type: '', text: '' }); }}
            className={`flex items-center px-6 py-3 rounded-full font-semibold transition-all shadow-sm ${
              activeTab === 'doubts'
                ? 'bg-blue-600 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <HelpCircle className="w-5 h-5 mr-2" />
            Ask a Doubt
          </button>
          <button
            onClick={() => { setActiveTab('topics'); setMessage({ type: '', text: '' }); }}
            className={`flex items-center px-6 py-3 rounded-full font-semibold transition-all shadow-sm ${
              activeTab === 'topics'
                ? 'bg-green-600 text-white shadow-md transform scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            Request Topic
          </button>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`p-4 mb-8 rounded-lg text-center font-medium ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border border-gray-100">
          
          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Download Free Study Material</h2>
                <p className="text-gray-600 mt-2">YouTube classes ke sabhi important notes aur PDFs yahan se download karein.</p>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Abhi koi notes upload nahi kiye gaye hain.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {materials.map((mat) => (
                    <div key={mat.id} className="bg-white border rounded-xl p-5 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">
                          {mat.class_name || 'All Classes'}
                        </span>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                          {mat.subject || 'General'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2" title={mat.title}>{mat.title}</h3>
                      <div className="flex gap-2 mt-4">
                        {mat.youtube_link && (
                          <a
                            href={mat.youtube_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Youtube className="w-4 h-4 mr-2 text-red-600" />
                            Watch
                          </a>
                        )}
                        <a
                          href={mat.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0f2a5c] hover:bg-[#1a3a75]"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOUBTS TAB */}
          {activeTab === 'doubts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Doubt Form */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <HelpCircle className="w-6 h-6 mr-2 text-blue-600" />
                  Apna Doubt Puchiye
                </h2>
                <form onSubmit={handleDoubtSubmit} className="space-y-4 bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aapka Naam <span className="text-red-500">*</span></label>
                      <input
                        required
                        type="text"
                        value={doubtForm.student_name}
                        onChange={e => setDoubtForm({...doubtForm, student_name: e.target.value})}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        placeholder="e.g. Rahul Kumar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email ID <span className="text-xs text-gray-500">(Reply aayega)</span></label>
                      <input
                        type="email"
                        value={doubtForm.student_email}
                        onChange={e => setDoubtForm({...doubtForm, student_email: e.target.value})}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        placeholder="e.g. rahul@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                      <input
                        type="text"
                        value={doubtForm.class_name}
                        onChange={e => setDoubtForm({...doubtForm, class_name: e.target.value})}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        placeholder="e.g. 8th, 9th, 10th"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={doubtForm.subject}
                        onChange={e => setDoubtForm({...doubtForm, subject: e.target.value})}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        placeholder="e.g. Maths"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video Link (Optional)</label>
                    <input
                      type="url"
                      value={doubtForm.video_link}
                      onChange={e => setDoubtForm({...doubtForm, video_link: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aapka Doubt / Sawal <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={4}
                      value={doubtForm.doubt_text}
                      onChange={e => setDoubtForm({...doubtForm, doubt_text: e.target.value})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                      placeholder="Yahan apna sawal vistar se likhein..."
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Doubt'}
                  </button>
                </form>
              </div>

              {/* Answered Doubts */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">Find Your Reply</h2>
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search by your name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 flex-grow">
                  {doubts.filter((doubt) => doubt.student_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                    <p className="text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {searchQuery ? 'Aapke naam se koi jawab nahi mila.' : 'Abhi tak koi public answers nahi hain.'}
                    </p>
                  ) : (
                    doubts
                      .filter((doubt) => doubt.student_name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(doubt => (
                        <div key={doubt.id} className="bg-white border rounded-xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                          <span className="font-semibold text-gray-700">{doubt.student_name}</span>
                          {(doubt.class_name || doubt.subject) && (
                            <span>({[doubt.class_name, doubt.subject].filter(Boolean).join(' - ')})</span>
                          )}
                          <span>ne pucha:</span>
                        </div>
                        <p className="text-gray-800 font-medium mb-3">Q: {doubt.doubt_text}</p>
                        
                        {doubt.answer_text && (
                          <div className="bg-green-50 p-4 rounded-lg border border-green-100 relative mt-2">
                            <div className="absolute -top-3 left-4 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full border border-green-200 flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Sir's Reply
                            </div>
                            <p className="text-gray-800 text-sm whitespace-pre-wrap mt-1">A: {doubt.answer_text}</p>
                          </div>
                        )}
                        
                        {doubt.video_link && (
                          <a href={doubt.video_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mt-3">
                            <ExternalLink className="w-3 h-3 mr-1" /> View Related Video
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TOPICS TAB */}
          {activeTab === 'topics' && (
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 mr-2 text-green-500" />
                Agla Video Kis Topic Par Chahiye?
              </h2>
              <p className="text-gray-600 mb-8">
                Agar aapko kisi khaas chapter ya topic ko samajhne mein pareshani ho rahi hai, toh niche suggest karein. SP Jha sir jaldi hi us par video banayenge!
              </p>

              <form onSubmit={handleTopicSubmit} className="space-y-4 text-left bg-green-50 p-6 sm:p-8 rounded-2xl border border-green-100 shadow-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aapka Naam <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={topicForm.student_name}
                    onChange={e => setTopicForm({...topicForm, student_name: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border"
                    placeholder="e.g. Amit Kumar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject / Class <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={topicForm.subject}
                    onChange={e => setTopicForm({...topicForm, subject: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border"
                    placeholder="e.g. Class 8/9/10 Maths"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic Ka Naam <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={topicForm.topic_name}
                    onChange={e => setTopicForm({...topicForm, topic_name: e.target.value})}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-3 border"
                    placeholder="e.g. Sir, Trigonometry ke basic formulas samjha dijiye..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5 mr-2" />
                  {loading ? 'Sending...' : 'Suggest Topic'}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* ── SEO CONTENT BLOCK ──────────────────────────────── */}
        <section className="mt-16 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f2a5c] mb-2">
            SP Jha Sir ke YouTube Students ke liye Free Study Portal
          </h2>
          <p className="text-gray-500 text-sm mb-8">Sunrise Classes &amp; Academy, Champanagar, Purnia, Bihar</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-red-50 rounded-xl p-5 border border-red-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-100 p-2 rounded-lg"><FileText className="w-5 h-5 text-red-600" /></div>
                <h3 className="font-bold text-gray-900">Free Notes &amp; PDFs</h3>
              </div>
              <p className="text-sm text-gray-600">SP Jha Sir ki har YouTube class ke liye handwritten notes aur PDF study material yahan se bilkul free download karein. Class 8, Class 9 aur Class 10 ke sabhi subjects ke notes available hain — Mathematics, Science, Hindi, Social Science.</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg"><HelpCircle className="w-5 h-5 text-blue-600" /></div>
                <h3 className="font-bold text-gray-900">Doubt Clearance Portal</h3>
              </div>
              <p className="text-sm text-gray-600">YouTube video dekhte waqt koi bhi doubt ho toh seedha SP Jha Sir se puchiye. Apna sawal yahan submit karein aur Sir personally jawab denge. Bihar Board BSEB exam ki taiyaari ab aur bhi aasaan ho gayi hai.</p>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2 rounded-lg"><Lightbulb className="w-5 h-5 text-green-600" /></div>
                <h3 className="font-bold text-gray-900">Video Topic Request</h3>
              </div>
              <p className="text-sm text-gray-600">Aap chahte hain ki SP Jha Sir kisi khaas topic par video banayein? Yahan request karein! Sabse zyada requested topics par Sir sabse pehle video banate hain. Apni baat seedha Sir tak pahunchayein.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-10 text-center max-w-sm mx-auto w-full">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-3xl font-extrabold text-[#0f2a5c]">50+</p>
              <p className="text-xs text-gray-500 mt-1">Free PDFs Available</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-3xl font-extrabold text-green-600">15+</p>
              <p className="text-xs text-gray-500 mt-1">Years of Teaching</p>
            </div>
          </div>

          {/* FAQ for SEO */}
          <div className="border-t pt-8">
            <h3 className="text-xl font-bold text-[#0f2a5c] mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Aksar Puche Jane Wale Sawal (FAQ)
            </h3>
            <div className="space-y-5">
              {[
                {
                  q: 'Sunrise Classes ke free notes kaise download karein?',
                  a: '"Class Notes & PDF" tab mein jaayein, apni class aur subject ke hisaab se notes dhundein aur "Download" button par click karein. Sabhi notes Google Drive par hain aur bilkul free hain.'
                },
                {
                  q: 'SP Jha Sir se doubt kaise puchein?',
                  a: '"Ask a Doubt" tab mein jaayein, apna naam, class, subject aur apna sawal likhein. Agar kisi YouTube video se related hai toh link bhi paste karein aur Submit Doubt button dabayein. Sir personally jawab denge.'
                },
                {
                  q: 'Kya ye notes BSEB Bihar Board exam ke liye helpful hain?',
                  a: 'Haan bilkul! SP Jha Sir ke 15+ saal ke teaching experience ke saath banaye gaye ye notes specifically BSEB Class 8, Class 9 aur Class 10 board exam pattern ke hisaab se taiyaar kiye gaye hain. In notes se aap board exam mein bahut achha kar sakte hain.'
                },
                {
                  q: 'Kya ye portal sirf offline students ke liye hai?',
                  a: 'Nahi! Ye YouTube Family portal specifically un students ke liye hai jo SP Jha Sir ke YouTube channel se padhte hain. Purnia, Champanagar aur poore Bihar ke students yahan free mein notes download kar sakte hain aur doubts pooch sakte hain.'
                },
              ].map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-5">
                  <p className="font-semibold text-gray-900 mb-2">Q: {item.q}</p>
                  <p className="text-sm text-gray-600">A: {item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Local SEO paragraph */}
          <div className="mt-8 pt-6 border-t text-sm text-gray-500 leading-relaxed">
            <p>
              <strong className="text-gray-700">Sunrise Classes &amp; Academy</strong> Champanagar, Purnia, Bihar mein sthit ek prasidh coaching center hai jo pichhle 15+ saalon se Class 8, Class 9 aur Class 10 ke students ko BSEB Bihar Board pariksha ki taiyaari kara raha hai.
              SP Jha Sir ka YouTube channel <em>@sunriseclasses81</em> par daily educational videos upload hote hain jisme Maths, Science, Hindi aur Social Science ke topics cover kiye jaate hain.
              Yeh YouTube Family portal unhi students ke liye banaya gaya hai jo ghar baith kar free mein padhna chahte hain.
              Champanagar, Purnia, Katihar, Araria, Kishanganj aur poore Seemanchal kshetra ke students is portal ka labh utha sakte hain.
            </p>
          </div>
        </section>
        {/* ────────────────────────────────────────────────────── */}

      </div>
    </div>
  );
}
