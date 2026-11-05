# Shared Bill Splitter

A full-stack application to manage shared household expenses. Create homes, add members, split bills fairly, record payments, and track outstanding balances.

## Tech Stack

- Frontend: React, Vite, TypeScript, TanStack Router
- Backend: Hono, Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Testing: Vitest
- Code Quality: Biome
- Package Manager: pnpm

## Architecture

       React + Vite
        (Frontend)
             |
         REST API
             |
             v
       Hono + Workers
         (Backend)
             |
        SQL Queries
             |
             v
      Cloudflare D1
         (SQLite)

## Features

- Create and manage multiple homes.
- Add members with duplicate-name prevention.
- Split bills equally among home members.
- Distribute remaining cents in member joining order.
- Process payments with idempotency protection.
- Prevent duplicate payments.
- Track outstanding balances.
- Persist data using Cloudflare D1.

## Getting Started

1. Clone the repository


git clone https://github.com/GautamKS31/shared-bill-splitter.git
cd shared-bill-splitter

2. Install dependencies


pnpm install


3. Start the application**


pnpm dev

- Frontend: http://localhost:5173
- Backend: http://localhost:8787
- Health Check: http://localhost:8787/api/health

## Validation


pnpm check
pnpm typecheck
pnpm test
pnpm build


## Decisions

1. Integer-based money calculations: Store monetary values as integer paise to avoid floating-point precision errors and ensure accurate bill splitting.

2. Database constraints: Use foreign keys, CHECK constraints, and UNIQUE indexes to maintain data integrity and prevent duplicate members.

3. Idempotent payments: Use `Idempotency-Key` and conditional database updates to prevent duplicate payments during retries and concurrent requests.

## Submission

- GitHub: https://github.com/GautamKS31/shared-bill-splitter
- Video : https://www.loom.com/share/2d338d4a04784bbbbf72ac1d0a2fc372
