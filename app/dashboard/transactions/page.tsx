'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/lib/types';
import { Download } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('transactions')
        .select(`
          *,
          plan:plans(*),
          voucher:vouchers(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = () => {
    const csv = [
      ['Date', 'Phone Number', 'Plan', 'Amount', 'Status', 'M-Pesa Receipt', 'Voucher Code'],
      ...transactions.map((t) => [
        new Date(t.created_at).toLocaleString(),
        t.phone_number,
        t.plan?.name || '',
        t.amount,
        t.status,
        t.mpesa_receipt_number || '',
        t.voucher?.voucher_code || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalRevenue = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

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
          <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
          <p className="text-gray-400">View all payment transactions</p>
        </div>
        <button
          onClick={exportTransactions}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Transactions</p>
          <p className="text-2xl font-bold text-white">{transactions.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-500">
            {transactions.filter((t) => t.status === 'completed').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-500">
            {transactions.filter((t) => t.status === 'pending').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-white">KSh {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  M-Pesa Receipt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Voucher
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{transaction.phone_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{transaction.plan?.name}</td>
                  <td className="px-6 py-4 text-sm text-white font-semibold">
                    KSh {transaction.amount}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        transaction.status === 'completed'
                          ? 'bg-green-500/20 text-green-500'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                    {transaction.mpesa_receipt_number || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                    {transaction.voucher?.voucher_code || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No transactions yet</p>
        </div>
      )}
    </div>
  );
}

