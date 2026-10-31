# Current Cloudflare publishing setup

The current instructions are consolidated in **PUBLISHING_README.md**.

Use the existing production Worker, D1 database and SMTP/admin settings. Keep the existing bookings and Case ID sequence. Deploy `dist/server` and its configured `dist/client` assets together. Regenerate `dist/server/wrangler.cloudflare.json` using `scripts/configure-cloudflare.mjs` with your real existing D1 UUID and Worker name before applying additive migrations and deploying.

This document replaces historical setup notes whose scheduling and email examples predated the current saved source.
