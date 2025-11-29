'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Upload, 
  List, 
  LogOut, 
  Plus, 
  Trash2, 
  Video, 
  Image, 
  Loader, 
  Users, 
  Calendar,
  RefreshCw // <-- ADDED
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import Modal from './Modal';
import EmptyState from './EmptyState';

// --- Sub-component for managing media uploads and list ---
function MediaManager({ media, userInfo, loadData, setLoading, setModal }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const maxFileSizeMB = 50; // Hardcoded from DEFAULT_LIMITS.fileSize (50MB)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > maxFileSizeMB * 1024 * 1024) {
        alert(`File size exceeds the limit of ${maxFileSizeMB}MB.`); // Use alert temporarily for a quick warning
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    // Check storage limits before upload
    if (userInfo.storageUsed >= userInfo.maxStorage) {
      setModal({
        title: "Storage Limit Exceeded",
        content: `You have used ${formatBytes(userInfo.storageUsed)} of your ${formatBytes(userInfo.maxStorage)} storage limit. Delete some files or contact support to upgrade.`,
      });
      return;
    }

    setUploading(true);
    setLoading(true); // Show main dashboard loader
    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.upload('/api/media/upload', formData); // Assuming api.js has an upload method
      setFile(null);
      await loadData(); // Reload all data
    } catch (err) {
      console.error('Upload error:', err);
      // setModal({ title: "Upload Error", content: err.message || "Failed to upload media file." });
    }
    setUploading(false);
    setLoading(false);
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this media item? This cannot be undone.')) return;

    setLoading(true);
    try {
      await api.delete(`/api/media/${mediaId}`);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
    setLoading(false);
  };
  
  // Custom upload method in api.js (simulated)
  api.upload = (path, body) => {
    const headers = {
      // NOTE: DO NOT set 'Content-Type' for FormData, the browser handles it automatically!
      Authorization: `Bearer ${api.token}`,
    };
    return api.request(path, {
      method: 'POST',
      body: body,
      headers: headers,
      // No JSON.stringify for FormData
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-semibold mb-4">Upload New Media</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 transition cursor-pointer"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading || !userInfo || userInfo.storageUsed >= userInfo.maxStorage}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium text-white transition disabled:opacity-50 flex-shrink-0"
          >
            {uploading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>
        {userInfo && (
          <p className="text-xs text-gray-500 mt-3">
            File Limit: {formatBytes(userInfo.fileSize)} | Storage Used: {formatBytes(userInfo.storageUsed)} / {formatBytes(userInfo.maxStorage)}
          </p>
        )}
      </div>

      <h2 className="text-2xl font-semibold">Your Media Files ({media.length})</h2>

      {media.length === 0 ? (
        <EmptyState 
          icon={Video} 
          text="No media uploaded yet." 
          sub="Upload an image or video file to get started." 
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {media.map(m => (
            <div key={m.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-lg">
              <div className="relative w-full h-32 bg-gray-800 flex items-center justify-center">
                {m.type === 'video' ? (
                  <Video size={36} className="text-purple-500" />
                ) : (
                  <img src={m.url} alt={m.r2Key} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 text-xs bg-black/50 text-white rounded-full">
                  {m.type}
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-white truncate">{m.r2Key.split('/').pop()}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">{formatBytes(m.size)}</span>
                  <button onClick={() => handleDelete(m.id)} className="p-1 text-red-400 hover:text-red-300 transition" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// --- Sub-component for displaying playlist items in a modal ---
function PlaylistItemsModal({ playlist, media, onSave, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch the full details of media items in the playlist
  const fetchPlaylistItems = useCallback(async () => {
    if (playlist.items && playlist.items.length > 0) {
      try {
        const itemDetails = await Promise.all(
          playlist.items.map(async (item) => {
            // Find the corresponding media object locally
            const mediaItem = media.find(m => m.id === item.mediaId);
            return {
              ...item,
              mediaUrl: mediaItem ? mediaItem.url : 'placeholder',
              mediaType: mediaItem ? mediaItem.type : 'unknown',
            };
          })
        );
        setItems(itemDetails);
      } catch (error) {
        console.error("Error fetching playlist item details:", error);
      }
    }
    setLoading(false);
  }, [playlist.items, media]);

  useEffect(() => {
    fetchPlaylistItems();
  }, [fetchPlaylistItems]);

  const handleRemove = (itemId) => {
    const newItems = items.filter(item => item.id !== itemId);
    setItems(newItems);
  };

  const handleSave = () => {
    // Only save the necessary structure: [{mediaId, duration}]
    const itemsToSave = items.map(item => ({
      mediaId: item.mediaId,
      duration: item.duration,
    }));
    onSave(playlist.id, itemsToSave);
    onClose();
  };

  return (
    <Modal title={`Items in: ${playlist.name}`} onClose={onClose} size="lg">
      <div className="flex space-x-6">
        {/* Item List */}
        <div className="flex-1">
          <h4 className="text-lg font-medium text-white mb-3">Current Sequence</h4>
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No items in this playlist. Use the manager to add media.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto pr-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-2">
                  <span className="text-gray-500 w-6 text-center text-sm">{idx + 1}</span>
                  <div className="w-16 h-10 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                    {item.mediaType === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={16} className="text-gray-600" />
                      </div>
                    ) : (
                      <img src={item.mediaUrl} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.mediaType === 'video' ? 'Video' : 'Image'} ({item.mediaId.substring(0, 4)}...)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={item.duration}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value) || 1;
                        setItems(items.map(i => i.id === item.id ? { ...i, duration: newDuration } : i));
                      }}
                      className="w-16 p-1 bg-gray-700 border border-gray-600 rounded text-center text-sm"
                    />
                    <span className="text-gray-400 text-sm">s</span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1 hover:bg-red-900 rounded text-red-400 transition"
                      title="Remove from playlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media Selector */}
        <div className="w-72 border-l border-gray-800 pl-6">
          <h4 className="text-lg font-medium text-white mb-3">Add Media</h4>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
            {media.length === 0 ? (
              <p className="text-gray-500 text-sm">No media available to add.</p>
            ) : (
              media.map(m => (
                <div 
                  key={m.id} 
                  className="flex items-center gap-3 bg-gray-800 rounded-lg p-2 cursor-pointer hover:bg-gray-700 transition"
                  onClick={() => {
                    const newItem = {
                      id: `temp-${Date.now()}-${Math.random()}`, // Use temp ID for local state
                      mediaId: m.id,
                      duration: m.type === 'video' ? 1 : 10, // Default duration
                      mediaUrl: m.url,
                      mediaType: m.type,
                    };
                    setItems([...items, newItem]);
                  }}
                  title={`Add ${m.type}`}
                >
                  {m.type === 'video' ? <Video size={16} className="text-purple-400 flex-shrink-0" /> : <Image size={16} className="text-purple-400 flex-shrink-0" />}
                  <p className="text-sm truncate">{m.r2Key.split('/').pop()}</p>
                  <Plus size={16} className="text-green-400 ml-auto flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium text-white transition disabled:opacity-50"
        >
          Save Playlist
        </button>
      </div>
    </Modal>
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

  // Function to load all customer data
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
      // setModal({ title: "Connection Error", content: "Failed to load dashboard data. Please check your network connection." });
    }
    setLoading(false);
  }, []);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // General Modal closer
  const closeModal = () => {
    setModal(null);
  };


  // Handlers for screens
  const handleUnpairScreen = async (screenId) => {
    if (!window.confirm('Are you sure you want to unpair this screen?')) return;
    setLoading(true);
    try {
      await api.delete(`/api/screens/${screenId}`);
      await loadData();
    } catch (err) {
      console.error('Unpair error:', err);
    }
    setLoading(false);
  };
  
  const handleUpdateScreenPlaylist = async (screenId, playlistId) => {
    setLoading(true);
    try {
      await api.put(`/api/screens/${screenId}/playlist`, { playlistId });
      await loadData();
    } catch (err) {
      console.error('Update screen playlist error:', err);
    }
    setLoading(false);
  };

  // Handlers for playlists
  const handleCreatePlaylist = async (name) => {
    if (playlists.length >= userInfo.maxPlaylists) {
      setModal({
        title: "Playlist Limit Exceeded",
        content: `You have reached your limit of ${userInfo.maxPlaylists} playlists. Delete an existing one or contact support to upgrade.`,
      });
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/playlists', { name });
      await loadData();
    } catch (err) {
      console.error('Create playlist error:', err);
    }
    setLoading(false);
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm('Deleting a playlist is permanent and will unassign it from any screens. Continue?')) return;
    setLoading(true);
    try {
      await api.delete(`/api/playlists/${playlistId}`);
      await loadData();
    } catch (err) {
      console.error('Delete playlist error:', err);
    }
    setLoading(false);
  };

  const handleSavePlaylist = async (playlistId, items) => {
    setLoading(true);
    try {
      await api.put(`/api/playlists/${playlistId}/items`, { items });
      await loadData();
    } catch (err) {
      console.error('Save playlist items error:', err);
    }
    setLoading(false);
  };


  const tabs = [
    { id: 'screens', label: 'Screens', icon: Monitor },
    { id: 'playlists', label: 'Playlists', icon: List },
    { id: 'media', label: 'Media', icon: Upload },
  ];


  // --- Sub-component for displaying screens ---
  const ScreenManager = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Your Screens ({screens.length} / {userInfo?.maxScreens})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens.map(screen => (
            <div key={screen.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-lg">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-white mb-2">{screen.name || `Screen ${screen.pairingCode}`}</h3>
                <div className={`p-1 rounded-full ${screen.online ? 'bg-green-500' : 'bg-red-500'}`} title={screen.online ? 'Online' : 'Offline'}></div>
              </div>
              <p className="text-sm text-gray-500 mb-4">Code: {screen.pairingCode}</p>
              
              <div className="space-y-3">
                {/* Playlist Assignment */}
                <div>
                  <label htmlFor={`playlist-${screen.id}`} className="block text-xs font-medium text-gray-400 mb-1">Assigned Playlist</label>
                  <select
                    id={`playlist-${screen.id}`}
                    value={screen.playlistId || ''}
                    onChange={(e) => handleUpdateScreenPlaylist(screen.id, e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition"
                  >
                    <option value="">-- Unassigned --</option>
                    {playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Last Check-in */}
                <div className="text-xs text-gray-500">
                  Last Check-in: {screen.lastCheckin ? new Date(screen.lastCheckin).toLocaleString() : 'Never'}
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleUnpairScreen(screen.id)}
                  className="w-full mt-3 py-2 text-sm text-red-400 border border-red-700/50 hover:bg-red-900/20 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Unpair Screen
                </button>
              </div>
            </div>
          ))}
          
          {screens.length < userInfo?.maxScreens && (
            <div className="bg-gray-900/30 rounded-xl p-5 border border-dashed border-gray-700 flex flex-col items-center justify-center text-center">
              <Monitor size={36} className="text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">Add a new screen</p>
              <p className="text-sm text-gray-500 mt-1">Visit your player device to see the pairing code.</p>
            </div>
          )}
          {screens.length >= userInfo?.maxScreens && (
             <div className="bg-gray-900/30 rounded-xl p-5 border border-dashed border-red-700/50 flex flex-col items-center justify-center text-center">
                <Users size={36} className="text-red-500 mb-3" />
                <p className="text-red-400 font-medium">Screen Limit Reached</p>
                <p className="text-sm text-gray-500 mt-1">You must upgrade to add more screens.</p>
            </div>
          )}
        </div>
      </div>
    );
  };


  // --- Sub-component for displaying playlists ---
  const PlaylistManager = () => {
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const onCreate = () => {
      if (newPlaylistName.trim()) {
        handleCreatePlaylist(newPlaylistName.trim());
        setNewPlaylistName('');
      }
    };

    return (
      <div className="space-y-6">
        {/* Create New Playlist */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-semibold mb-4">Create New Playlist</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Playlist name (e.g., 'Lobby Slideshow')"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
              className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
            />
            <button
              onClick={onCreate}
              disabled={!newPlaylistName.trim() || playlists.length >= userInfo?.maxPlaylists}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium text-white transition disabled:opacity-50 flex-shrink-0"
            >
              <Plus size={20} /> Create ({playlists.length} / {userInfo?.maxPlaylists})
            </button>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold">Your Playlists ({playlists.length})</h2>

        {playlists.length === 0 ? (
          <EmptyState 
            icon={List} 
            text="No playlists created yet." 
            sub="Create a playlist to sequence your media files." 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map(p => (
              <div key={p.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-lg">
                <h3 className="text-xl font-bold text-white truncate mb-1">{p.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{p.items?.length || 0} items</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal({
                      type: 'playlistItems',
                      data: p
                    })}
                    className="flex-1 py-2 text-sm text-purple-400 border border-purple-700/50 hover:bg-purple-900/20 rounded-lg transition"
                  >
                    Manage Items
                  </button>
                  <button
                    onClick={() => handleDeletePlaylist(p.id)}
                    className="py-2 px-4 text-sm text-red-400 border border-red-700/50 hover:bg-red-900/20 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading && !userInfo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-purple-500 mx-auto mb-4" size={48} />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // --- Main Dashboard Render ---
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-10 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-purple-400">
          Digital Signage Dashboard
        </h1>
        <div className="text-sm text-gray-400 flex items-center gap-4">
          <span>{user.email}</span>
          <button onClick={onLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition text-sm">
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </header>

      {/* User Info and Stats (Horizontal Cards) */}
      {userInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Screens" value={`${screens.length} / ${userInfo.maxScreens}`} icon={Monitor} />
          <StatCard title="Playlists" value={`${playlists.length} / ${userInfo.maxPlaylists}`} icon={List} />
          <StatCard title="Storage" value={`${formatBytes(userInfo.storageUsed)} / ${formatBytes(userInfo.maxStorage)}`} icon={Cloud} />
          <StatCard title="Last Login" value={new Date(userInfo.lastLogin).toLocaleDateString()} icon={Calendar} sub={new Date(userInfo.lastLogin).toLocaleTimeString()} />
        </div>
      )}

      {/* Tabs and Refresh Button - Modified to use justify-between */}
      <div className="flex justify-between items-end border-b border-gray-800 mb-6">
        {/* Tabs Grouped on the Left */}
        <div className="flex items-center">
          {tabs.map(t => (
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
        
        {/* Refresh Button - Pushed to the far right */}
        <button 
          onClick={loadData} // Calls the function to re-fetch data
          disabled={loading} // Disables while loading
          className={`p-2 rounded-lg transition text-gray-400 hover:bg-gray-700 hover:text-white ${loading ? 'animate-spin' : ''}`}
          title="Refresh Data"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      {loading && (
        <div className="text-center py-12">
          <Loader className="animate-spin text-purple-500 mx-auto" size={48} />
          <p className="text-gray-400 mt-4">Updating data...</p>
        </div>
      )}
      {!loading && tab === 'screens' && <ScreenManager />}
      {!loading && tab === 'playlists' && <PlaylistManager />}
      {!loading && tab === 'media' && <MediaManager media={media} userInfo={userInfo} loadData={loadData} setLoading={setLoading} setModal={setModal} />}

      {/* General Purpose Modal */}
      {modal && modal.type !== 'playlistItems' && (
        <Modal title={modal.title} onClose={closeModal}>
          <p className="text-gray-400">{modal.content}</p>
        </Modal>
      )}

      {/* Playlist Items Modal */}
      {modal && modal.type === 'playlistItems' && (
        <PlaylistItemsModal 
          playlist={modal.data} 
          media={media} 
          onSave={handleSavePlaylist} 
          onClose={closeModal} 
        />
      )}
    </div>
  );
}

// Helper Card Component (Reused from SuperAdminDashboard design pattern)
function StatCard({ title, value, icon: Icon, sub }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
            <Icon size={24} className="text-purple-500 mb-3" />
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
        </div>
    );
}
