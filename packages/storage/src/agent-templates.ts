import { SCHEMA_VERSION } from '@finplanner/domain';

const APP_VERSION = '0.0.1';

/**
 * Generates the root FinPlanner/README.md pointer file.
 */
export function generateRootReadme(): string {
  return `# FinPlanner Data

Personal financial planning data managed by FinPlanner.

For full documentation on the data format, schema, and editing rules, see:
**.agent/README.md**

- App Version: ${APP_VERSION}
- Schema Version: ${SCHEMA_VERSION}
`;
}

/**
 * Generates .agent/README.md — agent orientation.
 */
export function generateAgentReadme(): string {
  return `# FinPlanner Agent Documentation

This folder contains everything an LLM agent needs to read, analyze, and make compatible edits
to FinPlanner data files.

## Quick Start

1. Read this file for orientation
2. Consult **SCHEMA.md** for the complete data schema reference
3. Consult **EDITING.md** for rules on creating, updating, and deleting records
4. Use **VALIDATION.md** (12-step checklist) to verify your edits
5. Use **schemas/*.schema.json** for machine-readable JSON Schema validation
6. Check **DATA_SUMMARY.md** for a snapshot of the current data estate (may be stale after CLI edits)

## App Info

- App Version: ${APP_VERSION}
- Schema Version: ${SCHEMA_VERSION}
- Storage Format: NDJSON (Newline-Delimited JSON) — one JSON object per line

## Folder Structure

\`\`\`
FinPlanner/
  README.md                          # This pointer file
  config.ndjson                      # App settings
  .agent/                            # Agent documentation (you are here)
    README.md                        # This file
    SCHEMA.md                        # Complete schema reference
    EDITING.md                       # Editing rules and checklist
    VALIDATION.md                    # 12-step validation checklist
    DATA_SUMMARY.md                  # Dynamic data snapshot
    schemas/                         # JSON Schema files per _type
  shared/
    corpus.ndjson                    # Shared corpus: household, accounts, income streams, adjustments
  tax/
    {year}/
      record.ndjson                  # Tax year record + tax documents
      checklist.ndjson               # Checklist items (app-generated)
      anomalies.ndjson               # Anomaly records (app-generated)
  retirement/
    plan.ndjson                      # Retirement plan configuration
    results/
      {scenario-id}.ndjson           # Simulation results per scenario
  imports/
    {year}/
      *.pdf                          # Original uploaded PDFs
\`\`\`

## Key Concepts

- **Shared corpus**: Household demographics, accounts, and income streams are defined once in
  \`shared/corpus.ndjson\` and consumed by both tax and retirement modules.
- **Draft vs Filed**: \`draft\` tax years auto-propagate from the shared corpus. \`filed\` years
  are frozen snapshots that don't change when the corpus is updated.
- **NDJSON format**: Every file starts with a \`_type: "header"\` line containing metadata.
  Subsequent lines are data records, each with a \`_type\` discriminator.
`;
}

/**
 * Generates .agent/SCHEMA.md — complete schema reference.
 */
