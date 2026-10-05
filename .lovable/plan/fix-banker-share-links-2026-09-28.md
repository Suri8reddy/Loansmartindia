# Fix banker share links

## What will change
- Make newly generated banker links validate reliably without requiring a signed-in account.
- Show the Loans Mart India logo, customer contact details, loan summary, and every approved document in a clean mobile-friendly page.
- Serve each private document through a fresh, short-lived secure link tied to the active banker token.
- Show a clear technical error separately from a genuinely expired or revoked link.

## Technical details
- Move public token validation and document-link creation into a server function with strict UUID validation.
- Read only the shared application/customer fields and approved documents.
- Keep the storage bucket private and return expiring signed document URLs.
- Update the banker page to use typed data, document preview/download actions, complete metadata, and responsive layout.
- Verify the currently active link and its documents in a signed-out browser session.
