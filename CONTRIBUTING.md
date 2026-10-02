# Contributing to Cykla

Thank you for your interest. Cykla processes particularly sensitive health data,
so small, reviewable changes and data-minimizing decisions take priority.

## Local development

Setup, requirements and the full script list are in the
[README](README.md#getting-started).

```bash
npm ci
npm start
```

Before opening a pull request, run the same checks as the CI **Quality** job:

```bash
npm run typecheck
npm run lint
npm run format
npm test
npm run test:coverage
npm run doctor
npm run build:smoke
```

The launch video in [`video/`](video/README.md) is a separate npm project with its
own tooling; the root checks do not cover it.

## Workflow

Work on a feature branch, commit focused changes, and open a pull request to
`master`. Review the diff and wait for passing Actions before a squash merge; no
external reviewer is required for solo development. Do not commit local exports,
databases, secrets or `.env` files. Repository settings are described in
[docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md).

## Project conventions

- **Node and Expo:** use Node 24.12 or newer within Node 24; CI reads
  [`.node-version`](.node-version). Keep Expo and native packages compatible with
  Expo SDK 57 and run `npm run doctor` after updates.
- **Database:** add a new versioned migration instead of editing a released one.
  See [docs/DATABASE.md](docs/DATABASE.md).
- **Translations:** add user-visible copy to every catalog in
  `src/i18n/locales/` with meaningful keys and parameterized messages (use
  functions for counts so each language can apply its own plural rules). `de.ts`
  defines the shape; other languages are type-checked against it. No i18n library
  is needed; to add a language, follow the note in `src/i18n/i18n.ts`.

## Principles

- Never include real health data in logs, telemetry, error reports or test fixtures.
- Do not add network transmission without a prior architecture and privacy review.
- Keep recorded and calculated data strictly separate.
- Change prediction logic only as pure functions in `src/domain/`.
- Every prediction change requires tests and a clear explanation in the UI.
- Use neutral wording in visible text; never present estimates as certainty.
- Do not copy brands, text, screenshots, illustrations or layouts from existing
  apps.
- Verify touch targets, screen-reader labels, contrast and dynamic font sizes.

## Pull request content

The [pull request template](.github/PULL_REQUEST_TEMPLATE.md) asks for:

1. the problem being solved,
2. the privacy impact,
3. any change to recorded or calculated data,
4. the tests you ran, and
5. for UI changes, the screen sizes and color schemes you verified.

Use only synthetic data in screenshots and tests. Medical statements require expert
review before publication.

## Documentation screenshots

README images live in `docs/images/`: the hero composites (`hero-light.png`,
`hero-dark.png`), single screens in `docs/images/screenshots/`, and the
`cykla-mark.svg` logo, which mirrors `src/components/ui/CyklaMark.tsx`.

When a screen changes noticeably, refresh the affected images:

- Capture the real app, not mockups. The web preview (`npm run web`) at a
  390 × 844 viewport with a device pixel ratio of 3 matches the existing images.
- Capture the English interface (browser language `en-US`); single screens use the
  light theme.
- Use a fresh browser profile and synthetic data only. There is no demo-data
  mode, so complete onboarding and enter invented period days in the daily editor.
- Provide matching light and dark versions of the hero composites.
- Keep files small: downscale single screens to 585 px wide and save PNGs with a
  reduced palette. Check that small accents such as the confidence badge keep
  their color.
- Update the image `alt` text in `README.md` if the content changes.
