<p align="center">
  <img src="docs/promo/tidal-racer-launch-key-art.png" alt="Tidal Racer — Race, Fish, Explore" width="100%">
</p>

<h1 align="center">Tidal Racer V18.0.2</h1>

<p align="center">
  <strong>Race rival riders, hunt 27 species of fish, and step ashore into a living coastal city.</strong>
</p>

<p align="center">
  <img alt="version 18.0.2" src="https://img.shields.io/badge/version-18.0.2-22d3ee">
  <img alt="free public preview" src="https://img.shields.io/badge/release-free%20public%20preview-34d399">
  <img alt="local runtime" src="https://img.shields.io/badge/runtime-100%25%20local-fbbf24">
  <img alt="Korean and English" src="https://img.shields.io/badge/languages-KO%20%7C%20EN-a78bfa">
</p>

Tidal Racer is an original browser-based open-archipelago racing, fishing, and
coastal-life game. The full Three.js runtime, models, textures, and adaptive
music system are bundled locally—no game CDN, account, installer, or telemetry
is required.

## Download and play

### Fastest on Windows

1. Download the newest ZIP from **[GitHub Releases](https://github.com/beerAndNacho/Tidal-Racer-V18.0.2-Local-Three-Fix/releases/latest)**.
2. Extract the ZIP to a new folder.
3. Double-click **`run_local.bat`**.
4. Click **ENTER OPEN ARCHIPELAGO**. This first click unlocks browser audio.

Windows does not need Python, Node.js, npm, or an installation wizard. The
included PowerShell launcher starts a private server on `127.0.0.1` and opens
the game in your default browser.

### Clone the source

```powershell
git clone https://github.com/beerAndNacho/Tidal-Racer-V18.0.2-Local-Three-Fix.git
cd Tidal-Racer-V18.0.2-Local-Three-Fix
.\run_local.bat
```

macOS/Linux users can run `sh run_local.sh`; Python 3 is required there.
Opening `index.html` directly is not supported because browsers restrict local
JavaScript modules and game assets.

## What is already playable

- **Competitive water racing:** an 11-rider grid, countdown, adaptive pack AI,
  overtakes, contact, slipstream, proximity HUD, and ambient traffic
- **Open archipelago:** nine streamed regions with distinct coastlines, cities,
  weather mood, traffic, and region-specific activities
- **Fishing:** 27 species, five rarities, nine regional pools, four tackle tiers,
  persistent records, casting, hooking, and tension-based fights
- **Life ashore:** leave the craft at Golden Coast, walk or run through town,
  enter a home, grocery, restaurant, bank, nightlife venue, or gym, and manage
  energy, hunger, mood, hygiene, money, day, and time
- **Career and collection:** eight chapters, contracts, season XP, affinity,
  cosmetics, items, events, and persistent progress
- **Presentation:** procedural PBR water, authored facades and riders, adaptive
  score, RPM engine audio, ambience, contextual SFX, GTAO, SMAA, bloom, and
  performance-aware detail scaling
- **Accessible controls:** keyboard remapping, gamepad tuning, five-channel
  audio mixing, effect captions, reduced effects, and high-contrast HUD
- **Korean and English UI:** switch any time with `L`, or launch with
  `?lang=ko` / `?lang=en`

## Controls

| Mode | Keys |
|---|---|
| Craft | `W/↑` throttle · `S/↓` brake/reverse · `A/←` / `D/→` steer |
| Action | `Space` drift/reel · `Shift` boost · `1–4` skills · `E` item |
| World | `F` race/free roam · `G` fishing · `H` activity · `C` camera |
| Fishing | `Q` cast/hook · `Space` reel |
| City | `X` leave/board craft near Golden Coast dock · `WASD/arrows` move · `Shift` run · `E` interact |
| System | `R` restart · `M` music · `L` language |

Standard Xbox/PlayStation-compatible gamepads are supported. Keyboard and
gamepad can be switched at any time.

## Feedback that helps most

If you enjoy the direction, a GitHub star makes the project easier to discover.
For useful reports, open an [Issue](https://github.com/beerAndNacho/Tidal-Racer-V18.0.2-Local-Three-Fix/issues)
and include your browser, GPU, frame rate, region, and exact reproduction steps.

The current build is a **free public preview**, not a claimed AAA or commercial
final release. Automated regression coverage is in place; broader manual
Chrome, Edge, Firefox, and integrated-GPU verification is still ongoing.

## Repository and release safety

- Generated historical builds and source-art working files are excluded from Git.
- Public-release checks reject common credential patterns, local user paths,
  oversized tracked files, and accidental build copies.
- Runtime code and assets are local; the game stores progress only in browser
  local storage.
- Asset provenance and third-party licenses are documented.

Run the public checks with:

```powershell
node scripts/public-release-check.mjs
node scripts/package-smoke-check.mjs
```

## Promotion and press

- [Press kit and project facts](docs/PRESS_KIT.md)
- [Ready-to-post Korean Threads launch copy](docs/promo/THREADS_KO.md)
- [Launch key art](docs/promo/tidal-racer-launch-key-art.png)

## License

Tidal Racer is free to play and source-available for non-commercial use under
the [Tidal Racer Free Preview License](LICENSE). Gameplay videos, reviews, and
monetized creator coverage are expressly allowed.

Three.js is bundled under the MIT License. Poly Haven and identified Blender
Studio-derived assets are used under their recorded terms. See
[third-party notices](assets/THIRD_PARTY_NOTICES.md), the Three.js
[license](vendor/three/LICENSE), and asset provenance files.

