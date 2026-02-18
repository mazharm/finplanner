# FinPlanner Codebase Security & Functionality Review

**Date:** 2026-02-18
**Scope:** Core functionality, security, and privacy across all packages

---

## Critical Issues (Must Fix)

### 1. Spending Ceiling Guardrail Never Caps Spending
- **File:** `packages/engine/src/steps/06-inflate-spending.ts:73-80`
- **Category:** Core Functionality
- **Description:** The ceiling guardrail uses `Math.max(targetSpend, inflatedCeiling)` which can only *raise* spending, never limit it. If `targetSpend` already exceeds `inflatedCeiling`, the `Math.max` returns `targetSpend` — the ceiling has no capping effect. This should be `Math.min(targetSpend, inflatedCeiling)` to enforce an upper bound per Guyton-Klinger rules. As written, the ceiling guardrail is entirely non-functional.

### 2. PII Stripping Does Not Cover Names, Addresses, or Employer Names
- **File:** `packages/claude/src/pii-strip.ts:15-31`
- **Category:** Privacy
- **Description:** `sanitizeForLlm()` strips SSNs, EINs, emails, phone numbers, and long digit sequences, but does **not** strip physical addresses, full names, dates of birth, or employer names. W-2 and 1099 `extractedFields` commonly contain employer names, employee names, and addresses. These are passed through `sanitizeExtractedFields` which only redacts SSN/EIN/email/phone/account-number patterns — "John A. Smith" or "123 Main St, Springfield IL 62701" or "Acme Corporation" would be sent to the external LLM API unredacted.

### 3. Silent Data Loss on IndexedDB Load Failure
- **Files:** `apps/web/src/stores/shared-store.ts:100-102`, `tax-store.ts:81-83`, `retirement-store.ts:123-125`
- **Category:** Core Functionality
- **Description:** All three stores catch IndexedDB errors during `initFromIndexedDB()` with a bare `catch` that only sets `initialized: true` without logging or surfacing the error. If IndexedDB is corrupted or unavailable, the user gets empty/default state with no warning. Subsequent mutations will overwrite stored data via `persistShared`/`persistTax`/`persistRetirement`, destroying saved financial planning data.

### 4. Missing `head_of_household` Filing Status in Tax Constants
- **File:** `packages/domain/src/constants/defaults.ts:4-8`
- **Category:** Core Functionality
- **Description:** `STANDARD_DEDUCTIONS` only defines `single`, `mfj`, and `survivor`. Head of household is missing. Any code indexing `STANDARD_DEDUCTIONS[filingStatus]` for HoH returns `undefined`, producing either a runtime error or a $0 standard deduction. Same issue in `SS_PROVISIONAL_INCOME_THRESHOLDS` (lines 13-17). Head of household is a common filing status for single parents.

### 5. State Tax Uses Top Marginal Rate as Flat Rate
- **File:** `packages/domain/src/constants/state-tax-data.ts:7-59`
- **Category:** Core Functionality
- **Description:** States with progressive brackets (CA at 13.3%, NY at 10.9%, OR at 9.9%) are represented by a single flat rate — the top marginal rate. For most taxpayers who don't reach the top bracket, this overstates state income tax by 50-100%. California's 13.3% only applies to income over $1M; most residents face effective rates of 4-8%. This materially distorts retirement projections and tax optimization advice.

---

## High Severity Issues

### 6. Unknown NDJSON Record Types Bypass All Validation
- **File:** `packages/storage/src/validate-import.ts:106-116`
- **Category:** Security
- **Description:** When `getSchemaForType(type)` returns `undefined` (unknown `_type`), the record is not validated at all — only a 100KB size limit is applied. These records survive round-trips via `generate-backup.ts` (lines 148-155) which explicitly preserves unknown types. An attacker could inject arbitrary JSON payloads under fabricated type names that persist indefinitely.

### 7. Survivor Filing Status Off-by-One (IRS Rules)
- **File:** `packages/engine/src/steps/01-determine-phase.ts:48-56`
- **Category:** Core Functionality
- **Description:** The code computes `survivorYearCount` as 1-indexed from `firstSurvivorYearIndex` and treats count ≤ 2 as eligible for survivor filing status. Per IRS rules, the surviving spouse can file MFJ in the year of death and may qualify as "qualifying surviving spouse" for the **two** following tax years (3 years total). The current code gives survivor status for only 2 years, potentially applying single-filer brackets one year too early.

