// IMPORTANT: Update these values after deploying your Cloudflare Worker
export const API_URL = 'https://signage-saas-api.jiosignage.workers.dev';
export const INSTANTDB_APP_ID = '8e66f148-1d6e-4287-ae85-56c5d6d3ec66';

// Default limits for free tier
export const DEFAULT_LIMITS = {
  screens: 5,
  playlists: 5,
  storage: 500 * 1024 * 1024, // 500MB
  fileSize: 50 * 1024 * 1024,  // 50MB
};

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
