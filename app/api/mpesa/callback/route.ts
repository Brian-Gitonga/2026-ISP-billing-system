import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getConfig } from '@/lib/config';

// Helper function to create Supabase admin client
function getSupabaseAdmin() {
  const config = getConfig();
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Test endpoint to verify callback URL is reachable
export async function GET() {
  return NextResponse.json({
    message: 'M-Pesa callback endpoint is reachable',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 M-Pesa Callback received at:', new Date().toISOString());
    console.log('📦 Callback body:', JSON.stringify(body, null, 2));

    const { Body } = body;
    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const supabaseAdmin = getSupabaseAdmin();

    // Find the transaction
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('checkout_request_id', CheckoutRequestID)
      .single();

    if (fetchError || !transaction) {
      console.error('❌ Transaction not found for CheckoutRequestID:', CheckoutRequestID);
      console.error('📋 Fetch error:', fetchError);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    console.log('✅ Transaction found:', transaction.id, 'Status:', transaction.status);

    // Skip processing if transaction is already completed
    // But allow processing if it's failed and we have a successful callback
    if (transaction.status === 'completed') {
      console.log('🔄 Transaction already completed, skipping callback');
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already completed' });
    }
    
    // If transaction was marked as failed but we received a successful callback, process it
    if (transaction.status === 'failed' && ResultCode === 0) {
      console.log('🔄 Transaction was marked as failed but callback shows success, processing...');
    }

    // Payment successful
    if (ResultCode === 0 && CallbackMetadata) {
      const items = CallbackMetadata.CallbackMetadataItem || CallbackMetadata.Item;
      const mpesaReceiptNumber = items?.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;

      // Find an available voucher for this plan
      const { data: availableVoucher, error: voucherError } = await supabaseAdmin
        .from('vouchers')
        .select('*')
        .eq('plan_id', transaction.plan_id)
        .eq('user_id', transaction.user_id)
        .eq('status', 'available')
        .limit(1)
        .single();

      if (voucherError || !availableVoucher) {
        console.error('No available voucher found for plan:', transaction.plan_id);

        // Update transaction as completed but without voucher
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'failed',
            mpesa_receipt_number: mpesaReceiptNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        return NextResponse.json({
          error: 'No available vouchers',
          ResultCode: 1,
          ResultDesc: 'No available vouchers for this plan'
        });
      }

      // Update voucher status
      await supabaseAdmin
        .from('vouchers')
        .update({
          status: 'sold',
          sold_to_phone: transaction.phone_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', availableVoucher.id);

      // Get user's commission rate
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('commission_rate')
        .eq('id', transaction.user_id)
        .single();

      const commissionRate = profile?.commission_rate || 8.00;
      const commissionAmount = (transaction.amount * commissionRate) / 100;
      const netAmount = transaction.amount - commissionAmount;

      // Update transaction with commission calculations
      await supabaseAdmin
        .from('transactions')
        .update({
          status: 'completed',
          voucher_id: availableVoucher.id,
          mpesa_receipt_number: mpesaReceiptNumber,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      console.log('🎉 Payment successful! Voucher assigned:', availableVoucher.voucher_code);
      console.log('💰 Commission details:', { commissionRate, commissionAmount, netAmount });
    } else {
      // Payment failed
      await supabaseAdmin
        .from('transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      console.log('❌ Payment failed. ResultCode:', ResultCode, 'ResultDesc:', ResultDesc);
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
