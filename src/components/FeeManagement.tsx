import React, { useState, useEffect } from 'react';
import { IndianRupee, MessageCircle, FileText, CheckCircle, Search, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStudentsWithFeeStatus, recordFeePayment, updateStudentPhone, type StudentFeeStatus } from '../lib/feePortal';

const FeeManagement = () => {
  const [month, setMonth] = useState('May 2026');
  const [students, setStudents] = useState<StudentFeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeStatus | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const monthsList = [
    'January 2026', 'February 2026', 'March 2026', 'April 2026', 'May 2026', 'June 2026',
    'July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026', 'December 2026'
  ];

  const loadData = async () => {
    setLoading(true);
    const data = await getStudentsWithFeeStatus(month, 'all');
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [month]);

  const handlePhoneSave = async (studentId: string, newPhone: string) => {
    // Only save if it changed and has some length
    const student = students.find(s => s.id === studentId);
    if (student?.parent_phone === newPhone) return;
    
    const success = await updateStudentPhone(studentId, newPhone);
    if (success) {
      setStudents(students.map(s => s.id === studentId ? { ...s, parent_phone: newPhone } : s));
    } else {
      alert('Failed to update phone number.');
    }
  };

  const getStudentDefaultFee = (className: string) => {
    const c = className.toLowerCase().replace(/\s+/g, '');
    if (c.includes('9')) return 500;
    if (c.includes('10')) return 700;
    return 500; // fallback
  };

  const handleQuickPay = async (student: StudentFeeStatus) => {
    const amountNum = getStudentDefaultFee(student.className);
    
    const receiptId = await recordFeePayment(student.id, amountNum, month);
    if (receiptId) {
      loadData(); // Reload to reflect changes
    } else {
      alert('Failed to record payment.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount) return;
    
    const amountNum = Number(paymentAmount);
    const receiptId = await recordFeePayment(selectedStudent.id, amountNum, month);
    
    if (receiptId) {
      setPaymentModalOpen(false);
      loadData(); // Reload to reflect changes
      alert('Payment recorded successfully!');
    } else {
      alert('Failed to record payment.');
    }
  };

  const handleSendReminder = (student: StudentFeeStatus) => {
    if (!student.parent_phone) {
      alert('Pehle student ka phone number set kijiye.');
      return;
    }
    const message = `Dear Parent, \nSunrise Classes & Academy inform karta hai ki student *${student.name}* (Class ${student.className}) ki *${month}* mahine ki fees due hai. Kripya samay par jama karein.\n- Sunrise Classes`;
    const whatsappUrl = `https://wa.me/91${student.parent_phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleDownloadReceipt = (student: StudentFeeStatus) => {
    if (!student.feePaid || !student.paymentAmount || !student.paymentDate) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const pageW = doc.internal.pageSize.getWidth();
    
    doc.setFillColor(15, 42, 92);
    doc.rect(0, 0, pageW, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Sunrise Classes & Academy', pageW / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Champanagar, Purnia, Bihar', pageW / 2, 22, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FEE RECEIPT', pageW / 2, 45, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Receipt No: SRC-${student.receiptId?.slice(0,6).toUpperCase()}`, 10, 60);
    doc.text(`Date: ${new Date(student.paymentDate).toLocaleDateString('en-IN')}`, pageW - 40, 60);

    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Details']],
      body: [
        ['Student Name', student.name],
        ['Class', student.className],
        ['Fee Month', month],
        ['Amount Paid', `Rs. ${student.paymentAmount}`],
        ['Payment Status', 'SUCCESS'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 42, 92] }
    });

    doc.setFontSize(8);
    doc.text('This is a computer-generated receipt and does not require a signature.', pageW / 2, 180, { align: 'center' });
    
    doc.save(`Fee_Receipt_${student.name}_${month}.pdf`);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPaid = students.filter(s => s.feePaid).reduce((acc, s) => acc + (s.paymentAmount || 0), 0);
  const totalPending = students.filter(s => !s.feePaid).length;

  return (
    <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500 text-white">
            <IndianRupee size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0f2a5c]">Fee Management</h2>
            <p className="text-sm text-slate-500">Track and manage monthly fees</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-green-500 text-sm"
            />
          </div>
          <select 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-green-500 text-sm font-semibold text-slate-700 bg-white"
          >
            {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs uppercase font-bold text-green-600 mb-1">Total Collection</p>
          <p className="text-2xl font-black text-green-700">₹{totalPaid}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs uppercase font-bold text-red-600 mb-1">Pending Students</p>
          <p className="text-2xl font-black text-red-700">{totalPending}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs uppercase font-bold text-blue-600 mb-1">Paid Students</p>
          <p className="text-2xl font-black text-blue-700">{students.filter(s=>s.feePaid).length}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Parent's Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="py-10 text-center text-slate-500">Loading fee data...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-slate-500">No students found.</td></tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#0f2a5c]">{student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{student.className}</td>
                  <td className="px-4 py-3">
                    <input 
                      type="text" 
                      defaultValue={student.parent_phone || ''}
                      onBlur={(e) => handlePhoneSave(student.id, e.target.value)}
                      className="border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white bg-slate-50 rounded px-2 py-1 w-32 text-xs outline-none transition-all"
                      placeholder="Type & click away..."
                    />
                  </td>
                  <td className="px-4 py-3">
                    {student.feePaid ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        <CheckCircle size={12} /> Paid ₹{student.paymentAmount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!student.feePaid ? (
                        <>
                          <button 
                            onClick={() => handleSendReminder(student)}
                            className="inline-flex items-center gap-1 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            <MessageCircle size={14} /> Reminder
                          </button>
                          <button 
                            onClick={() => handleQuickPay(student)}
                            className="bg-blue-500 text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            Quick Pay ₹{getStudentDefaultFee(student.className)}
                          </button>
                          <button 
                            onClick={() => { setSelectedStudent(student); setPaymentAmount(''); setPaymentModalOpen(true); }}
                            className="text-slate-400 hover:text-blue-500 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            title="Custom Amount"
                          >
                            ...
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleDownloadReceipt(student)}
                          className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 hover:bg-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          <FileText size={14} /> Receipt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-bold text-[#0f2a5c] mb-1">Record Fee Payment</h3>
            <p className="text-sm text-slate-500 mb-4">{selectedStudent.name} • {month}</p>
            
            <form onSubmit={handleRecordPayment}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1">Amount (₹)</label>
                <input 
                  type="number" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-500"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm transition-colors"
                >
                  Confirm Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeManagement;
