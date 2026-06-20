# Baby Journal

A self-hosted baby journal web application for families to write journal entries, track milestones, record growth, and create a lasting digital keepsake — all with a warm, personal "storybook" aesthetic.

Built with Next.js, SQLite, and Docker for easy self-hosting.

## Features

- **Rich text journal entries** — Photos, audio recordings, formatting, and tags via a Tiptap editor
- **Milestone tracking** — Categorized milestones (first steps, first words, etc.) with a visual timeline
- **Growth charts** — Height, weight, and head circumference with interactive Recharts graphs
- **Daily writing prompts** — Pre-seeded prompts to inspire entries, shown on the dashboard
- **Multi-user support** — Admin-generated invite codes let family members join with their own accounts
- **PDF book export** — Generates a scrapbook-style PDF with cover page, table of contents by year/month, and all entries, milestones, and growth data
- **ZIP data export** — Full backup of the database, media files, and settings as a downloadable archive
- **Gender-based color themes** — Girl (rose), Boy (sky), or Neutral (sage) palettes that apply across the entire UI and PDF exports
- **Baby shower guestbook** — Optional shower mode lets guests submit wishes with a shared code, then admins can promote messages into journal entries
- **Setup wizard** — Guided first-run experience that creates the admin account and configures the journal
- **Mobile-friendly** — Responsive sidebar layout that works on desktop and mobile

## Quick Start

### Docker (recommended)

The easiest way to run Baby Journal — pulls a pre-built image from GitHub Container Registry:

```bash
# 1. Generate a secret key
AUTH_SECRET=$(openssl rand -base64 32)

# 2. Start the app
AUTH_SECRET="$AUTH_SECRET" docker compose up -d
```

That's it! Open `http://localhost:3000` and complete the setup wizard.

> **Behind a reverse proxy?** Set `AUTH_URL` to your public URL:
> ```bash
> AUTH_SECRET="..." AUTH_URL="https://journal.example.com" docker compose up -d
> ```

### Automated Setup (Docker)

To skip the setup wizard (useful for CI/CD or scripted deployments), pass `ADMIN_EMAIL` and `ADMIN_PASSWORD`:

```bash
AUTH_SECRET=$(openssl rand -base64 32) \
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD=your-secure-password \
docker compose up -d
```

### Development (building from source)

Developers who clone the repo should use the dev compose file:

```bash
git clone https://github.com/cj-vana/journal.git
cd journal
cp .env.example .env    # edit .env — set AUTH_SECRET at minimum
docker compose -f docker-compose.dev.yml up --build
```

## Environment Variables

| Variable | Description | Required | Default |
|---|---|---|---|
| `AUTH_SECRET` | Session encryption key (`openssl rand -base64 32`) | Yes | — |
| `AUTH_URL` | Public URL of the app | Yes | — |
| `DATABASE_URL` | SQLite database path | No | `file:./data/db/journal.db` |
| `UPLOAD_DIR` | Directory for uploaded media | No | `./data/uploads` |
| `MAX_UPLOAD_SIZE_MB` | Max file upload size | No | `20` |
| `ADMIN_EMAIL` | Initial admin email (skips setup wizard) | No | — |
| `ADMIN_PASSWORD` | Initial admin password (skips setup wizard) | No | — |
| `ENABLE_DEBUG_PROFILE` | Enable debug endpoints (never in production) | No | `false` |
| `DEBUG_KEY` | Key for debug API access | No | — |

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Create and configure .env
cp .env.example .env
# Set AUTH_SECRET at minimum

# Run database migrations
npx prisma migrate dev

# Seed development data (creates an admin user + sample prompts/tags)
npx prisma db seed

# Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

### Project Structure

```
src/
├── app/
│   ├── (app)/            # Authenticated routes (dashboard, entries, etc.)
│   │   ├── dashboard/    # Home dashboard with stats and recent entries
│   │   ├── entries/      # Journal entries (list, create, edit, view)
│   │   ├── milestones/   # Milestone tracking
│   │   ├── growth/       # Growth chart records
│   │   ├── export/       # PDF and ZIP export
│   │   └── settings/     # App settings and user management
│   ├── (auth)/           # Unauthenticated routes
│   │   ├── login/
│   │   ├── register/
│   │   └── setup/        # First-run setup wizard
│   └── api/              # API routes
│       ├── entries/      # CRUD for journal entries
│       ├── milestones/   # CRUD for milestones
│       ├── growth/       # CRUD for growth records
│       ├── tags/         # Tag management
│       ├── upload/       # Image and audio upload
│       ├── export/       # PDF and ZIP generation
│       ├── settings/     # App settings
│       ├── setup/        # Setup wizard API
│       ├── invite/       # Invite code management
│       └── auth/         # NextAuth.js (credentials provider)
├── components/
│   ├── editor/           # Tiptap editor, image upload, audio recorder
│   ├── entries/          # Entry card, content renderer, filters
│   ├── growth/           # Growth chart and form
│   ├── layout/           # AppShell, Sidebar, Header
│   ├── settings/         # Settings form, user management
│   └── ui/               # Shared UI primitives (Button, Modal)
├── lib/
│   ├── auth.ts           # NextAuth.js configuration
│   ├── prisma.ts         # Prisma client singleton
│   ├── settings.ts       # Cached app settings accessor
│   ├── sanitize.ts       # HTML sanitization (DOMPurify)
│   ├── export.ts         # ZIP export logic
│   └── pdf/              # PDF generation (Puppeteer + HTML templates)
│       ├── generator.ts
│       └── templates/    # Cover, chapter, entry, milestone, growth page templates
├── middleware.ts          # Auth middleware + route protection
prisma/
├── schema.prisma         # Database schema
├── migrations/           # SQLite migrations
├── seed.ts               # Development seed data
└── seed-production.js    # Production seed (tags, prompts — no test users)
```

