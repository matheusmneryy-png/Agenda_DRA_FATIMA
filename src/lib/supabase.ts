import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Limpezas de segurança: remover aspas se vierem por engano do Vercel/Env
if (supabaseUrl) supabaseUrl = supabaseUrl.replace(/['"]+/g, '');
if (supabaseAnonKey) supabaseAnonKey = supabaseAnonKey.replace(/['"]+/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing. Check your .env file.');
} else {
  console.log('Supabase Client inicializado com a URL:', supabaseUrl.substring(0, 20) + '...');
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
