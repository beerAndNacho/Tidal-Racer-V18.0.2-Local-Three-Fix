# Tidal Racer commercial legal review packet

This packet converts the current engineering facts into a review queue. It
does not authorize sale and is not legal advice.

## Engineering evidence

- Product/version: Tidal Racer 18.0.2.
- Runtime: local browser application; the Windows launcher binds to loopback.
- Data map: release/product-data-map.json.
- Third-party notices: assets/THIRD_PARTY_NOTICES.md.
- Release evidence: release/RELEASE_AUDIT.json.
- Free preview license: LICENSE.
- Commercial drafts: release/EULA.md, release/PRIVACY.md, and
  release/SUPPORT_POLICY.md.

Run node scripts/legal-data-flow-check.mjs after every storage, networking,
account, telemetry, export, or launcher change. A passing check supports the
engineering facts only; it is not legal approval.

## Publisher decisions required

1. Complete release/publisher.json with verified legal identity, country,
   support contact, privacy contact, and copyright holder.
2. Select territories and storefronts.
3. Choose price and ISO 4217 currency.
4. Obtain or document the applicable age rating or exemption.
5. Confirm title and trademark availability.
6. Confirm marketing rights for every screenshot, key art item, model,
   texture, sound, and music element.
7. Approve storefront-specific refund and consumer disclosures.
8. Approve support hours, response targets, support window, save migration,
   update delivery, and end-of-support notice.
9. Have qualified counsel replace every bracketed decision and remove every
   DRAFT notice from the three final policies.
10. Complete release/commercial-approval.json only after all decisions are
    final. Every approval flag must remain false until then.

## Content and rating facts to review

The current build includes competitive watercraft racing and collision,
traffic contact, fishing and fish auction mechanics, fictional currency and
banking, nightlife music/dance/arcade activities, food and fitness routines,
weather hazards, and character dialogue. It has no publisher-operated
real-money purchase flow in the game runtime. A rating professional must
verify the final build and store description rather than relying only on this
summary.

## Approval rule

The commercial build command remains blocked until the audit sees verified
publisher data, final legal text without draft markers, a signed approval
record, and the full signed browser/GPU playtest matrix. Never change the audit
to bypass missing evidence.
