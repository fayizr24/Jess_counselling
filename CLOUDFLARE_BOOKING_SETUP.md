# Cloudflare booking setup

Follow **START-HERE.md** for current Cloudflare deployment commands and settings.
Keep the existing D1 binding `DB`, database contents, Worker name and secrets.
All migrations 0000–0006 are included. The new Case ID/type/clearance metadata
schemas initialise automatically for existing installations. Never delete the
Case ID sequence or reference records when updating or cancelling bookings.
