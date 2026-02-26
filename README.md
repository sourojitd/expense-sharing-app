# Splito — Web Application

The Next.js 15 web application for Splito. Built with React 19, Tailwind CSS 4, and Radix UI.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start PostgreSQL + Redis
npm run docker:up

# Set up the database
npm run db:generate
npm run db:migrate

# Seed test data (optional)
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Test Accounts

After running `npm run db:seed`:

| Name | Email | Password |
|---|---|---|
| Alice Johnson | `alice@splito.dev` | `Password123!` |
| Bob Smith | `bob@splito.dev` | `Password123!` |
| Charlie Brown | `charlie@splito.dev` | `Password123!` |
| Diana Prince | `diana@splito.dev` | `Password123!` |

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS 4, Radix UI, Lucide icons
- **Auth**: JWT access/refresh tokens, bcrypt
- **Database**: PostgreSQL 15 (Prisma 6 ORM), Redis 7
- **Testing**: Jest 30, React Testing Library
- **Code Quality**: ESLint 9, Prettier 3.6, TypeScript 5

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run test suite (24 files) |
| `npm run test:coverage` | Test coverage report |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Prettier format |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed test data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |

## Project Structure

```
src/
+-- app/
|   +-- (app)/              # Authenticated pages
|   |   +-- dashboard/      # Main dashboard
|   |   +-- groups/         # Group management
|   |   +-- expenses/       # Expense CRUD
|   |   +-- friends/        # Friend management
|   |   +-- settings/       # User settings + theme
|   |   +-- settle/         # Payment settlements
|   |   +-- activity/       # Activity feed
|   |   +-- recurring/      # Recurring expenses
|   +-- (auth)/             # Login, register, forgot password
|   +-- api/                # 60+ REST API endpoints
|   +-- globals.css         # Theme variables, animations
+-- components/
|   +-- ui/                 # 24 Radix-based components
|   +-- layout/             # AppShell, Sidebar, TopBar, MobileNav
|   +-- theme/              # ThemeProvider, ThemeToggle
|   +-- expenses/           # Expense-specific components
|   +-- groups/             # Group-specific components
+-- lib/
    +-- services/           # 17 business logic services
    +-- repositories/       # 11 data access layers
    +-- models/             # Zod validation schemas
    +-- middleware/          # JWT auth middleware
    +-- hooks/              # useApi, useToast, useKeyboardShortcuts
    +-- utils/              # Helpers and constants
```

## Environment Variables

See `.env.example` for all configuration options. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens |
| `NEXTAUTH_SECRET` | Yes | NextAuth encryption key |
| `NEXTAUTH_URL` | Yes | Application base URL |

## API Overview

60+ REST endpoints organized by domain:

- **Auth** (`/api/auth/*`) — Register, login, tokens, password reset
- **Expenses** (`/api/expenses/*`) — CRUD, splits, analytics, export
- **Groups** (`/api/groups/*`) — CRUD, members, messages
- **Payments** (`/api/payments/*`) — Record, confirm, reminders
- **Balances** (`/api/balances/*`) — Real-time, simplified debts
- **Friends** (`/api/friends/*`) — Requests, search
- **Notifications** (`/api/notifications/*`) — CRUD, mark read
- **Profile** (`/api/profile/*`) — Update, upload picture
- **Dashboard** (`/api/dashboard/summary`) — Overview stats

## Theme System

The app supports **Light**, **Dark**, and **System** themes:

- **ThemeProvider**: Wraps the app with `next-themes`
- **ThemeToggle**: Dropdown in the top bar (desktop) and mobile menu
- **Settings Page**: Visual theme previews with animated selection
- **CSS**: Gradient buttons with shine animations, dark mode glow effects

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

24 test files covering services, repositories, API endpoints, middleware, and models.

## License

MIT
