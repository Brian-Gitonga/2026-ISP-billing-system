'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plan } from '@/lib/types';
import { Wifi, X, Phone, CheckCircle, AlertCircle, Info, Smartphone } from 'lucide-react';

export default function PortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [businessName, setBusinessName] = useState('Qtro Wifi');
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState('+254 729 999333');
  const [showViewVoucherModal, setShowViewVoucherModal] = useState(false);
  const [voucherPhoneNumber, setVoucherPhoneNumber] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    show: boolean;
  }>({ type: 'info', message: '', show: false });

  useEffect(() => {
    // Resolve the params Promise
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        setSlug(resolvedParams.slug);
      } catch (error) {
        console.error('Error resolving params:', error);
      }
    };
    
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (slug) {
      fetchPlans();
    }
  }, [slug]);

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  const fetchPlans = async () => {
    try {
      console.log('🔍 Looking for portal slug:', slug);

      // Get user by portal slug
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_name, phone_number, portal_slug')
        .eq('portal_slug', slug)
        .single();

      console.log('📋 Profile query result:', { profile, profileError });

      if (!profile) {
        console.error('❌ No profile found for slug:', slug);

        // Let's also check what portal slugs exist
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('portal_slug')
          .not('portal_slug', 'is', null);

        console.log('📝 Available portal slugs:', allProfiles);

        showNotification('error', `Portal not found for slug: ${slug}. Check console for available slugs.`);
        return;
      }

      setBusinessName(profile.business_name || 'Qtro Wifi');
      setBusinessPhoneNumber(profile.phone_number || '+254 729 999333');

      // Fetch active plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('price', { ascending: true });

      setPlans(plansData || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan) {
      showNotification('error', 'Please select a plan');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      showNotification('error', 'Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    try {
      // Initiate payment
      const response = await fetch('/api/mpesa/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          amount: selectedPlan.price,
          planId: selectedPlan.id,
          portalSlug: slug,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      showNotification('info', 'Payment request sent! Please check your phone and enter your M-Pesa PIN to complete the payment.');

      // Poll for payment status
      pollPaymentStatus(data.checkoutRequestId);
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      showNotification('error', error.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestId: string) => {
    let attempts = 0;
    const maxAttempts = 90; // Poll for 3 minutes (90 * 2 seconds) - M-Pesa can take up to 2-3 minutes
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(
          `/api/mpesa/status?checkoutRequestId=${checkoutRequestId}`
        );
        const data = await response.json();

        // Reset error counter on successful request
        consecutiveErrors = 0;

        if (data.status === 'completed') {
          clearInterval(interval);
          setProcessing(false);
          // Show voucher
          showVoucher(data.voucher);
        } else if (data.status === 'failed') {
          // Only stop polling for definitive failures, not temporary issues
          // Continue polling as callback might still arrive and update the status
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setProcessing(false);
            showNotification('error', `Payment verification timeout. ${data.error ? `Error: ${data.error}` : `Please check your M-Pesa messages and contact support at ${businessPhoneNumber} if payment was deducted.`}`);
          }
          // Continue polling - callback might still arrive and change status to completed
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setProcessing(false);
          showNotification('error', `Payment verification timeout. Please check your M-Pesa messages and contact support at ${businessPhoneNumber} if payment was deducted.`);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        consecutiveErrors++;
        
        // If we have too many consecutive errors, stop polling
        if (consecutiveErrors >= maxConsecutiveErrors) {
          clearInterval(interval);
          setProcessing(false);
          showNotification('error', `Unable to verify payment status. Please check your M-Pesa messages and contact support at ${businessPhoneNumber} if payment was deducted.`);
        }
      }
    }, 2000);
  };

  const showVoucher = (voucher: any) => {
    showNotification('success', `Payment successful! Your voucher code is: ${voucher.voucher_code}. Please save this code to access the WiFi.`);
    setPhoneNumber('');
    setSelectedPlan(null);
  };

  const handleConnectWithVoucher = () => {
    // Close the page for captive portal integration
    if (window.opener) {
      window.close();
    } else {
      // If not opened in popup, redirect to a close page or show message
      showNotification('info', 'You can now close this page and return to the captive portal.');
    }
  };

  const handleViewVoucher = async () => {
    if (!voucherPhoneNumber || voucherPhoneNumber.length < 10) {
      showNotification('error', 'Please enter a valid phone number');
      return;
    }

    setVoucherLoading(true);

    try {
      console.log('🔍 View voucher - Looking for portal slug:', slug);

      // Get user by portal slug first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, portal_slug')
        .eq('portal_slug', slug)
        .single();

      console.log('📋 View voucher - Profile query result:', { profile, profileError });

      if (!profile) {
        console.error('❌ View voucher - No profile found for slug:', slug);
        showNotification('error', `Portal not found for slug: ${slug}`);
        return;
      }

      console.log('Profile found:', profile.id);
      console.log('Searching for phone number:', voucherPhoneNumber);

      // First, let's check if there are any transactions for this phone number
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('phone_number', voucherPhoneNumber)
        .order('created_at', { ascending: false });

      console.log('All transactions for this phone:', allTransactions);

      // Now fetch the latest completed transaction with voucher
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vouchers (
            voucher_code
          )
        `)
        .eq('user_id', profile.id)
        .eq('phone_number', voucherPhoneNumber)
        .eq('status', 'completed')
        .not('voucher_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('Transaction query result:', { transaction, error });

      if (error || !transaction) {
        console.error('Error fetching transaction:', error);
        showNotification('error', `No voucher found for this phone number. Found ${allTransactions?.length || 0} total transactions.`);
        return;
      }

      if (transaction.vouchers) {
        const voucher = transaction.vouchers;
        showNotification('success', `Your voucher code is: ${voucher.voucher_code}. Please save this code to access the WiFi.`);
      } else {
        showNotification('error', 'Voucher details not found');
      }

      setShowViewVoucherModal(false);
      setVoucherPhoneNumber('');
    } catch (error) {
      console.error('Error fetching voucher:', error);
      showNotification('error', 'Failed to fetch voucher details');
    } finally {
      setVoucherLoading(false);
    }
  };

  const filteredPlans = plans.filter((plan) => plan.duration === activeTab);

  if (loading || !slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8 px-4">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className={`rounded-lg p-4 shadow-lg flex items-start space-x-3 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex-shrink-0">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={hideNotification}
              className={`flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-600 hover:text-green-800' :
                notification.type === 'error' ? 'text-red-600 hover:text-red-800' :
                'text-blue-600 hover:text-blue-800'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-full p-4">
              <Wifi className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{businessName}</h1>
          <p className="text-gray-600">
            Choose the best plan for you and connect with us. we are the best in town
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              activeTab === 'daily'
                ? 'bg-secondary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            DAILY
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              activeTab === 'weekly'
                ? 'bg-secondary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            WEEKLY
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              activeTab === 'monthly'
                ? 'bg-secondary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            MONTHLY
          </button>
        </div>

        {/* Plans */}
        <div className="space-y-3 mb-6">
          {filteredPlans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm transition ${
                selectedPlan?.id === plan.id
                  ? 'ring-2 ring-primary'
                  : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedPlan?.id === plan.id ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-600">
                    {plan.data_limit && `${plan.data_limit}, `}
                    {plan.speed}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl font-bold text-gray-900">KSh {plan.price}</p>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No {activeTab} plans available</p>
          </div>
        )}

        {/* Purchase Section */}
        {selectedPlan && (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Complete Purchase</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={handlePurchase}
              disabled={processing}
              className="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : `Pay KSh ${selectedPlan.price}`}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleConnectWithVoucher}
            className="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center space-x-2"
          >
            <Wifi className="w-5 h-5" />
            <span>Connect with Voucher</span>
          </button>

          <button
            onClick={() => setShowViewVoucherModal(true)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center space-x-2"
          >
            <Smartphone className="w-5 h-5" />
            <span>View Voucher</span>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-2">Already have access?</p>
          <button
            onClick={handleConnectWithVoucher}
            className="text-primary hover:text-green-600 font-semibold text-sm transition"
          >
            Contact Support - {businessPhoneNumber}
          </button>
        </div>
      </div>

      {/* View Voucher Modal */}
      {showViewVoucherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">View Your Voucher</h3>
              <button
                onClick={() => {
                  setShowViewVoucherModal(false);
                  setVoucherPhoneNumber('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Enter your phone number to retrieve your latest voucher code.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={voucherPhoneNumber}
                onChange={(e) => setVoucherPhoneNumber(e.target.value)}
                placeholder="0712345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowViewVoucherModal(false);
                  setVoucherPhoneNumber('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleViewVoucher}
                disabled={voucherLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {voucherLoading ? 'Searching...' : 'Get Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

