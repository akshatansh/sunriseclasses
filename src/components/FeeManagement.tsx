import React, { useState, useEffect, useCallback } from 'react';
import { IndianRupee, MessageCircle, FileText, CheckCircle, Search, X, Phone, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawPDFHeader, drawPDFFooter, drawWatermark, drawOfficialStamp } from '../lib/pdfUtils';
import { getStudentsWithFeeStatus, recordFeePayment, updateStudentPhone, updateStudentOpeningBalance, type StudentFeeStatus } from '../lib/feePortal';

const MONTHS = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
  'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'
];

const getDefaultFee = (className?: string | null) => {
  if (!className) return 500;
  const c = className.toLowerCase();
  if (c.includes('10')) return 1000;
  if (c.includes('9')) return 500;
  return 500;
};

const FeeManagement = () => {
  const [month, setMonth] = useState('May 2026');
  const [students, setStudents] = useState<StudentFeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('pending');

  // Payment Modal
  const [paymentModalStudent, setPaymentModalStudent] = useState<StudentFeeStatus | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentModalTotalFee, setPaymentModalTotalFee] = useState('');

  // Phone modal
  const [phoneModalStudent, setPhoneModalStudent] = useState<StudentFeeStatus | null>(null);
  const [phoneValue, setPhoneValue] = useState('');

  // Opening Balance modal
  const [obModalStudent, setObModalStudent] = useState<StudentFeeStatus | null>(null);
  const [obValue, setObValue] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getStudentsWithFeeStatus(month, 'all');
    setStudents(data);
    setLoading(false);
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePhoneSave = async () => {
    if (!phoneModalStudent) return;
    const clean = phoneValue.replace(/\D/g, '');
    const success = await updateStudentPhone(phoneModalStudent.id, clean);
    if (success) {
      setStudents(prev => prev.map(s => s.id === phoneModalStudent.id ? { ...s, parent_phone: clean } : s));
      setPhoneModalStudent(null);
    } else {
      alert('Phone save karne mein dikkat aaye.');
    }
  };

  const handleObSave = async () => {
    if (!obModalStudent) return;
    const amount = Number(obValue);
    if (isNaN(amount) || amount < 0) { alert('Valid amount daalo'); return; }
    const success = await updateStudentOpeningBalance(obModalStudent.id, amount);
    if (success) {
      setObModalStudent(null);
      loadData();
    } else {
      alert('Opening balance save nahi hua.');
    }
  };

  const handleQuickPay = async (student: StudentFeeStatus) => {
    const amount = getDefaultFee(student.className);
    const receiptId = await recordFeePayment(student.id, amount, month, amount);
    if (receiptId) loadData();
    else alert('Payment save nahi hui.');
  };

  const handleCustomPay = async () => {
    if (!paymentModalStudent || !paymentAmount) return;
    const amount = Number(paymentAmount);
    const totalFee = paymentModalStudent.isPartial 
      ? (paymentModalStudent.totalFee || getDefaultFee(paymentModalStudent.className))
      : Number(paymentModalTotalFee || getDefaultFee(paymentModalStudent.className));

    const receiptId = await recordFeePayment(paymentModalStudent.id, amount, month, totalFee);
    if (receiptId) {
      setPaymentModalStudent(null);
      loadData();
    } else {
      alert('Payment save nahi hui.');
    }
  };

  const handleReminder = (student: StudentFeeStatus) => {
    if (!student.parentPhone) {
      setPhoneModalStudent(student);
      setPhoneValue('');
      return;
    }
    let phone = student.parentPhone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const msg = `Dear Parent, \nSunrise Classes & Academy inform karta hai ki student *${student.name}* (Class ${student.className}) ki *${month}* mahine ki fees due hai. Kripya samay par jama karein.\n- Sunrise Classes`;
    const a = document.createElement('a');
    a.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReceipt = async (student: StudentFeeStatus) => {
    if (!student.feePaid || !student.paymentAmount || !student.paymentDate) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const pageW = doc.internal.pageSize.getWidth();

    // Branded header with logo
    const dateStr = new Date(student.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const startY = await drawPDFHeader(doc, 'FEE RECEIPT');

    // Receipt meta row
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 42, 92);
    doc.text(`Receipt No: SRC-${student.receiptId?.slice(0, 6).toUpperCase() ?? 'XXXXXX'}`, 10, startY + 2);
    doc.text(`Date: ${dateStr}`, pageW - 10, startY + 2, { align: 'right' });

    autoTable(doc, {
      startY: startY + 8,
      head: [['Description', 'Details']],
      body: [
        ['Student Name', student.name],
        ...(student.fatherName ? [["Father's Name", student.fatherName]] : []),
        ...(student.parentPhone ? [['Mobile No.', student.parentPhone]] : []),
        ['Class', student.className],
        ['Fee Month', month],
        ['Total Monthly Fee', `Rs. ${student.totalFee}`],
        ['Amount Paid', `Rs. ${student.paymentAmount}`],
        ['Balance Due', `Rs. ${student.dueAmount}`],
        ['Status', student.dueAmount && student.dueAmount > 0 ? 'PARTIAL PAYMENT' : 'PAID ✔'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 42, 92], textColor: [245, 166, 35], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      margin: { left: 10, right: 10 },
      styles: { cellPadding: 3, lineColor: [220, 230, 245], lineWidth: 0.2 },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Draw watermark and official stamp
    drawWatermark(doc);
    drawOfficialStamp(doc, finalY + 20);

    drawPDFFooter(doc);
    doc.save(`Receipt_${student.name}_${month}.pdf`);
  };

  const handleDownloadReport = async () => {
    if (students.length === 0) {
      alert('No students to generate report');
      return;
    }
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const startY = await drawPDFHeader(doc, `Monthly Fee Report - ${month}`);
    
    const tableData = students.map((s, i) => [
      i + 1,
      s.name,
      s.className,
      s.parentPhone || 'N/A',
      `Rs. ${s.previousDues || 0}`,
      `Rs. ${s.totalFee || 0}`,
      `Rs. ${s.paymentAmount || 0}`,
      `Rs. ${s.dueAmount || 0}`,
      s.feePaid ? 'PAID' : s.isPartial ? 'PARTIAL' : 'PENDING'
    ]);

    autoTable(doc, {
      startY: startY + 5,
      head: [['S.No', 'Student Name', 'Class', 'Phone', 'Prev. Dues', 'Total Payable', 'Paid', 'Total Due', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 42, 92], textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          if (data.cell.raw === 'PAID') data.cell.styles.textColor = [21, 128, 61];
          else if (data.cell.raw === 'PARTIAL') data.cell.styles.textColor = [234, 88, 12];
          else data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    drawPDFFooter(doc);
    doc.save(`Fee_Report_${month.replace(' ', '_')}.pdf`);
  };

  const displayed = students.filter(s => {
    const matchSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'pending') return matchSearch && !s.feePaid && !s.isPartial;
    if (filter === 'partial') return matchSearch && s.isPartial;
    if (filter === 'paid') return matchSearch && s.feePaid;
    return matchSearch;
  });

  const totalPaid = students.reduce((a, s) => a + (s.paymentAmount || 0), 0);
  const paidCount = students.filter(s => s.feePaid).length;
  const partialCount = students.filter(s => s.isPartial).length;
  const pendingCount = students.filter(s => !s.feePaid && !s.isPartial).length;

  return (
    <div>
      {/* ── Month selector ── */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-full appearance-none bg-[#0f2a5c] text-white font-bold text-base px-4 py-3 rounded-2xl outline-none pr-10 shadow"
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" size={20} />
        </div>
        <button
          onClick={handleDownloadReport}
          className="bg-blue-50 border border-blue-200 text-blue-700 font-bold px-4 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm whitespace-nowrap active:opacity-80 transition-colors hover:bg-blue-100"
        >
          <FileText size={18} />
          Report
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-sm text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Collection</p>
          <p className="text-sm sm:text-lg font-black text-green-600">₹{totalPaid}</p>
        </div>
        <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-sm text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Paid</p>
          <p className="text-sm sm:text-lg font-black text-blue-600">{paidCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-sm text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Partial</p>
          <p className="text-sm sm:text-lg font-black text-orange-500">{partialCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-sm text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Pending</p>
          <p className="text-sm sm:text-lg font-black text-red-500">{pendingCount}</p>
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Student search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none text-sm focus:border-[#0f2a5c]"
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white text-xs font-bold">
          {(['pending', 'partial', 'paid', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2 sm:px-3 py-2 capitalize transition-colors ${filter === f ? 'bg-[#0f2a5c] text-white' : 'text-slate-500'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Student Cards ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="py-16 text-center text-slate-400 font-semibold">Koi student nahi mila</div>
      ) : (
        <div className="space-y-3">
          {displayed.map(student => (
            <div key={student.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={student.image || '/sunrise-logo.png'}
                    onError={e => (e.currentTarget.src = '/sunrise-logo.png')}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                    alt={student.name}
                  />
                  <div>
                    <p className="font-bold text-[#0f2a5c] text-sm">{student.name}</p>
                    <div className="flex flex-col text-[11px] text-slate-500 mt-0.5 leading-tight">
                      <span>{student.className}</span>
                      {student.fatherName && <span>S/O {student.fatherName}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {student.feePaid ? (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                      <CheckCircle size={11} /> ₹{student.paymentAmount}
                    </span>
                  ) : student.isPartial ? (
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                      Partial: ₹{student.paymentAmount}
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                      Pending
                    </span>
                  )}
                  {(student.previousDues || 0) > 0 && (
                    <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      Prev Due: ₹{student.previousDues}
                    </span>
                  )}
                </div>
              </div>

              {/* Opening Balance row */}
              <div className="flex items-center gap-2 mb-3">
                <IndianRupee size={12} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 flex-1">
                  Opening Balance: <span className="font-bold text-orange-600">₹{student.openingBalance || 0}</span>
                </span>
                <button
                  onClick={() => { setObModalStudent(student); setObValue(String(student.openingBalance || 0)); }}
                  className="text-xs text-orange-500 font-semibold shrink-0"
                >
                  {(student.openingBalance || 0) > 0 ? 'Edit' : 'Set'}
                </button>
              </div>
              {/* Phone row */}
              <div className="flex items-center gap-2 mb-3">
                <Phone size={12} className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 flex-1 truncate">
                  {student.parentPhone || <span className="italic text-slate-300">Phone not set</span>}
                </span>
                <button
                  onClick={() => { setPhoneModalStudent(student); setPhoneValue(student.parentPhone || ''); }}
                  className="text-xs text-blue-500 font-semibold shrink-0"
                >
                  {student.parentPhone ? 'Edit' : 'Add'}
                </button>
              </div>

              {/* Action Buttons */}
              {!student.feePaid ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReminder(student)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#e7fbe9] text-[#25D366] hover:bg-[#25D366] hover:text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </button>
                    {!student.isPartial && (
                      <button
                        onClick={() => handleQuickPay(student)}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#0f2a5c] text-white font-bold text-xs py-2.5 rounded-xl active:opacity-80"
                      >
                        Quick Pay ₹{getDefaultFee(student.className)}
                      </button>
                    )}
                    <button
                      onClick={() => { setPaymentModalStudent(student); setPaymentAmount(''); setPaymentModalTotalFee(''); }}
                      className="flex items-center justify-center bg-slate-100 text-slate-500 font-bold text-xs px-3 py-2.5 rounded-xl"
                      title="Custom Amount"
                    >
                      ···
                    </button>
                  </div>
                  {student.isPartial && (
                    <button
                      onClick={() => { setPaymentModalStudent(student); setPaymentAmount(String(student.dueAmount)); setPaymentModalTotalFee(''); }}
                      className="w-full flex items-center justify-center gap-1 bg-[#f5a623] text-[#0f2a5c] font-bold text-xs py-2.5 rounded-xl active:opacity-80 mt-1"
                    >
                      Pay Remaining ₹{student.dueAmount}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleReceipt(student)}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs py-2.5 rounded-xl transition-colors"
                >
                  <FileText size={14} /> Download Receipt
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Custom Amount Modal ── */}
      {paymentModalStudent && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPaymentModalStudent(null)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-[#0f2a5c] mb-0.5">Custom Payment</h3>
            <p className="text-sm text-slate-500 mb-4">{paymentModalStudent.name} • {month}</p>
            
            {!paymentModalStudent.isPartial ? (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1">Total Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={paymentModalTotalFee || getDefaultFee(paymentModalStudent.className)}
                    onChange={e => setPaymentModalTotalFee(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#0f2a5c] font-bold mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 ml-1">Amount Paying Now (₹)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full border border-[#f5a623] rounded-xl px-4 py-2.5 outline-none focus:border-[#0f2a5c] font-bold text-lg mt-1"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-3">
                  <p className="text-xs text-orange-800 font-bold">Total Fee: ₹{paymentModalStudent.totalFee}</p>
                  <p className="text-xs text-orange-800 font-bold">Paid So Far: ₹{paymentModalStudent.paymentAmount}</p>
                  <p className="text-sm text-red-600 font-black mt-1">Due Amount: ₹{paymentModalStudent.dueAmount}</p>
                </div>
                <label className="text-xs font-bold text-slate-500 ml-1">Amount Paying Now (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder={`Max: ${paymentModalStudent.dueAmount}`}
                  max={paymentModalStudent.dueAmount}
                  className="w-full border border-[#f5a623] rounded-xl px-4 py-3 outline-none focus:border-[#0f2a5c] font-bold text-lg mt-1"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button onClick={() => setPaymentModalStudent(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleCustomPay} className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold">Confirm Paid</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Phone Number Modal ── */}
      {phoneModalStudent && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPhoneModalStudent(null)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-[#0f2a5c] mb-0.5">Parent's Phone</h3>
            <p className="text-sm text-slate-500 mb-4">{phoneModalStudent.name}</p>
            <input
              type="tel"
              value={phoneValue}
              onChange={e => setPhoneValue(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-[#0f2a5c] text-lg font-bold mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setPhoneModalStudent(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold">Cancel</button>
              <button onClick={handlePhoneSave} className="flex-1 bg-[#0f2a5c] text-white py-3 rounded-2xl font-bold">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Opening Balance Modal ── */}
      {obModalStudent && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setObModalStudent(null)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-sm shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-[#0f2a5c] mb-0.5">Opening Balance</h3>
            <p className="text-sm text-slate-500 mb-1">{obModalStudent.name}</p>
            <p className="text-xs text-slate-400 mb-4">Pehle se due amount daalo (ek baar set karo)</p>
            <input
              type="number"
              value={obValue}
              onChange={e => setObValue(e.target.value)}
              placeholder="₹ Pehle se due amount"
              className="w-full border border-[#f5a623] rounded-2xl px-4 py-3 outline-none focus:border-[#0f2a5c] text-lg font-bold mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setObModalStudent(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleObSave} className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeManagement;
