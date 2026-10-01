# Contributing to Cykla

Thank you for your interest. Cykla processes particularly sensitive health data, so
small, reviewable changes and data-minimizing decisions take priority.

## Local Development

```bash
npm ci
npm start
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run format
npm test
npm run test:coverage
npm run doctor
npm run build:smoke
```

Work on a feature branch, commit focused changes, and open a PR to `master`.
Review the diff and passing Actions before a squash merge; no external reviewer
is required for solo development. Do not commit local exports, databases, secrets
or `.env` files. See [GitHub setup](docs/GITHUB_SETUP.md).

Use Node 24.12+ within Node 24; CI uses `.node-version`. Keep Expo/native packages
compatible with Expo SDK 57 and run Doctor after updates. Add migrations rather than
editing released schema steps. Add user-visible copy to every catalog in
`src/i18n/locales/` with meaningful keys and parameterized messages (use functions
for counts so each language can apply its own plural rules). `de.ts` defines the
shape; other languages are type-checked against it. No i18n library is needed; to
add a language, follow the note in `src/i18n/i18n.ts`.

## Principles

- Never include real health data in logs, telemetry, error reports, or test fixtures.
- Do not add network transmission without a prior architecture and privacy review.
- Keep recorded and calculated data strictly separate.
- Change prediction logic only as pure functions in `src/domain/`.
- Every prediction change requires tests and a clear explanation in the UI.
- Use neutral wording in visible text; never present estimates as certainty.
- Do not copy brands, text, screenshots, illustrations, or layouts from existing
  apps.
- Verify touch targets, screen-reader labels, contrast, and dynamic font sizes.

## Commit and Pull Request Content

Describe:

1. the problem being solved,
2. the privacy impact,
3. any change to recorded or calculated data,
4. the tests you ran, and
5. for UI changes, the screen sizes and color schemes you verified.

Use only synthetic data in screenshots and tests. Medical statements require expert
review before publication.

## Documentation Screenshots

README images live in `docs/images/`: the hero composites (`hero-light.png`,
`hero-dark.png`), single screens in `docs/images/screenshots/`, and the
`cykla-mark.svg` logo, which mirrors `src/components/ui/CyklaMark.tsx`.

When a screen changes noticeably, refresh the affected images:

- Capture the real app, not mockups. The web preview (`npm run web`) at a
  390 × 844 viewport with a device pixel ratio of 3 matches the existing images.
- Use a fresh browser profile and synthetic data only. There is no demo-data
  mode, so complete onboarding and enter invented period days in the daily editor.
- Provide matching light and dark versions of the hero composites.
- Keep files small: downscale single screens to 585 px wide and save PNGs with a
  reduced palette. Check that small accents such as the confidence badge keep
  their color.
- Update the image `alt` text in `README.md` if the content changes.
