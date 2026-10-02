# Roadmap

Cykla is an early MVP. The current state is summarized under
[Project status](../README.md#project-status) in the README.

The app shows the same roadmap under **You → Roadmap**, with plainer phase names
(for example “Safety and reliability” for Hardening). Its structure and phase
status live in `src/config/roadmap.ts` and its text in the `roadmap` section of
`src/i18n/locales/`; update them together with this file.

## 0.1 – Local MVP (current version)

- onboarding and goal selection
- daily tracking and monthly calendar
- transparent period prediction
- cycle statistics and manual exclusions
- reminders, app lock, exports, deletion, and dark mode
- German and English interface

## 0.2 – Hardening (in progress)

- encrypted local database and backup strategy (restoring a JSON backup is in
  review in [#24](https://github.com/Luis-0508/Cykla/pull/24))
- automated component and end-to-end tests
- comprehensive screen-reader and Dynamic Type review
- medical, legal, and privacy review (open items in [HARDENING.md](HARDENING.md))
- safe migrations and recovery tests

## 0.3 – Extended tracking (next)

- basal body temperature, ovulation tests, and pregnancy tests
- configurable symptom categories
- note search
- rule-based symptom comparisons with explainable results
- optional development mode with synthetic data that must be enabled explicitly

## Later, subject to a separate privacy decision

- end-to-end encrypted synchronization
- Apple Health and Health Connect with granular permissions
- conception and pregnancy modules
- medically reviewed educational content and an exportable consultation summary

## Not planned

- advertising or the sale of sensitive data
- paywalls for exports, deletion, or privacy features
- AI diagnoses or a purported “AI doctor”
- presenting predictions as a reliable method of contraception
