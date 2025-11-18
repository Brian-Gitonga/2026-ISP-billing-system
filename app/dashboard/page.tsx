'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingDown, TrendingUp, Users, Wifi } from 'lucide-react';
import { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    weeklyRevenue: 0,
    subscribedHotspotClients: 0,
    subscribedPPOEClients: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: thisMonthTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      const revenueThisMonth = thisMonthTransactions?.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      ) || 0;

      // Get last month revenue
      const startOfLastMonth = new Date();
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      startOfLastMonth.setDate(1);
      startOfLastMonth.setHours(0, 0, 0, 0);

      const endOfLastMonth = new Date(startOfMonth);
      endOfLastMonth.setSeconds(-1);

      const { data: lastMonthTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

      const revenueLastMonth = lastMonthTransactions?.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      ) || 0;

      // Get weekly revenue
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const { data: weeklyTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', startOfWeek.toISOString());

      const weeklyRevenue = weeklyTransactions?.reduce(
        (sum, t) => sum + Number(t.amount),
        0
      ) || 0;

      // Get sold vouchers count (as subscribed clients)
      const { data: soldVouchers } = await supabase
        .from('vouchers')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'sold');

      setStats({
        revenueThisMonth,
        revenueLastMonth,
        weeklyRevenue,
        subscribedHotspotClients: soldVouchers?.length || 0,
        subscribedPPOEClients: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const monthlyChange = calculatePercentageChange(
    stats.revenueThisMonth,
    stats.revenueLastMonth
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-gray-400">Here's what's happening with your ISP business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue This Month */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">REVENUE THIS MONTH</h3>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">
              KSh {stats.revenueThisMonth.toLocaleString()}
            </p>
          </div>
          <div className="mt-3 flex items-center">
            <span className="text-xs text-gray-400">vs last month</span>
            <span
              className={`ml-2 text-xs font-semibold flex items-center ${
                monthlyChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {monthlyChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(monthlyChange).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Subscribed Hotspot Clients */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">
            SUBSCRIBED HOTSPOT CLIENTS
          </h3>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">{stats.subscribedHotspotClients}</p>
          </div>
          <div className="mt-3 flex items-center">
            <span className="text-xs text-gray-400">vs last month</span>
            <span className="ml-2 text-xs font-semibold flex items-center text-blue-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              0%
            </span>
          </div>
        </div>

        {/* Subscribed PPOE Clients */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-pink-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-pink-500/10 p-3 rounded-lg">
              <Wifi className="w-6 h-6 text-pink-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">SUBSCRIBED PPOE CLIENTS</h3>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">{stats.subscribedPPOEClients}</p>
          </div>
          <div className="mt-3 flex items-center">
            <span className="text-xs text-gray-400">vs last month</span>
            <span className="ml-2 text-xs font-semibold flex items-center text-pink-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              0%
            </span>
          </div>
        </div>

        {/* Weekly Revenue */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">WEEKLY REVENUE</h3>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-white">
              KSh {stats.weeklyRevenue.toLocaleString()}
            </p>
          </div>
          <div className="mt-3 flex items-center">
            <span className="text-xs text-gray-400">vs last week</span>
            <span className="ml-2 text-xs font-semibold flex items-center text-yellow-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              0%
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/vouchers"
            className="bg-primary hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition text-center"
          >
            Upload Vouchers
          </a>
          <a
            href="/dashboard/plans"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition text-center"
          >
            Manage Plans
          </a>
          <a
            href="/dashboard/settings"
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition text-center"
          >
            View Portal Link
          </a>
        </div>
      </div>
    </div>
  );
}

