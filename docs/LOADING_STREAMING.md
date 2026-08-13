# V18 Loading and World Streaming Direction

## Objective

The first usable menu should appear after the renderer, balanced post-processing, sky, rough-water surface, Golden Coast, player model and core UI are ready. Full-world completion must not block menu interaction.

## Critical boot path

1. Static HTML loader paints.
2. Bootstrap yields for two animation frames.
3. Three.js and the V18 runtime module graph load.
4. Renderer, balanced post stack, sky and water initialize.
5. Golden Coast is generated.
6. UI and the hero rider/craft are created.
7. Three starter rival rigs are prepared but hidden in the menu.
8. The first menu frame renders.
9. The loader fades out.

## Background path

After the first frame, idle-time queues handle:

- eight remaining regions
- eight remaining rival rigs
- 26 remaining item boxes
- 32 remaining clouds
- PMREM environment reflections
- asset-manifest inspection
- GLTF/Draco/KTX2/Meshopt loader imports only when an enabled asset requires them

Every batch has a small main-thread time budget. `requestIdleCallback` is used when available, with `setTimeout` fallback.

## Priority behavior

`updateRegionStreaming(x,z)` checks all region centers. An unloaded region within the approach radius is pushed to the front of the queue. Loaded regions outside the visibility radius are hidden but retained for fast return travel.

## Diagnostics

```js
window.__tidalBootMetrics
// { startedAt, readyAt, bootMs, firstContentMs }

window.__tidalV18.streaming
// { loaded, total, pending, items, clouds, rivals }
```

## Acceptance targets

- Loader must paint before the large runtime import starts.
- Menu must not wait for all nine regions.
- Initial synchronous regions: 1 of 9.
- Initial item boxes: 8 of 34.
- Initial clouds: 10 of 42.
- Initial rival rigs: 3 of 11.
- No immediate PMREM calculation.
- No immediate GLTF/Draco/KTX2/Meshopt imports when all manifest assets are disabled.
- Existing water, steering, character, audio and localization regression checks must continue to pass.
