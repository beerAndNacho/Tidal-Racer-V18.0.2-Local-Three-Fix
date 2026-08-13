# Tidal Racer Asset Pipeline

V12 accepts production assets through `assets/manifest.json`.

## Target format
- glTF 2.0 / GLB
- Y-up, meters
- Draco or Meshopt geometry compression
- KTX2 or WebP textures where available
- LOD0/LOD1/LOD2 for large props and buildings

## Suggested threejsassets references
The free catalog currently includes useful web-optimized models such as Date Palm, Sandstone Boulder, Apartment Block, Glass Skyscraper, Midrise Office, Street Tree, Street Lamp, Crate, Papyrus Reed and Cloud Set.

Do not commit a third-party GLB until its specific redistribution/license terms are verified. The runtime manifest keeps these slots disabled until the local files exist and `enabled` is set to true.

## Commercial release gate
- Prefer original/generated project assets or CC0 sources.
- Poly Haven is the approved CC0 environment source; keep its asset page and license URL in the manifest.
- Record original filename, acquisition date and SHA-256 for every third-party file.
- Run geometry and texture compression before enabling an asset.
- Never use ripped models, logos, signage, music or characters from another game.
- See `assets/THIRD_PARTY_NOTICES.md` for the current provenance record.

## Folder convention
```
assets/
  glb/
    nature/
    city/
    props/
    vehicles/
    riders/
  textures/
  manifest.json
```

## Performance budget
- Hero craft/rider: LOD0 <= 120k triangles combined
- AI craft/rider: LOD1 <= 30k combined
- Distant AI: LOD2 <= 6k combined
- Buildings: 2k–25k each, instanced when repeated
- Nature props: 0.5k–8k, instanced
- Prefer atlases and compressed textures.

## V15 character contract
- Every hero rider GLB must provide the bone names listed in `manifest.json.characterRig.requiredBones`.
- Required authored clips: menu idle, ride, hard turn, drift, boost, landing and victory.
- LOD0 target: 60k–90k triangles for rider, 2K PBR skin/cloth/helmet textures.
- LOD1 target: 12k–25k triangles for nearby AI.
- LOD2 target: 3k–6k triangles for distant rivals.
- The procedural V15 character system remains the fallback when a licensed GLB is absent or fails to load.
- Do not copy commercial character assets from another game or redistribute an asset whose license forbids source-file distribution.
