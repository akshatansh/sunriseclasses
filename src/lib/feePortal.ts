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
  currentMonthFee?: number;
  dueAmount?: number;
  isPartial?: boolean;
  paymentDate?: string;
  receiptId?: string;
  
  // New exact breakdown fields
  initialPreviousDues?: number;
  remainingPreviousDues?: number;
  paidTowardsPreviousDues?: number;
  
  paidTowardsCurrentMonth?: number;
  remainingCurrentMonthFee?: number;
  
  openingBalance?: number;
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

export const getStudentsWithFeeStatus = async (month: string, className: '8th' | '9th' | '10th' | 'all'): Promise<StudentFeeStatus[]> => {
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

    const startIndex = MONTHS.indexOf('May 2026');
    const selectedMonthIndex = MONTHS.indexOf(month);

    // Get current calendar month
    const now = new Date();
    const currentCalendarMonthLabel = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`;
    const currentCalendarMonthIndex = MONTHS.indexOf(currentCalendarMonthLabel);

    return (students || []).map(student => {
      const defaultFee = getDefaultFee(student.class_name);
      const openingBalance = Math.max(0, Number(student.opening_balance) || 0);

      // Ledger running balance starting from May 2026 up to the selected month
      let runningBalance = openingBalance;
      let balanceBeforeSelectedMonth = openingBalance;

      if (startIndex !== -1 && selectedMonthIndex >= startIndex) {
        for (let i = startIndex; i <= selectedMonthIndex; i++) {
          const m = MONTHS[i];
          const p = allPayments?.find(x => x.student_id === student.id && x.month === m);
          const feeForMonth = p ? Number(p.total_fee) : defaultFee;
          const paidForMonth = p ? Number(p.amount) : 0;

          if (i === selectedMonthIndex) {
            balanceBeforeSelectedMonth = runningBalance;
          }

          runningBalance += feeForMonth - paidForMonth;
        }
      }

      // Selected month details
      const currentP = allPayments?.find(x => x.student_id === student.id && x.month === month);
      const currentMonthFee = currentP ? Number(currentP.total_fee) : defaultFee;
      const paidThisMonth = currentP ? Number(currentP.amount) : 0;

      // Current month fee is due if the selected month is in the past relative to current calendar month
      const isSelectedMonthFeeDue = currentCalendarMonthIndex === -1 || selectedMonthIndex < currentCalendarMonthIndex;

      let totalFee = 0;
      let dueAmount = 0;

      if (isSelectedMonthFeeDue) {
        totalFee = Math.max(0, balanceBeforeSelectedMonth) + currentMonthFee;
        dueAmount = Math.max(0, balanceBeforeSelectedMonth + currentMonthFee - paidThisMonth);
      } else {
        totalFee = Math.max(0, balanceBeforeSelectedMonth);
        dueAmount = Math.max(0, balanceBeforeSelectedMonth - paidThisMonth);
      }

      // Breakdown for the UI
      const initialPreviousDues = Math.max(0, balanceBeforeSelectedMonth);
      const paidTowardsPreviousDues = Math.min(paidThisMonth, initialPreviousDues);
      const remainingPreviousDues = initialPreviousDues - paidTowardsPreviousDues;

      const paidTowardsCurrentMonth = Math.max(0, paidThisMonth - paidTowardsPreviousDues);
      const remainingCurrentMonthFee = Math.max(0, currentMonthFee - paidTowardsCurrentMonth);

      const feePaid = dueAmount <= 0;
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
        totalFee,
        currentMonthFee,
        dueAmount,
        initialPreviousDues,
        remainingPreviousDues,
        paidTowardsPreviousDues,
        paidTowardsCurrentMonth,
        remainingCurrentMonthFee,
        openingBalance,
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

    // 1. Get student details to check class and opening balance
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();
    if (studentError) throw studentError;

    // 2. Get all payments for this student
    const { data: allPayments, error: paymentError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('student_id', studentId);
    if (paymentError) throw paymentError;

    const defaultFee = getDefaultFee(student.class_name);
    let remainingAmount = amountPayingNow;
    let lastInsertedOrUpdatedId: string | null = null;

    // Find current calendar month
    const now = new Date();
    const currentMonthLabel = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`;
    const currentMonthIndex = MONTHS.indexOf(currentMonthLabel);
    const startIndex = MONTHS.indexOf('May 2026');

    // We will distribute payments starting from May 2026 up to the current calendar month
    const limitMonthIndex = currentMonthIndex !== -1 ? currentMonthIndex : MONTHS.length - 1;

    for (let i = startIndex; i <= limitMonthIndex; i++) {
      if (remainingAmount <= 0) break;

      const m = MONTHS[i];
      const existing = allPayments?.find(x => x.month === m);
      const expected = existing ? Number(existing.total_fee) : defaultFee;
      const alreadyPaid = existing ? Number(existing.amount) : 0;
      const dueForMonth = Math.max(0, expected - alreadyPaid);

      if (dueForMonth > 0) {
        const paying = Math.min(remainingAmount, dueForMonth);
        remainingAmount -= paying;

        if (existing) {
          const { data, error } = await supabase
            .from('fee_payments')
            .update({ amount: alreadyPaid + paying, payment_date: paymentDate })
            .eq('id', existing.id)
            .select('id')
            .single();
          if (error) throw error;
          lastInsertedOrUpdatedId = data?.id || null;
        } else {
          const { data, error } = await supabase
            .from('fee_payments')
            .insert([{
              student_id: studentId,
              month: m,
              amount: paying,
              total_fee: expected,
              payment_date: paymentDate
            }])
            .select('id')
            .single();
          if (error) throw error;
          lastInsertedOrUpdatedId = data?.id || null;
        }
      }
    }

    // If there is still a remaining amount, record/add it to the current calendar month
    if (remainingAmount > 0) {
      const activeMonth = currentMonthIndex !== -1 ? currentMonthLabel : month;
      const existing = allPayments?.find(x => x.month === activeMonth);
      const expected = existing ? Number(existing.total_fee) : defaultFee;
      const alreadyPaid = existing ? Number(existing.amount) : 0;

      if (existing) {
        const { data, error } = await supabase
          .from('fee_payments')
          .update({ amount: alreadyPaid + remainingAmount, payment_date: paymentDate })
          .eq('id', existing.id)
          .select('id')
          .single();
        if (error) throw error;
        lastInsertedOrUpdatedId = data?.id || null;
      } else {
        const { data, error } = await supabase
          .from('fee_payments')
          .insert([{
            student_id: studentId,
            month: activeMonth,
            amount: remainingAmount,
            total_fee: expected,
            payment_date: paymentDate
          }])
          .select('id')
          .single();
        if (error) throw error;
        lastInsertedOrUpdatedId = data?.id || null;
      }
    }

    return lastInsertedOrUpdatedId;
  } catch (error) {
    console.error('Error recording payment:', error);
    return null;
  }
};
export const updateStudentOpeningBalance = async (studentId: string, openingBalance: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('students')
      .update({ opening_balance: openingBalance })
      .eq('id', studentId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating opening balance:', error);
    return false;
  }
};

export const getStudentPaymentHistory = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
};
