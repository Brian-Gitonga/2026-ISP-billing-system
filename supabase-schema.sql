-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  business_name TEXT,
  phone_number TEXT,
  portal_slug TEXT UNIQUE,
  commission_rate DECIMAL(5,2) DEFAULT 8.00,
  payout_frequency TEXT DEFAULT 'monthly', -- 'weekly', 'monthly'
  minimum_payout DECIMAL(10,2) DEFAULT 1000.00,
  payout_phone_number TEXT, -- Phone number for receiving payments
  is_admin BOOLEAN DEFAULT FALSE, -- Admin access flag
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plans table
CREATE TABLE public.plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  data_limit TEXT,
  speed TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  voucher_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available', -- 'available', 'sold', 'used'
  sold_at TIMESTAMP WITH TIME ZONE,
  sold_to_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 8.00,
  commission_amount DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) DEFAULT 0.00, -- Amount owed to ISP (amount - commission)
  payout_status TEXT DEFAULT 'pending', -- 'pending', 'paid'
  payout_date TIMESTAMP WITH TIME ZONE,
  mpesa_receipt_number TEXT,
  mpesa_transaction_id TEXT,
  checkout_request_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_vouchers_user_id ON public.vouchers(user_id);
CREATE INDEX idx_vouchers_plan_id ON public.vouchers(plan_id);
CREATE INDEX idx_vouchers_status ON public.vouchers(status);
CREATE INDEX idx_vouchers_code ON public.vouchers(voucher_code);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_phone ON public.transactions(phone_number);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_checkout_request ON public.transactions(checkout_request_id);
CREATE INDEX idx_plans_user_id ON public.plans(user_id);
CREATE INDEX idx_profiles_slug ON public.profiles(portal_slug);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for plans
CREATE POLICY "Users can view own plans" ON public.plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans" ON public.plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans" ON public.plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans" ON public.plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public can view active plans by portal slug" ON public.plans
  FOR SELECT USING (
    is_active = true AND 
    user_id IN (SELECT id FROM public.profiles WHERE portal_slug IS NOT NULL)
  );

-- RLS Policies for vouchers
CREATE POLICY "Users can view own vouchers" ON public.vouchers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vouchers" ON public.vouchers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vouchers" ON public.vouchers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vouchers" ON public.vouchers
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payouts" ON public.payouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all payouts" ON public.payouts
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert payouts" ON public.payouts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update payouts" ON public.payouts
  FOR UPDATE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Payouts table for tracking batch payments
CREATE TABLE public.payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_transactions INTEGER NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL, -- Total customer payments
  commission_amount DECIMAL(10,2) NOT NULL, -- Platform commission
  net_amount DECIMAL(10,2) NOT NULL, -- Amount paid to ISP
  status TEXT DEFAULT 'pending', -- 'pending', 'paid'
  admin_notes TEXT,
  payment_phone_number TEXT, -- Phone number used for payment
  mpesa_transaction_id TEXT, -- M-Pesa transaction ID when paid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payouts
CREATE INDEX idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_payouts_period ON public.payouts(period_start, period_end);

-- Trigger for payouts updated_at
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

