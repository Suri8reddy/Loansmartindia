# Universal document preview

## What will change
- Replace the blocked embedded PDF frame with an in-app PDF renderer.
- Keep image previews for JPG, JPEG, PNG, GIF, and WebP.
- Add readable previews for DOCX and legacy DOC files.
- Keep all files private by loading them only through authorized temporary access links.
- Preserve download access and show a clear error when a file is corrupt or unsupported.

## Technical details
- Fetch the authorized file as binary data in the browser instead of embedding its storage URL.
- Render PDF pages with PDF.js and DOCX content with Mammoth.
- Parse legacy DOC text with a browser-compatible binary Word parser or a safe local fallback.
- Revoke temporary browser object URLs when the preview closes.
- Verify PDF and image rendering in the admin application view, then confirm the app builds.
