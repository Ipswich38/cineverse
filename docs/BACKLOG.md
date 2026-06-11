# VissionLink Backlog

> The single place for open work. Update when anything ships or new work appears.
> (HANDOFF.md is historical — superseded by docs/ on 2026-06-11.)

## Open — operational

- [ ] Close out live test order `r-1780815718201-naaho` (₱101): refund via PayMongo
      dashboard + deactivate temp item `bmr-live-test` in the catalog.
- [ ] Client (BMR) to add Zoho incoming forwards for the two personal owner emails.
- [ ] Lighting/grip catalog: not in the camera-sets PDF — awaiting client decision
      and a set list before reactivating those rows (`is_active=false`, reversible).
- [ ] Run `npm run backup` weekly (manual for now; consider a launchd/cron job).

## Open — engineering (deferred from 2026-06-11 audit)

- [ ] Split `app/admin/page.tsx` (3,210 lines) into per-tab components — do
      tab-by-tab, AFTER walking docs/SMOKE_TEST.md as the regression net. (M4)
- [ ] Tokenize the color palette: promote the ~15 recurring hex values into
      `var(--…)` custom properties in globals.css, sweep TSX. Cosmetic. (L1)
- [ ] Won't-fix for now: `vissionlink_clients` email-as-PK (live PK migration
      risk outweighs the benefit). (L2)

## Client deal — Schedule B candidates (see ~/VissionLink-Store-Agreement.md)

- [ ] Multi-tenant owner onboarding flow
- [ ] Logistics/delivery scheduling
- [ ] Anti-delinquency automation beyond the current ledger flags

## Parked

- VAT shift: `TAX_CLAUSE` switch is in place (commit 9497660) — flip when BMR
  registers as VAT.
- **GPS tracking for equipment** (client roadmap): `vissionlink_units` already
  has `lat`/`lng`/`last_seen` + the monitoring board reads them — the build is
  hardware tags (or a courier phone app) POSTing to a check-in endpoint.
  Until then, return monitoring = daily return-reminder cron (owners BCC'd)
  + Availability board.
- Customer accounts: decided AGAINST (2026-06-11) — guest checkout + email-keyed
  ledger + magic-link /my-orders cover the need at current volume. Revisit only
  if customers ask for self-service history at scale.
