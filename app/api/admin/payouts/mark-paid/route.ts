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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);
    
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
    const { payoutId, mpesaTransactionId } = body;

    if (!payoutId || !mpesaTransactionId) {
      return NextResponse.json({ error: 'Missing payout ID or M-Pesa transaction ID' }, { status: 400 });
    }

    // Get payout details first
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    // Update payout status
    const { error: updatePayoutError } = await supabaseAdmin
      .from('payouts')
      .update({
        status: 'paid',
        mpesa_transaction_id: mpesaTransactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payoutId);

    if (updatePayoutError) {
      console.error('Error updating payout:', updatePayoutError);
      return NextResponse.json({ error: `Failed to update payout: ${updatePayoutError.message}` }, { status: 500 });
    }

    // Update all related transactions as paid
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .update({
        payout_status: 'paid',
        payout_date: new Date().toISOString(),
      })
      .eq('user_id', payout.user_id)
      .gte('created_at', payout.period_start)
      .lte('created_at', payout.period_end)
      .eq('payout_status', 'pending');

    if (transactionError) {
      console.error('Error updating transactions:', transactionError);
      return NextResponse.json({ error: `Failed to update transactions: ${transactionError.message}` }, { status: 500 });
    }

    console.log('Payout marked as paid successfully:', payoutId);

    return NextResponse.json({ 
      success: true, 
      message: 'Payout marked as paid successfully!'
    });

  } catch (error) {
    console.error('Error in mark payout as paid API:', error);
    return NextResponse.json({ 
      error: `Failed to mark payout as paid: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
