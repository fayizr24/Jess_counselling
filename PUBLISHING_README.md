# Jess Counselling — HTML Final with Database

Complete publishing source package prepared 13 October 2026.

Start with **Jess-Counselling-Cloudflare-Booking-Setup.md**. This replaces the previous publishing instructions for this database version.

## Included

- Home, About, Services, Contact, Appointment and Counselling Disclaimer pages.
- Approved responsive styles, logo, artwork, voice recorder and Appointment PDF code.
- Contact and Appointment server handlers using the existing Namecheap SMTP setup.
- Shared Cloudflare D1 scheduling, date and slot availability endpoints, atomic booking checks and conflict retry handling.
- Password-protected `/slot-admin`, individual slot checkboxes, Saturday openings and whole-day holiday/travel blocking.
- Database schema/migrations in `drizzle/` and configuration helper in `scripts/configure-cloudflare.mjs`.
- Source dependencies/lockfile, build configuration and automated tests.
- `public/sitemap.xml` for Home, About, Services and Contact. Appointment and Disclaimer are included in the website but excluded from the sitemap.

## Publisher must configure

1. Use Node >=22.13 and the declared pnpm version in package.json. Install and build the complete source.
2. Create/select `jess-bookings` in D1 and obtain its real UUID.
3. Run the configuration helper after building; use the existing Worker name if updating one.
4. Apply the supplied migrations remotely with the generated configuration; deploy the Worker.
5. Set `BOOKING_ADMIN_PASSWORD` (at least 20 characters) and `SMTP_PASSWORD` as Worker secrets. Retain existing SMTP overrides and Namecheap sender aliases.
6. Verify the uppercase `DB` binding, test the Worker URL, then attach the production domain and complete the acceptance checks in the guide.

This is a source package for a Cloudflare Worker, not a static-only Pages upload. Both forms depend on the database. Do not deploy only client assets. No passwords or client booking data are included.

## Verified for this package

All 17 automated tests, TypeScript validation and production build passed on 13 October 2026. Live Namecheap delivery, the publisher's Cloudflare account and device/browser testing must be verified after deployment. No external deployment was performed while preparing this ZIP.

## Source identity

Saved version: HTML Final with Database.
Source commit: `7b7313a17eeb61aa9099924841edeb5f876cc772`.
The older HTML Final with Logo package remains unchanged.
