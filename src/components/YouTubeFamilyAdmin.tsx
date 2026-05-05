import React, { useState, useEffect } from 'react';
import { Youtube, FileText, HelpCircle, Lightbulb, CheckCircle, Plus, Trash2, ExternalLink } from 'lucide-react';
import { 
  StudyMaterial, StudentDoubt, TopicRequest,
  getStudyMaterials, addStudyMaterial, deleteStudyMaterial,
  getDoubts, answerDoubt, deleteDoubt,
  getTopicRequests, completeTopicRequest, deleteTopicRequest
} from '../lib/youtubeFamily';

const FALLBACK_ADMIN_DOUBTS: StudentDoubt[] = [
  { id: 'admin-d1', student_name: 'Ankit Sharma', student_email: 'sample.ankit@example.com', class_name: 'Class 10', subject: 'Science', doubt_text: 'Sir, Carbon and its compounds mein IUPAC naming thoda hard lag raha hai. Ek baar samjha dijiye.', video_link: '', status: 'pending', answer_text: null, created_at: '' },
  { id: 'admin-d2', student_name: 'Sneha Jha', student_email: 'sample.sneha@example.com', class_name: 'Class 9', subject: 'Maths', doubt_text: 'Polynomials ke factorization me hamesha mistake ho jati hai. Please koi trick bataiye.', video_link: '', status: 'pending', answer_text: null, created_at: '' }
];

