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
    // Function to handle the initial loading sequence (Fixes Q3, Q1, Q2)
    const initApp = async () => {
      try {
        // 1. Check if setup is complete
        const setupData = await api.get('/api/setup/check');
        const isSetupComplete = setupData.setupComplete;
        setSetupComplete(isSetupComplete);

        if (isSetupComplete && api.token) {
          // 2. If setup is complete AND a token exists, fetch the user object
          // This call rehydrates the user state, confirming the role (Q1) and limits.
          const userData = await api.get('/api/user/me');
          setUser(userData); 
        }
      } catch (err) {
        console.error('Initial check failed, clearing session:', err.message);
        // If the token is invalid or the network fails, clear the local session
        api.clearToken();
        setUser(null);
        setSetupComplete(false); // In case the database check itself failed
      } finally {
        setChecking(false);
      }
    };
    
    initApp();
  }, []);

  const handleSetupComplete = (userData) => {
    // This is called when the setup wizard is completed
    api.setToken(userData.token);
    setUser(userData.user);
    setSetupComplete(true);
  };

  const handleAuth = (userData) => {
    // This is called after successful login or registration
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

  // Dashboard routing (Q1 & Q2 Fix is here via verified user.role)
  if (user.role === 'super_admin') {
    return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
  } else {
    return <CustomerDashboard user={user} onLogout={handleLogout} />;
  }
}
