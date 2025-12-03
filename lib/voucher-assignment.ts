/**
 * Atomic Voucher Assignment Module
 * 
 * This module handles voucher assignment in a thread-safe manner to prevent
 * race conditions where the same voucher could be assigned to multiple transactions.
 * 
 * The solution uses a two-pronged approach:
 * 1. First, try to use the PostgreSQL RPC function (if available)
 * 2. Fall back to a conditional UPDATE with verification
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface AssignedVoucher {
  id: string;
  voucher_code: string;
  plan_id: string;
  user_id: string;
  status: string;
  sold_to_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoucherAssignmentResult {
  success: boolean;
  voucher: AssignedVoucher | null;
  error: string | null;
}

/**
 * Atomically assigns a voucher to a phone number.
 * Uses PostgreSQL RPC if available, falls back to conditional UPDATE.
 * 
 * @param planId - The plan ID to find vouchers for
 * @param userId - The user (business owner) ID
 * @param phoneNumber - The phone number to assign the voucher to
 * @param transactionId - The transaction ID (for logging and verification)
 * @returns The assigned voucher or null if none available
 */
export async function assignVoucherAtomically(
  planId: string,
  userId: string,
  phoneNumber: string,
  transactionId: string
): Promise<VoucherAssignmentResult> {
  console.log(`🔐 Atomic voucher assignment started for transaction: ${transactionId}`);
  
  // First, check if this transaction already has a voucher assigned
  const { data: existingTransaction } = await supabaseAdmin
    .from('transactions')
    .select('voucher_id')
    .eq('id', transactionId)
    .single();
  
  if (existingTransaction?.voucher_id) {
    console.log(`✅ Transaction ${transactionId} already has voucher assigned`);
    
    // Fetch the voucher details
    const { data: existingVoucher } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('id', existingTransaction.voucher_id)
      .single();
    
    return {
      success: true,
      voucher: existingVoucher as AssignedVoucher,
      error: null
    };
  }
  
  // Try to use the RPC function first (most reliable)
  try {
    const { data: rpcVoucher, error: rpcError } = await supabaseAdmin
      .rpc('assign_voucher_atomic', {
        p_plan_id: planId,
        p_user_id: userId,
        p_phone_number: phoneNumber
      })
      .single();

    if (!rpcError && rpcVoucher) {
      const typedVoucher = rpcVoucher as AssignedVoucher;
      console.log(`✅ Voucher assigned via RPC: ${typedVoucher.voucher_code}`);
      return {
        success: true,
        voucher: typedVoucher,
        error: null
      };
    }

    // If RPC returned no rows, no vouchers available
    if (rpcError?.code === 'PGRST116') {
      console.log(`❌ No available vouchers for plan ${planId}`);
      return {
        success: false,
        voucher: null,
        error: 'No available vouchers for this plan'
      };
    }

    // If RPC function doesn't exist, fall through to fallback
    if (rpcError?.message?.includes('function') || rpcError?.code === '42883') {
      console.log(`⚠️ RPC function not found, using fallback method`);
    } else if (rpcError) {
      console.error(`❌ RPC error: ${rpcError.message}`);
    }
  } catch (rpcErr: any) {
    console.log(`⚠️ RPC call failed, using fallback: ${rpcErr.message}`);
  }
  
  // Fallback: Use conditional UPDATE approach
  return await assignVoucherWithFallback(planId, userId, phoneNumber, transactionId);
}

/**
 * Fallback method for voucher assignment when RPC is not available.
 * Uses a SELECT-UPDATE pattern with verification to minimize race conditions.
 *
 * The key safeguard: After updating the voucher, we verify it was actually
 * assigned to this transaction's phone number. If not, we retry with a different voucher.
 */
async function assignVoucherWithFallback(
  planId: string,
  userId: string,
  phoneNumber: string,
  transactionId: string,
  retryCount: number = 0
): Promise<VoucherAssignmentResult> {
  const MAX_RETRIES = 5;

  if (retryCount >= MAX_RETRIES) {
    console.error(`❌ Max retries reached for transaction ${transactionId}`);
    return {
      success: false,
      voucher: null,
      error: 'Failed to assign voucher after multiple attempts'
    };
  }

  console.log(`🔄 Fallback assignment attempt ${retryCount + 1} for transaction ${transactionId}`);

  // Step 1: Find available vouchers (get a few to have alternatives)
  const { data: availableVouchers, error: fetchError } = await supabaseAdmin
    .from('vouchers')
    .select('id, voucher_code')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(5);

  if (fetchError || !availableVouchers || availableVouchers.length === 0) {
    console.log(`❌ No available vouchers for plan ${planId}`);
    return {
      success: false,
      voucher: null,
      error: 'No available vouchers for this plan'
    };
  }

  // Step 2: Try to update the first voucher with a conditional check
  // The WHERE clause ensures we only update if it's still 'available'
  const targetVoucher = availableVouchers[retryCount % availableVouchers.length];

  const { data: updatedVoucher, error: updateError } = await supabaseAdmin
    .from('vouchers')
    .update({
      status: 'sold',
      sold_to_phone: phoneNumber,
      updated_at: new Date().toISOString()
    })
    .eq('id', targetVoucher.id)
    .eq('status', 'available')  // Critical: Only update if still available
    .select('*')
    .single();

  // Step 3: Verify the update was successful
  if (updateError || !updatedVoucher) {
    // Another request grabbed this voucher first, retry with next one
    console.log(`⚠️ Voucher ${targetVoucher.voucher_code} was grabbed by another request, retrying...`);
    return await assignVoucherWithFallback(planId, userId, phoneNumber, transactionId, retryCount + 1);
  }

  // Step 4: Double-check the voucher was assigned to our phone number
  const { data: verifyVoucher } = await supabaseAdmin
    .from('vouchers')
    .select('*')
    .eq('id', targetVoucher.id)
    .eq('sold_to_phone', phoneNumber)
    .single();

  if (!verifyVoucher) {
    // Race condition: another request changed the phone number
    console.log(`⚠️ Voucher verification failed, retrying with different voucher...`);
    return await assignVoucherWithFallback(planId, userId, phoneNumber, transactionId, retryCount + 1);
  }

  console.log(`✅ Voucher ${verifyVoucher.voucher_code} assigned to ${phoneNumber}`);
  return {
    success: true,
    voucher: verifyVoucher as AssignedVoucher,
    error: null
  };
}

