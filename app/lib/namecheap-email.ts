import { env } from "cloudflare:workers";
import { connect } from "cloudflare:sockets";

const RECIPIENT = "hello@jesscounselling.online";
const SMTP_HOST = "mail.privateemail.com";
const SMTP_PORT = 465;
const TIMEOUT_MS = 25000;

export class EmailConfigurationError extends Error {}

function mailbox(value: string): string {
  // These addresses are server configuration, never client form fields.
  if (!/^[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+@jesscounselling\.online$/i.test(value)) {
    throw new EmailConfigurationError("Invalid email configuration");
  }
  return value;
}

type EmailForm = "consultation" | "appointment";

export function getNamecheapConfiguration(form: EmailForm = "consultation") {
  const user = String(env.SMTP_USER || "hello@jesscounselling.online").trim();
  const password = typeof env.SMTP_PASSWORD === "string" ? env.SMTP_PASSWORD : "";
  const from = String(form === "appointment"
    ? env.SMTP_APPOINTMENT_FROM_EMAIL || "appointments@jesscounselling.online"
    : env.SMTP_CONTACT_FROM_EMAIL || "free-consult@jesscounselling.online").trim();
  if (!password || /[\r\n\0]/.test(user + password)) {
    throw new EmailConfigurationError("Namecheap email credentials are missing or invalid");
  }
  return { user: mailbox(user), password, from: mailbox(from) };
}

function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function body(value: string): string {
  return base64(value).match(/.{1,76}/g)?.join("\r\n") || "";
}

function subjectHeader(value: string): string {
  // Encode Unicode and prevent form input becoming additional mail headers.
  const clean = value.replace(/[\r\n\0]/g, " ").slice(0, 180);
  const chunks: string[] = [];
  let chunk = "";
  for (const character of clean) {
    if (new TextEncoder().encode(chunk + character).length > 42) {
      chunks.push(`=?UTF-8?B?${base64(chunk)}?=`);
      chunk = "";
    }
    chunk += character;
  }
  if (chunk) chunks.push(`=?UTF-8?B?${base64(chunk)}?=`);
  return chunks.join("\r\n ");
}

export type EmailAttachment = {filename:string;contentType:string;base64:string};

export function mimeMessage(from: string, subject: string, text: string, html: string, attachment?: EmailAttachment): string {
  const boundary = `jess_${crypto.randomUUID().replaceAll("-", "")}`;
  const alternative = [
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    body(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    body(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const headers = [
    `From: Jess Counselling Website <${from}>`, `To: ${RECIPIENT}`, `Reply-To: ${RECIPIENT}`,
    `Subject: ${subjectHeader(subject)}`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@jesscounselling.online>`, "MIME-Version: 1.0",
  ];
  if (!attachment) return [...headers,alternative].join("\r\n");
  const mixed = `jess_mixed_${crypto.randomUUID().replaceAll("-", "")}`;
  // Only fixed filenames and audio MIME types reach this boundary.
  const filename = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return [...headers, `Content-Type: multipart/mixed; boundary="${mixed}"`, "",
    `--${mixed}`, alternative, `--${mixed}`,
    `Content-Type: ${attachment.contentType}; name="${filename}"`,
    `Content-Disposition: attachment; filename="${filename}"`,
    "Content-Transfer-Encoding: base64", "", attachment.base64.match(/.{1,76}/g)?.join("\r\n") || "",
    `--${mixed}--`, "",
  ].join("\r\n");
}

/** Send only after TLS authentication; succeed only after SMTP accepts DATA. */
export async function sendNamecheapEmail(message: { subject: string; text: string; html: string; attachment?: EmailAttachment }, form: EmailForm = "consultation") {
  const configuration = getNamecheapConfiguration(form);
  const socket = connect({ hostname: SMTP_HOST, port: SMTP_PORT }, { secureTransport: "on", allowHalfOpen: false });
  // Consume transport rejection without exposing mail server responses/credentials.
  void socket.closed.catch(() => {});
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const readLine = async () => {
    while (!buffer.includes("\r\n")) {
      const part = await reader.read();
      if (part.done) throw new Error("SMTP connection ended");
      buffer += decoder.decode(part.value, { stream: true });
      if (buffer.length > 65536) throw new Error("SMTP response too large");
    }
    const end = buffer.indexOf("\r\n");
    const line = buffer.slice(0, end);
    buffer = buffer.slice(end + 2);
    return line;
  };
  const reply = async (expected: number[]) => {
    const lines: string[] = [];
    let code: number | undefined;
    for (let count = 0; count < 100; count++) {
      const line = await readLine();
      const match = /^(\d{3})([ -])(.*)$/.exec(line);
      if (!match || (code !== undefined && code !== Number(match[1]))) {
        throw new Error("Invalid SMTP reply");
      }
      code = Number(match[1]);
      lines.push(match[3]);
      if (match[2] === " ") {
        if (!expected.includes(code)) throw new Error(`SMTP rejected request (${code})`);
        return { code, lines };
      }
    }
    throw new Error("SMTP response too long");
  };
  const command = async (line: string, expected: number[]) => {
    await writer.write(encoder.encode(line + "\r\n"));
    return reply(expected);
  };

  const send = async () => {
    await socket.opened;
    await reply([220]);
    const capabilities = await command("EHLO jesscounselling.online", [250]);
    const auth = capabilities.lines.find(line => /^AUTH[ =]/i.test(line)) || "";
    if (/\bPLAIN\b/i.test(auth)) {
      const credentials = base64(`\0${configuration.user}\0${configuration.password}`);
      // Servers may request credentials after an initial AUTH PLAIN response.
      const response = await command(`AUTH PLAIN ${credentials}`, [235, 334]);
      if (response.code === 334) await command(credentials, [235]);
    } else if (/\bLOGIN\b/i.test(auth)) {
      await command("AUTH LOGIN", [334]);
      await command(base64(configuration.user), [334]);
      await command(base64(configuration.password), [235]);
    } else {
      throw new Error("SMTP server does not advertise supported authentication");
    }
    await command(`MAIL FROM:<${configuration.from}>`, [250]);
    await command(`RCPT TO:<${RECIPIENT}>`, [250, 251]);
    await command("DATA", [354]);
    const mime = mimeMessage(configuration.from, message.subject, message.text, message.html, message.attachment);
    await writer.write(encoder.encode(mime.replace(/^\./gm, "..") + ".\r\n"));
    await reply([250]);
    // Acceptance is final. A failed QUIT must not trigger a duplicate retry.
  };

  try {
    await Promise.race([
      send(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("SMTP timed out")), TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    await socket.close().catch(() => {});
    reader.releaseLock();
    writer.releaseLock();
  }
}
