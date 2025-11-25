'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { api } from '@/lib/api';
import SetupWizard from '@/components/SetupWizard';
import AuthScreen from '@/components/AuthScreen';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import CustomerDashboard from '@/components/CustomerDashboard';

export default function Home() {
  const [setupComplete, setSetupComplete] = useState(null);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if setup is complete
    api.get('/api/setup/check')
      .then(data => {
        setSetupComplete(data.setupComplete);
        setChecking(false);
      })
      .catch(() => {
        setSetupComplete(false);
        setChecking(false);
      });
  }, []);

  const handleSetupComplete = (userData) => {
    api.setToken(userData.token);
    setUser(userData.user);
    setSetupComplete(true);
  };

  const handleAuth = (userData) => {
    api.setToken(userData.token);
    setUser(userData.user);
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
  };

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-purple-500 mx-auto mb-4" size={48} />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Setup wizard (first time only)
  if (!setupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // Auth screen (login/signup)
  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // Super admin dashboard
  if (user.role === 'super_admin') {
    return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
  }

  // Customer dashboard
  return <CustomerDashboard user={user} onLogout={handleLogout} />;
}
