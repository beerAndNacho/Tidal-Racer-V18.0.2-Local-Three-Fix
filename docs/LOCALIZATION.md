# Tidal Racer V17 Localization

V17 supports Korean and English in the same runtime.

## User controls

- Use the `한국어 / English` switch in the upper-right corner.
- Press `L` to toggle the language during the menu or a race.
- Open `/?lang=ko` for a direct Korean start.
- Open `/?lang=en` for a direct English start.
- The selected language is stored in `localStorage` under `tidal-racer-language`.

## Coverage

The language layer updates:

- menu and HUD labels
- controls and sea-state labels
- shop, inventory, contracts, collections, profile and market controls
- item categories and descriptions
- active-skill descriptions
- world-event descriptions
- 16 rider roles, origins, biographies, gear labels and victory-pose labels
- toast messages and race/free-roam status
- rarity, season, contract, title and rival-profile labels

Proper names such as rider names, craft names, item brands and canonical region IDs remain stable.

## Architecture

`v17/main.js` loads the complete V16 gameplay runtime and then attaches `v17/i18n.js`.

Canonical gameplay identifiers remain English and are never translated inside game logic. This prevents localization from breaking:

- event-name comparisons
- item behavior checks
- region streaming
- audio cue routing
- save-game compatibility

Only display fields and presentation data are localized. Region labels use a CSS suffix, so the DOM value used by the game remains canonical.

## Adding a language

1. Add the language code to `SUPPORTED`.
2. Add a UI dictionary.
3. Add item, skill, event and rider content.
4. Do not translate canonical IDs or names used in conditional logic.
5. Extend `scripts/v17-i18n-check.mjs`.
