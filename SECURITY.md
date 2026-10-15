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

## Build-tool dependency review — October 15, 2026

Version 1.17.1 updates sharp from 0.35.4 to 0.35.5 for
[GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
(librsvg CVE-2026-96889), and source-map-js from 1.2.1 to 1.2.2 for
[GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
(CVE-2026-93749, indexed-source-map denial of service). Sharp generates the
project's icons; source-map-js is used by the build and lint toolchain.

Node-forge 1.4.0 remains a development-only transitive dependency of
web-ext → @devicefarmer/adbkit. Its RSA signature-verification advisory,
[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
(CVE-2026-85393), has no patched version listed as of this review. The latest
published node-forge is 1.4.0; the latest web-ext still includes that dependency
path. The project uses web-ext for Firefox linting, not Android debugging.

All three packages are marked development-only in the lockfile. They are not
runtime dependencies of the extension; browser ZIPs contain bundled application
assets, not this Node development toolchain. The shipped-dependency audit and the
full development audit are separate. Other development advisories remain, so a
clean full audit is not claimed. Run builds with trusted project inputs in an
isolated environment. An advisory or dependency alert alone does not establish
compromise or exploitability of a shipped extension.
