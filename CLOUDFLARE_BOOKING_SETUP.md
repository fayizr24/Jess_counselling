# Jess Counselling: Cloudflare booking setup

Updated 10 October 2026. This guide includes the latest whole-day holiday controls, Saturday openings and submission retry rules. All booking dates and times use Indian Standard Time (Asia/Kolkata, UTC+05:30), irrespective of the visitor's device timezone.

## What is programmed

- Contact: Sunday–Thursday 7:30 PM–10:30 PM; Friday 8:00 AM–10:00 AM and 7:30 PM–10:30 PM; 15-minute start times, including both endpoints. Saturday closed by default. A booking blocks its start and the adjacent 15-minute points.
- Appointment: Sunday–Thursday 7:30 PM–10:30 PM; Friday 8:00 AM–10:00 AM and 7:30 PM–10:30 PM; 30-minute start times, including both endpoints. Saturday closed by default. A booking blocks all 15-minute points from one hour before through one hour after its start, including both boundaries. This follows the requested example; it is a window around the start, not an extra hour after the one-hour session ends.
- Both forms require a start at least two hours ahead. Exactly two hours is accepted; anything earlier is unavailable. Client display uses the server's time, and submission validates again.
- One shared D1 database. A date has 96 quarter-hour points, materialized when first booked. The management page shows all 96 points even on dates with no stored rows yet. Manual blocks create the relevant rows immediately.
- The management page retains all 96 quarter-hour points. Form dropdowns show only the default scheduled hours and explicit manual openings; closed Saturday evening hours are not listed unless opened. Booked/manually blocked starts inside the scheduled hours remain visible but disabled. Calendar dates and times are read from D1. A Saturday becomes selectable only when at least one manually opened start remains available for that form. Slots are read when a date is selected and refreshed every 15 seconds and on focus. Blocked options remain visible but disabled. Availability is rechecked atomically at submission, using an atomic conditional insert inside a transaction. A losing simultaneous request receives an unavailable-slot message.
- A proposed booking also cannot put an existing booking inside its own blocking window. Example: a Contact at 8 PM also prevents an Appointment at 8:30 PM, because that appointment's one-hour-before block would cover the existing Contact.
- Adjacent buffers may overlap if neither booking start violates the other booking's window. Cancelling one booking preserves blocks contributed by the other.
- Manual checkboxes show weekly closures as checked, including all Saturday points. Unticking explicitly opens that start time for the chosen date, including Saturday or a time outside default hours. Contact may use any opened quarter-hour start; Appointment only uses opened starts on the hour or half-hour. The two-hour rule, daily browser limits and all booking buffers still apply. Openings are date-specific; other Saturdays stay closed. Re-ticking closes the time again. Internally booking_slots.manual is 0 for weekly default, 1 for manually closed and -1 for explicitly opened. Existing tables support these values; no new database migration is required.
- Database stores booking identifiers, dates, times, type, blocks and email delivery status. It does not copy clients' names, contact details, voice recordings or counselling text into D1.
- Existing Contact daily browser restriction, voice recording, acknowledgements, Appointment PDF and Namecheap sender/recipient settings are retained. Appointment now also prevents repeated submit clicks and permits only one successful submission per Indian calendar day in the same browser, separately from the Contact daily limit. A slot-conflict rejection does not count as a successful submission: details are kept, availability refreshes, and the visitor may select another time and submit again. Both forms reset submission controls after errors. The daily restriction is browser storage-based and can be bypassed by clearing storage or using another browser/device.

## Before starting

Use the complete source in this HTML Final with Database publishing package, prepared 13 October 2026. It includes the Contact and Appointment forms, all six pages, source assets, booking management page, shared database logic, migrations and deployment helper. It supersedes the pre-database publishing ZIP of 10 October for this database-enabled version. HTML Final with Logo remains the separate older version.

The application source is unchanged from saved commit 7b7313a17eeb61aa9099924841edeb5f876cc772. This package refreshes publisher documentation. Build the source and configure your own D1 UUID and Worker secrets before deployment.

The source is a Vinext application with server-side form handlers. It must run on a Cloudflare Worker; uploading only static HTML or client assets to Pages will not enable the booking database or SMTP. If your publisher already builds this application on Workers, update that same Worker. If you currently use a static Pages deployment, test the Worker first and then move the custom domain as explained below.

