import { supabase } from './supabase';
import type { StudentRecord } from './resultsPortal';

export interface FeePaymentRecord {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  total_fee: number;
  payment_date: string;
  created_at: string;
}

export interface StudentFeeStatus extends StudentRecord {
  fatherName?: string | null;
  parentPhone?: string | null;
  feePaid: boolean;
  paymentAmount?: number;
  totalFee?: number;
  dueAmount?: number;
  isPartial?: boolean;
  paymentDate?: string;
  receiptId?: string;
}

export const updateStudentPhone = async (studentId: string, phone: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('students')
      .update({ parent_phone: phone })
      .eq('id', studentId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating phone:', error);
    return false;
  }
};

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

export const getStudentsWithFeeStatus = async (month: string, className: '9th' | '10th' | 'all'): Promise<StudentFeeStatus[]> => {
  try {
    // 1. Get all students
    let studentQuery = supabase.from('students').select('*').order('name');
    if (className !== 'all') {
      studentQuery = studentQuery.ilike('class_name', `%${className}%`);
    }
    const { data: students, error: studentError } = await studentQuery;
    if (studentError) throw studentError;

    // 2. Get all fee payments for ALL months to calculate running balance
    const { data: allPayments, error: paymentError } = await supabase
      .from('fee_payments')
      .select('*');
    if (paymentError) throw paymentError;

    const startIndex = MONTHS.indexOf('April 2026');
    const currentMonthIndex = MONTHS.indexOf(month);

    return (students || []).map(student => {
      const defaultFee = getDefaultFee(student.class_name);
      
      let expectedBefore = 0;
      let paidBefore = 0;

      // Calculate previous dues from April 2026 up to the month BEFORE the selected month
      if (startIndex !== -1 && currentMonthIndex > startIndex) {
        for (let i = startIndex; i < currentMonthIndex; i++) {
          const m = MONTHS[i];
          const p = allPayments?.find(x => x.student_id === student.id && x.month === m);
          expectedBefore += p ? Number(p.total_fee) : defaultFee;
          paidBefore += p ? Number(p.amount) : 0;
        }
      }
      
      const previousDues = Math.max(0, expectedBefore - paidBefore);

      // Current month details
      const currentP = allPayments?.find(x => x.student_id === student.id && x.month === month);
      const currentMonthFee = currentP ? Number(currentP.total_fee) : defaultFee;
      const paidThisMonth = currentP ? Number(currentP.amount) : 0;
      
      const totalPayableThisMonth = previousDues + currentMonthFee;
      const dueAmount = Math.max(0, totalPayableThisMonth - paidThisMonth);

      const feePaid = dueAmount === 0;
      const isPartial = dueAmount > 0 && paidThisMonth > 0;

      return {
        id: student.id,
        name: student.name,
        className: student.class_name,
        image: student.image,
        fatherName: student.father_name,
        parentPhone: student.parent_phone,
        createdAt: student.created_at,
        feePaid,
        isPartial,
        paymentAmount: paidThisMonth,
        totalFee: totalPayableThisMonth,
        dueAmount,
        previousDues,
        paymentDate: currentP?.payment_date,
        receiptId: currentP?.id
      };
    });
  } catch (error) {
    console.error('Error fetching fee status:', error);
    return [];
  }
};

export const recordFeePayment = async (studentId: string, amountPayingNow: number, month: string, totalFee: number): Promise<string | null> => {
  try {
    const paymentDate = new Date().toISOString().split('T')[0];
    
    // Check if record already exists for partial payment
    const { data: existing } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('student_id', studentId)
      .eq('month', month)
      .single();

    if (existing) {
      // Add to existing amount
      const newAmount = Number(existing.amount) + amountPayingNow;
      const { data, error } = await supabase
        .from('fee_payments')
        .update({ amount: newAmount, payment_date: paymentDate })
        .eq('id', existing.id)
        .select('id')
        .single();
        
      if (error) throw error;
      return data?.id || null;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('fee_payments')
        .insert([{
          student_id: studentId,
          month,
          amount: amountPayingNow,
          total_fee: totalFee,
          payment_date: paymentDate
        }])
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    return null;
  }
};
