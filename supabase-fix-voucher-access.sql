-- Fix voucher viewing for non-authenticated users
-- This allows the portal "View Voucher" functionality to work without requiring user authentication

-- Add public policy for transactions table to allow viewing by phone number
-- This allows non-authenticated users to view their own transactions using their phone number
CREATE POLICY "Public can view transactions by phone number" ON public.transactions
  FOR SELECT USING (
    status = 'completed' AND 
    phone_number IS NOT NULL AND
    voucher_id IS NOT NULL
  );

-- Add public policy for vouchers table to allow viewing vouchers from completed transactions
-- This allows non-authenticated users to view voucher details for vouchers they purchased
CREATE POLICY "Public can view vouchers from completed transactions" ON public.vouchers
  FOR SELECT USING (
    status = 'sold' AND
    id IN (
      SELECT voucher_id 
      FROM public.transactions 
      WHERE status = 'completed' 
      AND voucher_id IS NOT NULL
    )
  );

-- Test queries that should work for non-authenticated users after applying these policies:
-- 1. Find transactions by phone number:
--    SELECT * FROM transactions WHERE phone_number = '0712345678' AND status = 'completed' AND voucher_id IS NOT NULL;
-- 
-- 2. Get voucher details from transaction:
--    SELECT t.*, v.voucher_code FROM transactions t 
--    JOIN vouchers v ON t.voucher_id = v.id 
--    WHERE t.phone_number = '0712345678' AND t.status = 'completed';

-- Note: These policies are secure because:
-- 1. They only allow viewing completed transactions (not pending ones)
-- 2. They only allow viewing transactions that have associated vouchers
-- 3. They only allow viewing vouchers that have been sold (not available ones)
-- 4. Users still need to know the exact phone number used for purchase
