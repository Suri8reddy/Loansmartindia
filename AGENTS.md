# Architecture Decisions

- Private loan documents must be accessed through short-lived signed URLs; stored legacy public URLs are treated only as object-path references because the bucket remains private.
- Document previews render authorized file bytes inside the app rather than embedding storage URLs, avoiding browser frame restrictions while preserving private access.
- Public banker shares use token-gated server functions and expose approved files only through short-lived signed URLs.
- Browser-disconnected SSR requests are treated as cancellations, not application failures, because navigation can close the request socket normally.