Install a supported current Node.js (the source specifies Node >=22.13), and use the package manager/version declared in package.json. Do not put passwords in source files, HTML, Git or chat messages.

## 1. Create the D1 database

1. Sign in at https://dash.cloudflare.com with the account hosting Jess Counselling.
2. Open **Storage & databases → D1** (the menu may say **D1 SQL database**).
3. Click **Create database**.
4. Name it **jess-bookings** and create it.
5. Open it and copy its **Database ID**, a UUID. Keep this for Step 3.

The CLI equivalent, if your publisher prefers it:

```bash
npx wrangler login
npx wrangler d1 create jess-bookings
```

Use the returned UUID. This database name is not a secret.

## 2. Install and build the updated source

Open a terminal in the revised source folder. Use the existing publisher's dependency-install workflow or the declared pnpm version, then:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

The build creates `dist/server/index.js`, the client assets and `dist/server/wrangler.json`. Do not deploy only `dist/client`.

## 3. Set the real database binding

Run this, replacing `YOUR-D1-UUID` with the copied Database ID. For an existing Worker, replace `jess-counselling` with its exact existing Worker name.

```bash
node scripts/configure-cloudflare.mjs --database-id YOUR-D1-UUID --worker-name jess-counselling
```

This generates `dist/server/wrangler.cloudflare.json` and sets:

- Worker name: your chosen/existing name.
- Binding name: **DB** (uppercase, required by the program).
- Database name: **jess-bookings**.
- Database ID: your actual UUID.
- Migrations folder: the supplied `drizzle` folder.

Run this script again after every build, because a build regenerates the base configuration. The placeholder UUID in the base build is for local/managed preview; it is not your production database.

## 4. Apply the database schema

```bash
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.cloudflare.json
```

Confirm the prompt after verifying that the target is your new `jess-bookings` database. This creates `booking_slots`, `bookings`, `booking_blocks`, the required indexes. The SQL is in `drizzle/0000_new_mysterio.sql`.

Apply migrations before deploying the code. Keep the migration files; Wrangler tracks applied migrations so later runs do not recreate existing tables. Do not run a destructive reset.

## 5. Deploy and set the management password

```bash
npx wrangler deploy --config dist/server/wrangler.cloudflare.json
npx wrangler secret put BOOKING_ADMIN_PASSWORD --config dist/server/wrangler.cloudflare.json
```

At the secret prompt, enter a unique strong management password of at least **20 characters**, preferably generated by a password manager. Password entry must be through the prompt. The admin API remains locked if the secret is missing or too short.

Keep the existing Namecheap settings on this Worker. If this is a new Worker, add the existing SMTP password through the secret prompt:

```bash
npx wrangler secret put SMTP_PASSWORD --config dist/server/wrangler.cloudflare.json
```

Default SMTP user is `hello@jesscounselling.online`. Default Contact sender is `free-consult@jesscounselling.online`; default Appointment sender is `appointments@jesscounselling.online`; recipient and Reply-To are `hello@jesscounselling.online`. Both use `mail.privateemail.com:465` with TLS. Ensure the two sender addresses are valid Namecheap aliases/mailboxes for the authenticated account. Optional settings are `SMTP_USER`, `SMTP_CONTACT_FROM_EMAIL` and `SMTP_APPOINTMENT_FROM_EMAIL`. Leave MX, SPF and DKIM unchanged. Reapply any existing optional SMTP overrides to a new Worker if they are in use. No password is embedded in the downloaded source.

You can also add the management secret in **Workers & Pages → your Worker → Settings → Variables and Secrets → Add → Secret**, with the exact name `BOOKING_ADMIN_PASSWORD`.

## 6. Verify the binding and domain

1. Open **Workers & Pages → your Worker → Bindings**.
2. Confirm the D1 binding named **DB** points to **jess-bookings**.
3. Test on the Worker deployment URL first.
4. If updating the existing Worker, retain its current custom-domain configuration.
5. If moving from static Pages, after testing, remove the existing `jesscounselling.online` custom-domain attachment from Pages, then add that same domain to the new Worker under **Settings → Domains & Routes → Add → Custom domain**. Follow Cloudflare's DNS prompts; an existing conflicting DNS record/attachment may need to be removed for the Worker domain. Coordinate the switch with your publisher to limit interruption.
6. Verify HTTPS, all six pages, both forms and `/sitemap.xml` after switching.

## 7. Use the booking management page

