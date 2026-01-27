import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getDemoUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || '05971cd1-57e1-4d97-8469-4dc104f6e691'; // Fallback for Demo
};
