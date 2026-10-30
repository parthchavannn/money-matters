# Money Matter

One calm place to track **everything** — spending, accounts, bills, goals and net worth — with a two-minute month-end review that keeps the numbers honest.

Two modes, same app:

- **Local-only** (default, no setup): data lives in your browser. No login.
- **Accounts + cloud sync** (set two env vars): email/password login; every user gets a private, synced copy of their data that also works offline.

## The flow

| Screen | What it's for |
| --- | --- |
| **Home** | Net worth, this month in/out/saved, bills due (one-tap *Paid*), budget & goal progress, nudges, recent activity |
| **Activity** | Every transaction. Search all months, filter by type/account/category, tap to edit, delete with undo |
| **Plan** | **Budget** (monthly limits, pace warnings, suggest-from-history) · **Bills & income** (recurring, due → one tap) · **Goals** |
| **Wealth** | Accounts (bank, cash, wallet, investments) and liabilities (card, loan), net-worth trend, quick "update balance" |
| **Insights** | Income vs spending trend, category breakdown vs last month, biggest expenses |
| **Review** | Month-end: see how the month went, confirm each balance, differences become labelled adjustments |

**Adding a transaction is one gesture from anywhere:** the `+` button, or press `N`. Amount → category → save. Account and category default to what you used last.

### How the money model works

- Everything is an **account**. Assets are positive; liabilities (credit card, loan) are stored negative. **Net worth = sum of all accounts.**
- A **transfer** (paying a card, an EMI, a SIP) moves money between accounts and is *not* counted as income or spending — so paying off debt never looks like an expense.
- **Adjustments** (from a review or "update balance") fix drift between what's tracked and what's real. They're labelled, and never counted as income or spending.
- Net-worth history is *derived* from transactions, so there are no snapshots to keep in sync.

## Develop

```sh
npm install
npm run dev      # http://localhost:8080
npm test         # domain logic + UI flow tests
npm run build    # typecheck + production build
```

### Layout

```
src/domain/    pure logic — types, dates, calc (balances, budgets, insights…) — no React
src/store/     FinanceContext (state + actions), storage (validate/migrate/export), sample data
src/cloud/     auth, SyncEngine (framework-free, fully tested), Supabase store, CloudBoundary
src/pages/     Home, Activity, Plan, Wealth, Insights, Review, Settings, Welcome
src/components/ AppShell, TransactionDialog (quick add), plan/*, shared UI
src/test/      jsdom flow tests that click through the real app
```

## Turn on accounts & cloud sync

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. Run [`supabase/migrations/20261030000000_user_data.sql`](supabase/migrations/20261030000000_user_data.sql) in the SQL editor (or `supabase db push`). It creates the table, enables row-level security so each user can only read and write their own row, and adds `delete_my_account()` for self-service deletion. The older migrations in that folder belong to the previous version of the app and aren't needed.
3. **Authentication → URL configuration**: set *Site URL* to where the app is served (e.g. `http://localhost:8080` for dev) and add the same URL under *Redirect URLs*. Email-confirmation and password-reset links depend on it.
4. Copy `.env.example` to `.env` and fill in the project URL and the anon/publishable key.
5. `npm run dev`. You'll now see a sign-in screen.

Enabling email confirmation (Authentication → Providers → Email) is recommended for production; the app already handles the confirm-then-sign-in flow.

### How sync behaves

- Edits save to the device immediately and are pushed to the server about a second later. A badge in the sidebar and mobile header shows **Syncing / All changes saved / Offline / Needs attention**.
- Offline edits are kept and pushed on the next launch or when the connection returns.
- Each push carries the server revision it was based on. If another device changed things first, **nothing is overwritten**; you're asked whether to keep this device's version or the other one.
- The first time someone signs in on a browser that already holds local-only data, they're asked whether to add it to their account. It is never silent, because on a shared computer it could belong to someone else.
- Signing out clears that user's cache from the device. *Settings → Delete account & data* removes the login and the server copy.

### Honest limits (v1)

Each user's whole financial record is stored as one versioned JSON document. That keeps sync simple and robust and is comfortable for years of personal transactions, but it syncs and resolves conflicts per document. When you need server-side analytics, shared/family accounts, or very large histories, move to normalised tables (accounts, transactions, …). `src/domain/types.ts` maps onto them directly, and `SyncEngine` / `CloudStore` are the only things to swap.

## Data & backups

*Settings → Backup (JSON)* exports everything; *Restore backup* validates the file before replacing anything. *Transactions (CSV)* opens in Excel/Sheets. If saved data ever fails to parse, it's kept aside under `money-matter:data:corrupt-backup` instead of being overwritten.

## Roadmap ideas

- **Automatic UPI/bank sync** (on hold): statement import and an Android SMS reader first, then the RBI Account Aggregator framework. Needs a review inbox and de-duplication by external id.
- Normalised server tables (see limits above), Google sign-in, family/shared accounts.
- Bank/UPI statement import (CSV) with auto-categorisation.
- PWA install + offline icon set, push reminders for due bills.
- Investment holdings and returns, multi-currency accounts.
