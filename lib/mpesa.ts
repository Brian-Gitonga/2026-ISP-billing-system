import axios from 'axios';

const MPESA_BASE_URL = process.env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// Access token cache
let accessTokenCache: { token: string; expiresAt: number } | null = null;

export interface MpesaSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallbackResponse {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

/**
 * Get M-Pesa access token with caching
 */
export async function getMpesaAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (accessTokenCache && Date.now() < accessTokenCache.expiresAt) {
    console.log('🔄 Using cached M-Pesa access token');
    return accessTokenCache.token;
  }

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  try {
    console.log('🔑 Fetching new M-Pesa access token...');
    const response = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const token = response.data.access_token;
    const expiresIn = parseInt(response.data.expires_in || '3600'); // Default 1 hour
    
    // Cache the token with 5 minute buffer before expiry
    accessTokenCache = {
      token,
      expiresAt: Date.now() + (expiresIn - 300) * 1000
    };

    console.log('✅ M-Pesa access token obtained and cached');
    return token;
  } catch (error: any) {
    console.error('❌ Error getting M-Pesa access token:', error.response?.data || error.message);
    // Clear cache on error
    accessTokenCache = null;
    throw new Error(`Failed to get M-Pesa access token: ${error.response?.data?.error_description || error.message}`);
  }
}

/**
 * Generate M-Pesa password
 */
export function generateMpesaPassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);

  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  return { password, timestamp };
}

/**
 * Initiate STK Push
 */
export async function initiateSTKPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string
): Promise<MpesaSTKPushResponse> {
  const accessToken = await getMpesaAccessToken();
  const { password, timestamp } = generateMpesaPassword();

  // Format phone number (remove leading 0 or +254, add 254)
  let formattedPhone = phoneNumber.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.slice(1);
  } else if (formattedPhone.startsWith('+254')) {
    formattedPhone = formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith('254')) {
    formattedPhone = '254' + formattedPhone;
  }

  // Use the configured callback URL
  let callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://2039453e205c.ngrok-free.app/api/mpesa/callback';

  // Always use the real callback URL since you mentioned ngrok is working well
  console.log('🔗 Using callback URL:', callbackUrl);

  // Validate that we have a proper HTTPS callback URL
  if (!callbackUrl.startsWith('https://')) {
    console.warn('⚠️  M-Pesa callback URL should be HTTPS:', callbackUrl);
  }

  const finalCallbackUrl = callbackUrl;

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(amount),
    PartyA: formattedPhone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: finalCallbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  try {
    console.log('📤 Sending STK Push request to M-Pesa...');
    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout
      }
    );

    console.log('✅ STK Push response received:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error initiating STK push:', error.response?.data || error.message);
    
    // Handle specific M-Pesa errors
    if (error.response?.status === 401) {
      // Clear cached token on auth error
      accessTokenCache = null;
      throw new Error('Authentication failed. Please try again.');
    }
    
    const errorMessage = error.response?.data?.errorMessage || 
                        error.response?.data?.error_description ||
                        error.message || 
                        'Failed to initiate payment';
    
    throw new Error(errorMessage);
  }
}

/**
 * Query STK Push transaction status
 */
export async function querySTKPushStatus(checkoutRequestId: string): Promise<any> {
  const accessToken = await getMpesaAccessToken();
  const { password, timestamp } = generateMpesaPassword();

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  try {
    console.log('🔍 Querying STK Push status from M-Pesa...');
    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log('📊 STK Push status response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error querying STK push status:', error.response?.data || error.message);
    
    // Handle specific M-Pesa errors
    if (error.response?.status === 401) {
      // Clear cached token on auth error
      accessTokenCache = null;
      throw new Error('Authentication failed during status check');
    }
    
    const errorMessage = error.response?.data?.errorMessage || 
                        error.response?.data?.error_description ||
                        error.message || 
                        'Failed to query payment status';
    
    throw new Error(errorMessage);
  }
}

