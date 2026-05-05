import { supabase } from './supabase';

export interface StudyMaterial {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  youtube_link: string;
  drive_link: string;
  created_at: string;
}

export interface StudentDoubt {
  id: string;
  student_name: string;
  student_email?: string;
  class_name: string;
  subject: string;
  doubt_text: string;
  video_link: string;
  status: 'pending' | 'answered';
  answer_text: string | null;
  created_at: string;
}

export interface TopicRequest {
  id: string;
  student_name: string;
  subject: string;
  topic_name: string;
  status: 'pending' | 'completed';
  created_at: string;
}

// -- Study Materials --
export async function getStudyMaterials() {
  const { data, error } = await supabase
    .from('sz_study_materials')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as StudyMaterial[];
}

export async function addStudyMaterial(material: Omit<StudyMaterial, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('sz_study_materials')
    .insert([material])
    .select()
    .single();
  if (error) throw error;
  return data as StudyMaterial;
}

export async function deleteStudyMaterial(id: string) {
  const { error } = await supabase.from('sz_study_materials').delete().eq('id', id);
  if (error) throw error;
}

// -- Doubts --
export async function getDoubts() {
  const { data, error } = await supabase
    .from('sz_doubts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as StudentDoubt[];
}

export async function submitDoubt(doubt: Omit<StudentDoubt, 'id' | 'created_at' | 'status' | 'answer_text'>) {
  const { data, error } = await supabase
    .from('sz_doubts')
    .insert([{ ...doubt, status: 'pending' }])
    .select()
    .single();
  if (error) throw error;
  return data as StudentDoubt;
}

export async function answerDoubt(id: string, answer_text: string) {
  const { data, error } = await supabase
    .from('sz_doubts')
    .update({ status: 'answered', answer_text })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as StudentDoubt;
}

export async function deleteDoubt(id: string) {
  const { error } = await supabase.from('sz_doubts').delete().eq('id', id);
  if (error) throw error;
}

// -- Topic Requests --
export async function getTopicRequests() {
  const { data, error } = await supabase
    .from('sz_topic_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as TopicRequest[];
}

export async function submitTopicRequest(request: Omit<TopicRequest, 'id' | 'created_at' | 'status'>) {
  const { data, error } = await supabase
    .from('sz_topic_requests')
    .insert([{ ...request, status: 'pending' }])
    .select()
    .single();
  if (error) throw error;
  return data as TopicRequest;
}

export async function completeTopicRequest(id: string) {
  const { data, error } = await supabase
    .from('sz_topic_requests')
    .update({ status: 'completed' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as TopicRequest;
}

export async function deleteTopicRequest(id: string) {
  const { error } = await supabase.from('sz_topic_requests').delete().eq('id', id);
  if (error) throw error;
}