The checkbox interface is a custom page on your website backed by Cloudflare D1. Cloudflare's own D1 Console provides SQL inspection; it does not provide this booking checkbox interface.

Open `https://jesscounselling.online/slot-admin` after deployment. Before the domain switch, open the test Worker URL followed by `/slot-admin`.

1. Enter the management password.
2. Choose a date in Indian time.
3. Click **Load / refresh slots**. The page displays the month's day controls and all 96 quarter-hour points for the selected date.

### Block a holiday or travel day

1. In **Block whole days**, click the date itself. This blocks every start time on that date for both forms.
2. Click that date again to remove its whole-day block.
3. To manage another month, choose a date in that month and load it.

The calendar label **No block** means there is no whole-day override; the usual weekly schedule still applies. Saturdays remain closed unless individual slots have been explicitly opened.

A whole-day block takes priority over individual openings. Both public calendars grey out the date, and the server rejects a submission for that date even if the visitor opened the form before you blocked it. Individual slot checkboxes are locked while the whole-day block is active.

**Existing bookings are retained.** Blocking a day does not cancel bookings or send notifications. Contact booked clients separately if they need to reschedule. Removing the day block restores the underlying weekly schedule, individual manual settings and existing booking buffers. It does not erase any of them.

### Block or release individual time slots

- A checked box means blocked. Tick an empty box to close that time for both forms.
- Untick a weekly closure or manual block to explicitly open that time on that date. This can open a Saturday or a time outside normal hours.
- Contact accepts opened quarter-hour starts. Appointment accepts only opened hour or half-hour starts. Opening 8:15 PM therefore creates a Contact option, but not an Appointment option.
- The two-hour rule and existing booking buffers still apply to manual openings.
- To enable a Saturday, remove any whole-day override first, then untick the desired individual starts. Opening one Saturday does not change other Saturdays.
- Unticking a booking-controlled block prompts you to cancel the relevant booking(s). Cancellation releases each cancelled booking's complete automatic buffer and preserves other bookings and separate manual blocks.
- Cancellation does not send an email. Contact the client separately.

Review the email status column: `sent` means SMTP acceptance, `failed` means delivery could not be confirmed, and `pending` means it is not yet confirmed. SMTP acceptance does not guarantee inbox delivery. D1 intentionally does not store client contact details; use the original form email where available.

Click **Sign out** when finished. The management password is held only in page memory and cleared on sign-out or reload. All management reads and writes require server-side authentication; knowing the page URL is insufficient.

### How manual settings are stored

| Record | Meaning |
| --- | --- |
| Ordinary slot, `manual = 0` | Follow the weekly schedule |
| Ordinary slot, `manual = 1` | Manually closed |
| Ordinary slot, `manual = -1` | Explicitly opened |
| Reserved day row, `minute = -1`, `manual = 1` | Whole day blocked |
| Reserved day row, `minute = -1`, `manual = 0` | No whole-day override |

The day row is separate from the 96 ordinary slot rows. These settings use the existing schema; no extra migration is required specifically for Saturday openings or whole-day blocking. A first deployment still requires Step 4.

## 8. Acceptance checks before using real bookings

Use test details and dates at least two hours ahead:

1. Reserve a Contact at 8:00 PM on an allowed weekday. Check 7:45, 8:00 and 8:15 are disabled from another browser/device.
2. Reserve an Appointment at 8:00 PM on another date. Verify 7:00 through 9:00 PM in 15-minute points are checked in management, and the relevant Appointment options are disabled.
3. Test an Appointment whose buffer reaches Contact hours. Both forms must share those blocks.
4. Manually block and release a slot, then refresh the public form. On a Saturday, untick an 8:00 PM slot and verify both calendars make that date selectable. Re-tick it and verify both calendars grey it out again. Unticking only 8:15 PM opens a Contact start but does not create an Appointment start. Verify Friday morning slots and Sunday evening slots.
5. Submit the same available time simultaneously from two browsers. Only one should reserve it.
6. Verify earlier-than-two-hour times are disabled on both forms and cannot be submitted by altering the request.
7. Check Contact and Appointment emails arrive in the hello inbox, including voice recording if used. Open the Appointment PDF.
8. Cancel test bookings through management, then check the times become available unless another block applies.
9. Block a whole day by clicking its calendar date. Confirm both public calendars grey it out, individual management checkboxes are locked, and a previously opened form cannot reserve it. Existing bookings must remain recorded. Click the date again and confirm the previous schedule, manual settings and booking buffers return. Repeat on a Saturday: removing the day block alone must not open Saturday hours.
10. Submit a successful Contact, then refresh or reopen the same browser: another Contact submission that Indian calendar day must be blocked. Repeat independently for Appointment. One successful Contact and one successful Appointment are allowed, because the limits are separate. Verify the next Indian day resets each limit.
11. Open the same available slot in two browsers. Reserve it in one, then submit the stale selection in the other. The second form must display “That time has just become unavailable. Please select another slot.” It must retain the entered details, refresh availability and allow selection and submission of another slot. This rejection must not consume the daily allowance. Check both forms.
12. Check desktop, mobile and tablet. Existing page CSS and artwork were not changed, but live device testing is still needed.

