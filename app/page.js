'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // --- NEW: Auto-login logic to restore session from stored token ---
  const attemptAutoLogin = useCallback(async () => {
    // api.js constructor loads the token from localStorage on initialization.
    // If the token is present, we try to validate it with the server.
    if (!api.token) {
      return; 
    }

    try {
      // 1. Use the stored token to fetch user info and validate session
      const userInfo = await api.get('/api/user/info');
      // 2. Token is valid, restore session
      setUser(userInfo.user);
    } catch (error) {
      // 3. Token is expired or invalid (e.g., 401). Clear it and proceed to login.
      console.error('Auto-login failed. Clearing expired token:', error.message);
      api.clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function initializeApp() {
      setChecking(true);
      
      // 1. Check if setup is complete
      let isSetupComplete = false;
      try {
        const setupData = await api.get('/api/setup/check');
        isSetupComplete = setupData.setupComplete;
        setSetupComplete(isSetupComplete);
      } catch (error) {
        // If API call fails completely, assume not set up or temporary failure
        setSetupComplete(false);
        setChecking(false);
        return;
      }

      // 2. If setup is complete, attempt to auto-login using stored token
      if (isSetupComplete) {
        await attemptAutoLogin();
      }

      setChecking(false);
    }

    initializeApp();
  }, [attemptAutoLogin]); 
  // --- END NEW LOGIC ---

  const handleSetupComplete = (userData) => {
    // api.setToken is called inside the wizard, but this ensures state is set
    setUser(userData.user);
    setSetupComplete(true);
  };

  const handleAuth = (userData) => {
    // Ensure the token is set on a successful login/register
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

  // Dashboard (Super Admin or Customer)
  if (user.role === 'super_admin') {
    return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
  }
  
  // Default to Customer Dashboard
  return <CustomerDashboard user={user} onLogout={handleLogout} />;
}
