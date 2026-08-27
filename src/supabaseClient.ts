import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kqmftkwerwtfrthqjmdq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbWZ0a3dlcnd0ZnJ0aHFqbWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NTM5NTMsImV4cCI6MjA2MjUyOTk1M30.4iL_L66wD9u6o0i60P-6JvO7u9n7A-O3o5v5N5v5N5v';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
