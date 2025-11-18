'use client';

import { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AdminSession {
  expires_at: string;
}

interface UseAdminAuthReturn {
  admin: AdminUser | null;
  session: AdminSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify session on mount and periodically
  useEffect(() => {
    verifySession();
    
    // Check session every 5 minutes
    const interval = setInterval(verifySession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const verifySession = async (): Promise<boolean> => {
    try {
      const sessionToken = localStorage.getItem('admin_session');
      
      if (!sessionToken) {
        setAdmin(null);
        setSession(null);
        setLoading(false);
        return false;
      }

      const response = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_token: sessionToken }),
      });

      if (!response.ok) {
        // Session invalid, clear local storage
        localStorage.removeItem('admin_session');
        setAdmin(null);
        setSession(null);
        setLoading(false);
        return false;
      }

      const data = await response.json();
      setAdmin(data.admin);
      setSession(data.session);
      setLoading(false);
      return true;

    } catch (error) {
      console.error('Session verification error:', error);
      localStorage.removeItem('admin_session');
      setAdmin(null);
      setSession(null);
      setLoading(false);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store session token
    localStorage.setItem('admin_session', data.session_token);
    
    // Update state
    setAdmin(data.admin);
    setSession({ expires_at: data.expires_at });
  };

  const logout = async (): Promise<void> => {
    try {
      const sessionToken = localStorage.getItem('admin_session');
      
      if (sessionToken) {
        await fetch('/api/admin/auth/verify', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_token: sessionToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state and storage
      localStorage.removeItem('admin_session');
      setAdmin(null);
      setSession(null);
    }
  };

  return {
    admin,
    session,
    loading,
    login,
    logout,
    verifySession,
  };
}