export default function YouTubeFamilyAdmin() {
  const [activeTab, setActiveTab] = useState<'notes' | 'doubts' | 'topics'>('notes');
  
  // Data States
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [doubts, setDoubts] = useState<StudentDoubt[]>(FALLBACK_ADMIN_DOUBTS);
  const [topics, setTopics] = useState<TopicRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form States
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', subject: '', class_name: '', youtube_link: '', drive_link: '' });
  
  const [replyingDoubtId, setReplyingDoubtId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [m, d, t] = await Promise.all([
        getStudyMaterials().catch(() => []),
        getDoubts().catch(() => []),
        getTopicRequests().catch(() => [])
      ]);
      if (m.length > 0) setMaterials(m);
      if (d.length > 0) setDoubts(d);
      if (t.length > 0) setTopics(t);
    } catch (error) {
      console.error('Error fetching admin data', error);
      showMessage('error', 'Failed to load data from DB. Showing sample data.');
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // --- Handlers for Notes ---
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newNote = await addStudyMaterial(noteForm);
      setMaterials([newNote, ...materials]);
      setShowNoteForm(false);
      setNoteForm({ title: '', subject: '', class_name: '', youtube_link: '', drive_link: '' });
      showMessage('success', 'Note added successfully!');
    } catch (error) {
      showMessage('error', 'Error adding note.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await deleteStudyMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    } catch (error) {
      showMessage('error', 'Error deleting note.');
    }
  };

  // --- Handlers for Doubts ---
  const handleAnswerDoubt = async (id: string) => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const doubtToAnswer = doubts.find(d => d.id === id);
      
      let updatedDoubt = { ...doubtToAnswer, status: 'answered', answer_text: replyText } as StudentDoubt;
      try {
        updatedDoubt = await answerDoubt(id, replyText);
      } catch (dbError) {
        console.warn('DB update failed, using local state for demo', dbError);
      }

      setDoubts(doubts.map(d => d.id === id ? updatedDoubt : d));
      setReplyingDoubtId(null);
      
      // Option 1: Direct Mailto Link (Completely Free & No Setup)
      if (doubtToAnswer?.student_email) {
        const subject = encodeURIComponent('Your Doubt is Solved! 🎓 Reply from SP Jha Sir | Sunrise Classes');
        const body = encodeURIComponent(`Hello ${doubtToAnswer.student_name},

Apne jo sawal Sunrise Classes YouTube Family Portal par pucha tha, uska jawab SP Jha Sir ne personally de diya hai! 🚀

📌 Aapka Sawal:
"${doubtToAnswer.doubt_text}"

💡 Sir ka Jawab:
${replyText}

─────────────────────────────────
📢 IMPORTANT ANNOUNCEMENT 📢
Agar aap Class 9 ya 10 mein hain aur Bihar Board (BSEB) ki solid taiyaari karna chahte hain, toh Sunrise Classes ko zarur follow karein:

🔴 YouTube Channel: Daily live classes aur important exam questions ke liye abhi subscribe karein!
🔗 https://www.youtube.com/@sunriseclasses81

🏫 Offline Batches:
Agar aap Champanagar, Purnia ke aas-paas rehte hain, toh hamare offline batches join karein. 15+ saal ke anubhav ke sath, hum banate hain toppers! 
📞 Contact us for admission: +91 8092285189

Hamare website par daily free PDFs aur Notes upload hote hain. Dekhna na bhoolein: 
🌐 https://www.sunriseclasses.co.in/youtube-family

All the best for your studies!
- Team Sunrise Classes & Academy`);
        
        // This will open the default Email App (Gmail, Outlook, etc.) pre-filled
        window.location.href = `mailto:${doubtToAnswer.student_email}?subject=${subject}&body=${body}`;
        
        showMessage('success', 'Reply saved! Apka Email app khul jayega email bhejne ke liye.');
      } else {
        showMessage('success', 'Reply saved successfully! (No email provided)');
      }
      
      setReplyText('');
    } catch (error) {
      showMessage('error', 'Error sending reply.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoubt = async (id: string) => {
    if (!window.confirm('Delete this doubt?')) return;
    try {
      await deleteDoubt(id);
      setDoubts(doubts.filter(d => d.id !== id));
    } catch (error) {
      showMessage('error', 'Error deleting doubt.');
    }
  };

  // --- Handlers for Topics ---
  const handleCompleteTopic = async (id: string) => {
    try {
      const updated = await completeTopicRequest(id);
      setTopics(topics.map(t => t.id === id ? updated : t));
    } catch (error) {
      showMessage('error', 'Error updating topic status.');
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!window.confirm('Delete this topic request?')) return;
    try {
      await deleteTopicRequest(id);
      setTopics(topics.filter(t => t.id !== id));
    } catch (error) {
      showMessage('error', 'Error deleting topic request.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Youtube className="w-8 h-8 mr-3 text-red-600" />
          YouTube Family Portal
        </h2>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'notes' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('notes')}
        >
          <FileText className="w-4 h-4 inline mr-2" /> Study Materials
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'doubts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} relative`}
          onClick={() => setActiveTab('doubts')}
        >
          <HelpCircle className="w-4 h-4 inline mr-2" /> Student Doubts
          {doubts.filter(d => d.status === 'pending').length > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {doubts.filter(d => d.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'topics' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'} relative`}
          onClick={() => setActiveTab('topics')}
        >
          <Lightbulb className="w-4 h-4 inline mr-2" /> Topic Requests
          {topics.filter(t => t.status === 'pending').length > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {topics.filter(t => t.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Notes Tab Content */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Manage PDFs & Notes (Drive Links)</h3>
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0f2a5c] hover:bg-[#1a3a75]"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Material
            </button>
          </div>

          {showNoteForm && (
            <form onSubmit={handleAddNote} className="bg-gray-50 p-4 rounded-lg border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <input required type="text" value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} className="mt-1 w-full p-2 border rounded-md" placeholder="e.g. Class 10 Science Chapter 1 Notes" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class</label>
                    <input type="text" value={noteForm.class_name} onChange={e => setNoteForm({...noteForm, class_name: e.target.value})} className="mt-1 w-full p-2 border rounded-md" placeholder="10th" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <input type="text" value={noteForm.subject} onChange={e => setNoteForm({...noteForm, subject: e.target.value})} className="mt-1 w-full p-2 border rounded-md" placeholder="Science" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Drive Link (PDF) *</label>
                  <input required type="url" value={noteForm.drive_link} onChange={e => setNoteForm({...noteForm, drive_link: e.target.value})} className="mt-1 w-full p-2 border rounded-md" placeholder="https://drive.google.com/..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">YouTube Video Link</label>
                  <input type="url" value={noteForm.youtube_link} onChange={e => setNoteForm({...noteForm, youtube_link: e.target.value})} className="mt-1 w-full p-2 border rounded-md" placeholder="https://youtube.com/watch?..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowNoteForm(false)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Save Material</button>
              </div>
            </form>
          )}

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class/Sub</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Links</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materials.map(mat => (
                  <tr key={mat.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{mat.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{mat.class_name} - {mat.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex gap-2">
                        {mat.drive_link && <a href={mat.drive_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center"><ExternalLink className="w-3 h-3 mr-1"/> Drive</a>}
                        {mat.youtube_link && <a href={mat.youtube_link} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline flex items-center ml-3"><Youtube className="w-3 h-3 mr-1"/> Video</a>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <button onClick={() => handleDeleteNote(mat.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {materials.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No materials uploaded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Doubts Tab Content */}
      {activeTab === 'doubts' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Student Doubts ({doubts.filter(d => d.status === 'pending').length} Pending)</h3>
          
          <div className="grid gap-4">
            {doubts.map(doubt => (
              <div key={doubt.id} className={`p-4 rounded-lg border ${doubt.status === 'pending' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-900">{doubt.student_name}</span>
                    <span className="text-sm text-gray-500 ml-2">({doubt.class_name} • {doubt.subject})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {doubt.status === 'answered' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Answered</span>}
                    <button onClick={() => handleDeleteDoubt(doubt.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <p className="text-gray-800 bg-white p-3 rounded border mb-3">"{doubt.doubt_text}"</p>
                
                {doubt.video_link && (
                  <a href={doubt.video_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 flex items-center mb-3 hover:underline">
                    <ExternalLink className="w-3 h-3 mr-1"/> View reference video
                  </a>
                )}

                {doubt.status === 'pending' && replyingDoubtId !== doubt.id && (
                  <button onClick={() => setReplyingDoubtId(doubt.id)} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
                    Reply on Portal
                  </button>
                )}

                {replyingDoubtId === doubt.id && (
                  <div className="mt-3 bg-white p-3 rounded border">
                    <textarea
                      rows={3}
                      className="w-full border p-2 rounded mb-2"
                      placeholder="Type your answer here... It will be visible on the public portal."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                    ></textarea>
                    <div className="flex gap-2">
                      <button onClick={() => handleAnswerDoubt(doubt.id)} disabled={loading} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Submit Reply</button>
                      <button onClick={() => setReplyingDoubtId(null)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm">Cancel</button>
                    </div>
                  </div>
                )}

                {doubt.status === 'answered' && doubt.answer_text && (
                  <div className="mt-2 bg-green-50 p-3 rounded border border-green-200">
                    <span className="text-xs font-bold text-green-800 uppercase block mb-1">Your Reply:</span>
                    <p className="text-sm text-gray-800">{doubt.answer_text}</p>
                  </div>
                )}
              </div>
            ))}
            {doubts.length === 0 && <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No doubts asked yet.</p>}
          </div>
        </div>
      )}

      {/* Topics Tab Content */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Topic Requests ({topics.filter(t => t.status === 'pending').length} Pending)</h3>
          
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic Request</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topics.map(t => (
                  <tr key={t.id} className={t.status === 'completed' ? 'bg-gray-50 opacity-75' : ''}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.student_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md break-words">{t.topic_name}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      {t.status === 'pending' ? (
                        <button onClick={() => handleCompleteTopic(t.id)} className="text-green-600 hover:text-green-900 mr-3 text-xs font-bold border border-green-600 rounded px-2 py-1">Mark Done</button>
                      ) : (
                        <span className="text-green-600 mr-3 text-xs font-bold flex items-center justify-end"><CheckCircle className="w-3 h-3 mr-1"/> Done</span>
                      )}
                      <button onClick={() => handleDeleteTopic(t.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {topics.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No topic requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
