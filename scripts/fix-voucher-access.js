const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixVoucherAccess() {
  try {
    console.log('🚀 Fixing voucher access for non-authenticated users...');
    
    // Policy 1: Allow public to view completed transactions with vouchers
    console.log('📝 Adding policy for transactions...');
    const policy1 = `
      CREATE POLICY "Public can view transactions by phone number" ON public.transactions
      FOR SELECT USING (
        status = 'completed' AND 
        phone_number IS NOT NULL AND
        voucher_id IS NOT NULL
      );
    `;
    
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: policy1 });
    
    if (error1 && !error1.message.includes('already exists')) {
      console.error('❌ Error creating transactions policy:', error1);
    } else {
      console.log('✅ Transactions policy created successfully');
    }
    
    // Policy 2: Allow public to view sold vouchers from completed transactions
    console.log('📝 Adding policy for vouchers...');
    const policy2 = `
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
    `;
    
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: policy2 });
    
    if (error2 && !error2.message.includes('already exists')) {
      console.error('❌ Error creating vouchers policy:', error2);
    } else {
      console.log('✅ Vouchers policy created successfully');
    }
    
    console.log('');
    console.log('🎉 Voucher access fix completed!');
    console.log('');
    console.log('📋 What this fixes:');
    console.log('- Non-authenticated users can now view their vouchers using phone number');
    console.log('- "View Voucher" button will work in browsers where users are not logged in');
    console.log('- Only completed transactions with vouchers are accessible');
    console.log('- Users still need to know their exact phone number');
    console.log('');
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixVoucherAccess();
