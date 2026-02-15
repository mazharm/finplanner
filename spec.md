# spec.md — Personal Financial Planning Tool: Tax & Retirement (React + TypeScript SPA)

**Version:** 3.0.0
**Status:** Implementation-ready
**Audience:** Coding agent + engineering team
**Normative Language:** The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as described in RFC 2119.

---

## 1. Introduction

This document specifies a production-grade personal financial planning application built with React and TypeScript. The system provides **integrated tax planning and retirement planning** for households, with a shared corpus of key financial data that feeds both domains. Capabilities include:

1. **Tax Planning**
   a. Year-by-year tax record management
   b. Tax document import from PDFs (W-2s, 1099s, K-1s, etc.)
   c. Current-year tax filing checklist generation
   d. Year-over-year anomaly and omission detection
2. **Retirement Planning**
   a. Regular taxable accounts
   b. Deferred compensation (NQDC) accounts
   c. 401(k)/tax-deferred accounts
   d. Social Security benefits
   e. Primary and spouse age-based modeling, including survivor transition
3. **Shared Capabilities**
   a. State-of-residence tax impact (shared between tax and retirement modules)
   b. Historical market condition replay and downturn stress testing
   c. LLM-driven optimization guidance via Claude (tax strategy + portfolio)
   d. NDJSON export/import for interoperability with other tools, models, and LLM agents
   e. Data stored in OneDrive - Personal; never leaves user security context except for Claude API calls using the user's own API key

This is a **single consolidated specification** and is intended to be directly consumable by coding agents without requiring supplemental fragments.

---

## 1.1 Key Definitions

* **Calendar year:** All year fields in the data model (e.g., `startYear`, `endYear`, `YearResult.year`) represent calendar years (e.g., 2026, 2030). The simulation horizon runs from the current calendar year through the calendar year in which the last surviving person reaches their life expectancy.
* **Tax year:** A calendar year for which the user has or will have tax obligations. Tax years may be historical (filed), current (in-progress), or projected (future/retirement).
* **Joint phase:** The period during which both the primary and spouse are alive and within the simulation horizon.
* **Survivor phase:** The period after one spouse exits the model horizon (reaches life expectancy), during which the surviving spouse continues.
* **Simulation year 0:** The current calendar year at the time the simulation is run.
* **Shared data corpus:** The set of financial data elements (income, accounts, filing status, state of residence, deductions, etc.) that are authored once and consumed by both the tax planning and retirement planning modules.
* **User security context:** The boundary within which user data resides — the browser runtime and the user's OneDrive - Personal storage. There is no backend server. Data MUST NOT leave this context except when explicitly sent to the Claude API using the user's own API key.
* **NDJSON:** Newline-Delimited JSON (one JSON object per line). The standard serialization format for all data storage and export in this system.
* **Filing status limitation (v1):** The system supports `single`, `mfj` (married filing jointly), and `survivor` (qualifying surviving spouse). **Married filing separately (MFS) and head of household (HoH) are not supported in v1.** This is a known limitation that MUST be documented in `model-limitations.md`.

---

## 2. Product Goals and Non-Goals

### 2.1 Goals

The system MUST:

* Produce transparent, explainable retirement projections.
* Model joint household and survivor-phase cashflows.
* Support tax-aware withdrawals across account types.
* Evaluate outcomes under historical and stress scenarios.
* Provide structured, schema-validated AI guidance (tax + retirement).
* **Manage tax records by year** — historical, current, and projected.
* **Import tax data from PDF documents** (W-2, 1099, K-1, etc.) via extraction.
* **Generate a current-year tax filing checklist** based on known data and detected gaps.
* **Detect year-over-year anomalies and omissions** across tax records.
* **Share a common data corpus** between tax and retirement planning modules so data is entered once.
* **Store all data in OneDrive - Personal** and ensure it never leaves the user security context except for Claude API calls using the user's own API key.
* Export/import all tax and retirement planning data in **NDJSON format** for analysis by other LLM agents.

### 2.2 Non-Goals (v1)

The system is not required in v1 to:

* Connect to brokerages or banks.
* Execute trades.
* Serve as formal legal/tax/investment advice.
* Implement full tax-code fidelity for all jurisdictions.
* Provide complete actuarial-grade mortality modeling.
* Auto-file tax returns or interface with IRS/state e-file systems.
* Perform OCR on handwritten or scanned-image-only PDFs (structured/text-layer PDFs are in scope).

---

## 3. Users and Primary Workflows

### 3.1 Primary User

A household managing ongoing tax obligations and planning sustainable retirement income.

### 3.2 Core Workflows

**Tax Planning Workflows:**

1. Import tax documents (PDFs) for the current or prior tax years.
2. Review and organize extracted tax data by year.
3. Generate a tax filing checklist for the current year identifying what's complete and what's missing.
4. Run year-over-year comparison to spot anomalies (e.g., missing income source, unusual deduction change) or omissions (e.g., a 1099 present last year but absent this year).
5. Request Claude-generated tax strategy suggestions.

**Retirement Planning Workflows:**

6. Create household plan (ages, spouse, state, accounts, SS).
7. Configure assumptions (returns, inflation, taxes, spending).
8. Run simulation (deterministic, historical, stress).
9. Compare outcomes and inspect yearly cashflow/tax details.
10. Request Claude-generated portfolio optimization suggestions.

**Shared Workflows:**

11. Export all tax and retirement data as NDJSON for analysis by another LLM agent.
12. Import previously exported NDJSON data.
13. View shared data corpus (income, accounts, household profile) used by both modules.

---

## 4. Scope

### 4.1 In Scope (v1)

* React + TypeScript web app
* Static hosting only — no backend server
* **Tax planning module** — year-by-year tax record management, PDF import, checklist generation, YoY anomaly detection
* **Retirement planning module** — deterministic simulation, historical replay, stress scenarios
* **Shared data corpus** — household profile, accounts, income sources, filing status, state of residence
* Federal + state tax impact (effective model minimum)
* Social Security + survivor modeling
* Deferred compensation schedules
* Claude advice integration (client-side, user-provided API key) for both tax and retirement guidance
* **NDJSON export/import** + schema versioning (replaces JSON)
* **OneDrive - Personal** as the storage layer with IndexedDB local cache (FR-14)
* **Data security** — all data stays within user security context; only LLM analysis prompts leave

### 4.1.1 Key v1 Assumptions

* **Pre-retirement contributions are not modeled.** v1 assumes the user is at or near retirement. Pre-retirement salary, 401(k) contributions, and employer matches are out of scope. Users should enter current account balances as of their planned simulation start.
* **Client-side plan state with OneDrive persistence.** There is no backend server. All computation, validation, and LLM orchestration run as TypeScript modules in the browser. Plans are persisted to OneDrive - Personal via the Microsoft Graph API (frontend-initiated). NDJSON export/import (FR-9) and OneDrive storage integration (FR-14) are the persistence mechanisms. No database layer is required in v1.
* **PDF extraction uses text-layer parsing.** Scanned-image-only PDFs without a text layer are not supported in v1.
* **Tax data is advisory, not authoritative.** The system helps organize and check tax data but is not a substitute for professional tax preparation software or advice.

### 4.2 Out of Scope (v1)

* Brokerage sync
* OAuth multi-user account system (optional future)
* Real-time market feeds
* Portfolio execution automation
* Pre-retirement contribution/accumulation modeling
* Deep-tail Monte Carlo copula modeling (future)
* IRS/state e-file integration
* OCR for image-only scanned PDFs

---

## 5. High-Level Architecture

## 5.1 Application (Client-Side SPA)

* Framework: React + TypeScript
* **Design system: Fluent UI React v9** (`@fluentui/react-components`) — Microsoft's Fluent Design Language
* Theme: `FluentProvider` with `webLightTheme` / `webDarkTheme`; custom brand ramp for app identity
* Forms: React Hook Form + Zod (with Fluent `Input`, `Field`, `Combobox`, `Select`, `DatePicker` components)
* State: Redux Toolkit or Zustand
* Charts: Recharts (or equivalent), styled to align with Fluent Design tokens (color, typography, spacing)
* Routing: React Router
* Icons: `@fluentui/react-icons` (Fluent System Icons)
* Accessibility baseline: WCAG 2.1 AA (Fluent UI components provide built-in keyboard, ARIA, and focus management)
* **PDF extraction: pdf.js** (client-side text-layer parsing). All PDF processing happens in the browser — raw PDF content never leaves the client.
* **OneDrive integration: MSAL.js** (`@azure/msal-browser`) + Microsoft Graph JS SDK (`@microsoft/microsoft-graph-client`). The SPA owns OneDrive auth and all file I/O. See FR-14.
* **Offline cache: IndexedDB** (via Dexie.js or idb) for local caching of plan data with sync-on-reconnect to OneDrive.
* **Computation engine:** Client-side TypeScript modules for retirement simulation, tax computation, and import validation. Web Workers SHOULD be used for heavy operations (Monte Carlo 10k+ runs).
* **Schema validation:** Zod for runtime validation of all data structures and NDJSON records.
* **Claude LLM integration:** Anthropic JS SDK (`@anthropic-ai/sdk`) or direct `fetch` to Claude API, using the user's own API key stored in IndexedDB. See §10.
* **PII stripping:** Client-side prompt builder strips personally identifiable information before sending to Claude API.

## 5.2 Deployment

* **Static hosting only** — the application is deployed as a static SPA (HTML, CSS, JS bundles). Any static hosting provider is suitable (Azure Static Web Apps, GitHub Pages, Netlify, Vercel, or a simple CDN).
* There is no backend server, application server, or API server. The server's sole responsibility is serving static files.

