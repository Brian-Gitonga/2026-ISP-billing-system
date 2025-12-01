'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setSupabaseConfigured(configured);

    // Only check user if Supabase is configured
    if (configured) {
      const checkUser = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error checking user authentication:', error);
          // Don't redirect on error, just show the login form
        }
      };

      checkUser();
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!supabaseConfigured) {
        throw new Error('Supabase environment variables not configured. Please check your .env.local file.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full p-2 shadow-lg">
              <Image
                src="/favicon.png"
                alt="Qtro ISP Logo"
                width={48}
                height={48}
                className="rounded-full"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">
            Welcome Back
          </h1>
          <p className="text-slate-600 mt-2">
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {!supabaseConfigured && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm">
            <strong>Setup Required:</strong> Please configure your Supabase environment variables in <code className="bg-amber-100 px-1 rounded">.env.local</code> file.
            See <code className="bg-amber-100 px-1 rounded">SETUP.md</code> for instructions.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-800 placeholder-slate-400"
              placeholder="qtroispAdmin@gmail.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-800 placeholder-slate-400"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500 focus:ring-2" />
              <span className="ml-2 text-sm text-slate-600">Remember me</span>
            </label>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-500 font-semibold transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

