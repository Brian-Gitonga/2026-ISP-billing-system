-- Migration: Add Earnings and Payouts System
-- Date: 2025-11-09
-- Description: Adds commission tracking, payout management, and admin authentication

-- 1. Update profiles table with new fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS payout_frequency TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS minimum_payout DECIMAL(10,2) DEFAULT 1000.00,
ADD COLUMN IF NOT EXISTS payout_phone_number TEXT,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Update transactions table with commission tracking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payout_date TIMESTAMP WITH TIME ZONE;

-- 3. Create payouts table for batch payment tracking
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_transactions INTEGER NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  admin_notes TEXT,
  payment_phone_number TEXT,
  mpesa_transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create admin_users table for separate admin authentication
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin', -- 'admin', 'super_admin'
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create admin_sessions table for session management
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON public.payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_transactions_payout_status ON public.transactions(payout_status);
CREATE INDEX IF NOT EXISTS idx_transactions_commission ON public.transactions(commission_amount);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON public.admin_sessions(expires_at);

-- 7. Enable Row Level Security for new tables
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for payouts
-- Users can view their own payouts
CREATE POLICY "Users can view own payouts" ON public.payouts
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policies - Allow admins to manage all payouts
CREATE POLICY "Admins can manage all payouts" ON public.payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can also manage payouts
CREATE POLICY "Service role can manage payouts" ON public.payouts
  FOR ALL USING (auth.role() = 'service_role');

-- 9. RLS Policies for admin tables (restrict to service role only)
CREATE POLICY "Service role can manage admin users" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage admin sessions" ON public.admin_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- 10. Add triggers for updated_at columns
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert the main admin user
-- Note: Using temporary password 'admin123' for initial setup
-- This should be changed immediately after first login
INSERT INTO public.admin_users (email, password_hash, full_name, role, is_active)
VALUES (
  'kinyabrenda291@gmail.com',
  'temp_admin123', -- Temporary password: admin123
  'Brenda Kinya',
  'super_admin',
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- 12. Update existing transactions to calculate commission (if any exist)
-- This will set commission for existing completed transactions
UPDATE public.transactions 
SET 
  commission_rate = COALESCE(
    (SELECT commission_rate FROM public.profiles WHERE id = transactions.user_id), 
    8.00
  ),
  commission_amount = amount * COALESCE(
    (SELECT commission_rate FROM public.profiles WHERE id = transactions.user_id), 
    8.00
  ) / 100,
  net_amount = amount - (amount * COALESCE(
    (SELECT commission_rate FROM public.profiles WHERE id = transactions.user_id), 
    8.00
  ) / 100)
WHERE status = 'completed' 
  AND commission_amount = 0.00;

-- 13. Create function to automatically calculate commission on transaction insert/update
CREATE OR REPLACE FUNCTION calculate_transaction_commission()
RETURNS TRIGGER AS $$
DECLARE
  user_commission_rate DECIMAL(5,2);
BEGIN
  -- Get the user's commission rate
  SELECT commission_rate INTO user_commission_rate
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Use default rate if user rate not found
  IF user_commission_rate IS NULL THEN
    user_commission_rate := 8.00;
  END IF;
  
  -- Calculate commission and net amount
  NEW.commission_rate := user_commission_rate;
  NEW.commission_amount := NEW.amount * user_commission_rate / 100;
  NEW.net_amount := NEW.amount - NEW.commission_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger to automatically calculate commission
DROP TRIGGER IF EXISTS calculate_commission_trigger ON public.transactions;
CREATE TRIGGER calculate_commission_trigger
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION calculate_transaction_commission();

-- 15. Create function to get next payout date
CREATE OR REPLACE FUNCTION get_next_payout_date(user_uuid UUID)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  user_frequency TEXT;
  next_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's payout frequency
  SELECT payout_frequency INTO user_frequency
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Default to monthly if not set
  IF user_frequency IS NULL THEN
    user_frequency := 'monthly';
  END IF;
  
  -- Calculate next payout date
  IF user_frequency = 'weekly' THEN
    -- Next Saturday
    next_date := date_trunc('week', NOW()) + INTERVAL '6 days';
    IF next_date <= NOW() THEN
      next_date := next_date + INTERVAL '1 week';
    END IF;
  ELSE
    -- First day of next month
    next_date := date_trunc('month', NOW()) + INTERVAL '1 month';
  END IF;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- 16. Create view for user earnings summary
CREATE OR REPLACE VIEW user_earnings_summary AS
SELECT 
  p.id as user_id,
  p.business_name,
  p.commission_rate,
  p.payout_frequency,
  p.minimum_payout,
  p.payout_phone_number,
  COALESCE(SUM(CASE WHEN t.payout_status = 'pending' THEN t.net_amount ELSE 0 END), 0) as pending_earnings,
  COALESCE(SUM(CASE WHEN t.payout_status = 'paid' THEN t.net_amount ELSE 0 END), 0) as total_paid_earnings,
  COALESCE(SUM(t.net_amount), 0) as total_earnings,
  COALESCE(SUM(t.commission_amount), 0) as total_commission_paid,
  COUNT(CASE WHEN t.payout_status = 'pending' THEN 1 END) as pending_transactions,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as total_transactions,
  get_next_payout_date(p.id) as next_payout_date
FROM public.profiles p
LEFT JOIN public.transactions t ON p.id = t.user_id AND t.status = 'completed'
GROUP BY p.id, p.business_name, p.commission_rate, p.payout_frequency, p.minimum_payout, p.payout_phone_number;

-- 17. Grant necessary permissions
GRANT SELECT ON user_earnings_summary TO authenticated;
GRANT SELECT ON user_earnings_summary TO service_role;

-- Migration completed successfully
-- Remember to:
-- 1. Update the admin password hash with a proper bcrypt hash
-- 2. Set up proper environment variables for admin authentication
-- 3. Test all functionality before deploying to production
