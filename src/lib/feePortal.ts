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
      
      const paymentAmount = payment ? Number(payment.amount) : 0;
      const totalFee = payment ? Number(payment.total_fee) : 0;
      const dueAmount = payment ? Math.max(0, totalFee - paymentAmount) : 0;
      
      // Fully paid if payment exists and dueAmount is 0
      const isFullyPaid = !!payment && dueAmount === 0;
      // Partial if payment exists but dueAmount > 0
      const isPartial = !!payment && dueAmount > 0;

      return {
        id: student.id,
        name: student.name,
        className: student.class_name,
        image: student.image,
        fatherName: student.father_name,
        parentPhone: student.parent_phone,
        createdAt: student.created_at,
        feePaid: isFullyPaid,
        isPartial: isPartial,
        paymentAmount: paymentAmount,
        totalFee: totalFee,
        dueAmount: dueAmount,
        paymentDate: payment?.payment_date,
        receiptId: payment?.id
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