### 8. `Infinity` Values Pass Zod Number Validation
- **Files:** `packages/validation/src/schemas/plan-result.ts`, `income.ts`, `tax-planning.ts`, `advice-requests.ts`
- **Category:** Security / Validation
- **Description:** Zod's `z.number()` accepts `Infinity` and `-Infinity` by default. `JSON.parse` of values like `1e999` produces `Infinity`. All financial field schemas lack `.finite()`. An `Infinity` value flowing into tax or withdrawal calculations would corrupt the entire simulation.

### 9. Path Traversal in OneDrive Folder Reader
- **File:** `apps/web/src/services/folder-reader.ts:87`
- **Category:** Security
- **Description:** `OneDriveFolderReader.resolvePath()` concatenates the `path` parameter to `rootPrefix` without sanitization. A caller could pass `../../sensitive-folder` to access files outside the intended root. While `onedrive.ts` has `validateOneDrivePath` (lines 117-135) that prevents traversal, the `folder-reader.ts` implementation does not call this validator.

### 10. No Upper Bounds on Financial Amounts in Validation
- **Files:** `packages/validation/src/schemas/accounts.ts:20-21`, `income.ts:10,24`, `spending.ts:4`, `tax-planning.ts:21-32,79-84`, `plan-result.ts:10-24`
- **Category:** Security / Validation
- **Description:** Financial amount fields use `z.number().min(0)` without upper bounds. Values beyond `Number.MAX_SAFE_INTEGER` (2^53) lose precision in IEEE 754. `income.ts:24` has no min or max at all. Importing a crafted NDJSON with `currentBalance: 99999999999999999` would silently lose precision.

---

## Medium Severity Issues

### 11. Prototype Pollution via JSON.parse + Object Spread
- **Files:** `packages/storage/src/validate-import.ts:59,84,120`, `generate-backup.ts:59,40`, `apps/web/src/services/hydrate-folder.ts:59,72`
- **Category:** Security
- **Description:** Multiple files parse untrusted JSON then destructure with `const { _type, ...data } = rec`. While `JSON.parse` doesn't set `__proto__` on the prototype chain, the rest spread includes it as an own property. Combined with `z.record()` schemas that accept `__proto__` as a valid key, this creates a prototype pollution pathway.

### 12. 1099-B Fallback Produces Phantom Capital Gains
- **File:** `packages/tax/computation/src/aggregate-documents.ts:71-79`
- **Category:** Core Functionality
- **Description:** When extracted `gainLoss === 0`, the code falls back to computing `proceeds - costBasis`. If only one field was extracted (e.g., proceeds = $10,000, costBasis unextracted = 0), the fallback computes `gainLoss = 10,000` — a phantom $10,000 capital gain from OCR failure.

### 13. API Key Stored as Plaintext in IndexedDB
- **File:** `apps/web/src/services/indexeddb.ts:116-127`
- **Category:** Security
- **Description:** The Claude API key is stored as a raw plaintext string. Any XSS vulnerability or malicious browser extension with same-origin access can read it directly. The spec acknowledges this is an accepted risk for a serverless SPA, but it remains the primary attack target.

### 14. OneDrive Stub Has No Production Guard
- **File:** `apps/web/src/services/onedrive.ts:62-65`
- **Category:** Security
- **Description:** The stub `login()` sets `authenticated = true` without real auth. There is no `if (import.meta.env.DEV)` guard or build-time replacement to prevent the stub from being used in production.

### 15. Sync Conflict Resolution Can Lose Data
- **File:** `apps/web/src/services/sync.ts:216-218`
- **Category:** Core Functionality
- **Description:** When a conflict is detected, the sync entry is removed from the queue and reported in `ConflictEntry`. If the caller doesn't properly handle the conflict, local changes are permanently lost.

### 16. Fire-and-Forget Persistence Race Condition
- **Files:** `apps/web/src/stores/shared-store.ts:53-63`, `tax-store.ts:38-48`, `retirement-store.ts:74-86`
- **Category:** Core Functionality
- **Description:** `persistShared`/`persistTax`/`persistRetirement` call `setAppState()` without `await`. Rapid successive mutations create a race: mutation A's persist resolving after B's would overwrite B's data in IndexedDB. No retry mechanism on failure.

