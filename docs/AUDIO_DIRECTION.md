# V18.0.2 Audio Direction

Target: audio should reinforce speed, place, competition, reward, rarity, and player identity rather than play as one flat loop.

## Adaptive music states
- Menu: low-intensity ambient theme after the first user gesture.
- Race: region-specific tempo and harmonic palette.
- High speed / boost: percussion and upper synth layers become denser.
- Front pack / chase: intensity rises with rank and speed.
- World event: event stinger plus temporary intensity lift.
- Victory / rare drop: dedicated musical payoff.

The score is synthesized in real time from pads, bass, arpeggios, leads and percussion. Region chord progressions and a filtered delay bus give it a cohesive arcade-racing identity without copyrighted or external audio files.

## Region palettes
Golden Coast, Volcano Bay, Mangrove Delta, Harbor City, Storm Strait, Coral Expanse, Moon Archipelago, Black Reef, and Skywater Lagoon each use a different root, tempo and note set.

## Continuous vehicle/environment layers
- Engine low / mid / high harmonics driven by live RPM.
- Water/wake noise driven by speed.
- Wind layer grows non-linearly at high speed.

## SFX families
UI, race start, boost, drift, four skills, item pickup/use, impact, rare drop, victory, purchase, contract completion, region transition, camera/mode switching, and event-specific stingers.

## Browser policy
AudioContext is created/resumed only after the first pointer/key gesture. Until then the status badge explicitly asks for a click/key; the first START click unlocks the full mix and changes the badge to the active region score.

## Controls
- M: music on/off (engine, ambience and SFX remain active).
