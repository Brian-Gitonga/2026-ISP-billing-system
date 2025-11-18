const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPortalAccess() {
  console.log('🔧 Fixing portal access for non-authenticated users...');
  
  try {
    // Add public policy for profiles table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Public can view profiles by portal slug" ON public.profiles FOR SELECT USING (portal_slug IS NOT NULL);`
    });

    if (error) {
      console.error('❌ Error creating policy:', error);
      return;
    }

    console.log('✅ Successfully added public policy for profiles table');
    
    // Test the fix
    console.log('🧪 Testing portal access...');
    
    const { data: testProfile, error: testError } = await supabase
      .from('profiles')
      .select('id, business_name, portal_slug')
      .eq('portal_slug', 'qtro-wifi')
      .single();

    if (testError) {
      console.error('❌ Test failed:', testError);
      return;
    }

    console.log('✅ Test passed - profile accessible:', testProfile);

    // Test plans access
    const { data: testPlans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', testProfile.id)
      .eq('is_active', true);

    if (plansError) {
      console.error('❌ Plans test failed:', plansError);
      return;
    }

    console.log('✅ Plans test passed - found', testPlans.length, 'active plans');
    console.log('🎉 Portal access fix completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Alternative approach using direct SQL execution
async function fixPortalAccessDirect() {
  console.log('🔧 Fixing portal access using direct SQL...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error && error.message.includes('policy')) {
      console.log('✅ RLS policies are active, adding public policy...');
      
      // Use the SQL editor approach
      const sql = `CREATE POLICY "Public can view profiles by portal slug" ON public.profiles FOR SELECT USING (portal_slug IS NOT NULL);`;
      
      console.log('📝 Please run this SQL in your Supabase dashboard:');
      console.log('---');
      console.log(sql);
      console.log('---');
      console.log('🌐 Go to: https://supabase.com/dashboard/project/ffkjlzbegtkglthorjqh/sql');
      
    } else {
      console.log('✅ Profiles table is accessible');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPortalAccessDirect();
