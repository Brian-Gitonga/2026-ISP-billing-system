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

async function testPortalVoucherFlow() {
  try {
    console.log('🧪 Testing complete portal voucher flow for non-authenticated users...');
    console.log('');
    
    // Step 1: Test profile access by portal slug (this should work)
    console.log('📋 Step 1: Testing profile access by portal slug...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, business_name, portal_slug')
      .not('portal_slug', 'is', null)
      .limit(1);
    
    if (profileError) {
      console.log('❌ Profile access failed:', profileError.message);
      return;
    } else {
      console.log(`✅ Profile access successful! Found ${profiles?.length || 0} profiles with portal slugs`);
      if (profiles && profiles.length > 0) {
        console.log('   Sample profile:', profiles[0].business_name, '- Slug:', profiles[0].portal_slug);
      }
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No profiles with portal slugs found. Cannot test further.');
      return;
    }
    
    const testProfile = profiles[0];
    
    // Step 2: Test the exact query used in handleViewVoucher
    console.log('');
    console.log('📋 Step 2: Testing the exact portal query...');
    const testPhoneNumber = '0712345678'; // Test phone number
    
    // First query: Get all transactions for this phone number
    const { data: allTransactions, error: allTransError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testProfile.id)
      .eq('phone_number', testPhoneNumber)
      .order('created_at', { ascending: false });
    
    if (allTransError) {
      console.log('❌ All transactions query failed:', allTransError.message);
    } else {
      console.log(`✅ All transactions query successful! Found ${allTransactions?.length || 0} transactions for phone ${testPhoneNumber}`);
    }
    
    // Second query: Get completed transaction with voucher
    const { data: transaction, error: transError } = await supabase
      .from('transactions')
      .select(`
        *,
        vouchers (
          voucher_code
        )
      `)
      .eq('user_id', testProfile.id)
      .eq('phone_number', testPhoneNumber)
      .eq('status', 'completed')
      .not('voucher_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (transError) {
      console.log('❌ Transaction with voucher query failed:', transError.message);
      console.log('   This might be expected if no transactions exist for the test phone number');
    } else {
      console.log(`✅ Transaction with voucher query successful! Found ${transaction ? 1 : 0} completed transactions with vouchers`);
      if (transaction && transaction.vouchers) {
        console.log('   Voucher code:', transaction.vouchers.voucher_code);
      }
    }
    
    // Step 3: Test with any existing completed transactions
    console.log('');
    console.log('📋 Step 3: Testing with any existing completed transactions...');
    const { data: anyCompletedTrans, error: anyError } = await supabase
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
    
    if (anyError) {
      console.log('❌ Any completed transactions query failed:', anyError.message);
    } else {
      console.log(`✅ Any completed transactions query successful! Found ${anyCompletedTrans?.length || 0} completed transactions with vouchers`);
      if (anyCompletedTrans && anyCompletedTrans.length > 0) {
        const trans = anyCompletedTrans[0];
        console.log('   Sample transaction phone:', trans.phone_number);
        console.log('   Sample voucher code:', trans.vouchers?.voucher_code || 'N/A');
      }
    }
    
    console.log('');
    console.log('🎯 Summary:');
    console.log('✅ Profile access: Working');
    console.log(`${allTransError ? '❌' : '✅'} All transactions query: ${allTransError ? 'Failed' : 'Working'}`);
    console.log(`${transError ? '❌' : '✅'} Voucher transaction query: ${transError ? 'Failed' : 'Working'}`);
    console.log(`${anyError ? '❌' : '✅'} Any completed transactions: ${anyError ? 'Failed' : 'Working'}`);
    
    if (!allTransError && !transError && !anyError) {
      console.log('');
      console.log('🎉 All queries are working! The voucher viewing should work for non-authenticated users.');
      console.log('   If it\'s still not working in the browser, the issue might be:');
      console.log('   1. No completed transactions exist for the phone number being tested');
      console.log('   2. Browser cache issues');
      console.log('   3. Different environment variables between browser and server');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testPortalVoucherFlow();
