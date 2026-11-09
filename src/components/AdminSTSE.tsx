import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Download, Edit2, Check, RefreshCw, Calendar, 
  MapPin, Clock, Award, Trophy, Filter, CheckCircle2, FileSpreadsheet,
  Printer, ArrowUpDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  getAllSTSERegistrations, updateSTSERegistrationMarks, 
  getSTSEConfig, updateSTSEConfig 
} from '../lib/stse';
import { generateAdmitCardPDF, cleanForPdf, STSERegistration, STSEConfig } from '../lib/admitCardPdf';

export default function AdminSTSE() {
  const [registrations, setRegistrations] = useState<STSERegistration[]>([]);
  const [config, setConfig] = useState<STSEConfig>({
    exam_date: 'To be announced',
    venue: 'Sunrise Classes & Academy, Main Market, Champanagar, Purnia',
    shifts: ['Shift 1: 09:30 AM - 10:30 AM', 'Shift 2: 11:30 AM - 12:30 PM'],
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');

  // Editing marks
  const [editingId, setEditingId] = useState<string | null>(null);
  const [marksInput, setMarksInput] = useState<string>('');
  const [savingMarks, setSavingMarks] = useState(false);

  // Editing config
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState<STSEConfig>(config);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regs, cfg] = await Promise.all([
        getAllSTSERegistrations(),
        getSTSEConfig(),
      ]);
      setRegistrations(regs);
      setConfig(cfg);
      setConfigForm(cfg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter registrations
  const filtered = registrations.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = 
      !search ||
      r.student_name?.toLowerCase().includes(q) ||
      r.roll_number?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.father_name?.toLowerCase().includes(q) ||
      r.school_name?.toLowerCase().includes(q) ||
      r.village_area?.toLowerCase().includes(q);

    const matchesShift = selectedShift === 'all' || r.shift_preference?.includes(selectedShift);
    const matchesSchool = selectedSchool === 'all' || r.school_name === selectedSchool;

    return matchesSearch && matchesShift && matchesSchool;
  });

  // Calculate statistics
  const totalCount = registrations.length;
  const shift1Count = registrations.filter(r => r.shift_preference?.includes('Shift 1') || r.shift_preference?.includes('09:30')).length;
  const shift2Count = registrations.filter(r => r.shift_preference?.includes('Shift 2') || r.shift_preference?.includes('11:30')).length;
  const evaluatedCount = registrations.filter(r => (r as any).marks_obtained !== undefined && (r as any).marks_obtained !== null).length;

  const handleSaveMarks = async (id?: string) => {
    if (!id) return;
    const marksNum = parseFloat(marksInput);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > 50) {
      alert('कृपया 0 से 50 के बीच मान्य अंक दर्ज करें।');
      return;
    }

    setSavingMarks(true);
    const ok = await updateSTSERegistrationMarks(id, marksNum);
    setSavingMarks(false);

    if (ok) {
      setEditingId(null);
      setMarksInput('');
      fetchData();
    } else {
      alert('अंक सेव करने में समस्या आई।');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const ok = await updateSTSEConfig(configForm);
    setSavingConfig(false);

    if (ok) {
      setConfig(configForm);
      setShowConfigModal(false);
      alert('STSE सेटिंग्स सफलतापूर्वक अपडेट हो गईं!');
    } else {
      alert('सेटिंग्स सेव करने में समस्या आई।');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) {
      alert('डाउनलोड के लिए कोई डेटा नहीं है।');
      return;
    }

    const headers = ['Roll Number', 'Student Name', 'Father Name', 'Phone', 'WhatsApp', 'School', 'Village/Area', 'Shift', 'Marks (out of 50)', 'Scholarship %', 'Prize Won', 'Registered At'];
    const rows = registrations.map(r => [
      r.roll_number,
      `"${r.student_name}"`,
      `"${r.father_name}"`,
      r.phone,
      r.whatsapp || r.phone,
      `"${r.school_name}"`,
      `"${r.village_area}"`,
      `"${r.shift_preference}"`,
      (r as any).marks_obtained ?? '',
      (r as any).scholarship_percentage ? `${(r as any).scholarship_percentage}%` : '',
      `"${(r as any).prize_won || ''}"`,
      r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `STSE_Registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Attendance Sheet PDF for Exam Day
  const handlePrintAttendanceSheet = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 42, 92);
    doc.rect(0, 0, pageW, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SUNRISE TALENT SEARCH EXAMINATION 2028 (STSE)', pageW / 2, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Official Exam Day Attendance Sheet  |  Generated on: ${new Date().toLocaleDateString()}`, pageW / 2, 18, { align: 'center' });

    const tableRows = filtered.map((r, i) => [
      i + 1,
      r.roll_number,
      cleanForPdf(r.student_name),
      cleanForPdf(r.father_name),
      cleanForPdf(r.school_name),
      r.shift_preference?.includes('Shift 1') ? 'Shift 1' : 'Shift 2',
      '', // Signature
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['#', 'Roll No', 'Student Name', 'Father Name', 'School', 'Shift', 'Student Signature']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 42, 92], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 35 },
        3: { cellWidth: 32 },
        4: { cellWidth: 40 },
        5: { cellWidth: 16 },
        6: { cellWidth: 35 }, // Signature column
      },
    });

    doc.save(`STSE_Attendance_Sheet_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#0f2a5c] to-[#153e75] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#f5a623] mb-1">
            <Trophy className="w-4 h-4" />
            STSE 2028 Offline Management
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            सनराइज प्रतिभा खोज परीक्षा 2028 (प्रबंधन)
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            परीक्षा की तारीख: <strong>{config.exam_date}</strong>  |  केंद्र: <strong>{config.venue}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-[#f5a623]" />
            <span>डेट व सेटिंग्स बदलें</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV डाउनलोड</span>
          </button>

          <button
            onClick={handlePrintAttendanceSheet}
            className="px-4 py-2.5 bg-[#f5a623] hover:bg-[#d48806] text-[#0f2a5c] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow"
          >
            <Printer className="w-4 h-4" />
            <span>अटेंडेंस शीट (Print)</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-slate-200 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">कुल रजिस्ट्रेशन (Total)</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-[#0f2a5c]">{totalCount}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">शिफ्ट 1 (09:30 AM)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{shift1Count}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">शिफ्ट 2 (11:30 AM)</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{shift2Count}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">कॉपी जांची गईं (Checked)</span>
            <Award className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-black text-green-600">{evaluatedCount} / {totalCount}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="नाम, रोल नंबर, मोबाइल या स्कूल खोजें..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#0f2a5c]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedShift}
            onChange={e => setSelectedShift(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium bg-white"
          >
            <option value="all">सभी शिफ्ट (All Shifts)</option>
            <option value="Shift 1">Shift 1 (09:30 AM)</option>
            <option value="Shift 2">Shift 2 (11:30 AM)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">रोल नंबर</th>
                <th className="py-3 px-4">छात्र का नाम व पिता</th>
                <th className="py-3 px-4">मोबाइल / WhatsApp</th>
                <th className="py-3 px-4">स्कूल व गांव</th>
                <th className="py-3 px-4">शिफ्ट</th>
                <th className="py-3 px-4 text-center">अंक (50 में से)</th>
                <th className="py-3 px-4 text-center">स्कॉलरशिप</th>
                <th className="py-3 px-4 text-right">एडमिट कार्ड</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    कोई छात्र नहीं मिला।
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const marks = (r as any).marks_obtained;
                  const scholarship = (r as any).scholarship_percentage;
                  const isEditing = editingId === r.id;

                  return (
                    <tr key={r.id || r.roll_number} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-[#0f2a5c]">
                        {r.roll_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {r.photo_base64 ? (
                            <img
                              src={r.photo_base64}
                              alt={r.student_name}
                              className="w-8 h-10 object-cover rounded border border-slate-300 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-10 rounded border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                              No Pic
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{r.student_name}</div>
                            <div className="text-[11px] text-slate-500">पिता: {r.father_name}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{r.phone}</div>
                        {r.whatsapp && r.whatsapp !== r.phone && (
                          <div className="text-[11px] text-green-600 font-semibold">WA: {r.whatsapp}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="truncate font-medium text-slate-800" title={r.school_name}>
                          {r.school_name}
                        </div>
                        <div className="text-[11px] text-slate-500">{r.village_area}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.shift_preference?.includes('Shift 1')
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {r.shift_preference?.includes('Shift 1') ? 'Shift 1' : 'Shift 2'}
                        </span>
                      </td>

                      {/* Marks Column */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={marksInput}
                              onChange={e => setMarksInput(e.target.value)}
                              placeholder="0-50"
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-center font-bold text-sm"
                            />
                            <button
                              onClick={() => handleSaveMarks(r.id)}
                              disabled={savingMarks}
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {marks !== undefined && marks !== null ? (
                              <span className="font-extrabold text-sm text-[#0f2a5c]">
                                {marks} <span className="text-[10px] text-slate-400 font-normal">/ 50</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">दर्ज नहीं</span>
                            )}
                            <button
                              onClick={() => {
                                setEditingId(r.id || null);
                                setMarksInput(marks !== undefined && marks !== null ? String(marks) : '');
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Enter Marks"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Scholarship Column */}
                      <td className="py-3.5 px-4 text-center">
                        {scholarship ? (
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-black ${
                            scholarship === 100
                              ? 'bg-amber-500 text-white shadow-sm'
                              : scholarship >= 50
                              ? 'bg-green-100 text-green-800 font-bold'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {scholarship}% OFF
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Admit Card Download */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => generateAdmitCardPDF(r, config)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#0f2a5c] hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1"
                          title="Download Admit Card"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-[#0f2a5c] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#f5a623]" />
              <span>STSE 2028 परीक्षा सेटिंग्स</span>
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  परीक्षा की तारीख (Exam Date)
                </label>
                <input
                  type="text"
                  placeholder="उदा: 28 दिसंबर 2026 (रविवार को)"
                  value={configForm.exam_date || ''}
                  onChange={e => setConfigForm({ ...configForm, exam_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  परीक्षा केंद्र (Venue Address)
                </label>
                <textarea
                  rows={2}
                  value={configForm.venue || ''}
                  onChange={e => setConfigForm({ ...configForm, venue: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  परीक्षा शिफ्ट 1 (Shift 1)
                </label>
                <input
                  type="text"
                  value={configForm.shifts?.[0] || ''}
                  onChange={e => {
                    const next = [...(configForm.shifts || [])];
                    next[0] = e.target.value;
                    setConfigForm({ ...configForm, shifts: next });
                  }}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  परीक्षा शिफ्ट 2 (Shift 2)
                </label>
                <input
                  type="text"
                  value={configForm.shifts?.[1] || ''}
                  onChange={e => {
                    const next = [...(configForm.shifts || [])];
                    next[1] = e.target.value;
                    setConfigForm({ ...configForm, shifts: next });
                  }}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 bg-[#0f2a5c] text-white rounded-xl text-sm font-bold hover:bg-[#153e75]"
                >
                  {savingConfig ? 'सेव हो रहा है...' : 'सेव करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

