import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Save, Search, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawPDFFooter } from '../lib/pdfUtils';
import { getStudentsWithHomework, upsertHomeworkRecords, deleteHomeworkRecord, type StudentWithHomework } from '../lib/homeworkPortal';

export default function HomeworkManagement() {
  const [students, setStudents] = useState<StudentWithHomework[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and Selection
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear();
  });
  const [selectedClass, setSelectedClass] = useState<string>('Class 10');
  const [searchQuery, setSearchQuery] = useState('');

  // Target and Inputs
  const [targetPages, setTargetPages] = useState<string>('400');
  const [completedInputs, setCompletedInputs] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    const data = await getStudentsWithHomework(selectedMonth);
    setStudents(data);
    
    // Auto-fill inputs with existing data for the selected month
    const inputs: Record<string, string> = {};
    let existingTarget = '';
    data.forEach(s => {
      if (s.homework) {
        inputs[s.id] = s.homework.completedPages.toString();
        existingTarget = s.homework.targetPages.toString();
      }
    });
    setCompletedInputs(inputs);
    if (existingTarget) setTargetPages(existingTarget);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const normalizeClass = (cls: string) => {
    const c = cls.toLowerCase();
    if (c.includes('10')) return 'Class 10';
    if (c.includes('9')) return 'Class 9';
    return cls;
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = normalizeClass(s.className) === selectedClass;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [students, selectedClass, searchQuery]);

  const handleSave = async () => {
    const target = Number(targetPages);
    if (!Number.isFinite(target) || target <= 0) {
      alert("Please enter a valid target pages amount.");
      return;
    }

    setSaving(true);
    const recordsToSave = [];

    // Only save students who have a completed input that is a valid number
    for (const [studentId, val] of Object.entries(completedInputs)) {
      if (val.trim() !== '') {
        const completed = Number(val);
        if (Number.isFinite(completed) && completed >= 0) {
          recordsToSave.push({
            studentId,
            month: selectedMonth,
            targetPages: target,
            completedPages: completed
          });
        }
      }
    }

    if (recordsToSave.length === 0) {
      alert("Please enter completed pages for at least one student.");
      setSaving(false);
      return;
    }

    const success = await upsertHomeworkRecords(recordsToSave);
    if (success) {
      showMessage("Homework records saved successfully.");
      await loadData();
    } else {
      alert("Failed to save homework records.");
    }
    setSaving(false);
  };

  const handleDownloadReport = async () => {
    const withHomework = students
      .filter(s => normalizeClass(s.className) === selectedClass && s.homework)
      .sort((a, b) => (b.homework!.completedPages / b.homework!.targetPages) - (a.homework!.completedPages / a.homework!.targetPages));

    if (withHomework.length === 0) {
      alert('No homework data available for this month and class.');
      return;
    }

    const target = withHomework[0]?.homework?.targetPages ?? 0;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const description = `Monthly Homework Report — ${selectedClass}  |  ${selectedMonth}  |  Target: ${target} pages  |  Students: ${withHomework.length}  |  Generated: ${dateStr}`;
    let startY = await drawPDFHeader(doc, `Homework Progress — ${selectedClass}`, description);

    // Color legend
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setFillColor(34, 197, 94); doc.rect(14, startY, 3, 3, 'F');
    doc.setTextColor(40, 120, 60); doc.text('Great (≥80%)', 19, startY + 2.5);
    doc.setFillColor(251, 191, 36); doc.rect(55, startY, 3, 3, 'F');
    doc.setTextColor(120, 80, 0); doc.text('Good (50–79%)', 60, startY + 2.5);
    doc.setFillColor(248, 113, 113); doc.rect(103, startY, 3, 3, 'F');
    doc.setTextColor(160, 30, 30); doc.text('Behind (<50%)', 108, startY + 2.5);
    startY += 10;

    autoTable(doc, {
      startY,
      head: [['Rank', 'Student Name', 'Completed', 'Target', '% Done', 'Status']],
      body: withHomework.map((s, idx) => {
        const hw = s.homework!;
        const pct = Math.min(100, Math.round((hw.completedPages / hw.targetPages) * 100));
        const status = pct >= 80 ? 'Great' : pct >= 50 ? 'Good' : 'Behind';
        return [idx + 1, s.name, `${hw.completedPages} pages`, `${hw.targetPages} pages`, `${pct}%`, status];
      }),
      headStyles: { fillColor: [15, 42, 92], textColor: [245, 166, 35], fontStyle: 'bold', fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold' },
        5: { halign: 'center', fontStyle: 'bold' },
      },
      didDrawCell: (data) => {
        if (data.column.index === 5 && data.section === 'body') {
          const val = String(data.cell.raw);
          if (val === 'Great') doc.setTextColor(21, 128, 61);
          else if (val === 'Good') doc.setTextColor(146, 64, 14);
          else doc.setTextColor(185, 28, 28);
        }
      },
      margin: { left: 12, right: 12 },
      styles: { cellPadding: 3.5, lineColor: [220, 230, 245], lineWidth: 0.2 },
    });

    drawPDFFooter(doc);
    doc.save(`Sunrise_Homework_${selectedClass.replace(' ', '')}_${selectedMonth.replace(' ', '_')}.pdf`);
    showMessage('Homework report PDF downloaded!');
  };

  // Generate last 6 months for dropdown
  const months = useMemo(() => {
    const result = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      result.push(d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear());
      d.setMonth(d.getMonth() - 1);
    }
    return result;
  }, []);

  return (
    <div className="space-y-6">
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-green-500 px-6 py-3 font-bold text-white shadow-xl animate-fade-in-down flex items-center gap-2">
          {message}
        </div>
      )}

      {/* Control Panel */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-[#0f2a5c]" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2a5c]/10 text-[#0f2a5c]">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0f2a5c]">Homework Tracking</h2>
            <p className="text-sm text-slate-500">Manage monthly homework submissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Month</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 bg-slate-50"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 bg-slate-50"
            >
              <option value="Class 10">Class 10</option>
              <option value="Class 9">Class 9</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Target Pages</label>
            <input
              type="number"
              value={targetPages}
              onChange={e => setTargetPages(e.target.value)}
              placeholder="e.g. 400"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search Student</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 bg-slate-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Student List for Upload */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-bold text-[#0f2a5c] flex-1">
            {selectedClass} Students
          </h3>
          <button
            onClick={handleSave}
            disabled={saving || loading || filteredStudents.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[#0f2a5c] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#173873] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save size={16} />
            )}
            Save Records
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={loading || students.filter(s => normalizeClass(s.className) === selectedClass && s.homework).length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"
          >
            <Download size={16} />
            Download Report
          </button>
        </div>
        <div className="mb-4" />

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
            No students found.
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
            {filteredStudents.map(student => (
              <div key={student.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={student.image || '/sunrise-logo.png'}
                    onError={e => (e.currentTarget.src = '/sunrise-logo.png')}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                    alt={student.name}
                  />
                  <div>
                    <p className="font-bold text-[#0f2a5c] text-sm">{student.name}</p>
                    {student.homework ? (
                      <p className="text-[11px] text-green-600 font-medium">Currently: {student.homework.completedPages} pages</p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Not uploaded</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={completedInputs[student.id] || ''}
                    onChange={e => setCompletedInputs(prev => ({ ...prev, [student.id]: e.target.value }))}
                    placeholder="Completed"
                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-center outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20 bg-white"
                  />
                  <span className="text-sm font-semibold text-slate-400 w-12 text-left">/ {targetPages}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