### 17. Prompt Injection via User-Controlled Fields
- **File:** `packages/claude/src/prompt-builder.ts:57-83, 103-167`
- **Category:** Security
- **Description:** User values (filingStatus, stateOfResidence, riskTolerance, prioritize) are interpolated into LLM prompts inside `<value>` XML tags, but the LLM is not instructed to treat these as data. A crafted value like `"single\n\nIgnore all previous instructions..."` could manipulate LLM output. While Zod validation limits structural damage, advice content could be influenced.

### 18. No Content Sanitization of LLM-Generated Strings
- **Files:** `packages/claude/src/portfolio-advisor.ts:27-30`, `tax-advisor.ts:28-31`
- **Category:** Security
- **Description:** After Zod structural validation, LLM-generated string fields (`title`, `rationale`, `description`, `disclaimer`) are returned directly. If rendered via `dangerouslySetInnerHTML` or a Markdown renderer that allows raw HTML, this creates stored XSS. Currently safe because React JSX auto-escapes, but fragile.

### 19. Inconsistent Rounding in Cost Basis Tracking
- **File:** `packages/engine/src/helpers/cost-basis.ts:22`
- **Category:** Core Functionality
- **Description:** `reduceBasis` rounds to cents (`Math.round(... * 100) / 100`) but `computeGainFraction` and `computeTaxableGain` do not round. Over many years of withdrawals, the basis drifts from the mathematically correct value due to asymmetric rounding.

### 20. Duplicate SS Taxation Logic May Diverge
- **Files:** `packages/engine/src/helpers/ss-taxation.ts`, `packages/tax/computation/src/ss-taxation.ts`
- **Category:** Core Functionality
- **Description:** Two separate implementations of `computeTaxableSS` exist with behavioral differences (engine version has extra logic for unrecognized filing statuses). If the SS formula changes, both must be updated in lockstep or results will diverge.

### 21. Anomaly Detection Uses Zero Tax Values for Unfiled Records
- **File:** `packages/tax/anomaly/src/detect-anomalies.ts:236-247`
- **Category:** Core Functionality
- **Description:** `computedFederalTax` and `computedStateTax` are often 0 for unfiled records. Using these to compute effective rate changes produces meaningless results and may trigger false anomaly flags.

### 22. Massachusetts Capital Gains Rate Is Incorrect
- **File:** `packages/domain/src/constants/state-tax-data.ts:28`
- **Category:** Core Functionality
- **Description:** Listed as 9.0%, but MA has 5% on long-term gains and 12% on short-term gains, plus a 4% surtax on income above $1M. The 9.0% figure doesn't accurately represent either rate.

### 23. Tax Constants Are Not Year-Versioned
- **File:** `packages/domain/src/constants/defaults.ts`
- **Category:** Core Functionality
- **Description:** Standard deductions, SS wage base ($176,100), and other tax parameters are hardcoded for 2025. No mechanism exists to update them per tax year, and no warnings appear when modeling future years.

### 24. `isDirectory` Always Returns True for OneDrive
- **File:** `apps/web/src/services/folder-reader.ts:103`
- **Category:** Core Functionality
- **Description:** `return entries.length >= 0` — `Array.length` is always ≥ 0, so this always returns `true`. Any OneDrive path is considered a directory, even files.

### 25. Capital Loss Limitation ($3K Against Ordinary Income) Not Implemented
- **File:** `packages/tax/computation/src/compute-tax.ts:29-32`
- **Category:** Core Functionality
- **Description:** Excess capital losses do not offset ordinary income (up to $3,000 per IRS rules) and are not carried forward. Users with significant capital losses will see overstated tax liability.

### 26. Dedup Key Collision in Backup Generation
- **File:** `packages/storage/src/generate-backup.ts:90`
- **Category:** Core Functionality
- **Description:** The dedup key `id:<recordId>` is shared across all record types. If an account and an income stream have the same `id`, one overwrites the other during backup generation. Should be `id:<type>:<recordId>`.

---

## Low Severity Issues

### 27. Unanchored Regex in Schema Version Validation
- **File:** `packages/validation/src/schemas/plan-input.ts:11`
- **Description:** Regex `/^\d+\.\d+\.\d+/` lacks `$` anchor, so `"1.0.0<script>alert(1)</script>"` is a valid schemaVersion.

### 28. No Line Count Limit in NDJSON Parsing
- **File:** `packages/storage/src/validate-import.ts:38`
- **Description:** While a 50MB size limit exists, millions of very short lines within that limit would create a massive array and cause CPU exhaustion.

