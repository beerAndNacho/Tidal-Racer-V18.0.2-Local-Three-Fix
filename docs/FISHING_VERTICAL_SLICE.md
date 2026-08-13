# Tidal Angler — commercial vertical slice

## Player loop

1. Explore one of nine regions and stop the craft.
2. Enter fishing mode with `G` and cast with `Q`.
3. React to the bite window with `Q`.
4. Reel with `Space` or `Up`, counter the fish with `Left/Right`, and give line with `Down` before tension snaps the line.
5. Land the fish, set a weight record, earn credits/XP/reputation, and fill the codex.
6. Unlock stronger tackle at 12, 35 and 70 total catches, then hunt rarer regional species.

## Content structure

- Nine regional pools with three or four species each
- Five rarity tiers from common to legendary
- Nine behavior profiles: school, zigzag, runner, power, jump, acrobat, bottom, pulse and glide
- Twenty-seven distinct names, Korean names, silhouettes, colors, accent materials, fight values, weight ranges and descriptions
- Four tackle tiers affecting line strength, reel rate and rod control

## Presentation

- Dedicated over-shoulder fishing camera
- Runtime rod, grip, line sag, bobber and animated ripple
- Tension, stamina and distance telemetry HUD
- Bite, hook, snap, loss and catch audio cues
- Catch result card and persistent fish codex
- Three generated PBR-style material families applied by habitat and behavior

## Commercial guardrails

- Active fish assets are original procedural geometry and project-exclusive generated textures.
- No copied characters, models, signage, audio or branding from another game.
- Third-party environment assets remain disabled until their source, license, acquisition date and SHA-256 are recorded.
- Poly Haven CC0 is the approved future environment source; see `assets/THIRD_PARTY_NOTICES.md`.

## Acceptance checks

- All 27 IDs are unique and every region has a fishing pool.
- A deterministic player input loop can land a fish without bypassing the state machine.
- Fishing progress persists separately from the racing profile.
- The browser can enter fishing mode and cast with zero console errors.
- Existing loading, controls, audio, characters, localization, water and racing checks remain green.
