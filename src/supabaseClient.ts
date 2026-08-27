import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kqoftkwezwtfrthqjmdq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxb2Z0a3dlend0ZnJ0aHFqbWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjMwNjYsImV4cCI6MjA5Njc5OTA2Nn0.tZtwyovja1ai6nXBzR7Xp7Cv8VnagldN4Sa26FLcMLk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