### 29. No Maximum Array Length on Schema Arrays
- **Files:** `packages/validation/src/schemas/plan-input.ts:14-15`, `tax-planning.ts:15,85`, `plan-result.ts:36`, `market.ts:8-9`
- **Description:** Unbounded `z.array()` calls allow arbitrarily long arrays through validation.

### 30. API Key Validation Inconsistency
- **Files:** `apps/web/src/stores/settings-store.ts:43-44` vs `apps/web/src/services/indexeddb.ts:122`
- **Description:** The store allows empty string past validation while IndexedDB rejects it.

### 31. `redactApiKeys` Only Handles `sk-ant-*` Pattern
- **File:** `apps/web/src/services/llm-client.ts:26-28`
- **Description:** OAuth tokens, session tokens, or other credential formats would not be redacted from error messages.

### 32. 1099-NEC Does Not Aggregate Federal Tax Withheld
- **File:** `packages/tax/computation/src/aggregate-documents.ts:92-94`
- **Description:** Box 4 (federal tax withheld) from 1099-NEC forms is not extracted, so withholding isn't credited.

### 33. Fragile Regex lastIndex Save/Restore Pattern
- **File:** `packages/tax/extraction/src/extract-fields.ts:109-113`
- **Description:** The regex `lastIndex` save/restore for peek-ahead is technically correct but extremely fragile and difficult to reason about for maintainability.

### 34. PDF Tax Year Parameter Accepted but Never Used
- **File:** `packages/tax/extraction/src/extract-pdf-fields.ts:10-11, 35-42`
- **Description:** `taxYear` is accepted but never validated against extracted data. A 2023 form could be imported for 2025 without warning.

### 35. Duplicate Utility Functions Across Packages
- **Files:** `packages/tax/checklist/src/generate-checklist.ts:6-33`, `packages/tax/anomaly/src/detect-anomalies.ts`
- **Description:** `normalizeIssuerName`, `tokenJaccardSimilarity`, and `issuerNamesMatch` are duplicated verbatim.

### 36. No File Count Limit on PDF Uploads
- **File:** `apps/web/src/pages/tax/DocumentImportPage.tsx:87-129`
- **Description:** Unlike `DataImportPage` which limits to 20 files, PDF import has no count limit.

### 37. CSP and X-Frame-Options via Meta Tags Only
- **File:** `apps/web/index.html:6-8`
- **Description:** CSP `frame-ancestors` cannot be enforced via meta tag. Security headers should be delivered by the web server.

### 38. Sensitive Field Stripping Incomplete in Backup
- **File:** `packages/storage/src/generate-backup.ts:21-28`
- **Description:** `isSensitiveField` misses patterns like `ssn`, `socialSecurityNumber`, `private_key`, `pin`, `passcode`.

### 39. No MIME Type Validation on PDF Uploads
- **File:** `apps/web/src/pages/tax/DocumentImportPage.tsx:90`
- **Description:** Only file extension is checked, not `file.type`. A renamed malicious file would pass the check.

### 40. `claudeModelId` Not Validated in App Config
- **File:** `packages/validation/src/schemas/app-config.ts:5`
- **Description:** No length, pattern, or format validation on the model ID string.

---

## Informational / Accepted Risks

- **API key sent directly from browser** (`llm-client.ts:142-152`): Accepted for serverless SPA architecture. Mitigated by HTTPS and CSP `connect-src`.
- **Client-side rate limiting reset on reload** (`llm-client.ts:19-24`): UX guard, not security control. User's own API key at risk.
- **`unsafe-inline` in CSP style-src** (`index.html:6`): Required by Fluent UI's runtime CSS-in-JS.
- **Financial data in IndexedDB unencrypted** (`sync.ts:52-79`): Same accepted risk as API key storage — relies on same-origin policy and CSP.
- **Floating-point precision in multi-decade simulations** (`simulate.ts`): Inherent to IEEE 754 doubles, no single-line fix. Would require a decimal arithmetic library for cent-accurate multi-decade projections.
- **Source maps disabled in production** (`vite.config.ts:23`): Correctly configured.
- **Dev server bound to localhost** (`vite.config.ts:25-28`): Correctly configured.
- **No `dangerouslySetInnerHTML` usage found** anywhere in the frontend: React JSX auto-escaping is consistently used.
