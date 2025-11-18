import { NextRequest, NextResponse } from 'next/server';
import { initiateSTKPush } from '@/lib/mpesa';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, amount, planId, portalSlug } = await request.json();

    if (!phoneNumber || !amount || !planId || !portalSlug) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user by portal slug
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('portal_slug', portalSlug)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Portal not found' },
        { status: 404 }
      );
    }

    // Check if there's an available voucher for this plan
    const { data: availableVoucher, error: voucherError } = await supabaseAdmin
      .from('vouchers')
      .select('id')
      .eq('user_id', profile.id)
      .eq('plan_id', planId)
      .eq('status', 'available')
      .limit(1)
      .single();

    if (voucherError || !availableVoucher) {
      return NextResponse.json(
        { error: 'No vouchers available for this plan' },
        { status: 400 }
      );
    }

    console.log('🚀 Initiating STK Push for:', phoneNumber, 'Amount:', amount);

    // Initiate STK Push
    const mpesaResponse = await initiateSTKPush(
      phoneNumber,
      amount,
      `VOUCHER-${planId.slice(0, 8)}`,
      'WiFi Voucher Purchase'
    );

    console.log('📱 M-Pesa STK Response:', mpesaResponse);

    if (mpesaResponse.ResponseCode !== '0') {
      console.error('❌ STK Push failed:', mpesaResponse);
      return NextResponse.json(
        { error: mpesaResponse.ResponseDescription || 'Payment initiation failed' },
        { status: 400 }
      );
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([
        {
          user_id: profile.id,
          plan_id: planId,
          phone_number: phoneNumber,
          amount: amount,
          checkout_request_id: mpesaResponse.CheckoutRequestID,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Error creating transaction:', transactionError);
    } else {
      console.log('✅ Transaction created:', transaction.id, 'CheckoutRequestID:', mpesaResponse.CheckoutRequestID);
    }

    return NextResponse.json({
      success: true,
      checkoutRequestId: mpesaResponse.CheckoutRequestID,
      message: mpesaResponse.CustomerMessage,
    });
  } catch (error: any) {
    console.error('Error in payment initiation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

