# Jess Counselling — Publishing Notes

## Sitemap (updated 10 October 2026)

`public/sitemap.xml` is included and served at `/sitemap.xml` after deployment.
It lists Home, About, Services and Contact only. Appointment and Disclaimer
remain in the website pack but are excluded from the sitemap as requested.
The sitemap uses the production domain `https://jesscounselling.online`.
Submit the deployed sitemap URL to Google Search Console and Bing Webmaster Tools.

This package contains the complete responsive website source, including:

- Home, About, Services and Contact pages
- The unlisted Appointment page at `/appointment`
- Contact and appointment email handlers
- All approved images and graphics
- Mobile and tablet layouts

## Contact and Appointment forms: Namecheap Private Email

Both forms send directly through `mail.privateemail.com:465` using
TLS and authenticated SMTP. No Resend account or API key is used by either form.
Their recipient is fixed as `hello@jesscounselling.online`; the existing HTML
email design and plain-text alternative are retained.

1. In Namecheap, create `free-consult@jesscounselling.online` and
   `appointments@jesscounselling.online` as aliases of the
   `hello@jesscounselling.online` mailbox before using those sender addresses.
2. On the Cloudflare Worker serving the website, open Settings > Variables
   and Secrets and add the following runtime settings:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `SMTP_PASSWORD` | The hello mailbox's password or application password |
| Text | `SMTP_USER` | `hello@jesscounselling.online` |
| Text (optional) | `SMTP_CONTACT_FROM_EMAIL` | `free-consult@jesscounselling.online` |
| Text (optional) | `SMTP_APPOINTMENT_FROM_EMAIL` | `appointments@jesscounselling.online` |

3. Deploy the changed settings and this updated source to the same Worker.
4. Submit both forms using test details and check the hello inbox and Spam.

The default SMTP username is hello. Contact messages use free-consult and
Appointment messages use appointments. The optional per-form sender settings
can override those defaults; each accepts a bare address without a display
name or angle brackets. The old generic SMTP_FROM_EMAIL setting is ignored.
The display name is Jess Counselling Website. Reply-To is the hello mailbox.
Preserve the existing Namecheap MX, SPF and DKIM records. Cloudflare Email
Routing is not required. Keep mailbox credentials out of source and browser code.

Each form reports success only after Namecheap accepts the complete
message for delivery. Missing credentials return 503; SMTP failures return 502.
The existing browser daily limit is applied only after success; failures can
be retried. There are no automatic email retries, to avoid duplicate messages.
Live SMTP authentication and inbox delivery still require deployment credentials
and testing in Cloudflare; automated checks use a simulated SMTP server.

Both handlers use the same hello mailbox password. The previous RESEND_API_KEY
and FORM_FROM_EMAIL settings are no longer used by either form. Their existing
HTML email layouts and plain-text alternatives are retained. Email subjects are
`[name]: New consultation request` for Contact and
`[name]: New appointment booking` for Appointment.
Appointment submission has no Contact-form daily browser restriction.

## Verification

`node --test tests/namecheap-email.test.mjs` checks TLS, authentication, alias
sending, Unicode HTML/plain-text bodies, configuration and delivery failures,
header injection protection, separate sender aliases, both form handlers,
acceptance and timeout handling without sending mail.

## Build and run

```bash
npm install
npm run build
npm start
```

Connect the domain `jesscounselling.online` to the hosting deployment. The unlisted appointment page will then be available directly at:

`https://jesscounselling.online/appointment`

The Appointment page is excluded from the visible website navigation and includes a search-engine no-index instruction.
