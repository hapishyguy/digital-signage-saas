'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { api } from '@/lib/api';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name || !email || !password) {
      setError('Please fill all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await api.post('/api/setup/complete', {
        email,
        password,
        name,
      });

      onComplete(data);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Digital Signage SaaS
          </h1>
          <p className="text-white/60">
            Let's set up your platform - Step {step} of 2
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-6 text-white/80 text-sm space-y-3">
              <h3 className="font-semibold text-white text-base mb-4">
                Before you begin, make sure you have completed:
              </h3>

              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">InstantDB Account:</strong>
                  <p className="text-white/70 mt-1">
                    1. Go to instantdb.com and create an account<br />
                    2. Create a new app<br />
                    3. Copy your App ID (from dashboard)<br />
                    4. Go to Settings → Admin Tokens → Create token<br />
                    5. Copy your Admin Token
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Cloudflare R2 Bucket:</strong>
                  <p className="text-white/70 mt-1">
                    1. Go to dash.cloudflare.com<br />
                    2. Navigate to R2 Object Storage<br />
                    3. Create a bucket named: signage-media
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white">Cloudflare Worker Deployed:</strong>
                  <p className="text-white/70 mt-1">
                    1. Deploy the backend API using Wrangler<br />
                    2. Update lib/config.js with your Worker URL<br />
                    3. Update wrangler.toml with InstantDB credentials
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-200 text-sm flex gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong>Important:</strong> Make sure your Cloudflare Worker is deployed and 
                the API_URL in lib/config.js points to your worker before continuing. 
                This setup wizard will try to connect to your backend.
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-lg transition"
            >
              I've Completed These Steps →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-white/5 rounded-xl p-5 text-white/80 text-sm">
              <p className="mb-2">
                <strong className="text-white">Create your super admin account</strong>
              </p>
              <p>
                This will be the master account with full access to all customers, 
                settings, and the super admin dashboard. Keep these credentials secure.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="admin@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading || !email || !password || !name}
                className="flex-2 py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Setting up...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </div>

            <div className="text-center text-white/50 text-xs">
              After setup, customers can freely sign up and create accounts
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
