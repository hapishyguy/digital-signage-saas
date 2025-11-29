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

  // CRITICAL FIX: Handle initial token loading and check entirely in useEffect
  useEffect(() => {
    async function initialCheck() {
      // 1. Check for cached token and set it on the API instance
      if (typeof window !== 'undefined') {
        const cachedToken = localStorage.getItem('authToken');
        if (cachedToken) {
          api.setToken(cachedToken);
        }
      }

      // 2. Perform Setup Check and optionally fetch user data
      try {
        const setupData = await api.get('/api/setup/check');
        setSetupComplete(setupData.setupComplete);

        // If a token was present (and validated by the check above), 
        // try to get user info immediately to authenticate the session.
        if (api.token) {
          try {
            const userData = await api.get('/api/user/info');
            setUser(userData.user);
          } catch (e) {
            // If token is invalid or expired, clear it
            api.clearToken();
            setUser(null);
          }
        }
      } catch (e) {
        // If the API call itself fails (e.g., worker is down, network error), 
        // We assume setup is complete to avoid the welcome screen loop 
        // and force the user to the login screen where they can try to authenticate.
        console.error('Initial API check failed:', e);
        setSetupComplete(true); // FIX: Assume complete on error to avoid welcome screen loop
      } finally {
        setChecking(false);
      }
    }

    initialCheck();
  }, []); // Run only on mount

  const handleSetupComplete = (userData) => {
    // Token is set by the SetupWizard itself, but we ensure it here too
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

  // Super Admin Dashboard
  if (user.role === 'super_admin') { // Corrected role name check
    return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
  }

  // Customer Dashboard
  return <CustomerDashboard user={user} onLogout={handleLogout} />;
}
