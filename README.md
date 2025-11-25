# Digital Signage SaaS Platform

Multi-tenant digital signage platform for managing content on Firestick displays.

## Features

- 🎯 Multi-tenant architecture
- 📺 Firestick display support with offline caching
- 👥 Screen groups and scheduling
- 📊 Super admin dashboard with customer management
- 💾 Quota management (screens, playlists, storage)
- ⚡ Real-time updates via InstantDB
- 🔒 Secure authentication and data isolation

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Cloudflare Workers
- **Database**: InstantDB (realtime)
- **Storage**: Cloudflare R2
- **Hosting**: Vercel (frontend) + Cloudflare (backend)

## Setup

See `SETUP_INSTRUCTIONS.md` for complete deployment guide.

## Quick Start

1. Deploy Cloudflare Worker (backend API)
2. Update `lib/config.js` with your API URL and InstantDB App ID
3. Deploy to Vercel
4. Visit your URL and complete setup wizard
5. Create your super admin account

## Default Free Tier Limits

- 5 screens per customer
- 5 playlists per customer
- 500MB storage per customer
- 50MB max file size

Limits can be adjusted per customer from super admin dashboard.

## Project Structure

```
├── app/                    # Next.js app router
│   ├── page.js            # Main entry (setup/auth routing)
│   ├── dashboard/         # Customer dashboard
│   ├── player/            # Firestick display app
│   └── admin/super/       # Super admin panel
├── components/            # React components
├── lib/                   # Utilities and API client
└── public/                # Static assets
```

## License

Proprietary - All rights reserved
