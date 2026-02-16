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
   d. Agent-native NDJSON storage — the OneDrive folder structure is directly consumable by LLM agents, with NDJSON import for data portability
   e. Data stored in OneDrive - Personal; never leaves user security context except for Claude API calls using the user's own API key

This is a **single consolidated specification** and is intended to be directly consumable by coding agents without requiring supplemental fragments.

---

## 1.1 Key Definitions

* **Calendar year:** All year fields in the data model (e.g., `startYear`, `endYear`, `YearResult.year`) represent calendar years (e.g., 2026, 2030). The simulation horizon runs from the current calendar year through the calendar year in which the last surviving person reaches their life expectancy.
* **Tax year:** A calendar year for which the user has or will have tax obligations. Tax years may be historical (filed), current (in-progress), or projected (future/retirement).
* **Joint phase:** The period during which both the primary and spouse are alive and within the simulation horizon.
* **Survivor phase:** The period after one spouse exits the model horizon (reaches life expectancy), during which the surviving spouse continues.
* **Simulation year numbering:** Simulation year 1 is the current calendar year at the time the simulation is run. `YearResult.year` is the calendar year. In golden test fixtures, "Year N" refers to the Nth simulation year (Year 1 = current calendar year). For a person with `currentAge` A, Year 1 corresponds to age A, Year 2 to age A+1, etc. **Year count:** A person with `currentAge` A and `lifeExpectancy` L produces L − A years of simulation (the person is alive through the year they reach age L−1; `lifeExpectancy` is **exclusive** — the person does NOT appear in the year they would turn L). Example: age 65, LE 90 → 25 years (ages 65–89).
* **Shared data corpus:** The set of financial data elements (income, accounts, filing status, state of residence, deductions, etc.) that are authored once and consumed by both the tax planning and retirement planning modules.
* **User security context:** The boundary within which user data resides — the browser runtime and the user's OneDrive - Personal storage. There is no backend server. Data MUST NOT leave this context except when explicitly sent to the Claude API using the user's own API key.
* **NDJSON:** Newline-Delimited JSON (one JSON object per line). The standard serialization and storage format. The OneDrive folder structure IS the agent-readable format — no export step is required.
* **Agent documentation folder (`.agent/`):** A subfolder within `FinPlanner/` containing all documentation, schemas, editing rules, and validation checklists needed for an LLM agent to reason over and make compatible edits to the data files. Static content (schemas, editing rules) is written on first run and updated on app version changes. Dynamic content (`DATA_SUMMARY.md`) is regenerated on every save. The `.agent/` folder is metadata — it does NOT contain customer financial data.
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
* Store all data in a **self-describing NDJSON folder structure** natively consumable by LLM agents. The folder MUST include a `.agent/` subfolder with complete schema documentation, editing rules, and validation checklists so that an agent can both **read and make compatible edits** without any knowledge of the FinPlanner codebase. Support NDJSON import for backup restoration and data portability.

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

11. Point an LLM agent at the FinPlanner OneDrive folder for native analysis **and editing** of all financial data. The agent reads `.agent/README.md` for orientation, consults `.agent/SCHEMA.md` and `.agent/EDITING.md` for data structure and editing rules, and uses `.agent/VALIDATION.md` to verify its own edits.
12. Import NDJSON data from a backup file or another FinPlanner instance.
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
* **Agent-native NDJSON storage** + import for data portability + schema versioning
* **OneDrive - Personal** as the storage layer with IndexedDB local cache (FR-14)
* **Data security** — all data stays within user security context; only LLM analysis prompts leave

### 4.1.1 Key v1 Assumptions

* **Pre-retirement contributions are not modeled.** v1 assumes the user is at or near retirement. Pre-retirement salary, 401(k) contributions, and employer matches are out of scope. Users should enter current account balances as of their planned simulation start.
* **Client-side plan state with OneDrive persistence.** There is no backend server. All computation, validation, and LLM orchestration run as TypeScript modules in the browser. Plans are persisted to OneDrive - Personal via the Microsoft Graph API (frontend-initiated). Agent-native NDJSON storage (FR-9) and OneDrive storage integration (FR-14) are the persistence mechanisms. No database layer is required in v1.
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
* State: Zustand (lightweight, minimal boilerplate, no action/reducer ceremony — suitable for a mid-complexity SPA with isolated module stores)
* Charts: Recharts, styled to align with Fluent Design tokens (color, typography, spacing)
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
* Agent documentation generator (renders `.agent/` static and dynamic content from templates in `agent-templates/`)

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

For ages above 120, use `distributionPeriod = 2.0`.

**RMD Start Age Logic (SECURE 2.0):**
The engine MUST determine the RMD start age dynamically based on the account owner's birth year:
* **Born 1950 or earlier:** Age 72 (or 70.5 if born before July 1, 1949). For v1 simplicity, treat as **73** if RMDs haven't already started, or assume user is already taking them.
* **Born 1951–1959:** Age **73**.
* **Born 1960 or later:** Age **75**.

This logic replaces any hardcoded "72" or "73" check in the code. The `distributionPeriod` lookup uses the owner's *actual age* in the simulation year, regardless of when they started.

### 5.4.2 Standard Deduction Defaults (2025 Tax Year)

Stored in `data/tax-parameters/standard-deductions.json`. Values SHOULD be updated annually.

| Filing Status | Standard Deduction (2025) |
|---|---|
| `single` | $15,000 |
| `mfj` | $30,000 |
| `survivor` | $30,000 (same as MFJ) |

Additional: filers age 65+ receive an extra $1,550 (single) or $1,300 (MFJ, per qualifying person). The engine SHOULD apply the age-based increase automatically based on the person's age in each simulation year.

### 5.4.3 State Tax Parameter Dataset

Stored in `data/state-tax/states.json`. Required fields per entry: `stateCode`, `stateName`, `incomeRate` (top marginal effective %, simplified for v1), `capitalGainsRate` (effective %), `ssTaxExempt` (`"yes" | "no" | "partial"`), `notes` (optional). Rates are approximate top-marginal effective rates suitable for the v1 effective-rate model; bracket-level modeling is a future enhancement.

`ssTaxExempt` values: `"yes"` = state fully exempts SS from state income tax. `"no"` = state taxes SS (use state income rate on the federally-taxable SS portion). `"partial"` = state exempts SS under certain conditions (age, AGI); in v1, the engine SHOULD treat `"partial"` as `"yes"` (exempt) and note the simplification in `model-limitations.md`. The `notes` field documents the real-world partial exemption rules for future refinement.

The full dataset (50 states + DC):

