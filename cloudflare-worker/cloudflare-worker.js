// Digital Signage Backend v2 - Cloudflare Worker
// Now with InstantDB integration, scheduling, and screen groups

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '');
  const body = `${enc(header)}.${enc({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '')}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, payload, sig] = token.split('.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(sig), c => c.charCodeAt(0)), new TextEncoder().encode(`${header}.${payload}`));
    if (!valid) return null;
    const data = JSON.parse(atob(payload));
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

async function authenticate(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyJWT(auth.slice(7), env.JWT_SECRET);
}

// InstantDB Admin API helper
async function instantDB(env, action, data) {
  const res = await fetch('https://api.instantdb.com/admin/transact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.INSTANTDB_ADMIN_TOKEN}` },
    body: JSON.stringify({ 'app-id': env.INSTANTDB_APP_ID, ...data })
  });
  return res.json();
}

async function instantQuery(env, query) {
  const res = await fetch('https://api.instantdb.com/admin/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.INSTANTDB_ADMIN_TOKEN}` },
    body: JSON.stringify({ 'app-id': env.INSTANTDB_APP_ID, query })
  });
  return res.json();
}

// Get active playlist based on schedule
function getActivePlaylist(screen, schedules, now = new Date()) {
  if (!schedules?.length) return screen.defaultPlaylistId;
  
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Find matching schedule (priority order)
  const activeSchedule = schedules
    .filter(s => s.screenId === screen.id || s.groupId === screen.groupId)
    .filter(s => {
      const days = JSON.parse(s.days || '[]');
      if (!days.includes(dayOfWeek)) return false;
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      return currentMinutes >= start && currentMinutes < end;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
  
  return activeSchedule?.playlistId || screen.defaultPlaylistId;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // === AUTH ROUTES ===
      if (path === '/api/auth/register' && method === 'POST') {
        const { email, password, name } = await request.json();
        const id = crypto.randomUUID();
        const hashedPw = await hashPassword(password);
        
        // Store in InstantDB
        await instantDB(env, 'transact', {
          steps: [['update', 'users', id, { email, password: hashedPw, name, createdAt: Date.now() }]]
        });
        
        const token = await createJWT({ userId: id, email }, env.JWT_SECRET);
        return json({ token, user: { id, email, name } });
      }

      if (path === '/api/auth/login' && method === 'POST') {
        const { email, password } = await request.json();
        const { users } = await instantQuery(env, { users: { $: { where: { email } } } });
        const user = users?.[0];
        
        if (!user || user.password !== await hashPassword(password)) {
          return json({ error: 'Invalid credentials' }, 401);
        }
        
        const token = await createJWT({ userId: user.id, email }, env.JWT_SECRET);
        return json({ token, user: { id: user.id, email: user.email, name: user.name } });
      }

      // === SCREEN ROUTES (No auth - for display devices) ===
      if (path === '/api/screens/register' && method === 'POST') {
        const id = crypto.randomUUID();
        const code = generateCode();
        const token = crypto.randomUUID();
        const expiresAt = Date.now() + 15 * 60 * 1000;
        
        await instantDB(env, 'transact', {
          steps: [['update', 'screens', id, { 
            pairingCode: code, 
            screenToken: token, 
            codeExpiresAt: expiresAt,
            paired: false,
            createdAt: Date.now()
          }]]
        });
        
        return json({ screenId: id, pairingCode: code, screenToken: token, expiresAt });
      }

      if (path === '/api/screens/status' && method === 'GET') {
        const token = url.searchParams.get('token');
        const { screens } = await instantQuery(env, { 
          screens: { $: { where: { screenToken: token } } }
        });
        const screen = screens?.[0];
        if (!screen) return json({ error: 'Screen not found' }, 404);

        // Regenerate expired code
        if (!screen.userId && Date.now() > screen.codeExpiresAt) {
          const newCode = generateCode();
          const newExpires = Date.now() + 15 * 60 * 1000;
          await instantDB(env, 'transact', {
            steps: [['update', 'screens', screen.id, { pairingCode: newCode, codeExpiresAt: newExpires }]]
          });
          screen.pairingCode = newCode;
          screen.codeExpiresAt = newExpires;
        }

        // Get schedules for this screen
        let activePlaylistId = screen.defaultPlaylistId;
        if (screen.userId) {
          const { schedules } = await instantQuery(env, {
            schedules: { $: { where: { or: [{ screenId: screen.id }, { groupId: screen.groupId }] } } }
          });
          activePlaylistId = getActivePlaylist(screen, schedules || []);
        }

        // Get playlist items
        let playlist = null;
        if (activePlaylistId) {
          const { playlists } = await instantQuery(env, { 
            playlists: { $: { where: { id: activePlaylistId } } }
          });
          const { playlistItems } = await instantQuery(env, {
            playlistItems: { $: { where: { playlistId: activePlaylistId } } }
          });
          if (playlists?.[0]) {
            playlist = { 
              ...playlists[0], 
              items: (playlistItems || []).sort((a, b) => a.sortOrder - b.sortOrder)
            };
          }
        }

        return json({
          id: screen.id,
          paired: !!screen.userId,
          pairingCode: screen.pairingCode,
          name: screen.name,
          groupId: screen.groupId,
          groupName: screen.groupName,
          playlist,
          activePlaylistId
        });
      }

      // === AUTHENTICATED ROUTES ===
      const user = await authenticate(request, env);
      if (!user) return json({ error: 'Unauthorized' }, 401);

      // --- Screen Management ---
      if (path === '/api/screens/pair' && method === 'POST') {
        const { code, name } = await request.json();
        const { screens } = await instantQuery(env, { 
          screens: { $: { where: { pairingCode: code.toUpperCase(), paired: false } } }
        });
        const screen = screens?.[0];
        
        if (!screen) return json({ error: 'Invalid code' }, 400);
        if (Date.now() > screen.codeExpiresAt) return json({ error: 'Code expired' }, 400);
        
        await instantDB(env, 'transact', {
          steps: [['update', 'screens', screen.id, { 
            userId: user.userId, 
            name: name || 'My Screen', 
            paired: true,
            pairedAt: Date.now() 
          }]]
        });
        
        return json({ success: true, screenId: screen.id });
      }

      if (path === '/api/screens' && method === 'GET') {
        const { screens } = await instantQuery(env, { 
          screens: { $: { where: { userId: user.userId } } }
        });
        return json(screens || []);
      }

      if (path.match(/^\/api\/screens\/[\w-]+\/playlist$/) && method === 'PUT') {
        const screenId = path.split('/')[3];
        const { playlistId } = await request.json();
        await instantDB(env, 'transact', {
          steps: [['update', 'screens', screenId, { defaultPlaylistId: playlistId, updatedAt: Date.now() }]]
        });
        return json({ success: true });
      }

      if (path.match(/^\/api\/screens\/[\w-]+\/group$/) && method === 'PUT') {
        const screenId = path.split('/')[3];
        const { groupId } = await request.json();
        
        let groupName = null;
        if (groupId) {
          const { groups } = await instantQuery(env, { groups: { $: { where: { id: groupId } } } });
          groupName = groups?.[0]?.name;
        }
        
        await instantDB(env, 'transact', {
          steps: [['update', 'screens', screenId, { groupId, groupName, updatedAt: Date.now() }]]
        });
        return json({ success: true });
      }

      if (path.match(/^\/api\/screens\/[\w-]+$/) && method === 'DELETE') {
        const screenId = path.split('/')[3];
        await instantDB(env, 'transact', { steps: [['delete', 'screens', screenId]] });
        return json({ success: true });
      }

      // --- Screen Groups ---
      if (path === '/api/groups' && method === 'GET') {
        const { groups } = await instantQuery(env, { groups: { $: { where: { userId: user.userId } } } });
        return json(groups || []);
      }

      if (path === '/api/groups' && method === 'POST') {
        const { name, description } = await request.json();
        const id = crypto.randomUUID();
        await instantDB(env, 'transact', {
          steps: [['update', 'groups', id, { userId: user.userId, name, description, createdAt: Date.now() }]]
        });
        return json({ id, name, description });
      }

      if (path.match(/^\/api\/groups\/[\w-]+$/) && method === 'PUT') {
        const groupId = path.split('/')[3];
        const { name, description } = await request.json();
        await instantDB(env, 'transact', {
          steps: [['update', 'groups', groupId, { name, description, updatedAt: Date.now() }]]
        });
        // Update group name on all screens
        const { screens } = await instantQuery(env, { screens: { $: { where: { groupId } } } });
        if (screens?.length) {
          const updates = screens.map(s => ['update', 'screens', s.id, { groupName: name }]);
          await instantDB(env, 'transact', { steps: updates });
        }
        return json({ success: true });
      }

      if (path.match(/^\/api\/groups\/[\w-]+$/) && method === 'DELETE') {
        const groupId = path.split('/')[3];
        // Remove group from screens
        const { screens } = await instantQuery(env, { screens: { $: { where: { groupId } } } });
        const updates = (screens || []).map(s => ['update', 'screens', s.id, { groupId: null, groupName: null }]);
        await instantDB(env, 'transact', { steps: [...updates, ['delete', 'groups', groupId]] });
        return json({ success: true });
      }

      // --- Schedules ---
      if (path === '/api/schedules' && method === 'GET') {
        const { schedules } = await instantQuery(env, { schedules: { $: { where: { userId: user.userId } } } });
        return json(schedules || []);
      }

      if (path === '/api/schedules' && method === 'POST') {
        const { name, playlistId, screenId, groupId, days, startTime, endTime, priority } = await request.json();
        const id = crypto.randomUUID();
        await instantDB(env, 'transact', {
          steps: [['update', 'schedules', id, {
            userId: user.userId, name, playlistId, screenId, groupId,
            days: JSON.stringify(days), startTime, endTime, priority: priority || 0,
            createdAt: Date.now()
          }]]
        });
        return json({ id, name, playlistId, screenId, groupId, days, startTime, endTime, priority });
      }

      if (path.match(/^\/api\/schedules\/[\w-]+$/) && method === 'PUT') {
        const scheduleId = path.split('/')[3];
        const { name, playlistId, screenId, groupId, days, startTime, endTime, priority } = await request.json();
        await instantDB(env, 'transact', {
          steps: [['update', 'schedules', scheduleId, {
            name, playlistId, screenId, groupId,
            days: JSON.stringify(days), startTime, endTime, priority: priority || 0,
            updatedAt: Date.now()
          }]]
        });
        return json({ success: true });
      }

      if (path.match(/^\/api\/schedules\/[\w-]+$/) && method === 'DELETE') {
        const scheduleId = path.split('/')[3];
        await instantDB(env, 'transact', { steps: [['delete', 'schedules', scheduleId]] });
        return json({ success: true });
      }

      // --- Playlists ---
      if (path === '/api/playlists' && method === 'GET') {
        const { playlists } = await instantQuery(env, { playlists: { $: { where: { userId: user.userId } } } });
        return json(playlists || []);
      }

      if (path === '/api/playlists' && method === 'POST') {
        const { name } = await request.json();
        const id = crypto.randomUUID();
        await instantDB(env, 'transact', {
          steps: [['update', 'playlists', id, { userId: user.userId, name, createdAt: Date.now() }]]
        });
        return json({ id, name });
      }

      if (path.match(/^\/api\/playlists\/[\w-]+$/) && method === 'GET') {
        const playlistId = path.split('/')[3];
        const { playlists } = await instantQuery(env, { playlists: { $: { where: { id: playlistId } } } });
        const { playlistItems } = await instantQuery(env, { playlistItems: { $: { where: { playlistId } } } });
        if (!playlists?.[0]) return json({ error: 'Not found' }, 404);
        return json({ ...playlists[0], items: (playlistItems || []).sort((a, b) => a.sortOrder - b.sortOrder) });
      }

      if (path.match(/^\/api\/playlists\/[\w-]+$/) && method === 'DELETE') {
        const playlistId = path.split('/')[3];
        const { playlistItems } = await instantQuery(env, { playlistItems: { $: { where: { playlistId } } } });
        const deletes = (playlistItems || []).map(i => ['delete', 'playlistItems', i.id]);
        await instantDB(env, 'transact', { steps: [...deletes, ['delete', 'playlists', playlistId]] });
        return json({ success: true });
      }

      if (path.match(/^\/api\/playlists\/[\w-]+\/items$/) && method === 'POST') {
        const playlistId = path.split('/')[3];
        const { mediaId, duration } = await request.json();
        
        const { media } = await instantQuery(env, { media: { $: { where: { id: mediaId } } } });
        if (!media?.[0]) return json({ error: 'Media not found' }, 404);
        
        const { playlistItems } = await instantQuery(env, { playlistItems: { $: { where: { playlistId } } } });
        const sortOrder = (playlistItems?.length || 0) + 1;
        
        const id = crypto.randomUUID();
        await instantDB(env, 'transact', {
          steps: [['update', 'playlistItems', id, {
            playlistId, mediaId, mediaUrl: media[0].url, mediaType: media[0].type,
            duration: duration || 10, sortOrder, createdAt: Date.now()
          }]]
        });
        
        return json({ id, mediaId, mediaUrl: media[0].url, mediaType: media[0].type, duration: duration || 10 });
      }

      if (path.match(/^\/api\/playlists\/[\w-]+\/items\/[\w-]+$/) && method === 'DELETE') {
        const itemId = path.split('/')[5];
        await instantDB(env, 'transact', { steps: [['delete', 'playlistItems', itemId]] });
        return json({ success: true });
      }

      // --- Media ---
      if (path === '/api/media' && method === 'GET') {
        const { media } = await instantQuery(env, { media: { $: { where: { userId: user.userId } } } });
        return json(media || []);
      }

      if (path === '/api/media/upload-url' && method === 'POST') {
        const { filename, contentType } = await request.json();
        const id = crypto.randomUUID();
        return json({ id, uploadUrl: `${url.origin}/api/media/upload/${id}`, filename, contentType });
      }

      if (path.match(/^\/api\/media\/upload\/[\w-]+$/) && method === 'PUT') {
        const mediaId = path.split('/')[4];
        const contentType = request.headers.get('Content-Type');
        const filename = url.searchParams.get('filename') || 'file';
        const key = `${user.userId}/${mediaId}/${filename}`;
        
        await env.R2_BUCKET.put(key, request.body, { httpMetadata: { contentType } });
        
        const mediaUrl = `${url.origin}/api/media/file/${key}`;
        const type = contentType.startsWith('video') ? 'video' : 'image';
        
        await instantDB(env, 'transact', {
          steps: [['update', 'media', mediaId, {
            userId: user.userId, filename, type, url: mediaUrl, r2Key: key, createdAt: Date.now()
          }]]
        });
        
        return json({ id: mediaId, url: mediaUrl, type });
      }

      if (path.startsWith('/api/media/file/')) {
        const key = path.replace('/api/media/file/', '');
        const object = await env.R2_BUCKET.get(key);
        if (!object) return new Response('Not found', { status: 404 });
        return new Response(object.body, {
          headers: { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000', ...CORS_HEADERS }
        });
      }

      if (path.match(/^\/api\/media\/[\w-]+$/) && method === 'DELETE') {
        const mediaId = path.split('/')[3];
        const { media } = await instantQuery(env, { media: { $: { where: { id: mediaId } } } });
        if (media?.[0]) {
          await env.R2_BUCKET.delete(media[0].r2Key);
          await instantDB(env, 'transact', { steps: [['delete', 'media', mediaId]] });
        }
        return json({ success: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: err.message }, 500);
    }
  }
};

/*
=== wrangler.toml ===

name = "digital-signage-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "signage-media"

[vars]
JWT_SECRET = "your-secret-key-change-this"
INSTANTDB_APP_ID = "your-instantdb-app-id"
INSTANTDB_ADMIN_TOKEN = "your-instantdb-admin-token"
*/
