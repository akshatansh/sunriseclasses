import { supabase } from './supabase';

export interface OnlineTest {
  id: string;
  title: string;
  class_name: string;
  subject: string;
  duration_minutes: number;
  is_active: boolean;
  is_stopped: boolean; // true = test stopped, students see result/pending but can't start
  allow_review: boolean; // true = students can see question-answer review + download PDF
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
  explanation?: string;
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
  answers?: Record<string, string>; // Store chosen options for each question ID
}

export async function loginStudentForTest(name: string, className: string, pin: string) {
  const cleanName = name.trim().toLowerCase();
  const cleanPin = pin.trim();

  if (!cleanName || !cleanPin) {
    throw new Error('Please enter your Name, select your Class and enter your 4-digit Secret PIN.');
  }

  // 1. Query student by exact Class and Secret PIN (guaranteed unique per class)
  let { data, error } = await supabase
    .from('students')
    .select('id, name, class_name, image, test_ban_type, test_ban_reason, test_ban_until, silent_record_enabled, parent_phone, pin')
    .eq('class_name', className)
    .eq('pin', cleanPin);

  if (error || !data || data.length === 0) {
    // Try query without ban columns as fallback if schema differs
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('students')
      .select('id, name, class_name, image, parent_phone, pin')
      .eq('class_name', className)
      .eq('pin', cleanPin);

    if (fallbackError || !fallbackData || fallbackData.length === 0) {
      throw new Error('Invalid credentials. Secret PIN or Class does not match. Please verify your 4-digit PIN.');
    }
    data = fallbackData as any;
  }

  // 2. Verify entered name matches the student's registered name (flexible matching)
  const matchedStudent = data.find((s: any) => {
    const dbName = (s.name || '').trim().toLowerCase();
    const firstEnteredWord = cleanName.split(/\s+/)[0];
    const firstDbWord = dbName.split(/\s+/)[0];

    return (
      dbName === cleanName ||
      dbName.includes(cleanName) ||
      cleanName.includes(dbName) ||
      firstDbWord === firstEnteredWord
    );
  });

  if (!matchedStudent) {
    throw new Error(`Name "${name}" does not match registered student name for PIN ${pin}. Please check your spelling.`);
  }

  return matchedStudent;
}

// Ban a student from online tests
export async function banStudent(
  studentId: string,
  banType: 'permanent' | 'temporary',
  reason: string,
  banUntil?: string // ISO date string, required for temporary
) {
  const { error } = await supabase
    .from('students')
    .update({
      test_ban_type: banType,
      test_ban_reason: reason,
      test_ban_until: banType === 'temporary' ? banUntil : null,
    })
    .eq('id', studentId);

  if (error) throw error;
}

// Remove ban from a student
export async function unbanStudent(studentId: string) {
  const { error } = await supabase
    .from('students')
    .update({
      test_ban_type: null,
      test_ban_reason: null,
      test_ban_until: null,
    })
    .eq('id', studentId);

  if (error) throw error;
}

