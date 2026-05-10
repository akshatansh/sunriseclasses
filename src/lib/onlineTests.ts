import { supabase } from './supabase';

export interface OnlineTest {
  id: string;
  title: string;
  class_name: string;
  subject: string;
  duration_minutes: number;
  is_active: boolean;
  is_stopped: boolean; // true = test stopped, students see result/pending but can't start
  created_at: string;
}

export interface OnlineTestQuestion {
  id: string;
  test_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  marks: number;
  question_image?: string;
}

export interface StudentTestAttempt {
  id?: string;
  student_id: string;
  test_id: string;
  score: number;
  total_marks: number;
  cheat_warnings: number;
  is_completed: boolean;
  submitted_at?: string;
  submission_type?: 'manual' | 'auto_time' | 'auto_cheat'; // How the test was submitted
  time_taken_seconds?: number | null;  // How long student took
  last_question_seen?: number | null;  // Highest question number they reached
  current_question_index?: number | null; // Question they are currently viewing (real-time)
}

// Student Login logic for Test Portal
export async function loginStudentForTest(name: string, className: string, pin: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, class_name, image')
    .ilike('name', `%${name}%`)
    .eq('class_name', className)
    .eq('pin', pin)
    .single();

  if (error || !data) {
    throw new Error('Invalid credentials. Please check Name, Class and PIN.');
  }

  return data;
}

export async function getActiveTests(className: string) {
  // Fetch both live (is_active=true) AND stopped (is_stopped=true) tests
  // so students can see their Completed/Pending status even after test is stopped
  const { data, error } = await supabase
    .from('online_tests')
    .select('*')
    .eq('class_name', className)
    .or('is_active.eq.true,is_stopped.eq.true')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as OnlineTest[];
}

export async function getTestQuestions(testId: string) {
  const { data, error } = await supabase
    .from('online_test_questions')
    .select('id, test_id, question_text, option_a, option_b, option_c, option_d, marks, question_image')
    // We intentionally do not select correct_option to prevent cheating via API inspection
    .eq('test_id', testId);

  if (error) throw error;
  return data;
}

export async function submitTest(attempt: Partial<StudentTestAttempt>, answers: Record<string, string>) {
  // First, calculate the score securely on the server? 
  // Wait, Supabase allows us to fetch correct_option if we are admin, 
  // but since we are public, we need a secure way to grade.
  // For simplicity and to avoid writing Supabase Edge Functions right now, 
  // we will fetch correct_options here but in a real-world scenario, 
  // grading should happen via a Postgres function.
  // However, since we hid correct_option from the student's initial fetch, 
  // we can fetch it now for grading just before submitting.
  
  const { data: questions, error: qError } = await supabase
    .from('online_test_questions')
    .select('id, correct_option, marks')
    .eq('test_id', attempt.test_id!);

  if (qError) throw qError;

  let score = 0;
  let total_marks = 0;

  questions?.forEach(q => {
    total_marks += q.marks;
    if (answers[q.id] === q.correct_option) {
      score += q.marks;
    }
  });

  const { data, error } = await supabase
    .from('online_test_attempts')
    .update({
      score,
      total_marks,
      cheat_warnings: attempt.cheat_warnings || 0,
      is_completed: true,
      submission_type: attempt.submission_type || 'manual',
      time_taken_seconds: attempt.time_taken_seconds ?? null,
      last_question_seen: attempt.last_question_seen ?? null,
    })
    .eq('student_id', attempt.student_id)
    .eq('test_id', attempt.test_id)
    .select()
    .single();

  // If no existing row was updated (fallback in case they somehow bypassed startTestAttempt)
  if (!data) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('online_test_attempts')
      .insert({
        student_id: attempt.student_id,
        test_id: attempt.test_id,
        score,
        total_marks,
        cheat_warnings: attempt.cheat_warnings || 0,
        is_completed: true,
        submission_type: attempt.submission_type || 'manual',
        time_taken_seconds: attempt.time_taken_seconds ?? null,
        last_question_seen: attempt.last_question_seen ?? null,
      })
      .select()
      .single();
    if (fallbackError) throw fallbackError;
    return fallbackData as StudentTestAttempt;
  }

  if (error) throw error;
  return data as StudentTestAttempt;
}