> **Architectural note:** There is no backend. The SPA handles all I/O (OneDrive, PDF extraction, local caching), all computation (retirement simulation, tax analysis, import validation), and all external API calls (Claude API with user's own key). Customer data stays in the browser and saves directly to OneDrive. This keeps user data within the client security context.

## 5.3 Shared Packages

A shared domain package MUST contain:

* Canonical TypeScript types (shared data corpus types used by both tax and retirement modules)
* NDJSON schemas
* Validation functions
* Version constants and migration helpers
* Tax document type definitions and extraction templates

## 5.4 Data Assets

* Historical returns dataset(s) — see FR-6 for required format
* State tax parameter dataset(s), including SS taxation exemptions by state
* Scenario preset definitions (historical windows + stress presets)
* Social Security parameter assumptions (provisional income thresholds, taxability rules)
* IRS Uniform Lifetime Table (age → distribution period, for RMD calculation)
* Default standard deduction amounts by filing status
* Tax form templates and field mappings (W-2, 1099-INT, 1099-DIV, 1099-R, 1099-B, 1099-MISC, 1099-NEC, K-1, etc.)
* Tax filing checklist templates by filing status

### 5.4.1 IRS Uniform Lifetime Table (Required)

The engine MUST include the following RMD distribution periods (IRS Publication 590-B, 2024 revision). Stored in `data/rmd-tables/uniform-lifetime.json`:

```json
{
  "source": "IRS Uniform Lifetime Table (2024)",
  "entries": [
    { "age": 72, "distributionPeriod": 27.4 },
    { "age": 73, "distributionPeriod": 26.5 },
    { "age": 74, "distributionPeriod": 25.5 },
    { "age": 75, "distributionPeriod": 24.6 },
    { "age": 76, "distributionPeriod": 23.7 },
    { "age": 77, "distributionPeriod": 22.9 },
    { "age": 78, "distributionPeriod": 22.0 },
    { "age": 79, "distributionPeriod": 21.1 },
    { "age": 80, "distributionPeriod": 20.2 },
    { "age": 81, "distributionPeriod": 19.4 },
    { "age": 82, "distributionPeriod": 18.5 },
    { "age": 83, "distributionPeriod": 17.7 },
    { "age": 84, "distributionPeriod": 16.8 },
    { "age": 85, "distributionPeriod": 16.0 },
    { "age": 86, "distributionPeriod": 15.2 },
    { "age": 87, "distributionPeriod": 14.4 },
    { "age": 88, "distributionPeriod": 13.7 },
    { "age": 89, "distributionPeriod": 12.9 },
    { "age": 90, "distributionPeriod": 12.2 },
    { "age": 91, "distributionPeriod": 11.5 },
    { "age": 92, "distributionPeriod": 10.8 },
    { "age": 93, "distributionPeriod": 10.1 },
    { "age": 94, "distributionPeriod": 9.5 },
    { "age": 95, "distributionPeriod": 8.9 },
    { "age": 96, "distributionPeriod": 8.4 },
    { "age": 97, "distributionPeriod": 7.8 },
    { "age": 98, "distributionPeriod": 7.3 },
    { "age": 99, "distributionPeriod": 6.8 },
    { "age": 100, "distributionPeriod": 6.4 },
    { "age": 101, "distributionPeriod": 6.0 },
    { "age": 102, "distributionPeriod": 5.6 },
    { "age": 103, "distributionPeriod": 5.2 },
    { "age": 104, "distributionPeriod": 4.9 },
    { "age": 105, "distributionPeriod": 4.6 },
    { "age": 106, "distributionPeriod": 4.3 },
    { "age": 107, "distributionPeriod": 4.1 },
    { "age": 108, "distributionPeriod": 3.9 },
    { "age": 109, "distributionPeriod": 3.7 },
    { "age": 110, "distributionPeriod": 3.5 },
    { "age": 111, "distributionPeriod": 3.4 },
    { "age": 112, "distributionPeriod": 3.3 },
    { "age": 113, "distributionPeriod": 3.1 },
    { "age": 114, "distributionPeriod": 3.0 },
    { "age": 115, "distributionPeriod": 2.9 },
    { "age": 116, "distributionPeriod": 2.8 },
    { "age": 117, "distributionPeriod": 2.7 },
    { "age": 118, "distributionPeriod": 2.5 },
    { "age": 119, "distributionPeriod": 2.3 },
    { "age": 120, "distributionPeriod": 2.0 }
  ]
}
```

For ages above 120, use `distributionPeriod = 2.0`. For ages below 72, no RMD applies (RMDs start at 73 per SECURE 2.0).

### 5.4.2 Standard Deduction Defaults (2025 Tax Year)

Stored in `data/ss-parameters/standard-deductions.json`. Values SHOULD be updated annually.

| Filing Status | Standard Deduction (2025) |
|---|---|
| `single` | $15,000 |
| `mfj` | $30,000 |
| `survivor` | $30,000 (same as MFJ) |

Additional: filers age 65+ receive an extra $1,550 (single) or $1,300 (MFJ, per qualifying person). The engine SHOULD apply the age-based increase automatically based on the person's age in each simulation year.

### 5.4.3 State Tax Parameter Dataset

Stored in `data/state-tax/states.json`. Required fields per entry: `stateCode`, `stateName`, `incomeRate` (top marginal effective %, simplified for v1), `capitalGainsRate` (effective %), `ssTaxExempt` (boolean), `notes` (optional). Rates are approximate top-marginal effective rates suitable for the v1 effective-rate model; bracket-level modeling is a future enhancement.

The full dataset (50 states + DC):

| Code | State | Income % | Cap Gains % | SS Exempt | Notes |
|---|---|---|---|---|---|
| AL | Alabama | 5.0 | 5.0 | Yes | |
| AK | Alaska | 0 | 0 | Yes | No income tax |
| AZ | Arizona | 2.5 | 2.5 | Yes | Flat rate |
| AR | Arkansas | 4.4 | 4.4 | Yes | |
| CA | California | 13.3 | 13.3 | Yes | Highest state rate; no separate CG rate |
| CO | Colorado | 4.4 | 4.4 | Partial | SS exempt if age 65+; partial 55–64 |
| CT | Connecticut | 6.99 | 6.99 | Partial | SS exempt below AGI threshold |
| DE | Delaware | 6.6 | 6.6 | Yes | |
| FL | Florida | 0 | 0 | Yes | No income tax |
| GA | Georgia | 5.49 | 5.49 | Yes | |
| HI | Hawaii | 11.0 | 7.25 | Yes | Separate CG rate |
| ID | Idaho | 5.8 | 5.8 | Yes | |
| IL | Illinois | 4.95 | 4.95 | Yes | Flat rate |
| IN | Indiana | 3.05 | 3.05 | Yes | Flat rate |
| IA | Iowa | 5.7 | 5.7 | Yes | |
| KS | Kansas | 5.7 | 5.7 | Partial | SS exempt below AGI $75k |
| KY | Kentucky | 4.0 | 4.0 | Yes | Flat rate |
| LA | Louisiana | 4.25 | 4.25 | Yes | |
| ME | Maine | 7.15 | 7.15 | Yes | |
| MD | Maryland | 5.75 | 5.75 | Yes | |
| MA | Massachusetts | 5.0 | 9.0 | Yes | Higher rate on short-term CG and income >$1M |
| MI | Michigan | 4.25 | 4.25 | Yes | Flat rate |
| MN | Minnesota | 9.85 | 9.85 | Partial | SS taxed following federal rules |
| MS | Mississippi | 5.0 | 5.0 | Yes | |
| MO | Missouri | 4.95 | 4.95 | Partial | SS exempt below AGI $85k (MFJ) |
| MT | Montana | 6.75 | 6.75 | Partial | Partial SS exemption |
| NE | Nebraska | 6.64 | 6.64 | Partial | SS phasing to full exemption by 2025 |
| NV | Nevada | 0 | 0 | Yes | No income tax |
| NH | New Hampshire | 0 | 0 | Yes | Interest/dividend tax repealed 2025 |
| NJ | New Jersey | 10.75 | 10.75 | Yes | SS exempt |
| NM | New Mexico | 5.9 | 5.9 | Partial | SS exempt below $100k (MFJ) |
| NY | New York | 10.9 | 10.9 | Yes | Includes NYC surcharge for NYC residents |
| NC | North Carolina | 4.5 | 4.5 | Yes | Flat rate |
| ND | North Dakota | 2.5 | 2.5 | Partial | SS taxed following federal rules |
| OH | Ohio | 3.5 | 3.5 | Yes | |
| OK | Oklahoma | 4.75 | 4.75 | Yes | |
| OR | Oregon | 9.9 | 9.9 | Yes | No sales tax; higher income tax |
| PA | Pennsylvania | 3.07 | 3.07 | Yes | Flat rate |
| RI | Rhode Island | 5.99 | 5.99 | Partial | SS exempt below AGI threshold |
| SC | South Carolina | 6.4 | 6.4 | Yes | |
| SD | South Dakota | 0 | 0 | Yes | No income tax |
| TN | Tennessee | 0 | 0 | Yes | No income tax |
| TX | Texas | 0 | 0 | Yes | No income tax |
| UT | Utah | 4.65 | 4.65 | Partial | SS taxed but tax credit offsets for lower income |
| VT | Vermont | 8.75 | 8.75 | Partial | SS taxed following federal rules |
| VA | Virginia | 5.75 | 5.75 | Yes | |
| WA | Washington | 0 | 7.0 | Yes | No income tax; 7% CG tax on gains >$270k |
| WV | West Virginia | 6.5 | 6.5 | Partial | SS phasing to full exemption |
| WI | Wisconsin | 7.65 | 7.65 | Yes | |
| WY | Wyoming | 0 | 0 | Yes | No income tax |
| DC | District of Columbia | 10.75 | 10.75 | Yes | |

When the user selects a state, the engine SHOULD pre-populate `TaxConfig.stateEffectiveRatePct` from `incomeRate` and apply the `ssTaxExempt` flag to the SS taxation calculation (§FR-3). Users MAY override the rate.

### 5.4.4 Application Config (`config.ndjson`)

The `FinPlanner/config.ndjson` file in OneDrive stores application-level settings (not financial data):

```
{"_type":"header","schemaVersion":"3.0.0","exportedAt":"...","modules":["config"]}
{"_type":"appConfig","theme":"light","claudeModelId":"claude-sonnet-4-5-20250929","anomalyThresholdPct":25,"anomalyThresholdAbsolute":5000,"confidenceThreshold":0.80,"lastSyncTimestamp":"..."}
```

The `appConfig` record contains user preferences and tunable thresholds. The Claude API key is NOT stored here — it is in IndexedDB only.

## 5.5 Storage Layer

The storage architecture has two tiers: a local IndexedDB cache for fast access and offline support, and OneDrive - Personal as the durable cloud store. The **SPA owns both tiers** — there is no backend.

* **Cloud storage:** OneDrive - Personal via Microsoft Graph API (frontend-initiated)
* **Local cache:** IndexedDB (via Dexie.js or idb library) for offline-capable access
* **Auth:** MSAL.js (`@azure/msal-browser`) with PKCE authorization code flow
* **Required Microsoft Graph permission scopes (delegated):**
  * `Files.ReadWrite` — read/write files in user's OneDrive
  * `User.Read` — basic user profile for display
* **Storage path convention:** `FinPlanner/` root folder in OneDrive containing subfolders per §7.4
* **Sync strategy:**
  1. All writes go to IndexedDB first (immediate), then sync to OneDrive (async).
  2. On app load, the frontend compares IndexedDB timestamps with OneDrive `lastModifiedDateTime` per file.
  3. **Conflict resolution:** Last-write-wins based on `lastModifiedDateTime`. If OneDrive has a newer file, it overwrites the local cache. If local is newer (offline edits), it pushes to OneDrive.
  4. The UI MUST surface sync conflicts to the user when both sides have diverged (both modified since last sync) and allow the user to choose which version to keep.
  5. On network failure, the app operates fully from IndexedDB. Sync resumes automatically on reconnect with exponential backoff.
* There is no backend to persist data or access OneDrive — the SPA is the sole data mediator

## 5.6 Security Architecture

* **Data residency:** All user financial data MUST remain within the user security context (local app runtime + OneDrive - Personal)
* **LLM analysis exception:** When the user explicitly requests LLM analysis (tax advice, retirement advice, anomaly detection), the SPA MAY send **summarized, structured context** to the Claude API using the user's own API key. Raw documents (e.g., full PDF content) MUST NOT be sent; only extracted structured fields are permitted. Claude API calls originate directly from the browser.
* **Data minimization for LLM:** The system MUST send only the minimum data required for the specific analysis request. The prompt builder MUST strip personally identifiable information (names, SSNs, addresses) before sending to the LLM.
* **No third-party data sharing:** Beyond the Claude API for explicit LLM analysis, data MUST NOT be transmitted to any external service.
* **Exported NDJSON files** are written to OneDrive - Personal and remain within the user security context. They are formatted for consumption by other local LLM agents.

## 5.7 Build Tooling and Monorepo

* **Package manager:** pnpm (workspace protocol for monorepo)
* **Build tool:** Vite (for the SPA; fast dev server and production bundler)
* **Monorepo orchestrator:** Turborepo (for task caching, dependency-aware builds, and parallel execution across packages)
* **TypeScript:** Strict mode (`"strict": true`) across all packages
* **Linting:** ESLint with `@typescript-eslint` and Fluent UI recommended rules
* **Formatting:** Prettier
* **Testing:** Vitest (compatible with Vite, supports jsdom/happy-dom for browser-like environment)
* **Pre-commit:** lint-staged + Husky (lint and typecheck changed files)

---

## 6. Functional Requirements

## FR-1 Household and Demographics

### Requirements

The system MUST capture:

* Primary current age
* Spouse current age (when married)
* Retirement ages
* Life expectancy assumptions
* Marital status and filing status
* State of residence

The system MUST model:

* Year-by-year ages for primary/spouse
* Joint phase and survivor phase transitions

### Acceptance Criteria

* Given valid ages and horizon, simulation returns yearly rows with incremented ages.
* Survivor phase rows are clearly marked.
* Changing state impacts tax outputs.

---

## FR-2 Account Modeling (Taxable, 401k/Tax-Deferred, Deferred Comp)

### Requirements

The system MUST support account types:

* `taxable` (regular account)
* `taxDeferred` (401k/traditional pre-tax)
* `deferredComp` (NQDC)

The system SHOULD support:

* `roth` (recommended — see Roth-specific rules below)

Per account, system MUST support:

* Current balance
* Owner
* Return assumption
* Fee drag
* Basis (for taxable)
* Deferred comp schedule fields (for NQDC)

The system MUST track withdrawals by account and year.

### NQDC Distribution Mechanics

NQDC (deferred compensation) accounts represent unfunded employer obligations with irrevocable distribution elections. The engine MUST enforce the following:

1. NQDC distributions are **mandatory scheduled income**, not discretionary withdrawals. They occur in the years and amounts defined by `deferredCompSchedule` regardless of the user's withdrawal strategy.
2. Each scheduled distribution **reduces the NQDC account balance** by the distribution amount.
3. NQDC account returns are **notional** — they are credited to the balance to model employer-credited growth, but the engine treats them identically to real returns for balance tracking purposes.
4. If the cumulative scheduled distributions would exceed the remaining balance, the engine MUST cap the distribution at the remaining balance and flag the shortfall in diagnostics.
5. Any balance remaining after the schedule ends is distributed as a lump sum in the year following the schedule's `endYear`. (This covers schedule misconfiguration.)
6. All NQDC distributions are treated as **ordinary income** for tax purposes.

### Cost Basis Tracking (Taxable Accounts)

For taxable accounts, the engine MUST track cost basis year-over-year:

1. **Gain fraction** for a withdrawal: `gainFraction = max(0, (currentBalance - costBasis) / currentBalance)`.
2. **Taxable gain** on a withdrawal of amount `W`: `taxableGain = W * gainFraction`. The remainder (`W - taxableGain`) is a tax-free return of basis.
3. **Basis reduction** after withdrawal: `newBasis = costBasis - (W * (1 - gainFraction))` (i.e., basis decreases proportionally).
4. Taxable gains are subject to the `capGainsRatePct`. Return of basis is not taxed.
5. Account growth does **not** increase cost basis (unrealized gains grow, basis stays fixed).

### Required Minimum Distributions (RMDs)

For `taxDeferred` accounts, the engine MUST enforce Required Minimum Distributions:

1. RMDs begin in the year the account owner reaches age **73** (SECURE 2.0 Act rules).
2. The annual RMD amount is calculated as: `RMD = accountBalance / distributionPeriod`, where `distributionPeriod` is looked up from the IRS Uniform Lifetime Table based on the owner's age. (If the sole beneficiary is a spouse more than 10 years younger, the Joint Life Table MAY be used.)
3. RMDs are **mandatory withdrawals** — they occur even if the withdrawal strategy would not otherwise draw from tax-deferred accounts. They count toward the spending target.
4. RMD amounts are treated as **ordinary income** for tax purposes.
5. If the withdrawal strategy already withdraws more than the RMD from a tax-deferred account in a given year, no additional forced withdrawal is needed.
6. The engine MUST include the Uniform Lifetime Table as a data asset (an array of age → distribution period mappings).

### Roth Account Rules (if implemented)

If `roth` accounts are implemented, the engine MUST enforce:

1. **Qualified distributions** (owner age ≥ 59½ and account open ≥ 5 years) are **completely tax-free** — no federal or state tax.
2. **Non-qualified distributions** are taxed only on the earnings portion (contributions come out first, tax-free). In v1, the engine MAY simplify by treating all Roth distributions as qualified if the owner is ≥ 59½ (typical retirement planning scenario).
3. **No RMDs for Roth IRAs.** As of SECURE 2.0 Act (2024+), Roth 401(k) accounts also have no RMDs. The engine MUST NOT generate RMDs for Roth accounts.
4. **Roth conversions** are out of scope for v1's simulation engine (but MAY be suggested by the LLM advice module as a tax strategy).
5. Roth withdrawals are last in the default `taxOptimized` withdrawal ordering (since they're tax-free, they're most valuable to preserve).

### Acceptance Criteria

* User can create at least one of each required account type.
* NQDC distributions occur in configured years and amounts.
* NQDC distribution is capped and flagged when balance is insufficient.
* Cost basis decreases proportionally with taxable account withdrawals.
* RMDs are enforced starting at age 73 for tax-deferred accounts.
* Output contains per-account withdrawal data.

---

## FR-3 Social Security Modeling

### Requirements

The system MUST:

* Accept SS claiming age per person
* Accept PIA or estimated claim-age monthly benefit
* Apply COLA
* Model household SS income through joint and survivor phases
* Apply simplified survivor logic in v1 (survivor receives higher applicable benefit)
* SS benefits begin in the calendar year the person reaches their `claimAge`
* SS benefits are annualized: `annualBenefit = estimatedMonthlyBenefitAtClaim * 12`, then grown by `colaPct` each year after the claim year

### Social Security Taxation

In v1, the engine MUST apply simplified SS taxation:

1. Compute **provisional income**: `provisionalIncome = otherTaxableIncome + 0.5 * socialSecurityIncome`.
2. Determine the taxable fraction of SS income using these thresholds (MFJ; single thresholds are half):
   * If `provisionalIncome ≤ $32,000`: 0% of SS is taxable.
   * If `$32,000 < provisionalIncome ≤ $44,000`: up to 50% of SS is taxable.
   * If `provisionalIncome > $44,000`: up to 85% of SS is taxable.
3. The taxable portion of SS is added to **ordinary income** for federal tax calculation.
4. State taxation of SS varies by state. In v1, the engine SHOULD use the state effective rate on the same taxable portion. States that exempt SS from taxation SHOULD be reflected in the state tax dataset.

### Acceptance Criteria

* Modifying claim age changes benefit timeline.
* Survivor phase reflects survivor benefit logic.
* SS shown as separate income component in results.
* SS taxation varies based on provisional income level.

---

## FR-4 Taxes (Federal + State)

### Requirements

The system MUST:

* Apply federal tax effect and state tax effect
* At minimum support effective-rate modeling for both
* Separate ordinary-income and capital-gain impacts at simplified level
* Produce separate annual tax outputs: federal and state
* Account for the **standard deduction** before applying the effective tax rate. The engine MUST subtract the applicable standard deduction from ordinary income before computing federal tax. The default standard deduction value SHOULD reflect current tax law and MAY be overridden via `TaxConfig.standardDeductionOverride`.

### Income Classification for Tax Purposes

The engine MUST classify income sources as follows:

| Source | Tax Treatment |
|---|---|
| `taxDeferred` withdrawals (401k) | Ordinary income |
| `deferredComp` distributions (NQDC) | Ordinary income |
| `taxable` account withdrawals — gain portion | Capital gains (use `capGainsRatePct`) |
| `taxable` account withdrawals — basis portion | Not taxed |
| `roth` qualified withdrawals | Not taxed |
| Social Security | Partially taxable (see FR-3 SS taxation rules) |
| Pensions / other income streams with `taxable: true` | Ordinary income |
| RMDs | Ordinary income (subset of taxDeferred withdrawals) |

### Federal Tax Computation (Effective Rate Model)

1. Sum all ordinary income sources.
2. Add the taxable portion of Social Security (per FR-3).
3. Subtract the standard deduction (or override value).
4. Apply `federalEffectiveRatePct` to the result (floored at 0).
5. Separately apply `capGainsRatePct` to capital gains from taxable account withdrawals.
6. `taxesFederal = ordinaryTax + capitalGainsTax`.

### State Tax Computation (Effective Rate Model)

1. Apply `stateEffectiveRatePct` to the same taxable ordinary income (after standard deduction).
2. State capital gains treatment: apply the state effective rate to capital gains (most states tax capital gains as ordinary income).
3. If `stateModel` is `"none"`, state tax is 0.

The system SHOULD:

* Add bracket-level modeling in future versions
* Inflate the standard deduction annually by the inflation assumption

### Acceptance Criteria

* Same plan with different states yields differing state tax values when rates differ.
* Results include `taxesFederal` and `taxesState`.
* Net spendable reflects tax deductions.
* Standard deduction reduces effective tax for lower-income years.
* Capital gains from taxable withdrawals are taxed at `capGainsRatePct`, not the ordinary rate.

---

## FR-5 Income, Spending, and Cashflow

### Requirements

The system MUST support:

* Target spending
* Inflation assumption
* Additional income streams (e.g., pension/annuity), each with an `owner` field for survivor phase handling
* One-time or multi-year adjustments (income or expenses) via the `Adjustment` type
* Configurable **survivor spending adjustment factor** (e.g., 0.70 = 70% of joint-phase spending)

### Adjustment Type

The system MUST support an `Adjustment` type for modeling one-time or time-bounded income and expenses that don't fit the recurring income stream model. Examples: home sale proceeds, large medical expense, home renovation, inheritance.

* Positive amounts represent income; negative amounts represent expenses.
* Adjustments with `taxable: true` are included in taxable income for the year(s) they occur.
* Adjustments are applied during the cashflow step, before withdrawal solving.

### Income Stream Survivor Behavior

Each `IncomeStream` has an `owner` field:

* When the owner exits the model horizon (dies), the income stream **stops** — unless `survivorContinues: true` is set.
* `"joint"` income streams continue as long as either person is alive.

The engine MUST produce:

* Yearly gross income
* Withdrawals
* Taxes
* Net spendable
* Shortfall/surplus
* End balances by account

### Acceptance Criteria

* Spending grows per inflation assumption unless user config says real-dollar fixed.
* Shortfall years are explicitly flagged.
* End balances reconcile mathematically for each year.
* Survivor phase spending reflects the survivor adjustment factor.
* One-time adjustments (positive and negative) appear in the correct year(s).
* Income streams owned by the deceased spouse stop in survivor phase (unless survivorContinues).

---

## FR-5a Guardrail / Dynamic Spending Rules

### Requirements

When `StrategyConfig.guardrailsEnabled` is `true` and `SpendingPlan.floorAnnualSpend` / `ceilingAnnualSpend` are set, the engine MUST apply dynamic spending adjustment:

1. **Ceiling rule:** If the portfolio's total balance at start-of-year exceeds **20× the ceiling spend** (suggesting very strong portfolio health), spending for that year is capped at `ceilingAnnualSpend` (inflation-adjusted). This prevents runaway spending in good markets.
2. **Floor rule:** If the withdrawal rate implied by the spending target would exceed **6% of total portfolio balance**, spending is reduced to `floorAnnualSpend` (inflation-adjusted). This protects against portfolio depletion.
3. **Normal band:** Between these triggers, the inflation-adjusted `targetAnnualSpend` is used as-is.
4. The actual spending amount used (after guardrail adjustment) MUST be recorded in `YearResult` for transparency.

When `guardrailsEnabled` is `false`, `floorAnnualSpend` and `ceilingAnnualSpend` are ignored and the inflation-adjusted target is always used.

### Acceptance Criteria

* Guardrails reduce spending in poor portfolio years and cap it in strong years.
* Actual spend vs. target spend is visible in yearly results.
* Disabling guardrails uses the unadjusted inflation-grown target.

---

## FR-6 Market Modeling, Historical Replay, and Stress Scenarios

### Requirements

The system MUST support simulation modes:

1. **Deterministic** (fixed assumptions)
2. **Historical Replay** (sequence-of-returns from historical windows)
3. **Stress Presets** (minimum required):

   * Early retirement drawdown
   * High inflation decade
   * Low return regime

The system MAY include baseline Monte Carlo in v1.

### Historical Scenario Interaction with Account Returns

In **deterministic** mode, each account uses its own `expectedReturnPct`.

In **historical replay** and **stress** modes, the engine MUST override account returns as follows:

1. Each historical/stress scenario provides a **yearly market return sequence** (e.g., S&P 500 total return for each year).
2. A **baseline expected return** is derived from the plan's `MarketConfig.deterministicReturnPct` (or the weighted average of account returns if not set).
3. For each account and each year, the scenario return is applied as: `accountReturn = scenarioMarketReturn + (account.expectedReturnPct - baselineReturn)`. This preserves each account's relative offset from the market (e.g., a bond-heavy account with lower expected return stays below the market return even in historical replay).
4. The scenario inflation sequence (if available in the historical data) replaces `deterministicInflationPct` for that year. If the scenario does not include inflation data, the plan's inflation assumption is used.

### Historical Data Format

Each historical scenario dataset MUST provide:

* `id`: unique identifier (e.g., `"gfc_2008"`)
* `name`: human-readable label
* `startYear` / `endYear`: the real-world years of the historical window
* `returns`: array of annual total market return percentages (one per year in the window)
* `inflation` (optional): array of annual inflation percentages

### Acceptance Criteria

* User can run deterministic and at least one historical/stress scenario.
* Comparison output displays key delta metrics across scenarios.
* Stress scenarios can materially affect success/shortfall outcomes.
* In historical replay, accounts with different expected returns maintain their relative differences.

---

## FR-7 Withdrawal Strategy

### Requirements

System MUST support strategy options:

* Taxable-first
* Tax-deferred-first
* Pro-rata
* Tax-optimized heuristic (default recommended)

Tax-optimized heuristic MUST:

* Attempt to minimize current-year tax burden
* Respect spending target constraints
* Consider simple look-ahead to avoid future tax cliffs (heuristic acceptable)

### Tax-Optimized Withdrawal Algorithm (v1)

The `taxOptimized` strategy uses the following greedy algorithm after mandatory income (RMDs, SS, NQDC, pensions) has been applied:

```
1. Compute remainingGap = withdrawalTarget (after mandatory income)
2. If remainingGap <= 0: done (mandatory income covers spending)

3. FILL THE 0% BRACKET — Withdraw from taxDeferred accounts up to the
   amount that keeps taxable ordinary income at or below the standard
   deduction. This withdrawal is effectively tax-free.
   remainingGap -= amountWithdrawn

4. RETURN OF BASIS — Withdraw from taxable accounts up to the
   available cost basis (the non-taxable portion). This generates no
   taxable income. Use gainFraction to compute the tax-free portion:
   taxFreeAvailable = min(remainingGap, accountBalance * (1 - gainFraction))
   remainingGap -= amountWithdrawn

5. FILL LOW BRACKETS — Withdraw from taxDeferred accounts up to the
   amount that keeps total ordinary income below the next marginal
   bracket threshold (using the effective-rate model in v1: withdraw
   until adding more would push the blended rate above the current
   federalEffectiveRatePct by more than 2 percentage points).
   remainingGap -= amountWithdrawn

6. CAPITAL GAINS — Withdraw from taxable accounts (taxed at
   capGainsRatePct, typically lower than ordinary rate). Use gain
   portion of withdrawal.
   remainingGap -= amountWithdrawn

7. REMAINING TAX-DEFERRED — Withdraw any remaining gap from
   taxDeferred accounts (taxed as ordinary income).
   remainingGap -= amountWithdrawn

8. ROTH LAST — Withdraw from Roth accounts only if all other sources
   are exhausted (tax-free, most valuable to preserve).
   remainingGap -= amountWithdrawn

9. If remainingGap > 0: record shortfall.
```

**Look-ahead heuristic:** Before step 5, if the account owner is within 3 years of RMD age and has large `taxDeferred` balances, the engine SHOULD increase the step-5 withdrawal amount by up to 20% to reduce future RMD-driven tax spikes. This "RMD smoothing" is optional but recommended.

**Diagnostics:** The engine MUST record which step each withdrawal came from in `YearResult` diagnostics so the rationale is explainable in the UI.

### RMD Interaction with Withdrawal Strategy

Regardless of the selected withdrawal strategy:

1. The engine MUST compute RMDs for all `taxDeferred` accounts before solving discretionary withdrawals.
2. RMD amounts are **mandatory** and are withdrawn first.
3. RMDs count toward the spending target — if RMDs alone meet or exceed the spending target, no additional discretionary withdrawals are needed.
4. The withdrawal strategy solver operates on the **remaining spending gap** after RMDs and other mandatory/scheduled income (SS, NQDC distributions, pensions).

### Withdrawal Target Formula

The withdrawal solver MUST compute the target as:

```
withdrawalTarget = inflatedSpendingTarget + estimatedTaxes
                   - socialSecurityIncome
                   - nqdcDistributions
                   - pensionAndOtherIncome
                   - adjustments (net)
                   - rmdAmountsAlreadyWithdrawn
```

Because taxes depend on the withdrawal mix and the withdrawal mix depends on taxes, the engine MUST use an **iterative approach** (converging within 2–3 iterations is acceptable) or a reasonable tax-estimate heuristic to break the circularity.

### Acceptance Criteria

* Strategy choice changes withdrawal mix and taxes in output.
* Tax-optimized strategy produces explainable rationale fields in diagnostics.
* RMDs are satisfied before discretionary withdrawals.
* Withdrawal target correctly accounts for all income sources.

---

## FR-8 Claude LLM Analysis (Tax + Retirement Advice)

### Requirements

The system MUST:

* Integrate Claude via a client-side module using the user's own API key (stored in IndexedDB only)
* Send structured summarized model context + constraints (never raw documents or PII)
* Enforce strict JSON schema on Claude response
* Retry once on schema-invalid output
* Fallback to deterministic rules-based advice on repeated failure (see fallback rules below)
* Support **two advice domains:**
  1. **Portfolio/Retirement optimization** — asset allocation, withdrawal strategy, scenario analysis
  2. **Tax strategy analysis** — anomaly explanation, checklist insights, tax optimization suggestions, year-over-year trend analysis

**API key management:**

* The SPA MUST provide a settings UI for the user to enter, update, and delete their Claude API key.
* The API key MUST be stored in IndexedDB only — never in localStorage, sessionStorage, URLs, cookies, or exported NDJSON files.
* The API key MUST NOT be synced to OneDrive or included in any data export.
* On first entry, the system MUST validate the API key by making a lightweight Claude API call.
* The system MUST use the Anthropic JS SDK (`@anthropic-ai/sdk`) or direct `fetch` to the Claude API with appropriate CORS handling.

**Graceful degradation without API key:**

* If no API key is configured, all LLM-powered features (portfolio advice, tax strategy advice, checklist insights, anomaly contextual analysis) MUST be unavailable, with a clear UI message directing the user to the settings page.
* All rule-based features MUST function fully without an API key: retirement simulation, tax computation, checklist generation (rule-based), anomaly detection (rule-based), NDJSON export/import, OneDrive sync.
* The deterministic fallback advice (see below) MUST always be available regardless of API key presence.

**Data minimization for LLM calls:**

* The client-side prompt builder MUST strip PII (names, SSNs, EINs, addresses) before sending to Claude.
* Only aggregated/summarized financial figures are sent, not raw document content.
* The user MUST be informed when data is being sent to the LLM (UI indicator).

Advice response MUST include:

* Recommendations
* Rationale
* Expected impact
* Trade-offs
* Risk flags
* Sensitivity notes
* Mandatory disclaimer:

  * "Educational planning guidance, not investment/tax/legal advice."

### Deterministic Fallback Advice

When the LLM fails twice (invalid schema both times), the system MUST return a deterministic fallback advice object generated by rules-based logic:

**Retirement fallback rules:**

1. If any shortfall years exist: flag "Portfolio may not sustain planned spending through full horizon."
2. If withdrawal rate > 4% in year 1: flag "Initial withdrawal rate exceeds commonly cited 4% guideline."
3. If taxable-first strategy is selected and tax-deferred balances are large: suggest "Consider tax-optimized strategy to manage RMD tax impact."
4. If no stress scenarios have been run: suggest "Run stress scenarios to evaluate downside risk."
5. Always include: disclaimer, a recommendation to consult a financial advisor, and an explanation that AI-generated advice was unavailable.

**Tax fallback rules:**

1. If any checklist items are `pending`: flag "Some expected documents are still missing — review checklist."
2. If any anomalies have severity `critical`: flag "Critical anomalies detected — review before filing."
3. If estimated tax payments appear low relative to computed liability: suggest "Review estimated payment adequacy to avoid underpayment penalties."
4. Always include: disclaimer and explanation that AI-generated advice was unavailable.

The fallback response MUST use the same response schema as the LLM-generated response, with `"source": "fallback"` added to each recommendation.

### Acceptance Criteria

* Valid structured advice renders in UI for both tax and retirement domains.
* Invalid LLM output triggers retry then fallback.
* Fallback advice is rules-based and conforms to the same response schema.
* API key is stored in IndexedDB only and never appears in exported NDJSON, OneDrive files, localStorage, or URLs.
* PII never appears in LLM prompts or exported NDJSON.
* User sees an indicator when data is transmitted to the LLM.
* Application functions fully without a Claude API key (rule-based features work, LLM features show "API key required" message).

---

## FR-9 NDJSON Export/Import

### Requirements

The system MUST use **NDJSON (Newline-Delimited JSON)** as the standard format for all data storage and export, replacing traditional JSON. Each line in an NDJSON file is a self-contained JSON object with a `_type` discriminator field.

System MUST export:

* Full plan input (retirement)
* Tax records (all years)
* Shared data corpus (household, accounts, income)
* Assumptions
* Optional results
* `schemaVersion` (in a header line)

NDJSON format specification:

```
{"_type":"header","schemaVersion":"3.0.0","exportedAt":"2026-02-15T...","modules":["tax","retirement"]}
{"_type":"household","maritalStatus":"married","filingStatus":"mfj",...}
{"_type":"account","id":"acct-401k","name":"401k",...}
{"_type":"incomeStream","id":"pension-primary",...}
{"_type":"taxYear","year":2025,"status":"filed",...}
{"_type":"taxDocument","taxYear":2025,"formType":"W-2",...}
{"_type":"retirementPlan","spending":{...},"market":{...},...}
{"_type":"simulationResult","scenario":"deterministic","yearly":[...]}
```

Each line MUST be a valid JSON object. The `_type` field MUST be present on every line. The first line MUST be of `_type: "header"`.

System MUST provide:

* Schema validation on import (per-line validation with line-number error reporting)
* Human-readable validation errors with field paths and line numbers
* Migration hook for older schema versions
* Selective import (e.g., import only tax data, only retirement data, or both)
* **LLM-agent-friendly export:** The NDJSON format is designed so that another LLM agent can stream-process lines, filter by `_type`, and analyze the data without loading the entire dataset into memory.

### Acceptance Criteria

* Exported NDJSON validates against schema (each line independently valid).
* Export → Import roundtrip preserves plan fidelity for both tax and retirement data.
* Invalid NDJSON shows actionable error diagnostics with line numbers.
* Another LLM agent can consume the exported file by reading it line-by-line and filtering on `_type`.

---

## FR-10 Tax Year Management

### Requirements

The system MUST support managing tax records organized by tax year:

* **Create/view/edit tax records** for any tax year (historical, current, or future projected).
* Each tax year record contains: filing status, income sources, deductions, credits, tax payments, and computed tax liability.
* Tax year status tracking: `draft` (data entry in progress), `ready` (checklist complete), `filed` (return submitted), `amended`.
* The system MUST pre-populate new tax year records with data from the **shared data corpus** (household profile, known income streams, account information) to reduce manual entry.
* Tax year data MUST be editable independently — changes to one year do not retroactively alter other years.

### Shared Data Corpus Integration

The following data elements are shared between tax planning and retirement planning:

| Shared Data Element | Tax Module Usage | Retirement Module Usage |
|---|---|---|
| Household profile (filing status, state) | Filing status, state tax rates | Filing status, state tax modeling |
| Account balances and types | Report investment income, basis | Portfolio modeling, withdrawals |
| Income streams (pension, SS, etc.) | Report as taxable income | Cashflow modeling |
| Deferred comp schedules | Report NQDC distributions as income | Distribution modeling |
| Cost basis (taxable accounts) | Capital gains computation | Withdrawal tax impact |
| Standard deduction / overrides | Tax computation | Tax-aware withdrawal strategy |

When the user updates a shared data element (e.g., changes filing status), both modules MUST reflect the change. The shared corpus is the **single source of truth**.

### Propagation and Snapshot Rules

Shared corpus changes propagate **selectively** based on tax year status:

| Tax Year Status | Shared Corpus Propagation Behavior |
|---|---|
| `draft` | **Auto-propagates.** Changes to filing status, state, income streams, etc. are reflected immediately. The draft record always mirrors the current corpus. |
| `ready` | **Prompts.** Changes trigger a UI notification asking the user whether to update the ready record or keep it as-is. |
| `filed` | **Frozen snapshot.** Shared corpus changes do NOT alter filed records. Filed records represent the tax return as submitted. |
| `amended` | **Frozen snapshot.** Same as filed — the amended record is a point-in-time snapshot. |

When a new tax year record is created, it snapshots the current shared corpus values. From that point, `draft` records track corpus changes; other statuses are progressively frozen.

The retirement module ALWAYS reflects the current shared corpus (it models the future, not historical snapshots).

### Acceptance Criteria

* User can create and manage tax records for multiple years.
* New tax year pre-populates from shared data corpus.
* Changes to shared data auto-propagate to `draft` tax years.
* Changes to shared data do NOT alter `filed` or `amended` tax years.
* Changes to shared data prompt the user for `ready` tax years.
* Retirement module always reflects current shared corpus.
* Tax year status transitions are enforced (draft → ready → filed → amended).

---

## FR-11 Tax Document PDF Import

### Requirements

The system MUST support importing tax information from PDF documents:

* **Supported form types (v1):** W-2, 1099-INT, 1099-DIV, 1099-R, 1099-B, 1099-MISC, 1099-NEC, K-1, 1098 (mortgage interest).
* The system MUST extract structured data from the text layer of PDFs. Image-only PDFs are out of scope for v1.
* Extraction pipeline (all steps run **client-side in the browser**):
  1. User selects a PDF file via the UI file picker or drag-and-drop.
  2. Frontend parses the text layer using **pdf.js** and identifies form type by matching against form-type template `formIdentifiers`.
  3. Frontend extracts key fields using template `labelPatterns` and computes per-field confidence scores.
  4. Extracted data is presented in a review UI with low-confidence fields (< 0.80) visually flagged.
  5. On user confirmation, the frontend writes the PDF to OneDrive - Personal (`FinPlanner/imports/{taxYear}/`) and merges the extracted data into the tax year record and shared data corpus (e.g., a W-2 creates/updates an income entry).
  6. Raw PDF content never leaves the browser. No backend endpoint is involved in extraction.
* The system MUST flag low-confidence extractions for manual review. The default confidence threshold is **0.80** — fields extracted with confidence below this value are flagged. The threshold MAY be configurable.
* The system MUST track **per-field confidence** in addition to aggregate document confidence, so the UI can highlight specific uncertain fields.
* The system MUST NOT send raw PDF content to the LLM. Only extracted structured fields may be sent for LLM analysis if requested.
* Multiple documents for the same tax year MUST be mergeable (e.g., multiple W-2s from different employers).

### Extraction Template Format

Each supported form type has a **template** stored in `data/tax-form-templates/` as a JSON file (e.g., `w-2.json`, `1099-int.json`). Templates define how to locate and extract fields from the PDF text layer.

```json
{
  "formType": "W-2",
  "formIdentifiers": ["Wage and Tax Statement", "Form W-2"],
  "fields": [
    {
      "key": "wages",
      "label": "Wages, tips, other compensation",
      "boxNumber": "1",
      "labelPatterns": ["wages,? tips", "box 1\\b"],
      "valueType": "currency",
      "required": true
    },
    {
      "key": "federalTaxWithheld",
      "label": "Federal income tax withheld",
      "boxNumber": "2",
      "labelPatterns": ["federal income tax withheld", "box 2\\b"],
      "valueType": "currency",
      "required": true
    }
  ]
}
```

Template fields:

* `formIdentifiers`: strings that, if found in the text, identify the form type.
* `fields[].labelPatterns`: regex patterns matched against the extracted text. The extractor searches for these patterns and captures the nearest numeric/currency value.
* `fields[].valueType`: `"currency"` (parse as dollar amount), `"percentage"`, `"string"`, `"code"` (single letter/digit).
* `fields[].required`: if `true` and the field is not found, confidence is reduced and the field is flagged.

The extraction algorithm:

1. Extract full text from the PDF using pdf.js `getTextContent()`.
2. Identify form type by matching `formIdentifiers` against the text.
3. For each template field, search for `labelPatterns` in the text. When a match is found, capture the nearest value of the expected `valueType` (using positional proximity in the text flow).
4. Compute per-field confidence: 1.0 if a pattern matched unambiguously, reduced based on ambiguity (multiple matches, no match for required field, value format mismatch).
5. Aggregate confidence: average of per-field confidences.

### PDF Field Mapping (v1 Minimum)

| Form | Key Extracted Fields |
|---|---|
| W-2 | Employer name, wages (Box 1), federal tax withheld (Box 2), state wages (Box 16), state tax withheld (Box 17), SS wages (Box 3), Medicare wages (Box 5) |
| 1099-INT | Payer name, interest income (Box 1), tax-exempt interest (Box 8) |
| 1099-DIV | Payer name, ordinary dividends (Box 1a), qualified dividends (Box 1b), capital gain distributions (Box 2a) |
| 1099-R | Payer name, gross distribution (Box 1), taxable amount (Box 2a), distribution code (Box 7) |
| 1099-B | Summary proceeds, cost basis, gain/loss |
| 1099-NEC | Payer name, nonemployee compensation (Box 1) |
| K-1 | Entity name, ordinary income, rental income, interest, dividends, capital gains |
| 1098 | Lender name, mortgage interest (Box 1), property tax (Box 10) |

### Acceptance Criteria

* User can upload a PDF and see extracted fields for review.
* Confirmed extractions populate the correct tax year record.
* Low-confidence fields are visually flagged.
* Raw PDF content never leaves the user security context.
* Multiple documents for the same year merge correctly.

---

## FR-12 Tax Filing Checklist

### Requirements

The system MUST generate a **tax filing checklist** for the current tax year:

* The checklist is generated from:
  1. **Prior year data:** Income sources, deductions, and documents present in the prior year's record.
  2. **Current year data:** What has been imported/entered so far.
  3. **Shared data corpus:** Known accounts, income streams, and household changes.
* Checklist items include:
  * **Expected documents:** "W-2 from Employer X" (present last year, not yet imported this year).
  * **Income completeness:** "1099-INT expected from Bank Y" (interest-bearing account known in shared corpus).
  * **Deduction reminders:** "Mortgage interest (1098)" if applicable, charitable contributions, state/local taxes.
  * **Life event prompts:** Changes in filing status, new dependents, state moves, account changes.
  * **Filing deadlines and extensions.**
* Each checklist item MUST have a status: `pending`, `received`, `not_applicable`, `waived`.
* The system SHOULD use Claude to generate **personalized checklist insights** (e.g., "You had K-1 income last year from XYZ Partnership — have you received this year's K-1?").

### Acceptance Criteria

* Checklist is auto-generated from prior year + current year + shared corpus data.
* Each item shows status and source reasoning.
* User can mark items as received, not applicable, or waived.
* Missing items are prominently highlighted.

---

## FR-13 Year-over-Year Tax Anomaly and Omission Detection

### Requirements

The system MUST perform **year-over-year comparison** across tax records to detect:

1. **Omissions:** An income source, document, or deduction present in year N-1 but absent in year N.
   * Example: "1099-DIV from Vanguard was present in 2024 but is missing for 2025."
2. **Anomalies:** Material changes in income, deductions, or tax liability that warrant review.
   * Example: "Wage income decreased by 40% compared to last year — is this expected?"
   * Example: "State tax paid increased by 300% — verify."
3. **Pattern breaks:** Multi-year trends that are disrupted.
   * Example: "Charitable contributions were $5k–$7k for 2021–2024 but $0 for 2025."

Detection rules:

* The system MUST implement rule-based detection for common omissions (missing expected documents, dropped income sources).
* The system MUST flag items where the absolute or percentage change exceeds configurable thresholds (default: >25% change or >$5,000 absolute change).
* The system SHOULD use Claude to provide **contextual analysis** of detected anomalies, suggesting possible explanations and recommended actions.
* Anomaly results MUST be exportable as part of the NDJSON export (type `_type: "anomaly"`).

### Acceptance Criteria

* System detects when a document/income source from prior year is missing in current year.
* System flags material changes in key financial figures with threshold-based rules.
* Anomalies include severity (info/warning/critical) and suggested action.
* Claude-powered contextual analysis is available for flagged items.
* Anomaly data is included in NDJSON exports.

---

## FR-14 OneDrive Storage Integration

### Requirements

The system MUST persist all user data to **OneDrive - Personal** via the Microsoft Graph API, with the **SPA as the sole mediator** of all storage operations. There is no backend.

**Authentication:**

* The frontend MUST use **MSAL.js** (`@azure/msal-browser`) with the **PKCE authorization code flow** for user authentication.
* **Azure AD app registration:** A Single Page Application (SPA) registration is required in Azure Entra ID (formerly Azure AD) with redirect URI set to the app's origin, the `Files.ReadWrite` and `User.Read` delegated API permissions configured, and PKCE enabled. The `clientId` from this registration is passed to MSAL at initialization. Detailed setup steps MUST be documented in `docs/runbook.md`.
* Required delegated permission scopes: `Files.ReadWrite`, `User.Read`.
* Access tokens MUST be acquired silently when possible (cached), with interactive fallback (popup/redirect).
* Tokens MUST NOT be stored outside the browser's MSAL cache. There is no backend to send tokens to.

**File operations:**

* The frontend MUST use the **Microsoft Graph JS SDK** (`@microsoft/microsoft-graph-client`) for all OneDrive CRUD operations.
* On first launch, the app MUST create the `FinPlanner/` folder structure (per §7.4) if it does not exist.
* All NDJSON files are read/written as UTF-8 text using the Graph `/me/drive/root:/path:/content` endpoint.
* PDF uploads are written to `FinPlanner/imports/{taxYear}/` using the same endpoint.

**Local caching (IndexedDB):**

* The frontend MUST maintain a local IndexedDB cache mirroring the OneDrive folder structure.
* Each cached record stores: file path, content, local `lastModified` timestamp, and OneDrive `eTag`/`lastModifiedDateTime`.
* All reads are served from IndexedDB first (instant). Sync with OneDrive happens asynchronously.
* All writes go to IndexedDB immediately, then sync to OneDrive in the background.

**Sync protocol:**

1. On app load: compare local `lastModified` vs. OneDrive `lastModifiedDateTime` for each file.
2. If OneDrive is newer: pull and overwrite local cache.
3. If local is newer (offline edits): push to OneDrive.
4. If both diverged (both modified since last sync): surface a conflict dialog to the user showing both timestamps and allowing them to pick a version.
5. On network failure: operate fully from IndexedDB. Queue pending writes. Resume sync on reconnect with exponential backoff (initial 1s, max 60s).

**Offline mode:**

* The app MUST be fully functional offline for all operations except LLM advice calls (which require network).
* The UI MUST indicate offline status and pending sync count.

### Acceptance Criteria

* User can authenticate with Microsoft account and grant OneDrive permissions.
* App creates `FinPlanner/` folder structure on first use.
* Data persists across sessions via OneDrive (close browser, reopen, data is present).
* App works offline with IndexedDB; changes sync when network returns.
* Sync conflicts are surfaced to the user with a resolution dialog.
* OneDrive tokens remain in the browser's MSAL cache (there is no backend).

---

## 7. Canonical Data Model

The implementation MUST align to the following canonical model (names can vary internally, semantics MUST remain equivalent). The model is organized into **shared corpus types** (used by both tax and retirement modules) and **module-specific types**.

### 7.1 Shared Corpus Types + Retirement Types

```ts
type FilingStatus = "single" | "mfj" | "survivor";
type AccountType = "taxable" | "taxDeferred" | "deferredComp" | "roth";
type SimulationMode = "deterministic" | "historical" | "stress" | "monteCarlo";
type TaxYearStatus = "draft" | "ready" | "filed" | "amended";
type ChecklistItemStatus = "pending" | "received" | "not_applicable" | "waived";
type AnomalySeverity = "info" | "warning" | "critical";
type TaxFormType = "W-2" | "1099-INT" | "1099-DIV" | "1099-R" | "1099-B" | "1099-MISC" | "1099-NEC" | "K-1" | "1098" | "other";
type NdjsonRecordType = "header" | "household" | "account" | "incomeStream" | "adjustment" | "taxYear" | "taxDocument" | "checklistItem" | "anomaly" | "retirementPlan" | "simulationResult";

interface PersonProfile {
  id: "primary" | "spouse";
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  socialSecurity?: {
    claimAge: number;
    piaMonthlyAtFRA?: number;
    estimatedMonthlyBenefitAtClaim?: number;
    colaPct: number;
  };
}

interface HouseholdProfile {
  maritalStatus: "single" | "married";
  filingStatus: FilingStatus;
  stateOfResidence: string; // e.g., WA
  primary: PersonProfile;
  spouse?: PersonProfile;
}

interface DeferredCompSchedule {
  startYear: number;
  endYear: number;
  frequency: "annual" | "monthly";
  amount: number;
  inflationAdjusted: boolean;
}

interface Account {
  id: string;
  name: string;
  type: AccountType;
  owner: "primary" | "spouse" | "joint";
  currentBalance: number;
  costBasis?: number; // taxable accounts
  expectedReturnPct: number;
  volatilityPct?: number;
  feePct: number;
  targetAllocationPct?: number;       // target % of total portfolio (0–100); used by rebalancing. If omitted, account is excluded from rebalancing.
  deferredCompSchedule?: DeferredCompSchedule;
}

interface IncomeStream {
  id: string;
  name: string;
  owner: "primary" | "spouse" | "joint";
  startYear: number;        // calendar year
  endYear?: number;          // calendar year; omit for lifetime
  annualAmount: number;
  colaPct?: number;
  taxable: boolean;
  survivorContinues?: boolean; // if true, income continues after owner's death
}

interface Adjustment {
  id: string;
  name: string;
  year: number;              // calendar year
  endYear?: number;          // calendar year; omit for one-time
  amount: number;            // positive = income, negative = expense
  taxable: boolean;
  inflationAdjusted?: boolean;
}

interface SpendingPlan {
  targetAnnualSpend: number;
  inflationPct: number;
  floorAnnualSpend?: number;          // guardrail: minimum spend (see FR-5a)
  ceilingAnnualSpend?: number;        // guardrail: maximum spend (see FR-5a)
  survivorSpendingAdjustmentPct: number; // e.g., 0.70 = survivor spends 70% of joint target
}

interface TaxConfig {
  federalModel: "effective" | "bracket";
  stateModel: "effective" | "bracket" | "none";
  federalEffectiveRatePct?: number;
  stateEffectiveRatePct?: number;
  capGainsRatePct?: number;
  standardDeductionOverride?: number;  // overrides default; if omitted, use current-law default
}

interface MarketConfig {
  simulationMode: SimulationMode;
  deterministicReturnPct?: number;
  deterministicInflationPct?: number;
  historicalScenarioIds?: string[];
  stressScenarioIds?: string[];
  monteCarloRuns?: number;
}

interface StrategyConfig {
  withdrawalOrder: "taxableFirst" | "taxDeferredFirst" | "proRata" | "taxOptimized";
  rebalanceFrequency: "none" | "annual" | "quarterly";
  guardrailsEnabled: boolean;
}

interface PlanInput {
  schemaVersion: string;
  household: HouseholdProfile;
  accounts: Account[];
  otherIncome: IncomeStream[];
  adjustments: Adjustment[];       // one-time or time-bounded income/expense items
  spending: SpendingPlan;
  taxes: TaxConfig;
  market: MarketConfig;
  strategy: StrategyConfig;
}

interface YearResult {
  year: number;                          // calendar year
  agePrimary: number;
  ageSpouse?: number;
  isSurvivorPhase: boolean;
  filingStatus: FilingStatus;            // derived filing status for this year
  targetSpend: number;                   // inflation-adjusted target before guardrails
  actualSpend: number;                   // after guardrail adjustment (= targetSpend if guardrails off)
  grossIncome: number;
  socialSecurityIncome: number;
  nqdcDistributions: number;             // NQDC payouts for the year
  rmdTotal: number;                      // total RMDs withdrawn across all tax-deferred accounts
  withdrawalsByAccount: Record<string, number>;
  taxesFederal: number;
  taxesState: number;
  taxableOrdinaryIncome: number;         // for diagnostics
  taxableCapitalGains: number;           // for diagnostics
  netSpendable: number;
  shortfall: number;                     // positive = unmet spending; 0 = fully funded
  endBalanceByAccount: Record<string, number>;
  costBasisByAccount?: Record<string, number>; // taxable accounts only
}

interface PlanResult {
  summary: {
    successProbability?: number;
    medianTerminalValue?: number;
    worstCaseShortfall?: number;
  };
  yearly: YearResult[];
  assumptionsUsed: Record<string, unknown>;
}
```

### 7.2 Tax Planning Types

```ts
interface TaxDocument {
  id: string;
  taxYear: number;
  formType: TaxFormType;
  issuerName: string;                    // employer, payer, or entity name
  sourceFileName?: string;               // original PDF filename
  oneDrivePath?: string;                 // path in OneDrive - Personal
  extractedFields: Record<string, number | string>;  // form-specific key-value pairs
  fieldConfidence: Record<string, number>;  // per-field confidence (0.0–1.0)
  extractionConfidence: number;          // aggregate confidence (average of field confidences)
  lowConfidenceFields: string[];         // fields with confidence < threshold (default 0.80)
  confirmedByUser: boolean;
  importedAt: string;                    // ISO 8601
}

interface TaxYearIncome {
  wages: number;
  selfEmploymentIncome: number;
  interestIncome: number;
  dividendIncome: number;
  qualifiedDividends: number;
  capitalGains: number;
  capitalLosses: number;
  rentalIncome: number;
  nqdcDistributions: number;
  retirementDistributions: number;       // 1099-R
  socialSecurityIncome: number;
  otherIncome: number;
}

interface TaxYearDeductions {
  standardDeduction: number;
  itemizedDeductions?: {
    mortgageInterest: number;
    stateAndLocalTaxes: number;          // SALT, capped at $10k
    charitableContributions: number;
    medicalExpenses: number;
    other: number;
  };
  useItemized: boolean;                  // true if itemized > standard
}

interface TaxYearCredits {
  childTaxCredit: number;
  educationCredits: number;
  foreignTaxCredit: number;
  otherCredits: number;
}

interface TaxYearPayments {
  federalWithheld: number;
  stateWithheld: number;
  estimatedPaymentsFederal: number;
  estimatedPaymentsState: number;
}

interface TaxYearRecord {
  taxYear: number;
  status: TaxYearStatus;
  filingStatus: FilingStatus;            // from shared corpus, editable per year
  stateOfResidence: string;              // from shared corpus, editable per year
  income: TaxYearIncome;
  deductions: TaxYearDeductions;
  credits: TaxYearCredits;
  payments: TaxYearPayments;
  computedFederalTax: number;
  computedStateTax: number;
  computedEffectiveFederalRate: number;
  computedEffectiveStateRate: number;
  refundOrBalanceDueFederal?: number;   // computed: (federalWithheld + estimatedPaymentsFederal) - computedFederalTax; positive = refund, negative = balance due
  refundOrBalanceDueState?: number;     // computed: (stateWithheld + estimatedPaymentsState) - computedStateTax; positive = refund, negative = balance due
  documents: TaxDocument[];
  notes?: string;
}

interface ChecklistItem {
  id: string;
  taxYear: number;
  category: "document" | "income" | "deduction" | "life_event" | "deadline";
  description: string;
  status: ChecklistItemStatus;
  sourceReasoning: string;               // why this item is on the checklist
  relatedPriorYearItem?: string;         // link to prior year equivalent
  linkedDocumentId?: string;             // links to TaxDocument if received
}

interface TaxChecklist {
  taxYear: number;
  generatedAt: string;                   // ISO 8601
  items: ChecklistItem[];
  completionPct: number;                 // percentage of items with status !== "pending" (0–100)
}

interface Anomaly {
  id: string;
  taxYear: number;                       // the year being analyzed
  comparisonYear: number;                // the year compared against
  category: "omission" | "anomaly" | "pattern_break";
  severity: AnomalySeverity;
  field: string;                         // e.g., "income.wages", "documents.1099-DIV"
  description: string;
  priorValue?: number | string;
  currentValue?: number | string;
  percentChange?: number;
  suggestedAction: string;
  llmAnalysis?: string;                  // Claude-generated contextual explanation
}

interface TaxAnalysisResult {
  taxYear: number;
  checklist: TaxChecklist;
  anomalies: Anomaly[];
  yearOverYearSummary: {
    totalIncomeChange: number;
    totalDeductionChange: number;
    effectiveRateChange: number;
    flagCount: { info: number; warning: number; critical: number };
  };
}
```

### 7.2.1 Error Types

All client-side modules MUST use the following error types for structured error reporting:

```ts
type AppErrorCode =
  // Validation errors
  | "VALIDATION_FAILED"            // Zod schema validation failed
  | "INVALID_PLAN_INPUT"           // PlanInput fails validation
  | "INVALID_NDJSON"               // NDJSON content is malformed or fails schema
  | "SCHEMA_VERSION_UNSUPPORTED"   // NDJSON schemaVersion not recognized or migratable
  // Computation errors
  | "SIMULATION_ERROR"             // Engine encountered an unrecoverable state
  | "NEGATIVE_BALANCE"             // Account balance went negative (should not happen)
  | "WITHDRAWAL_CONVERGENCE"       // Tax-withdrawal iteration did not converge
  // Claude API errors
  | "CLAUDE_API_KEY_MISSING"       // No API key configured
  | "CLAUDE_API_KEY_INVALID"       // Key validation failed (401/403)
  | "CLAUDE_API_RATE_LIMITED"      // 429 response from Claude API
  | "CLAUDE_API_NETWORK_ERROR"     // Network failure reaching Claude API
  | "CLAUDE_API_TIMEOUT"           // Request timed out
  | "CLAUDE_RESPONSE_INVALID"      // Response did not match expected Zod schema
  | "CLAUDE_FALLBACK_USED"         // Not an error — informational: fallback advice returned
  // OneDrive / storage errors
  | "ONEDRIVE_AUTH_FAILED"         // MSAL auth flow failed or was cancelled
  | "ONEDRIVE_PERMISSION_DENIED"   // Insufficient Graph API permissions
  | "ONEDRIVE_NETWORK_ERROR"       // Network failure reaching Graph API
  | "ONEDRIVE_SYNC_CONFLICT"       // Both local and remote modified since last sync
  | "ONEDRIVE_QUOTA_EXCEEDED"      // User's OneDrive storage is full
  // PDF extraction errors
  | "PDF_PARSE_FAILED"             // pdf.js could not parse the file
  | "PDF_FORM_UNRECOGNIZED"        // No form-type template matched
  | "PDF_EXTRACTION_LOW_CONFIDENCE"; // Aggregate confidence below threshold

interface AppError {
  code: AppErrorCode;
  message: string;                   // human-readable description
  details?: Record<string, unknown>; // structured context (e.g., field paths, line numbers)
  retryable: boolean;                // whether the operation can be retried
  timestamp: string;                 // ISO 8601
}
```

All module interface functions (§9) MUST throw or return `AppError` instances on failure. The UI MUST map `AppErrorCode` to user-friendly messages using Fluent `MessageBar` or `Toast`.

### 7.3 NDJSON Record Wrapper

Every line in an NDJSON file MUST conform to:

```ts
interface NdjsonRecord {
  _type: NdjsonRecordType;
  [key: string]: unknown;
}

interface NdjsonHeader extends NdjsonRecord {
  _type: "header";
  schemaVersion: string;
  exportedAt: string;                    // ISO 8601
  modules: ("tax" | "retirement")[];     // which modules' data is included
  checksum?: string;                     // optional integrity check
}
```

### NDJSON Record Type ↔ Data Model Mapping

Each `_type` maps to a specific interface and content scope:

| `_type` | Interface | Content |
|---|---|---|
| `"header"` | `NdjsonHeader` | Schema version, export metadata |
| `"household"` | `HouseholdProfile` | Shared corpus: household demographics, SS config |
| `"account"` | `Account` | Shared corpus: one record per account |
| `"incomeStream"` | `IncomeStream` | Shared corpus: one record per income stream |
| `"adjustment"` | `Adjustment` | Shared corpus: one record per adjustment |
| `"retirementPlan"` | `{ spending: SpendingPlan, taxes: TaxConfig, market: MarketConfig, strategy: StrategyConfig }` | Retirement-specific config (the non-shared subset of `PlanInput`) |
| `"simulationResult"` | `PlanResult` with `scenarioId` | One record per scenario result |
| `"taxYear"` | `TaxYearRecord` (without nested `documents`) | Tax year record; documents are separate lines |
| `"taxDocument"` | `TaxDocument` with `taxYear` field | One record per imported document |
| `"checklistItem"` | `ChecklistItem` | One record per checklist entry |
| `"anomaly"` | `Anomaly` | One record per detected anomaly |

> **Note on `PlanInput` vs. NDJSON decomposition:** The `PlanInput` interface is the **assembled runtime type** consumed by the client-side simulation engine (`simulate()` function). In NDJSON storage, `PlanInput` is decomposed into shared corpus records (`household`, `account`, `incomeStream`, `adjustment`) plus the `retirementPlan` record (retirement-specific config). The SPA assembles `PlanInput` from these records before calling the simulation function.

### 7.4 OneDrive Storage Layout

```text
OneDrive - Personal/
  FinPlanner/
    config.ndjson                        // app settings, shared corpus header
    shared/
      corpus.ndjson                      // all shared corpus records (household, accounts, incomeStreams, adjustments)
    tax/
      {year}/
        record.ndjson                    // TaxYearRecord
        checklist.ndjson                 // TaxChecklist
        anomalies.ndjson                 // Anomaly[]
    retirement/
      plan.ndjson                        // PlanInput + StrategyConfig
      results/
        {scenario-id}.ndjson             // PlanResult per scenario
    imports/
      {year}/
        *.pdf                            // original uploaded PDFs
    exports/
      {timestamp}-export.ndjson          // full NDJSON exports
```

---

## 8. Calculation Engine Specification

The calculation engine runs entirely client-side as TypeScript modules in the browser. For Monte Carlo simulations (10k+ runs), the engine SHOULD use a Web Worker to avoid blocking the UI thread.

## 8.1 Required Execution Order (Per Year)

Engine MUST execute in this order:

1. Determine phase (joint/survivor), ages, filing context, survivor spending adjustment
2. Apply returns to **beginning-of-year balances** (returns are applied before withdrawals; this is a simplifying assumption that MUST be documented in `model-limitations.md`)
3. Compute mandatory income: SS benefits, NQDC scheduled distributions, pension/other income streams, adjustments
4. Compute RMDs for all `taxDeferred` accounts where the owner has reached RMD age
5. Inflate spending target (apply `survivorSpendingAdjustmentPct` if in survivor phase; apply guardrail rules if enabled)
6. Compute **withdrawal target**: `inflatedSpend + estimatedTaxes - mandatoryIncome - rmdAmounts` (see FR-7 for full formula)
7. Solve discretionary withdrawals per selected strategy to fill remaining gap
8. Calculate taxes (federal + state) using income classification rules from FR-4; iterate if tax estimate was materially wrong (1–3 iterations)
9. Compute net spendable and shortfall/surplus
10. Apply fees to end-of-year balances: `balance = balance * (1 - feePct / 100)`
11. Apply rebalancing if `rebalanceFrequency` is `"annual"` (see §8.5). For `"quarterly"`, rebalancing occurs at end of each quarter within the year.
12. Produce end-of-year balances and diagnostics

## 8.2 Survivor Transition Rules

* System MUST transition from joint to survivor phase when one spouse exits model horizon (reaches life expectancy).
* System MUST apply the `survivorSpendingAdjustmentPct` from `SpendingPlan` to the spending target starting in the first survivor-phase year.
* System MUST apply survivor SS benefit logic (survivor receives the higher of their own benefit or the deceased's benefit, not both).
* System MUST stop income streams owned by the deceased spouse (unless `survivorContinues: true`).
* System MUST consolidate accounts owned by the deceased spouse into the survivor's ownership for withdrawal purposes.

### Survivor Filing Status Transition

In the survivor phase, filing status transitions as follows:

1. **Year of death and the following year:** Filing status is `"survivor"` (qualifying surviving spouse), which uses MFJ brackets/deductions.
2. **Subsequent years:** Filing status transitions to `"single"`, which uses single brackets/deductions.
3. This transition MUST be automatic — the engine derives it from ages and life expectancy, not from user input.

## 8.3 Numerical/Validation Rules

* All balances and currency fields MUST be finite numbers.
* Percent inputs MUST be bounded (e.g., -100 to +100 where applicable; practical UI limits SHOULD be narrower).
* Ages MUST be sensible (e.g., 0–120 bound).
* Engine MUST prevent negative account balances unless explicit borrowing mode exists (not in v1).

## 8.4 Tax Module Computation Model

The tax planning module's `TaxYearRecord` contains `computedFederalTax`, `computedStateTax`, and effective rate fields. These are computed differently depending on the tax year's `status`:

**For `filed` and `amended` tax years:**

* `computedFederalTax` and `computedStateTax` are **user-entered actuals** (what was actually paid/owed). The system pre-populates these from extracted documents (e.g., 1040 if imported) but the user may override.
* Effective rates are derived: `computedEffectiveFederalRate = computedFederalTax / totalGrossIncome`, where `totalGrossIncome` is the sum of all fields in `TaxYearIncome` (i.e., `wages + selfEmploymentIncome + interestIncome + dividendIncome + capitalGains + rentalIncome + nqdcDistributions + retirementDistributions + socialSecurityIncome + otherIncome`, minus `capitalLosses`).

**For `draft` and `ready` tax years:**

* The system MUST **estimate** tax liability using the income data available. The estimation model mirrors the retirement engine's effective-rate approach (§FR-4):
  1. Sum all ordinary income (wages, self-employment, interest, dividends, NQDC, retirement distributions, rental, other).
  2. Add taxable portion of Social Security (per FR-3 provisional income rules).
  3. Subtract the applicable deduction (`standardDeduction` or sum of `itemizedDeductions` if `useItemized` is true).
  4. Apply `federalEffectiveRatePct` from the shared `TaxConfig` to the result (floored at 0).
  5. Apply `capGainsRatePct` to capital gains (net of capital losses, floored at 0).
  6. `computedFederalTax = ordinaryTax + capitalGainsTax`.
  7. State tax: apply `stateEffectiveRatePct` similarly.
* If the user has enough prior-year `filed` data, the system SHOULD derive effective rates from actual history rather than the shared `TaxConfig` defaults.
* The UI MUST clearly label estimated values as "Estimated" and distinguish them from user-entered actuals.

**Credits:**

* Tax credits (child tax, education, foreign, other) are subtracted from the computed tax liability: `finalTax = max(0, computedTax - totalCredits)`.
* Refundable credits MAY produce a negative final tax (refund).

**Payments and refund/balance-due:**

* `refundOrBalanceDue = (payments.federalWithheld + payments.estimatedPaymentsFederal) - computedFederalTax`.
* Positive = refund expected; negative = balance due. Same logic for state.

### Integration with Retirement Engine

The retirement engine (§8.1) and tax module use different inputs for the same tax model:

* **Retirement engine:** Uses projected future income from the simulation (withdrawals, SS, NQDC, etc.) to estimate taxes each simulation year.
* **Tax module:** Uses actual/imported income data for historical and current years, estimated data for future years.

When historical `filed` tax years exist, the system SHOULD use the actual effective rates from those years to inform the retirement engine's `TaxConfig` defaults (e.g., suggest a `federalEffectiveRatePct` based on the user's real 3-year average).

## 8.5 Portfolio Rebalancing

When `StrategyConfig.rebalanceFrequency` is not `"none"` and at least two accounts have `targetAllocationPct` set, the engine MUST apply portfolio rebalancing:

1. **Timing:** Rebalancing occurs at end-of-year (after fees, step 10 in §8.1) for `"annual"`, or at end of each quarter for `"quarterly"` (modeled as 4 sub-periods per simulation year).
2. **Target allocation:** Each account with a `targetAllocationPct` defines its target share of the **total portfolio balance** (sum of all accounts with targets). Accounts without `targetAllocationPct` are excluded from rebalancing.
3. **Validation:** The sum of all `targetAllocationPct` values MUST equal 100. If not, the engine MUST emit a `VALIDATION_FAILED` error before simulation starts.
4. **Rebalancing step:**
   a. Compute total portfolio value (sum of all accounts with targets).
   b. For each account: `targetBalance = totalPortfolio * (targetAllocationPct / 100)`.
   c. Compute delta: `delta = targetBalance - currentBalance`.
   d. Transfer balances between accounts to match targets. Transfers are **notional** (no tax event in v1 — this is a simplifying assumption that MUST be documented in `model-limitations.md`).
5. **Cost basis adjustment:** When a taxable account receives a notional inflow via rebalancing, the cost basis increases by the inflow amount (it represents new "purchases" at current value). When a taxable account has a notional outflow, cost basis decreases proportionally (same formula as withdrawal basis reduction in FR-2).
6. When `rebalanceFrequency` is `"none"`, no rebalancing occurs and `targetAllocationPct` is ignored.

**Quarterly rebalancing and the annual loop:** When `rebalanceFrequency` is `"quarterly"`, the engine does NOT re-run the full 12-step annual loop four times. Instead, steps 1–10 execute once for the full year as normal. Then, the rebalancing step (step 11) executes four times at quarterly boundaries (end of Q1, Q2, Q3, Q4). At each quarterly checkpoint: split the year's total returns proportionally (each quarter applies ¼ of the annual return to each account's balance), then execute the rebalancing algorithm (step 4 above) against the resulting balances. The final Q4 rebalancing produces the end-of-year balances used by step 12. Withdrawals, taxes, RMDs, and spending remain annual — only the rebalancing frequency changes.

