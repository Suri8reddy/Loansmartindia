# Dependency security updates

## Changes
- Refresh the existing lockfile so transitive dependencies resolve to secure releases, without adding overrides or forcing them in `package.json`.
- Ensure `browserslist` resolves above 4.28.6, `baseline-browser-mapping` to 2.11.0 or later, `@tanstack/start-server-core` to 1.167.30 or later, `undici` to 7.29.0 or later, and `js-yaml` to 4.3.2 or later.
- Keep the installed direct dependency versions unchanged unless the package manager requires a compatible patch refresh.

## Verification
- Inspect the resolved versions in the text lockfile rather than relying on declared version ranges.
- Run the dependency security scan and report any package that cannot reach its required fixed version.
- Confirm the updated project still builds successfully.
