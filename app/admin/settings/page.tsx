'use client';

import { useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    defaultCommissionRate: 8.0,
    minimumPayoutAmount: 1000,
    platformName: 'ISP Voucher Platform',
    supportEmail: 'support@platform.com',
    mpesaShortcode: '174379',
    mpesaPasskey: '',
    autoPayoutEnabled: false,
    payoutSchedule: 'weekly', // weekly, monthly
    maintenanceMode: false,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSaving(false);
    setSaved(true);
    
    setTimeout(() => setSaved(false), 3000);
  };

  const handleInputChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Settings</h1>
          <p className="text-gray-400">Configure platform settings and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition ${
            saved 
              ? 'bg-green-600 text-white' 
              : 'bg-primary hover:bg-green-600 text-white disabled:opacity-50'
          }`}
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">General Settings</h2>
              <p className="text-gray-400 text-sm">Basic platform configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => handleInputChange('platformName', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Commission Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={settings.defaultCommissionRate}
                onChange={(e) => handleInputChange('defaultCommissionRate', parseFloat(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              />
              <p className="text-gray-400 text-xs mt-1">Applied to new users by default</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Payout Amount (KSh)
              </label>
              <input
                type="number"
                min="100"
                step="100"
                value={settings.minimumPayoutAmount}
                onChange={(e) => handleInputChange('minimumPayoutAmount', parseInt(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              />
              <p className="text-gray-400 text-xs mt-1">Minimum amount before payout is allowed</p>
            </div>
          </div>
        </div>

        {/* M-Pesa Settings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">M-Pesa Configuration</h2>
              <p className="text-gray-400 text-sm">Payment gateway settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                M-Pesa Shortcode
              </label>
              <input
                type="text"
                value={settings.mpesaShortcode}
                onChange={(e) => handleInputChange('mpesaShortcode', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                M-Pesa Passkey
              </label>
              <input
                type="password"
                value={settings.mpesaPasskey}
                onChange={(e) => handleInputChange('mpesaPasskey', e.target.value)}
                placeholder="Enter passkey..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              />
              <p className="text-gray-400 text-xs mt-1">Keep this secure and never share</p>
            </div>
          </div>
        </div>

        {/* Payout Settings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Payout Settings</h2>
              <p className="text-gray-400 text-sm">Configure automatic payouts (future feature)</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Enable Automatic Payouts</h3>
                <p className="text-gray-400 text-sm">Automatically process payouts based on schedule</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoPayoutEnabled}
                  onChange={(e) => handleInputChange('autoPayoutEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {settings.autoPayoutEnabled && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-500 font-medium">Feature Coming Soon</h4>
                    <p className="text-yellow-400 text-sm">
                      Automatic payouts will be available in a future update. For now, all payouts are processed manually.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Payout Schedule
              </label>
              <select
                value={settings.payoutSchedule}
                onChange={(e) => handleInputChange('payoutSchedule', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
              >
                <option value="weekly">Weekly (Saturdays)</option>
                <option value="monthly">Monthly (1st of month)</option>
              </select>
              <p className="text-gray-400 text-xs mt-1">Default schedule for new users</p>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-red-500/10 p-3 rounded-lg">
              <Settings className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">System Settings</h2>
              <p className="text-gray-400 text-sm">Platform maintenance and system controls</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Maintenance Mode</h3>
                <p className="text-gray-400 text-sm">Temporarily disable the platform for maintenance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>

            {settings.maintenanceMode && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="text-red-500 font-medium">Maintenance Mode Active</h4>
                    <p className="text-red-400 text-sm">
                      The platform is currently in maintenance mode. Users will see a maintenance message.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
