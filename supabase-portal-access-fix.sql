-- Fix portal access for non-authenticated users
-- This allows the portal page to work without requiring user authentication

-- Add public policy for profiles table to allow portal access
CREATE POLICY "Public can view profiles by portal slug" ON public.profiles
  FOR SELECT USING (portal_slug IS NOT NULL);

-- The existing policy "Public can view active plans by portal slug" should now work
-- because it can access the profiles table through the new policy above

-- Verify the policies are working correctly
-- Test query that should work for non-authenticated users:
-- SELECT p.id, p.business_name FROM profiles p WHERE p.portal_slug = 'qtro-wifi';
-- SELECT pl.* FROM plans pl JOIN profiles p ON pl.user_id = p.id WHERE p.portal_slug = 'qtro-wifi' AND pl.is_active = true;