---

## 9. Module Interfaces (Client-Side)

All computation and analysis functions run as client-side TypeScript modules. There are no REST endpoints or backend servers. Functions are imported and called directly within the SPA.

## 9.1 `simulate(planInput): PlanResult`

### Signature

```ts
function simulate(planInput: PlanInput): PlanResult;
```

### Input

A fully-assembled `PlanInput` object (see §7.1).

### Output

A `PlanResult` object containing `summary`, `yearly` results, and `assumptionsUsed`.

### Requirements

* Input MUST be validated with Zod before execution.
* Output MUST include assumptions used in computation.
* This is a **pure computation function** — synchronous, no API key needed.

---

## 9.2 `async getPortfolioAdvice(request): Promise<PortfolioAdviceResponse>`

### Signature

```ts
interface PortfolioAdviceRequest {
  planInput: PlanInput;
  planResultSummary: PlanResult["summary"];
  userPreferences: {
    riskTolerance: "conservative" | "moderate" | "aggressive";
    spendingFloor: number;
    legacyGoal: number;
  };
}

interface PortfolioAdviceResponse {
  recommendations: Array<{
    title: string;
    rationale: string;
    expectedImpact: string;
    tradeoffs: string[];
    source: "llm" | "fallback";
  }>;
  withdrawalStrategyAdvice: Array<{ title: string; rationale: string }>;
  riskFlags: string[];
  assumptionSensitivity: string[];
  disclaimer: string;
}

async function getPortfolioAdvice(request: PortfolioAdviceRequest): Promise<PortfolioAdviceResponse>;
```

