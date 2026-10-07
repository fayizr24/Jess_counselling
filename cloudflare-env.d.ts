declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
    SMTP_CONTACT_FROM_EMAIL?: string;
    SMTP_APPOINTMENT_FROM_EMAIL?: string;
  }
}
