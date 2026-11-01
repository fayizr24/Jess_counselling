# Cloudflare booking setup

Use **PUBLISHING_README.md** as the authoritative guide for this exact release. It includes Worker/assets deployment commands, existing D1 reuse, migrations, secret names, current schedules/buffers, all internal pages and acceptance checks. Historical setup notes have been replaced to avoid conflicting old rules.

Do not upload only static files. Do not reset or replace the existing production database. The prebuilt base D1 UUID is a placeholder; configure the existing production UUID with `scripts/configure-cloudflare.mjs` before publishing.