// Admin: fetch all students with their ban status
export async function getBannedStudentsAdmin() {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, class_name, image, test_ban_type, test_ban_reason, test_ban_until, silent_record_enabled, parent_phone')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Admin: toggle silent video recording on a student
export async function toggleSilentRecordAdmin(studentId: string, enabled: boolean) {
  const { error } = await supabase
    .from('students')
    .update({ silent_record_enabled: enabled })
    .eq('id', studentId);

  if (error) throw error;
}

// Upload a silent video proctoring recording for an attempt
export async function uploadTestVideo(studentId: string, testId: string, videoBlob: Blob) {
  try {
    // Determine actual MIME type — iOS records mp4, Android/Chrome records webm
    const mimeType = videoBlob.type || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `${studentId}_video_${testId}_${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('proctoring_proofs')
      .upload(fileName, videoBlob, { contentType: mimeType });

    if (uploadError) {
      console.warn('Storage limit reached or upload error, skipping video upload:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('proctoring_proofs')
      .getPublicUrl(uploadData.path);

    const videoUrl = publicUrlData.publicUrl;

    // Delete any existing recording for this student & test first
    await supabase
      .from('test_video_recordings')
      .delete()
      .eq('student_id', studentId)
      .eq('test_id', testId);

    // Save to recordings table
    const { error: dbError } = await supabase
      .from('test_video_recordings')
      .insert({
        student_id: studentId,
        test_id: testId,
        video_url: videoUrl
      });

    if (dbError) throw dbError;
    return videoUrl;
  } catch (err) {
    console.error('Error uploading test video:', err);
    throw err;
  }
}

// Retrieve test recording URL for a student + test
export async function getTestVideoAdmin(studentId: string, testId: string) {
  const { data, error } = await supabase
    .from('test_video_recordings')
    .select('video_url')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .maybeSingle();

  if (error) return null;
  return data?.video_url || null;
}


export async function verifyStudentPin(studentId: string, pin: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('id', studentId)
    .eq('pin', pin)
    .maybeSingle();

  if (error || !data) {
    return false;
  }
  return true;
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

// Fetch questions WITH correct answers — only called after test is done & admin allows review
export async function getTestQuestionsWithAnswers(testId: string) {
  const { data, error } = await supabase
    .from('online_test_questions')
    .select('*')
    .eq('test_id', testId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as OnlineTestQuestion[];
}

export async function submitTest(attempt: Partial<StudentTestAttempt>, answers: Record<string, string>) {
  // Check if student is banned before allowing submission
  const { data: student } = await supabase
    .from('students')
    .select('test_ban_type, test_ban_until')
    .eq('id', attempt.student_id!)
    .single();

  if (student) {
    if (student.test_ban_type === 'permanent') {
      throw new Error('Aap permanently online tests se ban hain. Submit nahi kiya ja sakta.');
    }
    if (student.test_ban_type === 'temporary' && student.test_ban_until) {
      if (new Date(student.test_ban_until) > new Date()) {
        throw new Error('Aap temporarily online tests se ban hain. Submit nahi kiya ja sakta.');
      }
    }
  }

  // If auto_cheat is triggered, automatically enable silent_record for this student's future tests
  if (attempt.submission_type === 'auto_cheat') {
    await supabase
      .from('students')
      .update({ silent_record_enabled: true })
      .eq('id', attempt.student_id!)
      .catch(err => console.error('Failed to auto-flag student:', err));
  }

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
      answers: answers || {},
    })
    .eq('student_id', attempt.student_id)
    .eq('test_id', attempt.test_id)
    .select()
    .maybeSingle(); // maybeSingle() prevents PGRST116 error when 0 rows match

  if (error) throw error;



  // If no existing row was updated (student bypassed startTestAttempt somehow)
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
        answers: answers || {},
      })
      .select()
      .maybeSingle();
    if (fallbackError) throw fallbackError;
    if (!fallbackData) throw new Error('Failed to save test result. Please retry.');
    return fallbackData as StudentTestAttempt;
  }

  return data as StudentTestAttempt;
}

// Create initial attempt when test starts to prevent back button cheating
export async function startTestAttempt(studentId: string, testId: string) {
  // Check if student is banned
  const { data: student } = await supabase
    .from('students')
    .select('test_ban_type, test_ban_until')
    .eq('id', studentId)
    .single();

  if (student) {
    if (student.test_ban_type === 'permanent') {
      throw new Error('Aap permanently online tests se ban hain.');
    }
    if (student.test_ban_type === 'temporary' && student.test_ban_until) {
      if (new Date(student.test_ban_until) > new Date()) {
        throw new Error('Aap temporarily online tests se ban hain.');
      }
    }
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from('online_test_attempts')
    .select('id, started_at, is_completed')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .maybeSingle();

  if (existing) return existing;

  // Try full insert with current_question_index
  const { data, error } = await supabase
    .from('online_test_attempts')
    .insert({
      student_id: studentId,
      test_id: testId,
      score: 0,
      total_marks: 0,
      cheat_warnings: 0,
      is_completed: false,
      current_question_index: 0,
      started_at: new Date().toISOString()
    })
    .select()
    .maybeSingle();

  if (error) {
    // Fallback insert without current_question_index if column is missing in schema
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('online_test_attempts')
      .insert({
        student_id: studentId,
        test_id: testId,
        score: 0,
        total_marks: 0,
        cheat_warnings: 0,
        is_completed: false,
        started_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallbackData as StudentTestAttempt;
  }

  return data as StudentTestAttempt;
}

// Check if the student's test time has already expired on rejoin
export async function checkIfTestExpired(
  studentId: string,
  testId: string,
  durationMinutes: number
): Promise<{ expired: boolean; secondsLeft: number; startedAt: string | null; isAlreadyCompleted: boolean; existingScore: number; existingTotal: number }> {
  const { data } = await supabase
    .from('online_test_attempts')
    .select('started_at, is_completed, score, total_marks')
    .eq('student_id', studentId)
    .eq('test_id', testId)
    .maybeSingle();

  if (!data || !data.started_at) {
    return { expired: false, secondsLeft: durationMinutes * 60, startedAt: null, isAlreadyCompleted: false, existingScore: 0, existingTotal: 0 };
  }

  // ✅ CRITICAL: If already completed, return existing score — do NOT re-submit!
  if (data.is_completed) {
    return { 
      expired: true, 
      secondsLeft: 0, 
      startedAt: data.started_at,
      isAlreadyCompleted: true,   // Flag: just show existing result, don't submit again
      existingScore: data.score ?? 0,
      existingTotal: data.total_marks ?? 0,
    };
  }

  const startedAt = new Date(data.started_at).getTime();
  const expiresAt = startedAt + durationMinutes * 60 * 1000;
  const now = Date.now();
  const secondsLeft = Math.floor((expiresAt - now) / 1000);

  return {
    expired: secondsLeft <= 0,
    secondsLeft: Math.max(0, secondsLeft),
    startedAt: data.started_at,
    isAlreadyCompleted: false,
    existingScore: 0,
    existingTotal: 0,
  };
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
    .select('*, students(name, class_name, parent_phone)')
    .eq('test_id', testId)
    .order('score', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProctoringLogsAdmin(testId: string) {
  const { data, error } = await supabase
    .from('proctoring_logs')
    .select('*, students(name, class_name, parent_phone)')
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

export async function deleteProctoringLogAdmin(logId: string, proofUrl: string | null) {
  // If there's a file in storage, delete it first to save space
  if (proofUrl) {
    try {
      // Extract file path from URL. Format is usually: .../storage/v1/object/public/test_proofs/path/to/file.jpg
      const urlParts = proofUrl.split('/test_proofs/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1].split('?')[0]; // remove query params if any
        await supabase.storage.from('test_proofs').remove([filePath]);
      }
    } catch (e) {
      console.warn('Failed to delete proof file from storage', e);
    }
  }

  // Delete the database row
  const { error } = await supabase.from('proctoring_logs').delete().eq('id', logId);
  if (error) throw error;
}

export async function autoDeleteOldProctoringLogs() {
  try {
    // 1. Clean up proctoring logs, images, audio, and videos older than 5 days
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const dateStr3 = fiveDaysAgo.toISOString();

    const { data: oldLogs, error: fetchError } = await supabase
      .from('proctoring_logs')
      .select('id, proof_image_url')
      .lt('created_at', dateStr3);

    if (!fetchError && oldLogs && oldLogs.length > 0) {
      const filePaths = oldLogs
        .map(log => log.proof_image_url)
        .filter(url => url && url.includes('/test_proofs/'))
        .map(url => url.split('/test_proofs/')[1].split('?')[0]);

      if (filePaths.length > 0) {
        await supabase.storage.from('test_proofs').remove(filePaths);
      }

      await supabase
        .from('proctoring_logs')
        .delete()
        .lt('created_at', dateStr3);

      console.log(`Auto-deleted ${oldLogs.length} old proctoring logs.`);
    }

    // 2. Clean up test video recordings older than 3 days
    const dateStr10 = dateStr3;

    const { data: oldVideos, error: videoFetchErr } = await supabase
      .from('test_video_recordings')
      .select('id, video_url')
      .lt('created_at', dateStr10);

    if (!videoFetchErr && oldVideos && oldVideos.length > 0) {
      const videoPaths = oldVideos
        .map(v => v.video_url)
        .filter(url => url && (url.includes('/proctoring_recordings/') || url.includes('/proctoring_proofs/')))
        .map(url => {
          if (url.includes('/proctoring_recordings/')) {
            return url.split('/proctoring_recordings/')[1].split('?')[0];
          } else {
            return url.split('/proctoring_proofs/')[1].split('?')[0];
          }
        });

      if (videoPaths.length > 0) {
        // Clean from both buckets to be completely safe
        await supabase.storage.from('proctoring_proofs').remove(videoPaths).catch(() => {});
        await supabase.storage.from('proctoring_recordings').remove(videoPaths).catch(() => {});
      }

      await supabase
        .from('test_video_recordings')
        .delete()
        .lt('created_at', dateStr10);

      console.log(`Auto-deleted ${oldVideos.length} old video recordings.`);
    }
  } catch (err) {
    console.error('Failed to auto-delete old proctoring data', err);
  }
}

