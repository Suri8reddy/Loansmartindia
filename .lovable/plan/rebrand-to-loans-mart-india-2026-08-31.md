# Rebrand to Loans Mart India

Replace the placeholder "LoanHub" identity and the generic Landmark icon with the uploaded Loans Mart India logo across the whole app, and remove every trace of Lovable branding from the site.

## Brand assets

- Upload the full horizontal logo (wordmark + mark) as a CDN asset for use in headers, footers, and public pages.
- Upload the square app-icon version as a CDN asset for compact spots (portal sidebars, mobile header).
- Create `public/favicon.png` from the square icon (resized to 64x64) and point the root route at it. Remove the default Lovable favicon.

## Where the logo and name appear

- Public header (`PublicNav`) — logo image replaces icon + "LoanHub" text.
- Public footer (`PublicFooter`) — logo, plus brand name in the copyright line and contact email.
- Portal shell (`PortalShell`) — square mark in the sidebar and mobile header for Admin/Team/Customer portals.
- Login, Register, Apply, Contact, Loans, Loan detail, Banker view, Home page — all "LoanHub" strings and page titles become "Loans Mart India".
- Server-side text in application/lead/password-reset functions (notification and email copy) updated to the new brand name.
- Tagline "Smart Loans. Better Tomorrows." used where a subtitle currently reads as generic filler.

## Removing Lovable visibility

- Replace the `og:image` / `twitter:image` URLs in the root route that currently point at a `lovable.app` preview screenshot with the new brand image asset.
- Turn off the Lovable badge on the published site via publish settings.
- Verify no other `lovable` references remain in user-facing markup.

## Notes

- Synthetic mobile-login emails currently use the `@mobile.loanhub.local` domain. These are internal identifiers tied to existing accounts, so they stay unchanged — renaming them would break existing logins. They are never shown to users.