### Requirements

* This is an **LLM function** — calls Claude API directly with the user's API key.
* Response MUST be validated against the advice schema with Zod.
* On invalid schema: MUST retry once.
* On second failure: MUST return deterministic fallback advice object.
* If no API key is configured: MUST return fallback advice immediately.

---

## 9.3 `validateImport(ndjsonContent): ImportValidationResult`

### Signature

```ts
interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  lineErrors: Array<{ line: number; type: string; message: string }>;
  migrated: boolean;
  schemaVersion: string;
  recordCounts: Record<NdjsonRecordType, number>;
}

function validateImport(ndjsonContent: string): ImportValidationResult;
```

### Requirements

* This is a **pure computation function** — synchronous, no API key needed.
* The SPA reads the NDJSON file from OneDrive or a local file picker and passes the content to this function.
* Line-level errors include the line number and record type for actionable diagnostics.

---

## 9.4 Client-Side PDF Extraction (No Backend Endpoint)

PDF extraction is handled **entirely on the frontend** using pdf.js. There is no backend endpoint for PDF processing. The extraction flow is:

1. User selects a PDF file via the UI.
2. Frontend parses the text layer using pdf.js and applies form-type templates (see FR-11) to extract fields.
3. Frontend presents extracted fields for user review/confirmation.
4. On confirmation, frontend writes the PDF to OneDrive (`FinPlanner/imports/{taxYear}/`) and updates the tax year record in IndexedDB + OneDrive.

