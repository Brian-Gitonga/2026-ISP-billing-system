import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { querySTKPushStatus } from '@/lib/mpesa';
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

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutRequestId = searchParams.get('checkoutRequestId');

    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'Missing checkoutRequestId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find the transaction in our database
    const { data: transaction, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        voucher:vouchers(*)
      `)
      .eq('checkout_request_id', checkoutRequestId)
      .single();

    if (error || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // If transaction is already completed or failed, return the stored status
    if (transaction.status === 'completed' || transaction.status === 'failed') {
      return NextResponse.json({
        status: transaction.status,
        mpesaReceiptNumber: transaction.mpesa_receipt_number,
        voucher: transaction.voucher,
      });
    }

    // If transaction is still pending, query M-Pesa for the latest status
    try {
      console.log(`🔍 Checking M-Pesa status for transaction: ${transaction.id}`);
      const mpesaStatus = await querySTKPushStatus(checkoutRequestId);
      
      console.log(`📊 M-Pesa status result: ResultCode=${mpesaStatus.ResultCode}, ResultDesc=${mpesaStatus.ResultDesc}`);
      
      // Check if payment was successful
      if (mpesaStatus.ResultCode === '0') {
        // Payment successful - find and assign a voucher
        const { data: availableVoucher, error: voucherError } = await supabaseAdmin
          .from('vouchers')
          .select('*')
          .eq('plan_id', transaction.plan_id)
          .eq('user_id', transaction.user_id)
          .eq('status', 'available')
          .limit(1)
          .single();

        if (voucherError || !availableVoucher) {
          // Update transaction as failed - no vouchers available
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id);

          return NextResponse.json({
            status: 'failed',
            error: 'No available vouchers for this plan',
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

        // Update transaction as completed with commission calculations
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            voucher_id: availableVoucher.id,
            mpesa_receipt_number: mpesaStatus.MpesaReceiptNumber || null,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            net_amount: netAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        return NextResponse.json({
          status: 'completed',
          mpesaReceiptNumber: mpesaStatus.MpesaReceiptNumber,
          voucher: availableVoucher,
        });
      } else if (mpesaStatus.ResultCode !== '1037' && mpesaStatus.ResultCode !== '1032' && mpesaStatus.ResultCode !== '1001') {
        // Payment failed - but be very conservative about marking as failed
        // 1037 = still processing, 1032 = cancelled by user, 1001 = insufficient funds but might retry
        const isCancelledByUser = mpesaStatus.ResultCode === '1032';
        const isTimeout = mpesaStatus.ResultDesc?.toLowerCase().includes('timeout');
        const isStillProcessing = mpesaStatus.ResultDesc?.toLowerCase().includes('processing') || 
                                 mpesaStatus.ResultDesc?.toLowerCase().includes('pending');
        
        // Only mark as failed for very specific error codes that are definitely failures
        const definitiveFailureCodes = ['1025', '1019', '1020', '1026', '1027', '1028', '1029'];
        const isDefinitiveFailure = definitiveFailureCodes.includes(mpesaStatus.ResultCode);
        
        if (isDefinitiveFailure && !isCancelledByUser && !isTimeout && !isStillProcessing) {
          console.log(`❌ Marking transaction as failed: ${mpesaStatus.ResultCode} - ${mpesaStatus.ResultDesc}`);
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id);

          return NextResponse.json({
            status: 'failed',
            error: mpesaStatus.ResultDesc || 'Payment failed',
          });
        }
        
        // For all other cases, keep as pending and let callback handle it
        console.log(`⏳ Keeping transaction pending: ${mpesaStatus.ResultCode} - ${mpesaStatus.ResultDesc}`);
      }
    } catch (mpesaError: any) {
      console.error('❌ Error querying M-Pesa status:', mpesaError.message);
      
      // Don't fail the transaction just because we can't query M-Pesa
      // The callback might still come through
      console.log('🔄 Continuing with database status due to M-Pesa query error');
    }

    // Return current database status (still pending)
    return NextResponse.json({
      status: transaction.status,
      mpesaReceiptNumber: transaction.mpesa_receipt_number,
      voucher: transaction.voucher,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
