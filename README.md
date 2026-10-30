# Money Matter

One calm place to track **everything** — spending, accounts, bills, goals and net worth — with a two-minute month-end review that keeps the numbers honest.

Local-first: all data lives in your browser (`localStorage`). Nothing is uploaded.

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
src/pages/     Home, Activity, Plan, Wealth, Insights, Review, Settings, Welcome
src/components/ AppShell, TransactionDialog (quick add), plan/*, shared UI
src/test/      jsdom flow tests that click through the real app
```

## Data & backups

*Settings → Backup (JSON)* exports everything; *Restore backup* validates the file before replacing anything. *Transactions (CSV)* opens in Excel/Sheets. If saved data ever fails to parse, it's kept aside under `money-matter:data:corrupt-backup` instead of being overwritten.

## Roadmap ideas

- **Cloud sync / multi-device.** `src/store/FinanceContext.tsx` is the only place that reads or writes data; swap `loadData`/`saveData` in `src/store/storage.ts` for an API (the earlier Supabase schema is kept under `supabase/` for reference).
- Bank/UPI statement import (CSV) with auto-categorisation.
- PWA install + offline icon set, push reminders for due bills.
- Investment holdings and returns, multi-currency accounts.
