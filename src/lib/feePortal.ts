import { supabase } from './supabase';
import type { StudentRecord } from './resultsPortal';

export interface FeePaymentRecord {
  id: string;
  student_id: string;
  month: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

export interface StudentFeeStatus extends StudentRecord {
  parent_phone?: string | null;
  feePaid: boolean;
  paymentAmount?: number;
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

export const getStudentsWithFeeStatus = async (month: string, className: '9th' | '10th' | 'all'): Promise<StudentFeeStatus[]> => {
  try {
    // 1. Get all students
    let studentQuery = supabase.from('students').select('*').order('name');
    if (className !== 'all') {
      studentQuery = studentQuery.ilike('class_name', `%${className}%`);
    }
    const { data: students, error: studentError } = await studentQuery;
    if (studentError) throw studentError;

    // 2. Get all fee payments for the selected month
    const { data: payments, error: paymentError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('month', month);
    if (paymentError) throw paymentError;

    // 3. Merge data
    const statusMap = new Map<string, FeePaymentRecord>();
    payments?.forEach(p => statusMap.set(p.student_id, p));

    return (students || []).map(student => {
      const payment = statusMap.get(student.id);
      return {
        ...student,
        feePaid: !!payment,
        paymentAmount: payment?.amount,
        paymentDate: payment?.payment_date,
        receiptId: payment?.id
      };
    });
  } catch (error) {
    console.error('Error fetching fee status:', error);
    return [];
  }
};

export const recordFeePayment = async (studentId: string, amount: number, month: string): Promise<string | null> => {
  try {
    const paymentDate = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('fee_payments')
      .insert([{
        student_id: studentId,
        month,
        amount,
        payment_date: paymentDate
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Error recording payment:', error);
    return null;
  }
};
