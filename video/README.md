# Cykla launch video

A 41-second product trailer (1920×1080, 30 fps, silent) built with
[Remotion](https://www.remotion.dev/) from real footage of the running app.
It is a separate npm project: the app does not depend on it, and the root
typecheck, lint and format scripts ignore `video/`.

See [STORYBOARD.md](STORYBOARD.md) for the concept, shot list and timings.

## Concept in one paragraph

Cykla's calendar already has a visual grammar: a **filled circle** is a day you
recorded, a **dashed ring** is something Cykla estimates, a **soft wash** is a
possibility. The video is built from that grammar. It opens with a filled dot
and a dashed ring ("Recorded." / *"Estimated."*), then follows one real
interaction: on day 5 of a period, the Today card still says ESTIMATE because
Cykla never assumes an unlogged day; the user logs *Light* bleeding and the same
card turns into RECORDED. The calendar shows how recorded days, the prediction
window and the possible fertile window stay visibly different. Then the
crescent of the Cykla mark wipes the frame into dark mode. In the dark scenes
the recorded starts become a timeline and a dashed range, beside the app's own
explanation screen. Export and deletion come next, and a reverse wipe returns
to daylight for the end card. Upright type stands for recorded facts and
*italic type with a dashed underline* stands for estimates.

## How it is made

1. **Build** (`scripts/build-app.mjs`): `expo export --platform web` of the real
   app into `video/.app`. A production build has no dev overlay or hot reload.
2. **Serve** (`scripts/serve.mjs`): a tiny static server with the cross-origin
   isolation headers Expo SQLite needs on the web.
3. **Seed** (`scripts/app-driver.mjs`, `scripts/demo-data.mjs`): Playwright
   completes onboarding and logs 39 synthetic days **through the app's own UI**
   (no database writes from outside, no app changes). Two browser profiles are
   kept: `base` (before the on-camera entry) and `after` (with it).
4. **Capture** (`scripts/capture.mjs`): each shot runs in a fresh copy of a
   profile at 390×844 CSS px, device scale 3, `en-US`. Playwright's fake clock
   freezes the date to Monday, 5 October 2026, 09:30, and advances exactly
   1/30 s per screenshot, so every run produces identical frames. Tap positions
   and calendar cell boxes are written to `public/captures/<shot>.json`.
5. **Compose** (`src/`): Remotion scenes place the frame sequences in a phone
   body, add camera moves, touch ripples, typography and motion graphics, and
   draw highlights on the exact cell positions measured during capture.

All data is synthetic (see `scripts/demo-data.mjs`). With the app's own model
it yields 5 complete cycles (29, 27, 30, 28, 29 days), medium confidence, a
prediction window of Oct 27 – Nov 2 and a possible fertile window of Oct 11–17.

## Requirements

- Node 24 and the root project's dependencies (`npm ci` in the repository root)
- Microsoft Edge (default) or Chrome for Playwright; set `BROWSER_CHANNEL=chrome`
  to use Chrome
- Optional: Python 3 with Pillow for the contact-sheet helpers

## Commands

Run these in `video/`:

```bash
npm install
npm run build:app      # export the Cykla web build to .app/
npm run capture        # seed profiles (first run) and capture all shots
npm run studio         # preview and scrub in Remotion Studio
npm run preview        # quick half-resolution render → out/preview.mp4
npm run frames         # extract review frames from out/preview.mp4 → out/frames/
npm run render         # final render → out/cykla-trailer.mp4
```

Capture options:

```bash
npm run capture -- record explain   # re-capture selected shots
npm run capture -- --reseed         # rebuild the seeded profiles first
```

`node scripts/frames.mjs out/cykla-trailer.mp4 3.5 12 20` extracts specific
timestamps; `python scripts/sheet.py` tiles `out/frames/` into contact sheets.
`node scripts/explore.mjs` screenshots every main screen in light and dark mode
(used while designing the video).

`.app/`, `.profiles/`, `public/captures/` (about 190 MB of frames) and `out/` are
generated and gitignored. The composition imports the capture metadata, so run
`npm run capture` before Studio or a render.

## Layout

```text
scripts/build-app.mjs   Exports the real web build
scripts/serve.mjs       Static server with COOP/COEP headers
scripts/demo-data.mjs   Synthetic dataset, demo date and the on-camera entry
scripts/app-driver.mjs  Playwright helpers: launch, seed through the UI, profiles
scripts/capture.mjs     Shot definitions and the frame-by-frame capture
scripts/frames.mjs      Frame extraction for review
src/Trailer.tsx         Scene order, overlaps and total length
src/scenes/             Grammar, Phones (first run, record), Estimates, Explain, Closing
src/components/         Phone, Capture (+ touches), Brand (mark, rings, type), CrescentWipe, Copy
src/theme.ts            Colours from the app, fonts, easing, phone placement
```

Capture timings in `scripts/capture.mjs` and scene timings in `src/scenes` are
coupled (for example the save tap at capture frame 240 in `record`, and the
scroll steps in `explain` that the timeline graphic follows). Change them
together.

## Adapting to a vertical cut

Every phone scene is built as a text column (`components/Copy.tsx`) plus a
`Phone` placed by `PHONE` in `src/theme.ts`. A 1080×1920 version mostly needs a
second set of positions (phone centred, copy above it) and a second
`Composition`; the captures and scene timings can be reused unchanged.
