# Cykla launch video — storyboard

1920×1080 · 30 fps · 41.4 s · silent (typography carries the story).

## Concept: filled and dashed

Cykla's calendar already has a visual grammar, and the whole video is built
from it:

| Mark | In the app | In the video |
| --- | --- | --- |
| **Filled circle** | a period day you recorded | something that happened — upright type |
| **Dashed ring** | the prediction window | something Cykla estimates — *italic* type with a dashed underline |
| **Soft wash** | the possible fertile window | a possibility, never a promise |

The story follows one real interaction: on day 5 of a period the Today card
still says **ESTIMATE**, because Cykla never assumes a day it was not told
about. The user logs *Light* bleeding, and the same card flips to
**RECORDED**. From there the video shows how the recorded starts become a
range (with a confidence level), how the app explains that range, and that
all of it stays on the device.

The film moves from day to night: light paper and light UI first, then the
apricot crescent of the Cykla mark wipes the frame into dark mode (the mark is
a moon), and a final reverse wipe returns to light for the end card — one full
cycle.

Positioning stays cautious: "possible window", "estimate", "range, not an
exact day", "not a method of contraception". No claim of exact ovulation,
safe days or medical certainty.

## Visual direction

- **Ground:** the app's own off-white `#F8F4EF` with a faint paper grain; at
  night the app's aubergine `#1E1420`. No gradients beyond a soft vignette.
- **Colour:** plum `#5A284F` for type, period `#9D3F56` for recorded marks,
  fertile teal `#2A9D8F` for the soft wash, apricot `#F3A97E` as the only warm
  highlight. Dark variants come straight from `src/theme/theme.ts`.
- **Type:** Instrument Serif for statements (italic = estimated), DM Sans for
  small labels and annotations. The app UI itself keeps its system font.
- **Device:** a quiet, generic phone body (no brand) around the 390×844 pt
  capture. No fake status bar: the app's own top padding is kept as captured.
- **Motion:** slow eased push-ins and pull-backs on the real footage, dashed
  strokes that draw themselves, touch ripples for taps. One signature
  transition: the crescent wipe. No bounces, no whip pans.
- **Footage:** real Cykla web build, captured frame by frame with a frozen
  virtual clock (no dropped frames, identical on every run), synthetic data
  seeded through the app's own UI.

## Shots

| # | Time | Scene | On screen | Type |
|---|------|-------|-----------|------|
| 1 | 0:00–0:05.6 | **Grammar** | On paper: a filled period-red dot appears, then a dashed ring draws itself beside it. Both glide together and resolve into the Cykla mark; wordmark rises. | "Recorded." · *"Estimated."* · "Two different things. Cykla keeps them apart." |
| 2 | 0:05.2–0:08.8 | **First run** | Phone rises with the real onboarding welcome ("A calm place for your cycle"); tap *Continue without an account*. | "No account." / "Your cycle data stays on this device. Nothing to sign up for." |
| 3 | 0:08.5–0:18.5 | **You record** | Today, Oct 5: card says ESTIMATE · Medium confidence · "in about 25 days". Tap *Log day* → daily editor ("Recorded, not calculated") → *Light*, pain 2, *Calm* → *Save entry* → back on Today, the card now reads RECORDED · Day 5. Push-in on the card flip. | "You record." / "Nothing becomes a record until you enter it. Until then, Cykla calls it an estimate." → *"From estimate to record."* |
| 4 | 0:18.1–0:24.8 | **Cykla estimates** | Calendar, October: filled days 1–5, teal wash 11–17, dashed ring 27 Oct–2 Nov. Halos drawn on the real cells (positions exported by the capture), with a legend beside the phone. | "Cykla estimates." / "A range with a confidence level — never a promised day." Footnote: "Calendar data cannot determine fertility." |
| 5 | 0:23.5–0:32.3 | **Night · explains itself** | Crescent wipe turns the same calendar dark, then the real explanation screen scrolls; on the left the recorded period days become a timeline: 29 · 27 · 30 · 28 · 29 days → dashed projection ≈ 29 → dashed range Oct 27 – Nov 2. | "Every *estimate* explains itself." / "6 recorded starts · 5 complete cycles" · "Medium confidence" |
| 6 | 0:31.9–0:36.9 | **Yours** | Dark "You & privacy", scrolled to *Your data*: Export JSON / CSV, *Delete all local data*. | "Yours to export. Yours to delete." / "No account, no ads, no analytics SDK. Health data is not transmitted." |
| 7 | 0:35.7–0:41.4 | **End card** | Reverse crescent wipe back to paper. Mark, wordmark, tagline. | "Cykla" · "A calm place for your cycle." · "Offline-first · No account · Open source · AGPL-3.0" · fine print: "Cykla records data and calculates estimates. Not a diagnosis. Not a method of contraception." |

## Capture plan

All shots are captured from the exported web build at 390×844 CSS px,
device scale 3 (1170×2532 frames), `en-US`, frozen date 2026-10-05 09:30.

| Shot | Profile | Theme | Action |
|------|---------|-------|--------|
| `onboarding` | empty | light | Welcome screen, tap *Continue without an account* |
| `record` | seeded (before) | light | Today → *Log day* → Light · Pain 2 · Calm → *Save entry* → Today |
| `calendar` | seeded (after) | light | Calendar, still; cell positions exported for callouts |
| `calendarDark` | seeded (after) | dark | Same calendar in dark mode (wipe target) |
| `explain` | seeded (after) | dark | Prediction explanation, slow scroll |
| `privacy` | seeded (after) | dark | You & privacy, starting below the language picker (its options include "Deutsch"), scroll to *Your data* |
