# Jess Counselling — HTML Final Optimized

This ZIP contains the complete source code for the latest approved and published Jess Counselling website.

Included pages:

- Home (`/`)
- About (`/about`)
- Services (`/services`)
- Contact (`/contact`)
- Appointment Form Final (`/appointment`)

The Appointment page is intentionally not shown in the main website navigation. It remains available through its direct `/appointment` address.

## Before publishing

The website requires Node.js 22.13 or later and a hosting service that supports a Node.js/Cloudflare-compatible server application. A basic static-file-only hosting plan will not run the two form email handlers.

Configure these environment variables on the hosting service:

- `RESEND_API_KEY` — your Resend email-service API key
- `FORM_FROM_EMAIL` — a sender address verified in Resend, such as `Jess Counselling <forms@jesscounselling.online>`

Both the Contact and Appointment forms send their emails to `hello@jesscounselling.online`. The form emails contain both formatted HTML and plain-text versions.

## Install and build

From the extracted project folder, run:

```bash
npm install
npm run build
npm start
```

Your hosting provider may run the install and build commands automatically after you upload or connect the project.

## Important

- Do not upload `node_modules`; the hosting service installs dependencies from `package.json` and `pnpm-lock.yaml`.
- Keep the full `public/assets` folder with the source.
- Configure `jesscounselling.online` as the custom domain after deployment.
- The private Appointment page will then be available at `https://jesscounselling.online/appointment`.

Package prepared from the current **HTML Final Optimized** and **Appointment Form Final** designs on 26 September 2026.
