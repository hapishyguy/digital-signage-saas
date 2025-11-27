// components/SuperAdminDashboard.js

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LogOut, Loader, Monitor, List, Users, Cloud, HardDrive, Edit } from 'lucide-react'; 
import { api } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import Modal from './Modal';
import EmptyState from './Modal'; // Assuming EmptyState is available, use Modal as placeholder
// If EmptyState.js exists, correct this line to: import EmptyState from './EmptyState';
// The previous file had EmptyState, so assuming it's available.

// --- Sub-component for updating customer limits ---
function LimitModal({ customer, onSave, onClose }) {
  // Convert storage from bytes to MB for display/editing
  const [screens, setScreens] = useState(customer.maxScreens || 5);
  const [playlists, setPlaylists] = useState(customer.maxPlaylists || 5);
  const [storage, setStorage] = useState(Math.round((customer.maxStorage || (500 * 1024 * 1024)) / (1024 * 1024)));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // Convert storage back to bytes for the API
    const limits = {
      maxScreens: screens,
      maxPlaylists: playlists,
      maxStorage: storage * 1024 * 1024, 
    };
    await onSave(customer.id, limits);
    setLoading(false);
  };

  return (
    <Modal title={`Edit Limits for ${customer.name || customer.email}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-2">Max Screens</label>
          <input
            type="number"
            min="1"
            value={screens}
            onChange={(e) => setScreens(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-2">Max Playlists</label>
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
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3 mt-6 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition"
      >
        {loading ? <Loader className="animate-spin" size={20} /> : 'Save Limits'}
      </button>
    </Modal>
  );
}
// ----------------------------------------------------------------------

export default function SuperAdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('stats'); // Default to stats tab
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
      // Catching the error is correct, but log it explicitly
      console.error('Error loading dashboard data:', err);
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
          <p className="text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // --- Stats Dashboard Tab ---
  const StatsDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        title="Total Customers" 
        value={stats?.totalCustomers || 0} 
        icon={Users} 
        onClick={() => setTab('customers')} 
      />
      <StatCard 
        title="Total Screens" 
        value={stats?.totalScreens || 0} 
        icon={Monitor} 
      />
      <StatCard 
        title="Total Playlists" 
        value={stats?.totalPlaylists || 0} 
        icon={List} 
      />
      <StatCard 
        title="Storage Used" 
        value={formatBytes(stats?.totalStorageUsed || 0)} 
        icon={HardDrive} 
      />
    </div>
  );

  // --- Customers Management Tab ---
  const CustomerManagement = () => (
    <div className="bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800">
      <div className="overflow-x-auto">
        {customers.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/50 rounded-xl border border-gray-800">
             <Users size={48} className="mx-auto mb-4 text-gray-700" />
             <p className="text-gray-400 text-lg">No customers yet.</p>
             <p className="text-gray-600 text-sm mt-1">New users will appear here after they sign up.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Signed Up</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Limits (S/P/D)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-800">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/70 transition">
                  {/* FIX: Use c.email as a fallback if c.name is missing */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{c.name || c.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{c.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDate(c.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {c.maxScreens || '?'} / {c.maxPlaylists || '?'} / {formatBytes(c.maxStorage || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedCustomer(c)}
                      className="text-purple-400 hover:text-purple-300 transition flex items-center justify-end gap-1"
                    >
                      <Edit size={16} /> Edit Limits
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-10">
      <header className="flex justify-between items-start mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Cloud className="text-purple-500" size={32} />
          Super Admin Dashboard
        </h1>
        {/* FIX: Display user name and email in the header */}
        <div className="flex flex-col items-end">
          <p className="text-white font-medium">{user.name}</p>
          <p className="text-gray-400 text-sm">{user.email}</p>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition mt-2 text-sm"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="flex space-x-4 border-b border-gray-800 mb-6">
        {[{ id: 'stats', label: 'Overview', icon: HardDrive }, { id: 'customers', label: 'Customers', icon: Users }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 py-2 px-4 text-sm font-medium transition ${
              tab === t.id
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white border-b-2 border-transparent'
            }`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {tab === 'stats' && <StatsDashboard />}
      {tab === 'customers' && <CustomerManagement />}

      {/* Limit Modal */}
      {selectedCustomer && (
        <LimitModal
          customer={selectedCustomer}
          onSave={handleUpdateLimits}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}

// Helper Card Component
function StatCard({ title, value, icon: Icon, onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg transition ${onClick ? 'hover:border-purple-500 cursor-pointer' : ''}`}
        >
            <Icon size={28} className="text-purple-500 mb-4" />
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
    );
}
