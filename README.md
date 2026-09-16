# SME Cashflow Copilot

An AI-powered cash flow tracker for small businesses. Track income and expenses, import bank
CSVs, forecast your runway, and chat with your money.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Firebase** — Auth (email/password + Google), Firestore, security rules
- **NVIDIA NIM** (OpenAI-compatible, Nemotron models) — copilot chat, auto-categorization, forecast summaries, insights

## Getting started

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a Firebase web app and a service account (see `.env.local.example`), then:

   ```bash
   cp .env.local.example .env.local
   # fill in your Firebase + OpenAI values
   ```

3. Enable **Email/Password** and **Google** sign-in in Firebase Auth.

4. Deploy the Firestore security rules:

   ```bash
   # via Firebase CLI
   npx firebase-tools deploy --only firestore:rules
   ```

5. Run the app

   ```bash
   npm run dev
   ```

## Features

- **Accounts** — bank, cash, and credit accounts with running balances
- **Transactions** — full CRUD with categories, vendors/customers, tags, and notes
- **Import** — drop a bank CSV, autodetect columns, AI-categorize rows, review, and import
- **Recurring** — rent, payroll, subscriptions, invoices on schedules
- **Dashboard** — summary cards, 30/90-day cash flow chart, smart alerts, outlook
- **Copilot** — ask questions about your money, get a 30-day forecast and AI narrative
- **Insights** — automatic findings for spend, trends, and anomalies
- **Alerts** — low balance, upcoming bills, cash crunch, and duplicate-charge detection

## Data model

Firestore collections:

- `users/{uid}` — profile, currency, alert thresholds, businessId
- `businesses/{businessId}` — name, owner, currency
- `.../accounts`, `/categories`, `/vendors`, `/transactions`, `/recurring`, `/alerts`

All monetary values are stored as **integers in minor units** (cents) to avoid float errors.

## Scripts

| Command      | Description        |
| ------------ | ------------------ |
| `npm run dev`   | Start dev server   |
| `npm run build` | Production build   |
| `npm run lint`  | ESLint check       |