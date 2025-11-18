import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find admin user by email
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (userError || !adminUser) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For now, we'll use a simple password check
    // In production, you should properly hash passwords with bcrypt
    const isValidPassword = await verifyPassword(password, adminUser.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    // Get client IP and user agent
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create session record
    const { error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .insert([
        {
          admin_user_id: adminUser.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: clientIP,
          user_agent: userAgent,
        },
      ]);

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Update last login
    await supabaseAdmin
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminUser.id);

    // Clean up expired sessions
    await supabaseAdmin
      .from('admin_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        full_name: adminUser.full_name,
        role: adminUser.role,
      },
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simple password verification function
// In production, use proper bcrypt comparison
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    // For development, we'll use a simple comparison
    // Replace this with proper bcrypt comparison in production
    if (hashedPassword.startsWith('$2b$')) {
      return await bcrypt.compare(plainPassword, hashedPassword);
    }
    
    // Temporary: allow plain text password for initial setup
    // This should be removed in production
    return plainPassword === 'admin123' && hashedPassword.includes('temp');
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
