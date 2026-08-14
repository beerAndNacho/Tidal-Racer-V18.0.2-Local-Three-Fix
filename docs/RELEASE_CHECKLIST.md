# Tidal Racer commercial release checklist

The commercial package is intentionally blocked until every blocker in `release/RELEASE_AUDIT.json` is resolved. Run:

```powershell
node scripts/release-audit.mjs --tests --write --strict
node scripts/build-release.mjs
```

## Art and character gate

- Supply sixteen original or commercially licensed `LOD0` rider GLBs listed in `assets/manifest.json`.
- Record source, license, acquisition date and SHA-256 for every enabled GLB.
- Validate the required bone names and seven authored clips from `assets/manifest.json.characterRig`.
- Keep the procedural rider as a runtime fallback, not as evidence that the premium LOD0 gate passed.
- Copy `release/rider-import.example.json`, replace every rights placeholder, and run `node scripts/import-rider-assets.mjs --source <delivery-folder> --metadata <completed-json> --dry-run`. Remove `--dry-run` only after all 16 files pass; the importer refuses overwrites and enables files with measured hashes and license metadata.

## Legal and storefront gate

- Review release/product-data-map.json against the exact commercial build and run node scripts/legal-data-flow-check.mjs. This verifies engineering facts but does not replace counsel.
- Work through release/LEGAL_REVIEW_PACKET.md. The three final-named policies are deliberately blocked drafts and must retain their DRAFT notices until an authorized reviewer approves every bracketed decision.
- Copy `release/publisher.example.json` to `release/publisher.json` and replace every placeholder with verified publisher information.
- Finalize EULA, privacy notice, support policy, refund/store disclosures and age rating for each sales territory.
- Confirm trademarks, title availability and all marketing screenshots with the publisher.
- Replace the three `release/*.example.md` legal review templates with approved `EULA.md`, `PRIVACY.md` and `SUPPORT_POLICY.md`. Complete `release/commercial-approval.json` from its example only after an authorized reviewer signs the territory, storefront, rating, price, refund, trademark and marketing-rights decisions.

## Technical gate

- All automated suites must pass from a clean checkout.
- Confirm every V4 regional landmark streams correctly and Golden Coast remains within the draw-call/triangle budget at the default spawn.
- Verify the full 12-craft starting grid, 3-2-1-GO lock, three-lap rank tracking, contact cooldown, slipstream, pack catch-up and race completion rewards.
- Complete 30-minute play sessions in the three browser targets and at least one integrated-GPU machine.
- Record p50/p95 frame time, crash-free sessions, loading time and save/load recovery.
- Verify keyboard remapping, audio sliders, subtitles and photosensitivity/accessibility settings before release.
- On each browser target, verify a physical standard gamepad: hot-plug/reconnect, analog steering, both triggers, every mapped action, fishing controls, deadzone/sensitivity persistence, and vibration where supported.
- Copy `release/playtest-matrix.example.json` to `release/playtest-matrix.json`, enter measured results, and have each tester sign their session. The audit rejects placeholders, sessions under 30 minutes, crashes, p95 frame time above 40 ms, missing integrated-GPU coverage, and incomplete save/control/gamepad/accessibility/gameplay checks.
- Build only with `scripts/build-release.mjs`; it emits a fresh SHA-256 content manifest.

## License gate

- Runtime code must not fetch executable modules, music, models or textures from a CDN.
- Preserve `vendor/three/LICENSE`, `assets/THIRD_PARTY_NOTICES.md` and Poly Haven provenance in the package.
- Do not enable placeholder catalog assets without redistribution permission.
