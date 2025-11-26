import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

// Global singleton instances
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

// Create a proxy object that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!supabaseInstance) {
      const config = getConfig();
      supabaseInstance = createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return (supabaseInstance as any)[prop];
  }
});

// Create a proxy object that lazily initializes the admin client
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
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
    return (supabaseAdminInstance as any)[prop];
  }
});

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

