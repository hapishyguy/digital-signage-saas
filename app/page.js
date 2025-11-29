// app/page.js

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
    async function initializeApp() {
      try {
        // 1. Check if setup is complete (API endpoint: /api/setup/check)
        const setupData = await api.get('/api/setup/check');
        setSetupComplete(setupData.setupComplete);

        // 2. If setup is complete AND a token is stored, attempt re-authentication
        if (setupData.setupComplete && api.token) {
          try {
            // Attempt to fetch user info using the stored token
            const userData = await api.get('/api/user/info');
            setUser(userData); // Hydrate user state with successful response
          } catch (tokenError) {
            // If the token is invalid (401), api.js clears it. Force login screen.
            api.clearToken();
            setUser(null);
          }
        }
      } catch (err) {
        // Handle API initialization errors (e.g., Worker is down/unreachable)
        console.error("Initialization error:", err);
        // Force setup=false if we can't connect, so user can try setup again
        setSetupComplete(false); 
      } finally {
        setChecking(false);
      }
    }
    initializeApp();
  }, []); // Runs only once on mount

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
    // Optional: window.location.reload(); // A hard reload is often cleaner for full logout
  };

  // Loading state (while checking setup and token)
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

  // 1. Setup wizard (first time only)
  if (!setupComplete) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // 2. Auth screen (login/signup) if user state is null
  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // 3. Dashboard
  if (user.role === 'superadmin') {
    return <SuperAdminDashboard user={user} onLogout={handleLogout} />;
  }
  
  return <CustomerDashboard user={user} onLogout={handleLogout} />;
}
