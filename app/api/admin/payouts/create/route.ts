import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);
    console.log('Session token:', sessionToken ? 'Present' : 'Missing');
    
    // Verify admin session - simplified version
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString());

    console.log('Session query result:', { sessions, sessionError });

    if (sessionError) {
      console.error('Session verification error:', sessionError);
      return NextResponse.json({ error: `Session verification failed: ${sessionError.message}` }, { status: 401 });
    }

    if (!sessions || sessions.length === 0) {
      console.log('No valid session found');
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const session = sessions[0];
    console.log('Valid session found:', session.id);

    // Parse request body
    const body = await request.json();
    const { userPayout } = body;

    if (!userPayout) {
      return NextResponse.json({ error: 'Missing payout data' }, { status: 400 });
    }

    // Validate input data
    if (!userPayout.transactions || userPayout.transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions found for this user' }, { status: 400 });
    }

    if (!userPayout.user_id) {
      return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
    }

    const now = new Date();

    // Get the most recent payout to determine the correct period start
    const { data: lastPayoutData } = await supabaseAdmin
      .from('payouts')
      .select('period_end')
      .eq('user_id', userPayout.user_id)
      .eq('status', 'paid')
      .order('period_end', { ascending: false })
      .limit(1);

    const lastPayout = lastPayoutData && lastPayoutData.length > 0 ? lastPayoutData[0] : null;

    let periodStart: Date;

    if (lastPayout) {
      // Start from the day after the last payout period ended
      periodStart = new Date(lastPayout.period_end);
      periodStart.setDate(periodStart.getDate() + 1);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      // No previous payouts, use the earliest transaction date
      const earliestTransaction = userPayout.transactions.reduce((earliest: any, current: any) =>
        new Date(current.created_at) < new Date(earliest.created_at) ? current : earliest
      );
      periodStart = new Date(earliestTransaction.created_at);
      periodStart.setHours(0, 0, 0, 0);
    }

    // Prepare payout data
    const payoutData = {
      user_id: userPayout.user_id,
      period_start: periodStart.toISOString(),
      period_end: now.toISOString(),
      total_transactions: userPayout.transactionCount,
      gross_amount: userPayout.totalAmount,
      commission_amount: userPayout.totalCommission,
      net_amount: userPayout.netAmount,
      payment_phone_number: userPayout.profile.payout_phone_number || userPayout.profile.phone_number,
      status: 'pending',
    };

    console.log('Creating payout via API:', payoutData);

    // Create payout record using service role
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .insert([payoutData])
      .select()
      .single();

    if (payoutError) {
      console.error('Payout creation error:', payoutError);
      return NextResponse.json({ error: `Failed to create payout: ${payoutError.message}` }, { status: 500 });
    }

    console.log('Payout created successfully:', payout);

    return NextResponse.json({ 
      success: true, 
      payout,
      message: `Payout created for ${userPayout.profile.business_name}. Please process the M-Pesa payment manually.`
    });

  } catch (error) {
    console.error('Error in payout creation API:', error);
    return NextResponse.json({ 
      error: `Failed to create payout: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
