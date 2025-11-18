'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Users, TrendingUp, Clock } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  platformCommission: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalRevenue: 0,
    platformCommission: 0,
    pendingPayouts: 0,
    pendingPayoutAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total revenue and commission
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, commission_amount, payout_status')
        .eq('status', 'completed');

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const platformCommission = transactions?.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0) || 0;

      // Get pending payouts
      const pendingTransactions = transactions?.filter(t => t.payout_status === 'pending') || [];
      const pendingPayoutAmount = pendingTransactions.reduce((sum, t) => sum + Number(t.amount - (t.commission_amount || 0)), 0);

      setStats({
        totalUsers: totalUsers || 0,
        totalRevenue,
        platformCommission,
        pendingPayouts: pendingTransactions.length,
        pendingPayoutAmount,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">TOTAL ISP USERS</h3>
          <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-sm text-gray-400 mt-2">Active accounts</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">TOTAL REVENUE</h3>
          <p className="text-3xl font-bold text-white">
            KSh {stats.totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-2">All transactions</p>
        </div>

        {/* Platform Commission */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">PLATFORM COMMISSION</h3>
          <p className="text-3xl font-bold text-white">
            KSh {stats.platformCommission.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-2">Total earned</p>
        </div>

        {/* Pending Payouts */}
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">PENDING PAYOUTS</h3>
          <p className="text-3xl font-bold text-white">{stats.pendingPayouts}</p>
          <p className="text-sm text-gray-400 mt-2">
            KSh {stats.pendingPayoutAmount.toLocaleString()} to pay
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/payouts"
            className="bg-primary hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition text-center"
          >
            Process Payouts
          </a>
          <a
            href="/admin/users"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition text-center"
          >
            Manage Users
          </a>
          <a
            href="/admin/reports"
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition text-center"
          >
            View Reports
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div>
              <p className="text-white font-medium">New user registration</p>
              <p className="text-gray-400 text-sm">User signed up and created account</p>
            </div>
            <span className="text-gray-400 text-sm">2 hours ago</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div>
              <p className="text-white font-medium">Payout processed</p>
              <p className="text-gray-400 text-sm">KSh 5,000 paid to ISP user</p>
            </div>
            <span className="text-gray-400 text-sm">1 day ago</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-white font-medium">High volume sales</p>
              <p className="text-gray-400 text-sm">User sold 50+ vouchers today</p>
            </div>
            <span className="text-gray-400 text-sm">2 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
