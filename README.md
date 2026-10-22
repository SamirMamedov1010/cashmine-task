# CashMine — React Native Practical Task

A mobile-first payback balance and claim application built with React Native, Expo, and TypeScript.

## Live Demo

**Web application:** https://cashmine-task-woad.vercel.app

The application is optimized for mobile browsers and can be opened directly on a phone.

## Tech Stack

- React Native + Expo SDK 58
- TypeScript
- Expo Router
- Redux Toolkit + RTK Query
- decimal.js
- react-native-toast-message
- Vitest
- Vercel

## Getting Started

**Requirements:** Node.js 22 and npm.

```bash
nvm use 22
npm install
npx expo start --web
```

Open the local URL displayed in the terminal.

## Authentication

On first launch, enter a valid CashMine API token.

The token is provided at runtime and stored locally in the browser. It is not hardcoded into the application or included in the deployed JavaScript bundle.

Users can replace their token from the application interface.

API base URL: `https://task-api.cashmine.io`

## Implemented Features

**Balances**
- Asset balances with available, pending, and claiming amounts
- Estimated total available USD balance
- Snapshot freshness indicator
- Loading, error, retry, and refresh states

**Claims**
- Asset and destination selection
- Amount entry and Max action
- Decimal precision and amount validation
- Fee and receive amount calculation
- Explicit confirmation before submission
- Idempotent claim requests
- Claim status tracking and timeout recovery
- Success, error, and informational feedback

**Navigation and Architecture**
- Expo Router navigation
- Responsive bottom tab navigation
- Separation of UI, hooks, API services, and financial utilities
- Reusable components

## Testing

Run the unit tests:

```bash
npm test
```

The project includes 32 financial unit tests covering amount parsing, validation, decimal precision, fees, and USD totals.

Additional checks:

```bash
npx tsc --noEmit
npx expo lint
npx expo export --platform web
```

## Deployment

The Expo web build is deployed to Vercel through GitHub.

Production build:

```bash
npx expo export --platform web
```

The generated static files are exported to `dist/`.

## Additional Documentation

See [NOTES.md](./NOTES.md) for architectural decisions, AI collaboration examples, and known limitations.

AI conversation records are included in [`ai-logs/`](./ai-logs/).