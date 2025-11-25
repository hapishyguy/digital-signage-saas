'use client';

import { useState, useEffect, useCallback } from 'react';
import { Monitor, Upload, List, LogOut, Plus, Trash2, Video, Image, Loader, Users, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import Modal from './Modal';
import EmptyState from './EmptyState';

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
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs = [
    { id: 'screens', label: 'Screens', icon: Monitor },
    { id: 'playlists', label: 'Playlists', icon: List },
    { id: 'media', label: 'Media', icon: Image },
  ];

  const storagePercent = userInfo ? Math.round((userInfo.usage.storage / userInfo.limits.storage) * 100) : 0;
  const screensPercent = userInfo ? Math.round((userInfo.usage.screens / userInfo.limits.screens) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📺</span>
            <span className="font-semibold text-lg">Digital Signage</span>
          </div>
          <div className="flex items-center gap-4">
            {userInfo && (
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Screens:</span>{' '}
                  <span className={screensPercent >= 80 ? 'text-orange-400' : 'text-white'}>
                    {userInfo.usage.screens}/{userInfo.limits.screens}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Storage:</span>{' '}
                  <span className={storagePercent >= 80 ? 'text-orange-400' : 'text-white'}>
                    {formatBytes(userInfo.usage.storage)}/{formatBytes(userInfo.limits.storage)}
                  </span>
                </div>
                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs uppercase">
                  {userInfo.tier}
                </span>
              </div>
            )}
            <span className="text-gray-400 text-sm hidden sm:block">{user.email}</span>
            <button onClick={onLogout} className="p-2 hover:bg-gray-800 rounded-lg transition">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-900/50 border-b border-gray-800 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition ${
                tab === t.id ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-12">
            <Loader className="animate-spin text-purple-500 mx-auto mb-4" size={48} />
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : (
          <>
            {tab === 'screens' && (
              <ScreensTab screens={screens} playlists={playlists} userInfo={userInfo} onRefresh={loadData} setModal={setModal} />
            )}
            {tab === 'playlists' && (
              <PlaylistsTab playlists={playlists} media={media} onRefresh={loadData} setModal={setModal} />
            )}
            {tab === 'media' && (
              <MediaTab media={media} userInfo={userInfo} onRefresh={loadData} />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {modal?.type === 'pair' && <PairScreenModal onClose={() => setModal(null)} onRefresh={loadData} />}
      {modal?.type === 'createPlaylist' && <CreatePlaylistModal onClose={() => setModal(null)} onRefresh={loadData} />}
      {modal?.type === 'addMedia' && <AddMediaModal media={media} playlistId={modal.playlistId} onClose={() => setModal(null)} onRefresh={loadData} />}
      {modal?.type === 'viewPlaylist' && <ViewPlaylistModal playlist={modal.playlist} onClose={() => setModal(null)} onRefresh={loadData} />}
    </div>
  );
}

// Screens Tab Component
function ScreensTab({ screens, playlists, userInfo, onRefresh, setModal }) {
  const canAddScreen = userInfo && userInfo.usage.screens < userInfo.limits.screens;

  const handleDelete = async (id) => {
    if (confirm('Delete this screen?')) {
      try {
        await api.delete(`/api/screens/${id}`);
        onRefresh();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const handleAssignPlaylist = async (screenId, playlistId) => {
    try {
      await api.put(`/api/screens/${screenId}/playlist`, { playlistId });
      onRefresh();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Screens ({screens.length}/{userInfo?.limits.screens})</h2>
        <button
          onClick={() => canAddScreen ? setModal({ type: 'pair' }) : alert('Screen limit reached. Upgrade your plan.')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition disabled:opacity-50"
          disabled={!canAddScreen}
        >
          <Plus size={18} />
          Pair Screen
        </button>
      </div>

      {screens.length === 0 ? (
        <EmptyState icon={Monitor} text="No screens paired" sub="Click 'Pair Screen' to add your first display" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {screens.map((screen) => (
            <div key={screen.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-lg">{screen.name}</h3>
                  <p className="text-gray-500 text-sm">ID: {screen.id.slice(0, 8)}...</p>
                </div>
                <button
                  onClick={() => handleDelete(screen.id)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                  Assigned Playlist
                </label>
                <select
                  value={screen.defaultPlaylistId || ''}
                  onChange={(e) => handleAssignPlaylist(screen.id, e.target.value || null)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">No playlist</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Playlists Tab Component
function PlaylistsTab({ playlists, media, onRefresh, setModal }) {
  const handleDelete = async (id) => {
    if (confirm('Delete this playlist?')) {
      try {
        await api.delete(`/api/playlists/${id}`);
        onRefresh();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Playlists ({playlists.length})</h2>
        <button
          onClick={() => setModal({ type: 'createPlaylist' })}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
        >
          <Plus size={18} />
          Create Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <EmptyState icon={List} text="No playlists" sub="Create your first playlist" />
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <List size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium">{playlist.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModal({ type: 'addMedia', playlistId: playlist.id })}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
                >
                  Add Media
                </button>
                <button
                  onClick={() => setModal({ type: 'viewPlaylist', playlist })}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
                >
                  View
                </button>
                <button
                  onClick={() => handleDelete(playlist.id)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400 transition"
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
}

// Media Tab Component  
function MediaTab({ media, userInfo, onRefresh }) {
  const handleUpload = async (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (file.size > maxSize) {
      alert('File too large. Maximum file size is 50MB.');
      return;
    }

    try {
      const { id, uploadUrl } = await api.post('/api/media/upload-url', {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });

      await fetch(`${uploadUrl}?filename=${encodeURIComponent(file.name)}`, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Authorization': `Bearer ${api.token}`,
        },
      });

      onRefresh();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this media file?')) {
      try {
        await api.delete(`/api/media/${id}`);
        onRefresh();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const storagePercent = userInfo ? Math.round((userInfo.usage.storage / userInfo.limits.storage) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Media Library ({media.length})</h2>
          {userInfo && (
            <p className="text-sm text-gray-400 mt-1">
              {formatBytes(userInfo.usage.storage)} / {formatBytes(userInfo.limits.storage)} used
              {storagePercent >= 80 && <span className="text-orange-400 ml-2">({storagePercent}% full)</span>}
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition cursor-pointer">
          <Upload size={18} />
          Upload
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])}
          />
        </label>
      </div>

      {media.length === 0 ? (
        <EmptyState icon={Image} text="No media uploaded" sub="Upload images or videos" />
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {media.map((m) => (
            <div
              key={m.id}
              className="group relative bg-gray-900 rounded-xl border border-gray-800 overflow-hidden aspect-video"
            >
              {m.type === 'video' ? (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Video size={28} className="text-gray-600" />
                </div>
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-2 bg-red-600 hover:bg-red-500 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <p className="text-xs truncate">{m.filename}</p>
                <p className="text-xs text-gray-400">{formatBytes(m.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Modal Components (simplified versions)
function PairScreenModal({ onClose, onRefresh }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePair = async () => {
    setLoading(true);
    try {
      await api.post('/api/screens/pair', { code: code.toUpperCase(), name });
      onRefresh();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Modal title="Pair Screen" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-gray-400 text-sm">
          Enter the 6-character code shown on your display
        </p>
        <input
          placeholder="XXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-center text-3xl tracking-widest focus:outline-none focus:border-purple-500"
        />
        <input
          placeholder="Screen Name (e.g., Lobby TV)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handlePair}
          disabled={code.length !== 6 || loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? 'Pairing...' : 'Pair Screen'}
        </button>
      </div>
    </Modal>
  );
}

function CreatePlaylistModal({ onClose, onRefresh }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.post('/api/playlists', { name });
      onRefresh();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Modal title="Create Playlist" onClose={onClose}>
      <div className="space-y-4">
        <input
          placeholder="Playlist Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleCreate}
          disabled={!name || loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? 'Creating...' : 'Create Playlist'}
        </button>
      </div>
    </Modal>
  );
}

function AddMediaModal({ media, playlistId, onClose, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await api.post(`/api/playlists/${playlistId}/items`, { mediaId: selected, duration });
      onRefresh();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Modal title="Add Media to Playlist" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-auto">
          {media.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`aspect-video bg-gray-800 rounded cursor-pointer border-2 transition ${
                selected === m.id ? 'border-purple-500' : 'border-transparent hover:border-gray-600'
              }`}
            >
              {m.type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Video size={20} className="text-gray-600" />
                </div>
              ) : (
                <img src={m.url} className="w-full h-full object-cover rounded" alt="" />
              )}
            </div>
          ))}
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-2">Duration (seconds)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(+e.target.value)}
            min="1"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!selected || loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {loading ? 'Adding...' : 'Add to Playlist'}
        </button>
      </div>
    </Modal>
  );
}

function ViewPlaylistModal({ playlist, onClose, onRefresh }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/playlists/${playlist.id}`).then((data) => {
      setItems(data.items || []);
      setLoading(false);
    });
  }, [playlist.id]);

  const handleRemove = async (itemId) => {
    try {
      await api.delete(`/api/playlists/${playlist.id}/items/${itemId}`);
      setItems(items.filter((i) => i.id !== itemId));
      onRefresh();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <Modal title={playlist.name} onClose={onClose}>
      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No items in this playlist</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-auto">
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
                <p className="text-sm">{item.duration}s</p>
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
