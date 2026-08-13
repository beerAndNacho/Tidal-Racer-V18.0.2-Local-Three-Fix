# V16 Water, Visibility and Steering Direction

## Visibility target
The sunset must remain cinematic without hiding riders, shoreline silhouettes, gates or water shape. Direct sunlight and bloom may create highlights, but neither may flatten the entire frame into yellow-white haze.

Current baseline:
- ACES exposure: 0.82
- Direct sun: 3.15
- Balanced bloom: 0.14
- Ultra bloom: 0.22
- Bloom threshold: 1.04
- Sun is raised above the previous near-horizon angle

## Sea-state target
Calm water is reserved for sheltered harbor and mangrove areas. Normal racing water must visibly roll under the craft. Storm Strait, Black Reef and wave events must materially change route choice and hull attitude.

The visible ocean and buoyancy physics share `v16/wave-model.js`. Long swells create readable body motion; shorter waves add chop. Event and region multipliers modify the same field rather than applying unrelated camera shake.

## Handling target
From the default north-facing start:
- A / Left must curve toward screen-left.
- D / Right must curve toward screen-right.
- High speed should feel heavier than low speed.
- Drift increases yaw and lateral slip without swapping directions.
- Reverse uses reduced inverse steering.

## Performance budget
- 150 x 150 water segments: 22,801 vertices
- Water displacement: 30 Hz
- Whitecaps: 1,200 points at 12 Hz
- Render wave function is cheaper than the full physics spectrum while preserving the same long/medium components
- Water tile follows the player; distant ocean uses a simpler horizon layer