export function generateSchemaDoc(): string {
  return `# FinPlanner Schema Reference

Schema Version: ${SCHEMA_VERSION}

## Record Types (\`_type\` values)

| \`_type\` | Description | Found In |
|---------|-------------|----------|
| \`header\` | NDJSON file header (first line of every file) | All .ndjson files |
| \`household\` | Household profile (singleton) | shared/corpus.ndjson |
| \`account\` | Investment account | shared/corpus.ndjson |
| \`incomeStream\` | Income stream (SS, pension, etc.) | shared/corpus.ndjson |
| \`adjustment\` | One-time or recurring adjustment | shared/corpus.ndjson |
| \`appConfig\` | Application settings (singleton) | config.ndjson |
| \`taxYear\` | Tax year record | tax/{year}/record.ndjson |
| \`taxDocument\` | Imported tax document | tax/{year}/record.ndjson |
| \`checklistItem\` | Tax filing checklist item | tax/{year}/checklist.ndjson |
| \`anomaly\` | Year-over-year anomaly | tax/{year}/anomalies.ndjson |
| \`retirementPlan\` | Retirement plan config (singleton) | retirement/plan.ndjson |
| \`simulationResult\` | Simulation output | retirement/results/{id}.ndjson |

## Header Record

Every NDJSON file starts with a header line:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"header"\` | Yes | Always "header" |
| \`schemaVersion\` | string | Yes | Schema version (e.g., "3.0.0") |
| \`savedAt\` | string (ISO 8601) | Yes | Last save timestamp |
| \`modules\` | string[] | Yes | Module tags: "tax", "retirement", "config" |

## Household Record

Singleton — one per corpus.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"household"\` | Yes | Discriminator |
| \`maritalStatus\` | \`"single" \\| "married"\` | Yes | Marital status |
| \`filingStatus\` | \`"single" \\| "mfj" \\| "survivor"\` | Yes | Tax filing status |
| \`stateOfResidence\` | string | Yes | US state code (e.g., "WA") |
| \`primary\` | PersonProfile | Yes | Primary person |
| \`spouse\` | PersonProfile | No | Spouse (if married) |

### PersonProfile

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`id\` | \`"primary" \\| "spouse"\` | Yes | Person identifier |
| \`birthYear\` | number | Yes | Birth year |
| \`currentAge\` | number | Yes | Current age (0-120) |
| \`retirementAge\` | number | Yes | Target retirement age |
| \`lifeExpectancy\` | number | Yes | Life expectancy (age) |
| \`socialSecurity\` | object | No | SS claim details |
| \`socialSecurity.claimAge\` | number | Yes* | Age to claim SS |
| \`socialSecurity.piaMonthlyAtFRA\` | number | No | Primary Insurance Amount at FRA |
| \`socialSecurity.estimatedMonthlyBenefitAtClaim\` | number | Yes* | Monthly benefit at claim age |
| \`socialSecurity.colaPct\` | number | Yes* | Annual COLA percentage |

## Account Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"account"\` | Yes | Discriminator |
| \`id\` | string | Yes | Unique ID |
| \`name\` | string | Yes | Display name |
| \`type\` | \`"taxable" \\| "taxDeferred" \\| "deferredComp" \\| "roth"\` | Yes | Account type |
| \`owner\` | \`"primary" \\| "spouse" \\| "joint"\` | Yes | Account owner |
| \`currentBalance\` | number (>= 0) | Yes | Current balance |
| \`costBasis\` | number | No | Cost basis (taxable accounts) |
| \`expectedReturnPct\` | number | Yes | Expected annual return % |
| \`volatilityPct\` | number | No | Annual volatility % |
| \`feePct\` | number (>= 0) | Yes | Annual fee % |
| \`targetAllocationPct\` | number | No | Target allocation % |
| \`deferredCompSchedule\` | object | No | NQDC distribution schedule |

### DeferredCompSchedule

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`startYear\` | number | Yes | First distribution year |
| \`endYear\` | number | Yes | Last distribution year |
| \`frequency\` | \`"annual" \\| "monthly"\` | Yes | Distribution frequency |
| \`amount\` | number | Yes | Distribution amount per period |
| \`inflationAdjusted\` | boolean | Yes | Whether amount adjusts for inflation |

## IncomeStream Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"incomeStream"\` | Yes | Discriminator |
| \`id\` | string | Yes | Unique ID |
| \`name\` | string | Yes | Display name |
| \`owner\` | \`"primary" \\| "spouse" \\| "joint"\` | Yes | Stream owner |
| \`startYear\` | number | Yes | First year of income |
| \`endYear\` | number | No | Last year (omit for lifetime) |
| \`annualAmount\` | number | Yes | Annual amount |
| \`colaPct\` | number | No | Annual COLA adjustment % |
| \`taxable\` | boolean | Yes | Whether income is taxable |
| \`survivorContinues\` | boolean | No | Whether income continues for survivor |

## Adjustment Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"adjustment"\` | Yes | Discriminator |
| \`id\` | string | Yes | Unique ID |
| \`name\` | string | Yes | Display name |
| \`year\` | number | Yes | Start year |
| \`endYear\` | number | No | End year (omit for one-time) |
| \`amount\` | number | Yes | Amount (positive=income, negative=expense) |
| \`taxable\` | boolean | Yes | Whether amount is taxable |
| \`inflationAdjusted\` | boolean | No | Whether amount adjusts for inflation |

## TaxYear Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"taxYear"\` | Yes | Discriminator |
| \`taxYear\` | number | Yes | Calendar year (key field) |
| \`status\` | \`"draft" \\| "ready" \\| "filed" \\| "amended"\` | Yes | Tax year status |
| \`filingStatus\` | \`"single" \\| "mfj" \\| "survivor"\` | Yes | Filing status for this year |
| \`stateOfResidence\` | string | Yes | State for this year |
| \`income\` | TaxYearIncome | Yes | Income breakdown |
| \`deductions\` | TaxYearDeductions | Yes | Deductions |
| \`credits\` | TaxYearCredits | Yes | Tax credits |
| \`payments\` | TaxYearPayments | Yes | Payments/withholding |
| \`computedFederalTax\` | number | Yes | Computed federal tax (app-computed) |
| \`computedStateTax\` | number | Yes | Computed state tax (app-computed) |
| \`computedEffectiveFederalRate\` | number | Yes | Effective federal rate % |
| \`computedEffectiveStateRate\` | number | Yes | Effective state rate % |
| \`refundOrBalanceDueFederal\` | number | No | Federal refund (negative) or balance due |
| \`refundOrBalanceDueState\` | number | No | State refund or balance due |
| \`documentIds\` | string[] | Yes | Linked document IDs |
| \`notes\` | string | No | User notes |

### TaxYearIncome

| Field | Type | Description |
|-------|------|-------------|
| \`wages\` | number | W-2 wages |
| \`selfEmploymentIncome\` | number | Self-employment income |
| \`interestIncome\` | number | Interest income (1099-INT) |
| \`dividendIncome\` | number | Dividend income (1099-DIV) |
| \`qualifiedDividends\` | number | Qualified dividends |
| \`capitalGains\` | number | Capital gains (1099-B) |
| \`capitalLosses\` | number | Capital losses |
| \`rentalIncome\` | number | Rental income |
| \`nqdcDistributions\` | number | NQDC distributions |
| \`retirementDistributions\` | number | Retirement distributions (1099-R) |
| \`socialSecurityIncome\` | number | Social Security income |
| \`otherIncome\` | number | Other income |

### TaxYearDeductions

| Field | Type | Description |
|-------|------|-------------|
| \`standardDeduction\` | number | Standard deduction amount |
| \`useItemized\` | boolean | Whether to use itemized deductions |
| \`itemizedDeductions\` | object | Itemized deduction breakdown (if useItemized) |

### TaxYearCredits

| Field | Type | Description |
|-------|------|-------------|
| \`childTaxCredit\` | number | Child tax credit |
| \`educationCredits\` | number | Education credits |
| \`foreignTaxCredit\` | number | Foreign tax credit |
| \`otherCredits\` | number | Other credits |

### TaxYearPayments

| Field | Type | Description |
|-------|------|-------------|
| \`federalWithheld\` | number | Federal tax withheld |
| \`stateWithheld\` | number | State tax withheld |
| \`estimatedPaymentsFederal\` | number | Federal estimated payments |
| \`estimatedPaymentsState\` | number | State estimated payments |

## TaxDocument Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"taxDocument"\` | Yes | Discriminator |
| \`id\` | string | Yes | Unique ID |
| \`taxYear\` | number | Yes | Tax year this document belongs to |
| \`formType\` | TaxFormType | Yes | Form type enum |
| \`issuerName\` | string | Yes | Name of issuer |
| \`sourceFileName\` | string | No | Original file name |
| \`oneDrivePath\` | string | No | Path in OneDrive |
| \`extractedFields\` | Record<string, number \\| string> | Yes | Extracted field values |
| \`fieldConfidence\` | Record<string, number> | Yes | Per-field confidence (0-1) |
| \`extractionConfidence\` | number (0-1) | Yes | Overall confidence |
| \`lowConfidenceFields\` | string[] | Yes | Fields below confidence threshold |
| \`confirmedByUser\` | boolean | Yes | User confirmed extraction |
| \`importedAt\` | string (ISO 8601) | Yes | Import timestamp |

TaxFormType: \`"W-2" | "1099-INT" | "1099-DIV" | "1099-R" | "1099-B" | "1099-MISC" | "1099-NEC" | "K-1" | "1098" | "other"\`

## ChecklistItem Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"checklistItem"\` | Yes | Discriminator |
| \`id\` | string | Yes | Unique ID |
| \`taxYear\` | number | Yes | Tax year |
| \`category\` | \`"document" \\| "income" \\| "deduction" \\| "life_event" \\| "deadline"\` | Yes | Category |
| \`description\` | string | Yes | Human-readable description |
| \`status\` | \`"pending" \\| "received" \\| "not_applicable" \\| "waived"\` | Yes | Completion status |
| \`sourceReasoning\` | string | Yes | Why this item was generated |
| \`relatedPriorYearItem\` | string | No | Prior year item reference |
| \`linkedDocumentId\` | string | No | Linked tax document ID |

## Anomaly Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`_type\` | \`"anomaly"\` | Yes | Discriminator |
| \`id\` | string | Yes | Unique ID |
| \`taxYear\` | number | Yes | Current tax year |
| \`comparisonYear\` | number | Yes | Prior year compared to |
| \`category\` | \`"omission" \\| "anomaly" \\| "pattern_break"\` | Yes | Category |
| \`severity\` | \`"info" \\| "warning" \\| "critical"\` | Yes | Severity level |
| \`field\` | string | Yes | Field name |
| \`description\` | string | Yes | Human-readable description |
| \`priorValue\` | number \\| string | No | Value in prior year |
| \`currentValue\` | number \\| string | No | Value in current year |
| \`percentChange\` | number | No | Percent change |
| \`suggestedAction\` | string | Yes | Suggested remediation |
| \`llmAnalysis\` | string | No | LLM-generated analysis |

## Shared Corpus Decomposition

The \`PlanInput\` type used by the simulation engine is assembled from the shared corpus:

- \`PlanInput.household\` ← \`household\` record from \`shared/corpus.ndjson\`
- \`PlanInput.accounts\` ← all \`account\` records from \`shared/corpus.ndjson\`
- \`PlanInput.otherIncome\` ← all \`incomeStream\` records from \`shared/corpus.ndjson\`
- \`PlanInput.adjustments\` ← all \`adjustment\` records from \`shared/corpus.ndjson\`
- \`PlanInput.spending\` ← from \`retirementPlan\` record in \`retirement/plan.ndjson\`
- \`PlanInput.taxes\` ← from \`retirementPlan\` record
- \`PlanInput.market\` ← from \`retirementPlan\` record
- \`PlanInput.strategy\` ← from \`retirementPlan\` record
`;
}

