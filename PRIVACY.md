# Privacy Model

Last updated: July 29, 2026

This document describes the intended technical privacy model of the Cykla MVP. It
does not constitute legal advice and does not replace the privacy policy required
for a published product.

## Local Processing

Period days, symptoms, mood, pain, energy, sleep, and notes are stored in a local
SQLite database on the device. Predictions are calculated locally. The MVP has no
account system, backend, cloud synchronization, advertising, or external analytics
SDK.

## Data Separation

Data recorded by the user is stored persistently. The expected period start,
prediction window, confidence level, estimated ovulation, and possible fertile
window are calculated at runtime and are neither stored as user entries nor
exported.

## Operating System Features

- Local reminders are scheduled by the operating system. Their wording is neutral
  and does not contain specific health data.
- When the app lock is enabled, the operating system handles authentication. Cykla
  stores only the enabled state in SecureStore and does not receive biometric data.
- Exports are generated locally. They can be transferred to a destination selected
  by the user only through the system share dialog.

## Export

JSON exports contain recorded daily data and basic settings. CSV exports contain a
flat table of recorded daily data. Potential spreadsheet formulas are neutralized
when CSV files are generated. Export files may contain sensitive health data and
should be stored securely.

## Deletion

“Delete all local data” removes daily data, symptoms, cycle exclusions, and settings
from the app database. It also removes reminders scheduled by Cykla and disables the
app lock.

Deleted SQLite pages may technically remain in the file system temporarily until
the operating system reuses their storage. Secure-deletion requirements and
encrypted device backups must be evaluated separately before a production release.

## Data Not Collected

In particular, the MVP does not collect or transmit:

- email addresses or account data
- advertising IDs
- contacts or location data
- health data to analytics or advertising services
- biometric characteristics

## Security Boundaries

The local SQLite database in this MVP is not additionally encrypted field by field.
Protection depends on device security, the operating system, and the optional app
lock. Before publication, the project requires at least a threat model, a data
protection impact assessment, a device-backup strategy, penetration testing, and a
review for compliance with the GDPR and medical-device law.

Security issues should never be reported publicly using real health data. Use only
synthetic data in reproducible examples.
