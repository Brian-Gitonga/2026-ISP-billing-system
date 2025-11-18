const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseAnonKey;

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  envLines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1];
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1];
    }
  });
} catch (error) {
  console.log('Could not read .env.local file');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create client with anon key (simulating non-authenticated user)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testVoucherAccess() {
  try {
    console.log('🧪 Testing voucher access for non-authenticated users...');
    console.log('');
    
    // Test 1: Try to access transactions (should work with new policy)
    console.log('📋 Test 1: Accessing transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'completed')
      .not('voucher_id', 'is', null)
      .limit(5);
    
    if (transError) {
      console.log('❌ Transactions access failed:', transError.message);
    } else {
      console.log(`✅ Transactions access successful! Found ${transactions?.length || 0} completed transactions with vouchers`);
    }
    
    // Test 2: Try to access vouchers (should work with new policy)
    console.log('');
    console.log('📋 Test 2: Accessing vouchers...');
    const { data: vouchers, error: vouchError } = await supabase
      .from('vouchers')
      .select('*')
      .eq('status', 'sold')
      .limit(5);
    
    if (vouchError) {
      console.log('❌ Vouchers access failed:', vouchError.message);
    } else {
      console.log(`✅ Vouchers access successful! Found ${vouchers?.length || 0} sold vouchers`);
    }
    
    // Test 3: Try the actual query used in the portal
    console.log('');
    console.log('📋 Test 3: Testing portal query (with join)...');
    const { data: portalData, error: portalError } = await supabase
      .from('transactions')
      .select(`
        *,
        vouchers (
          voucher_code
        )
      `)
      .eq('status', 'completed')
      .not('voucher_id', 'is', null)
      .limit(1);
    
    if (portalError) {
      console.log('❌ Portal query failed:', portalError.message);
    } else {
      console.log(`✅ Portal query successful! Found ${portalData?.length || 0} transactions with voucher details`);
      if (portalData && portalData.length > 0) {
        console.log('   Sample voucher code:', portalData[0].vouchers?.voucher_code || 'N/A');
      }
    }
    
    console.log('');
    console.log('🎯 Summary:');
    if (!transError && !vouchError && !portalError) {
      console.log('✅ All tests passed! Voucher viewing should work for non-authenticated users.');
    } else {
      console.log('❌ Some tests failed. The RLS policies may not be applied yet.');
      console.log('');
      console.log('📋 To fix this, please run the following SQL in your Supabase dashboard:');
      console.log('');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of supabase-fix-voucher-access.sql');
      console.log('4. Execute the SQL');
    }
    console.log('');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testVoucherAccess();
