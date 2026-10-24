# HiveLedger original dashboard visual system

This simplified public demo of an existing beekeeping operations application uses an independently implemented visual design. Two legitimately held Colorlib products were reviewed **for visual direction only**:

- CRM Starter (archive dated 9 October 2026): business-software information hierarchy and dashboard conventions.
- Farmie (archive dated 13 October 2026): agricultural greens, light natural surfaces and a restrained honey-colour accent.

**No source, images, font files, icons, stylesheet code or other distributable assets from either template were copied into this repository.** Farmie's commercial licence expressly prohibits publishing its source or modified template as a publicly downloadable template. Referencing broad colour and layout ideas does not make the full commercial template open source.

The implementation remains the application's own plain HTML/CSS/JavaScript, with no frontend dependency or build step. The original application source and design are now All Rights Reserved; see the root `LICENSE` notice. Earlier MIT-licensed versions retain the permissions originally granted for those releases.

## Presets

- **Harvest** (default): woodland green navigation, ivory content background and honey-gold details.
- **Studio**: slate-neutral, CRM-style alternative, using the same markup, forms, interactions and synthetic records.

The preset is stored only in a browser-local preference key (`hiveledger-theme-v1`) and is independent of the sample-data storage. The theme selector cannot mutate colony, apiary or inspection records.

## Acceptance

- Verify desktop and narrow-screen navigation and accessible contrast/focus.
- Switch Harvest ↔ Studio and reload; preference should persist.
- Run inspection create/edit, follow-up, move/history and reset in each visual preset.
- Ensure no third-party requests or production data are introduced.
