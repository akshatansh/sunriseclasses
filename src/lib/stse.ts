import { supabase } from './supabase';
import { STSERegistration, STSEConfig } from './admitCardPdf';

const DEFAULT_STSE_CONFIG: STSEConfig = {
  exam_date: 'To be announced (रविवार को)',
  venue: 'Sunrise Classes & Academy, Main Market, Champanagar, Purnia (Bihar)',
  shifts: [
    'Shift 1: 09:30 AM - 10:30 AM',
    'Shift 2: 11:30 AM - 12:30 PM',
  ],
};

// Local storage fallback key for offline persistence if table is temporarily syncing
const LOCAL_STORAGE_KEY = 'stse_registrations_cache';

export async function getSTSEConfig(): Promise<STSEConfig> {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'stse_config')
      .single();

    if (data?.setting_value) {
      return { ...DEFAULT_STSE_CONFIG, ...data.setting_value };
    }
  } catch (err) {
    console.warn('Could not fetch stse_config from site_settings, using default', err);
  }
  return DEFAULT_STSE_CONFIG;
}

export async function updateSTSEConfig(config: Partial<STSEConfig>): Promise<boolean> {
  try {
    const existing = await getSTSEConfig();
    const updated = { ...existing, ...config };
    const { error } = await supabase
      .from('site_settings')
      .upsert({
        setting_key: 'stse_config',
        setting_value: updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to update STSE config', err);
    return false;
  }
}

// Generate the next Roll Number (e.g. STSE-2027-101, STSE-2027-102...)
export async function generateNextRollNumber(): Promise<string> {
  try {
    const { count, error } = await supabase
      .from('stse_registrations')
      .select('*', { count: 'exact', head: true });

    if (!error && typeof count === 'number') {
      const nextNum = 101 + count;
      return `STSE-2027-${nextNum}`;
    }
  } catch (e) {
    console.warn('Error counting registrations for roll number', e);
  }
  
  // Fallback random timestamp number
  const rnd = Math.floor(100 + Math.random() * 900);
  return `STSE-2027-${rnd}`;
}

export async function registerForSTSE(
  formData: Omit<STSERegistration, 'id' | 'roll_number' | 'created_at' | 'status'>
): Promise<{ success: boolean; registration?: STSERegistration; error?: string }> {
  try {
    // 1. Check if phone already registered
    const { data: existing } = await supabase
      .from('stse_registrations')
      .select('*')
      .or(`phone.eq.${formData.phone},whatsapp.eq.${formData.phone}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: true,
        registration: existing[0],
      };
    }

    // 2. Generate Roll Number
    const rollNumber = await generateNextRollNumber();
    const newRecord: STSERegistration = {
      ...formData,
      roll_number: rollNumber,
      status: 'registered',
      created_at: new Date().toISOString(),
    };

    // 3. Insert into Supabase
    const { data, error } = await supabase
      .from('stse_registrations')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert failed, caching locally', error);
      // Cache locally
      const cached = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      cached.push(newRecord);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
      return { success: true, registration: newRecord };
    }

    return { success: true, registration: data || newRecord };
  } catch (err: any) {
    console.error('STSE Registration Error:', err);
    return { success: false, error: err?.message || 'Registration failed' };
  }
}

export async function getRegistrationByRollOrPhone(
  search: string
): Promise<STSERegistration | null> {
  const clean = search.trim();
  if (!clean) return null;

  try {
    const { data, error } = await supabase
      .from('stse_registrations')
      .select('*')
      .or(`roll_number.ilike.%${clean}%,phone.eq.${clean},whatsapp.eq.${clean}`)
      .limit(1);

    if (!error && data && data.length > 0) {
      return data[0];
    }
  } catch (err) {
    console.warn('Search in supabase failed, checking local cache', err);
  }

  // Check local cache
  const cached: STSERegistration[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  const match = cached.find(
    (r) =>
      r.roll_number?.toLowerCase() === clean.toLowerCase() ||
      r.phone === clean ||
      r.whatsapp === clean
  );
  return match || null;
}

export async function getAllSTSERegistrations(): Promise<STSERegistration[]> {
  try {
    const { data, error } = await supabase
      .from('stse_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Failed to fetch from DB', err);
  }

  // Fallback to local cache
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
}

export async function updateSTSERegistrationMarks(
  id: string,
  marks: number
): Promise<boolean> {
  // Calculate rank/scholarship helper
  let scholarship_percentage = 10;
  let prize_won = 'Participation Certificate + Free Exam Kit';

  if (marks >= 45) {
    scholarship_percentage = 100;
    prize_won = '🥇 Rank 1: Smartwatch + Gold Trophy + 100% Free Tuition';
  } else if (marks >= 40) {
    scholarship_percentage = 75;
    prize_won = '🥈 Rank 2-3: Sports Watch + Silver Trophy + 75% Off';
  } else if (marks >= 32) {
    scholarship_percentage = 50;
    prize_won = '🥉 Rank 4-10: Books Kit + Bronze Trophy + 50% Off';
  } else if (marks >= 25) {
    scholarship_percentage = 35;
    prize_won = '🎖️ Rank 11-25: 35% Scholarship + Merit Certificate';
  } else if (marks >= 18) {
    scholarship_percentage = 20;
    prize_won = '📜 Rank 26-50: 20% Scholarship + Merit Certificate';
  }

  try {
    const { error } = await supabase
      .from('stse_registrations')
      .update({
        marks_obtained: marks,
        scholarship_percentage,
        prize_won,
        status: 'evaluated',
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to update marks', err);
    return false;
  }
}
