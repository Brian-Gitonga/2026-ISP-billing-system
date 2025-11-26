'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Voucher, Plan } from '@/lib/types';
import { Upload, Trash2, Download, ChevronLeft, ChevronRight, FileText, X, Check } from 'lucide-react';

// CSV parsing utility
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  });
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [voucherCodes, setVoucherCodes] = useState('');
  const [uploading, setUploading] = useState(false);

  // CSV upload state
  const [uploadMode, setUploadMode] = useState<'text' | 'csv'>('text');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number>(0);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  });

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
    if (!selectedPlan) {
      alert('Please select a plan');
      return;
    }

    let codes: string[] = [];

    if (uploadMode === 'csv' && csvData.length > 0) {
      // Extract codes from selected column, skip header row
      codes = csvData
        .slice(1) // Skip header
        .map(row => row[selectedColumn] || '')
        .map(code => code.trim())
        .filter(code => code.length > 0);
    } else if (uploadMode === 'text' && voucherCodes.trim()) {
      // Original text-based upload
      codes = voucherCodes
        .split('\n')
        .map((code) => code.trim())
        .filter((code) => code.length > 0);
    }

    if (codes.length === 0) {
      alert('No valid voucher codes found');
      return;
    }

    setUploading(true);

    // Initialize progress
    setUploadProgress({
      total: codes.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Process vouchers in batches for better progress tracking
      const batchSize = 50;
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < codes.length; i += batchSize) {
        const batch = codes.slice(i, i + batchSize);

        // Prepare voucher data for this batch
        const vouchersToInsert = batch.map((code) => ({
          user_id: user.id,
          plan_id: selectedPlan,
          voucher_code: code,
          status: 'available',
        }));

        try {
          // Insert batch
          const { error } = await supabase.from('vouchers').insert(vouchersToInsert);

          if (error) {
            if (error.code === '23505') {
              // Handle duplicate codes
              const duplicates = batch.length;
              failed += duplicates;
              errors.push(`${duplicates} duplicate voucher codes in batch ${Math.floor(i/batchSize) + 1}`);
            } else {
              failed += batch.length;
              errors.push(`Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`);
            }
          } else {
            successful += batch.length;
          }
        } catch (batchError: any) {
          failed += batch.length;
          errors.push(`Batch ${Math.floor(i/batchSize) + 1} error: ${batchError.message}`);
        }

        // Update progress
        setUploadProgress({
          total: codes.length,
          processed: Math.min(i + batchSize, codes.length),
          successful,
          failed,
          errors
        });

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Show final results
      if (successful > 0) {
        alert(`Successfully uploaded ${successful} vouchers!${failed > 0 ? ` ${failed} failed.` : ''}`);
        setShowUploadModal(false);
        resetUploadModal();
        setSelectedPlan('');
        fetchData();
      } else {
        alert('No vouchers were uploaded successfully. Please check for duplicates or errors.');
      }
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

  // CSV handling functions
  const handleCSVUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsed = parseCSV(csvText);
      setCsvData(parsed);

      // Show preview of first 5 rows
      setCsvPreview(parsed.slice(0, 5));

      // Auto-detect username/voucher column
      const headers = parsed[0] || [];
      const usernameIndex = headers.findIndex(header =>
        header.toLowerCase().includes('username') ||
        header.toLowerCase().includes('voucher') ||
        header.toLowerCase().includes('code')
      );
      setSelectedColumn(usernameIndex >= 0 ? usernameIndex : 0);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file =>
      file.name.endsWith('.csv') || file.type === 'text/csv'
    );

    if (csvFile) {
      setCsvFile(csvFile);
      setUploadMode('csv');
      handleCSVUpload(csvFile);
    } else {
      alert('Please drop a CSV file');
    }
  };

  const resetUploadModal = () => {
    setUploadMode('text');
    setCsvFile(null);
    setCsvData([]);
    setCsvPreview([]);
    setSelectedColumn(0);
    setVoucherCodes('');
    setUploadProgress({
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    });
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
          <h1 className="text-3xl font-bold text-marketplace-text mb-2">Vouchers</h1>
          <p className="text-marketplace-text-muted">Manage your WiFi vouchers</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportVouchers}
            className="bg-marketplace-hover hover:bg-marketplace-border text-marketplace-text px-4 py-2 rounded-lg flex items-center space-x-2 border border-marketplace-border"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              setShowUploadModal(true);
              resetUploadModal();
            }}
            className="bg-primary hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Vouchers</span>
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-marketplace-card rounded-lg p-4">
          <p className="text-marketplace-text-muted text-sm">Total Vouchers</p>
          <p className="text-2xl font-bold text-marketplace-text">{stats.total}</p>
        </div>
        <div className="bg-marketplace-card rounded-lg p-4">
          <p className="text-marketplace-text-muted text-sm">Available</p>
          <p className="text-2xl font-bold text-green-500">{stats.available}</p>
        </div>
        <div className="bg-marketplace-card rounded-lg p-4">
          <p className="text-marketplace-text-muted text-sm">Sold</p>
          <p className="text-2xl font-bold text-blue-500">{stats.sold}</p>
        </div>
        <div className="bg-marketplace-card rounded-lg p-4">
          <p className="text-marketplace-text-muted text-sm">Used</p>
          <p className="text-2xl font-bold text-marketplace-text-muted">{stats.used}</p>
        </div>
      </div>

      {/* Voucher Status by Plan */}
      {statsByPlan.length > 0 && (
        <div className="bg-marketplace-card rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-marketplace-text mb-4">Voucher Status by Package</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-marketplace-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-marketplace-text-muted">Package</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-marketplace-text-muted">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-marketplace-text-muted">Available</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-marketplace-text-muted">Sold</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-marketplace-text-muted">Used</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-marketplace-text-muted">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marketplace-border">
                {statsByPlan.map((stat) => (
                  <tr key={stat.plan.id} className="hover:bg-marketplace-hover">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-marketplace-text font-medium">{stat.plan.name}</p>
                        <p className="text-marketplace-text-muted text-sm">{stat.plan.data_limit} • {stat.plan.duration}</p>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-marketplace-text font-semibold">{stat.total}</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-green-500 font-semibold">{stat.available}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-blue-500 font-semibold">{stat.sold}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-marketplace-text-muted font-semibold">{stat.used}</span>
                    </td>
                    <td className="text-right py-3 px-4 text-marketplace-text font-medium">KSh {stat.plan.price}</td>
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
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Upload Vouchers</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadModal();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Plan Selection */}
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

              {/* Upload Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Upload Method
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setUploadMode('text');
                      resetUploadModal();
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                      uploadMode === 'text'
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Text Input</span>
                  </button>
                  <button
                    onClick={() => {
                      setUploadMode('csv');
                      setVoucherCodes('');
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                      uploadMode === 'csv'
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>CSV Upload</span>
                  </button>
                </div>
              </div>

              {/* Text Input Mode */}
              {uploadMode === 'text' && (
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
              )}

              {/* CSV Upload Mode */}
              {uploadMode === 'csv' && (
                <div className="space-y-4">
                  {!csvFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragOver
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">
                        Drop your CSV file here or click to browse
                      </p>
                      <p className="text-gray-400 text-sm mb-4">
                        Supports CSV files with voucher codes in any column
                      </p>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCsvFile(file);
                            handleCSVUpload(file);
                          }
                        }}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="bg-primary hover:bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                      >
                        Choose CSV File
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* File Info */}
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-white font-medium">{csvFile.name}</p>
                              <p className="text-gray-400 text-sm">
                                {csvData.length > 0 ? `${csvData.length - 1} rows` : 'Processing...'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setCsvFile(null);
                              setCsvData([]);
                              setCsvPreview([]);
                            }}
                            className="text-gray-400 hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Column Selection */}
                      {csvPreview.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Select Column with Voucher Codes
                          </label>
                          <select
                            value={selectedColumn}
                            onChange={(e) => setSelectedColumn(parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                          >
                            {csvPreview[0]?.map((header, index) => (
                              <option key={index} value={index}>
                                Column {index + 1}: {header || `Column ${index + 1}`}
                              </option>
                            ))}
                          </select>

                          {/* CSV Preview */}
                          <div className="bg-gray-900 rounded-lg p-4">
                            <h4 className="text-white font-medium mb-3">Preview (first 5 rows)</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-700">
                                    {csvPreview[0]?.map((header, index) => (
                                      <th
                                        key={index}
                                        className={`px-3 py-2 text-left font-medium ${
                                          index === selectedColumn
                                            ? 'text-primary bg-primary/10'
                                            : 'text-gray-300'
                                        }`}
                                      >
                                        {header || `Column ${index + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {csvPreview.slice(1).map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-b border-gray-800">
                                      {row.map((cell, cellIndex) => (
                                        <td
                                          key={cellIndex}
                                          className={`px-3 py-2 ${
                                            cellIndex === selectedColumn
                                              ? 'text-primary bg-primary/5 font-mono'
                                              : 'text-gray-400'
                                          }`}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-gray-400 text-xs mt-2">
                              Selected column will be used for voucher codes
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Upload Progress</span>
                    <span className="text-gray-300 text-sm">
                      {uploadProgress.processed} / {uploadProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress.total > 0 ? (uploadProgress.processed / uploadProgress.total) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400 flex items-center">
                      <Check className="w-4 h-4 mr-1" />
                      {uploadProgress.successful} successful
                    </span>
                    {uploadProgress.failed > 0 && (
                      <span className="text-red-400 flex items-center">
                        <X className="w-4 h-4 mr-1" />
                        {uploadProgress.failed} failed
                      </span>
                    )}
                  </div>
                  {uploadProgress.errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-900/20 rounded border border-red-800">
                      <p className="text-red-400 text-xs font-medium mb-1">Errors:</p>
                      {uploadProgress.errors.slice(0, 3).map((error, index) => (
                        <p key={index} className="text-red-300 text-xs">{error}</p>
                      ))}
                      {uploadProgress.errors.length > 3 && (
                        <p className="text-red-400 text-xs">...and {uploadProgress.errors.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadModal();
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUploadVouchers}
                disabled={uploading || !selectedPlan || (uploadMode === 'text' && !voucherCodes.trim()) || (uploadMode === 'csv' && csvData.length === 0)}
                className="px-4 py-2 bg-primary hover:bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Vouchers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

