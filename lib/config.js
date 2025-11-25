// IMPORTANT: Update these values after deploying your Cloudflare Worker
export const API_URL = 'https://your-worker.your-subdomain.workers.dev';
export const INSTANTDB_APP_ID = 'your-instantdb-app-id';

// Default limits for free tier
export const DEFAULT_LIMITS = {
  screens: 5,
  playlists: 5,
  storage: 500 * 1024 * 1024, // 500MB
  fileSize: 50 * 1024 * 1024,  // 50MB
};

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
