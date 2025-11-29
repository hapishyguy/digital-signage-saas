// components/SuperAdminDashboard.js

'use client';

import { useState, useEffect, useCallback } from 'react';
// Added RefreshCw here
import { LogOut, Loader, Monitor, List, Users, Cloud, HardDrive, Edit, RefreshCw, AlertCircle } from 'lucide-react'; 
import { api } from '@/lib/api';
// IMPORANT: These are imported from your frontend utils.js
import { formatBytes, formatDate } from '@/lib/utils'; 
import Modal from './Modal';
import EmptyState from './EmptyState'; 

// --- Sub-component for updating customer limits (Moved here for clarity) ---
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Max Screens</label>
          <input 
            type="number" 
            value={screens} 
            onChange={(e) => setScreens(parseInt(e.target.value) || 0)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Max Playlists</label>
          <input 
            type="number" 
            value={playlists} 
            onChange={(e) => setPlaylists(parseInt(e.target.value) || 0)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Max Storage (MB)</label>
          <input 
            type="number" 
            value={storage} 
            onChange={(e) => setStorage(parseInt(e.target.value) || 0)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? <Loader size={20} className="animate-spin mx-auto" /> : 'Save Limits'}
        </button>
      </div>
    </Modal>
  );
}

// --- Component to display overall platform stats ---
function StatsDashboard({ stats, loading }) {
  if (loading) {
    return <div className="text-center py-12 text-gray-400"><Loader size={32} className="animate-spin mx-auto" /></div>;
  }

  if (!stats) {
      return <EmptyState icon={AlertCircle} text="Could not load platform stats" sub="Check your Cloudflare Worker logs for API errors." />
  }

  const statItems = [
    { title: 'Total Customers', value: stats.totalCustomers, icon: Users },
    { title: 'Active Screens', value: stats.totalScreens, icon: Monitor },
    { title: 'Total Playlists', value: stats.totalPlaylists, icon: List },
    { title: 'Storage Used', value: formatBytes(stats.totalStorageUsed), icon: Cloud },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
      {statItems.map((item, index) => (
        <StatCard key={index} title={item.title} value={item.value} icon={item.icon} />
      ))}
    </div>
  );
}

// --- Component for Customer List Management ---
// Now receives props for data, loading, and refresh function
function CustomerManagement({ customers, loading, onRefresh, onEditLimits }) {
  const CardValue = ({ label, value }) => (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );

  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">All Customers ({customers.length})</h2>
        <button
          onClick={onRefresh} // Wires the refresh button to the passed function
          disabled={loading}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 transition"
          title="Refresh Customer Data"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && customers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
            <Loader size={32} className="animate-spin mx-auto" />
            <p className="mt-2">Loading customer data...</p>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState 
            icon={Users} 
            text="No Customers Found" 
            sub="Wait for a customer to sign up or create a test account." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {customers.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-bold text-white truncate">{c.name}</p>
                  <p className="text-xs text-purple-400 mt-0.5">{c.email}</p>
                </div>
                <button
                  onClick={() => onEditLimits(c)}
                  className="p-1 text-gray-400 hover:text-purple-400 transition hover:bg-gray-800 rounded"
                  title="Edit Limits"
                >
                  <Edit size={16} />
                </button>
              </div>

              <div className="space-y-2 border-t border-gray-800 pt-4">
                <CardValue label="Screens" value={`${c.screens || 0} / ${c.maxScreens}`} />
                <CardValue label="Playlists" value={`${c.playlists || 0} / ${c.maxPlaylists}`} />
                <CardValue label="Media Files" value={c.media || 0} />
                <CardValue label="Storage Used" value={`${formatBytes(c.storageUsed)} / ${formatBytes(c.maxStorage)}`} />
                <CardValue label="Joined" value={formatDate(c.createdAt)} />
              </div>
            </div>
          ))}
        </div>
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
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
}


export default function SuperAdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState({});
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Refactored to fetch all admin data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const [statsData, customersData] = await Promise.all([
            api.get('/api/admin/stats'),
            api.get('/api/admin/customers'), // This fetches the customer list
        ]);
        setStats(statsData);
        setCustomers(customersData);
        console.log("Customers loaded:", customersData.length); // Console log for debugging
    } catch (err) {
        console.error('Error loading admin data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateLimits = async (customerId, limits) => {
    try {
        // Send the update to the API
        await api.put(`/api/admin/customers/${customerId}/limits`, limits);
        // Refresh the local data to show the new limits
        await loadData();
    } catch (err) {
        console.error('Error updating limits:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
        <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:inline">Hello, {user.name}</span>
            <button
                onClick={onLogout}
                className="flex items-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition"
            >
                <LogOut size={18} /> Logout
            </button>
        </div>
      </header>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
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
      {tab === 'stats' && <StatsDashboard stats={stats} loading={loading} />}
      {/* Passing data, loading state, and the refresh function down */}
      {tab === 'customers' && (
        <CustomerManagement 
            customers={customers} 
            loading={loading} 
            onRefresh={loadData} 
            onEditLimits={setSelectedCustomer} 
        />
      )}

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
