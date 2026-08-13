# Contributing to Tidal Racer

Bug reports, performance measurements, accessibility feedback, translations,
and focused pull requests are welcome.

## Before opening a pull request

1. Create a branch from `main`.
2. Keep generated release folders and source-art files out of the commit.
3. Run:

```powershell
node scripts/public-release-check.mjs
node scripts/package-smoke-check.mjs
node scripts/v18-city-life-check.mjs
node scripts/v18-rival-race-check.mjs
```

4. Explain what changed and how it was tested.

Assets must be original or have a redistribution-compatible license. Add source,
license, author, and hash information to the relevant provenance record.

