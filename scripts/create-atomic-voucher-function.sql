-- ============================================================
-- ATOMIC VOUCHER ASSIGNMENT FUNCTION
-- ============================================================
-- This function prevents race conditions when assigning vouchers
-- by using PostgreSQL's FOR UPDATE SKIP LOCKED feature.
--
-- How it works:
-- 1. Finds an available voucher for the given plan and user
-- 2. Locks that row so no other transaction can access it
-- 3. Updates the voucher status to 'sold'
-- 4. Returns the assigned voucher data
--
-- If another request tries to grab the same voucher, it will
-- automatically skip to the next available one.
-- ============================================================

-- Drop the function if it exists (for clean recreation)
DROP FUNCTION IF EXISTS assign_voucher_atomic(UUID, UUID, TEXT);

-- Create the atomic voucher assignment function
CREATE OR REPLACE FUNCTION assign_voucher_atomic(
  p_plan_id UUID,
  p_user_id UUID,
  p_phone_number TEXT
)
RETURNS TABLE (
  id UUID,
  voucher_code TEXT,
  plan_id UUID,
  user_id UUID,
  status TEXT,
  sold_to_phone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomically find and update an available voucher
  -- FOR UPDATE SKIP LOCKED ensures:
  -- 1. The row is locked exclusively for this transaction
  -- 2. Other transactions will skip locked rows and find the next available one
  -- 3. No two transactions can ever grab the same voucher
  
  RETURN QUERY
  UPDATE vouchers
  SET 
    status = 'sold',
    sold_to_phone = p_phone_number,
    updated_at = NOW()
  WHERE vouchers.id = (
    SELECT v.id
    FROM vouchers v
    WHERE v.plan_id = p_plan_id
      AND v.user_id = p_user_id
      AND v.status = 'available'
    ORDER BY v.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    vouchers.id,
    vouchers.voucher_code,
    vouchers.plan_id,
    vouchers.user_id,
    vouchers.status,
    vouchers.sold_to_phone,
    vouchers.created_at,
    vouchers.updated_at;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION assign_voucher_atomic(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_voucher_atomic(UUID, UUID, TEXT) TO service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION assign_voucher_atomic IS 'Atomically assigns an available voucher to a phone number, preventing race conditions using FOR UPDATE SKIP LOCKED';