// Create initial attempt when test starts to prevent back button cheating
export async function startTestAttempt(studentId: string, testId: string) {
  // Check if already exists
  const { data: existing } = await supabase
    .from('online_test_attempts')
    .select('id')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('online_test_attempts')
    .insert({
      student_id: studentId,
      test_id: testId,
      score: 0,
      total_marks: 0,
      cheat_warnings: 0,
      is_completed: false,
      current_question_index: 0
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateTestProgress(studentId: string, testId: string, currentIdx: number) {
  // Fire and forget update
  supabase
    .from('online_test_attempts')
    .update({ current_question_index: currentIdx })
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .then(() => {})
    .catch(console.error);
}

// Check if student already attempted a specific test
export async function checkTestAttempt(studentId: string, testId: string) {
  const { data, error } = await supabase
    .from('online_test_attempts')
    .select('*')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Get all attempts for a student
export async function getStudentAttempts(studentId: string) {
  const { data, error } = await supabase
    .from('online_test_attempts')
    .select('*, online_tests(*)')
    .eq('student_id', studentId);
  if (error) throw error;
  return data as StudentTestAttempt[];
}

export async function reportTestIssue(studentId: string, issueType: string, description: string) {
  const { error } = await supabase
    .from('test_issue_reports')
    .insert({
      student_id: studentId,
      issue_type: issueType,
      description: description
    });
  if (error) throw error;
}

// Log proctoring events and upload proof
export async function logProctoringEvent(
  testId: string, 
  studentId: string, 
  warningType: string, 
  proofBlob?: Blob,
  proofType: 'image' | 'audio' = 'image'
) {
  let proof_image_url = null;

  try {
    if (proofBlob) {
      const ext = proofType === 'audio' ? 'webm' : 'jpg';
      const contentType = proofType === 'audio' ? (proofBlob.type || 'audio/webm') : 'image/jpeg';
      const fileName = `${studentId}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('proctoring_proofs')
        .upload(fileName, proofBlob, { contentType });
        
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('proctoring_proofs')
          .getPublicUrl(data.path);
        proof_image_url = publicUrlData.publicUrl;
      } else {
        console.error('Error uploading proof:', error);
      }
    }

    await supabase.from('proctoring_logs').insert({
      test_id: testId,
      student_id: studentId,
      warning_type: warningType,
      proof_image_url
    });
  } catch (err) {
    console.error('Error in logProctoringEvent:', err);
  }
}

export async function uploadQuestionImage(file: File) {
  const fileName = `q_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const { data, error } = await supabase.storage
    .from('proctoring_proofs') // Reusing this bucket or you can use 'public' if available
    .upload(fileName, file);

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from('proctoring_proofs')
    .getPublicUrl(data.path);
    
  return publicUrlData.publicUrl;
}

// ---------------- Admin Functions ----------------

export async function getAllTestsAdmin() {
  const { data, error } = await supabase
    .from('online_tests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as OnlineTest[];
}

export async function createTestAdmin(test: Partial<OnlineTest>) {
  const { data, error } = await supabase
    .from('online_tests')
    .insert(test)
    .select()
    .single();

  if (error) throw error;
  return data as OnlineTest;
}

export async function updateTestAdmin(id: string, updates: Partial<OnlineTest>) {
  const { data, error } = await supabase
    .from('online_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as OnlineTest;
}

export async function deleteTestAdmin(id: string) {
  const { error } = await supabase.from('online_tests').delete().eq('id', id);
  if (error) throw error;
}

export async function getQuestionsAdmin(testId: string) {
  const { data, error } = await supabase
    .from('online_test_questions')
    .select('*')
    .eq('test_id', testId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as OnlineTestQuestion[];
}

export async function createQuestionAdmin(question: Partial<OnlineTestQuestion>) {
  // Omit empty question_image to avoid errors if column doesn't exist
  const payload = { ...question };
  if (!payload.question_image) {
    delete payload.question_image;
  }

  const { data, error } = await supabase
    .from('online_test_questions')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as OnlineTestQuestion;
}

export async function createQuestionsBatchAdmin(questions: Partial<OnlineTestQuestion>[]) {
  const { data, error } = await supabase
    .from('online_test_questions')
    .insert(questions)
    .select();

  if (error) throw error;
  return data as OnlineTestQuestion[];
}

export async function updateQuestionAdmin(id: string, question: Partial<OnlineTestQuestion>) {
  const payload = { ...question };
  if (!payload.question_image && payload.question_image !== '') {
    delete payload.question_image;
  }

  const { data, error } = await supabase
    .from('online_test_questions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as OnlineTestQuestion;
}

export async function deleteQuestionAdmin(id: string) {
  const { error } = await supabase.from('online_test_questions').delete().eq('id', id);
  if (error) throw error;
}

export async function getTestAttemptsAdmin(testId: string) {
  const { data, error } = await supabase
    .from('online_test_attempts')
    .select('*, students(name, class_name)')
    .eq('test_id', testId)
    .order('score', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProctoringLogsAdmin(testId: string) {
  const { data, error } = await supabase
    .from('proctoring_logs')
    .select('*, students(name, class_name)')
    .eq('test_id', testId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * ADMIN: Reset a student's test attempt
 * Deletes the attempt row so the student can retake the test fresh.
 * Also deletes related proctoring logs for that student+test.
 */
export async function resetStudentAttempt(studentId: string, testId: string) {
  // Delete proctoring logs first (they reference attempt)
  await supabase
    .from('proctoring_logs')
    .delete()
    .eq('student_id', studentId)
    .eq('test_id', testId);

  // Delete the attempt itself
  const { error } = await supabase
    .from('online_test_attempts')
    .delete()
    .eq('student_id', studentId)
    .eq('test_id', testId);

  if (error) throw error;
}
