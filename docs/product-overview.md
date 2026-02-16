# FinPlanner — Personal Tax & Retirement Planning

**A private, browser-based financial planning tool that keeps your data under your control.**

---

FinPlanner is a single-page web application for households managing tax obligations and planning sustainable retirement income. It runs entirely in the browser — there is no backend server. Your financial data stays on your device and in your personal OneDrive; nothing is stored on any third-party server.

Your OneDrive folder is self-describing NDJSON — natively readable and editable by LLM agents without any export step. An auto-generated `.agent/` subfolder provides schemas, editing rules, and validation checklists so that an agent can point at the folder and start working immediately.

## What It Does

**Tax Planning** — Manage tax records across historical (filed/amended), current (draft/ready), and projected years. Import W-2s, 1099s, K-1s, and other tax documents by dragging PDFs into the browser; FinPlanner extracts key fields client-side with per-field confidence scoring (threshold 0.80) and flags uncertain values for review. A filing checklist tracks document status — pending, received, not applicable, or waived — based on last year's records and known accounts. Year-over-year comparison catches anomalies (unusual swings in income or deductions) and omissions (a 1099 present last year but absent this year) before they become filing-time problems. Tax computation uses a 50-state dataset with effective income rates, capital gains rates, and Social Security exemption flags.

**Retirement Planning** — Model household cashflows from now through end of life. FinPlanner handles taxable accounts with cost basis tracking, 401(k)s, deferred compensation (NQDC) with scheduled payout distributions, Social Security, pensions, and one-time events. Choose from four withdrawal strategies — taxable-first, tax-deferred-first, pro-rata, or tax-optimized — and the engine solves discretionary withdrawals to fill each year's spending gap. RMDs follow SECURE 2.0 age thresholds (73 for born 1951–1959, 75 for born 1960+). The survivor phase automatically transitions filing status (MFJ to qualifying survivor for two years, then single), consolidates accounts, and terminates the deceased spouse's income streams. Guardrail spending rules enforce a floor and ceiling based on portfolio health, tightening withdrawals when the portfolio is stressed and capping them in strong markets. Run scenarios in four modes: deterministic, historical replay (dot-com bust, 2008 crisis), stress presets (high inflation, early drawdown), or Monte Carlo (10,000+ runs, optionally via Web Workers).

**AI-Powered Guidance** — Optionally connect your own Claude API key for two distinct analysis domains: portfolio optimization (`getPortfolioAdvice`) and tax strategy (`getTaxStrategyAdvice`). Before any data reaches Claude, a PII-stripping layer uses an allowlist approach — names become "Primary"/"Spouse", accounts become "Taxable Account 1", issuers become "Employer A", and addresses, SSNs, and file paths are omitted entirely. Your API key is stored in IndexedDB only — never in localStorage, OneDrive, NDJSON files, or URLs. Every AI suggestion includes rationale, trade-offs, and a disclaimer. If the LLM call fails twice, the system falls back to deterministic rule-based advice. If you don't provide an API key, all rule-based features work fully — AI features simply show a prompt to add one.

## How It Works

- **Shared corpus:** Accounts, income streams, household profile, and filing details are entered once. Both the tax and retirement modules consume the same data — no duplicate entry.
- **Storage:** Data saves to your OneDrive Personal as NDJSON files in a structured folder. The folder IS the agent-readable format — no export step needed. NDJSON import is available for backup restoration and data portability. A local IndexedDB cache provides instant access and offline use.
- **Agent access:** The `.agent/` subfolder contains `SCHEMA.md` (complete field reference), `EDITING.md` (rules for creating/updating/deleting records), `VALIDATION.md` (12-step self-verification checklist), `DATA_SUMMARY.md` (auto-regenerated metadata snapshot on every save), and individual JSON Schema files per record type. A root `README.md` points agents to `.agent/` as the entry point.
- **Deployment:** A static website — no server infrastructure to maintain. Host it on Azure Static Web Apps, GitHub Pages, or any CDN.

## Design

Built with Microsoft's Fluent UI React v9 design system. Light and dark themes. Responsive from 1024px to ultrawide. WCAG 2.1 AA accessible. The interface uses familiar Microsoft design patterns: cards, data grids, drawers, toast notifications, and inline form validation.

## Key Properties

| | |
|---|---|
| **Privacy** | Data never leaves your browser and OneDrive except for opt-in AI analysis with your own API key. Claude sees only PII-stripped summaries — never raw PDFs, SSNs, or file paths. Agent access operates within your existing OneDrive security context. |
| **Offline** | Fully functional without network; syncs when reconnected |
| **No account required** | Authenticate with your existing Microsoft account for OneDrive; no separate signup |
| **Transparent** | Every projection shows the assumptions behind it; every AI suggestion includes trade-offs and disclaimers |
| **Portable** | Self-describing NDJSON folder structure means your data is never locked in — any tool or agent can read it directly |
| **Agent-native** | `.agent/` folder with schemas, editing rules, and validation checklists enables LLM agents to read, edit, and validate data without knowledge of the FinPlanner codebase |
| **Multi-scenario** | Deterministic, historical replay, stress testing, and Monte Carlo simulation modes for retirement projections |

## Under the Hood

- **13-step annual engine:** Each simulation year executes a fixed sequence — apply returns, compute mandatory income (SS, NQDC, pensions, RMDs), inflate spending with guardrail adjustments, solve discretionary withdrawals, calculate federal + state taxes with iterative convergence, compute net spendable, apply fees, rebalance (quarterly or annual), and produce diagnostics.
- **Effective-rate tax model:** Federal and state taxes use approximate effective rates with qualified-dividend distinction. Non-refundable credits (federal only) reduce tax liability. Standard deduction offsets ordinary income only.
- **Cost basis tracking:** Taxable withdrawals split into taxable gain and tax-free return of basis using a proportional gain-fraction model. Surplus reinvestment increases both balance and basis.
- **8 client-side module interfaces:** `simulate`, `getPortfolioAdvice`, `validateImport`, `extractPdfFields`, `generateChecklist`, `detectAnomalies`, `getTaxStrategyAdvice`, `generateBackup` — no backend server required.
- **12 golden scenario tests** with reference values verify engine correctness across baseline, joint/survivor, RMD interaction, guardrail spending, NQDC schedules, and NDJSON round-trip fidelity.

## Known v1 Scope Boundaries

FinPlanner v1 models the most common household scenarios. The following are documented limitations:

- **Filing status:** Single, married filing jointly, and qualifying surviving spouse only — no MFS or head of household.
- **Tax model:** Effective-rate only — no bracket-level computation, AMT, NIIT, or phase-outs. No Roth conversion modeling.
- **Capital losses:** No $3,000 annual deduction limit; no carryforward tracking.
- **Rebalancing:** Notional transfers between accounts do not trigger capital gains events.
- **Healthcare:** No Medicare premium, Part D, or Medigap modeling.
- **Estate planning:** No estate tax, step-up in basis, or inheritance modeling.
- **Social Security:** Simplified provisional-income model (0%/50%/85% fractions); user provides benefit amount directly (no PIA-to-claim-age conversion).
- **Monte Carlo:** Assumes normally distributed returns; no fat tails or serial correlation.
- **Tax credits:** All non-refundable, federal-only; no state credits or refundable credits.
