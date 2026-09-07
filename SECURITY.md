# Security policy

## Supported versions

Security updates are provided for the latest published major version.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature. Do not open a public issue for a vulnerability
that could expose browsing data, bypass browser permission boundaries, execute untrusted content, or
corrupt imported libraries.

Include the affected version and browser, reproduction steps, expected impact, and any proposed
mitigation. Please do not include real browsing histories, exported libraries, credentials, or other
personal data in a report.

The maintainer will acknowledge a reproducible report, assess severity, prepare a private fix when
appropriate, and publish accurate release notes after users can update safely.

## Build-tool dependency review — September 7, 2026

The 1.13 build pins fast-uri 3.1.6 to address the four newly reported URI parsing advisories. The development-only Firefox addon linter still brings image-size 2.0.2; its ICNS/JXL/HEIF denial-of-service advisories have no published patched version. These dependencies are not included in either browser extension ZIP. Do not lint untrusted image inputs outside an isolated, time-bounded build. The shipped-dependency audit is separate from the full development-tool audit; the latter is not claimed clean.
