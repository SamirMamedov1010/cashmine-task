# CashMine — Engineering Notes

## 1. Decisions

**Financial calculations and precision**

I chose `decimal.js` instead of JavaScript floating-point arithmetic because financial operations must preserve decimal precision. API amounts remain strings until they are processed by calculation utilities.

During unit testing, I identified a potential precision issue with `decimal.js`'s default 20-significant-digit configuration. I addressed this using operation-scoped Decimal constructors with precision derived from the inputs, rather than changing global settings.

Financial calculations and validations are separated from UI components to improve readability, reuse, and testability.

**Balance behavior after submitting a claim**

I considered two approaches:

- **Optimistic updates:** immediately decrease the displayed balance, with a potential rollback if the claim fails.
- **Server-authoritative updates:** display confirmed server balances and separately communicate the pending claim.

I chose the server-authoritative approach. Since balance snapshots are refreshed approximately every 15 seconds, optimistic updates could cause confusing balance fluctuations.

The UI communicates claim processing separately while refreshing balances from the server. This favors transparency and predictable behavior over immediate visual updates.

**Unknown claim outcomes and idempotency**

A timeout does not necessarily indicate failure: the server may have accepted the request even if its response was lost.

Each logical claim attempt uses an `Idempotency-Key`. The original request body and key must be preserved for safe retries, avoiding duplicate payouts.

An unknown outcome is communicated explicitly rather than being reported as a failed claim. Claim status is tracked through the API until a definitive result is available.

**Architecture and UX**

I used Expo Router, Redux Toolkit, RTK Query, TypeScript, and feature-oriented separation of concerns. Screens focus on rendering, hooks manage workflows, and utilities contain testable business logic.

I also implemented a custom bottom navigation component and reusable toast notifications. Financial states remain visible in the interface instead of relying exclusively on temporary notifications.

## 2. Working with AI

I used ChatGPT for architectural discussions, task breakdown, and prompt preparation, while Codex assisted with implementation, debugging, and testing. I reviewed the results and verified changes before committing.

**1. Refining an unsuccessful prompt**

The initial bottom navigation implementation did not match the intended responsive layout. The tab bar first stretched across the entire desktop viewport. After adjusting its width, the navigation layout became too narrow.

I refined my instructions to specify responsive width constraints, alignment with the main content container, and equal distribution of navigation items.

**2. Identifying risky AI-generated code**

During financial unit testing, Codex identified a potential precision issue caused by the default 20-significant-digit configuration in decimal.js.

I used the resulting regression tests and verification checks to assess the correction. The implementation now uses operation-scoped decimal precision to preserve accuracy for high-precision calculations.

**3. Rejecting an unnecessary compatibility workaround**

During test setup, Codex proposed using an older Vitest version to work around Node.js compatibility.

I chose to use the project's existing Node.js 22 environment instead of adapting the tooling to an outdated Node.js 18 installation. I also added `.nvmrc` to document the required Node.js version.

The complete AI conversations are included in the `ai-logs/` directory without editing their content, except for removing sensitive information.

## 3. Not Done / Known Issues

- Unit tests cover financial parsing, validation, fees, and USD totals, but not the complete UI and network workflows.
- RTK Query integration, claim recovery, and navigation would benefit from dedicated integration tests.
- The claim flow should be tested further under simulated connection interruptions, slow responses, and rate limits.
- Activity pagination may require additional work depending on the final implementation.
- With more time, I would add end-to-end tests for the complete claim lifecycle and improve accessibility.

The implementation prioritizes financial correctness, safe claim handling, and maintainable architecture over additional visual features.