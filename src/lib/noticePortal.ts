import { supabase } from './supabase';

export interface NoticeRecord {
  id: string;
  title: string;
  content: string;
  type: 'exam' | 'holiday' | 'general';
  date: string;
  created_at: string;
}

export const getNotices = async (): Promise<NoticeRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notices:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching notices:', error);
    return [];
  }
};

export const addNotice = async (notice: Omit<NoticeRecord, 'id' | 'created_at'>): Promise<boolean> => {
  try {
    const { error } = await supabase.from('notices').insert([notice]);
    if (error) {
      console.error('Error adding notice:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error adding notice:', error);
    return false;
  }
};

export const deleteNotice = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) {
      console.error('Error deleting notice:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting notice:', error);
    return false;
  }
};
