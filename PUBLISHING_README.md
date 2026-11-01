# Jess Counselling - complete publishing package

Prepared 31 October 2026 (Bahrain). This is the authoritative current handover guide.

Source commit: `fd80e46e900b84e248f86e91f110002a02aafc34`
Saved version: `appgprj_6ab16d86fa4c81918403d1660fd96a32~appgver_a353a790a778819189d569120ebcf8fb`
Successful preview deployment: `appgdep_6ae6523191488191b674a24f56b560db`
Preview: https://jess-counselling.rahmanmujeebu.chatgpt.site
External domain: https://jesscounselling.online

## Contents and deployment model

Includes full editable application source, all public assets, the matching prebuilt `dist/server` Worker and `dist/client` browser assets, dependency lockfile, seven additive SQL migrations, tests, verification logs, file hashes, and freshly generated Appointment, Apt and Payment Receipt sample PDFs. Mobile/tablet CSS and phone-only appointment description line breaks are preserved byte-for-byte from this source.

**Deploy the Worker and assets together. A static-only Cloudflare Pages upload will not provide booking APIs, D1, SMTP or receipt generation.** Reuse the existing production Worker and D1 database. No real database rows, credentials, local dependencies or private runtime files are included.

## Publishing steps

1. Back up the existing production D1 database using the publisher's normal backup procedure. Keep its existing data, Worker name, custom domain and secrets.
2. For the supplied prebuilt version, use `dist/server/index.js` and `dist/client` together. To rebuild instead, use Node 22.13 or newer and the pnpm version declared in package.json: `pnpm install --frozen-lockfile`, then `pnpm run build`. Do not mix old and new compiled bundles.
3. Configure the exact EXISTING production D1 UUID and Worker name:

   `node scripts/configure-cloudflare.mjs --database-id YOUR-EXISTING-D1-UUID --worker-name YOUR-EXISTING-WORKER-NAME`

   This writes `dist/server/wrangler.cloudflare.json`. Review it before deployment. The base `wrangler.json` contains a placeholder D1 UUID; it is not production configuration. Runtime binding must be `DB`. Run the configuration script again after any rebuild.
4. Apply only outstanding additive migrations to the existing database:

   `npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.cloudflare.json`

   Retain the existing migration history. Do not reset, drop or replace the database. All migrations 0000-0006 are supplied. Runtime helpers also create supplemental tables idempotently.
5. Preserve secrets `BOOKING_ADMIN_PASSWORD` and `SMTP_PASSWORD` on the existing Worker. If absent, configure them using Wrangler's secret prompt or Cloudflare settings; never embed them in source. Defaults: SMTP login/recipient `hello@jesscounselling.online`, Contact sender `free-consult@jesscounselling.online`, Appointment/receipt sender `appointments@jesscounselling.online`, TLS SMTP `mail.privateemail.com:465`. Retain any current `SMTP_USER`, `SMTP_CONTACT_FROM_EMAIL`, `SMTP_APPOINTMENT_FROM_EMAIL` overrides. Keep Namecheap MX/SPF/DKIM and aliases.
6. Deploy:

   `npx wrangler deploy --config dist/server/wrangler.cloudflare.json`

   Check the target account/Worker and D1 binding first. Keep the current custom domain mapping and audience. This ZIP does not deploy or change any live database by itself.
7. Verify the routes and publisher acceptance checks below on the target Worker/domain. In particular, confirm its resource limits and live SMTP acceptance; local tests cannot verify the publisher's account configuration.

## Routes and form attributes

| Route | Included behaviour |
|---|---|
| `/`, `/about`, `/services`, `/disclaimer` | Current content, official logo, responsive layouts; Health and Mental Health Matters is last in Disclaimer |
| `/contact` | Public free consultation; required age 18-75, contact/date/time, optional topic/text/audio, generated Case ID, one successful submission per browser per Indian day |
| `/free` | Internal free-consult form sharing Contact features; no public daily lock; repeated bookings, in-flight/duplicate protection and staff manual acknowledgement clearing retained; unlisted/noindex |
| `/appointment` | Public appointment form; required age, optional existing Case ID or automatic generation, four appointment types/fees, optional details/audio, one successful submission per browser per Indian day |
| `/apt` | Internal appointment form; same types, fees, age, Case ID and PDF; multiple bookings with manual acknowledgement clearing; unlisted/noindex |
| `/receipt` | Unlisted/noindex payment receipt generator with current PDF, background email, passcode and midnight lock rules |
| `/slot-admin` | Password-protected slot APIs, calendar, individual checkboxes, Block/Unblock range dialog, completion alerts, three-column Time / Type / Case ID generated booking list |

API routes: `/api/slots`, `/api/consultation`, `/api/appointment`, `/api/booking-status`, `/api/slot-admin`, `/api/receipt`.

Public Contact/Appointment daily limits reset at Indian midnight. Acknowledgements remain until the later of the next Indian midnight or 15 minutes after submission. Staff free/apt retain manual clearing. Original double-click protection, request-key idempotency and bounded automatic interrupted-submission recovery remain; no visible Check Booking Status button on any of the four booking forms. Saved-booking/email-failure warnings and Case ID acknowledgements remain even if sending fails or is uncertain. Recovery does not resend booking emails.

