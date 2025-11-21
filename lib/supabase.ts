import { createClient } from '@supabase/supabase-js';
import { getConfig } from './config';

const config = getConfig();

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Server-side client with service role key
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(
    config.supabase.url &&
    config.supabase.anonKey &&
    config.supabase.url !== 'https://placeholder.supabase.co' &&
    config.supabase.anonKey !== 'placeholder-key'
  );
};

