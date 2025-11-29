// components/SuperAdminDashboard.js

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  LogOut, 
  Loader, 
  Monitor, 
  List, 
  Users, 
  Cloud, 
  HardDrive, 
  Edit,
  RefreshCw // <-- ADDED
} from 'lucide-react'; 
// IMPORANT: These are imported from your frontend utils.js
import { formatBytes, formatDate } from '@/lib/utils'; 
import Modal from './Modal';
import EmptyState from './EmptyState'; // Assuming EmptyState.js exists

// --- Sub-component for updating customer limits ---\
function LimitModal({ customer, onSave, onClose }) {
  // Convert storage from bytes to MB for display/editing
  const [screens, setScreens] = useState(customer.maxScreens || 5);
  const [playlists, setPlaylists] = useState(customer.maxPlaylists || 5);
  // Storage is converted from Bytes to MB for the input field
  const [storage, setStorage] = useState(Math.round((customer.maxStorage || (500 * 1024 * 1024)) / (1024 * 1024))); 
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // Note: We are sending the limits in the units the modal uses (MB for storage)
    const limits = {
      maxScreens: screens,
      maxPlaylists: playlists,
      maxStorage: storage, // Send MB value
    };
    // The Cloudflare Worker handles the conversion of MB back to Bytes for database storage
    await onSave(customer.id, limits);
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={`Edit Limits for ${customer.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label htmlFor="screens" className="block text-sm font-medium text-gray-400">Max Screens</label>
          <input
            id="screens"
            type="number"
            min="0"
            value={screens}
            onChange={(e) => setScreens(parseInt(e.target.value))}
            className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
        <div>
          <label htmlFor="playlists" className="block text-sm font-medium text-gray-400">Max Playlists</label>
          <input
            id="playlists"
            type="number"
            min="0"
            value={playlists}
            onChange={(e) => setPlaylists(parseInt(e.target.value))}
            className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
        <div>
          <label htmlFor="storage" className="block text-sm font-medium text-gray-400">Max Storage (MB)</label>
          <input
            id="storage"
            type="number"
            min="0"
            value={storage}
            onChange={(e) => setStorage(parseInt(e.target.value))}
            className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium text-white transition disabled:opacity-50"
        >
          {loading ? <Loader size={20} className="animate-spin" /> : 'Save Limits'}
        </button>
      </div>
    </Modal>
  );
}

// --- Main Super Admin Dashboard Component ---
export default function SuperAdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('stats');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Function to load all customer data
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/admin/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
    setLoading(false);
  }, []);

  // Initial data load
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);


  // Handler for updating customer limits (called from LimitModal)
  const handleUpdateLimits = async (customerId, limits) => {
    try {
      await api.put(`/api/admin/customers/${customerId}/limits`, limits);
      // Re-fetch data to reflect the changes
      await loadCustomers(); 
    } catch (err) {
      console.error('Error updating limits:', err);
    }
  };


  // --- Sub-component for displaying overall stats ---
  const StatsDashboard = () => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.totalScreens > 0).length;
    const totalScreens = customers.reduce((sum, c) => sum + c.totalScreens, 0);
    const totalPlaylists = customers.reduce((sum, c) => sum + c.totalPlaylists, 0);
    const totalStorage = customers.reduce((sum, c) => sum + (c.storageUsed || 0), 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Customers" 
          value={totalCustomers} 
          icon={Users} 
          onClick={() => setTab('customers')} 
        />
        <StatCard 
          title="Active Screens" 
          value={totalScreens} 
          icon={Monitor} 
          sub={`Across ${activeCustomers} active accounts`}
        />
        <StatCard 
          title="Total Playlists" 
          value={totalPlaylists} 
          icon={List} 
        />
        <StatCard 
          title="Total Storage Used" 
          value={formatBytes(totalStorage)} 
          icon={Cloud} 
        />
      </div>
    );
  };

  // --- Sub-component for customer table/management ---
  const CustomerManagement = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <Loader className="animate-spin text-purple-500 mx-auto" size={48} />
          <p className="text-gray-400 mt-4">Loading customer data...</p>
        </div>
      );
    }

    if (customers.length === 0) {
      return (
        <EmptyState 
          icon={Users} 
          text="No customers found." 
          sub="New users can sign up via the login screen." 
        />
      );
    }

    return (
      <div className="overflow-x-auto bg-gray-900/50 rounded-xl border border-gray-800">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800/70">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Screens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Playlists</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Storage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Login</th> {/* Added Header */}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-800 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.email}</div>
                  <div className="text-xs text-gray-600 mt-1">ID: {customer.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {customer.totalScreens || 0} / {customer.maxScreens}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {customer.totalPlaylists || 0} / {customer.maxPlaylists}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="text-gray-300">{formatBytes(customer.storageUsed || 0)} / {formatBytes(customer.maxStorage)}</div>
                  <div className="w-24 bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                          className="bg-purple-500 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(100, (customer.storageUsed / customer.maxStorage) * 100) || 0}%` }}
                      ></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {formatDate(customer.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {/* Using formatDateTime from utils for detailed timestamp */}
                  {formatDateTime(customer.lastLogin)} 
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedCustomer(customer)}
                    className="text-purple-400 hover:text-purple-300 transition"
                    title="Edit Limits"
                  >
                    <Edit size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Helper Card Component
  function StatCard({ title, value, icon: Icon, sub, onClick }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg transition ${onClick ? 'hover:border-purple-500 cursor-pointer' : ''}`}
        >
            <Icon size={28} className="text-purple-500 mb-4" />
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-2">{sub}</p>}
        </div>
    );
  }


  // --- Main Dashboard Render ---
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-10 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-purple-400">
          Super Admin Panel
        </h1>
        <div className="text-sm text-gray-400 flex items-center gap-4">
          <span>{user.email}</span>
          <button onClick={onLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition text-sm">
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </header>

      {/* Tabs and Refresh Button - Modified to use justify-between */}
      <div className="flex justify-between items-end border-b border-gray-800 mb-6">
        {/* Tabs Grouped on the Left */}
        <div className="flex items-center">
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
        
        {/* Refresh Button - Pushed to the far right */}
        <button 
          onClick={loadCustomers} // Calls the function to re-fetch data
          disabled={loading} // Disables while loading
          className={`p-2 rounded-lg transition text-gray-400 hover:bg-gray-700 hover:text-white ${loading ? 'animate-spin' : ''}`}
          title="Refresh Data"
        >
          <RefreshCw size={20} />
        </button>
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
