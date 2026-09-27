# Jess Counselling — Publishing Notes

This package contains the complete responsive website source, including:

- Home, About, Services and Contact pages
- The unlisted Appointment page at `/appointment`
- Contact and appointment email handlers
- All approved images and graphics
- Mobile and tablet layouts

## Required configuration

Before publishing, configure these server environment variables:

- `RESEND_API_KEY` — API key for the email delivery service
- `FORM_FROM_EMAIL` — verified sender, for example `Jess Counselling <forms@jesscounselling.online>`

Contact-form and appointment-form emails are sent to `hello@jesscounselling.online`.
Both HTML and plain-text email bodies are included.

## Build and run

```bash
npm install
npm run build
npm start
```

Connect the domain `jesscounselling.online` to the hosting deployment. The unlisted appointment page will then be available directly at:

`https://jesscounselling.online/appointment`

The Appointment page is excluded from the visible website navigation and includes a search-engine no-index instruction.
