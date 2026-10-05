# Handle cancelled page requests safely

## Changes
- Recognize browser-disconnected request errors (`aborted` / `ECONNRESET`) as cancellations rather than application failures.
- Prevent cancelled requests from being promoted into the full-page 500 error screen or reported as an unhandled runtime crash.
- Preserve the existing branded recovery page for genuine server failures.

## Verification
- Reproduce an interrupted page request and confirm it no longer logs an unhandled runtime error.
- Open the home page and authenticated application page to confirm normal rendering remains intact.