### Key Technologies

| Technology | Purpose |
|---|---|
| [Next.js](https://nextjs.org) 16 | Full-stack React framework |
| [Prisma](https://prisma.io) | ORM + SQLite database |
| [NextAuth.js](https://next-auth.js.org) v5 | Authentication (credentials provider) |
| [Tiptap](https://tiptap.dev) | Rich text editor |
| [Recharts](https://recharts.org) | Growth chart visualizations |
| [Puppeteer](https://pptr.dev) | PDF generation (headless Chromium) |
| [Sharp](https://sharp.pixelplumbing.com) | Image processing (WebP conversion, thumbnails) |
| [Tailwind CSS](https://tailwindcss.com) | Styling with CSS variable theming |
| [Zod](https://zod.dev) | API input validation |
| [DOMPurify](https://github.com/cure53/DOMPurify) | HTML sanitization (XSS prevention) |

## Data Storage

All data is stored on a single Docker volume (`journal-data`):

```
/data/
├── db/
│   └── journal.db        # SQLite database
└── uploads/
    ├── images/           # WebP images + thumbnails
    └── audio/            # Audio recordings (WebM/MP3)
```

### Backup

Use the **ZIP Export** feature in the app (Export page) to download a complete backup containing:
- All journal entries, milestones, and growth records (JSON)
- All uploaded images and audio files
- App settings and tags

You can also back up the Docker volume directly:

```bash
docker cp baby-journal:/data ./backup
```

### Database Schema

The database uses SQLite with the following models:
- **User** — Accounts with roles (`admin` or `member`)
- **Entry** — Journal entries with rich text, optional title, date, and draft status
- **Tag / EntryTag** — Categorization tags (e.g., Firsts, Funny Moments, Family)
- **Media** — Uploaded images and audio linked to entries
- **Milestone** — Tracked milestones with categories and optional photos
- **GrowthRecord** — Height, weight, and head circumference measurements
- **InviteCode** — Single-use or multi-use codes for inviting family members
- **WritingPrompt** — Daily prompts shown on the dashboard
- **AppSettings** — Singleton settings (child name, title, birth date, theme, shower mode)
- **GuestMessage** — Baby shower guestbook submissions that admins can promote into entries

## Theming

The app supports three color themes controlled via a `data-theme` attribute and CSS custom properties:

| Theme | Palette | Description |
|---|---|---|
| **Girl** | Rose/pink tones | Warm pinks and soft reds |
| **Boy** | Sky/blue tones | Soft blues and teals |
| **Neutral** | Sage/green tones | Earthy greens and warm neutrals |

Themes can be set during initial setup or changed at any time in Settings. The selected theme applies to:
- All UI accent colors (buttons, links, active states, focus rings)
- PDF exports (cover, headings, borders, backgrounds)

## Multi-User & Invitations

1. The **admin** creates invite codes from Settings > Users
2. Share the invite code with a family member
3. They register at `/register` using the code
4. Members can create and edit their own entries; admins can manage all content

## Baby Shower Guestbook

Admins can enable shower mode from Settings and share `/guestbook` plus the generated code with guests. Guest submissions are visible only to admins until they are deleted or promoted into journal entries.

Roles:
- **Admin** — Full access, can manage users, settings, and all entries
- **Member** — Can create/edit/delete their own entries, milestones, and growth records

## PDF Export

The PDF export generates a scrapbook-style book with:
- **Cover page** with the journal title and child's name
- **Table of contents** organized by year and month
- **Entry pages** with formatted text, embedded images, and metadata
- **Milestone pages** with all tracked milestones
- **Growth chart pages** with measurement data

PDF generation uses Puppeteer with headless Chromium. Fonts are embedded locally (no external CDN dependencies), so it works in air-gapped environments.

## Security

- **Authentication** — bcrypt-hashed passwords, session-based auth via NextAuth.js
- **Authorization** — IDOR protection on all API endpoints (users can only access their own data, admins have full access)
- **Input validation** — All API inputs validated with Zod schemas
- **XSS prevention** — HTML content sanitized with DOMPurify before rendering
- **Path traversal protection** — File serving and deletion operations validate resolved paths stay within the upload directory
- **CSRF protection** — Built-in NextAuth.js CSRF tokens
- **Security headers** — CSP, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- **Setup wizard** — Atomic transaction prevents race conditions during initial admin creation
- **Non-root container** — Docker container runs as an unprivileged `nextjs` user

## Docker Details

Pre-built images are published to `ghcr.io/cj-vana/journal` for `linux/amd64` and `linux/arm64`.

| File | Purpose |
|---|---|
| `docker-compose.yml` | **Production** — pulls pre-built image from GHCR |
| `docker-compose.dev.yml` | **Development** — builds from source |

The Dockerfile uses a multi-stage build:
1. **deps** — Install Node.js dependencies
2. **builder** — Build the Next.js app (standalone output)
3. **runner** — Minimal Alpine image with Chromium for PDF generation

The entrypoint runs Prisma migrations and seeds default data (tags, writing prompts) on every start.

### Custom Reverse Proxy

If running behind a reverse proxy (Nginx, Caddy, Traefik), set `AUTH_URL` to your public URL:

```bash
AUTH_SECRET="..." AUTH_URL="https://journal.yourdomain.com" docker compose up -d
```

## Releases

Releases are automated via GitHub Actions. To create a new release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This builds multi-platform Docker images, pushes them to GHCR, and creates a GitHub Release with a changelog.

## License

MIT
