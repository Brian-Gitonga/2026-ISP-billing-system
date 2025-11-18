'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plan } from '@/lib/types';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    data_limit: '',
    speed: '',
    price: '',
    duration: 'daily' as 'daily' | 'weekly' | 'monthly',
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const planData = {
        ...formData,
        price: parseFloat(formData.price),
        user_id: user.id,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        alert('Plan updated successfully!');
      } else {
        const { error } = await supabase.from('plans').insert([planData]);

        if (error) throw error;
        alert('Plan created successfully!');
      }

      setShowModal(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      data_limit: plan.data_limit || '',
      speed: plan.speed || '',
      price: plan.price.toString(),
      duration: plan.duration,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);

      if (error) throw error;
      alert('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan');
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      data_limit: '',
      speed: '',
      price: '',
      duration: 'daily',
    });
    setEditingPlan(null);
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
          <h1 className="text-3xl font-bold text-white mb-2">Plans & Packages</h1>
          <p className="text-gray-400">Manage your WiFi plans</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Plan</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-gray-800 rounded-xl p-6 border-2 ${
              plan.is_active ? 'border-primary' : 'border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <span className="inline-block mt-2 px-3 py-1 bg-secondary text-white text-xs font-semibold rounded-full uppercase">
                  {plan.duration}
                </span>
              </div>
              <button
                onClick={() => toggleActive(plan)}
                className="text-gray-400 hover:text-white"
              >
                {plan.is_active ? (
                  <ToggleRight className="w-8 h-8 text-primary" />
                ) : (
                  <ToggleLeft className="w-8 h-8" />
                )}
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

            <div className="space-y-2 mb-4">
              {plan.data_limit && (
                <p className="text-gray-300 text-sm">
                  <span className="text-gray-500">Data:</span> {plan.data_limit}
                </p>
              )}
              {plan.speed && (
                <p className="text-gray-300 text-sm">
                  <span className="text-gray-500">Speed:</span> {plan.speed}
                </p>
              )}
            </div>

            <div className="border-t border-gray-700 pt-4 mb-4">
              <p className="text-3xl font-bold text-white">KSh {plan.price}</p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleEdit(plan)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No plans created yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-green-600 text-white px-6 py-3 rounded-lg"
          >
            Create Your First Plan
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Basic Daily"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Plan description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Data Limit
                  </label>
                  <input
                    type="text"
                    value={formData.data_limit}
                    onChange={(e) => setFormData({ ...formData, data_limit: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 1GB"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Speed</label>
                  <input
                    type="text"
                    value={formData.speed}
                    onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 5Mbps"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price (KSh)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: e.target.value as 'daily' | 'weekly' | 'monthly',
                      })
                    }
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-green-600 text-white rounded-lg"
                >
                  {editingPlan ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

