import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isUrlValid = supabaseUrl && supabaseUrl.startsWith('https://');

export const supabase = isUrlValid
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);
