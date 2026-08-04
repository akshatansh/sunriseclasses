import React from 'react';
import { Award, CheckCircle2, Download, Share2, FileText, ArrowLeft, MessageSquare, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MathRenderer from './MathRenderer';

interface EvaluatedReportCardProps {
  studentName: string;
  className: string;
  parentPhone?: string;
  testTitle: string;
  subject: string;
  score: number;
  totalMarks: number;
  questions: any[];
  subjectiveAnswers: Record<string, any>;
  teacherRemarks?: string;
  evaluatedAt?: string;
  onBack: () => void;
}

export const EvaluatedReportCard: React.FC<EvaluatedReportCardProps> = ({
  studentName,
  className,
  parentPhone,
  testTitle,
  subject,
  score,
  totalMarks,
  questions,
  subjectiveAnswers,
  teacherRemarks,
  evaluatedAt,
  onBack,
}) => {
  const percentage = Math.round((score / (totalMarks || 100)) * 100);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SUNRISE CLASSES & ACADEMY', 105, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Evaluated Subjective Test Report Card', 105, 25, { align: 'center' });

    // Student Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Student Name: ${studentName}`, 14, 45);
    doc.text(`Class: ${className}`, 14, 52);
    doc.text(`Test: ${testTitle} (${subject})`, 120, 45);
    doc.text(`Date: ${evaluatedAt ? new Date(evaluatedAt).toLocaleDateString() : 'N/A'}`, 120, 52);
    doc.text(`Total Score: ${score} / ${totalMarks} (${percentage}%)`, 14, 60);

    // Table Data
    const tableData = questions.map((q, idx) => {
      const ans = subjectiveAnswers[q.id] || {};
      return [
        `Q${idx + 1}`,
        q.question_text.slice(0, 40) + '...',
        `${ans.marks_awarded ?? 0} / ${q.marks || 5}`,
        ans.teacher_note || 'Checked',
      ];
    });

    autoTable(doc, {
      startY: 68,
      head: [['#', 'Question', 'Marks', 'Teacher Correction Note']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    if (teacherRemarks) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Teacher Remarks:', 14, finalY + 10);
      doc.setFont('helvetica', 'italic');
      doc.text(teacherRemarks, 14, finalY + 18);
    }

    doc.save(`${studentName.replace(/\s+/g, '_')}_Test_Report.pdf`);
  };

  const handleShareWhatsApp = () => {
    if (!parentPhone) return;
    const cleanPhone = parentPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = encodeURIComponent(
      `*SUNRISE CLASSES & ACADEMY*\n` +
      `📋 *Evaluated Test Report Card*\n\n` +
      `👤 *Student:* ${studentName}\n` +
      `🏫 *Class:* ${className}\n` +
      `📝 *Test:* ${testTitle} (${subject})\n` +
      `🎯 *Marks Obtained:* ${score} / ${totalMarks} (${percentage}%)\n` +
      `💬 *Teacher Remarks:* ${teacherRemarks || 'Checked'}\n\n` +
      `Great effort! Check portal for detailed question-by-question corrections.`
    );

    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-100 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Portal
          </button>
          
          <div className="flex items-center gap-3">
            {parentPhone && (
              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
              >
                <Share2 className="w-4 h-4" /> Send to Parent WhatsApp
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all"
            >
              <Download className="w-4 h-4" /> Download PDF Report Card
            </button>
          </div>
        </div>

        {/* Score Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">Checked Test Report</span>
            <h1 className="text-2xl font-black mt-2">{testTitle}</h1>
            <p className="text-xs text-blue-100 mt-1">Student: {studentName} ({className}) • Subject: {subject}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center min-w-36">
            <div className="text-3xl font-black">{score} <span className="text-sm font-normal text-blue-200">/ {totalMarks}</span></div>
            <div className="text-xs font-bold text-emerald-300 mt-1">{percentage}% Score</div>
          </div>
        </div>

        {teacherRemarks && (
          <div className="bg-amber-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-amber-200 dark:border-slate-700 flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Teacher Overall Remarks</h4>
              <p className="text-sm font-medium text-amber-900 dark:text-slate-200 mt-1">{teacherRemarks}</p>
            </div>
          </div>
        )}

        {/* Per Question Evaluation Breakdown */}
        <div className="space-y-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" /> Question-by-Question Detailed Corrections
          </h3>

          {questions.map((q, idx) => {
            const ans = subjectiveAnswers[q.id] || {};
            const awarded = ans.marks_awarded ?? 0;
            const fullMarks = q.marks || 5;
            const isFull = awarded === fullMarks;

            return (
              <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-blue-600">Question {idx + 1}</span>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-1">
                      <MathRenderer text={q.question_text} />
                    </h4>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isFull ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}>
                    {awarded} / {fullMarks} Marks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-slate-700/50">
                  {/* Student Answer */}
                  <div>
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase mb-1">Your Submitted Answer</h5>
                    {ans.image_url ? (
                      <img src={ans.image_url} alt="Answer" className="max-h-60 rounded-xl object-contain border border-gray-200 dark:border-slate-700" />
                    ) : ans.text_answer ? (
                      <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl text-xs font-mono">
                        <MathRenderer text={ans.text_answer} />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No answer submitted.</p>
                    )}
                  </div>

                  {/* Teacher Feedback Note */}
                  <div className="bg-blue-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700 space-y-2">
                    <h5 className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Teacher Correction Note
                    </h5>
                    <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      {ans.teacher_note || 'Checked cleanly.'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EvaluatedReportCard;
