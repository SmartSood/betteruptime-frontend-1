# Sentinel — Uptime Monitoring Dashboard

A polished, dark-themed uptime monitoring dashboard built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, and Lucide icons.

## Features

- **Authentication** — Sign up and sign in with email/password. JWT is stored in localStorage and attached as `Authorization: Bearer <jwt>` to all authenticated requests.
- **Dashboard** — Overview metrics (total monitors, up/down counts, average response time, average uptime), searchable/filterable monitor table, and an empty state for first-time users.
- **Create Monitor** — Modal dialog with URL validation, multi-select regions loaded from the backend, and a poll interval selector.
- **Monitor Details** — Status hero with uptime and response metrics, response time area chart, uptime timeline bar chart, and a paginated recent checks table.

## Setup

```bash
npm install
npm run dev
```

The dev server starts automatically — no need to run it manually.

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

| Variable              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | Base URL of the Rust backend API (no trailing slash) |

## Connecting to the Rust Backend

The frontend communicates with these endpoints:

| Method | Path               | Auth | Purpose                |
| ------ | ------------------ | ---- | ---------------------- |
| POST   | `/user/sign-up`    | No   | Create a new account    |
| POST   | `/user/sign-in`    | No   | Sign in, returns JWT    |
| GET    | `/regions`         | No   | List available regions  |
| POST   | `/website`         | Yes  | Create a monitor        |
| GET    | `/all_websites`    | Yes  | List all monitors       |
| GET    | `/website/:id`     | Yes  | Get a single monitor    |

### Important

- **URLs in requests must be literal** — send `https://example.com`, not Markdown-style `[google](https://google.com)`.
- **No mock endpoints are invented.** The backend does not yet expose tick history, current status, or delete/update APIs. Monitor detail charts and recent checks use local mock data in `src/lib/mock-data.ts` that is structured for easy replacement with a real endpoint later.
- All API calls go through `src/lib/api.ts` — swap implementations there to connect real endpoints.

## Project Structure

```
src/
├── lib/
│   ├── api.ts          # Typed API client with auth token management
│   ├── mock-data.ts    # Mock tick history (replace with real endpoint)
│   └── auth-context.tsx # Auth provider with JWT-based state
├── components/
│   ├── auth-guard.tsx       # Redirects unauthenticated users
│   ├── auth-shell.tsx       # Shared layout for sign-in/sign-up
│   ├── create-monitor-dialog.tsx
│   ├── dashboard-header.tsx
│   ├── status-badge.tsx
│   └── states.tsx           # Loading, error, empty, unauthorized states
app/
├── sign-in/page.tsx
├── sign-up/page.tsx
├── dashboard/
│   ├── layout.tsx           # Auth-protected layout with header
│   ├── page.tsx             # Main dashboard with metrics & monitor table
│   └── [id]/page.tsx        # Monitor details with charts & checks
└── page.tsx                 # Redirects to /dashboard or /sign-in
```

## Tech Stack

- Next.js 13 (App Router) + TypeScript
- Tailwind CSS with custom dark theme
- shadcn/ui component library
- Recharts for data visualization
- Lucide React for icons
