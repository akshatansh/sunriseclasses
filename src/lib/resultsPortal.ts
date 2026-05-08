import { supabase } from './supabase';

const ENABLE_DUMMY_DATA = false; // Dummy marks disabled - only real Supabase data shown

export interface StudentRecord {
  id: string;
  name: string;
  className: string;
  image: string;
  fatherName?: string;
  parentPhone?: string;
  pin?: string;
  createdAt: string;
}

export interface TestResultRecord {
  id: string;
  studentId: string;
  testName: string;
  subject: string;
  testDate: string;
  marksObtained: number;
  totalMarks: number;
  createdAt: string;
}

export interface ResultsPortalData {
  students: StudentRecord[];
  results: TestResultRecord[];
}

export interface StudentMonthlySummary {
  student: StudentRecord;
  totalMarksObtained: number;
  totalMarksPossible: number;
  percentage: number;
  testCount: number;
  tests: TestResultRecord[];
}

const defaultData: ResultsPortalData = {
  students: [],
  results: [],
};

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const generateRandomPin = () => Math.floor(1000 + Math.random() * 9000).toString();

export async function loadResultsPortalData(): Promise<ResultsPortalData> {
  try {
    const [{ data: studentsData, error: studentError }, { data: resultsData, error: resultsError }, { data: onlineAttemptsData }] = await Promise.all([
      supabase.from('students').select('*'),
      supabase.from('test_results').select('*'),
      supabase.from('online_test_attempts').select('*, online_tests(*)')
    ]);

    if (studentError) console.error("Supabase student fetch error:", studentError);
    if (resultsError) console.error("Supabase results fetch error:", resultsError);

    const students: StudentRecord[] = (studentsData || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      className: s.class_name,
      image: s.image,
      fatherName: s.father_name,
      parentPhone: s.parent_phone,
      pin: s.pin,
      createdAt: s.created_at
    }));

    const results: TestResultRecord[] = (resultsData || []).map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      testName: r.test_name,
      subject: r.subject,
      testDate: r.test_date,
      marksObtained: Number(r.marks_obtained),
      totalMarks: Number(r.total_marks),
      createdAt: r.created_at
    }));

    if (onlineAttemptsData) {
      onlineAttemptsData.forEach((att: any) => {
        if (att.online_tests && att.is_completed && att.submitted_at) {
          results.push({
            id: att.id,
            studentId: att.student_id,
            testName: att.online_tests.title + ' (Online)',
            subject: att.online_tests.subject,
            testDate: att.submitted_at,
            marksObtained: Number(att.score),
            totalMarks: Number(att.total_marks),
            createdAt: att.submitted_at
          });
        }
      });
    }

    // Dummy data disabled - only real test results from Supabase are shown

    return { students, results };
  } catch (error) {
    console.error("Failed to load data from Supabase:", error);
    return defaultData;
  }
}

// We will keep saveResultsPortalData but make it async for compatibility,
// however we will also provide specific DB mutation functions that AdminResultsPage can use.
export async function saveResultsPortalData(data: ResultsPortalData) {
  // Deprecated for Supabase usage, do nothing here. Use explicit add/delete functions instead.
  console.warn("saveResultsPortalData is deprecated. Use direct Supabase insert/delete.");
}

export async function addStudentToDB(student: Omit<StudentRecord, 'id' | 'createdAt'>) {
  const { data, error } = await supabase.from('students').insert({
    name: student.name,
    class_name: student.className,
    image: student.image,
    father_name: student.fatherName,
    parent_phone: student.parentPhone,
    pin: student.pin || generateRandomPin(),
  }).select().single();

  if (error) throw error;
  return data;
}

export async function addTestResultsToDB(results: Omit<TestResultRecord, 'id' | 'createdAt'>[]) {
  if (results.length === 0) return;
  const insertData = results.map(r => ({
    student_id: r.studentId,
    test_name: r.testName,
    subject: r.subject,
    test_date: r.testDate,
    marks_obtained: r.marksObtained,
    total_marks: r.totalMarks,
  }));
  const { error } = await supabase.from('test_results').insert(insertData);
  if (error) throw error;
}

