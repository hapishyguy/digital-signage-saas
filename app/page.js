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
  
  // Flag to know if we are fetching user data for the first time
  const [authChecked, setAuthChecked] = useState(false); 

  const handleLogout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  // Main Authentication and Data Fetching Logic
  const checkAuthAndLoadUser = useCallback(async () => {
    // 1. Check if token exists in storage
    const token = api.token; // Accesses token from localStorage via the api instance
    if (!token) {
        setUser(null);
        setAuthChecked(true);
        return;
    }
    
    // 2. Token exists, try to fetch user info
    try {
        const userInfo = await api.get('/api/user/info');
        setUser(userInfo.user);
    } catch (error) {
        // If token is invalid/expired, API returns 401/404/error, so we log out locally
        console.error("Token invalid or expired, logging out:", error);
        handleLogout();
    } finally {
        setAuthChecked(true);
    }
  }, [handleLogout]);


  // Initial Setup Check and Auth Check
  useEffect(() => {
    const checkSetup = async () => {
      try {
        // First, check if the system requires setup
        const setupData = await api.get('/api/setup/check');
        setSetupComplete(setupData.setupComplete);
        
        // If setup is complete, immediately try to authenticate
        if (setupData.setupComplete) {
            await checkAuthAndLoadUser();
        } else {
            // If setup is NOT complete, we skip auth check and just wait for setup
            setAuthChecked(true);
        }

      } catch (e) {
        // If the API call fails entirely (e.g., bad config.js URL or worker error)
        console.error('Initial setup/API check failed:', e);
        // Default to showing setup in case of failure, as it contains the key config values
        setSetupComplete(false); 
        setAuthChecked(true);
      } finally {
        setChecking(false);
      }
    };

    checkSetup();
  }, [checkAuthAndLoadUser]);


  const handleSetupComplete = (userData) => {
    api.setToken(userData.token);
    setUser(userData.user);
    setSetupComplete(true);
  };

  const handleAuth = (userData) => {
    api.setToken(userData.token);
    setUser(userData.user);
  };


  // --- Render Logic ---

  // Loading state
  if (checking || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-purple-500 mx-auto mb-4" size={48} />
          <p className="text-gray-400">Loading Application State...</p>
        </div>
      </div>
    );
  }

  // 1. Setup wizard (first time only)
  if (!setupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // 2. Auth screen (login/signup) - Shown if setup is complete but no user is logged in
  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // 3. Dashboards
  if (user.role === 'super_admin') {
    return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
  } else if (user.role === 'customer') {
    return <CustomerDashboard user={user} onLogout={handleLogout} />;
  }

  // Fallback to Auth screen if role is unknown
  return <AuthScreen onAuth={handleAuth} />;
}