/**
 * Generates .agent/EDITING.md — editing rules.
 */
export function generateEditingDoc(): string {
  return `# FinPlanner Editing Rules

Rules for creating, updating, and deleting records in FinPlanner NDJSON files.

## General Rules

### Header Update Requirement
Every file modification MUST update the header line's \`savedAt\` to the current ISO 8601 timestamp.

### ID Conventions
- Most record types use an \`id: string\` field for uniqueness
- Format: \`{type}_{timestamp}_{random}\` (e.g., \`acct_1706123456_a1b2c3\`)
- **Exceptions:**
  - \`taxYear\` is keyed by \`taxYear: number\` (the calendar year)
  - \`household\` is a singleton (one per corpus)
  - \`retirementPlan\` is a singleton
  - \`appConfig\` is a singleton

### \`_type\` Discriminator
Every record MUST have a \`_type\` field. NEVER change the \`_type\` of an existing record.

### File Structure
- First line of every NDJSON file MUST be \`_type: "header"\`
- One header per file
- Each subsequent line is a data record

## Creating Records

1. Generate a unique ID following the ID convention above
2. Set all required fields per SCHEMA.md
3. Add the record as a new line in the appropriate file
4. Update the file's header \`savedAt\`
5. If adding to \`shared/corpus.ndjson\`, follow the Shared Corpus Edit Checklist below

## Updating Records

1. Locate the record by its key field (\`id\` or \`taxYear\`)
2. Modify the desired fields in-place
3. Update the file's header \`savedAt\`
4. If editing \`shared/corpus.ndjson\`, follow the Shared Corpus Edit Checklist below

## Deleting Records

1. Remove the entire line from the NDJSON file
2. Update the file's header \`savedAt\`
3. Check and remove any referential links (e.g., \`documentIds\` in tax year records)

## Shared Corpus Edit Checklist

When editing \`shared/corpus.ndjson\`:

1. Edit the target record(s) (e.g., update an account balance, add an income stream)
2. Update the header line's \`savedAt\` to the current ISO 8601 timestamp
3. For each \`draft\` tax year in \`tax/{year}/record.ndjson\`:
   - Update corresponding fields to match the new corpus values
   - If filing status changed, update \`filingStatus\` in each draft tax year
   - If state of residence changed, update \`stateOfResidence\`
   - Update that file's header \`savedAt\`
4. Do NOT modify \`filed\` or \`amended\` tax year records — they are frozen snapshots
5. For \`ready\` tax year records: update is optional — the app will prompt on next load
6. \`retirement/plan.ndjson\` reads from current corpus at runtime — no manual update needed,
   but updating its header \`savedAt\` is good practice
7. Run the VALIDATION.md checklist to verify all edits

## Tax Year Status Rules

| Status | Editable? | Auto-propagates from corpus? |
|--------|-----------|-------------------------------|
| \`draft\` | Yes | Yes — MUST reflect current corpus |
| \`ready\` | Yes (cautiously) | Optional — app prompts if stale |
| \`filed\` | No | No — frozen snapshot |
| \`amended\` | No | No — frozen snapshot |

## Computed Fields (DO NOT EDIT)

The following fields in \`draft\`/\`ready\` tax years are recomputed by the app on load.
CLI tools should edit source fields only and leave computed fields unchanged:

- \`computedFederalTax\`
- \`computedStateTax\`
- \`computedEffectiveFederalRate\`
- \`computedEffectiveStateRate\`
- \`refundOrBalanceDueFederal\`
- \`refundOrBalanceDueState\`

## What NOT to Edit

- \`_type\` field of any existing record
- \`.agent/\` folder contents (these are app-generated)
- \`checklist.ndjson\` content (except checklist item \`status\` field)
- \`anomalies.ndjson\` content (regenerated wholesale by the app)
- Computed fields in draft/ready tax years (see above)

## Staleness Warnings

1. **DATA_SUMMARY.md** — Only regenerated by the app on save. After CLI edits, it will be
   stale until the app next saves. Do not rely on it for current record counts.
2. **Computed fields** — In draft/ready tax years, computed fields are recomputed by the app
   on load. After CLI edits to source fields, computed fields will be stale until app reload.
3. **checklist.ndjson and anomalies.ndjson** — Regenerated wholesale by the app. Only checklist
   item \`status\` changes are preserved (matched by \`formType\` + \`issuerName\`).
`;
}

