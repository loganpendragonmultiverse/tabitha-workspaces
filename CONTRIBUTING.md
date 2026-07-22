# Contributing

Focused bug fixes and project-aligned improvements are welcome through pull requests.

1. Open or reference an issue that explains the user-visible problem.
2. Fork the repository and create a narrow branch.
3. Install dependencies with `npm ci`.
4. Add or update tests for behavioral changes.
5. Run `npm run validate`.
6. Update the README, privacy policy, architecture notes, and changelog when behavior changes.

Pull requests must not introduce analytics, advertising, remote code, unreviewed host permissions,
unsafe `innerHTML`, fabricated compatibility claims, or external data transmission. A maintainer
reviews correctness, accessibility, browser compatibility, privacy, licensing, dependencies, and
documentation before deciding whether to merge.

Use clear, imperative commit messages. Do not include generated `.output`, coverage, browser
profiles, credentials, store signing keys, or exported personal libraries.
