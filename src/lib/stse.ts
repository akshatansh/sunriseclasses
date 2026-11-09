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

// Generate the next Roll Number (e.g. STSE-2028-101, STSE-2028-102...)
export async function generateNextRollNumber(): Promise<string> {
  try {
    const { count, error } = await supabase
      .from('stse_registrations')
      .select('*', { count: 'exact', head: true });

    if (!error && typeof count === 'number') {
      const nextNum = 101 + count;
      return `STSE-2028-${nextNum}`;
    }
  } catch (e) {
    console.warn('Error counting registrations for roll number', e);
  }
  
  // Fallback random timestamp number
  const rnd = Math.floor(100 + Math.random() * 900);
  return `STSE-2028-${rnd}`;
}

export async function registerForSTSE(
  formData: Omit<STSERegistration, 'id' | 'roll_number' | 'created_at' | 'status'>
): Promise<{ success: boolean; isDuplicate?: boolean; registration?: STSERegistration; error?: string }> {
  try {
    const cleanPhone = formData.phone.trim();
    const cleanName = formData.student_name.trim().toLowerCase();

    // 1. Check if same student (phone + same name) already exists in Supabase
    const { data: existingFromDb } = await supabase
      .from('stse_registrations')
      .select('*')
      .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`);

    // Also check local storage cache
    const cached: STSERegistration[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const combinedExisting = [...(existingFromDb || []), ...cached];

    const duplicate = combinedExisting.find((r) => {
      const phoneMatches = r.phone === cleanPhone || r.whatsapp === cleanPhone;
      const nameMatches = r.student_name?.trim().toLowerCase() === cleanName;
      return phoneMatches && nameMatches;
    });

    if (duplicate) {
      if (!duplicate.photo_base64 && duplicate.roll_number) {
        duplicate.photo_base64 = localStorage.getItem(`stse_photo_${duplicate.roll_number}`) || undefined;
      }
      return {
        success: false,
        isDuplicate: true,
        registration: duplicate,
        error: `छात्र "${duplicate.student_name}" एवं मोबाइल नंबर "${cleanPhone}" से पंजीकरण पहले ही हो चुका है (रोल नंबर: ${duplicate.roll_number})। दोबारा फॉर्म सबमिट नहीं किया जा सकता।`,
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

    // 3. Insert into Supabase (handle gracefully if photo_base64 column is not yet in DB schema)
    let dbRecord: any = { ...newRecord };
    let { data, error } = await supabase
      .from('stse_registrations')
      .insert([dbRecord])
      .select()
      .single();

    if (error && (error.message?.includes('photo_base64') || error.details?.includes('photo_base64'))) {
      const { photo_base64, ...recordWithoutPhoto } = dbRecord;
      const retry = await supabase
        .from('stse_registrations')
        .insert([recordWithoutPhoto])
        .select()
        .single();
      if (!retry.error) {
        error = null;
        data = { ...retry.data, photo_base64 };
      }
    }

    if (error) {
      console.warn('Supabase insert failed, caching locally', error);
      // Cache locally
      const cached = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      cached.push(newRecord);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
      if (newRecord.photo_base64) {
        localStorage.setItem(`stse_photo_${newRecord.roll_number}`, newRecord.photo_base64);
      }
      return { success: true, registration: newRecord };
    }

    const finalReg: STSERegistration = { ...(data || newRecord), photo_base64: newRecord.photo_base64 || (data as any)?.photo_base64 };
    if (finalReg.photo_base64 && finalReg.roll_number) {
      localStorage.setItem(`stse_photo_${finalReg.roll_number}`, finalReg.photo_base64);
    }
    return { success: true, registration: finalReg };
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
      const reg = data[0];
      if (!reg.photo_base64 && reg.roll_number) {
        const cachedPhoto = localStorage.getItem(`stse_photo_${reg.roll_number}`);
        if (cachedPhoto) reg.photo_base64 = cachedPhoto;
      }
      return reg;
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