## Schedule, clearance and admin rules

All booking times are Indian time. Defaults: Sun-Thu 7:30 PM-10:30 PM; Friday 10:30 AM-12:30 PM and 7:30 PM-10:30 PM; Saturday closed unless manually opened. Two-hour advance rule; Contact starts every 15 minutes, Appointment every 30 minutes. Shared slot blocks use a 15-minute grid.

| Booking type | Backward clearance | Forward clearance | Fee |
|---|---:|---:|---:|
| Free Consult | 15 min | 15 min | Free |
| New Appointment (1 hour session) | 30 min | 75 min | INR 990 |
| Follow-up (1 hour session) | 30 min | 75 min | INR 750 |
| Follow-up (30 min session) | 30 min | 30 min | INR 450 |
| Follow-up (Clarifications - 10 min) | 15 min | 15 min | Free |

At a scheduled daily-window opening or the earliest manually opened slot, backward clearance is waived if forward clearance is available. Forward checks always apply, including cross-midnight closures. Existing bookings retain their stored clearance values and legacy type compatibility. Boundary/conflict checks and reservation/reference allocation remain atomic.

Admin: single-click/tap selects a date; double-click/tap toggles whole-day blocking. Whole-day block retains bookings and warns once per distinct booking; individual openings can override the day closure. Whole-day unblock restores normal weekly hours without opening Saturday/outside-hours closures, and retains bookings/buffers/manual blocks. Range Block/Unblock uses inclusive From/To selectors. Block warns for booking/buffer occupied points, allows abort and blocks open points only. Unblock skips bookings/buffers/manual blocks and opens weekly-schedule closures only. Neither range action cancels bookings or sends email. Successful ranges show a dismissible completion alert and slot counts. Individual checkbox cancellation retains its separate explicit warning. Auto-refresh remains 10 seconds. Generated booking list reads appointment type and Case ID from D1; missing legacy Case IDs display an em dash.

## Email, PDF and Snapshot rules

All four booking notification emails use consistent olive-green data-section banners, including Client, Age and Case ID.

- Appointment/apt subject: `[name]: Appointment`; with validated audio: `[name]: Appointment 🔴 (Voice attached)`.
- Contact/free subject: `[name]: Free Consult`; with validated audio: `[name]: Free Consult 🔴 (Voice attached)`.
- Any legacy later optional-details email follows the same Free Consult subject rule, retaining the existing-booking body and authenticated followup protections.
- Booking emails contain HTML and plain text and attach valid audio when provided. **No server-generated acknowledgement PDF is attached.**
- Contact/free acknowledgement has View PDF (same-tab browser PDF with Back navigation) and Save Snapshot. Appointment/apt have Open Appointment PDF and Save Snapshot. Browser PDF saving/sharing depends on device/browser support. Snapshot keeps consent, native picture-share where supported and explicit PNG fallback.
- Appointment/apt PDF includes the compact alternating grey/white Appointment Type / Fee table with current labels/fees. Their on-page type table matches contact-method fonts, with bracketed descriptions on a new line on phones only (max-width 600px).

## Receipt generator

Current receipt PDF header, fields, dates, payment method/amount, amount in words, authorisation/footer and current session options are included. Identical PDF bytes are emailed in a protected after-response task; PDF generation/availability does not wait for email, and viewing/downloading/sharing does not resend it. Subject: `Receipt: [amount]-[receipt no]`.

Prompt: **Enter your passcode to generate this receipt.** Existing masked four-digit verification, salted digest, three failed attempts per Indian day, persisted browser lock across tabs/refresh, and midnight unlock are preserved. This is a browser deterrent, not server authentication; `/api/receipt` validates input and origin but does not verify the passcode. No plain passcode digits are documented in this package. Background sending failures are logged without confidential form details.

## D1 storage

Includes booking date/time/kind, internal IDs/request keys, active status, created timestamp, notification state, slot openings/closures, booking buffers, Case IDs/sequence numbers, appointment types, forward-clearance metadata and legacy optional-followup delivery state/expiry. Full client names, ages, contact methods, phone numbers/email addresses, counselling topics/text and audio are NOT stored by these D1 booking paths. Generated Case IDs contain a name-derived two-letter code. Some acknowledgement/contact details persist in the submitter's browser for display/recovery, separately from D1.

## Verification and target acceptance

Read VERIFICATION.md and LOCAL_TEST_RESULTS.txt. All 96 tests passed, including real local Miniflare D1 transactions/concurrency, references, buffers, admin actions, recovery, SMTP/MIME simulations, receipt/passcode and acknowledgement exports. All 28 public files and current application/CSS source are checked against the selected source; compiled build is copied from its successful deployment archive. Fresh sample PDFs were rendered and inspected. Hash manifests and ZIP CRC checks are included.

No live production D1 mutations, real bookings or live email were used for verification. This is not real-device/browser QA or proof of the external publisher's runtime limits. After deployment, check mobile/tablet layout, slot availability, admin range alerts/list Case ID, each form's acknowledgement/PDF/Snapshot, no-voice/voice subjects and inbox delivery, and receipt passcode/PDF/background email. Use an isolated test environment where practical; avoid disrupting real bookings.
