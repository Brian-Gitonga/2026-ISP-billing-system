import { NextRequest, NextResponse } from 'next/server';
import { querySTKPushStatus } from '@/lib/mpesa';
import { supabaseAdmin } from '@/lib/supabase';
import { assignVoucherAtomically } from '@/lib/voucher-assignment';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutRequestId = searchParams.get('checkoutRequestId');

    if (!checkoutRequestId) {
      return NextResponse.json({ error: 'Missing checkoutRequestId' }, { status: 400 });
    }

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

    // If transaction is already completed, return the stored status
    if (transaction.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        mpesaReceiptNumber: transaction.mpesa_receipt_number,
        voucher: transaction.voucher,
      });
    }

    // IMPORTANT: Handle race condition where transaction is marked as "failed"
    // but voucher was actually assigned (can happen due to callback/polling race)
    if (transaction.status === 'failed') {
      // Check if there's actually an M-Pesa receipt and voucher assigned
      if (transaction.mpesa_receipt_number && transaction.voucher_id) {
        console.log('🔄 Transaction marked as failed but has receipt and voucher, fixing status...');

        // Fix the transaction status
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        return NextResponse.json({
          status: 'completed',
          mpesaReceiptNumber: transaction.mpesa_receipt_number,
          voucher: transaction.voucher,
        });
      }

      // Check if voucher was assigned but transaction status not updated
      if (transaction.voucher_id && transaction.voucher) {
        console.log('🔄 Transaction marked as failed but has voucher, fixing status...');

        // Fix the transaction status
        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        return NextResponse.json({
          status: 'completed',
          mpesaReceiptNumber: transaction.mpesa_receipt_number,
          voucher: transaction.voucher,
        });
      }

      // It's truly failed - no receipt and no voucher
      return NextResponse.json({
        status: 'failed',
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
        // Payment successful - use atomic voucher assignment to prevent race conditions
        console.log(`💳 Payment successful for transaction ${transaction.id}, assigning voucher atomically...`);

        const assignmentResult = await assignVoucherAtomically(
          transaction.plan_id,
          transaction.user_id,
          transaction.phone_number,
          transaction.id
        );

        if (!assignmentResult.success || !assignmentResult.voucher) {
          // No vouchers available - update transaction as failed
          console.error(`❌ No vouchers available for transaction ${transaction.id}`);
          await supabaseAdmin
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id);

          return NextResponse.json({
            status: 'failed',
            error: assignmentResult.error || 'No available vouchers for this plan',
          });
        }

        const assignedVoucher = assignmentResult.voucher;
        console.log(`✅ Voucher ${assignedVoucher.voucher_code} assigned atomically`);

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
            voucher_id: assignedVoucher.id,
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
          voucher: assignedVoucher,
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
