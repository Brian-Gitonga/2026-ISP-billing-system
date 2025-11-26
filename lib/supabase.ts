import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

// Singleton instances
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

// Get or create the main Supabase client
export const supabase = (() => {
  if (!supabaseInstance) {
    const config = getConfig();
    supabaseInstance = createClient(config.supabase.url, config.supabase.anonKey);
  }
  return supabaseInstance;
})();

// Get or create the admin Supabase client
export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    const config = getConfig();
    supabaseAdminInstance = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return supabaseAdminInstance;
})();

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  const config = getConfig();
  return !!(
    config.supabase.url &&
    config.supabase.anonKey &&
    config.supabase.url !== 'https://placeholder.supabase.co' &&
    config.supabase.anonKey !== 'placeholder-key'
  );
};

