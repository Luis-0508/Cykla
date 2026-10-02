# Security

Cykla is an early MVP that processes sensitive health information. The data
protection model and its known limits are described in [PRIVACY.md](PRIVACY.md)
and [docs/HARDENING.md](docs/HARDENING.md). The app lock is not database
encryption.

## Supported versions

Security fixes target the current development version on `master`; older
snapshots are not maintained separately.

## Reporting a vulnerability

Do **not** open a public GitHub issue containing vulnerability details. Never attach
real health data, production databases, personal exports, credentials or personal
screenshots. Use **synthetic data only**, including in private reports.

If this repository's **Security → Report a vulnerability** button is available,
use GitHub's private vulnerability reporting flow. Its availability must be checked;
this file does not enable it.

If no private reporting channel is available, ask the maintainer to establish one
without disclosing the vulnerability. A channel-setup request may say only that a
private security contact is needed; it must contain no exploit details or data.
Wait for a private channel before submitting the report. No security email address
is currently published by this project.

A useful private report includes:

- affected commit or app version and OS version;
- expected and observed behavior;
- minimal reproduction using invented records;
- potential impact and an optional proposed fix.

Avoid attaching raw logs or databases. Review even synthetic attachments for
identifiers and secrets. Coordinate disclosure with the maintainer after a fix is
available; no response-time guarantee is currently offered.

## Maintainer setup

The repository is public. Enable private vulnerability reporting and verify the
reporting button, or publish a monitored private contact in this file. Enable
Dependabot alerts and available secret scanning and push protection. See
[docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md) for the remaining settings.
