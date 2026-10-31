# Jess Counselling - Full publishing package

Prepared 31 October 2026 from saved website version 423, source commit `04a893b25bf8a6a49286e5facf2b46f0858b90fd`.

## Package contents

- Full source for Home, About, Services, Contact, Appointment and Disclaimer.
- Internal `/apt`, `/free`, `/slot-admin` and latest `/receipt` pages.
- Production Cloudflare Worker in `dist/server` and matching browser assets in `dist/client`.
- All current graphics, logo, embedded PDF fonts and PDF generators.
- D1 schema and additive migrations in `drizzle`.
- Current booking/slot management, email delivery, submission recovery and mobile/tablet styles.
- Automated tests and release verification notes.
- Refreshed Appointment, Apt and Payment Receipt sample PDFs in `acknowledgement-pdfs`, plus the sample-generation script and vendored stylesheet/license.

This is a server-backed website. Deploy the Worker and client assets together. Uploading only `dist/client` as a static Cloudflare Pages site will not provide the booking, database, email or receipt endpoints.

## Existing Cloudflare deployment

Keep your existing production D1 database, bookings and runtime secrets. This ZIP contains no live database or secret values. Do not create an empty replacement database for an existing site.

Use Node.js 22.13 or later and the declared pnpm version (11.25.0). From this package directory:

```sh
pnpm install --frozen-lockfile
node scripts/configure-cloudflare.mjs --database-id YOUR_EXISTING_D1_UUID --worker-name YOUR_EXISTING_WORKER_NAME
pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.cloudflare.json
pnpm exec wrangler deploy --config dist/server/wrangler.cloudflare.json
```

Replace the two uppercase placeholders with your actual database UUID and Worker name. Review the target before applying migrations. Supplied migrations use additive `CREATE TABLE IF NOT EXISTS`; never reset/delete existing booking or sequence tables.

The matching production build is already included. If changing source, rebuild with `pnpm run build` before running the configure script and deployment commands. Re-run the configure script after every rebuild because the base generated configuration contains a preview database placeholder.

Keep the existing custom domain `jesscounselling.online` mapped to the Worker serving this application.

## Runtime settings

On that same Worker retain/set:

| Setting | Type | Purpose |
| --- | --- | --- |
| DB | D1 binding | Existing production booking database |
| SMTP_PASSWORD | Secret | Namecheap hello mailbox password/application password |
| SMTP_USER | Text | Defaults to hello@jesscounselling.online |
| SMTP_CONTACT_FROM_EMAIL | Optional text | Defaults to free-consult@jesscounselling.online |
| SMTP_APPOINTMENT_FROM_EMAIL | Optional text | Defaults to appointments@jesscounselling.online |
| BOOKING_ADMIN_PASSWORD | Secret | Existing slot-management password, at least 20 characters |

SMTP uses `mail.privateemail.com:465` with TLS. Both sender aliases must be available in Namecheap. Recipient and Reply-To are fixed to `hello@jesscounselling.online`. Preserve the existing domain's MX/SPF/DKIM configuration. No new secret is required for `/receipt`.

## Current receipt generator

`/receipt` is excluded from sitemap/navigation and marked noindex/nofollow. It contains Receipt No., Receipt Date, Client Name, Case ID, locked Online Counselling service, Session choices matching appointments, Session Date, Payment Date, Bank Transfer/Google Pay, editable Amount Received and Transaction Reference. Dates display as `31 Oct 2026`. Session fees prefill the amount.

Generated A4 PDFs retain the MCA/LLP permanent header, Indian amount in words, Jasseela M A signatory fitted beneath the company line, and the final footer: "This is a computer-generated receipt and it acknowledges the payment."

The PDF is immediately available for preview, open, download and device sharing. The identical PDF is emailed in the background through the appointment sender with subject `Receipt: [amount]-[receipt no]`. Downloads/shares do not send another email. Background sending has no PDF-response dependency.

The four-digit passcode remains a browser-only salted hash check as requested. Three incorrect entries lock that browser until midnight India time; refresh, form clearing and reopening do not reset the count. The receipt API does not enforce the passcode on the server. This is a browser deterrent, not server access control. Do not put passcode digits into server settings for this version.

## Acknowledgements and email behavior

- `/contact` and `/free`: PDF Download and Save Snapshot.
- `/appointment` and `/apt`: Open Appointment PDF and Save Snapshot. No acknowledgement PDF is attached to appointment emails. Supplied voice recordings retain their email attachment behavior.
- Save Snapshot uses the same PNG capture/save consent flow on all four pages. It offers a native share/save menu where supported and a PNG download fallback otherwise. Save Image/Photos options depend on the device.
- Public Contact and Appointment limits reset at midnight India time. Their acknowledgement persists until midnight or 15 minutes after submission, whichever is later. Staff apt/free retain manual clearing and multiple bookings.
- Required age 18-75 on all booking forms. Case ID is reused when entered on appointment/apt or allocated from the shared persistent sequence when blank. Contact/free always allocate a Case ID.
- Optional details are hidden after a confirmed booking and remain included in the initial email; there is no later optional-details submission workflow.

## Scheduling and admin behavior retained

All booking times are India time. Default Sunday-Thursday hours are 7:30 PM-10:30 PM; Friday is 10:30 AM-12:30 PM and 7:30 PM-10:30 PM; Saturday is closed unless manually opened. Two-hour notice remains.

Current new 1-hour appointment requests use 30 minutes backward and 75 minutes forward clearance; 30-minute follow-ups use 30/30; clarification and free consult use 15/15. Exact scheduled openings and the earliest explicitly manually opened slot can waive backward clearance only; forward checks always apply. Existing bookings keep their stored clearances.

Admin retains individual checkboxes, single date selection, double-click/tap whole-day blocking/unblocking, Block/Unblock Slots range dialog, automatic refresh and Generate Booking List. Whole-day unblocking restores weekly hours without opening weekly closures. Interval Unblock only opens weekly closures, skipping booked/buffer and manually blocked slots. Existing bookings and sequence data remain in D1.

## Sitemap and device layouts

The sitemap contains Home, About, Services, Contact and Appointment. `/apt`, `/free`, `/receipt` and `/slot-admin` stay out of it. Preserve the supplied `app/globals.css` and `app/receipt/receipt.css`: they include all latest desktop/mobile/tablet refinements.

## Verification and after-deployment check

See `VERIFICATION.md` and `RELEASE-MANIFEST.json`. ZIP CRC and required-file checks were performed. No live booking or email was created for package checks. Browser/real-device QA remains unverified due to preview infrastructure timeout. The full suite rerun passed: 95 tests, including isolated local D1 integration; zero failures or skips. This does not inspect the live production database.

After deploying to your account, verify the existing D1 binding/secrets, receipt PDF and email arrival, acknowledgement PDF/Save Snapshot on your target devices, and admin availability. Creating a booking for this check reserves live slots; use deliberate test details and cancel the test booking in admin afterwards.
