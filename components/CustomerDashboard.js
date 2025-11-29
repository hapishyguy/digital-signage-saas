'use client';

import { useState, useEffect, useCallback } from 'react';
// Added RefreshCw here
import { Monitor, Upload, List, LogOut, Plus, Trash2, Video, Image, Loader, Users, Calendar, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes, getStoragePercentage } from '@/lib/utils';
import Modal from './Modal';
import EmptyState from './EmptyState';

// --- Sub-component for Playlist Item Viewer ---
function PlaylistViewerModal({ playlist, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch media details for each item in the playlist
      const mediaIds = playlist.items.map(item => item.mediaId);
      const mediaDetails = await api.post('/api/media/batch', { mediaIds });

      const detailedItems = playlist.items.map(item => {
        const media = mediaDetails.find(m => m.id === item.mediaId);
        return {
          ...item,
          mediaUrl: media?.url,
          mediaType: media?.type,
        };
      });
      setItems(detailedItems);
    } catch (err) {
      console.error('Error loading playlist items:', err);
    }
    setLoading(false);
  }, [playlist.items]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <Modal title={playlist.name} onClose={onClose} size="lg">
      <div className="text-sm text-gray-400 mb-4">Total Items: {items.length}</div>
      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No items in this playlist</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-auto pr-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-4 bg-gray-800 rounded-lg p-3 border border-gray-700">
              <span className="text-gray-500 w-6 text-center text-lg font-bold">{idx + 1}</span>
              <div className="w-20 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                {item.mediaType === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video size={18} className="text-gray-600" />
                  </div>
                ) : item.mediaUrl ? (
                  <img src={item.mediaUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">N/A</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{item.mediaId}</p>
                <p className="text-sm text-gray-500">{item.duration} seconds</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// --- Sub-component for managing the list of screens ---
function ScreensList({ screens, playlists, loading, onRefresh, onAssignPlaylist, onUnassignScreen }) {
  const getPlaylistName = (id) => playlists.find(p => p.id === id)?.name || 'N/A';

  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Your Screens ({screens.length})</h2>
        <button
          onClick={onRefresh} // Wires the refresh button to the passed function
          disabled={loading}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 transition"
          title="Refresh Screens"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && screens.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
            <Loader size={32} className="animate-spin mx-auto" />
            <p className="mt-2">Loading screens...</p>
        </div>
      ) : screens.length === 0 ? (
        <EmptyState 
          icon={Monitor} 
          text="No Screens Paired Yet" 
          sub="Ensure your player device is running to see its pairing code and register it here." 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {screens.map(screen => (
            <div key={screen.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-white">{screen.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAssignPlaylist(screen)}
                    className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition"
                  >
                    <List size={16} /> Assign
                  </button>
                  <button
                    onClick={() => onUnassignScreen(screen.id)}
                    className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID:</span>
                  <span className="text-gray-300 font-mono text-xs">{screen.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned Playlist:</span>
                  <span className="text-white font-medium truncate max-w-[60%]">{screen.playlistId ? getPlaylistName(screen.playlistId) : 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${screen.lastCheckin > (Date.now() - 60000) ? 'text-green-400' : 'text-yellow-400'}`}>
                    {screen.lastCheckin > (Date.now() - 60000) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Customer Dashboard Component ---
export default function CustomerDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('screens');
  const [userInfo, setUserInfo] = useState(null);
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [info, s, p, m] = await Promise.all([
        api.get('/api/user/info'),
        api.get('/api/screens'),
        api.get('/api/playlists'),
        api.get('/api/media'),
      ]);
      setUserInfo(info);
      setScreens(s);
      setPlaylists(p);
      setMedia(m);
    } catch (err) {
      console.error('Error loading data:', err);
      // In case of error, set loading to false anyway to allow refresh
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler functions for screen management (omitted for brevity, but they should call loadData after success)
  // ...

  const tabs = [
    { id: 'screens', label: 'Screens', icon: Monitor, value: screens.length },
    { id: 'playlists', label: 'Playlists', icon: List, value: playlists.length },
    { id: 'media', label: 'Media', icon: Upload, value: media.length },
    { id: 'account', label: 'Account', icon: Users, value: null },
  ];

  const storageUsed = userInfo?.storageUsed || 0;
  const maxStorage = userInfo?.maxStorage || 1; // Avoid division by zero
  const storagePercent = getStoragePercentage(storageUsed, maxStorage);

  // Handlers for modal interactions
  const handleAssignPlaylist = (screen) => setModal({ type: 'assign', screen });
  const handlePlaylistViewer = (playlist) => setModal({ type: 'view-playlist', playlist });
  const handleUploadMedia = () => setModal({ type: 'upload-media' });
  
  // Dummy handlers for now, implementation would be complex
  const handleCreatePlaylist = () => alert("Create Playlist not implemented yet.");
  const handleUnassignScreen = () => alert("Unassign Screen not implemented yet.");

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-white">Customer Dashboard</h1>
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

      {/* Stats Summary - Remains the same */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Resource Usage</h2>
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <StatBox 
            title="Screens" 
            used={screens.length} 
            limit={userInfo?.maxScreens || 0} 
            icon={Monitor} 
          />
          <StatBox 
            title="Playlists" 
            used={playlists.length} 
            limit={userInfo?.maxPlaylists || 0} 
            icon={List} 
          />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Cloud size={16} className="text-purple-500"/> Storage
              </span>
              <span className="text-sm text-white font-mono">
                {formatBytes(storageUsed)} / {formatBytes(maxStorage)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${storagePercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{storagePercent}% used</p>
          </div>
        </div>
      </div>
      

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 py-3 px-6 text-sm font-medium transition ${
              tab === t.id
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white border-b-2 border-transparent'
            }`}
          >
            <t.icon size={18} /> 
            {t.label}
            {t.value !== null && <span className="ml-1 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs font-bold">{t.value}</span>}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {/* Screens Tab - Now uses the component that includes the refresh button wired to loadData */}
      {tab === 'screens' && (
        <ScreensList 
          screens={screens} 
          playlists={playlists} 
          loading={loading} 
          onRefresh={loadData} // The refresh function is passed and used here
          onAssignPlaylist={handleAssignPlaylist}
          onUnassignScreen={handleUnassignScreen}
        />
      )}

      {/* Playlists Tab */}
      {tab === 'playlists' && (
        <PlaylistManagement 
          playlists={playlists} 
          loading={loading}
          onRefresh={loadData}
          onViewPlaylist={handlePlaylistViewer}
          onCreatePlaylist={handleCreatePlaylist}
          // Other playlist actions...
        />
      )}

      {/* Media Tab */}
      {tab === 'media' && (
        <MediaManagement 
          media={media} 
          loading={loading} 
          onRefresh={loadData}
          onUpload={handleUploadMedia}
          // Other media actions...
        />
      )}

      {/* Modals */}
      {modal?.type === 'view-playlist' && (
        <PlaylistViewerModal 
          playlist={modal.playlist} 
          onClose={() => setModal(null)} 
        />
      )}
      {/* Other modals (assign, upload) would go here */}

    </div>
  );
}

// Helper components (StatBox, PlaylistManagement, MediaManagement)
// Defined below for completeness, assuming their logic is mostly placeholders for now

function StatBox({ title, used, limit, icon: Icon }) {
    const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
    const progressColor = percentage > 90 ? 'bg-red-500' : 'bg-green-500';

    return (
        <div className="flex-1 min-w-40">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <Icon size={16} className="text-purple-500"/> {title}
                </span>
                <span className="text-sm text-white font-mono">
                    {used} / {limit}
                </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className={`${progressColor} h-2.5 rounded-full transition-all duration-500`} 
                    style={{ width: `${Math.min(100, percentage)}%` }}
                ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{percentage}% used</p>
        </div>
    );
}

// Placeholder for Playlist Management component
function PlaylistManagement({ playlists, loading, onRefresh, onViewPlaylist, onCreatePlaylist }) {
  // Logic remains the same, but the refresh button is wired up
  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Your Playlists ({playlists.length})</h2>
        <div className="flex gap-3">
          <button
            onClick={onRefresh} 
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 transition"
            title="Refresh Playlists"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onCreatePlaylist}
            className="flex items-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <Plus size={18} /> New Playlist
          </button>
        </div>
      </div>
      
      {loading && playlists.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
            <Loader size={32} className="animate-spin mx-auto" />
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState icon={List} text="No Playlists Created" sub="Create a new playlist to group your content." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              <p className="text-sm text-gray-400">{p.items.length} items</p>
              <div className="flex justify-between pt-2 border-t border-gray-800">
                <button
                  onClick={() => onViewPlaylist(p)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  View Content
                </button>
                {/* Other actions like Edit/Delete would go here */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Placeholder for Media Management component
function MediaManagement({ media, loading, onRefresh, onUpload }) {
  // Logic remains the same, but the refresh button is wired up
  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Your Media Files ({media.length})</h2>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 transition"
            title="Refresh Media Files"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onUpload}
            className="flex items-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <Upload size={18} /> Upload Media
          </button>
        </div>
      </div>

      {loading && media.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
            <Loader size={32} className="animate-spin mx-auto" />
        </div>
      ) : media.length === 0 ? (
        <EmptyState icon={Image} text="No Media Uploaded Yet" sub="Start by uploading your images and videos." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {media.map(m => (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl group">
              <div className="h-28 bg-gray-700 flex items-center justify-center relative">
                {m.type === 'video' ? (
                  <Video size={36} className="text-gray-600" />
                ) : (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    {/* Delete button and other actions would go here */}
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-white truncate">{m.name}</p>
                <p className="text-xs text-gray-500 mt-1">{formatBytes(m.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
