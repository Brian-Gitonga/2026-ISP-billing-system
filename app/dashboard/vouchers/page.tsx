'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Voucher, Plan } from '@/lib/types';
import { Upload, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [voucherCodes, setVoucherCodes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [vouchersPerPage] = useState(25);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch vouchers
      const { data: vouchersData } = await supabase
        .from('vouchers')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      setVouchers(vouchersData || []);
      setPlans(plansData || []);
      // Reset to first page when data changes
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadVouchers = async () => {
    if (!selectedPlan || !voucherCodes.trim()) {
      alert('Please select a plan and enter voucher codes');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Split voucher codes by newline and filter empty lines
      const codes = voucherCodes
        .split('\n')
        .map((code) => code.trim())
        .filter((code) => code.length > 0);

      if (codes.length === 0) {
        alert('No valid voucher codes found');
        return;
      }

      // Prepare voucher data
      const vouchersToInsert = codes.map((code) => ({
        user_id: user.id,
        plan_id: selectedPlan,
        voucher_code: code,
        status: 'available',
      }));

      // Insert vouchers
      const { error } = await supabase.from('vouchers').insert(vouchersToInsert);

      if (error) {
        if (error.code === '23505') {
          alert('Some voucher codes already exist. Please check and try again.');
        } else {
          throw error;
        }
        return;
      }

      alert(`Successfully uploaded ${codes.length} vouchers!`);
      setShowUploadModal(false);
      setVoucherCodes('');
      setSelectedPlan('');
      fetchData();
    } catch (error) {
      console.error('Error uploading vouchers:', error);
      alert('Failed to upload vouchers');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;

    try {
      const { error } = await supabase.from('vouchers').delete().eq('id', id);

      if (error) throw error;

      alert('Voucher deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Failed to delete voucher');
    }
  };

  const exportVouchers = () => {
    const csv = [
      ['Voucher Code', 'Plan', 'Status', 'Sold To', 'Created At'],
      ...vouchers.map((v) => [
        v.voucher_code,
        v.plan?.name || '',
        v.status,
        v.sold_to_phone || '',
        new Date(v.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate stats
  const stats = {
    total: vouchers.length,
    available: vouchers.filter((v) => v.status === 'available').length,
    sold: vouchers.filter((v) => v.status === 'sold').length,
    used: vouchers.filter((v) => v.status === 'used').length,
  };

  // Calculate stats by plan
  const statsByPlan = plans.map(plan => {
    const planVouchers = vouchers.filter(v => v.plan_id === plan.id);
    return {
      plan,
      total: planVouchers.length,
      available: planVouchers.filter(v => v.status === 'available').length,
      sold: planVouchers.filter(v => v.status === 'sold').length,
      used: planVouchers.filter(v => v.status === 'used').length,
    };
  }).filter(stat => stat.total > 0); // Only show plans that have vouchers

  // Pagination calculations
  const totalPages = Math.ceil(vouchers.length / vouchersPerPage);
  const startIndex = (currentPage - 1) * vouchersPerPage;
  const endIndex = startIndex + vouchersPerPage;
  const currentVouchers = vouchers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
          <h1 className="text-3xl font-bold text-white mb-2">Vouchers</h1>
          <p className="text-gray-400">Manage your WiFi vouchers</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportVouchers}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Vouchers</span>
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Vouchers</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Available</p>
          <p className="text-2xl font-bold text-green-500">{stats.available}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Sold</p>
          <p className="text-2xl font-bold text-blue-500">{stats.sold}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Used</p>
          <p className="text-2xl font-bold text-gray-500">{stats.used}</p>
        </div>
      </div>

      {/* Voucher Status by Plan */}
      {statsByPlan.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Voucher Status by Package</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Package</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Available</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Sold</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Used</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {statsByPlan.map((stat) => (
                  <tr key={stat.plan.id} className="hover:bg-gray-700/30">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{stat.plan.name}</p>
                        <p className="text-gray-400 text-sm">{stat.plan.data_limit} • {stat.plan.duration}</p>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-white font-semibold">{stat.total}</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-green-500 font-semibold">{stat.available}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-blue-500 font-semibold">{stat.sold}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-gray-500 font-semibold">{stat.used}</span>
                    </td>
                    <td className="text-right py-3 px-4 text-white font-medium">KSh {stat.plan.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">All Vouchers</h3>
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, vouchers.length)} of {vouchers.length} vouchers
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Voucher Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Sold To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {currentVouchers.length > 0 ? (
                currentVouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-white font-mono">
                      {voucher.voucher_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{voucher.plan?.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          voucher.status === 'available'
                            ? 'bg-green-500/20 text-green-500'
                            : voucher.status === 'sold'
                            ? 'bg-blue-500/20 text-blue-500'
                            : 'bg-gray-500/20 text-gray-500'
                        }`}
                      >
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {voucher.sold_to_phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(voucher.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {voucher.status === 'available' && (
                        <button
                          onClick={() => handleDeleteVoucher(voucher.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="w-12 h-12 text-gray-600" />
                      <p className="text-lg font-medium">No vouchers found</p>
                      <p className="text-sm">Upload some vouchers to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Upload Vouchers</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Plan
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a plan...</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - KSh {plan.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voucher Codes (one per line)
                </label>
                <textarea
                  value={voucherCodes}
                  onChange={(e) => setVoucherCodes(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="ABC123&#10;DEF456&#10;GHI789"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadVouchers}
                disabled={uploading}
                className="px-4 py-2 bg-primary hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

