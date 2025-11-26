'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { Copy, Check, ExternalLink, Download, Wifi } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    phone_number: '',
    portal_slug: '',
    payout_frequency: 'monthly' as 'weekly' | 'monthly',
    minimum_payout: 1000,
    payout_phone_number: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        business_name: data.business_name || '',
        phone_number: data.phone_number || '',
        portal_slug: data.portal_slug || '',
        payout_frequency: data.payout_frequency || 'monthly',
        minimum_payout: data.minimum_payout || 1000,
        payout_phone_number: data.payout_phone_number || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate portal slug
      if (formData.portal_slug) {
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(formData.portal_slug)) {
          alert('Portal slug can only contain lowercase letters, numbers, and hyphens');
          setSaving(false);
          return;
        }

        // Check if slug is already taken
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('portal_slug', formData.portal_slug)
          .neq('id', user.id)
          .single();

        if (existingProfile) {
          alert('This portal slug is already taken. Please choose another one.');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      alert('Settings saved successfully!');
      fetchProfile();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyPortalLink = () => {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${formData.portal_slug}`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPortal = () => {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${formData.portal_slug}`;
    window.open(portalUrl, '_blank');
  };

  const downloadCaptivePortal = async () => {
    if (!profile?.id || !formData.portal_slug) {
      alert('Please save your portal slug first');
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch(`/api/captive-portal/download?userId=${profile.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate captive portal');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotspot-login-${formData.portal_slug}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading captive portal:', error);
      alert('Failed to download captive portal');
    } finally {
      setDownloading(false);
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
        <h1 className="text-3xl font-bold text-marketplace-text mb-2">Settings</h1>
        <p className="text-marketplace-text-muted">Manage your account and portal settings</p>
      </div>

      <div className="max-w-2xl">
        {/* Business Information */}
        <div className="bg-marketplace-card rounded-xl p-6 mb-6 border border-marketplace-border">
          <h2 className="text-xl font-bold text-marketplace-text mb-4">Business Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) =>
                  setFormData({ ...formData, business_name: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your Business Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0712345678"
              />
            </div>
          </div>
        </div>

        {/* Portal Settings */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Portal Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Portal Slug
              </label>
              <input
                type="text"
                value={formData.portal_slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    portal_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })
                }
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="my-wifi-portal"
              />
              <p className="text-xs text-gray-400 mt-1">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>

            {formData.portal_slug && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Portal Link
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg font-mono text-sm">
                    {process.env.NEXT_PUBLIC_APP_URL}/portal/{formData.portal_slug}
                  </div>
                  <button
                    onClick={copyPortalLink}
                    className="bg-primary hover:bg-green-600 text-white p-2 rounded-lg"
                    title="Copy link"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={openPortal}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
                    title="Open portal"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Share this link with your customers to allow them to purchase vouchers
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MikroTik Captive Portal */}
        {formData.portal_slug && (
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-2 border-purple-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-4">
              <div className="bg-purple-600 rounded-lg p-3">
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">MikroTik Captive Portal</h2>
                <p className="text-gray-300 text-sm mb-4">
                  Download a ready-to-use captive portal HTML file for your MikroTik router.
                  When users connect to your WiFi, they'll see your voucher portal automatically.
                </p>
                
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-semibold mb-2 flex items-center">
                    <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded mr-2">1</span>
                    Download the captive portal file
                  </h3>
                  <button
                    onClick={downloadCaptivePortal}
                    disabled={downloading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloading ? 'Generating...' : 'Download Captive Portal'}</span>
                  </button>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-semibold mb-2 flex items-center">
                    <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded mr-2">2</span>
                    Upload to MikroTik
                  </h3>
                  <ol className="text-gray-300 text-sm space-y-1 ml-6 list-decimal">
                    <li>Open WinBox and connect to your MikroTik router</li>
                    <li>Go to <code className="bg-gray-700 px-1 rounded">Files</code></li>
                    <li>Upload the downloaded HTML file</li>
                    <li>Go to <code className="bg-gray-700 px-1 rounded">IP → Hotspot → Server Profiles</code></li>
                    <li>Select your hotspot profile and set <code className="bg-gray-700 px-1 rounded">HTML Directory</code> to <code className="bg-gray-700 px-1 rounded">hotspot</code></li>
                    <li>Replace the default <code className="bg-gray-700 px-1 rounded">login.html</code> with your downloaded file</li>
                  </ol>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h3 className="text-blue-400 font-medium mb-2 flex items-center">
                    <span className="mr-2">💡</span>
                    What's included?
                  </h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>✅ Voucher code login form</li>
                    <li>✅ Embedded portal for instant voucher purchase</li>
                    <li>✅ Your business name and branding</li>
                    <li>✅ Mobile-responsive design</li>
                    <li>✅ Error handling for invalid vouchers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payout Settings */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Payout Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payout Phone Number
              </label>
              <input
                type="tel"
                value={formData.payout_phone_number}
                onChange={(e) => setFormData({ ...formData, payout_phone_number: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                placeholder="254712345678"
              />
              <p className="text-xs text-gray-400 mt-1">
                Phone number where you'll receive M-Pesa payments
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payout Frequency
              </label>
              <select
                value={formData.payout_frequency}
                onChange={(e) => setFormData({ ...formData, payout_frequency: e.target.value as 'weekly' | 'monthly' })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
              >
                <option value="weekly">Weekly (Every Saturday)</option>
                <option value="monthly">Monthly (1st of each month)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Payout Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">KSh</span>
                <input
                  type="number"
                  value={formData.minimum_payout}
                  onChange={(e) => setFormData({ ...formData, minimum_payout: Number(e.target.value) })}
                  className="w-full pl-12 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-primary focus:outline-none"
                  min="100"
                  step="100"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Minimum amount before payout is processed (default: KSh 1,000)
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-blue-400 font-medium mb-2">Commission Information</h3>
              <p className="text-gray-300 text-sm">
                Platform commission: <span className="font-semibold">{profile?.commission_rate || 8}%</span>
              </p>
              <p className="text-gray-400 text-xs mt-1">
                You earn {100 - (profile?.commission_rate || 8)}% of each voucher sale
              </p>
            </div>
          </div>
        </div>

        {/* M-Pesa Settings */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">M-Pesa Settings</h2>
          <p className="text-gray-400 text-sm">
            M-Pesa credentials are configured in the environment variables. Contact your
            administrator to update these settings.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

