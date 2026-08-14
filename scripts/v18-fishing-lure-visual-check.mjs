import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync('v18/main.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');

for(const signal of ['lure-shore-worm','lure-flash-minnow','lure-surface-popper','lure-deep-glow-jig'])assert.ok(main.includes(signal),`missing authored lure model: ${signal}`);
assert.ok(main.includes('worm-segment-')&&main.includes('worm-circle-hook'),'shore worm must have animated segments and a hook');
assert.ok(main.includes('minnow-dive-bill')&&main.includes('minnow-tail')&&main.includes('minnow-treble-'),'minnow must have a bill, tail and hooks');
assert.ok(main.includes('popper-cupped-face')&&main.includes('popper-tail-hook'),'popper must have a cupped face and hook');
assert.ok(main.includes('glow-jig-body')&&main.includes('glow-jig-band')&&main.includes('jig-skirt-')&&main.includes('jig-assist-hook'),'deep jig must have glow, skirt and assist hook details');
assert.ok(main.includes('bait-leader-line')&&main.includes('bait-cast-entry-splash'),'lures need a visible leader and cast entry splash');
assert.ok(main.includes('sinkByZone={surface:.09,shallow:.38,mid:.72,deep:1.18}'),'each fishing zone must have distinct visible depth');
assert.ok(main.includes("bait.id==='shore-worm'")&&main.includes("bait.id==='flash-minnow'")&&main.includes("bait.id==='surface-popper'")&&main.includes("bait.id==='deep-glow-jig'"),'all four lure types need distinct motion');
assert.ok(main.includes('dataset.fishingLureVisual')&&main.includes('dataset.fishingLureMotion')&&main.includes('dataset.fishingCastSplash'),'lure presentation telemetry must be exposed');
assert.ok(smoke.includes('bait-specific 3D lure presentation'),'package smoke must cover lure presentation');
assert.ok(readme.includes('Bait-specific 3D lure presentation')&&contributing.includes('v18-fishing-lure-visual-check.mjs'),'feature and QA command must be documented');

console.log('11/11 V18 fishing lure visual checks PASS');
