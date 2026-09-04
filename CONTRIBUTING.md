# Contributing to Cykla

Thank you for your interest. Cykla processes particularly sensitive health data, so
small, reviewable changes and data-minimizing decisions take priority.

## Local Development

```bash
npm install
npm start
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run format
npm test
```

## Principles

- Never include health data in logs, telemetry, error reports, or test fixtures.
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
