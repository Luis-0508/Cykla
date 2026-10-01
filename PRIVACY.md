# Privacy Model

Last updated: September 17, 2026

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

## Export and Restore

JSON exports (format version 2) contain recorded daily data, manually excluded
cycles and basic settings. CSV exports contain a flat table of recorded daily data. Potential spreadsheet formulas are neutralized
when CSV files are generated. Export files may contain sensitive health data and
should be stored securely.

In the mobile app, a JSON export can be restored from a file the user picks. The
file is read locally and fully validated before anything changes; after explicit
confirmation it replaces all entries and exclusions in one database transaction.
Device preferences (appearance, language, reminder, app lock) are not taken from
the file. Nothing is uploaded.

Mobile exports are created in a dedicated cache directory. Preparation failures
remove partial files immediately. After sharing starts, Android and unknown native
platforms retain files until the next cold app start, even on rejection or
cancellation: target apps may still need the URI. iOS removes files after native
share completion. Startup cleanup runs before screens mount, never on normal
foreground transitions, and retries on later launches if deletion fails. This is best effort, not
secure erasure: force termination can leave a cache file until the next start or
OS cleanup. Sharing completion semantics depend on the OS/target app, especially
on Android; recipient copies and browser downloads are outside Cykla’s control.
Exports created by older versions in the documents directory are not automatically
deleted. Review and remove those old files manually if no longer needed.

## Deletion

“Delete all local data” removes daily data, symptoms, cycle exclusions, and settings
from the app database. It also removes reminders scheduled by Cykla and disables the
app lock.

Deleted SQLite pages may technically remain in the file system temporarily until
the operating system reuses their storage. Secure-deletion requirements and
encrypted device backups must be evaluated separately before a production release.

The UI is hidden as soon as a native app becomes inactive or backgrounded.
Authentication errors keep it locked. This JavaScript lifecycle protection reduces
exposure but cannot guarantee that every OS app-switcher snapshot is blank; it does
not prevent screenshots or encrypt the database. Device verification remains
required.

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

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Use
only synthetic data in reproducible examples, including private reports.