| Code | State | Income % | Cap Gains % | SS Exempt | Notes |
> **Casing note:** In the `states.json` data file, `ssTaxExempt` values MUST use lowercase strings (`"yes"`, `"no"`, `"partial"`) matching the type definition. The table below uses title case for readability only.
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
| NE | Nebraska | 6.64 | 6.64 | Yes | SS fully exempt as of 2025 |
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
{"_type":"header","schemaVersion":"3.0.0","savedAt":"...","modules":["config"]}
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
  2. On app load, the frontend compares IndexedDB `oneDriveETag` with the current OneDrive file ETag.
  3. **Auto-resolution:** If only one side has changed (local or remote), the newer version is accepted automatically. If remote is newer, it overwrites local. If local is newer (and remote ETag matches the last known sync ETag), it pushes to OneDrive.
  4. **Conflict resolution:** If both sides have changed (remote ETag differs from local's last-known ETag AND local has pending edits), the UI MUST surface a conflict dialog allowing the user to choose "Keep Local" (overwrite remote) or "Keep Remote" (discard local).
  5. On network failure, the app operates fully from IndexedDB. Sync resumes automatically on reconnect with exponential backoff.
* There is no backend to persist data or access OneDrive — the SPA is the sole data mediator

### 5.5.1 IndexedDB Cache Schema

The IndexedDB database MUST use the database name `"finplanner"` with the following object stores:

| Object Store | Key Path | Indices | Content |
|---|---|---|---|
| `files` | `path` | `lastModified` (Date) | Cached OneDrive file content. Fields: `path` (string, e.g., `"shared/corpus.ndjson"`), `content` (string, raw NDJSON), `lastModified` (Date, local write time), `oneDriveETag` (string \| null), `oneDriveLastModified` (Date \| null), `pendingSync` (boolean) |
| `apiKey` | `id` | — | Single record (`id: "claude"`) storing the Claude API key. Fields: `id` (string), `key` (string). The key is stored as a plain string — IndexedDB is not accessible via `document.cookie` or `localStorage` XSS vectors, and browser-side encryption without a server-held secret provides no meaningful additional protection. CSP headers (§13.3) mitigate XSS risk. |
| `syncQueue` | auto-increment | `path`, `timestamp` | Pending writes queued during offline mode. Fields: `path` (string), `content` (string), `timestamp` (Date), `operation` ("put" \| "delete") |
| `diagnostics` | auto-increment | `timestamp`, `category` | Local observability logs. Fields: `timestamp` (Date), `category` (string), `event` (string), `data` (object \| null) |

The `files` store mirrors the OneDrive folder structure. The `path` field uses forward-slash-separated relative paths from the `FinPlanner/` root (e.g., `"tax/2025/record.ndjson"`, `"shared/corpus.ndjson"`). The `.agent/` folder contents SHOULD NOT be cached in IndexedDB — they are generated on write and do not need offline access.

### 5.5.2 Folder and File Naming Constraints
All folder and file names in the OneDrive `FinPlanner/` tree MUST use only lowercase alphanumeric characters, hyphens, underscores, and dots. Exception: the root `README.md` and files under `.agent/` use fixed names with uppercase letters and are exempt from the lowercase-only requirement. Specifically:
* Tax year folders: four-digit year (e.g., `2025`)
* Scenario ID files: lowercase alphanumeric + underscores (e.g., `gfc_2008.ndjson`, `high_inflation_decade.ndjson`). The `id` field in scenario data MUST conform to the pattern `[a-z0-9_]+`.
* No spaces, special characters, or Unicode in file/folder names (uppercase letters are permitted only for root `README.md` and `.agent/` documentation files).

## 5.6 Security Architecture

* **Data residency:** All user financial data MUST remain within the user security context (local app runtime + OneDrive - Personal)
* **LLM analysis exception:** When the user explicitly requests LLM analysis (tax advice, retirement advice, anomaly detection), the SPA MAY send **summarized, structured context** to the Claude API using the user's own API key. Raw documents (e.g., full PDF content) MUST NOT be sent; only extracted structured fields are permitted. Claude API calls originate directly from the browser.
* **Data minimization for LLM:** The system MUST send only the minimum data required for the specific analysis request. The prompt builder MUST strip personally identifiable information (names, SSNs, addresses) before sending to the LLM.
* **No third-party data sharing:** Beyond the Claude API for explicit LLM analysis, data MUST NOT be transmitted to any external service.
* **The OneDrive folder structure** stores NDJSON files within OneDrive - Personal and remains within the user security context. The folder is natively formatted for consumption by LLM agents with read and write access.
* **Agent documentation folder (`.agent/`):** Contains only schema definitions, editing rules, validation checklists, and data summaries (record counts, year lists). It MUST NOT contain raw customer financial data, PII, or API keys. The `DATA_SUMMARY.md` file contains aggregate counts and metadata (e.g., "3 accounts", "tax years: 2023, 2024, 2025") but MUST NOT include balances, income amounts, SSNs, names, or any field values from the data files.

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

1. NQDC distributions are **mandatory scheduled income**, not discretionary withdrawals. They occur in the years and amounts defined by `deferredCompSchedule` regardless of the user's withdrawal strategy. If `frequency` is `"monthly"`, the annual distribution amount is `amount * 12`; the engine models this as a single annual lump sum (monthly granularity is not simulated within the annual loop).
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

1. RMDs begin in the year the account owner reaches their SECURE 2.0 RMD start age (age 73 if born 1951–1959, age 75 if born 1960 or later — see §5.4.1 for full rules). The engine determines the applicable age from the owner's `birthYear` field.
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
* RMDs are enforced starting at the applicable SECURE 2.0 age (73 or 75 based on birth year per §5.4.1) for tax-deferred accounts.
* Output contains per-account withdrawal data.

---

## FR-3 Social Security Modeling

### Requirements

The system MUST:

* Accept SS claiming age per person
* Accept estimated claim-age monthly benefit (`estimatedMonthlyBenefitAtClaim`, required). Optionally accept PIA at FRA (`piaMonthlyAtFRA`) for display purposes — PIA-to-claim-age conversion is out of scope for v1.
* Apply COLA
* Model household SS income through joint and survivor phases
* Apply simplified survivor logic in v1 (survivor receives higher applicable benefit)
* SS benefits begin in the calendar year the person reaches their `claimAge`
* SS benefits are annualized: `annualBenefit = estimatedMonthlyBenefitAtClaim * 12`, then grown by `colaPct` each year after the claim year

### Social Security Taxation

In v1, the engine MUST apply simplified SS taxation:

1. Compute **provisional income**: `provisionalIncome = otherTaxableIncome + 0.5 * socialSecurityIncome`, where `otherTaxableIncome` includes: tax-deferred withdrawals (including RMDs), NQDC distributions, taxable pension/annuity income, taxable capital gains from taxable account withdrawals, taxable adjustments (`adjustment.taxable === true`), and any other taxable `IncomeStream` amounts. It does NOT include: Roth withdrawals, return-of-basis portions of taxable withdrawals, or the standard deduction.
2. Determine the taxable fraction of SS income using these thresholds:

   **MFJ / Survivor thresholds:**
   * If `provisionalIncome ≤ $32,000`: 0% of SS is taxable.
   * If `$32,000 < provisionalIncome ≤ $44,000`: taxable SS = min(0.50 × SS, 0.50 × (provisionalIncome − $32,000)).
   * If `provisionalIncome > $44,000`: taxable SS = min(0.85 × SS, 0.85 × (provisionalIncome − $44,000) + $6,000).

   **Single thresholds:**
   * If `provisionalIncome ≤ $25,000`: 0% of SS is taxable.
   * If `$25,000 < provisionalIncome ≤ $34,000`: taxable SS = min(0.50 × SS, 0.50 × (provisionalIncome − $25,000)).
   * If `provisionalIncome > $34,000`: taxable SS = min(0.85 × SS, 0.85 × (provisionalIncome − $34,000) + $4,500).

3. The taxable portion of SS is added to **ordinary income** for federal tax calculation. **The threshold selection (MFJ/Survivor vs. Single) MUST use the `filingStatus` for the current simulation year** as determined by the survivor filing status transition rules (§8.2). When the survivor-phase filing status transitions from `survivor` to `single`, the SS taxation thresholds switch from MFJ to Single accordingly.
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
| Qualified dividends (`TaxYearIncome.qualifiedDividends`) | Capital gains rate (use `capGainsRatePct`); qualified dividends are a **subset** of `dividendIncome`, not additive. **Tax module only** — see note below. |
| Non-qualified dividends (`dividendIncome - qualifiedDividends`) | Ordinary income. **Tax module only** — see note below. |
| `roth` qualified withdrawals | Not taxed |
| Social Security | Partially taxable (see FR-3 SS taxation rules) |
| Pensions / other income streams with `taxable: true` | Ordinary income |
| RMDs | Ordinary income (subset of taxDeferred withdrawals) |

> **Retirement engine vs. tax module:** The qualified/non-qualified dividend distinction applies only to the **tax planning module** (`TaxYearRecord` computation in §8.4), where the user enters actual dividend amounts from 1099-DIV forms. The **retirement simulation engine** does not separately model dividends — taxable account income is modeled solely via the cost-basis gain/return-of-basis model (FR-2). The effective-rate tax model subsumes any dividend-related tax differences.

### Federal Tax Computation (Effective Rate Model)

1. Sum all ordinary income sources.
2. Add the taxable portion of Social Security (per FR-3).
3. Subtract the standard deduction (or override value).
4. Apply `federalEffectiveRatePct` to the result (floored at 0).
5. Separately apply `capGainsRatePct` to capital gains from taxable account withdrawals.
6. `taxesFederal = ordinaryTax + capitalGainsTax`.

### State Tax Computation (Effective Rate Model)

1. Apply `stateEffectiveRatePct` to the same taxable ordinary income (after the federal standard deduction — see model-limitations.md for this simplification; most states have different standard deduction amounts). If the state's `ssTaxExempt` flag (from `states.json` per §5.4.3) is `"yes"` or `"partial"` (treated as `"yes"` in v1), exclude the taxable SS portion from state ordinary income before applying the rate.
2. State capital gains treatment: apply `stateCapGainsRatePct` to capital gains. If `stateCapGainsRatePct` is not set, fall back to `stateEffectiveRatePct` (most states tax capital gains as ordinary income).
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

**Validation:** If `guardrailsEnabled` is `true`, the engine MUST validate that `floorAnnualSpend < targetAnnualSpend < ceilingAnnualSpend`. If this invariant is violated, the engine MUST emit a `VALIDATION_FAILED` error before simulation starts. If either `floorAnnualSpend` or `ceilingAnnualSpend` is omitted, only the provided bound is enforced (the missing bound is treated as unbounded).

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
2. A **baseline expected return** is derived from the plan's `MarketConfig.deterministicReturnPct` (or, if not set, the **balance-weighted average** of account `expectedReturnPct` values: `baselineReturn = Σ(account.currentBalance × account.expectedReturnPct) / Σ(account.currentBalance)`, computed once at plan start using beginning-of-simulation balances).
3. For each account and each year, the scenario return is applied as: `accountReturn = scenarioMarketReturn + (account.expectedReturnPct - baselineReturn)`. This preserves each account's relative offset from the market (e.g., a bond-heavy account with lower expected return stays below the market return even in historical replay).
4. The scenario inflation sequence (if available in the historical data) replaces **both** `deterministicInflationPct` and `SpendingPlan.inflationPct` for that year — spending growth, standard deduction inflation, SS COLA, IncomeStream COLA (`colaPct`), NQDC inflation adjustment (`DeferredCompSchedule.inflationAdjusted`), and Adjustment inflation adjustment (`Adjustment.inflationAdjusted`) all use the scenario's inflation value for that year. If the scenario does not include inflation data, `SpendingPlan.inflationPct` is used for all inflation-sensitive calculations. **Exception:** IncomeStream entries with `colaPct: 0` (explicitly fixed income, no COLA) remain fixed regardless of scenario inflation — the user has configured them as non-COLA income. Scenario inflation only overrides non-zero `colaPct` values.

### Historical Data Format

Each historical scenario dataset MUST provide:

* `id`: unique identifier (e.g., `"gfc_2008"`)
* `name`: human-readable label
* `startYear` / `endYear`: the real-world years of the historical window
* `returns`: array of annual total market return percentages (one per year in the window)
* `inflation` (optional): array of annual inflation percentages

### Scenario Seed Data

The app MUST ship with the following seed datasets in `data/historical-returns/`. Each file is a JSON object conforming to the Historical Data Format above. Returns are annual S&P 500 total returns (percentage); inflation is annual CPI-U (percentage).

**1. `dotcom_bust.json`**

| Field | Value |
|---|---|
| `id` | `"dotcom_bust"` |
| `name` | `"Dot-Com Bust (2000–2004)"` |
| `startYear` | 2000 |
| `endYear` | 2004 |
| `returns` | `[-9.1, -11.9, -22.1, 28.7, 10.9]` |
| `inflation` | `[3.4, 2.8, 1.6, 2.3, 2.7]` |

**2. `gfc_2008.json`**

| Field | Value |
|---|---|
| `id` | `"gfc_2008"` |
| `name` | `"Global Financial Crisis (2007–2011)"` |
| `startYear` | 2007 |
| `endYear` | 2011 |
| `returns` | `[5.5, -37.0, 26.5, 15.1, 2.1]` |
| `inflation` | `[2.8, 3.8, -0.4, 1.6, 3.2]` |

**3. `early_drawdown.json`** (synthetic stress preset)

| Field | Value |
|---|---|
| `id` | `"early_drawdown"` |
| `name` | `"Early Retirement Drawdown Stress"` |
| `startYear` | 0 |
| `endYear` | 9 |
| `returns` | `[-15.0, -25.0, -15.0, 5.0, 8.0, 6.0, 6.0, 6.0, 6.0, 6.0]` |
| `inflation` | `[2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0]` |

> Synthetic scenario: `startYear: 0` means offsets from the **first simulation year** (current calendar year), not calendar years. The engine maps synthetic year 0 → simulation year 1, synthetic year 1 → simulation year 2, etc. After the sequence ends, the plan's `deterministicReturnPct` resumes.

**4. `high_inflation_decade.json`**

| Field | Value |
|---|---|
| `id` | `"high_inflation_decade"` |
| `name` | `"High Inflation Decade (1973–1982)"` |
| `startYear` | 1973 |
| `endYear` | 1982 |
| `returns` | `[-14.7, -26.5, 37.2, 23.8, -7.2, 6.6, 18.4, 32.4, -4.9, 21.5]` |
| `inflation` | `[6.2, 11.0, 9.1, 5.8, 6.5, 7.6, 11.3, 13.5, 10.3, 6.2]` |

**5. `low_return_regime.json`**

| Field | Value |
|---|---|
| `id` | `"low_return_regime"` |
| `name` | `"Lost Decade (2000–2009)"` |
| `startYear` | 2000 |
| `endYear` | 2009 |
| `returns` | `[-9.1, -11.9, -22.1, 28.7, 10.9, 4.9, 15.8, 5.5, -37.0, 26.5]` |
| `inflation` | `[3.4, 2.8, 1.6, 2.3, 2.7, 3.4, 3.2, 2.8, 3.8, -0.4]` |

> Historical return and inflation values are approximate annual figures sourced from public market data. Implementations MAY refine these values using more precise data sources but MUST NOT deviate by more than ±0.5 percentage points per year.

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

### Simple Withdrawal Strategy Algorithms

All strategies share the same `remainingGap` semantics defined below under the `taxOptimized` algorithm. After mandatory income (RMDs, SS, NQDC, pensions) has been applied, the `remainingGap` is the gross amount still needed from discretionary withdrawals.

**`taxableFirst`** — Withdraw from account types in this fixed priority order:
1. Taxable accounts (proportional basis/gains per FR-2; gains taxed at `capGainsRatePct`)
2. Tax-deferred accounts (taxed as ordinary income at `federalEffectiveRatePct`)
3. Roth accounts (tax-free)

Within each type, withdraw from accounts in array order (first account exhausted before moving to next). For each step: `amountWithdrawn = min(remainingGap, accountBalance)`, `remainingGap -= amountWithdrawn`.

**`taxDeferredFirst`** — Withdraw from account types in this fixed priority order:
1. Tax-deferred accounts (taxed as ordinary income)
2. Taxable accounts (gains taxed at `capGainsRatePct`)
3. Roth accounts (tax-free)

Same mechanics as `taxableFirst` with reversed type priority.

**`proRata`** — Withdraw proportionally from all accounts based on their share of total portfolio balance:
1. Compute `totalBalance = sum of all account balances`.
2. For each account: `accountShare = accountBalance / totalBalance`.
3. For each account: `amountWithdrawn = min(remainingGap * accountShare, accountBalance)`.
4. `remainingGap -= sum(allAmountsWithdrawn)`.
5. If `remainingGap > 0` due to rounding or exhausted small accounts, distribute remainder across accounts with remaining balance using the same proportional logic.

Tax treatment per account type applies as in the other strategies (taxable → capital gains, taxDeferred → ordinary income, Roth → tax-free).

### Tax-Optimized Withdrawal Algorithm (v1)

The `taxOptimized` strategy uses the following greedy algorithm after mandatory income (RMDs, SS, NQDC, pensions) has been applied:

**`remainingGap` semantics:** `remainingGap` tracks the **gross** amount still needed from discretionary withdrawals. It starts at `withdrawalTarget` (which already includes `estimatedTaxes`). Every step subtracts the **gross withdrawal amount** (`amountWithdrawn`), NOT the net-of-tax amount. Taxes generated by each withdrawal are handled by the convergence iteration (§FR-7 "Withdrawal Target Formula") which re-estimates total taxes after all withdrawals are computed.

```
1. Compute remainingGap = withdrawalTarget (after mandatory income)
2. If remainingGap <= 0: done (mandatory income covers spending)

3. FILL THE 0% BRACKET — Withdraw from taxDeferred accounts up to the
   amount that keeps taxable ordinary income at or below the standard
   deduction. This withdrawal is effectively tax-free.
   maxWithdrawal = max(0, standardDeduction - currentOrdinaryIncome)
   amountWithdrawn = min(remainingGap, maxWithdrawal, taxDeferredBalance)
   remainingGap -= amountWithdrawn

4. LOW-GAIN TAXABLE — Withdraw from taxable accounts where the
   per-dollar tax cost is lower than the ordinary income rate.
   Per FR-2, every withdrawal is proportional: a withdrawal of W
   realizes gains of W * gainFraction and returns basis of
   W * (1 - gainFraction). The per-dollar tax cost is:
   taxCostPerDollar = gainFraction * capGainsRatePct / 100
   Condition: only execute this step for accounts where taxCostPerDollar <
   federalEffectiveRatePct / 100 (otherwise step 5 or 6 is cheaper).
   When multiple taxable accounts qualify, withdraw in order of
   ascending gainFraction (lowest tax cost first). Exhaust each
   qualifying account before moving to the next.
   amountWithdrawn = min(remainingGap, accountBalance)
   remainingGap -= amountWithdrawn

5. TAX-DEFERRED vs. CAPITAL GAINS COMPARISON — Decide whether to
   fill the gap from taxDeferred (ordinary income) or taxable
   (capital gains) based on which is cheaper:
   ordinaryRate = federalEffectiveRatePct / 100
   capitalRate = gainFraction * capGainsRatePct / 100
   If ordinaryRate <= capitalRate: withdraw from taxDeferred first
     (step 5a), then taxable (step 5b).
   If ordinaryRate > capitalRate: withdraw from taxable first
     (step 5b), then taxDeferred (step 5a).

   5a. TAX-DEFERRED — Withdraw from taxDeferred accounts
       (taxed as ordinary income at federalEffectiveRatePct).
       amountWithdrawn = min(remainingGap, taxDeferredBalance)
       remainingGap -= amountWithdrawn

   5b. TAXABLE CAPITAL GAINS — Withdraw from taxable accounts
       (gain portion taxed at capGainsRatePct).
       amountWithdrawn = min(remainingGap, taxableBalance)
       remainingGap -= amountWithdrawn

6. ROTH LAST — Withdraw from Roth accounts only if all other sources
   are exhausted (tax-free, most valuable to preserve).
   amountWithdrawn = min(remainingGap, rothBalance)
   remainingGap -= amountWithdrawn

7. If remainingGap > 0: record shortfall.
```

**Look-ahead heuristic:** Before step 5, if the account owner is within 3 years of RMD age and has large `taxDeferred` balances, the engine SHOULD increase the step-5a withdrawal amount by up to 20% to reduce future RMD-driven tax spikes. This "RMD smoothing" is optional but recommended.

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
                   - rmdAmountsAlreadyWithdrawn
```

> `pensionAndOtherIncome` includes pensions, other taxable/non-taxable income streams, and adjustments (net). There is no separate `adjustments` term — it is already folded into `pensionAndOtherIncome`.

Because taxes depend on the withdrawal mix and the withdrawal mix depends on taxes, the engine MUST use an **iterative approach** to break the circularity:

1. **Initial estimate:** Use the prior year's effective tax rate (or `federalEffectiveRatePct` for year 1) to estimate taxes for the withdrawal target formula.
2. **Iterate:** Compute withdrawals → compute actual taxes → recompute withdrawal target with actual taxes → recompute withdrawals. Repeat.
3. **Convergence criterion:** Stop when the absolute difference between successive tax estimates is < $100 (i.e., `|taxEstimate[n] - taxEstimate[n-1]| < 100`).
4. **Maximum iterations:** 5. If not converged after 5 iterations, use the last estimate and emit a `WITHDRAWAL_CONVERGENCE` diagnostic warning (not a fatal error).
5. Typical convergence: 2–3 iterations for most scenarios.

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
* The API key MUST be stored in IndexedDB only — never in localStorage, sessionStorage, URLs, cookies, or stored NDJSON files.
* The API key MUST NOT be synced to OneDrive or included in any stored NDJSON file.
* On first entry, the system MUST validate the API key by making a lightweight Claude API call.
* The system MUST use the Anthropic JS SDK (`@anthropic-ai/sdk`) or direct `fetch` to the Claude API with appropriate CORS handling.

**Graceful degradation without API key:**

* If no API key is configured, all LLM-powered features (portfolio advice, tax strategy advice, checklist insights, anomaly contextual analysis) MUST be unavailable, with a clear UI message directing the user to the settings page.
* All rule-based features MUST function fully without an API key: retirement simulation, tax computation, checklist generation (rule-based), anomaly detection (rule-based), NDJSON import, OneDrive sync.
* The deterministic fallback advice (see below) MUST always be available regardless of API key presence.

**Data minimization for LLM calls:**

* The client-side prompt builder MUST strip PII before sending to Claude. The following fields MUST be stripped or anonymized:

  | Field | Source Interface | Treatment |
  |---|---|---|
  | `PersonProfile` names (if added) | `HouseholdProfile` | Omit entirely; use "Primary" / "Spouse" |
  | SSNs, EINs | `TaxDocument.extractedFields` | Omit entirely |
  | Addresses (street, city, zip) | `TaxDocument.extractedFields` | Omit entirely; state is allowed |
  | `issuerName` | `TaxDocument` | Replace with generic label (e.g., "Employer A", "Brokerage 1") |
  | `Account.name` | `Account` | Replace with type-based label (e.g., "Taxable Account 1") |
  | `IncomeStream.name` | `IncomeStream` | Replace with generic label (e.g., "Pension 1") |
  | `sourceFileName` | `TaxDocument` | Omit entirely |
  | `oneDrivePath` | `TaxDocument` | Omit entirely |

  The prompt builder MUST use an **allowlist** approach: only include fields explicitly needed for the analysis prompt. Any field not in the allowlist is excluded by default.

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
* API key is stored in IndexedDB only and never appears in stored NDJSON files, OneDrive, localStorage, or URLs.
* PII never appears in LLM prompts or stored NDJSON files.
* User sees an indicator when data is transmitted to the LLM.
* Application functions fully without a Claude API key (rule-based features work, LLM features show "API key required" message).

---

## FR-9 Agent-Native Storage and Data Portability

### Requirements

The system MUST use **NDJSON (Newline-Delimited JSON)** as the storage format for all data in the OneDrive folder structure. Each line in an NDJSON file is a self-contained JSON object with a `_type` discriminator field.

**Agent-Native Storage:**

The OneDrive folder structure (§7.4) IS the agent-readable format. No explicit export is required. An LLM agent with read/write access to the `FinPlanner/` root directory MUST be able to:

* Read the root `README.md` pointer to locate `.agent/README.md`
* Read `.agent/README.md` for orientation: purpose, schema version, pointers to SCHEMA.md / EDITING.md / VALIDATION.md / `schemas/`
* Consult `.agent/SCHEMA.md` for complete schema reference (all `_type` values, fields, types, constraints, semantics, file-to-type mapping)
* Consult `.agent/EDITING.md` for rules on creating, updating, and deleting records
* Navigate the folder tree to locate specific data (tax years, retirement plans, accounts, etc.)
* Stream-process individual NDJSON files line-by-line, filtering by `_type`
* Make compatible edits to data files following `.agent/EDITING.md` rules
* Validate its own edits using `.agent/VALIDATION.md` (12-step checklist) and `.agent/schemas/*.schema.json`
* Reason over the entire customer data estate without any prior context beyond the `.agent/` folder contents

**Self-Contained Agent Documentation (`.agent/` folder):**

The system MUST maintain a `.agent/` subfolder within `FinPlanner/` containing all documentation needed for an LLM agent to both read and make compatible edits to data files. The `.agent/` folder is divided into **static** and **dynamic** content:

*Static content* (written on first run, updated on app version change — see §7.5.1):

* `.agent/README.md` — agent orientation and pointers to other documentation files
* `.agent/SCHEMA.md` — complete schema reference: every `_type`, every field, types, constraints, enums, ranges, semantics, file-to-type mapping, shared corpus decomposition
* `.agent/EDITING.md` — create/update/delete rules, ID conventions, header `savedAt` update, shared corpus propagation (with step-by-step checklist), tax year status rules (draft editable, filed frozen), cross-file referential integrity, file structure invariants, staleness warnings (DATA_SUMMARY.md, computed fields, checklist/anomalies), what NOT to edit
* `.agent/VALIDATION.md` — 12-step numbered validation checklist (JSON validity, `_type` presence, header line, schema conformance, required fields, enum validity, numeric ranges, referential integrity, uniqueness, corpus propagation, business invariants, file structure invariants)
* `.agent/schemas/*.schema.json` — one JSON Schema file per `_type` (identical to repo's `schemas/` directory)

*Dynamic content* (regenerated on every save — see §7.5.2):

* `.agent/DATA_SUMMARY.md` — record counts, tax years with statuses, account names/types, income stream names, scenarios, imported PDFs. MUST NOT contain dollar amounts, balances, or PII.

**Root Pointer (README.md):**

The system MUST auto-generate a `FinPlanner/README.md` file that serves as a lightweight pointer to `.agent/README.md`. This file is static — it is generated on first run and updated only on app version changes (not on every save). It contains: a one-line description of the data estate, a pointer to `.agent/README.md` for full documentation, the app version, and the current `schemaVersion`.

**NDJSON Import (Data Portability):**

The system MUST provide an import function for:

* Restoring from backup files (monolithic NDJSON containing all record types)
* Migrating data from another FinPlanner instance
* Schema version migration (see §12)

NDJSON format specification (per file):

```
{"_type":"header","schemaVersion":"3.0.0","savedAt":"2026-02-15T...","modules":["tax","retirement"]}
{"_type":"household","maritalStatus":"married","filingStatus":"mfj",...}
{"_type":"account","id":"acct-401k","name":"401k",...}
...
```

Each line MUST be a valid JSON object. The `_type` field MUST be present on every line. The first line MUST be of `_type: "header"`.

Import system MUST provide:

* Schema validation (per-line validation with line-number error reporting)
* Human-readable validation errors with field paths and line numbers
* Migration hook for older schema versions
* Selective import (e.g., import only tax data, only retirement data, or both)
* Conflict resolution when importing into a non-empty data store

### Acceptance Criteria

* The OneDrive folder structure is self-describing — an LLM agent can navigate, analyze, **and edit** all data by starting at the root `README.md` pointer and following the `.agent/` documentation chain.
* An LLM agent can make compatible edits to data files using only the contents of `.agent/` (SCHEMA.md, EDITING.md, VALIDATION.md, schemas/), with no knowledge of the FinPlanner codebase. FinPlanner loads the modified data without errors on next launch.
* Static `.agent/` files are written on first run and updated when the app version changes.
* `.agent/DATA_SUMMARY.md` is regenerated on every save and contains only aggregate metadata (no dollar amounts, balances, or PII).
* Root `README.md` is a lightweight pointer to `.agent/README.md`, not a full manifest.
* `.agent/schemas/*.schema.json` files are identical to the repo's `schemas/` directory.
* Individual NDJSON files are valid and parseable line-by-line.
* Import from monolithic NDJSON files preserves data fidelity for both tax and retirement data.
* Import validates against schemas and shows actionable error diagnostics with line numbers.

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
  5. On user confirmation, the frontend writes the PDF to OneDrive - Personal (`FinPlanner/imports/{taxYear}/`) and upserts the extracted data into the tax year record. If a document with the same filename/ID exists, its previous data contribution is removed from aggregates before adding the new data to prevent double-counting.
  6. Raw PDF content never leaves the browser. No backend endpoint is involved in extraction.
* The system MUST flag low-confidence extractions for manual review. The default confidence threshold is **0.80** — fields extracted with confidence below this value are flagged. The threshold MAY be configurable.
* The system MUST track **per-field confidence** in addition to aggregate document confidence, so the UI can highlight specific uncertain fields.
* The system MUST NOT send raw PDF content to the LLM. Only extracted structured fields may be sent for LLM analysis if requested.
* Multiple documents for the same tax year MUST be supported. The `TaxYearRecord` aggregates values from all active documents (e.g., sum of wages from 3 different W-2s). Deleting a document subtracts its values from the aggregate.

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
| 1099-MISC | Payer name, rents (Box 1), royalties (Box 2), other income (Box 3), federal tax withheld (Box 4) |
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

**Rule-based checklist generation rules (minimum v1 set):**

| Rule | Category | Trigger | Generated Item |
|---|---|---|---|
| Prior-year document match | `document` | For each `taxDocument` in prior year record, if no matching `formType` + `issuerName` exists in current year | "W-2 from {issuerName}" / "1099-DIV from {issuerName}" etc. with `status: "pending"` |
| Corpus account income | `income` | For each `account` in shared corpus with `type: "taxable"` and `currentBalance > 0` | "1099-INT/1099-DIV expected from {account.name}" with `status: "pending"` |
| Corpus income stream | `income` | For each `incomeStream` in shared corpus active in the target tax year | "{incomeStream.name} income expected" with `status: "pending"` |
| Prior-year deduction carryover | `deduction` | If prior year `useItemized: true` and any itemized deduction > 0 | "Review {deduction type} deduction" with `status: "pending"` |
| Filing status change | `life_event` | If shared corpus `filingStatus` differs from prior year `filingStatus` | "Filing status changed from {old} to {new} — verify" with `status: "pending"` |
| State change | `life_event` | If shared corpus `stateOfResidence` differs from prior year | "State of residence changed — review state tax impact" with `status: "pending"` |
| Filing deadline | `deadline` | Always generated for current tax year | "Federal filing deadline: April 15, {year+1}" with `status: "pending"` |

When a current-year `taxDocument` matches a checklist item (same `formType` and `issuerName`), the item's status is automatically updated to `"received"` and `linkedDocumentId` is set.

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
* The system MUST flag items where the percentage change exceeds the configurable threshold (default: >25%) **OR** the absolute change exceeds the configurable threshold (default: >$5,000). Either condition triggers the anomaly. Both thresholds are stored in `AppConfig` (`anomalyThresholdPct`, `anomalyThresholdAbsolute`).
* **Anomaly severity assignment rules:**

  | Condition | Severity |
  |---|---|
  | Missing document (omission category) | `warning` |
  | YoY change exceeds threshold but < 2× threshold | `warning` |
  | YoY change exceeds 2× threshold (e.g., >50% or >$10,000 at defaults) | `critical` |
  | New income source appeared (not in prior year) | `info` |
  | Pattern break across 3+ years | `warning` |
* The system SHOULD use Claude to provide **contextual analysis** of detected anomalies, suggesting possible explanations and recommended actions.
* Anomaly results MUST be stored in the OneDrive folder structure as NDJSON (type `_type: "anomaly"`) per §7.4.

### Acceptance Criteria

* System detects when a document/income source from prior year is missing in current year.
* System flags material changes in key financial figures with threshold-based rules.
* Anomalies include severity (info/warning/critical) and suggested action.
* Claude-powered contextual analysis is available for flagged items.
* Anomaly data is stored in the OneDrive folder structure and readable by agents.

---

## FR-14 OneDrive Storage Integration

### Requirements

The system MUST persist all user data to **OneDrive - Personal** via the Microsoft Graph API, with the **SPA as the sole mediator** of all storage operations. There is no backend.

**Authentication:**

* The frontend MUST use **MSAL.js** (`@azure/msal-browser`) with the **PKCE authorization code flow** for user authentication.
* **Azure AD app registration:** A Single Page Application (SPA) registration is required in Azure Entra ID (formerly Azure AD) with redirect URI set to the app's origin, the `Files.ReadWrite` and `User.Read` delegated API permissions configured, and PKCE enabled. The `clientId` from this registration is passed to MSAL at initialization via the `VITE_MSAL_CLIENT_ID` environment variable (set in `.env` for local dev, in the hosting provider's environment config for production). The authority URL defaults to `https://login.microsoftonline.com/common` (multi-tenant personal accounts). Detailed setup steps MUST be documented in `docs/runbook.md`.
* Required delegated permission scopes: `Files.ReadWrite`, `User.Read`.
* Access tokens MUST be acquired silently when possible (cached), with interactive fallback (popup/redirect).
* Tokens MUST NOT be stored outside the browser's MSAL cache. There is no backend to send tokens to.

**First launch vs. returning user:**

* **Before authentication:** The app MUST display a landing page with a brief description of FinPlanner and a "Sign in with Microsoft" button. No financial data screens are accessible before auth. The landing page is the default route (`/`).
* **First launch (no `FinPlanner/` folder in OneDrive):** After successful MSAL auth, the app detects that the `FinPlanner/` folder does not exist. It creates the full folder structure (§7.4), writes static `.agent/` content (§7.5.1), initializes `config.ndjson` with default `AppConfig` values, and redirects the user to the Dashboard with an empty state (no data). The Dashboard empty state MUST display a guided onboarding prompt: "Get started by adding your household information" with a link to the Household setup page.
* **Returning user (folder exists):** After MSAL auth, the app loads data from IndexedDB (instant), then syncs with OneDrive in the background (§sync protocol below). The user is directed to the Dashboard immediately.
* **MSAL interactive fallback:** The app MUST prefer popup-based interactive authentication. If popup is blocked (common on mobile), the app MUST automatically fall back to redirect-based authentication. The fallback strategy MUST be documented in code comments.

**File operations:**

* The frontend MUST use the **Microsoft Graph JS SDK** (`@microsoft/microsoft-graph-client`) for all OneDrive CRUD operations.
* On first launch, the app MUST create the `FinPlanner/` folder structure (per §7.4) if it does not exist, including the `.agent/` subfolder with all static content (per §7.5.1).
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

**NDJSON serialization pattern:** The TypeScript interfaces below define the **domain fields** of each record type. When serialized to NDJSON, every record line MUST include an additional `_type` discriminator field (matching `NdjsonRecordType`) and an `id` field (where applicable). The implementation SHOULD use a generic wrapper type for serialization:

```ts
type NdjsonRecord<T extends NdjsonRecordType, D> = { _type: T } & D;
// Example: NdjsonRecord<"account", Account> = { _type: "account", id: string, name: string, ... }
```

The domain interfaces intentionally omit `_type` to keep them reusable in non-NDJSON contexts (e.g., the `PlanInput` runtime assembly). The serialization layer adds `_type` on write and strips it on read.

**Record types with `id` fields:** `account`, `incomeStream`, `adjustment`, `taxDocument`, `checklistItem`, `anomaly` — these have an `id: string` field used for uniqueness and cross-referencing. `id` values MUST be unique within their `_type` scope (e.g., no two `account` records with the same `id`). **Record types without `id`:** `header` (one per file), `household` (one per corpus), `appConfig` (one per config file), `retirementPlan` (one per plan), `simulationResult` (keyed by `scenarioId`), `taxYear` (keyed by `taxYear: number` — this is the uniqueness key; no two `taxYear` records may share the same year).

```ts
type FilingStatus = "single" | "mfj" | "survivor";
type AccountType = "taxable" | "taxDeferred" | "deferredComp" | "roth";
type SimulationMode = "deterministic" | "historical" | "stress" | "monteCarlo";
type TaxYearStatus = "draft" | "ready" | "filed" | "amended";
type ChecklistItemStatus = "pending" | "received" | "not_applicable" | "waived";
type AnomalySeverity = "info" | "warning" | "critical";
type TaxFormType = "W-2" | "1099-INT" | "1099-DIV" | "1099-R" | "1099-B" | "1099-MISC" | "1099-NEC" | "K-1" | "1098" | "other";
type NdjsonRecordType = "header" | "household" | "account" | "incomeStream" | "adjustment" | "appConfig" | "taxYear" | "taxDocument" | "checklistItem" | "anomaly" | "retirementPlan" | "simulationResult";

interface PersonProfile {
  id: "primary" | "spouse";
  birthYear: number;                     // calendar year of birth; used for SECURE 2.0 RMD age determination (§5.4.1)
  currentAge: number;                    // age as of the current calendar year. Stored in NDJSON as a snapshot; the app recomputes it on load as (currentCalendarYear - birthYear) to prevent staleness. CLI tools may leave it unchanged — the app will correct it.
  retirementAge: number;                 // informational/display only in v1; the simulation always starts at the current year regardless of retirement age. Stored for UI display and future pre-retirement contribution modeling.
  lifeExpectancy: number;                // exclusive upper bound — person is alive through age (lifeExpectancy - 1); see §1.1 year count definition
  socialSecurity?: {
    claimAge: number;
    piaMonthlyAtFRA?: number;            // informational only in v1; stored for display and future PIA-to-claim-age conversion. The engine uses estimatedMonthlyBenefitAtClaim for all calculations.
    estimatedMonthlyBenefitAtClaim: number; // REQUIRED when socialSecurity is present. The monthly benefit at the chosen claimAge. The engine annualizes this: annualBenefit = estimatedMonthlyBenefitAtClaim * 12.
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
  startYear: number;                   // calendar year (e.g., 2030)
  endYear: number;                     // calendar year (e.g., 2039)
  frequency: "annual" | "monthly";
  amount: number;
  inflationAdjusted: boolean;            // when true, `amount` grows annually by the active inflation rate. In deterministic mode, uses `SpendingPlan.inflationPct`: year N pays `amount × (1 + inflationPct/100)^(N−1)`. In historical/stress modes, uses the scenario's per-year inflation value (per FR-6) with cumulative compounding: year N pays `amount × ∏(1 + inflationRate_i/100)` for i=1..N−1. Matches the inflation source used by `Adjustment.inflationAdjusted`.
}

interface Account {
  id: string;
  name: string;
  type: AccountType;
  owner: "primary" | "spouse" | "joint"; // "joint" is valid ONLY for `taxable` accounts. Accounts of type `taxDeferred`, `deferredComp`, or `roth` MUST have owner "primary" or "spouse" (IRS rules prohibit joint ownership of these account types). Validation MUST reject joint ownership on account types other than `taxable`.
  currentBalance: number;
  costBasis?: number; // taxable accounts
  expectedReturnPct: number;
  volatilityPct?: number;               // annual return standard deviation (%) — required for Monte Carlo mode (see model-limitations.md item 13); ignored in deterministic/historical modes
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
  colaPct?: number;                     // default: 0 if omitted (income amount is fixed, not inflation-adjusted)
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
  inflationAdjusted?: boolean;          // default: false. When true AND endYear is set, the amount is scaled by the active inflation rate each year from `year` forward. In deterministic mode, uses `SpendingPlan.inflationPct`: yearN amount = `amount * (1 + inflationPct/100)^(N-1)`. In historical/stress modes, uses cumulative compounding with the scenario's per-year inflation values (per FR-6): yearN amount = `amount * ∏(1 + inflationRate_i/100)` for i=1..N−1. Matches the inflation source used by `DeferredCompSchedule.inflationAdjusted`. For negative amounts (expenses), the absolute magnitude increases over time (e.g., -$25,000 at 2% → -$25,500 in year 2). When true and endYear is omitted (one-time), inflation adjustment has no effect.
}

interface AppConfig {
  theme: "light" | "dark";
  claudeModelId: string;                 // default: latest Claude Sonnet model ID at time of app release (updated with each release)
  anomalyThresholdPct: number;           // default 25 — YoY percentage change threshold for anomaly detection
  anomalyThresholdAbsolute: number;      // default 5000 — YoY absolute change threshold ($)
  confidenceThreshold: number;           // default 0.80 — PDF extraction confidence threshold
  lastSyncTimestamp?: string;            // ISO 8601 — last successful OneDrive sync
}

interface SpendingPlan {
  targetAnnualSpend: number;
  inflationPct: number;
  floorAnnualSpend?: number;          // guardrail: minimum spend (see FR-5a)
  ceilingAnnualSpend?: number;        // guardrail: maximum spend (see FR-5a)
  survivorSpendingAdjustmentPct: number; // fraction (NOT percentage): e.g., 0.70 = survivor spends 70% of joint target. Unlike other `Pct` fields which use percentage values (e.g., inflationPct: 2.5), this field uses a 0-to-1 fraction. Formula: survivorSpend = jointTarget × survivorSpendingAdjustmentPct. Validation: MUST be in range [0, 1.0]; values > 1.0 MUST trigger a validation error (this is an exception to §8.3's general -100/+100 percent bound, which applies to actual percentage fields).
}

interface TaxConfig {
  federalModel: "effective" | "bracket";  // v1 implements "effective" only; "bracket" is reserved for future use and MUST NOT be selectable in the v1 UI
  stateModel: "effective" | "bracket" | "none";  // v1 implements "effective" and "none" only; "bracket" is reserved
  federalEffectiveRatePct?: number;    // default: 22 if omitted (approximate middle bracket for moderate-income retirees)
  stateEffectiveRatePct?: number;      // default: lookup from states.json by HouseholdProfile.stateOfResidence incomeRate; 0 if state has no income tax
  stateCapGainsRatePct?: number;       // default: lookup from states.json capitalGainsRate; if omitted and stateEffectiveRatePct is set, use stateEffectiveRatePct (most states tax CG as ordinary)
  capGainsRatePct?: number;            // default: 15 if omitted (most common LTCG rate)
  standardDeductionOverride?: number;  // overrides default for BOTH federal and state tax computation (single value); if omitted, use current-law default from §5.4.2 for the current filing status. During filing status transitions (MFJ → survivor → single), the override — if set — applies as a fixed absolute value regardless of filing status (it replaces whatever the default deduction would be). If the user wants status-appropriate deductions, they should leave this field omitted. Separate state standard deductions are a future enhancement (see model-limitations.md item 14).
}
```

> **State SS exemption lookup:** The `ssTaxExempt` flag (`"yes" | "no" | "partial"`) is NOT stored in `TaxConfig`. The engine looks it up at runtime from the `states.json` data asset (§5.4.3) using `HouseholdProfile.stateOfResidence`. If the state's `ssTaxExempt` is `"yes"`, state tax on SS income is 0. If `"partial"`, the engine treats it as `"yes"` in v1 (see model-limitations.md). If `"no"`, the state effective rate applies to the federally-taxable SS portion.

interface MarketConfig {
  simulationMode: SimulationMode;
  deterministicReturnPct?: number;
  deterministicInflationPct?: number;    // Reserved for future use. In v1, this field has no effect on computation. Spending growth and all inflation-sensitive calculations use `SpendingPlan.inflationPct` in deterministic mode, or the scenario's per-year inflation values in historical/stress modes (per FR-6). When a historical/stress scenario provides an inflation sequence, that sequence overrides `SpendingPlan.inflationPct` for that year. If omitted, defaults to `SpendingPlan.inflationPct`.
  historicalScenarioIds?: string[];
  stressScenarioIds?: string[];
  monteCarloRuns?: number;              // default: 10000. Number of simulation runs for Monte Carlo mode.
}
```

> **Multi-scenario orchestration:** The `simulationMode` field indicates the mode for a single `simulate()` call. The `historicalScenarioIds` and `stressScenarioIds` arrays store the user's selected scenario set. The SPA MUST call `simulate()` separately for each scenario: once with `simulationMode: "deterministic"` (baseline), once per historical scenario with `simulationMode: "historical"` and the specific scenario's return/inflation data, and once per stress scenario with `simulationMode: "stress"`. Each call returns a separate `PlanResult`, stored as `retirement/results/{scenario-id}.ndjson`. The stored `MarketConfig` in `plan.ndjson` captures the user's full configuration; the SPA extracts the relevant subset for each `simulate()` call.

```ts
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
  grossIncome: number;                   // total pre-tax income. Does NOT include Roth withdrawals. Decomposition using existing YearResult fields: grossIncome = socialSecurityIncome + nqdcDistributions + pensionAndOtherIncome + (sum(withdrawalsByAccount) - rothWithdrawals). Note: rmdTotal is a subset of taxDeferred account withdrawals in withdrawalsByAccount, so it is implicitly included.
  socialSecurityIncome: number;
  nqdcDistributions: number;             // NQDC payouts for the year
  rmdTotal: number;                      // total RMDs withdrawn across all tax-deferred accounts
  pensionAndOtherIncome: number;         // total from pensions, other taxable/non-taxable income streams, and adjustments (net).
  rothWithdrawals: number;               // total Roth withdrawals for the year (tax-free, not included in grossIncome)
  withdrawalsByAccount: Record<string, number>; // keyed by account ID. Includes discretionary withdrawals and RMDs from taxDeferred, taxable, and roth accounts. Does NOT include NQDC scheduled distributions (those are tracked separately in `nqdcDistributions` and reduce the deferredComp account balance directly). Does NOT include pensions or other income streams.
  taxesFederal: number;
  taxesState: number;
  taxableOrdinaryIncome: number;         // for diagnostics
  taxableCapitalGains: number;           // for diagnostics
  netSpendable: number;                  // grossIncome + rothWithdrawals - taxesFederal - taxesState. This is the total amount available for spending after taxes. Roth withdrawals are added because they are tax-free cash available for spending but excluded from grossIncome.
  shortfall: number;                     // positive = unmet spending; 0 = fully funded. shortfall = max(0, actualSpend - netSpendable)
  surplus: number;                       // surplus = max(0, netSpendable - actualSpend). Positive when mandatory income (RMDs, SS, NQDC, pensions) + Roth exceeds spending + taxes. Surplus is reinvested per §8.1 step 10.
  endBalanceByAccount: Record<string, number>;
  costBasisByAccount?: Record<string, number>; // taxable accounts only
}

interface PlanResult {
  summary: {
    successProbability?: number;           // Monte Carlo: fraction of runs with zero shortfall years. Deterministic/historical: 1.0 if no shortfall in any year, 0.0 otherwise.
    medianTerminalValue?: number;          // Monte Carlo: median across runs. Deterministic/historical: the single-run terminal portfolio value (sum of all account end balances in the final year).
    worstCaseShortfall?: number;           // Monte Carlo: max single-year shortfall across worst-performing run. Deterministic/historical: max single-year shortfall from the single run (0 if fully funded).
  };
  yearly: YearResult[];                    // Monte Carlo: yearly results from the median run. Deterministic/historical: yearly results from the single run.
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
  documentIds: string[];                // array of TaxDocument.id values; in NDJSON storage, documents are stored as separate `taxDocument` lines, not nested. The SPA joins documentIds → TaxDocument records at read time.
  notes?: string;
}

interface ChecklistItem {
  id: string;
  taxYear: number;
  category: "document" | "income" | "deduction" | "life_event" | "deadline";
  description: string;
  status: ChecklistItemStatus;
  sourceReasoning: string;               // why this item is on the checklist
  relatedPriorYearItem?: string;         // ChecklistItem.id from the prior year's checklist (e.g., "chk-2024-001"); enables YoY tracking of the same expected document
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

// UI-assembled aggregate type — not returned by any single module interface function.
// The SPA constructs this by combining results from generateChecklist() and detectAnomalies().
interface TaxAnalysisResult {
  taxYear: number;
  checklist: TaxChecklist;
  anomalies: Anomaly[];
  yearOverYearSummary: {
    totalIncomeChange: number;             // absolute dollar change: current year total income - prior year (positive = increase)
    totalDeductionChange: number;          // absolute dollar change: current year total deductions - prior year (positive = increase)
    effectiveRateChange: number;           // percentage point change: current year effective rate - prior year (e.g., 2.5 = rate increased by 2.5pp)
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
  savedAt: string;                       // ISO 8601
  modules: ("tax" | "retirement" | "config")[];  // which modules' data is included; "config" for app settings. Per-file headers list the module(s) that file belongs to. Backup headers (from generateBackup) list ALL modules present in the backup.
  checksum?: string;                     // informational only — see note below
}
```

> **Checksum field (CLI-friendliness note):** The `checksum` field is **informational only**. It is a SHA-256 hex digest of all non-header lines in the file, computed and written by the app on every save. The app MUST NOT reject or refuse to load a file because the checksum is missing, absent, or mismatched. On load, the app silently ignores the stored checksum. On save, the app recomputes and overwrites it. This design ensures that CLI tools and LLM agents can freely edit NDJSON files without needing to recompute the checksum — the app will fix it on next save.

### NDJSON Record Type ↔ Data Model Mapping

Each `_type` maps to a specific interface and content scope:

| `_type` | Interface | Content |
|---|---|---|
| `"header"` | `NdjsonHeader` | Schema version, file metadata |
| `"household"` | `HouseholdProfile` | Shared corpus: household demographics, SS config |
| `"account"` | `Account` | Shared corpus: one record per account |
| `"incomeStream"` | `IncomeStream` | Shared corpus: one record per income stream |
| `"adjustment"` | `Adjustment` | Shared corpus: one record per adjustment |
| `"appConfig"` | `AppConfig` | Application settings and tunable thresholds (in `config.ndjson`) |
| `"retirementPlan"` | `{ spending: SpendingPlan, taxes: TaxConfig, market: MarketConfig, strategy: StrategyConfig }` | Retirement-specific config (the non-shared subset of `PlanInput`) |
| `"simulationResult"` | `PlanResult & { scenarioId: string }` | One record per scenario result; `scenarioId` is the scenario `id` (e.g., `"deterministic"`, `"gfc_2008"`) |
| `"taxYear"` | `TaxYearRecord` | Tax year record; `documentIds` references separate `taxDocument` lines |
| `"taxDocument"` | `TaxDocument` with `taxYear` field | One record per imported document |
| `"checklistItem"` | `ChecklistItem` | One record per checklist entry |
| `"anomaly"` | `Anomaly` | One record per detected anomaly |

> **Note on `PlanInput` vs. NDJSON decomposition:** The `PlanInput` interface is the **assembled runtime type** consumed by the client-side simulation engine (`simulate()` function). In NDJSON storage, `PlanInput` is decomposed into shared corpus records (`household`, `account`, `incomeStream`, `adjustment`) plus the `retirementPlan` record (retirement-specific config). The SPA assembles `PlanInput` from these records before calling the simulation function. `PlanInput.schemaVersion` is sourced from the `NdjsonHeader.schemaVersion` of the corpus file.

> **Note on `TaxChecklist` vs. `checklistItem`:** Similarly, the `TaxChecklist` interface is an **assembled runtime type** returned by `generateChecklist()` (§9.5). In NDJSON storage, only individual `checklistItem` records are stored (one per line in `checklist.ndjson`). The `TaxChecklist` wrapper (including `generatedAt`, `completionPct`, and the `items` array) is assembled by the SPA at read time. The `completionPct` is computed from the statuses of the `checklistItem` records.

### 7.4 OneDrive Storage Layout

```text
OneDrive - Personal/
  FinPlanner/
    README.md                            // static pointer to .agent/ folder
    config.ndjson                        // app settings (AppConfig) with its own NDJSON header
    .agent/                              // self-contained agent documentation (metadata only, no customer data)
      README.md                          // agent orientation: purpose, pointers to other .agent/ files
      SCHEMA.md                          // complete schema reference: all _types, fields, constraints, semantics
      EDITING.md                         // editing rules: create/update/delete, propagation, invariants
      VALIDATION.md                      // 12-step validation checklist for agent self-verification
      DATA_SUMMARY.md                    // dynamic: record counts, tax years, accounts (regenerated on every save)
      schemas/
        ndjson-header.schema.json
        household.schema.json
        account.schema.json
        income-stream.schema.json
        adjustment.schema.json
        app-config.schema.json
        retirement-plan.schema.json
        simulation-result.schema.json
        tax-year-record.schema.json
        tax-document.schema.json
        checklist-item.schema.json
        anomaly.schema.json
        advice-response.schema.json
    shared/
      corpus.ndjson                      // all shared corpus records (household, accounts, incomeStreams, adjustments)
    tax/
      {year}/
        record.ndjson                    // TaxYearRecord + associated taxDocument records (one line each)
        checklist.ndjson                 // checklistItem records (one per line); regenerated wholesale — see note below
        anomalies.ndjson                 // anomaly records (one per line); regenerated wholesale — see note below
    retirement/
      plan.ndjson                        // retirementPlan record (SpendingPlan + TaxConfig + MarketConfig + StrategyConfig)
      results/
        {scenario-id}.ndjson             // PlanResult per scenario
    imports/
      {year}/
        *.pdf                            // original uploaded PDFs
```

> The folder structure IS the agent-readable format. No separate export step is needed. An LLM agent reads the root `README.md` pointer, then navigates to `.agent/README.md` for full orientation, consults `.agent/SCHEMA.md` and `.agent/EDITING.md` for data structure and editing rules, and uses `.agent/VALIDATION.md` to verify its own edits.

> **File-to-`modules` header mapping:** Each NDJSON file's header line MUST set the `modules` array as follows:
>
> | File | `modules` value |
> |---|---|
> | `config.ndjson` | `["config"]` |
> | `shared/corpus.ndjson` | `["tax", "retirement"]` |
> | `tax/{year}/record.ndjson` | `["tax"]` |
> | `tax/{year}/checklist.ndjson` | `["tax"]` |
> | `tax/{year}/anomalies.ndjson` | `["tax"]` |
> | `retirement/plan.ndjson` | `["retirement"]` |
> | `retirement/results/{scenario-id}.ndjson` | `["retirement"]` |
>
> Backup files (from `generateBackup`) use `["tax", "retirement", "config"]` to indicate all modules are present.

> **`checklist.ndjson` and `anomalies.ndjson` — regenerated wholesale (CLI-friendliness note):** These two files are **app-generated outputs**, NOT user-authored source data. The app regenerates `checklist.ndjson` entirely when `generateChecklist()` runs (triggered by document imports, tax year changes, or user request) and `anomalies.ndjson` entirely when `detectAnomalies()` runs. **CLI edits to these files will be overwritten** on the next generation cycle. The one exception: user-set checklist item statuses (`received`, `not_applicable`, `waived`) are preserved by the app during regeneration — the app matches on `formType` + `issuerName` and retains the user's status override. CLI tools that need to mark a checklist item as received SHOULD edit the `status` field; other fields in these files should be treated as read-only.

### 7.5 Agent Documentation Generation and Sync

The system MUST auto-generate and maintain the `.agent/` folder and root `README.md` in the OneDrive `FinPlanner/` directory. These files provide LLM agents with everything needed to read, understand, edit, and validate data files without any knowledge of the FinPlanner codebase.

#### 7.5.1 Static Content Generation

**Triggers:** First app run (`.agent/` folder does not exist) OR app version update (app version stored in `.agent/README.md` differs from running app version).

**Files generated:**

1. **`FinPlanner/README.md`** (root pointer) — lightweight static file directing agents to `.agent/README.md`. Contains: one-line purpose, pointer to `.agent/README.md` for full documentation, app version, schemaVersion.

2. **`.agent/README.md`** (agent orientation) — entry point for agents. Contains: purpose and scope of the data estate, pointer to SCHEMA.md / EDITING.md / VALIDATION.md / `schemas/`, app version and schemaVersion, folder structure diagram (template-based, not dynamic), instructions for navigating data files.

3. **`.agent/SCHEMA.md`** — complete schema reference. MUST include: every `_type` value, every field for each type with its TypeScript type, constraints (required/optional, enums, numeric ranges, string formats), semantic meaning of each field, file-to-`_type` mapping (which files contain which record types), shared corpus decomposition explanation (how `PlanInput` is split across NDJSON records).

4. **`.agent/EDITING.md`** — editing rules for agents. MUST include:
   - How to create new records (ID conventions, required fields, `_type` discriminator). Note: most record types use an `id: string` field for uniqueness. Exceptions: `taxYear` is keyed by `taxYear: number` (the calendar year), `household` is a singleton (one per corpus), `retirementPlan` is a singleton, and `appConfig` is a singleton.
   - How to update existing records (which fields are editable, which are computed)
   - How to delete records
   - Header `savedAt` update requirement on every file modification
   - Shared corpus propagation rules (draft auto-propagates, filed frozen) — see "Shared Corpus Edit Checklist" below
   - Tax year status rules (draft editable, filed/amended frozen snapshots)
   - Cross-file referential integrity rules (e.g., `taxDocument.taxYear` must reference an existing `taxYear`)
   - File structure invariants (first line must be `_type: "header"`, one header per file)
   - What NOT to edit (computed fields in draft/ready tax years, `_type` field of existing records, `.agent/` folder contents, `checklist.ndjson`, `anomalies.ndjson`)
   - **Staleness warnings:** (a) `DATA_SUMMARY.md` is only regenerated by the app on save — after CLI edits, it will be stale until the app next saves; do not rely on it for current record counts. (b) Computed fields (`computedFederalTax`, `computedStateTax`, effective rates, `refundOrBalanceDue*`) in `draft`/`ready` tax years are recomputed by the app on load — CLI tools should edit source fields only and leave computed fields unchanged. (c) `checklist.ndjson` and `anomalies.ndjson` are regenerated wholesale by the app — only checklist item `status` changes are preserved.
   - **Shared Corpus Edit Checklist** — step-by-step instructions for CLI tools editing `shared/corpus.ndjson`:
     1. Edit the target record(s) in `corpus.ndjson` (e.g., update an account balance, add an income stream).
     2. Update the header line's `savedAt` to the current ISO 8601 timestamp.
     3. For each `draft` tax year in `tax/{year}/record.ndjson`: update the corresponding fields to match the new corpus values (e.g., if filing status changed in the household record, update `filingStatus` in each draft tax year record). Update that file's header `savedAt` as well.
     4. Do NOT modify `filed` or `amended` tax year records — they are frozen snapshots.
     5. For `ready` tax year records: update is optional — the app will prompt the user on next load if corpus values differ.
     6. The retirement plan (`retirement/plan.ndjson`) always reads from the current corpus at runtime — no manual update needed, but updating its header `savedAt` is good practice.
     7. Run the `.agent/VALIDATION.md` checklist to verify all edits.

5. **`.agent/VALIDATION.md`** — numbered validation checklist for agents to verify their own edits. MUST include these 12 steps:
   1. JSON validity — every line is valid JSON
   2. `_type` presence — every line has a `_type` field
   3. Header line — first line of every file is `_type: "header"` with `schemaVersion` and `savedAt`
   4. Schema conformance — each record validates against its `schemas/{_type}.schema.json`
   5. Required fields — all required fields for each `_type` are present
   6. Enum validity — all enum fields contain valid values (e.g., `filingStatus` ∈ {single, mfj, survivor})
   7. Numeric ranges — all numeric fields within documented bounds (e.g., percentages 0–100, ages 0–120)
   8. Referential integrity — cross-file references are valid (e.g., `taxDocument.taxYear` matches a `taxYear` record)
   9. Uniqueness — `id` fields are unique within their scope (e.g., account IDs across all accounts)
   10. Corpus propagation — draft tax years reflect current shared corpus; filed years are unchanged
   11. Business invariants — e.g., NQDC distributions don't exceed balance, RMD ages are ≥ 73 (or ≥ 75 for those born 1960+), filing status matches marital status
   12. File structure invariants — correct file in correct folder, naming conventions preserved

6. **`.agent/schemas/*.schema.json`** — one JSON Schema file per `_type`. MUST use JSON Schema draft 2020-12 or draft-07. These MUST be identical copies of the schemas in the repo's `schemas/` directory.

#### 7.5.2 Dynamic Content Generation

**Triggers:** Every save operation that modifies any NDJSON file or the folder structure.

**File generated:**

**`.agent/DATA_SUMMARY.md`** — dynamic snapshot of the current data estate. MUST include:
* Generation timestamp (ISO 8601)
* Schema version
* Actual folder structure (listing real tax years, scenario IDs, etc. — not template placeholders)
* Record counts per file (e.g., "corpus.ndjson: 1 household, 3 accounts, 2 income streams, 2 adjustments")
* Tax years on file with their statuses (e.g., "2024: filed, 2025: draft")
* Account names and types (e.g., "Taxable Brokerage (taxable), 401k (taxDeferred)")
* Income stream names (e.g., "Corporate Pension")
* Available retirement scenarios
* Imported PDF filenames by tax year

**MUST NOT include:** Dollar amounts, balances, income figures, SSNs, names of people, addresses, or any raw field values from data files. Only aggregate metadata (counts, names/types of entities, statuses) is permitted.

#### 7.5.3 Error Handling

`.agent/` folder generation failure MUST NOT block the primary save operation. A missing or stale `.agent/` folder is a degraded state, not a fatal error. The system SHOULD log a warning if generation fails. On the next successful save, the system MUST attempt to regenerate any missing or stale files (self-healing).

---

## 8. Calculation Engine Specification

The calculation engine runs entirely client-side as TypeScript modules in the browser. For Monte Carlo simulations (10k+ runs), the engine SHOULD use a Web Worker to avoid blocking the UI thread.

## 8.1 Required Execution Order (Per Year)

Engine MUST execute in this order:

1. Determine phase (joint/survivor), ages, filing context, survivor spending adjustment
2. Apply returns to **beginning-of-year balances** (returns are applied before withdrawals; this is a simplifying assumption that MUST be documented in `model-limitations.md`)
3. Compute mandatory income: SS benefits, NQDC scheduled distributions, pension/other income streams, adjustments
4. Inflate standard deduction:
   - **(a) Without override:** `standardDeduction(year N) = defaultDeduction(filingStatus_N) × (1 + inflationPct/100)^(N−1)`, where `defaultDeduction()` returns the §5.4.2 value for the year's filing status (e.g., $30,000 for `mfj`/`survivor`, $15,000 for `single`). The base resets to the new filing status's default on status transitions (e.g., `survivor` → `single` in year N+3 uses $15,000 as the new base, inflated from year 1).
   - **(b) With `standardDeductionOverride`:** `standardDeduction(year N) = standardDeductionOverride × (1 + inflationPct/100)^(N−1)`. The base does NOT reset on filing status transitions — the override is a fixed absolute value regardless of filing status.
5. Determine RMD age for each person based on birth year (SECURE 2.0: age 73 if born 1951-1959, age 75 if born ≥1960). Compute RMDs for all `taxDeferred` accounts where the owner has reached their specific RMD age.
6. Inflate spending target (apply `survivorSpendingAdjustmentPct` if in survivor phase; apply guardrail rules if enabled)
7. Compute **withdrawal target**: `inflatedSpendingTarget + estimatedTaxes - socialSecurityIncome - nqdcDistributions - pensionAndOtherIncome - rmdAmountsAlreadyWithdrawn` (see FR-7 for full formula and convergence iteration; `pensionAndOtherIncome` includes pensions, other income streams, and adjustments net)
8. Solve discretionary withdrawals per selected strategy to fill remaining gap
9. Calculate taxes (federal + state) using income classification rules from FR-4; iterate if tax estimate was materially wrong (1–3 iterations)
10. Compute net spendable (`grossIncome + rothWithdrawals - taxesFederal - taxesState`), shortfall, and surplus. **Surplus reinvestment:** If mandatory income (RMDs + SS + NQDC + pensions) plus Roth withdrawals exceeds spending + taxes, the excess is surplus cash. The surplus MUST be deposited into the first available `taxable` account (by array order). If no taxable account exists, the surplus is recorded in `YearResult.surplus` but not reinvested (it effectively disappears — the engine does not create new accounts). The reinvested amount increases the taxable account's balance AND cost basis by the surplus amount (it is new principal, not gains).
11. Apply fees to end-of-year balances: `balance = balance * (1 - feePct / 100)`
12. Apply rebalancing if `rebalanceFrequency` is `"annual"` (see §8.5). For `"quarterly"`, rebalancing occurs at end of each quarter within the year.
13. Produce end-of-year balances and diagnostics

## 8.2 Survivor Transition Rules

* System MUST transition from joint to survivor phase when one spouse exits model horizon (reaches life expectancy). **Timing:** `lifeExpectancy` is exclusive — the person is modeled as alive through the year they reach age `lifeExpectancy − 1`. The transition to survivor phase occurs at the **start of the next year**. Example: if primary's `currentAge` is 65 and `lifeExpectancy` is 85, primary is alive through year 20 (age 84). Year 21 is the first survivor-phase year (the primary does not appear in year 21).
* System MUST apply the `survivorSpendingAdjustmentPct` from `SpendingPlan` to the spending target starting in the first survivor-phase year.
* System MUST apply survivor SS benefit logic (survivor receives the higher of their own benefit or the deceased's benefit, not both).
* System MUST stop income streams owned by the deceased spouse (unless `survivorContinues: true`).
* System MUST consolidate accounts owned by the deceased spouse into the survivor's ownership for withdrawal purposes. After consolidation, RMD calculations for the consolidated accounts use the **survivor's** age and `birthYear` (the survivor is the new owner). This is consistent with IRS inherited IRA rules for spousal beneficiaries who elect to treat the account as their own.

### Survivor Filing Status Transition

In the survivor phase, filing status transitions as follows:

1. **First two survivor-phase years:** The first year the deceased spouse is no longer modeled (year N+1, where the deceased's last alive year was year N at age `lifeExpectancy − 1`) and the following year (year N+2) use filing status `"survivor"` (qualifying surviving spouse), which uses MFJ brackets/deductions/thresholds.
2. **Year N+3 onward:** Filing status transitions to `"single"`, which uses single brackets/deductions/thresholds (including SS taxation thresholds per FR-3).
3. This transition MUST be automatic — the engine derives it from ages and life expectancy, not from user input.
4. **Model simplification:** In real IRS rules, the "year of death" is the last year the person was alive (the person can still file jointly for that year). This model treats the year of death as the last year of joint phase (year N), and the 2-year survivor window begins the following year (N+1). This is documented in `model-limitations.md`.

## 8.3 Numerical/Validation Rules

* All balances and currency fields MUST be finite numbers.
* Percent inputs MUST be bounded (e.g., -100 to +100 where applicable; practical UI limits SHOULD be narrower).
* Ages MUST be sensible (e.g., 0–120 bound).
* Engine MUST prevent negative account balances unless explicit borrowing mode exists (not in v1).
* **Depleted portfolio ($0 total balance):** The simulation MUST continue producing `YearResult` rows for every year through end of horizon even when all account balances are $0. In this state: RMDs are $0 (balance/divisor = 0), discretionary withdrawals are $0, fees are $0, and `shortfall` equals the full spending target minus any remaining mandatory income (SS, pensions). The engine MUST NOT terminate early or throw an error.

## 8.4 Tax Module Computation Model

The tax planning module's `TaxYearRecord` contains `computedFederalTax`, `computedStateTax`, and effective rate fields. These are computed differently depending on the tax year's `status`:

**For `filed` and `amended` tax years:**

* `computedFederalTax` and `computedStateTax` are **user-entered actuals** (what was actually paid/owed). The system pre-populates these from extracted documents (e.g., 1040 if imported) but the user may override.
* Effective rates are derived: `computedEffectiveFederalRate = computedFederalTax / totalGrossIncome` and `computedEffectiveStateRate = computedStateTax / totalGrossIncome`, where `totalGrossIncome = wages + selfEmploymentIncome + interestIncome + dividendIncome + capitalGains + rentalIncome + nqdcDistributions + retirementDistributions + socialSecurityIncome + otherIncome - capitalLosses`. Note: `qualifiedDividends` is a subset of `dividendIncome` (not additive) and is NOT added separately here. Both effective rates use the same `totalGrossIncome` denominator.

**For `draft` and `ready` tax years:**

* The system MUST **estimate** tax liability using the income data available. The estimation model mirrors the retirement engine's effective-rate approach (§FR-4):
  1. Sum all ordinary income (wages, self-employment, interest, non-qualified dividends [`dividendIncome − qualifiedDividends`], NQDC, retirement distributions, rental, other).
  2. Add taxable portion of Social Security (per FR-3 provisional income rules).
  3. Subtract the applicable deduction (`standardDeduction` or sum of `itemizedDeductions` if `useItemized` is true).
  4. Apply `federalEffectiveRatePct` from the shared `TaxConfig` to the result (floored at 0).
  5. Apply `capGainsRatePct` to net capital gains plus qualified dividends: `(max(0, capitalGains - capitalLosses) + qualifiedDividends) * capGainsRatePct / 100`. If net capital gains are negative (losses exceed gains), the capital gains portion is $0 but `qualifiedDividends` still applies. Excess capital losses do NOT offset ordinary income, do NOT offset qualified dividends, and are NOT carried forward — see model-limitations.md.
  6. Apply credits: `totalCredits = childTaxCredit + educationCredits + foreignTaxCredit + otherCredits`. Credits apply to **federal tax only** in v1. State tax credits are not modeled; `computedStateTax` is not reduced by `TaxYearCredits`. All credits are treated as **non-refundable** — the floor ensures `computedFederalTax` is never negative. Refundable credit modeling is a future enhancement (see model-limitations.md item 16). `computedFederalTax = max(0, ordinaryTax + capitalGainsTax - totalCredits)`.
  7. State tax:
     a. If `stateModel` is `"none"`, `computedStateTax = 0`. Skip remaining sub-steps.
     b. Compute state ordinary income: start with the same ordinary income base as federal step 1. If the state's `ssTaxExempt` flag (from `states.json` per §5.4.3) is `"no"`, add the taxable SS portion (from FR-3, same as federal step 2). If `"yes"` or `"partial"` (treated as `"yes"` in v1), do NOT add the taxable SS portion.
     c. Subtract the same deduction used in federal step 3 (see model-limitations.md item 14 for this simplification).
     d. Apply `stateEffectiveRatePct` to the result (floored at 0).
     e. Apply `stateCapGainsRatePct` to net capital gains plus qualified dividends (same base as federal step 5). If `stateCapGainsRatePct` is not set, fall back to `stateEffectiveRatePct` (most states tax CG as ordinary income).
     f. `computedStateTax = stateOrdinaryTax + stateCapitalGainsTax`.
* `computedFederalTax` and `computedStateTax` always store the **final post-credit** values — the amounts actually owed. For filed years this is user-entered; for draft years this is the result of the algorithm above. For all statuses, effective rate fields use the same `totalGrossIncome` denominator defined under "filed and amended" above: `computedEffectiveFederalRate = computedFederalTax / totalGrossIncome`, `computedEffectiveStateRate = computedStateTax / totalGrossIncome`. If `totalGrossIncome` is 0 (e.g., no income entered yet), both effective rates MUST be 0.
* If the user has enough prior-year `filed` data, the system SHOULD derive effective rates from actual history rather than the shared `TaxConfig` defaults.
* The UI MUST clearly label estimated values as "Estimated" and distinguish them from user-entered actuals.

**Recomputation on load (CLI-friendliness):**

When the app loads data from OneDrive, it MUST recompute `computedFederalTax`, `computedStateTax`, `computedEffectiveFederalRate`, `computedEffectiveStateRate`, `refundOrBalanceDueFederal`, and `refundOrBalanceDueState` for **`draft` and `ready` tax years** using the algorithm above. The stored values of these fields in NDJSON are treated as a cache — if a CLI tool or LLM agent edits source fields (income, deductions, credits, payments), the app will recompute the correct values on next load. For `filed` and `amended` years, the stored computed values are authoritative (user-entered actuals) and are NOT recomputed.

This means CLI tools editing `draft` tax year income or deduction fields do NOT need to update the computed fields — the app handles it automatically.

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

1. **Timing:** Rebalancing occurs at end-of-year (after fees, step 11 in §8.1) for `"annual"`, or at end of each quarter for `"quarterly"` (modeled as 4 sub-periods per simulation year).
2. **Target allocation:** Each account with a `targetAllocationPct` defines its target share of the **total portfolio balance** (sum of all accounts with targets). Accounts without `targetAllocationPct` are excluded from rebalancing.
3. **Validation:** The sum of all `targetAllocationPct` values MUST equal 100. If not, the engine MUST emit a `VALIDATION_FAILED` error before simulation starts. Example: if accounts A (60%), B (40%) have targets and account C has no target, rebalancing adjusts A and B to 60%/40% of (A+B) combined value. Account C is unaffected and excluded from the rebalancing calculation.
4. **Rebalancing step:**
   a. Compute total portfolio value (sum of all accounts with targets).
   b. For each account: `targetBalance = totalPortfolio * (targetAllocationPct / 100)`.
   c. Compute delta: `delta = targetBalance - currentBalance`.
   d. Transfer balances between accounts to match targets. Transfers are **notional** and may cross account types (e.g., taxable ↔ taxDeferred). In reality, cross-type transfers are not possible; the notional model represents the *effect* of changing future contribution/withdrawal patterns to converge on target allocations. No tax event is triggered by rebalancing in v1 — this is a simplifying assumption that MUST be documented in `model-limitations.md`.
5. **Cost basis adjustment:** When a taxable account receives a notional inflow via rebalancing, the cost basis increases by the inflow amount (it represents new "purchases" at current value). When a taxable account has a notional outflow, cost basis decreases proportionally (same formula as withdrawal basis reduction in FR-2).
6. When `rebalanceFrequency` is `"none"`, no rebalancing occurs and `targetAllocationPct` is ignored.

**Quarterly rebalancing and the annual loop:** When `rebalanceFrequency` is `"quarterly"`, the engine does NOT re-run the full 13-step annual loop four times. Instead, steps 1–10 execute once for the full year as normal. Then, the quarterly rebalancing step executes four times at quarterly boundaries (end of Q1, Q2, Q3, Q4). At each quarterly checkpoint: split the year's total returns proportionally (each quarter applies ¼ of the annual return to each account's balance), then execute the rebalancing algorithm (step 4 above) against the resulting balances. After all four quarterly rebalancing steps complete, fees (step 11) are applied once to the post-rebalancing balances, and step 13 produces end-of-year results. Withdrawals, taxes, RMDs, and spending remain annual — only the rebalancing frequency changes.

> **Fee ordering difference (deliberate):** In annual mode, fees are applied BEFORE rebalancing (step 11 → step 12). In quarterly mode, fees are applied AFTER all quarterly rebalancing steps (rebalance ×4 → fees). This is intentional: quarterly rebalancing operates on fee-free intermediate balances to avoid compounding fee deductions with quarterly rebalancing adjustments. The net impact is negligible for typical fee levels (< 1%) but ensures cleaner quarterly intermediate balances.

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
* The SPA reads a monolithic NDJSON backup file from a local file picker and passes the content to this function. This is used for data portability (restoring from backups or migrating from another instance). Agents read the OneDrive folder structure directly — no import needed.
* Line-level errors include the line number and record type for actionable diagnostics.

---

## 9.4 `async extractPdfFields(file, taxYear): Promise<PdfExtractionResult>`

### Signature

```ts
interface PdfExtractionResult {
  formType: TaxFormType;                        // detected or user-specified form type
  formTypeConfidence: number;                   // 0.0–1.0 confidence in form type detection
  issuerName: string;                           // extracted employer/payer name
  extractedFields: Record<string, number | string>;  // form-specific key-value pairs
  fieldConfidence: Record<string, number>;      // per-field confidence (0.0–1.0)
  extractionConfidence: number;                 // aggregate confidence (average of field confidences)
  lowConfidenceFields: string[];                // fields with confidence < AppConfig.confidenceThreshold
  rawTextPreview: string;                       // first 500 chars of extracted text (for debugging, never sent to LLM)
}

async function extractPdfFields(
  file: File,                                   // browser File object from <input type="file">
  taxYear: number                               // target tax year for this document
): Promise<PdfExtractionResult>;
```

### Implementation

PDF extraction is handled **entirely on the frontend** using pdf.js. There is no backend endpoint for PDF processing. The extraction flow is:

1. User selects a PDF file via the UI.
2. `extractPdfFields()` parses the text layer using pdf.js (`pdfjsLib.getDocument()`), concatenates all page text, and applies form-type templates (see FR-11) via regex/pattern matching to extract fields.
3. If pdf.js cannot extract text (encrypted, image-only, or corrupted PDF), the function MUST throw a typed error with code `PDF_PARSE_FAILED` and a user-facing message.
4. Frontend presents extracted fields for user review/confirmation.
5. On confirmation, frontend writes the PDF to OneDrive (`FinPlanner/imports/{taxYear}/`) and creates a `TaxDocument` record from the `PdfExtractionResult` fields.

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
    totalIncomeChange: number;             // absolute dollar change: current year total income - prior year (positive = increase)
    totalDeductionChange: number;          // absolute dollar change: current year total deductions - prior year (positive = increase)
    effectiveRateChange: number;           // percentage point change: current year effective rate - prior year (e.g., 2.5 = rate increased by 2.5pp)
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

## 9.8 `generateBackup(files): string`

### Signature

```ts
interface OneDriveFile {
  path: string;       // relative path from FinPlanner/ root (e.g., "shared/corpus.ndjson")
  content: string;    // raw NDJSON content of the file
}

function generateBackup(files: OneDriveFile[]): string;
```

### Input

An array of all NDJSON files from the OneDrive `FinPlanner/` folder structure (excluding PDFs, `.agent/` files, and `README.md`).

### Output

A single monolithic NDJSON string containing all records from all files. The first line MUST be a `_type: "header"` record with `schemaVersion`, `savedAt` (current timestamp), and `modules` listing all modules present. Subsequent lines are all records from all input files (headers from individual files are excluded — only a single consolidated header is emitted). Records are ordered: header, household, accounts, income streams, adjustments, retirement plan, simulation results, tax years, tax documents, checklist items, anomalies, app config.

### Requirements

* This is a **pure computation function** — synchronous, no API key needed.
* The SPA reads all NDJSON files from IndexedDB (or OneDrive) and passes them to this function.
* The output is offered to the user as a downloadable `.ndjson` file via the browser's download API.
* The output MUST be importable by `validateImport()` — round-trip fidelity is required (see golden test 12).
* `config.ndjson` (AppConfig) IS included in the backup — it contains user preferences (theme, anomaly thresholds, model selection) that are part of the user's data estate. On import/restore, AppConfig records are restored, overwriting the current settings.
* API keys, `.agent/` folder contents, and PDF files MUST NOT be included in the backup.

---

## 10. Claude Integration Requirements

1. Claude calls MUST originate from the client-side Claude module using the user's own API key.
2. **API key storage:** The user's Claude API key MUST be stored in IndexedDB only — never in localStorage, sessionStorage, URLs, cookies, OneDrive files, or stored NDJSON files.
3. **API key management UI:** The SPA MUST provide a settings page where the user can enter, update, and delete their Claude API key. The key MUST be validated on first entry.
4. **Graceful degradation:** The application MUST function fully without a Claude API key. All rule-based features (simulation, tax computation, rule-based checklist, rule-based anomaly detection, NDJSON import) work without a key. LLM-powered features show a clear message directing the user to enter an API key.
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
| Charts | Recharts with color palette derived from Fluent theme tokens (`colorBrandBackground`, `colorPaletteX`) |
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
4. Data Import (NDJSON import from backup — file picker + `ProgressBar` for validation)
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
* **Toast notifications:** The system MUST use Fluent `Toast` for transient feedback (save confirmations, OneDrive sync complete, import errors).

---

## 12. NDJSON Schema and Versioning

Repository MUST include:

* `schemas/ndjson-header.schema.json`
* `schemas/household.schema.json`
* `schemas/account.schema.json`
* `schemas/income-stream.schema.json`
* `schemas/adjustment.schema.json`
* `schemas/app-config.schema.json`
* `schemas/retirement-plan.schema.json`
* `schemas/simulation-result.schema.json`
* `schemas/tax-year-record.schema.json`
* `schemas/tax-document.schema.json`
* `schemas/checklist-item.schema.json`
* `schemas/anomaly.schema.json`
* `schemas/advice-response.schema.json`

Each schema validates the corresponding `_type` of NDJSON record. The `advice-response.schema.json` is an exception — it validates the transient response structure returned by `getPortfolioAdvice()` and `getTaxStrategyAdvice()` (§9.2, §9.7) but does not correspond to a stored `_type`. Advice responses are not persisted as NDJSON records; they are validated at runtime via Zod and displayed in the UI. The schema file is included for completeness and is deployed to `.agent/schemas/` so agents can understand the advice response structure.

**Schema deployment to OneDrive:** In addition to existing in the app repository, all JSON Schema files MUST be copied to the `.agent/schemas/` folder in the customer's OneDrive `FinPlanner/` directory. These copies are written on first run and updated when `schemaVersion` changes (see §7.5.1). This ensures LLM agents with OneDrive access can validate records without access to the app repository. The schemas in `.agent/schemas/` MUST be identical to the corresponding schemas in the repo's `schemas/` directory.

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

* The user's Claude API key MUST be stored in IndexedDB only — never in localStorage, sessionStorage, URLs, cookies, OneDrive, or stored NDJSON files.
* Inputs MUST be validated client-side using Zod schemas.
* Local diagnostics logs MUST avoid sensitive raw payloads where not necessary.
* Stored NDJSON files MUST exclude credentials/secrets.
* **Data MUST NOT leave the user security context** (local app + OneDrive - Personal) except for explicit LLM analysis requests.
* **LLM data minimization:** All data sent to Claude MUST be PII-stripped and limited to the minimum required for the analysis.
* **No third-party data sharing:** Beyond the Claude API, no user data may be transmitted externally.
* **PDF storage:** Imported PDFs MUST be stored only in OneDrive - Personal (via the SPA), never on any external service. There is no server.
* **OneDrive authentication:** The SPA MUST use MSAL.js with PKCE flow and delegated permissions (`Files.ReadWrite`, `User.Read`). There is no backend. See FR-14 for full details.
* **Content Security Policy (CSP):** Static hosting SHOULD set CSP headers. The following is the reference CSP header for production deployment:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self'
    https://api.anthropic.com
    https://graph.microsoft.com
    https://login.microsoftonline.com;
  img-src 'self' data:;
  font-src 'self';
  frame-src https://login.microsoftonline.com;
  object-src 'none';
  worker-src 'self';
  base-uri 'self';
  form-action 'self'
```

  Rationale: `script-src 'self'` blocks inline scripts and third-party JS. `connect-src` allowlists the three external APIs (Claude, OneDrive/Graph, MSAL auth). `style-src 'unsafe-inline'` is required for Fluent UI's runtime style injection. `frame-src` permits MSAL popup/iframe authentication flows. `worker-src 'self'` permits Web Workers for Monte Carlo simulations (§8.1). A CSP violation report endpoint MAY be configured via `report-uri` or `report-to` directives.

## 13.4 Reliability

* SPA MUST include error boundaries.
* Client-side modules MUST provide typed errors with structured error codes for all computation and API call failures.

## 13.5 Accessibility

* Keyboard navigation, labels, focus states, and contrast MUST meet WCAG 2.1 AA baseline for core flows.
* Fluent UI React v9 components provide built-in ARIA attributes, keyboard handling, and focus management. Custom components MUST match this baseline.
* High-contrast mode MUST be supported via Fluent's built-in high-contrast theme (`teamsHighContrastTheme`).
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

Each golden test defines fixture inputs and required numerical/structural assertions. All retirement scenarios use `simulationMode: "deterministic"` unless stated otherwise. Monetary values are in USD. Tolerance for floating-point assertions: ±$1. All golden test fixtures use **currentCalendarYear = 2026** for `birthYear` derivation: `birthYear = 2026 - currentAge`. For example, GT6's "age 74" retiree has `birthYear = 1952`, which falls in the SECURE 2.0 RMD-age-73 cohort (born 1951–1959).

### Retirement Scenarios

**1. Stable baseline market case**

Fixture: Single retiree, age 65, life expectancy 90 (25 years). One taxable account: $1,000,000 balance, $600,000 basis, 6% return, 0.10% fee. Spending: $50,000/year, 2% inflation. Taxes: 12% federal effective, 0% state, 15% cap gains. No SS, no pensions, no adjustments. Strategy: `taxableFirst`, no rebalancing, no guardrails.

Assertions:
- Zero shortfall years across all 25 years.
- Year 1 spending target = $50,000; year 25 spending target = $50,000 × 1.02²⁴ = $80,421 (±$1).
- End-of-year-1 balance < $1,000,000 (withdrawals + fees exceed 6% growth at this spending level).
- Final year (year 25) end balance > $0 (plan is sustainable).
- Every `YearResult` has `netSpendable >= actualSpend` (equivalent to `shortfall == 0`).
- Total taxes paid over 25 years > $0 (taxable account generates capital gains).
- Cost basis decreases monotonically year over year (taxable-first draws down basis).

**Expected year-by-year output (years 1–5):**

The following table provides reference values for the first 5 years computed from the §8.1 execution order. Tolerance: ±$5 per field per year (to accommodate compounding rounding differences across intermediate calculations). Implementations MUST match these values within tolerance to confirm correct engine wiring. Reference values were computed by rounding each intermediate step to the nearest dollar.

Computation notes: Returns applied to BOY balance (step 2). For this single-taxable-account `taxableFirst` scenario, the gross withdrawal is solved algebraically (no convergence iteration needed): `W = spendingTarget / (1 − gainFraction × capGainsRatePct / 100)`, where `gainFraction = (postReturnBalance − basis) / postReturnBalance`. Tax = `W × gainFraction × capGainsRatePct / 100`. Fees applied to post-withdrawal balance (step 11).

| Year | Age | Spending Target | Gross Withdrawal | Capital Gains | Tax (15% CG) | End Balance | Basis |
|------|-----|-----------------|------------------|---------------|--------------|-------------|-------|
| 1 | 65 | $50,000 | $53,481 | $23,205 | $3,481 | $1,005,513 | $569,724 |
| 2 | 66 | $51,000 | $54,831 | $25,526 | $3,831 | $1,010,002 | $540,411 |
| 3 | 67 | $52,020 | $56,194 | $27,827 | $4,174 | $1,013,394 | $512,045 |
| 4 | 68 | $53,060 | $57,577 | $30,113 | $4,517 | $1,015,604 | $484,598 |
| 5 | 69 | $54,121 | $58,979 | $32,467 | $4,858 | $1,016,544 | $458,041 |

> **Rounding note:** Due to rounding each intermediate step to the nearest dollar, `Capital Gains × 15%` may differ from the Tax column by ±$2. The Tax column (`Gross Withdrawal − Spending Target`) is the canonical value; it represents the exact tax amount that, when added to spending, equals the gross withdrawal.

Key observations: The portfolio grows slightly in early years (6% return > ~5.3% withdrawal rate). As basis declines, the gains ratio increases, causing taxes to rise and accelerate portfolio depletion in later years. The plan remains sustainable over 25 years (assertion: final year end balance > $0).

**2. Early severe downturn case**

Fixture: Same as Scenario 1, except: historical scenario with returns = [-20%, -15%, -10%, 5%, 8%, 10%] for years 1-6, then 6% for years 7-25. Inflation sequence: plan default 2% for all years.

Assertions:
- At least 1 shortfall year in years 1–6 (downturn depletes the portfolio faster than spending can be covered).
- Year 3 end balance < $600,000 (three consecutive negative years after withdrawals).
- If no shortfall, end balance at year 6 < Scenario 1's year-6 end balance (sequence-of-returns risk is visible).
- Plan recovers: year 25 end balance ≥ $0 OR shortfall years are recorded with exact amounts.

**3. Survivor transition case**

Fixture: Married couple, MFJ. Primary age 65, life expectancy 85 (20 years). Spouse age 63, life expectancy 90 (27 years). One tax-deferred account: $2,000,000, owner primary, 6% return, 0.20% fee. SS: primary $2,500/mo claiming at 67, spouse $1,800/mo claiming at 67. Spending: $120,000/year, 2.5% inflation, `survivorSpendingAdjustmentPct: 0.70`. Taxes: 18% federal effective, 5% state, 15% cap gains, standard deduction = MFJ default ($30,000). Strategy: `taxOptimized`, no rebalancing, no guardrails.

Assertions:
- Years 1–20 (joint phase): filing status = `mfj`.
- Year 21 (primary's life expectancy 85 is exclusive — primary's last alive year is year 20, age 84): filing status transitions to `survivor` (qualifying surviving spouse for 2 years), then `single`.
- Year 21 spending target = year-20 inflation-adjusted target × 0.70.
- Year 21 onward: primary's SS stops; spouse receives max(own benefit, primary's benefit).
- Primary's account ownership transfers to survivor in year 21.
- Total simulation length = 27 years (spouse's horizon: lifeExpectancy 90 − currentAge 63 = 27 years, ages 63–89).
- No duplicate income streams for deceased spouse after year 20.
- Year 23 onward (filing status = `single`): standard deduction drops from $30,000 (MFJ/survivor) to the single default ($15,000 inflation-adjusted), increasing effective tax burden.

**4. High-tax state vs low/no-tax state comparison**

Fixture: Two runs with identical inputs except `stateOfResidence` and state tax rate. Single retiree, age 62, life expectancy 92. Tax-deferred account: $1,500,000, 5.5% return, 0.15% fee. Spending: $80,000/year, 2% inflation. Taxes: 22% federal effective, 15% cap gains. Strategy: `taxOptimized`. Run A: state = "CA", stateEffectiveRatePct = 9.3% (user-overridden rate for scenario purposes; the default CA rate from the data asset is 13.3%). Run B: state = "WA", stateEffectiveRatePct = 0%.

Assertions:
- Run B (WA) final end balance > Run A (CA) final end balance.
- Run B total taxes paid < Run A total taxes paid.
- Difference in total taxes ≈ total withdrawals × 9.3% (±10% tolerance for compounding effects).
- Run B has fewer or equal shortfall years compared to Run A.
- Both runs have identical `targetSpend` sequences (same spending target, same inflation), but different gross withdrawal amounts (because `withdrawalTarget` includes `estimatedTaxes` which differ by state) and different `netSpendable` amounts.

**5. Deferred comp concentrated payout case**

Fixture: Single retiree, age 60 (current year 2026), life expectancy 85. NQDC account: $500,000, 4% return, 0% fee, schedule: startYear = 2027, endYear = 2031, frequency = annual, amount = $120,000, inflationAdjusted = false. One taxable account: $800,000, $400,000 basis, 6% return, 0.10% fee. Spending: $100,000/year, 2% inflation. Taxes: 22% federal effective, 0% state, 15% cap gains. Strategy: `taxOptimized`, no guardrails. Simulation year 1 = calendar year 2026 (age 60). NQDC distributions begin in simulation year 2 (calendar 2027).

NQDC balance walkthrough (returns applied at BOY per §8.1 step 2; distributions reduce balance):
- Year 1 (2026): BOY = $500,000; after 4% return = $520,000; no distribution (schedule starts 2027); EOY = $520,000
- Year 2 (2027): BOY = $520,000; after 4% return = $540,800; distribute $120,000; EOY = $420,800
- Year 3 (2028): BOY = $420,800; after 4% return = $437,632; distribute $120,000; EOY = $317,632
- Year 4 (2029): BOY = $317,632; after 4% return = $330,337; distribute $120,000; EOY = $210,337
- Year 5 (2030): BOY = $210,337; after 4% return = $218,751; distribute $120,000; EOY = $98,751
- Year 6 (2031): BOY = $98,751; after 4% return = $102,701; distribute $102,701 (scheduled $120,000 exceeds balance → **cap triggers**); EOY = $0

Assertions:
- Year 1 (2026): No NQDC distributions (schedule starts 2027). Withdrawals from taxable account only.
- Years 2–5: NQDC distributes $120,000/year as ordinary income.
- Year 6 (2031): NQDC distribution is capped at the available balance (≈$102,701). The scheduled $120,000 exceeds the remaining balance, so the engine distributes only what remains. EOY NQDC balance = $0.
- Year 7 onward: NQDC balance = $0, no further NQDC distributions.
- Years 2–5: mandatory NQDC income ($120,000) exceeds spending target in early years → withdrawalTarget from taxable is reduced or zero.
- Year 6: NQDC distribution (≈$102,701) covers most of the spending target → taxable account covers only the gap.
- NQDC distributions are classified as ordinary income in every year they occur.

**6. RMD interaction case**

Fixture: Single retiree, age 74, life expectancy 95. Tax-deferred account: $3,000,000, 5% return, 0.15% fee. No other accounts. Spending: $80,000/year, 2% inflation. Taxes: 22% federal effective, 0% state, 15% cap gains. Strategy: `taxOptimized`, no guardrails.

Assertions:
- Year 1 (age 74): RMD = $3,000,000 × 1.05 / 25.5 (ULT divisor for age 74) = $3,150,000 / 25.5 ≈ $123,529. RMD > spending target ($80,000) → no discretionary withdrawal needed.
- Year 1: `YearResult.surplus` = RMD - spending target - taxes > $0. Since no taxable account exists, surplus is recorded in `YearResult.surplus` but NOT reinvested — it effectively leaves the modeled portfolio (e.g., deposited in a bank account outside the model). The surplus does NOT increase any account balance.
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
- No checklist items with `status: "pending"`.
- `sourceReasoning` for each item references the 2024 tax year.

**9. Missing document detection**

Fixture: 2024 (filed) has 1099-DIV from "Vanguard" with $8,000. 2025 (draft) has no 1099-DIV from Vanguard. All other documents match.

Assertions:
- `detectAnomalies()` returns at least one anomaly with `category: "omission"`.
- Anomaly `field` references the Vanguard 1099-DIV.
- Anomaly `severity` = `"warning"`.
- Anomaly `comparisonYear` = 2024.
- `generateChecklist()` for 2025 includes a checklist item for Vanguard 1099-DIV with `status: "pending"`.
- `completionPct` < 100.

**10. Income anomaly detection**

Fixture: 2024 (filed) wages = $100,000. 2025 (draft) wages = $140,000 (40% increase, exceeds 25% threshold).

Assertions:
- `detectAnomalies()` returns an anomaly with `category: "anomaly"`.
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
- `taxYear.documentIds` array contains all three document IDs.
- No duplicate income fields — second W-2 adds to (not replaces) the first.

**12. NDJSON import/restore fidelity**

Fixture: Full dataset with household, 3 accounts, 2 income streams, 2 adjustments, 1 retirement plan, 2 tax years, 4 tax documents, 3 checklist items, 2 anomalies. (§20 shows a minimal reference payload; this test uses an expanded fixture. The test fixture MUST be constructed as a valid golden test data file in `tests/golden/`.)

Assertions:
- Generate a monolithic NDJSON backup from the folder structure: every line parses as valid JSON independently.
- Line 1 is `_type: "header"` with `schemaVersion: "3.0.0"`.
- Import via `validateImport()` returns `valid: true`, zero errors.
- After import, every field in every record matches the original data byte-for-byte (no floating-point drift, no field reordering within tolerance, no dropped optional fields).
- Record count after import equals record count in the backup.
- `_type` distribution is preserved (same count of each record type).
- API key is NOT present in any stored NDJSON file.
- `.agent/DATA_SUMMARY.md` accurately reflects the restored state (record counts, tax years, accounts).
- Root `README.md` exists and points to `.agent/`.
- `.agent/SCHEMA.md`, `.agent/EDITING.md`, `.agent/VALIDATION.md` exist and are valid Markdown.
- `.agent/schemas/` contains a JSON Schema file for each `_type`.

## 14.3 Integration Tests (MUST)

* Plan creation → `simulate()` → `getPortfolioAdvice()` → backup generation → `validateImport()` roundtrip (NDJSON)
* Claude invalid schema handling with retry + fallback (both `getTaxStrategyAdvice()` and `getPortfolioAdvice()`)
* PDF import → extraction → tax year population → `generateChecklist()` update flow
* Shared corpus modification → verify propagation to both tax year records and retirement plan
* OneDrive save → reload → verify data integrity
* `.agent/` folder generation — verify static files (README.md, SCHEMA.md, EDITING.md, VALIDATION.md, `schemas/*.schema.json`) are written on first run, `DATA_SUMMARY.md` is regenerated on every save, and static files are updated when app version changes
* Agent navigation simulation — follow pointer chain (root `README.md` → `.agent/README.md` → SCHEMA.md / EDITING.md / VALIDATION.md → data files), verify all `_type` values are documented in SCHEMA.md, editing rules in EDITING.md cover all types, validation checklist in VALIDATION.md is complete
* Agent edit simulation — make a valid edit to a data file following EDITING.md rules, validate the edit against `.agent/schemas/*.schema.json`, verify the app loads the modified data without errors

> **Testing note:** Since there is no backend, all tests run in a browser-like environment (e.g., jsdom, happy-dom, or Playwright). Claude API calls MUST be mocked in tests. Microsoft Graph API calls MUST be mocked in tests.

## 14.4 Performance Tests (SHOULD)

* Deterministic speed threshold
* Batch scenario execution timings
* Monte Carlo throughput (if implemented in v1)
* Client-side PDF extraction throughput (target: <3s per document in browser)
* NDJSON import for large backup files (5+ tax years, 50+ documents)
* `.agent/DATA_SUMMARY.md` generation time for large folder structures (target: <500ms)
* `.agent/` static content write time on first run (target: <2s for all files)

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
    income-stream.schema.json
    adjustment.schema.json
    app-config.schema.json
    retirement-plan.schema.json
    simulation-result.schema.json
    tax-year-record.schema.json
    tax-document.schema.json
    checklist-item.schema.json
    anomaly.schema.json
    advice-response.schema.json
  agent-templates/
    README.md.hbs                        # template for .agent/README.md (static orientation)
    SCHEMA.md.hbs                        # template for .agent/SCHEMA.md (record types, fields, constraints)
    EDITING.md.hbs                       # template for .agent/EDITING.md (create/update/delete rules)
    VALIDATION.md.hbs                    # template for .agent/VALIDATION.md (validation checklist)
    DATA_SUMMARY.md.hbs                  # template for .agent/DATA_SUMMARY.md (dynamic data summary)
  data/
    historical-returns/
      dotcom_bust.json                   # S&P 500 returns 2000–2004
      gfc_2008.json                      # S&P 500 returns 2007–2011
      early_drawdown.json                # synthetic stress (bad early years)
      high_inflation_decade.json         # S&P 500 + CPI 1973–1982
      low_return_regime.json             # S&P 500 + CPI 2000–2009
    state-tax/
    rmd-tables/
    ss-parameters/                       # Social Security: bend points, COLA history
    tax-parameters/                      # standard-deductions.json and other tax reference data
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

* Implement annual cashflow loop (13-step execution order per §8.1)
* Account growth, withdrawals, tax impacts, reconciliation
* Cost basis tracking for taxable accounts
* RMD computation and enforcement for tax-deferred accounts
* Withdrawal target formula with tax-withdrawal iteration
* Standard deduction and income classification (FR-4)
* Guardrail/dynamic spending logic (FR-5a)
* Client-side `simulate()` function

**Exit Criteria**

* Deterministic engine passes core unit tests
* RMDs enforced at the applicable SECURE 2.0 age (73 or 75 based on birth year) with Uniform Lifetime Table
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
* Anomaly results stored in OneDrive folder structure per §7.4

**Exit Criteria**

* Checklist auto-generates expected items from prior year data
* Missing documents flagged as pending
* Income change >25% triggers warning anomaly
* Omitted income source from prior year detected

## PR-8a: Dashboard + Shared UI + Tax Planning UI

* Shared dashboard (route 1) with both modules' status cards
* Household & Shared Data (route 2), Accounts (route 3), Data Import (route 4), Settings shell (route 5)
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
* API key stored in IndexedDB only — never in stored NDJSON files, OneDrive data files, localStorage, or URLs
* User sees LLM data transmission indicator
* Application functions fully without Claude API key (rule-based features work, LLM features show "API key required" message)

## PR-10: NDJSON Import + Agent-Native Storage + `.agent/` Folder + Perf + Observability

* NDJSON import from backup files (tax + retirement + shared corpus)
* Selective import (tax-only, retirement-only, full)
* `.agent/` folder system — static content generation (README.md, SCHEMA.md, EDITING.md, VALIDATION.md, `schemas/*.schema.json`) on first run and version update
* `.agent/DATA_SUMMARY.md` dynamic generation on every save
* Root `README.md` pointer to `.agent/` folder
* Agent documentation templates (`agent-templates/*.hbs`)
* JSON Schema deployment to `.agent/schemas/` (matching repo `schemas/` directory)
* Agent-native folder structure verification
* Migration handling for schema version changes
* Performance tuning
* Logging/metrics
* Data security documentation (`docs/data-security.md`)

**Exit Criteria**

* Import integration tests pass for both modules
* `.agent/` folder contains self-contained documentation — an LLM agent can read, edit, and validate data files using only `.agent/` contents, with no knowledge of the FinPlanner codebase
* `.agent/DATA_SUMMARY.md` is accurate and auto-updated on every save
* Static `.agent/` files are generated on first run and updated on app version change
* Agent edit simulation test passes (valid edit following EDITING.md, validated against schemas, app loads modified data)
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
* Required NDJSON schemas and per-line validation are in place for storage and import.
* Core UI routes are complete and functional for **both tax and retirement modules**.
* Advice integration is secure, PII-stripped, and fallback-capable for both domains.
* Unit + integration + golden tests pass in CI (tax + retirement).
* Assumptions and disclaimers are visible in product UI.
* **NDJSON import/restore** works for representative backup files including tax data.
* **OneDrive folder structure is natively consumable and editable by LLM agents** — the `.agent/` folder contains complete schema documentation (SCHEMA.md), editing rules (EDITING.md), validation checklists (VALIDATION.md), JSON Schema files, and a dynamic data summary (DATA_SUMMARY.md). An agent can read, understand, edit, and validate data files using only the contents of `.agent/`, with no knowledge of the FinPlanner codebase.
* No secrets or PII are exposed in client bundle, LLM prompts, or stored NDJSON files.
* **All data persists to OneDrive - Personal** and never leaves the user security context (except LLM analysis).
* **Shared data corpus** is the single source of truth for both modules.
* **Application functions fully without a Claude API key** — all rule-based features (simulation, tax computation, checklist, anomaly detection, import) work without a key.

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

9. **Agent edit compatibility**
   Mitigation: the `.agent/` folder provides complete schema documentation (SCHEMA.md), editing rules (EDITING.md), validation checklists (VALIDATION.md), and JSON Schema files so agents can make compatible edits. The app re-validates all data on load as a safety net — incompatible edits are detected and surfaced to the user before they corrupt downstream computation.

10. **Browser API key security**
   Mitigation: API key stored in IndexedDB only (not accessible via XSS targeting localStorage/cookies); never exported, synced, or logged. Users are advised that browser extensions and XSS vulnerabilities could expose the key. Content Security Policy headers SHOULD be configured on the static hosting to mitigate XSS risk.

11. **Claude API CORS restrictions**
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
8. `agent-templates/README.md.hbs` — Handlebars template for `.agent/README.md` (static agent orientation)
9. `agent-templates/SCHEMA.md.hbs` — Handlebars template for `.agent/SCHEMA.md` (record types, fields, constraints)
10. `agent-templates/EDITING.md.hbs` — Handlebars template for `.agent/EDITING.md` (create/update/delete rules)
11. `agent-templates/VALIDATION.md.hbs` — Handlebars template for `.agent/VALIDATION.md` (validation checklist)
12. `agent-templates/DATA_SUMMARY.md.hbs` — Handlebars template for `.agent/DATA_SUMMARY.md` (dynamic data summary)

### 19.1 Required Contents: `assumptions.md`

1. **Returns modeling** — returns applied to beginning-of-year balances before withdrawals; no intra-year compounding.
2. **Tax model** — effective-rate approximation for draft/future years; actual rates for filed years; no AMT, no NIIT, no phase-outs in v1.
3. **Inflation** — in deterministic mode, a constant annual rate (`SpendingPlan.inflationPct`) applied uniformly to spending, SS COLA, pension COLA, and other inflation-adjusted values; in historical/stress modes, the scenario's per-year inflation values are used instead (see FR-6). No differential inflation for healthcare/housing in any mode.
4. **Social Security** — user-provided monthly benefit at claim age; COLA applied from claim age forward; survivor receives the higher of own or deceased benefit.
5. **Mortality** — deterministic life expectancy (no mortality tables or probability curves); survivor phase begins on deceased's life-expectancy year.
6. **Rebalancing** — notional transfers between accounts (no tax event in v1); quarterly rebalancing splits annual returns into four equal sub-periods.
7. **Withdrawal strategy** — greedy bucket ordering; no partial-year withdrawals; no tax-loss harvesting.
8. **State taxes** — effective-rate model only; no bracket-level computation; dataset provides representative rates, not authoritative filing calculations. State tax uses the federal standard deduction as a proxy; most states have different standard deduction amounts.

### 19.2 Required Contents: `model-limitations.md`

1. **Filing status** — MFS and HoH not supported in v1; only single, MFJ, and survivor.
2. **Federal tax brackets** — not modeled; effective-rate only. Marginal rate optimizations (e.g., Roth conversions to fill low brackets) cannot be evaluated.
3. **AMT / NIIT / phase-outs** — not modeled.
4. **Standard deduction and capital gains** — the standard deduction only offsets ordinary income (FR-4 step 3), never capital gains. In real tax law, the standard deduction can offset capital gains when ordinary income is below the deduction amount. This simplification slightly overstates taxes in years with low ordinary income and high capital gains.
5. **Capital loss deduction limit** — the IRS allows only $3,000/year of net capital losses to offset ordinary income, with excess carried forward. This model does not enforce the $3,000 limit and does not track capital loss carryforwards. Net capital losses simply result in $0 capital gains tax for the year.
6. **Rebalancing tax events** — notional transfers do not trigger capital gains in v1; real-world rebalancing in taxable accounts would incur taxes.
7. **Intra-year timing** — all cashflows are annual; no mid-year events, no monthly modeling. RMDs are calculated on the post-return beginning-of-year balance (per §8.1 step 2→5 ordering), not the prior year-end balance as required by the IRS. This simplification slightly overstates RMDs in years with positive returns.
8. **Healthcare costs** — no explicit Medicare premium, Part D, or Medigap modeling; users must include in spending target.
9. **Estate planning** — no estate tax, step-up in basis, or inheritance modeling.
10. **Roth conversions** — not modeled as a planning lever; users cannot simulate conversion ladders.
11. **Survivor filing status** — `lifeExpectancy` is exclusive (the person's last alive year is at age LE−1). The model treats that last alive year as the final joint-phase year and starts the 2-year survivor window the following year. IRS rules allow joint filing for the actual year of death; this model approximates this by keeping MFJ for the entire last alive year.
12. **Social Security taxation** — the engine implements the simplified provisional-income model (0%/50%/85% taxable fractions per FR-3) but does not model the full IRS worksheet calculation, interaction with other above-the-line deductions, or the precise dollar-for-dollar phase-in within each bracket.
13. **Monte Carlo** — if implemented, assumes normally distributed returns (mean = `expectedReturnPct`, std dev = `volatilityPct` per account); no fat tails, no serial correlation. Returns are sampled independently per year. `successProbability` = fraction of runs with zero shortfall years. `medianTerminalValue` = median of terminal portfolio balances across runs. `worstCaseShortfall` = maximum total shortfall across all runs. Minimum runs: `monteCarloRuns` (default 10,000). A seeded PRNG SHOULD be used for reproducibility in tests.
14. **State standard deduction** — state taxes use the federal standard deduction as a proxy; most states have different standard deduction amounts. Separate state standard deductions are a future enhancement.
15. **PIA-to-claim-age conversion** — not modeled in v1; the user must provide `estimatedMonthlyBenefitAtClaim` directly. The `piaMonthlyAtFRA` field is informational only.
16. **Tax credits** — all credits (child tax, education, foreign, other) are treated as non-refundable in v1 and apply to federal tax only (no state credits). The refundable portion of the child tax credit and other refundable credits are not modeled; `computedFederalTax` is floored at $0 after credits.

### 19.3 Required Contents: `runbook.md`

1. **Prerequisites** — Node.js version, pnpm version, Azure AD app registration steps (client ID, redirect URI, `Files.ReadWrite` + `User.Read` permissions).
2. **Local development** — `pnpm install`, `pnpm dev`, environment variables (MSAL client ID), dev server ports.
3. **Build** — `pnpm build`, output directory, build artifacts.
4. **Testing** — `pnpm test`, `pnpm test:golden`, `pnpm test:integration`, how to update golden snapshots.
5. **Static hosting deployment** — Azure Static Web Apps (step-by-step), GitHub Pages (step-by-step), generic CDN deployment; CORS/CSP header configuration.
6. **OneDrive folder structure** — expected folder layout in user's OneDrive (`/FinPlanner/`, `/FinPlanner/.agent/`, `/FinPlanner/shared/`, `/FinPlanner/tax/`, `/FinPlanner/retirement/`); the `.agent/` folder (static documentation files vs. dynamic `DATA_SUMMARY.md`); how the app creates it on first run; how to grant an LLM agent read/write access for editing data files using `.agent/` documentation.
7. **Claude API key setup** — where to enter the key in the Settings UI, how it's stored (IndexedDB), how to verify it's working, how to rotate/delete it.
8. **Troubleshooting** — common issues: MSAL redirect loop, OneDrive permission denied, Claude API 401/429, IndexedDB quota exceeded, PDF extraction failures.
9. **Data backup and recovery** — how to generate a monolithic NDJSON backup from the folder structure, how to import from backup, how to grant an LLM agent read/write access to the OneDrive folder, how the agent uses `.agent/` documentation to understand and edit data files, how to clear IndexedDB cache.

---

## 20. Reference Example: OneDrive File Content (Valid NDJSON Shape)

Each line below is a separate JSON object. In the OneDrive folder structure, these records are distributed across files per §7.4. Shown here in a single block for reference:

```ndjson
{"_type":"header","schemaVersion":"3.0.0","savedAt":"2026-02-15T10:00:00Z","modules":["tax","retirement"]}
{"_type":"household","maritalStatus":"married","filingStatus":"mfj","stateOfResidence":"WA","primary":{"id":"primary","birthYear":1966,"currentAge":60,"retirementAge":62,"lifeExpectancy":90,"socialSecurity":{"claimAge":67,"estimatedMonthlyBenefitAtClaim":3200,"colaPct":2.2}},"spouse":{"id":"spouse","birthYear":1968,"currentAge":58,"retirementAge":62,"lifeExpectancy":92,"socialSecurity":{"claimAge":67,"estimatedMonthlyBenefitAtClaim":2400,"colaPct":2.2}}}
{"_type":"account","id":"acct-taxable","name":"Taxable Brokerage","type":"taxable","owner":"joint","currentBalance":900000,"costBasis":500000,"expectedReturnPct":5.5,"feePct":0.15}
{"_type":"account","id":"acct-401k","name":"401k","type":"taxDeferred","owner":"primary","currentBalance":1400000,"expectedReturnPct":5.8,"feePct":0.2}
{"_type":"account","id":"acct-nqdc","name":"Deferred Comp","type":"deferredComp","owner":"primary","currentBalance":300000,"expectedReturnPct":4.5,"feePct":0.1,"deferredCompSchedule":{"startYear":2030,"endYear":2039,"frequency":"annual","amount":30000,"inflationAdjusted":false}}
{"_type":"incomeStream","id":"pension-primary","name":"Corporate Pension","owner":"primary","startYear":2028,"annualAmount":24000,"colaPct":0,"taxable":true,"survivorContinues":false}
{"_type":"adjustment","id":"home-downsize","name":"Home downsizing proceeds","year":2030,"amount":200000,"taxable":false}
{"_type":"adjustment","id":"new-roof","name":"Roof replacement","year":2029,"amount":-25000,"taxable":false}
{"_type":"retirementPlan","spending":{"targetAnnualSpend":180000,"inflationPct":2.5,"floorAnnualSpend":140000,"ceilingAnnualSpend":220000,"survivorSpendingAdjustmentPct":0.70},"taxes":{"federalModel":"effective","stateModel":"none","federalEffectiveRatePct":18,"stateEffectiveRatePct":0,"capGainsRatePct":15,"standardDeductionOverride":30050},"market":{"simulationMode":"historical","historicalScenarioIds":["dotcom_bust","gfc_2008"],"stressScenarioIds":["early_drawdown","high_inflation_decade"]},"strategy":{"withdrawalOrder":"taxOptimized","rebalanceFrequency":"annual","guardrailsEnabled":true}}
{"_type":"taxYear","taxYear":2025,"status":"draft","filingStatus":"mfj","stateOfResidence":"WA","income":{"wages":150000,"selfEmploymentIncome":0,"interestIncome":5200,"dividendIncome":8400,"qualifiedDividends":6800,"capitalGains":12000,"capitalLosses":0,"rentalIncome":0,"nqdcDistributions":0,"retirementDistributions":0,"socialSecurityIncome":0,"otherIncome":0},"deductions":{"standardDeduction":30050,"useItemized":false},"credits":{"childTaxCredit":0,"educationCredits":0,"foreignTaxCredit":0,"otherCredits":0},"payments":{"federalWithheld":28000,"stateWithheld":0,"estimatedPaymentsFederal":4000,"estimatedPaymentsState":0},"computedFederalTax":25635,"computedStateTax":0,"computedEffectiveFederalRate":14.6,"computedEffectiveStateRate":0,"refundOrBalanceDueFederal":6365,"refundOrBalanceDueState":0,"documentIds":["doc-w2-2025"]}
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