This design ensures raw PDF content never leaves the browser.

---

## 9.5 `async generateChecklist(request): Promise<TaxChecklist>`

### Signature

```ts
interface ChecklistRequest {
  taxYear: number;
  currentYearRecord: TaxYearRecord;
  priorYearRecord: TaxYearRecord | null;
  sharedCorpus: {
    household: HouseholdProfile;
    accounts: Account[];
    incomeStreams: IncomeStream[];
  };
}

async function generateChecklist(request: ChecklistRequest): Promise<TaxChecklist>;
```

The response includes a `completionPct` field and the full `items` array.

### Requirements

* The SPA MUST assemble the request from IndexedDB/OneDrive data before calling this function.
* Rule-based checklist generation is **synchronous and does not require an API key**.
* When an API key is available, the function MAY call Claude for personalized checklist insights (making it async). Without a key, only rule-based items are generated.

---

## 9.6 `async detectAnomalies(request): Promise<AnomalyDetectionResult>`

### Signature

```ts
interface AnomalyDetectionRequest {
  taxYear: number;
  taxYearRecords: TaxYearRecord[];  // at least target + one comparison year, ordered by year descending
  includeLlmAnalysis: boolean;
}

interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  yearOverYearSummary: {
    totalIncomeChange: number;
    totalDeductionChange: number;
    effectiveRateChange: number;
    flagCount: { info: number; warning: number; critical: number };
  };
}

async function detectAnomalies(request: AnomalyDetectionRequest): Promise<AnomalyDetectionResult>;
```

`taxYearRecords` MUST include at least the target year and one comparison year. For pattern-break detection, 3–5 years SHOULD be provided. Records MUST be ordered by year descending (most recent first).

### Requirements