export async function deleteStudentFromDB(id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function updateStudentInDB(id: string, student: { name: string; className: string; fatherName?: string | null; parentPhone?: string | null; pin?: string }) {
  const { error } = await supabase.from('students').update({
    name: student.name,
    class_name: student.className,
    father_name: student.fatherName || null,
    parent_phone: student.parentPhone || null,
    pin: student.pin || generateRandomPin(),
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteTestResultFromDB(id: string) {
  const { error } = await supabase.from('test_results').delete().eq('id', id);
  if (error) throw error;
}

export async function updateTestResultInDB(id: string, marksObtained: number) {
  const { error } = await supabase
    .from('test_results')
    .update({ marks_obtained: marksObtained })
    .eq('id', id);
  if (error) throw error;
}

/**
 * BATCH: Graduate Class 10
 * - Deletes all test results for Class 10 students
 * - Deletes all Class 10 students
 */
export async function graduateClass10(): Promise<number> {
  // Get all class 10 students
  const { data: students, error: fetchErr } = await supabase
    .from('students')
    .select('id')
    .ilike('class_name', '%10%');
  if (fetchErr) throw fetchErr;
  if (!students || students.length === 0) return 0;

  const ids = students.map((s: any) => s.id);

  // Delete their results first (FK constraint)
  const { error: resErr } = await supabase
    .from('test_results')
    .delete()
    .in('student_id', ids);
  if (resErr) throw resErr;

  // Delete the students
  const { error: stuErr } = await supabase
    .from('students')
    .delete()
    .in('id', ids);
  if (stuErr) throw stuErr;

  return ids.length;
}

/**
 * BATCH: Promote Class 9 → Class 10
 * - Clears all existing test results for Class 9 students (fresh start)
 * - Updates their class_name to 'Class 10'
 */
export async function promoteClass9To10(): Promise<number> {
  // Get all class 9 students
  const { data: students, error: fetchErr } = await supabase
    .from('students')
    .select('id')
    .ilike('class_name', '%9%');
  if (fetchErr) throw fetchErr;
  if (!students || students.length === 0) return 0;

  const ids = students.map((s: any) => s.id);

  // Clear old results (new academic year = fresh start)
  const { error: resErr } = await supabase
    .from('test_results')
    .delete()
    .in('student_id', ids);
  if (resErr) throw resErr;

  // Promote: update class_name to Class 10
  const { error: updateErr } = await supabase
    .from('students')
    .update({ class_name: 'Class 10' })
    .in('id', ids);
  if (updateErr) throw updateErr;

  return ids.length;
}

/**
 * BATCH: Promote Class 8 → Class 9
 * - Clears all existing test results for Class 8 students
 * - Updates their class_name to 'Class 9'
 */
export async function promoteClass8To9(): Promise<number> {
  // Get all class 8 students
  const { data: students, error: fetchErr } = await supabase
    .from('students')
    .select('id')
    .ilike('class_name', '%8%');
  if (fetchErr) throw fetchErr;
  if (!students || students.length === 0) return 0;

  const ids = students.map((s: any) => s.id);

  // Clear old results (new academic year = fresh start)
  const { error: resErr } = await supabase
    .from('test_results')
    .delete()
    .in('student_id', ids);
  if (resErr) throw resErr;

  // Promote: update class_name to Class 9
  const { error: updateErr } = await supabase
    .from('students')
    .update({ class_name: 'Class 9' })
    .in('id', ids);
  if (updateErr) throw updateErr;

  return ids.length;
}

export function getCurrentMonthLabel(referenceDate = new Date()) {
  return referenceDate.toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthlyStudentSummaries(
  data: ResultsPortalData,
  referenceDate = new Date()
): StudentMonthlySummary[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  return data.students
    .map((student) => {
      const tests = data.results
        .filter((result) => {
          const date = new Date(result.testDate);
          return (
            result.studentId === student.id &&
            date.getFullYear() === year &&
            date.getMonth() === month
          );
        })
        .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());

      const totalMarksObtained = tests.reduce((sum, test) => sum + test.marksObtained, 0);
      const totalMarksPossible = tests.reduce((sum, test) => sum + test.totalMarks, 0);
      const percentage =
        totalMarksPossible > 0 ? Number(((totalMarksObtained / totalMarksPossible) * 100).toFixed(1)) : 0;

      return {
        student,
        totalMarksObtained,
        totalMarksPossible,
        percentage,
        testCount: tests.length,
        tests,
      };
    })
    .filter((summary) => summary.testCount > 0)
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.totalMarksObtained !== a.totalMarksObtained) return b.totalMarksObtained - a.totalMarksObtained;
      return a.student.name.localeCompare(b.student.name);
    });
}

export function getAllStudentResults(
  data: ResultsPortalData
): Array<StudentMonthlySummary & { allTests: TestResultRecord[] }> {
  return data.students
    .map((student) => {
      const allTests = data.results
        .filter((result) => result.studentId === student.id)
        .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());

      const totalMarksObtained = allTests.reduce((sum, test) => sum + test.marksObtained, 0);
      const totalMarksPossible = allTests.reduce((sum, test) => sum + test.totalMarks, 0);
      const percentage =
        totalMarksPossible > 0 ? Number(((totalMarksObtained / totalMarksPossible) * 100).toFixed(1)) : 0;

      return {
        student,
        totalMarksObtained,
        totalMarksPossible,
        percentage,
        testCount: allTests.length,
        tests: allTests,
        allTests,
      };
    })
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return a.student.name.localeCompare(b.student.name);
    });
}
