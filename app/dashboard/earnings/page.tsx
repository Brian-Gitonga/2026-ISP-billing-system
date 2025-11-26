'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, Payout, EarningsStats } from '@/lib/types';
import { DollarSign, Calendar, Clock, TrendingUp, Download, Settings } from 'lucide-react';

export default function EarningsPage() {
  const [stats, setStats] = useState<EarningsStats>({
    pendingEarnings: 0,
    totalEarnings: 0,
    totalCommission: 0,
    pendingTransactions: 0,
    nextPayoutDate: null,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for payout settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('payout_frequency, minimum_payout')
        .eq('id', user.id)
        .single();

      const nextPayoutDate = calculateNextPayoutDate(profile?.payout_frequency || 'monthly');

      // Get the most recent payout to determine the start of the current period
      const { data: lastPayout } = await supabase
        .from('payouts')
        .select('period_end')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('period_end', { ascending: false })
        .limit(1)
        .single();

      // Calculate the current payout period start
      let periodStart: Date;
      const now = new Date();

      if (lastPayout) {
        // Start from the day after the last payout period ended
        periodStart = new Date(lastPayout.period_end);
        periodStart.setDate(periodStart.getDate() + 1);
        periodStart.setHours(0, 0, 0, 0);
      } else {
        // No previous payouts, use the standard period calculation
        const payoutPeriod = getPayoutPeriod(profile?.payout_frequency || 'monthly');
        periodStart = payoutPeriod.start;
      }

      // Fetch pending transactions from the period start to now
      const { data: nextPayoutTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          plan:plans(*),
          voucher:vouchers(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('payout_status', 'pending')
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false });

      // Fetch all pending transactions for total pending amount
      const { data: allPendingTransactions } = await supabase
        .from('transactions')
        .select('net_amount, commission_amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('payout_status', 'pending');

      // Fetch payout history
      const { data: payoutHistory } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch all completed transactions for total earnings
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('net_amount, commission_amount')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Calculate stats
      const nextPayoutEarnings = nextPayoutTransactions?.reduce((sum, t) => sum + Number(t.net_amount || 0), 0) || 0;
      const nextPayoutCommission = nextPayoutTransactions?.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0) || 0;
      const totalPendingEarnings = allPendingTransactions?.reduce((sum, t) => sum + Number(t.net_amount || 0), 0) || 0;
      const totalEarnings = allTransactions?.reduce((sum, t) => sum + Number(t.net_amount || 0), 0) || 0;
      const totalCommission = allTransactions?.reduce((sum, t) => sum + Number(t.commission_amount || 0), 0) || 0;

      // Check if minimum payout threshold is met
      const minimumPayout = profile?.minimum_payout || 1000;
      const thresholdMet = nextPayoutEarnings >= minimumPayout;

      setStats({
        pendingEarnings: totalPendingEarnings,
        totalEarnings,
        totalCommission,
        pendingTransactions: allPendingTransactions?.length || 0,
        nextPayoutDate,
        nextPayoutEarnings,
        nextPayoutCommission,
        thresholdMet,
        minimumPayout,
      });

      setTransactions(nextPayoutTransactions || []);
      setPayouts(payoutHistory || []);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextPayoutDate = (frequency: string): string => {
    const now = new Date();
    let nextPayout: Date;

    if (frequency === 'weekly') {
      // Next Saturday
      const daysUntilSaturday = (6 - now.getDay()) % 7;
      nextPayout = new Date(now);
      nextPayout.setDate(now.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
    } else {
      // Next 1st of month
      nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    return nextPayout.toLocaleDateString();
  };

  const getPayoutPeriod = (frequency: string): { start: Date; end: Date } => {
    const now = new Date();

    if (frequency === 'weekly') {
      // For weekly: Show transactions from last Saturday to next Friday (payout period)
      // This ensures we show the period that will be paid on the next Saturday
      const lastSaturday = new Date(now);
      const daysSinceLastSaturday = (now.getDay() + 1) % 7; // 0 = Saturday, 1 = Sunday, etc.
      lastSaturday.setDate(now.getDate() - daysSinceLastSaturday);
      lastSaturday.setHours(0, 0, 0, 0);

      const nextFriday = new Date(lastSaturday);
      nextFriday.setDate(lastSaturday.getDate() + 6); // Friday
      nextFriday.setHours(23, 59, 59, 999);

      return { start: lastSaturday, end: nextFriday };
    } else {
      // For monthly: Show transactions from 1st to last day of current month
      // This ensures we show the period that will be paid on the 1st of next month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      return { start: startOfMonth, end: endOfMonth };
    }
  };

  const exportTransactions = () => {
    const csv = [
      ['Date', 'Plan', 'Customer Amount', 'Commission', 'Your Earnings', 'Status'],
      ...transactions.map((t) => [
        new Date(t.created_at).toLocaleString(),
        t.plan?.name || '',
        t.amount,
        t.commission_amount || 0,
        t.net_amount || 0,
        t.payout_status,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
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
          <h1 className="text-3xl font-bold text-marketplace-text mb-2">Earnings</h1>
          <p className="text-marketplace-text-muted">Track your voucher sales earnings and payouts</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportTransactions}
            className="bg-marketplace-card hover:bg-marketplace-hover text-marketplace-text px-4 py-2 rounded-lg flex items-center space-x-2 border border-marketplace-border"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <a
            href="/dashboard/settings"
            className="bg-primary hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Settings className="w-5 h-5" />
            <span>Payout Settings</span>
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Pending Earnings */}
        <div className="bg-marketplace-card rounded-xl p-6 border-t-4 border-yellow-500 border border-marketplace-border">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <h3 className="text-marketplace-text-muted text-sm font-medium mb-1">PENDING EARNINGS</h3>
          <p className="text-3xl font-bold text-marketplace-text">
            KSh {stats.pendingEarnings.toLocaleString()}
          </p>
          <p className="text-sm text-marketplace-text-muted mt-2">
            {stats.pendingTransactions} transactions
          </p>
        </div>

        {/* Total Earnings */}
        <div className="bg-marketplace-card rounded-xl p-6 border-t-4 border-green-500 border border-marketplace-border">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <h3 className="text-marketplace-text-muted text-sm font-medium mb-1">TOTAL EARNINGS</h3>
          <p className="text-3xl font-bold text-marketplace-text">
            KSh {stats.totalEarnings.toLocaleString()}
          </p>
          <p className="text-sm text-marketplace-text-muted mt-2">All time</p>
        </div>

        {/* Platform Commission */}
        <div className="bg-marketplace-card rounded-xl p-6 border-t-4 border-blue-500 border border-marketplace-border">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-marketplace-text-muted text-sm font-medium mb-1">PLATFORM COMMISSION</h3>
          <p className="text-3xl font-bold text-marketplace-text">
            KSh {stats.totalCommission.toLocaleString()}
          </p>
          <p className="text-sm text-marketplace-text-muted mt-2">Total deducted</p>
        </div>

        {/* Next Payout */}
        <div className="bg-marketplace-card rounded-xl p-6 border-t-4 border-purple-500 border border-marketplace-border">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <h3 className="text-marketplace-text-muted text-sm font-medium mb-1">NEXT PAYOUT</h3>
          <p className="text-xl font-bold text-marketplace-text">
            {stats.nextPayoutDate}
          </p>
          <p className="text-sm text-marketplace-text-muted mt-2">If minimum reached</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'pending'
              ? 'bg-primary text-white'
              : 'bg-marketplace-card text-marketplace-text-muted hover:bg-marketplace-hover border border-marketplace-border'
          }`}
        >
          Pending Earnings
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'history'
              ? 'bg-primary text-white'
              : 'bg-marketplace-card text-marketplace-text-muted hover:bg-marketplace-hover border border-marketplace-border'
          }`}
        >
          Payout History
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'pending' ? (
        <div className="bg-marketplace-card rounded-xl overflow-hidden border border-marketplace-border">
          <div className="p-6 border-b border-marketplace-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-marketplace-text">Next Payout Period</h2>
                <p className="text-marketplace-text-muted text-sm">
                  Earnings to be paid on {stats.nextPayoutDate}
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  stats.thresholdMet
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {stats.thresholdMet ? 'Threshold Met' : 'Threshold Not Met'}
                </div>
                <p className="text-xs text-marketplace-text-muted mt-1">
                  Minimum: KSh {stats.minimumPayout?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Payout Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-marketplace-sidebar">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Payout Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Total Pending</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Your Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marketplace-border">
                <tr className="hover:bg-marketplace-hover">
                  <td className="px-6 py-4 text-sm text-marketplace-text-muted">
                    {stats.nextPayoutDate}
                  </td>
                  <td className="px-6 py-4 text-sm text-marketplace-text font-semibold">
                    KSh {((stats.nextPayoutEarnings || 0) + (stats.nextPayoutCommission || 0)).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-400">
                    -KSh {(stats.nextPayoutCommission || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-400 font-semibold">
                    KSh {(stats.nextPayoutEarnings || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stats.thresholdMet
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {stats.thresholdMet ? 'Ready for Payout' : 'Below Minimum'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transaction Details */}
          {transactions.length > 0 && (
            <div className="p-6 border-t border-marketplace-border">
              <h3 className="text-lg font-semibold text-marketplace-text mb-4">Transaction Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-marketplace-sidebar rounded-lg p-4 border border-marketplace-border">
                  <p className="text-sm text-marketplace-text-muted">Total Transactions</p>
                  <p className="text-2xl font-bold text-marketplace-text">{transactions.length}</p>
                </div>
                <div className="bg-marketplace-sidebar rounded-lg p-4 border border-marketplace-border">
                  <p className="text-sm text-marketplace-text-muted">Average per Transaction</p>
                  <p className="text-2xl font-bold text-marketplace-text">
                    KSh {transactions.length > 0 ? Math.round((stats.nextPayoutEarnings || 0) / transactions.length).toLocaleString() : 0}
                  </p>
                </div>
                <div className="bg-marketplace-sidebar rounded-lg p-4 border border-marketplace-border">
                  <p className="text-sm text-marketplace-text-muted">Commission Rate</p>
                  <p className="text-2xl font-bold text-marketplace-text">8%</p>
                </div>
              </div>
            </div>
          )}

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-marketplace-text-muted">No transactions in current payout period</p>
              <p className="text-sm text-marketplace-text-muted mt-2">
                Transactions will appear here as you make sales
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-marketplace-card rounded-xl overflow-hidden border border-marketplace-border">
          <div className="p-6 border-b border-marketplace-border">
            <h2 className="text-xl font-bold text-marketplace-text">Payout History</h2>
            <p className="text-marketplace-text-muted text-sm">
              Previous payments received
            </p>
          </div>
          
          {payouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-marketplace-sidebar">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Transactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Gross Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Net Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-marketplace-text-muted uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-marketplace-border">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-marketplace-hover">
                      <td className="px-6 py-4 text-sm text-marketplace-text-muted">
                        {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-marketplace-text">{payout.total_transactions}</td>
                      <td className="px-6 py-4 text-sm text-marketplace-text">KSh {payout.gross_amount}</td>
                      <td className="px-6 py-4 text-sm text-red-400">-KSh {payout.commission_amount}</td>
                      <td className="px-6 py-4 text-sm text-green-400 font-semibold">KSh {payout.net_amount}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            payout.status === 'paid'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-marketplace-text-muted">No payout history yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