* When `includeLlmAnalysis` is `true` and an API key is configured, the function calls Claude with summarized, PII-stripped data to add contextual explanations to each anomaly.
* Anomaly detection MUST work without LLM (rule-based). LLM adds contextual explanations.
* Pattern-break detection uses all provided years; omission/anomaly detection compares the target year against the immediately prior year.
* If no API key is configured and `includeLlmAnalysis` is `true`, the function MUST still return rule-based anomalies (without `llmAnalysis` fields).

---

## 9.7 `async getTaxStrategyAdvice(request): Promise<TaxStrategyAdviceResponse>`

### Signature

```ts
interface TaxStrategyAdviceRequest {
  taxYear: number;
  taxYearRecord: TaxYearRecord;
  priorYearRecord: TaxYearRecord | null;
  sharedCorpus: {
    household: HouseholdProfile;
    accounts: Account[];
    incomeStreams: IncomeStream[];
  };
  retirementProjectionSummary?: PlanResult["summary"];
  userPreferences: {
    prioritize: "minimize_tax" | "maximize_refund" | "minimize_estimated_payments";
  };
}

interface TaxStrategyAdviceResponse {
  recommendations: Array<{
    title: string;
    rationale: string;
    expectedImpact: string;
    tradeoffs: string[];
    source: "llm" | "fallback";
  }>;
  taxOptimizationOpportunities: Array<{ title: string; rationale: string }>;
  riskFlags: string[];
  disclaimer: string;
}

async function getTaxStrategyAdvice(request: TaxStrategyAdviceRequest): Promise<TaxStrategyAdviceResponse>;
```

The SPA assembles the full context from IndexedDB/OneDrive. The client-side prompt builder strips PII before sending to Claude.

The `retirementProjectionSummary` (optional) enables cross-domain advice (e.g., Roth conversion recommendations that consider retirement projections).

### Requirements

* This is an **LLM function** — calls Claude API directly with the user's API key.
* Response MUST be validated against the advice schema with Zod.
* On invalid schema: MUST retry once.
* On second failure: MUST return deterministic fallback advice object.
* If no API key is configured: MUST return fallback advice immediately.

---

## 10. Claude Integration Requirements

1. Claude calls MUST originate from the client-side Claude module using the user's own API key.
2. **API key storage:** The user's Claude API key MUST be stored in IndexedDB only — never in localStorage, sessionStorage, URLs, cookies, OneDrive files, or exported NDJSON.
3. **API key management UI:** The SPA MUST provide a settings page where the user can enter, update, and delete their Claude API key. The key MUST be validated on first entry.
4. **Graceful degradation:** The application MUST function fully without a Claude API key. All rule-based features (simulation, tax computation, rule-based checklist, rule-based anomaly detection, NDJSON export/import) work without a key. LLM-powered features show a clear message directing the user to enter an API key.
5. **SDK:** The SPA MUST use the Anthropic JS SDK (`@anthropic-ai/sdk`) or direct `fetch` to the Claude API. CORS note: the Anthropic API supports browser-origin requests with the `anthropic-dangerous-direct-browser-access` header.
6. **Model selection:** The system SHOULD use Claude Sonnet (latest) for advice and analysis calls as it provides the best balance of quality and latency. The model identifier SHOULD be configurable in the settings UI so users can choose a different model.
7. Prompt template MUST enforce JSON-only response with fixed schema.
8. **Data minimization:** The client-side prompt builder MUST strip PII (names, SSNs, EINs, addresses) before transmission. Only aggregated financial figures and structural context are sent.
9. **User notification:** The UI MUST display an indicator when data is being sent to Claude for analysis.
10. Prompt MUST include (as applicable to the analysis type):

    * Key plan assumptions (retirement)
    * Scenario outcomes summary (retirement)
    * User constraints (risk tolerance, spend floor, legacy goal)
    * Summarized tax year data (tax strategy)
    * Year-over-year deltas (anomaly analysis)
    * Checklist gaps (tax checklist insights)
11. Output MUST be non-promissory and include trade-offs.
12. Advice UI MUST display disclaimer and assumptions context.
13. System SHOULD log schema failure frequency to IndexedDB-based local diagnostics.
14. **No raw document transmission:** The system MUST NOT send raw PDF content, full document text, or unstructured data to Claude. Only extracted, structured, PII-stripped fields are permitted.

### 10.1 Prompt Template Example (Portfolio Advice)

The following is a reference prompt structure for `getPortfolioAdvice()`. All LLM functions MUST follow this pattern: system prompt with role/constraints, structured data context, and explicit JSON output schema.

```
System prompt:
  You are a retirement planning analysis assistant. You provide educational
  guidance about portfolio allocation and withdrawal strategies. You are NOT
  a financial advisor. All output MUST be valid JSON matching the schema below.
  Do not include any text outside the JSON object.

  Output JSON schema:
  {
    "recommendations": [{ "title": string, "rationale": string,
      "expectedImpact": string, "tradeoffs": [string], "source": "llm" }],
    "withdrawalStrategyAdvice": [{ "title": string, "rationale": string }],
    "riskFlags": [string],
    "assumptionSensitivity": [string],
    "disclaimer": "Educational planning guidance, not investment/tax/legal advice."
  }

User prompt:
  Analyze this retirement plan and provide optimization suggestions.

  HOUSEHOLD: Filing MFJ, state WA. Primary age 60 retiring at 62,
  life expectancy 90. Spouse age 58 retiring at 62, life expectancy 92.

  ACCOUNTS:
  - Taxable brokerage: $900,000 (basis $500,000), 5.5% return, 0.15% fee
  - 401k (primary): $1,400,000, 5.8% return, 0.20% fee
  - Deferred comp (primary): $300,000, distributions $30k/yr 2030–2039

  INCOME: Corporate pension $24,000/yr starting 2028. SS primary $3,200/mo
  at 67, spouse $2,400/mo at 67.

  SPENDING: $180,000/yr target, 2.5% inflation, survivor 70%.
  Guardrails: floor $140,000, ceiling $220,000.

  STRATEGY: Tax-optimized withdrawals, annual rebalancing.
  TAX: 18% federal effective, 0% state, 15% cap gains.

  SCENARIO RESULTS:
  - Deterministic: no shortfall, terminal value $1.2M
  - GFC 2008 replay: shortfall years 28–30, terminal value $0
  - High inflation: shortfall years 25–35

  USER PREFERENCES: Moderate risk tolerance, spending floor $120,000,
  legacy goal $1,000,000.
```

Key principles demonstrated:
* **No PII** — no names, SSNs, addresses, employer names (use "Corporate pension" not "Acme Corp pension")
* **Structured context** — data is organized by section, not raw dumps
* **Explicit schema** — the output format is defined in the system prompt
* **Aggregated figures** — individual transaction details are not sent

Tax strategy and anomaly analysis prompts MUST follow the same pattern, substituting the relevant data context and output schema.

---

## 11. UI/UX Requirements

## 11.0 Design Language: Microsoft Fluent Design

The application MUST implement the **Fluent Design Language** using **Fluent UI React v9** (`@fluentui/react-components`). All UI MUST conform to the following Fluent principles and implementation requirements:

### Fluent Design Principles

1. **Light:** The UI should feel open, airy, and fast. Use Fluent's elevation system (`shadow2`, `shadow4`, `shadow8`) sparingly to create clear visual hierarchy without heaviness. Prefer `Card` and `Surface` with subtle elevation over hard borders.
2. **Motion:** Use Fluent motion tokens (`durationNormal`, `curveEasyEase`, etc.) for transitions between views, expanding/collapsing panels, and data loading states. Page transitions, drawer open/close, and chart animations MUST use Fluent motion curves.
3. **Depth:** Use Fluent's layering model to convey spatial relationships. The navigation shell sits at the base layer; content panels float above; dialogs and popovers use progressive elevation. Acrylic/reveal effects MAY be used for navigation surfaces where performance permits.
4. **Material:** Apply Fluent material treatments — subtle backgrounds using Fluent `colorNeutralBackground2`/`3`/`4` tokens to differentiate content regions (e.g., sidebar vs. main content vs. detail panels).
5. **Scale:** The layout MUST be responsive and adapt gracefully from compact (1024px) to wide (1920px+) viewports using Fluent's spacing tokens (`spacingHorizontalS` through `spacingHorizontalXXXL`).
* **Mobile Support:** While complex data entry is optimized for desktop, critical "read" flows (Dashboard, Checklist status, Advice review) MUST be usable on mobile viewports (375px+). Complex tables (e.g., Tax Year Detail) MAY use horizontal scrolling or stacked card views on mobile.
* Touch targets MUST meet 44×44px minimum for interactive elements.

### Component Usage Requirements

The implementation MUST use Fluent UI React v9 components for all standard UI patterns. Custom components are only permitted where no Fluent equivalent exists.

| UI Pattern | Required Fluent Component(s) |
|---|---|
| App shell / navigation | `FluentProvider`, `TabList` or custom `Nav` using Fluent primitives |
| Page layout | `Card`, `tokens` for spacing/sizing |
| Forms | `Field`, `Input`, `Select`, `Combobox`, `SpinButton`, `DatePicker`, `Switch`, `RadioGroup`, `Checkbox` |
| Data tables | `DataGrid` (with sorting, selection, resizing) or `Table` |
| Buttons / actions | `Button`, `MenuButton`, `SplitButton`, `ToggleButton`, `CompoundButton` |
| Status / feedback | `Badge`, `Tag`, `MessageBar`, `Toast`, `Spinner`, `ProgressBar` |
| Dialogs / overlays | `Dialog`, `Drawer`, `Popover`, `Tooltip` |
| File upload | `Input` (type=file) styled with Fluent, or custom drop zone using Fluent tokens |
| Charts | Recharts (or equivalent) with color palette derived from Fluent theme tokens (`colorBrandBackground`, `colorPaletteX`) |
| Icons | `@fluentui/react-icons` exclusively — no mixing icon sets |

### Theming

* The application MUST wrap the root in `FluentProvider` with the selected theme.
* Light and dark mode MUST be supported using `webLightTheme` and `webDarkTheme`.
* A custom brand ramp MAY be defined for the application's primary accent color using `createLightTheme()`/`createDarkTheme()` with a brand color ramp generated from a base color.
* All color values in components MUST reference Fluent design tokens (e.g., `tokens.colorNeutralForeground1`), never hardcoded hex/rgb values.
* Typography MUST use Fluent's type ramp: `typographyStyles.title1` through `typographyStyles.caption1`. No custom font-size declarations.
* Spacing MUST use Fluent spacing tokens. No arbitrary pixel/rem values for padding or margins.

### Layout Patterns

* **App shell:** Left navigation rail (collapsible) + top bar (app title, theme toggle, OneDrive sync status, user context). Navigation uses Fluent `TabList` (vertical) or a custom nav built from Fluent primitives.
* **Dashboard:** Grid of Fluent `Card` components, each showing a summary widget (tax status, retirement projection, anomaly count, checklist progress).
* **Detail pages:** Two-column layout — primary content area (forms, tables, charts) with an optional side panel (`Drawer`) for contextual help, LLM advice, or related data.
* **Data entry forms:** Stacked `Field` components within `Card` containers, grouped by section. Inline validation using Fluent's `Field` `validationMessage` and `validationState` props.

## 11.1 Required Screens/Routes

**Shared:**

1. Dashboard (overview of both tax and retirement status — Fluent `Card` grid)
2. Household & Shared Data (shared corpus management — Fluent form layout)
3. Accounts (shared — `DataGrid` with inline editing)
4. Export/Import (NDJSON — file picker + `ProgressBar` for import validation)
5. Settings (Claude API key management — enter/update/delete key; OneDrive connection status; theme toggle)

**Tax Planning:**

6. Tax Years (list/manage all tax year records — `DataGrid` with status `Badge`)
7. Tax Year Detail (income, deductions, credits, payments — tabbed `Card` layout with `TabList`)
8. Document Import (PDF upload drop zone + extraction review `DataGrid` with confidence `Badge`)
9. Tax Checklist (current year filing checklist — checklist `DataGrid` with status `Badge` + `ProgressBar`)
10. Year-over-Year Analysis (anomaly/omission detection — anomaly `Card` list with severity `Badge`)
11. Tax Advice (`Drawer` panel with Claude-powered tax strategy; `MessageBar` for disclaimer)

**Retirement Planning:**

12. Plan Setup (ages, spouse, state, SS — stepped form with Fluent `Field` components)
13. Income & Social Security (form + summary `Card`)
14. Assumptions (form with `SpinButton` for numeric inputs)
15. Scenarios (`DataGrid` for scenario selection + comparison)
16. Results Dashboard (chart `Card` grid with Fluent-themed Recharts)
17. Retirement Advice (`Drawer` panel with Claude-powered portfolio optimization; `MessageBar` for disclaimer)

## 11.2 Results Presentation

UI MUST visualize using Fluent-themed chart components:

**Retirement:**
* Income timeline (line chart in `Card`, Fluent color tokens)
* Withdrawals by account type (stacked area chart)
* Taxes by jurisdiction (grouped bar chart)
* End balances over time (line chart)
* Shortfall/surplus timeline (area chart with conditional `colorPaletteRedBackground3` for shortfall)
* Scenario comparison (side-by-side `Card` layout with delta `Badge` indicators)

**Tax:**
* Year-over-year income comparison (bar/line chart)
* Effective tax rate trend over years (line chart)
* Deduction breakdown by year (stacked bar chart)
* Anomaly dashboard with severity `Badge` indicators (`info`=`colorPaletteBlueBorderActive`, `warning`=`colorPaletteYellowBorderActive`, `critical`=`colorPaletteRedBorderActive`)
* Checklist completion progress (`ProgressBar` + completion percentage)

## 11.3 UX Guardrails

* Invalid inputs MUST use Fluent `Field` `validationState="error"` with `validationMessage` for inline error messages.
* Major assumption changes SHOULD trigger a Fluent `MessageBar` (intent=`warning`) summarizing what changed.
* Advice pages MUST display disclaimer in a Fluent `MessageBar` (intent=`info`) pinned to the top of the advice content.
* **LLM data transmission indicator:** When data is being sent to Claude, the UI MUST show a Fluent `Spinner` with descriptive label and a `MessageBar` explaining that summarized data (no PII) is being transmitted.
* **OneDrive sync status:** UI MUST display sync state in the top bar using a Fluent `Badge` — `appearance="filled"` green for synced, `Spinner` for syncing, `appearance="outline"` gray for offline/cached.
* **Toast notifications:** The system MUST use Fluent `Toast` for transient feedback (save confirmations, export complete, import errors).

---

## 12. NDJSON Schema and Versioning

Repository MUST include:

* `schemas/ndjson-header.schema.json`
* `schemas/household.schema.json`
* `schemas/account.schema.json`
* `schemas/retirement-plan.schema.json`
* `schemas/retirement-results.schema.json`
* `schemas/tax-year-record.schema.json`
* `schemas/tax-document.schema.json`
* `schemas/tax-checklist.schema.json`
* `schemas/anomaly.schema.json`
* `schemas/advice-response.schema.json`

Each schema validates the corresponding `_type` of NDJSON record.

Versioning rules:

* `schemaVersion` MUST be present in the NDJSON header record and in all stored files.
* Backward-compatible additive changes SHOULD increment minor version.
* Breaking changes MUST increment major version and provide migration logic.

### Migration: 2.0.0 → 3.0.0

Schema version 3.0.0 is a major (breaking) change from 2.0.0. The migration removes all backend references. The `validateImport()` function MUST support importing 2.0.0 files with the following migration steps:

1. Update the header `schemaVersion` from `"2.0.0"` to `"3.0.0"`.
2. All record types and field names are unchanged — the data model is identical. The breaking change is architectural (no backend), not structural.
3. If a 2.0.0 file contains records with fields not in the 3.0.0 schema, they MUST be preserved as-is (forward compatibility).
4. After migration, validate all records against 3.0.0 schemas.
5. Set `migrated: true` in the `ImportValidationResult`.

Files with `schemaVersion` below `"2.0.0"` are not supported and MUST return `SCHEMA_VERSION_UNSUPPORTED`.

Import pipeline MUST:

1. Parse NDJSON line-by-line
2. Validate header line for `schemaVersion`
3. Migrate records if schema version is older but supported (currently: 2.0.0 → 3.0.0)
4. Validate each record against its `_type` schema
5. Return structured errors with line numbers if invalid
6. Support selective import (tax-only, retirement-only, or full)

---

## 13. Non-Functional Requirements

## 13.1 Correctness

* Unit tests MUST cover core financial logic.
* Golden test fixtures MUST validate deterministic outputs.

## 13.2 Performance

* Deterministic simulation SHOULD complete in <100ms for typical horizon.
* Historical/stress scenario run SHOULD complete in <500ms per scenario.
* Monte Carlo (if enabled) SHOULD complete 10k runs in <2s via Web Worker offload.

## 13.3 Security and Privacy

* The user's Claude API key MUST be stored in IndexedDB only — never in localStorage, sessionStorage, URLs, cookies, OneDrive, or exported NDJSON.
* Inputs MUST be validated client-side using Zod schemas.
* Local diagnostics logs MUST avoid sensitive raw payloads where not necessary.
* Exported NDJSON MUST exclude credentials/secrets.
* **Data MUST NOT leave the user security context** (local app + OneDrive - Personal) except for explicit LLM analysis requests.
* **LLM data minimization:** All data sent to Claude MUST be PII-stripped and limited to the minimum required for the analysis.
* **No third-party data sharing:** Beyond the Claude API, no user data may be transmitted externally.
* **PDF storage:** Imported PDFs MUST be stored only in OneDrive - Personal (via the SPA), never on any external service. There is no server.
* **OneDrive authentication:** The SPA MUST use MSAL.js with PKCE flow and delegated permissions (`Files.ReadWrite`, `User.Read`). There is no backend. See FR-14 for full details.
* **Content Security Policy (CSP):** Static hosting SHOULD set CSP headers that disallow inline scripts, restrict script sources to the app's own origin, and allow `https://api.anthropic.com` for Claude calls. A CSP violation report endpoint MAY be configured.

