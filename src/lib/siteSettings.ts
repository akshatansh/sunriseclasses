import { supabase } from './supabase';

export const getNotificationText = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'notification_text')
      .single();

    if (error || !data) {
      return ''; // fallback
    }
    return data.setting_value;
  } catch (error) {
    console.error('Error fetching notification text:', error);
    return '';
  }
};

export const updateNotificationText = async (text: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ setting_key: 'notification_text', setting_value: text, updated_at: new Date().toISOString() });
    
    if (error) {
      console.error('Error updating notification text:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error updating notification text:', error);
    return false;
  }
};
