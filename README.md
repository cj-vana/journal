# Baby Journal

A self-hosted baby journal web app for writing journal entries, tracking milestones, recording growth, and creating a lasting digital keepsake.

## Features

- Rich text journal entries with photos and audio
- Milestone tracking with visual timeline
- Growth charts (height, weight, head circumference)
- Daily writing prompts
- Multi-user support with invite codes
- PDF book export (scrapbook style)
- ZIP data export for backup
- Warm, personal "storybook" aesthetic

## Quick Start

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Run with Docker
docker compose up -d
```

The app will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `AUTH_SECRET` | Session encryption key (generate with `openssl rand -base64 32`) | Yes |
| `ADMIN_EMAIL` | Initial admin email | Yes |
| `ADMIN_PASSWORD` | Initial admin password | Yes |
| `AUTH_URL` | Public URL of the app | Yes |
| `ENABLE_DEBUG_PROFILE` | Enable debug endpoints (never in production) | No |
| `DEBUG_KEY` | Key for debug API access | No |

## Development

```bash
npm install
npx prisma migrate dev
npm run dev
```

## Data

All data is stored in a Docker volume (`journal-data`):
- SQLite database at `/data/db/journal.db`
- Uploaded media at `/data/uploads/`

Use the ZIP export feature to back up all data.