## 13.4 Reliability

* SPA MUST include error boundaries.
* Client-side modules MUST provide typed errors with structured error codes for all computation and API call failures.

## 13.5 Accessibility

* Keyboard navigation, labels, focus states, and contrast MUST meet WCAG 2.1 AA baseline for core flows.
* Fluent UI React v9 components provide built-in ARIA attributes, keyboard handling, and focus management. Custom components MUST match this baseline.
* High-contrast mode MUST be supported via Fluent's `teamsHighContrastTheme` or equivalent high-contrast token set.
* All interactive elements MUST have visible focus indicators using Fluent's `createFocusOutlineStyle`.

## 13.6 Observability

System SHOULD emit to IndexedDB-based local diagnostics:

* Simulation duration metrics
* Advice schema failure metrics
* Import validation failure metrics
* Claude API call latency and error rates
* **Retention/opt-out:** The settings page MUST allow users to clear diagnostics and disable diagnostics collection. Default retention SHOULD be 30 days or 1,000 entries, whichever comes first.

---

## 14. Testing Strategy

## 14.1 Unit Tests (MUST)

**Retirement Engine:**
* Tax calculations (including SS taxation, standard deduction, capital gains vs ordinary)
* SS benefit stream generation (claim age, COLA, survivor benefit selection)
* Survivor transition logic (spending adjustment, filing status transition, income stream cessation)
* Deferred comp payout schedule handling (balance reduction, overshoot capping, residual lump sum)
* Withdrawal strategy solver/reconciliation math (including tax-withdrawal circularity iteration)
* RMD calculation (age thresholds, Uniform Lifetime Table lookup, interaction with withdrawal strategy)
* Cost basis tracking (gain fraction, proportional basis reduction across withdrawals)
* Guardrail spending adjustments (floor/ceiling triggers, disabled mode)

**Tax Planning:**
* PDF text extraction and field mapping for each supported form type
* Tax year record creation and pre-population from shared corpus
* Checklist generation logic (prior year comparison, corpus-based expectations)
* Anomaly detection rules (omission detection, threshold-based flagging, pattern break detection)
* Year-over-year comparison computations
* NDJSON serialization/deserialization (per-line validation, type discrimination)
* Shared corpus propagation (changes to shared data reflect in both modules)

## 14.2 Golden Scenario Tests (MUST)

Each golden test defines fixture inputs and required numerical/structural assertions. All retirement scenarios use `simulationMode: "deterministic"` unless stated otherwise. Monetary values are in USD. Tolerance for floating-point assertions: ±$1.

### Retirement Scenarios

**1. Stable baseline market case**

Fixture: Single retiree, age 65, life expectancy 90 (25 years). One taxable account: $1,000,000 balance, $600,000 basis, 6% return, 0.10% fee. Spending: $50,000/year, 2% inflation. Taxes: 12% federal effective, 0% state, 15% cap gains. No SS, no pensions, no adjustments. Strategy: `taxableFirst`, no rebalancing, no guardrails.

Assertions:
- Zero shortfall years across all 25 years.
- Year 1 spending target = $50,000; year 25 spending target = $50,000 × 1.02²⁴ = $80,421 (±$1).
- End-of-year-1 balance < $1,000,000 (withdrawals + fees exceed 6% growth at this spending level).
- Final year (year 25) end balance > $0 (plan is sustainable).
- Every `YearResult` has `netSpendable >= inflatedSpendingTarget`.
- Total taxes paid over 25 years > $0 (taxable account generates capital gains).
- Cost basis decreases monotonically year over year (taxable-first draws down basis).

**2. Early severe downturn case**

Fixture: Same as Scenario 1, except: historical scenario with returns = [-20%, -15%, -10%, 5%, 8%, 10%] for years 1-6, then 6% for years 7-25. Inflation sequence: plan default 2% for all years.

Assertions:
- At least 1 shortfall year in years 1–6 (downturn depletes the portfolio faster than spending can be covered).
- Year 3 end balance < $600,000 (three consecutive negative years after withdrawals).
- If no shortfall, end balance at year 6 < Scenario 1's year-6 end balance (sequence-of-returns risk is visible).
- Plan recovers: year 25 end balance ≥ $0 OR shortfall years are recorded with exact amounts.

**3. Survivor transition case**

Fixture: Married couple, MFJ. Primary age 65, life expectancy 85 (20 years). Spouse age 63, life expectancy 90 (27 years). One tax-deferred account: $2,000,000, owner primary, 6% return, 0.20% fee. SS: primary $2,500/mo claiming at 67, spouse $1,800/mo claiming at 67. Spending: $120,000/year, 2.5% inflation, `survivorSpendingAdjustmentPct: 0.70`. Taxes: 18% federal effective, 5% state, 15% cap gains. Strategy: `taxOptimized`, no rebalancing, no guardrails.