## 9. Updating an existing deployment later

Use the same Cloudflare account, existing Worker name and existing D1 UUID. Skip database creation: creating a different database would leave previous bookings behind.

Run Steps 2–5 with the updated source: install, build, regenerate `wrangler.cloudflare.json`, apply pending migrations and deploy. Regenerate the configuration after every build. Keep existing secrets and SMTP overrides; do not replace them unless changing their values intentionally. Keep the existing domain binding. Then run the acceptance checks relevant to the update.

## Booking versus email success

A slot is reserved immediately before email delivery. Appointment reservation still does not constitute payment confirmation. If SMTP fails or times out after reservation, the form shows that the slot is reserved but asks the visitor to contact you directly. The reservation is retained to prevent uncertain email delivery from opening the slot to another client. The same submission reference cannot create a second booking or send a second email. Review failed/pending notifications in management; release the reservation manually if required.

## Submission limits and safe retries

Each browser allows one successful Contact submission and one successful Appointment submission per Indian calendar day. These are separate limits, retained through refresh/reopening using browser storage. They reset at Indian midnight. Supported browsers also coordinate same-form submissions between tabs.

A rejected slot conflict or validation error does not consume the daily allowance. The visitor can correct the selection and submit again. A successfully reserved slot does consume the allowance even if email delivery or Appointment PDF generation subsequently fails. Retrying the same submission reference does not create another booking or resend email.

This is a browser restriction, not an identity-based server restriction. Another device/browser, private browsing or clearing storage can bypass it; persistence is limited if browser storage is unavailable.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Management login unavailable | Ensure `BOOKING_ADMIN_PASSWORD` is set on the correct Worker and has at least 20 characters. |
| Availability fails to load | Verify uppercase `DB`, the correct D1 UUID and applied migrations. Check Worker logs for the underlying error. |
| Old interface after an update | Confirm the revised source was built and deployed, and the domain points to the intended Worker. |
| Saturday remains grey | Remove any whole-day block and open a usable start for that form; it must be at least two hours ahead and free of booking conflicts. |
| A released slot remains blocked | Check other bookings, individual blocks, whole-day overrides and the two-hour rule. |
| Slot-conflict message | Select another available slot and retry; the failed attempt does not use the daily allowance. |
| Reservation saved but no email | Check notification status, SMTP secret/settings and Namecheap aliases. Do not assume the slot is free or submit a duplicate booking. |

## Database inspection on Cloudflare

In **D1 → jess-bookings → Console**, you can inspect records, for example:

```sql
SELECT date, minute, kind, active, notification, id
FROM bookings ORDER BY date, minute;
```

`minute` is minutes after midnight in Indian time; 1200 means 8:00 PM. Use the checkbox page for ordinary blocking, release and cancellation. Direct SQL edits can bypass application rules.

## Verification completed

TypeScript validation and production build passed. Integration checks used local Cloudflare D1/Miniflare with the real schema and atomic conditional insert and covered both booking examples, shared blocking, concurrency, idempotency, the new weekly schedule, Friday morning slots, Saturday checkbox opening/closing, midnight buffer carryover, schedule validation, management authentication, whole-day blocking/reopening, manual release, overlapping blocks, daily submission limits, conflict retries and email-failure reservation handling. Fourteen simulated SMTP checks also passed. No real booking email was sent. The private managed preview was deployed successfully. Deployment into your external Cloudflare account, its D1 binding, real Namecheap delivery and actual device UI still require the acceptance checks above.

Official references:

- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/d1/wrangler-commands/
- https://developers.cloudflare.com/workers/wrangler/commands/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/