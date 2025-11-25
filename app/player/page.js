'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '@/lib/config';

export default function PlayerPage() {
  const [screen, setScreen] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const screenTokenRef = useRef(null);
  const screenIdRef = useRef(null);

  // Register screen
  const registerScreen = useCallback(async () => {
    try {
      // Check if we have cached token
      const cachedToken = localStorage.getItem('screenToken');
      const cachedId = localStorage.getItem('screenId');
      
      if (cachedToken && cachedId) {
        screenTokenRef.current = cachedToken;
        screenIdRef.current = cachedId;
        setConnectionStatus('connected');
        return cachedId;
      }

      // Register new screen
      const res = await fetch(`${API_URL}/api/screens/register`, { method: 'POST' });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      screenTokenRef.current = data.screenToken;
      screenIdRef.current = data.screenId;
      
      // Cache token and ID
      localStorage.setItem('screenToken', data.screenToken);
      localStorage.setItem('screenId', data.screenId);
      
      setScreen({
        id: data.screenId,
        pairingCode: data.pairingCode,
        paired: false
      });
      setLoading(false);
      setConnectionStatus('connected');
      
      return data.screenId;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setConnectionStatus('error');
      return null;
    }
  }, []);

  // Poll for updates
  useEffect(() => {
    registerScreen();
    
    const interval = setInterval(async () => {
      if (!screenTokenRef.current) return;
      
      try {
        const res = await fetch(`${API_URL}/api/screens/status?token=${screenTokenRef.current}`);
        const data = await res.json();
        
        if (data.error) {
          // Token invalid, re-register
          localStorage.removeItem('screenToken');
          localStorage.removeItem('screenId');
          screenTokenRef.current = null;
          return registerScreen();
        }
        
        setScreen(data);
        setConnectionStatus('connected');
        
        // Update playlist if changed
        if (data.playlist) {
          setPlaylist(prev => {
            const prevId = prev?.id;
            const newId = data.playlist.id;
            if (prevId !== newId) {
              setCurrentIndex(0); // Reset to first item if playlist changed
            }
            return data.playlist;
          });
          
          // Cache playlist for offline use
          localStorage.setItem('cachedPlaylist', JSON.stringify(data.playlist));
        } else {
          setPlaylist(null);
        }
      } catch (err) {
        console.error('Poll error:', err);
        setConnectionStatus('offline');
        
        // Try to load cached playlist
        const cached = localStorage.getItem('cachedPlaylist');
        if (cached && !playlist) {
          setPlaylist(JSON.parse(cached));
        }
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [registerScreen, playlist]);

  // Advance to next item
  const advanceToNext = useCallback(() => {
    if (!playlist?.items?.length) return;
    setCurrentIndex(prev => (prev + 1) % playlist.items.length);
  }, [playlist?.items?.length]);

  // Handle playback timer
  useEffect(() => {
    if (!playlist?.items?.length) return;
    
    const item = playlist.items[currentIndex];
    if (!item) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (item.mediaType === 'image') {
      timerRef.current = setTimeout(advanceToNext, (item.duration || 10) * 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, playlist?.items, advanceToNext]);

  // Preload next media
  useEffect(() => {
    if (!playlist?.items?.length) return;
    
    const nextIndex = (currentIndex + 1) % playlist.items.length;
    const nextItem = playlist.items[nextIndex];
    
    if (nextItem?.mediaType === 'image') {
      const img = new Image();
      img.src = nextItem.mediaUrl;
    }
  }, [currentIndex, playlist?.items]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Initializing Display...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-950 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <div className="text-white text-3xl mb-4">Connection Error</div>
          <div className="text-red-200 text-xl mb-6">{error}</div>
          <button 
            onClick={() => { 
              setError(null); 
              setLoading(true); 
              localStorage.clear();
              registerScreen(); 
            }}
            className="px-8 py-4 bg-white text-red-900 rounded-xl text-xl font-semibold hover:bg-gray-100 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Pairing code display
  if (!screen?.paired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/70 text-2xl mb-4">Enter this code to pair</div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-10 border border-white/20 shadow-2xl">
            <div className="flex justify-center gap-3 mb-6">
              {screen?.pairingCode?.split('').map((char, i) => (
                <span 
                  key={i} 
                  className="text-6xl font-mono font-bold text-white bg-white/10 w-20 h-24 flex items-center justify-center rounded-xl border border-white/20 shadow-lg"
                >
                  {char}
                </span>
              ))}
            </div>
            <div className="text-white/50 text-lg">
              Code refreshes automatically
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-white/40">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}></div>
            <span className="text-sm">
              {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'offline' ? 'Offline' : 'Connecting...'}
            </span>
          </div>

          <div className="mt-4 text-white/30 text-sm">
            Screen ID: {screen?.id?.slice(0, 8)}...
          </div>
        </div>
      </div>
    );
  }

  // Paired but no playlist
  if (!playlist?.items?.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-8">📺</div>
          <div className="text-white text-4xl font-semibold mb-3">{screen.name}</div>
          <div className="text-gray-400 text-2xl mb-8">Waiting for content...</div>
          
          <div className="bg-gray-800/50 rounded-xl p-6 inline-block">
            <div className="text-gray-500 text-sm">Assign a playlist in the dashboard</div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : connectionStatus === 'offline' ? 'bg-orange-400' : 'bg-yellow-400 animate-pulse'}`}></div>
            <span className="text-sm">{connectionStatus === 'offline' ? 'Offline - will sync when online' : 'Connected'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Playing content
  const currentItem = playlist.items[currentIndex];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      {currentItem.mediaType === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.id}
          src={currentItem.mediaUrl}
          autoPlay
          muted
          playsInline
          onEnded={advanceToNext}
          onError={advanceToNext}
          className="w-full h-screen object-contain"
        />
      ) : (
        <img
          key={currentItem.id}
          src={currentItem.mediaUrl}
          alt=""
          onError={advanceToNext}
          className="w-full h-screen object-contain"
        />
      )}
      
      {/* Progress dots */}
      {playlist.items.length > 1 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
          {playlist.items.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'bg-white w-8' : 'bg-white/30 w-2'
              }`}
            />
          ))}
        </div>
      )}

      {/* Connection indicator */}
      <div className="fixed top-4 right-4">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-400' : 
          connectionStatus === 'offline' ? 'bg-orange-400' : 
          'bg-yellow-400 animate-pulse'
        }`}></div>
      </div>

      {/* Playlist name */}
      <div className="fixed top-4 left-4 text-white/50 text-sm">
        {playlist.name}
      </div>
    </div>
  );
}
