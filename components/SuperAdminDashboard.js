'use client';

import { useState, useEffect, useCallback } from 'react';
import { LogOut, Loader, Monitor } from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import Modal from './Modal';

export default function SuperAdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, customersData] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/customers'),
      ]);
      setStats(statsData);
      setCustomers(customersData);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateLimits = async (customerId, limits) => {
    try {
      await api.put(`/api/admin/customers/${customerId}/limits`, limits);
      await loadData();
      setSelectedCustomer(null);
    } catch (err) {
      alert('Error updating limits: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-purple-500 mx-auto mb-4" size={48} />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <span className="font-semibold text-lg">Super Admin Dashboard</span>
              <p className="text-xs text-gray-500">Platform Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden sm:block">{user.email}</span>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6">
            <div className="text-3xl font-bold">{stats?.totalCustomers || 0}</div>
            <div className="text-purple-200 text-sm mt-1">Total Customers</div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6">
            <div className="text-3xl font-bold">{stats?.totalScreens || 0}</div>
            <div className="text-blue-200 text-sm mt-1">Total Screens</div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6">
            <div className="text-3xl font-bold">
              {formatBytes(stats?.totalStorage || 0)}
            </div>
            <div className="text-green-200 text-sm mt-1">Total Storage</div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6">
            <div className="text-3xl font-bold">{stats?.totalMedia || 0}</div>
            <div className="text-orange-200 text-sm mt-1">Media Files</div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Customers</h2>
            <button
              onClick={loadData}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Screens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Storage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No customers yet. They can sign up at your main URL.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-800/30 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs uppercase font-medium">
                          {customer.tier || 'free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Monitor size={16} className="text-gray-500" />
                          <span>
                            {customer.screenCount} / {customer.customLimits?.screens || 5}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div>{formatBytes(customer.storageUsed)}</div>
                          <div className="text-gray-500">
                            / {formatBytes(customer.customLimits?.storage || 500 * 1024 * 1024)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-400">
                          {formatDate(customer.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Manage Customer Modal */}
      {selectedCustomer && (
        <ManageLimitsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSave={handleUpdateLimits}
        />
      )}
    </div>
  );
}

function ManageLimitsModal({ customer, onClose, onSave }) {
  const [screens, setScreens] = useState(
    customer.customLimits?.screens || 5
  );
  const [playlists, setPlaylists] = useState(
    customer.customLimits?.playlists || 5
  );
  const [storage, setStorage] = useState(
    Math.round((customer.customLimits?.storage || 500 * 1024 * 1024) / 1024 / 1024)
  );

  const handleSave = () => {
    onSave(customer.id, {
      screens,
      playlists,
      storage: storage * 1024 * 1024, // Convert MB to bytes
    });
  };

  return (
    <Modal title={`Manage ${customer.name}'s Limits`} onClose={onClose}>
      <div className="space-y-6">
        {/* Current Usage */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
          <div>
            <div className="text-gray-400 text-sm">Current Screens</div>
            <div className="text-2xl font-bold text-white">{customer.screenCount}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Storage Used</div>
            <div className="text-2xl font-bold text-white">
              {formatBytes(customer.storageUsed)}
            </div>
          </div>
        </div>

        {/* Edit Limits */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Max Screens
            </label>
            <input
              type="number"
              min="1"
              value={screens}
              onChange={(e) => setScreens(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Max Playlists
            </label>
            <input
              type="number"
              min="1"
              value={playlists}
              onChange={(e) => setPlaylists(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Max Storage (MB)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={storage}
              onChange={(e) => setStorage(parseInt(e.target.value) || 100)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Currently using: {formatBytes(customer.storageUsed)}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition"
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
}
