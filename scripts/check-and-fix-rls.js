const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseServiceKey;

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  envLines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1];
    }
  });
} catch (error) {
  console.log('Could not read .env.local file');
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Use service role key to manage RLS policies
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixRLS() {
  try {
    console.log('🔍 Checking current RLS policies and applying fix...');
    console.log('');
    
    // First, let's check if there are any transactions at all using admin access
    const { data: allTransactions, error: allError } = await supabaseAdmin
      .from('transactions')
      .select('id, phone_number, status, voucher_id, created_at')
      .limit(10);
    
    if (allError) {
      console.error('❌ Error accessing transactions with admin:', allError.message);
      return;
    }
    
    console.log(`📊 Found ${allTransactions?.length || 0} total transactions in database`);
    
    const completedWithVouchers = allTransactions?.filter(t => t.status === 'completed' && t.voucher_id) || [];
    console.log(`📊 Found ${completedWithVouchers.length} completed transactions with vouchers`);
    
    if (completedWithVouchers.length > 0) {
      console.log('📋 Sample completed transaction:');
      console.log('   Phone:', completedWithVouchers[0].phone_number);
      console.log('   Status:', completedWithVouchers[0].status);
      console.log('   Has voucher:', !!completedWithVouchers[0].voucher_id);
    }
    
    console.log('');
    console.log('🔧 Applying RLS policy fixes...');
    
    // Apply the RLS policies using raw SQL
    const policies = [
      {
        name: 'transactions_public_access',
        sql: `
          CREATE POLICY "Public can view transactions by phone number" ON public.transactions
          FOR SELECT USING (
            status = 'completed' AND 
            phone_number IS NOT NULL AND
            voucher_id IS NOT NULL
          );
        `
      },
      {
        name: 'vouchers_public_access', 
        sql: `
          CREATE POLICY "Public can view vouchers from completed transactions" ON public.vouchers
          FOR SELECT USING (
            status = 'sold' AND
            id IN (
              SELECT voucher_id 
              FROM public.transactions 
              WHERE status = 'completed' 
              AND voucher_id IS NOT NULL
            )
          );
        `
      }
    ];
    
    for (const policy of policies) {
      try {
        // Try to create the policy
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: policy.sql });
        
        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`✅ Policy "${policy.name}" already exists`);
          } else {
            console.log(`❌ Error creating policy "${policy.name}":`, error.message);
          }
        } else {
          console.log(`✅ Successfully created policy "${policy.name}"`);
        }
      } catch (err) {
        console.log(`❌ Exception creating policy "${policy.name}":`, err.message);
      }
    }
    
    console.log('');
    console.log('🧪 Testing non-authenticated access after fix...');
    
    // Test with anon key
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneWZvb3JiZG9sd2R6ZmRzY3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODQyNDUsImV4cCI6MjA3ODI2MDI0NX0.jp9NH-EdS5x8bbKvZYBXocaIoLRt0okZHOCiwSYif_4');
    
    const { data: anonTransactions, error: anonError } = await supabaseAnon
      .from('transactions')
      .select('*')
      .eq('status', 'completed')
      .not('voucher_id', 'is', null)
      .limit(5);
    
    if (anonError) {
      console.log('❌ Non-authenticated access still blocked:', anonError.message);
    } else {
      console.log(`✅ Non-authenticated access working! Found ${anonTransactions?.length || 0} accessible transactions`);
    }
    
    console.log('');
    console.log('📋 Summary:');
    console.log(`- Total transactions in DB: ${allTransactions?.length || 0}`);
    console.log(`- Completed with vouchers: ${completedWithVouchers.length}`);
    console.log(`- Accessible to non-auth users: ${anonTransactions?.length || 0}`);
    
    if (completedWithVouchers.length > 0 && (anonTransactions?.length || 0) === 0) {
      console.log('');
      console.log('⚠️  Issue detected: Transactions exist but are not accessible to non-authenticated users');
      console.log('   This means the RLS policies may not have been applied correctly.');
      console.log('   Please run the SQL manually in your Supabase dashboard.');
    }
    
  } catch (error) {
    console.error('💥 Check failed:', error);
  }
}

checkAndFixRLS();
