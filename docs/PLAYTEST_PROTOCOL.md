# Tidal Racer signed browser playtest protocol

This protocol produces the evidence required by the commercial release audit.
It cannot be replaced by automated tests or an invented signature.

## Required matrix

- Chrome 124 or newer: one active 30-minute session.
- Edge 124 or newer: one active 30-minute session.
- Firefox 126 or newer: one active 30-minute session.
- At least one session must run on an integrated GPU.
- Every session must have zero runtime errors/crashes, boot in 15 seconds or
  less, and record a p95 frame time no greater than 40 ms.

Use the exact candidate build. Record operating system, GPU and driver,
display resolution, quality mode, input device, and notable observations.
Close unnecessary background applications, but do not disable ordinary
security software or hide a reproducible defect.

## Start

1. Launch with run_local.bat or the packaged platform launcher.
2. Confirm that the menu renders, then press F10.
3. Verify the detected browser, OS, and WebGL renderer. Correct the OS or GPU
   label only if the browser reports a generic value.
4. Select integrated or discrete GPU based on the actual active adapter.
5. Click BEGIN CLEAN SESSION and enter the game. Only unpaused active play
   counts toward 30 minutes; changing tabs does not count.

## Five manual gates

Check a box only after completing every action in its section.

### Save / load

- Make gameplay progress and use SAVE NOW.
- Export the active save JSON.
- Reload the page and confirm the slot, progression, credits, and active
  objective recover.
- Import the exported save into the intended slot and confirm a valid reload.
- If testing recovery, verify that a damaged primary can use its valid backup.

### Controls

- Verify WASD and all four arrow keys while driving and walking.
- Verify throttle, brake/reverse, steering, run, interaction, camera, pause,
  map, fishing, cast/reel, boarding, and activity controls.
- Remap one action, verify it, restore defaults, and confirm arrow fallbacks
  remain usable.

### Gamepad

- Connect a standard controller after launch and confirm hot-plug status.
- Verify left-stick steering, RT/LT analog travel, D-pad navigation, A/B/X/Y,
  shoulder buttons, View/Menu, fishing, activities, and courier cancel.
- Disconnect and reconnect without stuck input.
- Change deadzone and sensitivity, reload, and confirm persistence.
- Confirm vibration on supported hardware and that disabling it works.

### Accessibility

- Move every audio bus slider and confirm the intended bus changes.
- Enable effect captions and trigger representative driving, fishing, city,
  and activity sounds.
- Verify reduced effects and high-contrast HUD.
- Verify keyboard remapping remains navigable without a mouse.

### Activity and fishing

- Start a full rival race and verify the countdown, visible pack, checkpoints,
  rank changes, contact, slipstream, lap and result flow.
- Enter Free Roam, use a world activity, and complete or intentionally fail it.
- Fish through cast, bite, hook, tension fight, catch presentation, locker,
  and auction or release.
- Disembark, walk through Golden Coast, enter and exit a venue, and complete
  one city routine. Include the courier route on at least one browser.

## Sign and export

After 30 active minutes, review p50, p95, boot time, and error count. Describe
any defect or performance spike in Notes. Typing the tester name and signature
means the tester personally performed the five sections on the recorded
machine. The export button remains disabled until all gates pass.

Export one JSON per browser. Do not hand-edit the metrics. Each export contains
a SHA-256 of the signed session; the merger recalculates it and rejects any
post-export change.

## Merge and audit

From the repository:

```powershell
node scripts/merge-playtest-evidence.mjs chrome.json edge.json firefox.json --output release/playtest-matrix.json
node scripts/release-audit.mjs --tests --write --strict
```

The merger refuses duplicated browsers, short or unsigned sessions, outdated
browser versions, p95 above 40 ms, runtime errors, incomplete gates, invalid
GPU classification, or a matrix without integrated-GPU coverage.
