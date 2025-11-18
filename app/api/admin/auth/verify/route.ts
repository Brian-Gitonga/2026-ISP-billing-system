import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { session_token } = await request.json();

    if (!session_token) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    // Find valid session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .select(`
        *,
        admin_user:admin_users(*)
      `)
      .eq('session_token', session_token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Check if admin user is still active
    if (!session.admin_user.is_active) {
      return NextResponse.json(
        { error: 'Admin account is deactivated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: session.admin_user.id,
        email: session.admin_user.email,
        full_name: session.admin_user.full_name,
        role: session.admin_user.role,
      },
      session: {
        expires_at: session.expires_at,
      },
    });

  } catch (error) {
    console.error('Admin session verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session_token } = await request.json();

    if (!session_token) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    // Delete the session (logout)
    const { error } = await supabaseAdmin
      .from('admin_sessions')
      .delete()
      .eq('session_token', session_token);

    if (error) {
      console.error('Session deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
