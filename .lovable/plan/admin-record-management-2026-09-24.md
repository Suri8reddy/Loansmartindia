# Admin record management

## What will be added
- Give admins an **Edit** action for employee and customer accounts, including name, email, phone, role, and active status.
- Let admins edit lead details from the lead workspace, including converted leads where appropriate.
- Add an application edit panel for customer, loan product, requested/approved/disbursed amounts, assignee, status, and internal notes.
- Add both **Archive** and **Delete permanently** actions for users, leads, and applications.
- Show archived records through an “Active / Archived / All” filter and allow admins to restore them.
- Require a clear confirmation before permanent deletion and prevent an admin from deleting their own signed-in account.

## Safety and record handling
- Archiving keeps all history and linked records but removes the item from normal active lists.
- Permanent deletion removes the selected record and its linked operational records in a controlled server-side operation.
- User deletion removes the login only after linked business records are handled; shared audit history will remain where required for accountability.
- Every privileged edit, archive, restore, and permanent deletion will verify the administrator on the server.

## Technical details
- Add archival timestamps to profiles, leads, and loan applications.
- Add protected administrator functions for profile/auth updates and destructive operations.
- Update admin lists and detail screens with edit dialogs, archive filters, restore actions, and destructive confirmations.
- Keep non-admin portals read-only with respect to these new administrator controls.
- Verify the app builds and test the main admin workflows in the preview.
