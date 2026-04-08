# dapp-frontend

A Next.js 16 App Router frontend for a blockchain-enabled campaign platform where:
- brands create and manage campaigns,
- influencers onboard with wallet login,
- campaign payouts are intended to be transparent and verifiable.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS 4
- Wagmi + Viem (wallet connectivity)
- TanStack Query

## Current App Areas

### Public
- `/` — Landing page
- `/campaigns` — Campaign discovery (currently placeholder)

### Brand/Auth + Dashboard
- `/login`
- `/verify-company`
- `/dashboard`
- `/campaign`
- `/campaign/create`

### Influencer/Auth + Dashboard
- `/influencer/login` — Wallet login flow
- `/influencer/onboard` — Profile setup
- `/influencer/dashboard`

## API Routes

- `POST /api/company/check` — Verify company from request payload
- `POST /api/company/submit` — Submit company details
- `GET /api/wallet?wallet=0x...` — Wallet existence check
- `POST /api/wallet/bind` — Bind company and wallet
- `POST /api/influencer/onboard` — Save influencer onboarding data

> Note: Some API handlers are currently mock/in-memory implementations for development.

## Getting Started

### 1) Prerequisites
- Node.js 20+
- npm 10+
- MetaMask (for influencer wallet connect flows)

### 2) Install dependencies

```bash
npm install
```

### 3) Run development server

```bash
npm run dev
```

Open http://localhost:3000

### 4) Build for production

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Create production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## Project Structure (high level)

- `app/` — App Router pages and API routes
- `components/` — UI and visual components
- `components/forms/` — Form components
- `context/` — React context (reserved for shared state)
- `lib/` — Utility/service modules
- `types/` — Shared TypeScript types

## Notes

- Next.js shows a deprecation warning for `middleware.ts`; migrate to `proxy.ts` when ready.
- Wallet and onboarding logic is partly scaffolded; production hardening should include:
	- persistent DB storage,
	- input validation on all API routes,
	- auth/session strategy beyond cookie presence checks.

## Deployment

This app can be deployed on Vercel or any Node-compatible host.

For Vercel:
1. Import the repository.
2. Use default Next.js build settings.
3. Add required environment variables when backend integrations are enabled.