/**
 * Generates .agent/VALIDATION.md — 12-step validation checklist.
 */
export function generateValidationDoc(): string {
  return `# FinPlanner Validation Checklist

Use this 12-step checklist to verify your edits to FinPlanner data files.

## Pre-Validation

Before running this checklist, ensure you have:
- The JSON Schema files in \`.agent/schemas/\`
- Read SCHEMA.md for field requirements
- Read EDITING.md for editing rules

## Validation Steps

### 1. JSON Validity
Every line in every NDJSON file MUST be valid JSON.
\`\`\`
For each .ndjson file:
  For each line:
    Parse as JSON — MUST succeed
\`\`\`

### 2. \`_type\` Presence
Every line MUST have a \`_type\` field.
\`\`\`
For each line:
  assert "_type" in record
  assert typeof record._type === "string"
\`\`\`

### 3. Header Line
First line of every NDJSON file MUST be \`_type: "header"\` with \`schemaVersion\` and \`savedAt\`.
\`\`\`
For each .ndjson file:
  firstLine = parse(lines[0])
  assert firstLine._type === "header"
  assert typeof firstLine.schemaVersion === "string"
  assert typeof firstLine.savedAt === "string"  // ISO 8601
  assert Array.isArray(firstLine.modules)
\`\`\`

### 4. Schema Conformance
Each record validates against its \`.agent/schemas/{_type}.schema.json\`.
\`\`\`
For each record:
  schema = loadSchema(record._type)
  validate(record, schema) — MUST pass
\`\`\`

### 5. Required Fields
All required fields for each \`_type\` are present (per SCHEMA.md).
\`\`\`
For each record:
  Check all "Required: Yes" fields from SCHEMA.md exist and are non-null
\`\`\`

### 6. Enum Validity
All enum fields contain valid values.
\`\`\`
filingStatus ∈ {"single", "mfj", "survivor"}
accountType ∈ {"taxable", "taxDeferred", "deferredComp", "roth"}
taxYearStatus ∈ {"draft", "ready", "filed", "amended"}
checklistItemStatus ∈ {"pending", "received", "not_applicable", "waived"}
anomalySeverity ∈ {"info", "warning", "critical"}
formType ∈ {"W-2", "1099-INT", "1099-DIV", "1099-R", "1099-B", "1099-MISC", "1099-NEC", "K-1", "1098", "other"}
simulationMode ∈ {"deterministic", "historical", "stress", "monteCarlo"}
withdrawalOrder ∈ {"taxableFirst", "taxDeferredFirst", "proRata", "taxOptimized"}
owner ∈ {"primary", "spouse", "joint"}
personId ∈ {"primary", "spouse"}
\`\`\`

### 7. Numeric Ranges
All numeric fields within documented bounds.
\`\`\`
Ages: 0–120
Percentages (rates, allocations): 0–100
Balances and amounts: >= 0 (except adjustments which can be negative)
Confidence scores: 0–1
Years: reasonable range (1900–2200)
\`\`\`

### 8. Referential Integrity
Cross-file references are valid.
\`\`\`
taxDocument.taxYear → must match a taxYear record
checklistItem.taxYear → must match a taxYear record
checklistItem.linkedDocumentId → must match a taxDocument.id (if present)
anomaly.taxYear → must match a taxYear record
anomaly.comparisonYear → must match a taxYear record
taxYearRecord.documentIds → each must match a taxDocument.id
\`\`\`

### 9. Uniqueness
ID fields are unique within their scope.
\`\`\`
account.id — unique across all accounts
incomeStream.id — unique across all income streams
adjustment.id — unique across all adjustments
taxDocument.id — unique across all documents
checklistItem.id — unique across all checklist items
anomaly.id — unique across all anomalies
taxYear.taxYear — unique across all tax years
\`\`\`

### 10. Corpus Propagation
Draft tax years reflect current shared corpus; filed years are unchanged.
\`\`\`
For each draft taxYear:
  assert taxYear.filingStatus === corpus.household.filingStatus
  assert taxYear.stateOfResidence === corpus.household.stateOfResidence
For each filed/amended taxYear:
  assert values are unchanged from last known state
\`\`\`

### 11. Business Invariants
Domain-specific rules.
\`\`\`
- If maritalStatus === "single", spouse MUST be absent
- If maritalStatus === "married", filingStatus MUST be "mfj"
- qualifiedDividends <= dividendIncome
- capitalLosses >= 0
- NQDC distributions don't exceed total deferredComp balance
- RMD ages ≥ 73 (or ≥ 75 for born 1960+)
- withdrawalOrder is a valid enum value
\`\`\`

### 12. File Structure Invariants
Files are in the correct locations.
\`\`\`
shared/corpus.ndjson — contains household, account, incomeStream, adjustment records
tax/{year}/record.ndjson — contains taxYear and taxDocument records
tax/{year}/checklist.ndjson — contains checklistItem records
tax/{year}/anomalies.ndjson — contains anomaly records
retirement/plan.ndjson — contains retirementPlan record
retirement/results/{id}.ndjson — contains simulationResult record
config.ndjson — contains appConfig record
\`\`\`

## Post-Validation

After all 12 steps pass:
- Your edits are compatible with FinPlanner
- The app will load modified data without errors on next launch
- DATA_SUMMARY.md will be regenerated on next app save
`;
}

