# Third-party asset policy

Tidal Racer's active V18 fishing visuals use project-authored procedural geometry and project-exclusive generated textures. No third-party fish model is enabled in the runtime manifest.

## Active Poly Haven CC0 material assets

The following 1K PBR texture sets are active in the runtime. They were downloaded from Poly Haven's official asset CDN through the public API on 2026-08-11 and verified against the API-provided MD5 values. Local SHA-256 hashes and exact filenames are recorded in `assets/textures/polyhaven/provenance.json`.

- `asphalt_03`: Golden Coast road surface.
- `anti_slip_concrete`: promenade, curb and quay concrete.
- `aerial_beach_02`: island beach and shoreline sand.

All three assets are published under CC0. Tidal Racer does not claim authorship of these source materials and retains the Poly Haven source links in its shipped notices.

## Approved external source

Poly Haven is approved for future environment imports because its published asset license is CC0. Every downloaded asset must still receive an entry in `assets/manifest.json` containing its source page, license URL, download date, original filename and SHA-256 hash before `enabled` may be set to `true`.

- Source: https://polyhaven.com/
- License: https://polyhaven.com/license
- License class: CC0
- Attribution: optional for assets; retained in this notice for provenance.

Do not copy models, textures, audio or branding from Grand Theft Auto or another commercial game. Reference screenshots may guide broad goals such as natural lighting, density and polish only.

## Three.js runtime

Tidal Racer bundles Three.js `0.185.0` and the required official example modules locally. Three.js is distributed under the MIT License.

- Project: Three.js
- Copyright: © 2010–2026 three.js authors
- License: MIT
- Bundled license text: `vendor/three/LICENSE`
- Package metadata: `vendor/three/package.json`

The complete MIT license text is shipped with every package in `vendor/three/LICENSE` as required by the license.
