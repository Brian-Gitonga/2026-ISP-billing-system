'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { Users, DollarSign, Settings, Eye } from 'lucide-react';

interface UserStats {
  totalEarnings: number;
  pendingEarnings: number;
  totalTransactions: number;
  lastActivity: string;
}

interface UserWithStats extends Profile {
  stats: UserStats;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profiles) return;

      // Fetch stats for each user
      const usersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, net_amount, payout_status, created_at')
            .eq('user_id', profile.id)
            .eq('status', 'completed');

          const totalEarnings = transactions?.reduce((sum, t) => sum + Number(t.net_amount || 0), 0) || 0;
          const pendingEarnings = transactions?.filter(t => t.payout_status === 'pending')
            .reduce((sum, t) => sum + Number(t.net_amount || 0), 0) || 0;
          const totalTransactions = transactions?.length || 0;
          const lastActivity = transactions?.[0]?.created_at || profile.created_at;

          return {
            ...profile,
            stats: {
              totalEarnings,
              pendingEarnings,
              totalTransactions,
              lastActivity,
            },
          };
        })
      );

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionRate = async (userId: string, newRate: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ commission_rate: newRate })
        .eq('id', userId);

      if (error) throw error;

      alert('Commission rate updated successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error updating commission rate:', error);
      alert('Failed to update commission rate');
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
          <h1 className="text-3xl font-bold text-white mb-2">ISP Users Management</h1>
          <p className="text-gray-400">Manage all registered ISP users and their settings</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.stats.totalTransactions > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Pending</p>
              <p className="text-2xl font-bold text-white">
                KSh {users.reduce((sum, u) => sum + u.stats.pendingEarnings, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold text-white">
                KSh {users.reduce((sum, u) => sum + u.stats.totalEarnings, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">All ISP Users</h2>
          <p className="text-gray-400 text-sm">Manage user accounts and commission rates</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Transactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Total Earnings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Pending</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p className="text-white font-medium">{user.business_name || 'Unnamed Business'}</p>
                      <p className="text-gray-400 text-xs">{user.portal_slug || 'No portal'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p className="text-white">{user.phone_number}</p>
                      <p className="text-gray-400 text-xs">
                        Payout: {user.payout_phone_number || 'Not set'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{user.commission_rate}%</span>
                      <button
                        onClick={() => {
                          const newRate = prompt('Enter new commission rate:', user.commission_rate.toString());
                          if (newRate && !isNaN(Number(newRate))) {
                            updateCommissionRate(user.id, Number(newRate));
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">{user.stats.totalTransactions}</td>
                  <td className="px-6 py-4 text-sm text-green-400 font-medium">
                    KSh {user.stats.totalEarnings.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-yellow-400 font-medium">
                    KSh {user.stats.pendingEarnings.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(user.stats.lastActivity).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">User Details</h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Basic Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-sm">Business Name</label>
                    <p className="text-white">{selectedUser.business_name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Phone Number</label>
                    <p className="text-white">{selectedUser.phone_number}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Portal Slug</label>
                    <p className="text-white">{selectedUser.portal_slug || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Joined</label>
                    <p className="text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Payout Settings */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Payout Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-gray-400 text-sm">Commission Rate</label>
                    <p className="text-white">{selectedUser.commission_rate}%</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Payout Frequency</label>
                    <p className="text-white capitalize">{selectedUser.payout_frequency}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Minimum Payout</label>
                    <p className="text-white">KSh {selectedUser.minimum_payout.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Payout Phone</label>
                    <p className="text-white">{selectedUser.payout_phone_number || 'Not set'}</p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-lg font-semibold text-white">Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-white">{selectedUser.stats.totalTransactions}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Earnings</p>
                    <p className="text-xl font-bold text-green-400">
                      KSh {selectedUser.stats.totalEarnings.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Pending Earnings</p>
                    <p className="text-xl font-bold text-yellow-400">
                      KSh {selectedUser.stats.pendingEarnings.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Last Activity</p>
                    <p className="text-sm text-white">
                      {new Date(selectedUser.stats.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
