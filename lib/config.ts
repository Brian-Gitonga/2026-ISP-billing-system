/**
 * Application Configuration
 * This file contains all environment variables hardcoded for deployment
 * DO NOT commit sensitive credentials to public repositories in production
 */

export const config = {
  // Supabase Configuration
  supabase: {
    url: 'https://bgyfoorbdolwdzfdscvq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneWZvb3JiZG9sd2R6ZmRzY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODQyNDUsImV4cCI6MjA3ODI2MDI0NX0.jp9NH-EdS5x8bbKvZYBXocaIoLRt0okZHOCiwSYif_4',
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneWZvb3JiZG9sd2R6ZmRzY3ZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY4NDI0NSwiZXhwIjoyMDc4MjYwMjQ1fQ.yatR8Wa_pQyIyoyWP4ZaXMDr9YcNTZ_1lugvADNIDxE',
  },

  // M-Pesa Configuration
  mpesa: {
    consumerKey: 'bAoiO0bYMLsAHDgzGSGVMnpSAxSUuCMEfWkrrAOK1MZJNAcA',
    consumerSecret: '2idZFLPp26Du8JdF9SB3nLpKrOJO67qDIkvICkkVl7OhADTQCb0Oga5wNgzu1xQx',
    shortcode: '174379',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    callbackUrl: 'https://qtroisp.netlify.app/api/mpesa/callback',
    environment: 'sandbox', // 'sandbox' or 'production'
  },

  // Application Configuration
  app: {
    url: 'https://qtroisp.netlify.app',
  },
};

/**
 * Helper function to get environment-aware configuration
 * Falls back to config file if environment variables are not set
 */
export function getConfig() {
  return {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || config.supabase.url,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || config.supabase.anonKey,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.serviceRoleKey,
    },
    mpesa: {
      consumerKey: process.env.MPESA_CONSUMER_KEY || config.mpesa.consumerKey,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || config.mpesa.consumerSecret,
      shortcode: process.env.MPESA_SHORTCODE || config.mpesa.shortcode,
      passkey: process.env.MPESA_PASSKEY || config.mpesa.passkey,
      callbackUrl: process.env.MPESA_CALLBACK_URL || config.mpesa.callbackUrl,
      environment: process.env.MPESA_ENVIRONMENT || config.mpesa.environment,
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || config.app.url,
    },
  };
}