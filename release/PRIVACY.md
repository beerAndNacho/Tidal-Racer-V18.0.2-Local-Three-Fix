# Tidal Racer Privacy Notice

> DRAFT - NOT APPROVED FOR COMMERCIAL RELEASE
>
> This engineering draft describes version 18.0.2 as currently shipped. A
> qualified reviewer must add the verified publisher identity, effective date,
> territory-specific rights, and storefront processors before approval.

Effective date: [COUNSEL TO COMPLETE]

Data controller: [VERIFIED PUBLISHER LEGAL NAME AND ADDRESS]

Privacy contact: [VERIFIED PRIVACY CONTACT]

## 1. Current data-flow summary

Tidal Racer 18.0.2 is a local browser game. The current game runtime does not
require an account and does not send gameplay telemetry, analytics, crash
reports, advertising identifiers, or cloud saves to the publisher. Runtime
fetches load bundled game files from the local game origin. The supplied
Windows launcher binds to 127.0.0.1.

DOM diagnostic attributes used by automated QA stay inside the local page and
are not transmitted by the game.

## 2. Data stored on the device

The browser stores the following categories locally:

- three save slots, integrity checksums, recovery backups, reset archives,
  play time, progression, inventory, currency, relationships, activities, and
  settings;
- language, audio volumes, accessibility options, key bindings, gamepad
  deadzone, sensitivity, and vibration preferences; and
- legacy save keys used only to migrate earlier local versions.

The authoritative engineering inventory is release/product-data-map.json.
Local game data is not a real bank account, financial account, or real-money
balance; all credits and statements are fictional gameplay state.

## 3. User-requested files

Save export writes a JSON backup to a location selected by the browser.
Photo Mode writes a PNG image. These files remain under the user's operating
system control. Import reads only the JSON file the user explicitly selects.
The game does not automatically upload either file.

The optional F10 release-testing recorder creates a separate JSON file only
after the tester starts a session and selects Export. It can contain the
tester-entered name, typed confirmation signature, notes, browser, operating
system, GPU, boot and frame measurements, manual verification flags, and
runtime error messages. It is not stored or transmitted by the game. A tester
chooses whether and how to provide that file to the publisher. Testers should
not enter unrelated personal or sensitive information.

## 4. Deletion and retention

The game retains browser data until the user resets a slot, clears the local
origin's site data, replaces it through import, or removes the browser profile.
Reset archives may remain locally to support recovery. Clearing all site data
for the local Tidal Racer origin removes browser-stored game data. Exported
JSON and PNG files, including optional QA evidence, must be deleted separately
through the operating system.

## 5. External services

GitHub repository pages, release downloads, issue reports, and GitHub traffic
statistics are separate from the game runtime and are governed by GitHub's
terms and privacy notice. A future commercial storefront may process purchase,
account, tax, fraud, refund, and download data under its own notice. Every
approved storefront and processor must be listed here before sale.

## 6. Security

Save envelopes include integrity checks but are not encrypted and should not
contain real secrets or sensitive personal information. The local launcher
serves files only on loopback and rejects traversal outside the game folder.
No method can guarantee absolute device security; users should keep their
browser and operating system updated.

## 7. Children and age rating

The current build does not knowingly collect personal data through the game.
The publisher must still approve the product's age rating, child-directed
status, storefront audience settings, and any territory-specific parental
notice before commercial release.

## 8. Rights and requests

Because the game currently keeps gameplay data on the user's device, users can
access it through save export and erase it through the deletion steps above.
Counsel must add any legally required access, correction, objection,
restriction, portability, complaint, and appeal process, including identity
verification and response deadlines.

## 9. Legal basis and international transfer

The current game runtime does not transmit gameplay data to the publisher.
Counsel must nevertheless document the legal bases, processors, international
transfer safeguards, retention periods, and statutory disclosures for each
commercial storefront, support channel, website, and territory that operates
outside the runtime.

## 10. Changes and contact

If a future build adds accounts, cloud saves, analytics, crash reporting,
multiplayer, ads, or other transmission, the publisher must update this notice
and obtain any required consent before that processing begins.

Questions and rights requests: [VERIFIED PRIVACY CONTACT]

Supervisory authority information: [COUNSEL TO COMPLETE BY TERRITORY]