/** Data for generating a DATA_SUMMARY.md */
export interface DataSummaryInput {
  taxYears: Array<{ year: number; status: string }>;
  accounts: Array<{ name: string; type: string }>;
  incomeStreams: Array<{ name: string }>;
  scenarioCount: number;
  documentsByYear: Record<number, string[]>;
}

/**
 * Generates .agent/DATA_SUMMARY.md — dynamic data snapshot.
 * No dollar amounts, balances, or PII.
 */
export function generateDataSummary(input: DataSummaryInput): string {
  const now = new Date().toISOString();

  let doc = `# FinPlanner Data Summary

Generated: ${now}
Schema Version: ${SCHEMA_VERSION}

## Record Counts

- Tax Years: ${input.taxYears.length}
- Accounts: ${input.accounts.length}
- Income Streams: ${input.incomeStreams.length}
- Scenarios: ${input.scenarioCount}

## Tax Years

| Year | Status |
|------|--------|
`;

  if (input.taxYears.length === 0) {
    doc += '| (none) | — |\n';
  } else {
    for (const ty of input.taxYears) {
      doc += `| ${ty.year} | ${ty.status} |\n`;
    }
  }

  doc += `
## Accounts

| Name | Type |
|------|------|
`;

  if (input.accounts.length === 0) {
    doc += '| (none) | — |\n';
  } else {
    for (const a of input.accounts) {
      doc += `| ${a.name} | ${a.type} |\n`;
    }
  }

  doc += `
## Income Streams

`;

  if (input.incomeStreams.length === 0) {
    doc += '(none)\n';
  } else {
    for (const s of input.incomeStreams) {
      doc += `- ${s.name}\n`;
    }
  }

  doc += `
## Imported Documents

`;

  const years = Object.keys(input.documentsByYear).map(Number).sort();
  if (years.length === 0) {
    doc += '(none)\n';
  } else {
    for (const year of years) {
      doc += `### ${year}\n`;
      for (const fileName of input.documentsByYear[year]) {
        doc += `- ${fileName}\n`;
      }
    }
  }

  return doc;
}

/**
 * Returns all static agent documentation files as a map of path → content.
 * Paths are relative to the FinPlanner root.
 */
export function generateStaticAgentDocs(): Record<string, string> {
  return {
    'README.md': generateRootReadme(),
    '.agent/README.md': generateAgentReadme(),
    '.agent/SCHEMA.md': generateSchemaDoc(),
    '.agent/EDITING.md': generateEditingDoc(),
    '.agent/VALIDATION.md': generateValidationDoc(),
  };
}
