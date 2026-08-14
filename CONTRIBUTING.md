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
node scripts/v18-three-runtime-slim-check.mjs
node scripts/v18-city-life-check.mjs
node scripts/v18-east-waterfront-plaza-check.mjs
node scripts/v18-public-space-activity-check.mjs
node scripts/v18-plaza-kiosk-check.mjs
node scripts/v18-plaza-kiosk-service-check.mjs
node scripts/v18-city-transit-check.mjs
node scripts/v18-transit-navigation-check.mjs
node scripts/v18-plaza-audio-check.mjs
node scripts/v18-lifestyle-effects-check.mjs
node scripts/v18-pantry-economy-check.mjs
node scripts/v18-bank-ledger-check.mjs
node scripts/v18-venue-program-check.mjs
node scripts/v18-storefront-program-sign-check.mjs
node scripts/v18-city-jobs-check.mjs
node scripts/v18-citizen-relationships-check.mjs
node scripts/v18-storefront-quality-check.mjs
node scripts/v18-storefront-architecture-check.mjs
node scripts/v18-city-infill-check.mjs
node scripts/v18-interior-quality-check.mjs
node scripts/v18-city-audio-check.mjs
node scripts/v18-citizen-visual-quality-check.mjs
node scripts/v18-citizen-reactions-check.mjs
node scripts/v18-on-foot-quality-check.mjs
node scripts/v18-footstep-audio-check.mjs
node scripts/v18-street-collision-check.mjs
node scripts/v18-interior-collision-check.mjs
node scripts/v18-interior-camera-check.mjs
node scripts/v18-harbor-arcade-check.mjs
node scripts/v18-nightlife-rhythm-check.mjs
node scripts/v18-lifestyle-prop-check.mjs
node scripts/v18-life-sequence-check.mjs
node scripts/v18-city-traffic-check.mjs
node scripts/v18-traffic-presentation-check.mjs
node scripts/v18-parked-vehicle-check.mjs
node scripts/v18-delivery-routine-check.mjs
node scripts/v18-player-delivery-check.mjs
node scripts/v18-citizen-crowd-check.mjs
node scripts/v18-facility-hours-check.mjs
node scripts/v18-facility-staff-check.mjs
node scripts/v18-facility-face-check.mjs
node scripts/v18-dock-transition-check.mjs
node scripts/v18-facility-service-dialogue-check.mjs
node scripts/v18-home-time-check.mjs
node scripts/v18-city-street-lighting-check.mjs
node scripts/v18-weather-street-surface-check.mjs
node scripts/v18-coastal-paving-check.mjs
node scripts/v18-city-wayfinding-check.mjs
node scripts/v18-city-signal-check.mjs
node scripts/v18-marine-ecology-check.mjs
node scripts/v18-water-contact-check.mjs
node scripts/v18-craft-dynamics-check.mjs
node scripts/v18-catch-presentation-check.mjs
node scripts/v18-fishing-target-visual-check.mjs
node scripts/v18-fishing-strategy-check.mjs
node scripts/v18-fishing-lure-visual-check.mjs
node scripts/v18-fishing-sonar-check.mjs
node scripts/v18-fishery-economy-check.mjs
node scripts/v18-marina-workshop-check.mjs
node scripts/v18-story-mission-check.mjs
node scripts/v18-save-slot-check.mjs
node scripts/v18-onboarding-check.mjs
node scripts/v18-markup-localization-check.mjs
node scripts/v18-photo-mode-check.mjs
node scripts/v18-navigation-check.mjs
node scripts/v18-race-events-check.mjs
node scripts/v18-race-course-check.mjs
node scripts/v18-rival-tour-check.mjs
node scripts/v18-rival-race-check.mjs
node scripts/v18-pack-racing-check.mjs
node scripts/v18-region-landmark-check.mjs
node scripts/v18-coastline-sculpt-check.mjs
node scripts/v18-subsurface-environment-check.mjs
node scripts/v18-character-expression-check.mjs
```

4. Explain what changed and how it was tested.

Assets must be original or have a redistribution-compatible license. Add source,
license, author, and hash information to the relevant provenance record.
