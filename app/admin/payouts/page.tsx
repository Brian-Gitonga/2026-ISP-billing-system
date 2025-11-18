'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, Profile, Payout } from '@/lib/types';
import { DollarSign, Calendar, Check, X, Eye, Plus } from 'lucide-react';

interface PendingPayout {
  user_id: string;
  profile: Profile;
  transactions: Transaction[];
  totalAmount: number;
  totalCommission: number;
  netAmount: number;
  transactionCount: number;
  thresholdMet: boolean;
  nextPayoutDate: string;
  payoutFrequency: string;
}

export default function AdminPayoutsPage() {
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedUser, setSelectedUser] = useState<PendingPayout | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payoutToMark, setPayoutToMark] = useState<Payout | null>(null);

  useEffect(() => {
    fetchPayoutData();
  }, []);

  const fetchPayoutData = async () => {
    try {
      // Fetch pending transactions grouped by user
      const { data: pendingTransactions } = await supabase
        .from('transactions')
        .select(`
          *,
          profile:profiles(*),
          plan:plans(*)
        `)
        .eq('status', 'completed')
        .eq('payout_status', 'pending');

      // Group transactions by user
      const userGroups: { [key: string]: PendingPayout } = {};
      
      pendingTransactions?.forEach((transaction) => {
        const userId = transaction.user_id;
        
        if (!userGroups[userId]) {
          const nextPayoutDate = calculateNextPayoutDate(transaction.profile.payout_frequency || 'monthly');

          userGroups[userId] = {
            user_id: userId,
            profile: transaction.profile,
            transactions: [],
            totalAmount: 0,
            totalCommission: 0,
            netAmount: 0,
            transactionCount: 0,
            thresholdMet: false,
            nextPayoutDate,
            payoutFrequency: transaction.profile.payout_frequency || 'monthly',
          };
        }
        
        userGroups[userId].transactions.push(transaction);
        userGroups[userId].totalAmount += Number(transaction.amount);
        userGroups[userId].totalCommission += Number(transaction.commission_amount || 0);
        userGroups[userId].netAmount += Number(transaction.net_amount || 0);
        userGroups[userId].transactionCount++;
      });

      // Update threshold status for each user
      Object.values(userGroups).forEach(userGroup => {
        const minimumPayout = userGroup.profile.minimum_payout || 1000;
        userGroup.thresholdMet = userGroup.netAmount >= minimumPayout;
      });

      // Get all payouts (both eligible and not eligible for better tracking)
      const allPayouts = Object.values(userGroups);

      // Fetch payout history
      const { data: history } = await supabase
        .from('payouts')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setPendingPayouts(allPayouts);
      setPayoutHistory(history || []);
    } catch (error) {
      console.error('Error fetching payout data:', error);
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

  const handleCreatePayout = async (userPayout: PendingPayout) => {
    setProcessing(true);

    try {
      console.log('Creating payout for user:', userPayout);

      // Get admin session token
      const sessionToken = localStorage.getItem('admin_session');
      if (!sessionToken) {
        throw new Error('Admin session not found. Please log in again.');
      }

      // Call the API endpoint to create payout
      const response = await fetch('/api/admin/payouts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ userPayout }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payout');
      }

      console.log('Payout created successfully:', result.payout);
      alert(result.message);
      setShowPayoutModal(false);
      setSelectedUser(null);
      fetchPayoutData();
    } catch (error) {
      console.error('Error creating payout:', error);
      alert(`Failed to create payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsPaid = async (payoutId: string, userPayout: PendingPayout) => {
    const mpesaTransactionId = prompt('Enter M-Pesa Transaction ID:');
    if (!mpesaTransactionId) return;

    setProcessing(true);

    try {
      // Update payout status
      const { error: payoutError } = await supabase
        .from('payouts')
        .update({
          status: 'paid',
          mpesa_transaction_id: mpesaTransactionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payoutId);

      if (payoutError) throw payoutError;

      // Update all related transactions as paid
      const transactionIds = userPayout.transactions.map(t => t.id);
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          payout_status: 'paid',
          payout_date: new Date().toISOString(),
        })
        .in('id', transactionIds);

      if (transactionError) throw transactionError;

      alert('Payout marked as paid successfully!');
      fetchPayoutData();
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      alert('Failed to update payout status');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPayoutAsPaid = async (payout: Payout) => {
    const mpesaTransactionId = prompt('Enter M-Pesa Transaction ID:');
    if (!mpesaTransactionId) return;

    setProcessing(true);

    try {
      // Get admin session token
      const sessionToken = localStorage.getItem('admin_session');
      if (!sessionToken) {
        throw new Error('Admin session not found. Please log in again.');
      }

      // Call the API endpoint to mark payout as paid
      const response = await fetch('/api/admin/payouts/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          payoutId: payout.id,
          mpesaTransactionId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark payout as paid');
      }

      alert(result.message);
      setShowMarkPaidModal(false);
      setPayoutToMark(null);
      fetchPayoutData();
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      alert(`Failed to update payout status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Payouts Management</h1>
          <p className="text-gray-400">Process payments to ISP users</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Pending Payouts</p>
              <p className="text-2xl font-bold text-white">{pendingPayouts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Amount Due</p>
              <p className="text-2xl font-bold text-white">
                KSh {pendingPayouts.reduce((sum, p) => sum + p.netAmount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Payouts This Month</p>
              <p className="text-2xl font-bold text-white">
                {payoutHistory.filter(p => 
                  new Date(p.created_at).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'pending'
              ? 'bg-primary text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Pending Payouts ({pendingPayouts.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'history'
              ? 'bg-primary text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Payout History
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pending' ? (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">User Payouts</h2>
            <p className="text-gray-400 text-sm">All users with pending earnings (threshold status shown)</p>
          </div>
          
          {pendingPayouts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Next Payout</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Net Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pendingPayouts.map((payout) => (
                    <tr key={payout.user_id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {payout.profile.business_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {payout.profile.payout_phone_number || payout.profile.phone_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {payout.nextPayoutDate}
                        <div className="text-xs text-gray-500 mt-1">
                          {payout.payoutFrequency}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{payout.transactionCount}</td>
                      <td className="px-6 py-4 text-sm text-green-400 font-semibold">
                        KSh {payout.netAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payout.thresholdMet
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {payout.thresholdMet ? 'Threshold Met' : 'Below Minimum'}
                          </span>
                          <span className="text-xs text-gray-400">
                            Min: KSh {(payout.profile.minimum_payout || 1000).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(payout);
                              setShowPayoutModal(true);
                            }}
                            className="bg-primary hover:bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Create Payout</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(payout);
                              setShowTransactionModal(true);
                            }}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No pending payouts</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Payout History</h2>
            <p className="text-gray-400 text-sm">Previously processed payouts</p>
          </div>
          
          {payoutHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {payoutHistory.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {payout.profile?.business_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{payout.total_transactions}</td>
                      <td className="px-6 py-4 text-sm text-green-400 font-semibold">
                        KSh {payout.net_amount.toLocaleString()}
                      </td>
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
                      <td className="px-6 py-4 text-sm">
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => {
                              setPayoutToMark(payout);
                              setShowMarkPaidModal(true);
                            }}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs flex items-center space-x-1 disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Paid</span>
                          </button>
                        )}
                        {payout.status === 'paid' && payout.mpesa_transaction_id && (
                          <div className="text-xs text-gray-400">
                            M-Pesa: {payout.mpesa_transaction_id}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No payout history</p>
            </div>
          )}
        </div>
      )}

      {/* Payout Confirmation Modal */}
      {showPayoutModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Create Payout</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Business:</span>
                <span className="text-white">{selectedUser.profile.business_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="text-white">{selectedUser.profile.payout_phone_number || selectedUser.profile.phone_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transactions:</span>
                <span className="text-white">{selectedUser.transactionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gross Amount:</span>
                <span className="text-white">KSh {selectedUser.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Commission:</span>
                <span className="text-red-400">-KSh {selectedUser.totalCommission.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400 font-medium">Net Amount:</span>
                <span className="text-green-400 font-bold">KSh {selectedUser.netAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreatePayout(selectedUser)}
                disabled={processing}
                className="flex-1 bg-primary hover:bg-green-600 text-white py-2 rounded-lg transition disabled:opacity-50"
              >
                {processing ? 'Creating...' : 'Create Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && payoutToMark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Mark Payout as Paid</h3>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-gray-400 text-sm">Business</p>
                <p className="text-white font-medium">{payoutToMark.profile?.business_name}</p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Amount</p>
                <p className="text-white font-medium">KSh {payoutToMark.net_amount.toLocaleString()}</p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Period</p>
                <p className="text-white font-medium">
                  {new Date(payoutToMark.period_start).toLocaleDateString()} - {new Date(payoutToMark.period_end).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <p className="text-yellow-500 text-sm">
                ⚠️ Only mark as paid after you have successfully sent the M-Pesa payment to the user.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowMarkPaidModal(false);
                  setPayoutToMark(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkPayoutAsPaid(payoutToMark)}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition disabled:opacity-50"
              >
                {processing ? 'Updating...' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Transaction Details</h3>
                <p className="text-gray-400">{selectedUser.profile.business_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowTransactionModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{selectedUser.transactionCount}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">Gross Amount</p>
                <p className="text-2xl font-bold text-white">KSh {selectedUser.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">Commission</p>
                <p className="text-2xl font-bold text-red-400">-KSh {selectedUser.totalCommission.toLocaleString()}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400">Net Amount</p>
                <p className="text-2xl font-bold text-green-400">KSh {selectedUser.netAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-600">
                <h4 className="text-lg font-semibold text-white">Individual Transactions</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Commission</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Net</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    {selectedUser.transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-600/50">
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">{transaction.plan?.name}</td>
                        <td className="px-4 py-3 text-sm text-white">KSh {transaction.amount}</td>
                        <td className="px-4 py-3 text-sm text-red-400">-KSh {transaction.commission_amount || 0}</td>
                        <td className="px-4 py-3 text-sm text-green-400">KSh {transaction.net_amount || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.payout_status === 'paid'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {transaction.payout_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