Assertions:
- Years 1–20 (joint phase): filing status = `mfj`.
- Year 21 (primary exits at life expectancy 85): filing status transitions to `survivor` (qualifying surviving spouse for 2 years), then `single`.
- Year 21 spending target = year-20 inflation-adjusted target × 0.70.
- Year 21 onward: primary's SS stops; spouse receives max(own benefit, primary's benefit).
- Primary's account ownership transfers to survivor in year 21.
- Total simulation length = 27 years (spouse's horizon, age 63 + 27 = 90).
- No duplicate income streams for deceased spouse after year 20.

**4. High-tax state vs low/no-tax state comparison**

Fixture: Two runs with identical inputs except `stateOfResidence` and state tax rate. Single retiree, age 62, life expectancy 92. Tax-deferred account: $1,500,000, 5.5% return, 0.15% fee. Spending: $80,000/year, 2% inflation. Taxes: 22% federal effective, 15% cap gains. Strategy: `taxOptimized`. Run A: state = "CA", stateEffectiveRatePct = 9.3%. Run B: state = "WA", stateEffectiveRatePct = 0%.

Assertions:
- Run B (WA) final end balance > Run A (CA) final end balance.
- Run B total taxes paid < Run A total taxes paid.
- Difference in total taxes ≈ total withdrawals × 9.3% (±10% tolerance for compounding effects).
- Run B has fewer or equal shortfall years compared to Run A.
- Both runs have identical pre-tax withdrawal sequences (same spending target, same strategy), but different net spendable amounts.

**5. Deferred comp concentrated payout case**

Fixture: Single retiree, age 60, life expectancy 85. NQDC account: $500,000, 4% return, 0% fee, schedule: startYear = year 1, endYear = year 5, frequency = annual, amount = $120,000, inflationAdjusted = false. One taxable account: $800,000, $400,000 basis, 6% return, 0.10% fee. Spending: $100,000/year, 2% inflation. Taxes: 22% federal effective, 0% state, 15% cap gains. Strategy: `taxOptimized`, no guardrails.

Assertions:
- Years 1–5: NQDC distributes $120,000/year as ordinary income.
- Year 5: cumulative distributions = $600,000 but original balance + returns ≈ $500,000 × 1.04⁵ ≈ $608,326. Distributions total $600,000 < $608,326 so no cap needed.
- Year 6: remaining NQDC balance (≈$8,326 + year-5 growth) distributed as lump sum.
- Year 7 onward: NQDC balance = $0, no further NQDC distributions.
- Years 1–5: mandatory NQDC income ($120,000) exceeds spending target in early years → withdrawalTarget from taxable is reduced or zero.
- NQDC distributions are classified as ordinary income in every year they occur.

**6. RMD interaction case**

Fixture: Single retiree, age 74, life expectancy 95. Tax-deferred account: $3,000,000, 5% return, 0.15% fee. No other accounts. Spending: $80,000/year, 2% inflation. Taxes: 22% federal effective, 0% state, 15% cap gains. Strategy: `taxOptimized`, no guardrails.

Assertions:
- Year 1 (age 74): RMD = $3,000,000 × 1.05 / 25.5 (ULT divisor for age 74) = $3,150,000 / 25.5 ≈ $123,529. RMD > spending target ($80,000) → no discretionary withdrawal needed.
- Year 1: surplus = RMD - spending target - taxes > $0 (recorded in YearResult).
- RMD amounts increase as a percentage of the portfolio as the divisor shrinks with age.
- Zero shortfall years in early simulation (large portfolio relative to spending).
- Taxes are computed on the full RMD amount (ordinary income), not just the spending-target portion.
- The engine does NOT withdraw beyond the RMD when RMD already exceeds spending + taxes.

**7. Guardrail spending case**

Fixture: Single retiree, age 65, life expectancy 90. Taxable account: $2,000,000, $1,200,000 basis, 7% return, 0.10% fee. Spending: target $100,000/year, floor $70,000, ceiling $130,000, 2% inflation. Taxes: 15% federal effective, 0% state, 15% cap gains. Strategy: `taxableFirst`, no rebalancing, guardrails enabled.

Assertions:
- **Ceiling trigger test:** With 7% returns and $2M start, portfolio grows faster than spending. When portfolio > 20 × ceiling ($130,000 × inflation-adjusted) = $2,600,000+, spending is capped at the inflation-adjusted ceiling. Verify at least one year where actual spend = ceiling (inflation-adjusted).
- **Floor trigger test:** Create a secondary sub-scenario OR verify: if withdrawal rate would exceed 6% of portfolio, spending drops to floor. With the given inputs and strong returns, the floor may not trigger; if so, assert that actual spend is never below the inflation-adjusted floor.
- Actual spend recorded in `YearResult` differs from the unadjusted inflation-grown target in at least one year (ceiling is hit).
- When guardrails are disabled (control run), every year's actual spend = inflation-adjusted target exactly.

### Tax Scenarios

**8. Two-year complete tax record**

Fixture: Two `taxYear` records (2024 filed, 2025 draft), MFJ, WA. 2024: wages $150,000, W-2 present, 1099-DIV present ($8,000), 1099-INT present ($3,000). 2025: same sources, W-2 present, 1099-DIV present ($8,500), 1099-INT present ($3,200). All documents confirmed by user.

Assertions:
- `generateChecklist()` for 2025 returns `completionPct: 100`.
- Checklist items for W-2, 1099-DIV, 1099-INT all have `status: "received"`.
- No checklist items with `status: "missing"` or `status: "expected"`.
- `sourceReasoning` for each item references the 2024 tax year.

**9. Missing document detection**

Fixture: 2024 (filed) has 1099-DIV from "Vanguard" with $8,000. 2025 (draft) has no 1099-DIV from Vanguard. All other documents match.

Assertions:
- `detectAnomalies()` returns at least one anomaly with `category: "omission"`.
- Anomaly `field` references the Vanguard 1099-DIV.
- Anomaly `severity` = `"warning"`.
- Anomaly `comparisonYear` = 2024.
- `generateChecklist()` for 2025 includes a checklist item for Vanguard 1099-DIV with `status: "expected"` or `"missing"`.
- `completionPct` < 100.

**10. Income anomaly detection**

Fixture: 2024 (filed) wages = $100,000. 2025 (draft) wages = $140,000 (40% increase, exceeds 25% threshold).

Assertions:
- `detectAnomalies()` returns an anomaly with `category: "variance"`.
- Anomaly `field` references wages.
- Anomaly `severity` = `"warning"` (>25% change).
- Anomaly `description` includes the percentage change or both values.
- A 24% wage change ($100,000 → $124,000) must NOT trigger this anomaly.

**11. Multi-form import**

Fixture: Import 3 PDFs for tax year 2025 — two W-2s (Employer A: $80,000 wages, Employer B: $45,000 wages) and one 1099-INT ($2,500 interest). Tax year record exists with no prior income data.

Assertions:
- After import, `taxYear.income.wages` = $125,000 (sum of both W-2s).
- After import, `taxYear.income.interestIncome` = $2,500.
- Three separate `taxDocument` records created, each with correct `formType`.
- `taxYear.documents` array contains all three document IDs.
- No duplicate income fields — second W-2 adds to (not replaces) the first.

**12. NDJSON roundtrip fidelity**

Fixture: Full dataset with household, 3 accounts, 2 income streams, 2 adjustments, 1 retirement plan, 2 tax years, 4 tax documents, 3 checklist items, 2 anomalies (matching §20 reference payload structure).

Assertions:
- Export produces valid NDJSON: every line parses as valid JSON independently.
- Line 1 is `_type: "header"` with `schemaVersion: "3.0.0"`.
- Re-import via `validateImport()` returns `valid: true`, zero errors.
- After re-import, every field in every record matches the original export byte-for-byte (no floating-point drift, no field reordering within tolerance, no dropped optional fields).
- Record count after import equals record count before export.
- `_type` distribution is preserved (same count of each record type).
- API key is NOT present in the exported NDJSON.

## 14.3 Integration Tests (MUST)

* Plan creation → `simulate()` → `getPortfolioAdvice()` → export → `validateImport()` roundtrip (NDJSON)
* Claude invalid schema handling with retry + fallback (both `getTaxStrategyAdvice()` and `getPortfolioAdvice()`)
* PDF import → extraction → tax year population → `generateChecklist()` update flow
* Shared corpus modification → verify propagation to both tax year records and retirement plan
* OneDrive save → reload → verify data integrity
* NDJSON export → consumption by external LLM agent (verify line-by-line parsability and type filtering)

> **Testing note:** Since there is no backend, all tests run in a browser-like environment (e.g., jsdom, happy-dom, or Playwright). Claude API calls MUST be mocked in tests. Microsoft Graph API calls MUST be mocked in tests.

## 14.4 Performance Tests (SHOULD)

* Deterministic speed threshold
* Batch scenario execution timings
* Monte Carlo throughput (if implemented in v1)
* Client-side PDF extraction throughput (target: <3s per document in browser)
* NDJSON export/import for large datasets (5+ tax years, 50+ documents)

---

## 15. Repository Layout (Required)

```text
finplanner/
  apps/
    web/                                 # SPA entry point — no backend app
  packages/
    domain/                              # shared corpus types, NDJSON types
    engine/                              # retirement simulation engine (client-side)
    tax/                                 # tax planning module
      extraction/                        # PDF parsing + field mapping
      checklist/                         # checklist generation
      anomaly/                           # YoY anomaly detection
    scenarios/                           # historical/stress scenario data
    claude/                              # Claude API integration (API key management, prompt building, PII stripping, response validation)
    validation/                          # Zod schemas for runtime validation
    storage/                             # OneDrive + IndexedDB integration
    ui/                                  # shared UI components
  schemas/
    ndjson-header.schema.json
    household.schema.json
    account.schema.json
    retirement-plan.schema.json
    retirement-results.schema.json
    tax-year-record.schema.json
    tax-document.schema.json
    tax-checklist.schema.json
    anomaly.schema.json
    advice-response.schema.json
  data/
    historical-returns/
    state-tax/
    rmd-tables/
    ss-parameters/
    tax-form-templates/                  # field mapping templates per form type
  tests/
    unit/
    integration/
    golden/
  docs/
    spec.md
    assumptions.md
    module-interfaces.md                 # client-side function signatures and contracts
    model-limitations.md
    runbook.md                           # includes static hosting deployment
    data-security.md                     # data residency + LLM data flow documentation
  CHANGELOG.md
```

---

## 16. Delivery Plan (PR-by-PR)

## PR-1: Monorepo Scaffold + Tooling + OneDrive Integration

* Setup workspace, lint, format, typecheck, test
* Initialize SPA and shared packages (including `tax/`, `storage/`, `claude/`, `validation/`) — no backend
* SPA: MSAL.js auth flow (PKCE) + Microsoft Graph JS SDK integration
* SPA: IndexedDB local cache layer (Dexie.js or idb)
* SPA: OneDrive file CRUD (read/write NDJSON files, create folder structure)
* SPA: Sync engine (IndexedDB ↔ OneDrive with conflict detection)
* CI pipeline baseline

**Exit Criteria**

* Clean install/build/test in CI
* SPA boots with placeholder routes
* MSAL auth flow works; SPA can read/write files to `FinPlanner/` folder in OneDrive
* IndexedDB caching works; app loads data when offline

## PR-2: Domain Model + NDJSON Schemas + Shared Corpus + Validators

* Implement canonical types (shared corpus + tax + retirement)
* Add all required NDJSON schemas
* Build NDJSON serialization/deserialization with per-line validation
* Build validation/migration stubs
* Implement shared corpus data layer (household, accounts, income — single source of truth)

**Exit Criteria**

* NDJSON schema validation passes for sample payloads (tax + retirement)
* Client-side `validateImport()` function operational with line-number error reporting
* Shared corpus changes propagate to both module views

## PR-3: Core Deterministic Engine

* Implement annual cashflow loop (12-step execution order per §8.1)
* Account growth, withdrawals, tax impacts, reconciliation
* Cost basis tracking for taxable accounts
* RMD computation and enforcement for tax-deferred accounts
* Withdrawal target formula with tax-withdrawal iteration
* Standard deduction and income classification (FR-4)
* Guardrail/dynamic spending logic (FR-5a)
* Client-side `simulate()` function

**Exit Criteria**

* Deterministic engine passes core unit tests
* RMDs enforced at age 73 with Uniform Lifetime Table
* Cost basis tracks correctly across withdrawals
* Results include assumptions metadata

## PR-4: SS + Survivor + Deferred Comp

* SS stream generation and claiming logic
* SS taxation (provisional income model)
* Survivor transition behavior (spending adjustment, filing status transition, income stream cessation)
* Deferred comp scheduling support (mandatory distributions, balance capping, residual lump sum)

**Exit Criteria**

* Survivor tests pass (including filing status "survivor" → "single" transition)
* Deferred comp appears correctly in yearly income
* SS taxation varies by provisional income level

## PR-5: Historical + Stress Scenario Framework

* Historical replay mode
* Mandatory stress presets
* Scenario comparison model

**Exit Criteria**

* User can run and compare base + stress scenarios
* Golden stress fixtures pass

## PR-6: Tax Planning — PDF Import + Year Management (FR-10, FR-11, FR-14)

* Tax year record CRUD with status tracking and shared corpus propagation/snapshot rules
* **Client-side** PDF text-layer extraction using pdf.js
* Form-type detection templates (`data/tax-form-templates/`) and field mapping for all v1 form types
* Per-field confidence scoring and low-confidence flagging (threshold: 0.80)
* User review/confirmation flow for extracted data
* Merge confirmed data into tax year records and shared corpus
* Store PDFs in OneDrive - Personal via frontend Graph SDK
* Tax computation model for draft/ready years (§8.4)

**Exit Criteria**

* Can upload a W-2 PDF, extract fields client-side, confirm, and populate tax year record
* Multiple documents merge correctly into a single tax year
* Low-confidence fields (< 0.80) are visually flagged for review
* PDFs stored in OneDrive; raw content never leaves the browser
* Draft tax years auto-update when shared corpus changes; filed years are frozen

## PR-7: Tax Planning — Checklist + Anomaly Detection (FR-12, FR-13)

* Tax filing checklist generation from prior year + current year + shared corpus
* Checklist item status management
* Year-over-year anomaly detection (rule-based: omissions, threshold changes, pattern breaks)
* Anomaly severity classification
* Anomaly results included in NDJSON export

**Exit Criteria**

* Checklist auto-generates expected items from prior year data
* Missing documents flagged as pending
* Income change >25% triggers warning anomaly
* Omitted income source from prior year detected

## PR-8a: Dashboard + Shared UI + Tax Planning UI

* Shared dashboard (route 1) with both modules' status cards
* Household & Shared Data (route 2), Accounts (route 3), Export/Import (route 4), Settings shell (route 5)
* Tax Years list (route 6), Tax Year Detail (route 7), Document Import (route 8)
* Tax Checklist (route 9), Year-over-Year Analysis (route 10)
* Tax-specific visualizations (YoY charts, checklist progress, anomaly dashboard)
* OneDrive sync status indicator in top bar
* App shell layout (navigation rail, top bar, theme toggle)

**Exit Criteria**

* End-to-end PDF import → checklist → anomaly detection works (tax)
* Shared data views show unified corpus
* Dashboard renders tax module status cards
* Inline validation complete for all tax forms

## PR-8b: Retirement Planning UI

* Plan Setup (route 12), Income & Social Security (route 13), Assumptions (route 14)
* Scenarios (route 15), Results Dashboard (route 16)
* Retirement-specific charts (income timeline, withdrawals by account, end balances, shortfall/surplus, scenario comparison)
* LLM data transmission indicator

**Exit Criteria**

* End-to-end plan setup to result viewing works (retirement)
* Scenario comparison renders delta metrics
* Dashboard renders retirement module status cards
* Inline validation and assumptions display complete

## PR-9: Client-Side Claude Module (Tax + Retirement Advice)

* Claude API key management UI (enter/update/delete in settings, stored in IndexedDB only)
* Anthropic JS SDK integration with CORS support (`anthropic-dangerous-direct-browser-access` header)
* Client-side PII stripping prompt builder
* Zod-validated response parsing for both advice domains
* Strict response schema enforcement with retry + fallback behavior
* `getPortfolioAdvice()` and `getTaxStrategyAdvice()` functions
* LLM enhancements for `generateChecklist()` (personalized insights) and `detectAnomalies()` (contextual `llmAnalysis`)
* Graceful degradation: no API key = fallback advice only, clear UI messaging
* Settings page: API key management UI
* Advice UI pages (tax + retirement)

**Exit Criteria**

* Both advice functions robust to malformed model output
* PII stripped from all LLM prompts (verified by test)
* API key stored in IndexedDB only — never in NDJSON exports, OneDrive, localStorage, or URLs
* User sees LLM data transmission indicator
* Application functions fully without Claude API key (rule-based features work, LLM features show "API key required" message)

## PR-10: NDJSON Export/Import Hardening + Perf + Observability

* Roundtrip NDJSON export/import (tax + retirement + shared corpus)
* Selective import (tax-only, retirement-only, full)
* LLM-agent-friendly export verification
* Migration handling for schema version changes
* Performance tuning
* Logging/metrics
* Data security documentation (`docs/data-security.md`)

**Exit Criteria**

* Roundtrip integration tests pass for both modules
* External LLM agent can parse exported NDJSON line-by-line
* Required NFR thresholds substantially met
* Data security audit checklist passes

---

## 17. Definition of Done (Release Gate)

Release MUST NOT ship unless:

* All FR-1 through FR-14 (and FR-5a) are implemented.
* RMD enforcement is operational for tax-deferred accounts.
* Cost basis tracking produces correct taxable gain calculations.
* SS taxation (provisional income model) is implemented.
* **Tax year management** supports create/edit/view for historical and current years.
* **PDF import** extracts data from all v1 form types with user confirmation flow.
* **Tax checklist** generates and tracks items from prior year + shared corpus.
* **Anomaly detection** identifies omissions and material YoY changes.
* Required NDJSON schemas and per-line validation are in place.
* Core UI routes are complete and functional for **both tax and retirement modules**.
* Advice integration is secure, PII-stripped, and fallback-capable for both domains.
* Unit + integration + golden tests pass in CI (tax + retirement).
* Assumptions and disclaimers are visible in product UI.
* **NDJSON export/import roundtrip** works for representative plans including tax data.
* **NDJSON export is consumable by external LLM agents** (line-by-line, type-filtered).
* No secrets or PII are exposed in client bundle, LLM prompts, or exported files.
* **All data persists to OneDrive - Personal** and never leaves the user security context (except LLM analysis).
* **Shared data corpus** is the single source of truth for both modules.
* **Application functions fully without a Claude API key** — all rule-based features (simulation, tax computation, checklist, anomaly detection, export/import) work without a key.

---

## 18. Risks and Mitigations

1. **LLM schema instability**
   Mitigation: strict validator, retry-once, deterministic fallback.

2. **Tax model simplification errors**
   Mitigation: explicit assumptions panel, versioned tax model, transparent limitations.

3. **Performance under large scenario sets**
   Mitigation: Web Worker offload, bounded batch sizes, caching where safe.

4. **User overconfidence in forecasts**
   Mitigation: persistent uncertainty messaging and non-advisory disclaimers.

5. **PDF extraction accuracy**
   Mitigation: confidence scoring, mandatory user review for low-confidence fields, form-type-specific templates, no reliance on extraction without confirmation.

6. **Data security breach via LLM prompts**
   Mitigation: PII stripping layer with unit tests, data minimization policy, user-visible transmission indicator, no raw document transmission.

7. **OneDrive API availability/rate limits**
   Mitigation: local caching with sync-on-reconnect, graceful degradation to offline mode, retry with exponential backoff.

8. **Shared corpus consistency**
   Mitigation: single source of truth pattern, change propagation tests, version-stamped records to detect stale reads.

9. **Browser API key security**
   Mitigation: API key stored in IndexedDB only (not accessible via XSS targeting localStorage/cookies); never exported, synced, or logged. Users are advised that browser extensions and XSS vulnerabilities could expose the key. Content Security Policy headers SHOULD be configured on the static hosting to mitigate XSS risk.

10. **Claude API CORS restrictions**
    Mitigation: Use Anthropic's `anthropic-dangerous-direct-browser-access` header for direct browser calls. If Anthropic changes CORS policy, a lightweight proxy can be added as a fallback without changing the SPA architecture.

---

## 19. Required Documentation Outputs

Implementation MUST deliver:

1. `docs/spec.md` (this file)
2. `docs/assumptions.md`
3. `docs/module-interfaces.md`
4. `docs/model-limitations.md`
5. `docs/runbook.md`
6. `docs/data-security.md` (data residency, LLM data flow, PII handling)
7. `CHANGELOG.md`

### 19.1 Required Contents: `assumptions.md`

1. **Returns modeling** — returns applied to beginning-of-year balances before withdrawals; no intra-year compounding.
2. **Tax model** — effective-rate approximation for draft/future years; actual rates for filed years; no AMT, no NIIT, no phase-outs in v1.
3. **Inflation** — constant annual rate applied uniformly to spending, SS COLA, and pension COLA; no differential inflation for healthcare/housing.
4. **Social Security** — user-provided monthly benefit at claim age; COLA applied from claim age forward; survivor receives the higher of own or deceased benefit.
5. **Mortality** — deterministic life expectancy (no mortality tables or probability curves); survivor phase begins on deceased's life-expectancy year.
6. **Rebalancing** — notional transfers between accounts (no tax event in v1); quarterly rebalancing splits annual returns into four equal sub-periods.
7. **Withdrawal strategy** — greedy bucket ordering; no partial-year withdrawals; no tax-loss harvesting.
8. **State taxes** — effective-rate model only; no bracket-level computation; dataset provides representative rates, not authoritative filing calculations.

### 19.2 Required Contents: `model-limitations.md`

1. **Filing status** — MFS and HoH not supported in v1; only single, MFJ, and survivor.
2. **Federal tax brackets** — not modeled; effective-rate only. Marginal rate optimizations (e.g., Roth conversions to fill low brackets) cannot be evaluated.
3. **AMT / NIIT / phase-outs** — not modeled.
4. **Rebalancing tax events** — notional transfers do not trigger capital gains in v1; real-world rebalancing in taxable accounts would incur taxes.
5. **Intra-year timing** — all cashflows are annual; no mid-year events, no monthly modeling.
6. **Healthcare costs** — no explicit Medicare premium, Part D, or Medigap modeling; users must include in spending target.
7. **Estate planning** — no estate tax, step-up in basis, or inheritance modeling.
8. **Roth conversions** — not modeled as a planning lever; users cannot simulate conversion ladders.
9. **Social Security taxation** — the engine applies SS income as taxable at the user's effective rate; the actual 50%/85% provisional-income thresholds are not modeled.
10. **Monte Carlo** — if implemented, assumes normally distributed returns; no fat tails, no serial correlation.

### 19.3 Required Contents: `runbook.md`

1. **Prerequisites** — Node.js version, pnpm version, Azure AD app registration steps (client ID, redirect URI, `Files.ReadWrite` + `User.Read` permissions).
2. **Local development** — `pnpm install`, `pnpm dev`, environment variables (MSAL client ID), dev server ports.
3. **Build** — `pnpm build`, output directory, build artifacts.
4. **Testing** — `pnpm test`, `pnpm test:golden`, `pnpm test:integration`, how to update golden snapshots.
5. **Static hosting deployment** — Azure Static Web Apps (step-by-step), GitHub Pages (step-by-step), generic CDN deployment; CORS/CSP header configuration.
6. **OneDrive folder structure** — expected folder layout in user's OneDrive (`/FinPlanner/`, `/FinPlanner/data/`, `/FinPlanner/exports/`); how the app creates it on first run.
7. **Claude API key setup** — where to enter the key in the Settings UI, how it's stored (IndexedDB), how to verify it's working, how to rotate/delete it.
8. **Troubleshooting** — common issues: MSAL redirect loop, OneDrive permission denied, Claude API 401/429, IndexedDB quota exceeded, PDF extraction failures.
9. **Data backup and recovery** — how to export all data as NDJSON, how to re-import, how to clear IndexedDB cache.

---

## 20. Reference Example Payload (Valid NDJSON Shape)

Each line below is a separate JSON object in the NDJSON file. Lines are shown on separate lines for readability:

```ndjson
{"_type":"header","schemaVersion":"3.0.0","exportedAt":"2026-02-15T10:00:00Z","modules":["tax","retirement"]}
{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","currentAge":60,"retirementAge":62,"lifeExpectancy":90,"socialSecurity":{"claimAge":67,"estimatedMonthlyBenefitAtClaim":3200,"colaPct":2.2}},"spouse":{"id":"spouse","currentAge":58,"retirementAge":62,"lifeExpectancy":92,"socialSecurity":{"claimAge":67,"estimatedMonthlyBenefitAtClaim":2400,"colaPct":2.2}}}
{"_type":"account","id":"acct-taxable","name":"Taxable Brokerage","type":"taxable","owner":"joint","currentBalance":900000,"costBasis":500000,"expectedReturnPct":5.5,"feePct":0.15}
{"_type":"account","id":"acct-401k","name":"401k","type":"taxDeferred","owner":"primary","currentBalance":1400000,"expectedReturnPct":5.8,"feePct":0.2}
{"_type":"account","id":"acct-nqdc","name":"Deferred Comp","type":"deferredComp","owner":"primary","currentBalance":300000,"expectedReturnPct":4.5,"feePct":0.1,"deferredCompSchedule":{"startYear":2030,"endYear":2039,"frequency":"annual","amount":30000,"inflationAdjusted":false}}
{"_type":"incomeStream","id":"pension-primary","name":"Corporate Pension","owner":"primary","startYear":2028,"annualAmount":24000,"colaPct":0,"taxable":true,"survivorContinues":false}
{"_type":"adjustment","id":"home-downsize","name":"Home downsizing proceeds","year":2030,"amount":200000,"taxable":false}
{"_type":"adjustment","id":"new-roof","name":"Roof replacement","year":2029,"amount":-25000,"taxable":false}
{"_type":"retirementPlan","spending":{"targetAnnualSpend":180000,"inflationPct":2.5,"floorAnnualSpend":140000,"ceilingAnnualSpend":220000,"survivorSpendingAdjustmentPct":0.70},"taxes":{"federalModel":"effective","stateModel":"effective","federalEffectiveRatePct":18,"stateEffectiveRatePct":0,"capGainsRatePct":15,"standardDeductionOverride":30050},"market":{"simulationMode":"historical","historicalScenarioIds":["dotcom_bust","gfc_2008"],"stressScenarioIds":["early_drawdown","high_inflation_decade"]},"strategy":{"withdrawalOrder":"taxOptimized","rebalanceFrequency":"annual","guardrailsEnabled":true}}
{"_type":"taxYear","taxYear":2025,"status":"draft","filingStatus":"mfj","stateOfResidence":"WA","income":{"wages":150000,"selfEmploymentIncome":0,"interestIncome":5200,"dividendIncome":8400,"qualifiedDividends":6800,"capitalGains":12000,"capitalLosses":0,"rentalIncome":0,"nqdcDistributions":0,"retirementDistributions":0,"socialSecurityIncome":0,"otherIncome":0},"deductions":{"standardDeduction":30050,"useItemized":false},"credits":{"childTaxCredit":0,"educationCredits":0,"foreignTaxCredit":0,"otherCredits":0},"payments":{"federalWithheld":28000,"stateWithheld":0,"estimatedPaymentsFederal":4000,"estimatedPaymentsState":0},"computedFederalTax":0,"computedStateTax":0,"computedEffectiveFederalRate":0,"computedEffectiveStateRate":0,"documents":[]}
{"_type":"taxDocument","id":"doc-w2-2025","taxYear":2025,"formType":"W-2","issuerName":"Acme Corp","extractedFields":{"wages":150000,"federalTaxWithheld":28000,"stateWages":150000,"stateTaxWithheld":0,"ssWages":150000,"medicareWages":150000},"fieldConfidence":{"wages":0.98,"federalTaxWithheld":0.97,"stateWages":0.98,"stateTaxWithheld":0.99,"ssWages":0.96,"medicareWages":0.96},"extractionConfidence":0.97,"lowConfidenceFields":[],"confirmedByUser":true,"importedAt":"2026-01-20T14:30:00Z"}
{"_type":"checklistItem","id":"chk-001","taxYear":2025,"category":"document","description":"W-2 from Acme Corp","status":"received","sourceReasoning":"W-2 from this employer was present in 2024 tax records","linkedDocumentId":"doc-w2-2025"}
{"_type":"anomaly","id":"anom-001","taxYear":2025,"comparisonYear":2024,"category":"omission","severity":"warning","field":"documents.1099-DIV.Vanguard","description":"1099-DIV from Vanguard was present in 2024 but is missing for 2025","suggestedAction":"Check if Vanguard 1099-DIV has been issued yet or if the account was closed"}
```

---

## 21. Final Precedence Rule

If implementation conflicts arise, precedence MUST be:

1. This `docs/spec.md`
2. NDJSON schemas in `/schemas`
3. Module interface tests
4. Integration/golden tests
5. UI tests

All intentional deviations MUST be documented in `CHANGELOG.md` with rationale and impact.

---

**End of consolidated spec.md — v3.0.0 (Tax & Retirement Planning SPA)**
