export interface Profile {
  id: string;
  email: string;
  business_name: string;
  phone_number: string;
  portal_slug: string | null;
  commission_rate: number;
  payout_frequency: 'weekly' | 'monthly';
  minimum_payout: number;
  payout_phone_number: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  description: string;
  data_limit: string;
  speed: string;
  price: number;
  duration: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  user_id: string;
  plan_id: string;
  voucher_code: string;
  status: 'available' | 'sold' | 'used';
  sold_to_phone: string | null;
  created_at: string;
  updated_at: string;
  plan?: Plan;
}

export interface Transaction {
  id: string;
  user_id: string;
  plan_id: string;
  voucher_id: string | null;
  phone_number: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  payout_status: 'pending' | 'paid';
  payout_date: string | null;
  checkout_request_id: string;
  mpesa_receipt_number: string | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  plan?: Plan;
  voucher?: Voucher;
}

export interface DashboardStats {
  revenueThisMonth: number;
  revenueLastMonth: number;
  weeklyRevenue: number;
  subscribedHotspotClients: number;
  subscribedPPOEClients: number;
}

export interface Payout {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_transactions: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'paid';
  admin_notes: string | null;
  payment_phone_number: string | null;
  mpesa_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface EarningsStats {
  pendingEarnings: number;
  totalEarnings: number;
  totalCommission: number;
  pendingTransactions: number;
  nextPayoutDate: string | null;
  nextPayoutEarnings?: number;
  nextPayoutCommission?: number;
  thresholdMet?: boolean;
  minimumPayout?: number;
}