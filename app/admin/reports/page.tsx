'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, Users, Calendar, Download } from 'lucide-react';

interface ReportStats {
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  activeUsers: number;
  monthlyRevenue: { month: string; revenue: number; commission: number }[];
  topUsers: { business_name: string; revenue: number; transactions: number }[];
}

export default function AdminReportsPage() {
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    totalCommission: 0,
    totalPayouts: 0,
    activeUsers: 0,
    monthlyRevenue: [],
    topUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Get transactions within date range
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          profile:profiles(business_name)
        `)
        .eq('status', 'completed')
        .gte('created_at', daysAgo.toISOString());

      // Calculate basic stats
      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalCommission = transactions?.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0) || 0;

      // Get total payouts
      const { data: payouts } = await supabase
        .from('payouts')
        .select('net_amount')
        .eq('status', 'paid')
        .gte('created_at', daysAgo.toISOString());

      const totalPayouts = payouts?.reduce((sum, p) => sum + Number(p.net_amount), 0) || 0;

      // Get active users (users with transactions in period)
      const activeUserIds = new Set(transactions?.map(t => t.user_id) || []);
      const activeUsers = activeUserIds.size;

      // Calculate monthly revenue (last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setSeconds(-1);

        const monthTransactions = transactions?.filter(t => {
          const transactionDate = new Date(t.created_at);
          return transactionDate >= monthStart && transactionDate <= monthEnd;
        }) || [];

        const monthRevenue = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const monthCommission = monthTransactions.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0);

        monthlyRevenue.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          commission: monthCommission,
        });
      }

      // Get top users by revenue
      const userRevenue: { [key: string]: { business_name: string; revenue: number; transactions: number } } = {};
      
      transactions?.forEach(t => {
        const userId = t.user_id;
        if (!userRevenue[userId]) {
          userRevenue[userId] = {
            business_name: t.profile?.business_name || 'Unknown',
            revenue: 0,
            transactions: 0,
          };
        }
        userRevenue[userId].revenue += Number(t.amount);
        userRevenue[userId].transactions++;
      });

      const topUsers = Object.values(userRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setStats({
        totalRevenue,
        totalCommission,
        totalPayouts,
        activeUsers,
        monthlyRevenue,
        topUsers,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportData = [
      ['Metric', 'Value'],
      ['Total Revenue', `KSh ${stats.totalRevenue.toLocaleString()}`],
      ['Platform Commission', `KSh ${stats.totalCommission.toLocaleString()}`],
      ['Total Payouts', `KSh ${stats.totalPayouts.toLocaleString()}`],
      ['Active Users', stats.activeUsers.toString()],
      [''],
      ['Monthly Revenue'],
      ['Month', 'Revenue', 'Commission'],
      ...stats.monthlyRevenue.map(m => [m.month, m.revenue.toString(), m.commission.toString()]),
      [''],
      ['Top Users'],
      ['Business Name', 'Revenue', 'Transactions'],
      ...stats.topUsers.map(u => [u.business_name, u.revenue.toString(), u.transactions.toString()]),
    ];

    const csv = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Reports</h1>
          <p className="text-gray-400">Analytics and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={exportReport}
            className="bg-primary hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          <p className="text-sm text-gray-400 mt-2">Last {dateRange} days</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">PLATFORM COMMISSION</h3>
          <p className="text-3xl font-bold text-white">
            KSh {stats.totalCommission.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {stats.totalRevenue > 0 ? ((stats.totalCommission / stats.totalRevenue) * 100).toFixed(1) : 0}% of revenue
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">TOTAL PAYOUTS</h3>
          <p className="text-3xl font-bold text-white">
            KSh {stats.totalPayouts.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-2">Paid to ISPs</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Users className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">ACTIVE USERS</h3>
          <p className="text-3xl font-bold text-white">{stats.activeUsers}</p>
          <p className="text-sm text-gray-400 mt-2">With transactions</p>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6">Monthly Revenue Trend</h2>
        <div className="space-y-4">
          {stats.monthlyRevenue.map((month, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <span className="text-gray-300 w-16">{month.month}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-4 relative">
                  <div
                    className="bg-green-500 h-4 rounded-full"
                    style={{
                      width: `${Math.max((month.revenue / Math.max(...stats.monthlyRevenue.map(m => m.revenue))) * 100, 2)}%`
                    }}
                  />
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-white font-semibold">KSh {month.revenue.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Commission: KSh {month.commission.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Top Performing Users</h2>
          <p className="text-gray-400 text-sm">Highest revenue generators in selected period</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Business Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Transactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Avg per Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats.topUsers.map((user, index) => (
                <tr key={index} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{user.business_name}</td>
                  <td className="px-6 py-4 text-sm text-green-400 font-semibold">
                    KSh {user.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{user.transactions}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    KSh {Math.round(user.revenue / user.transactions).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
