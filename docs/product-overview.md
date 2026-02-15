# FinPlanner — Personal Tax & Retirement Planning

**A private, browser-based financial planning tool that keeps your data under your control.**

---

FinPlanner is a single-page web application for households managing tax obligations and planning sustainable retirement income. It runs entirely in the browser — there is no backend server. Your financial data stays on your device and in your personal OneDrive; nothing is stored on any third-party server.

## What It Does

**Tax Planning** — Organize tax records year by year. Import W-2s, 1099s, K-1s, and other tax documents by dragging PDFs into the browser; FinPlanner extracts the key fields automatically and flags anything it's uncertain about for your review. A filing checklist tells you what's complete and what's missing based on last year's records and your known accounts. Year-over-year comparison catches anomalies — a missing 1099, an unusual swing in income or deductions — before they become problems at filing time.

**Retirement Planning** — Model household cashflows from now through end of life. FinPlanner handles taxable accounts, 401(k)s, deferred compensation, Social Security, pensions, and one-time events like a home sale. It enforces RMDs, tracks cost basis, applies federal and state taxes, and models the survivor phase when one spouse passes. Run scenarios against historical market conditions (dot-com bust, 2008 crisis) or stress presets (high inflation, early drawdown) to see how your plan holds up. Guardrail spending rules automatically tighten or loosen withdrawals based on portfolio health.

**AI-Powered Guidance** — Optionally connect your own Claude API key for personalized analysis. FinPlanner strips all personally identifiable information before sending summarized financial data to Claude for portfolio optimization suggestions, tax strategy recommendations, and contextual explanations of detected anomalies. Every AI suggestion includes rationale, trade-offs, and a clear disclaimer. If you don't provide an API key, all rule-based features work fully — AI features simply show a prompt to add one.

## How It Works

- **Data entry:** Type it in, import from PDFs, or load a previously exported file. Tax and retirement modules share a common data corpus — enter your accounts and income once, both modules use it.
- **Storage:** Data saves to your OneDrive Personal with a local IndexedDB cache for instant access and offline use. Close the browser, reopen it, your data is there. No account to create, no cloud database.
- **Export:** Everything exports as NDJSON (one JSON object per line), designed to be consumed by other tools or LLM agents for further analysis.
- **Deployment:** A static website — no server infrastructure to maintain. Host it on Azure Static Web Apps, GitHub Pages, or any CDN.

## Design

Built with Microsoft's Fluent UI React v9 design system. Light and dark themes. Responsive from 1024px to ultrawide. WCAG 2.1 AA accessible. The interface uses familiar Microsoft design patterns: cards, data grids, drawers, toast notifications, and inline form validation.

## Key Properties

| | |
|---|---|
| **Privacy** | Data never leaves your browser and OneDrive except for opt-in AI analysis with your own API key |
| **Offline** | Fully functional without network; syncs when reconnected |
| **No account required** | Authenticate with your existing Microsoft account for OneDrive; no separate signup |
| **Transparent** | Every projection shows the assumptions behind it; every AI suggestion includes trade-offs and disclaimers |
| **Portable** | NDJSON export means your data is never locked in — any tool can read it |
