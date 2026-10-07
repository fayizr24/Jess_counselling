import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../app/lib/namecheap-email.ts', import.meta.url), 'utf8');
const routeSource = readFileSync(new URL('../app/api/consultation/route.ts', import.meta.url), 'utf8');
const appointmentSource = readFileSync(new URL('../app/api/appointment/route.ts', import.meta.url), 'utf8');
const message = { subject: 'Request മലയാളം\r\nBcc: bad@example.com', text: 'Details മലയാളം', html: '<p>Details മലയാളം</p>' };
async function fixture(steps, env = { SMTP_PASSWORD: 'test-only-password' }, stalled = false) {
  let controller, connected = 0, closed = 0;
  const sent = [];
  const encoder = new TextEncoder();
  const readable = new ReadableStream({ start(c) { controller = c; } });
  const push = (s) => { // Responses split mid-line.
    controller.enqueue(encoder.encode(s.slice(0, 7)));
    controller.enqueue(encoder.encode(s.slice(7)));
  };
  const writable = new WritableStream({ write(bytes) {
    const line = new TextDecoder().decode(bytes);
    sent.push(line);
    const step = steps.shift();
    assert.ok(step, 'unexpected command');
    assert.match(line, step[0]);
    if (step[1]) push(step[1]);
  } });
  const socket = { readable, writable, opened: Promise.resolve({}), closed: Promise.resolve(), close: async () => { closed++; controller.close(); } };
  globalThis.__smtpFixture = { env, connect(address, options) {
    connected++;
    assert.deepEqual(address, { hostname: 'mail.privateemail.com', port: 465 });
    assert.deepEqual(options, { secureTransport: 'on', allowHalfOpen: false });
    if (!stalled) push('220 ready\r\n');
    return socket;
  } };
  let js = ts.transpile(source, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
  js = js.replace(/import \{ env \} from "cloudflare:workers";/, 'const env = globalThis.__smtpFixture.env;')
    .replace(/import \{ connect \} from "cloudflare:sockets";/, 'const connect = globalThis.__smtpFixture.connect;');
  if (stalled) js = js.replace('const TIMEOUT_MS = 25000;', 'const TIMEOUT_MS = 20;');
  const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64') + '#' + Math.random();
  const module = await import(url);
  const routeJs = ts.transpile(routeSource, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }).replace('"../../lib/namecheap-email"', JSON.stringify(url));
  const route = await import('data:text/javascript;base64,' + Buffer.from(routeJs).toString('base64'));
  const appointmentJs = ts.transpile(appointmentSource, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }).replace('"../../lib/namecheap-email"', JSON.stringify(url));
  const appointment = await import('data:text/javascript;base64,' + Buffer.from(appointmentJs).toString('base64'));
  return { module, route, appointment, sent, steps, stats: () => ({ connected, closed }) };
}
function deliverySteps(auth = 'PLAIN', sender = 'free-consult') {
  return [
    [/^EHLO jesscounselling.online\r\n$/, `250-server\r\n250-AUTH ${auth}\r\n250 SIZE 52428800\r\n`],
    ...(auth === 'LOGIN' ? [
      [/^AUTH LOGIN\r\n$/, '334 VXNlcm5hbWU6\r\n'],
      [/^aGVsbG9AamVzc2NvdW5zZWxsaW5nLm9ubGluZQ==\r\n$/, '334 UGFzc3dvcmQ6\r\n'],
      [/^dGVzdC1vbmx5LXBhc3N3b3Jk\r\n$/, '235 authenticated\r\n'],
    ] : [[/^AUTH PLAIN /, '235 authenticated\r\n']]),
    [new RegExp(`^MAIL FROM:<${sender}@jesscounselling\\.online>\\r\\n$`), '250 accepted\r\n'],
    [/^RCPT TO:<hello@jesscounselling.online>\r\n$/, '250 accepted\r\n'],
    [/^DATA\r\n$/, '354 send\r\n'],
    [/^From: Jess Counselling Website /, '250 queued\r\n'],
  ];
}
for (const auth of ['PLAIN', 'LOGIN']) test(`TLS ${auth}: alias, recipient, Unicode and MIME`, async () => {
  const f = await fixture(deliverySteps(auth));
  await f.module.sendNamecheapEmail(message);
  assert.equal(f.steps.length, 0);
  assert.deepEqual(f.stats(), { connected: 1, closed: 1 });
  const mime = f.sent.at(-1);
  assert.ok(mime.endsWith('\r\n.\r\n'));
  assert.match(mime, /Reply-To: hello@jesscounselling.online/);
  assert.match(mime, /Content-Type: multipart\/alternative/);
  assert.ok(!mime.includes('\r\nBcc:'));
  assert.ok(!mime.includes('test-only-password'));
  const parts = mime.match(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/g);
  assert.equal(parts.length, 2);
  assert.equal(Buffer.from(parts[0].split('\r\n\r\n')[1], 'base64').toString(), message.text);
  assert.equal(Buffer.from(parts[1].split('\r\n\r\n')[1], 'base64').toString(), message.html);
});
test('PLAIN challenge is handled', async () => {
  const steps = deliverySteps();
  steps[1][1] = '334 \r\n';
  steps.splice(2, 0, [/^AGhlbGxv/, '235 authenticated\r\n']);
  const f = await fixture(steps);
  await f.module.sendNamecheapEmail(message);
  assert.equal(f.steps.length, 0);
});
const request = () => {
  const form = new FormData(); form.set('name', 'Test');
  return new Request('https://example.test/api/consultation', { method: 'POST', body: form });
};
test('missing password returns 503 without connecting', async () => {
  const f = await fixture([], {});
  assert.equal((await f.route.POST(request())).status, 503);
  assert.equal(f.stats().connected, 0);
});
test('configured sender cannot inject SMTP commands', async () => {
  const f = await fixture([], { SMTP_PASSWORD: 'test-only-password', SMTP_CONTACT_FROM_EMAIL: 'free-consult@jesscounselling.online\r\nRCPT TO:<bad@example.com>' });
  await assert.rejects(f.module.sendNamecheapEmail(message), f.module.EmailConfigurationError);
  assert.equal(f.stats().connected, 0);
});
for (const [stage, position] of [['authentication', 1], ['recipient', 3], ['DATA acceptance', 5]]) test(`${stage} rejection returns 502`, async () => {
  const steps = deliverySteps(); steps[position][1] = '550 refused\r\n'; steps.splice(position + 1);
  const f = await fixture(steps);
  const response = await f.route.POST(request());
  assert.equal(response.status, 502);
  assert.ok(!JSON.stringify(await response.json()).includes('test-only-password'));
  assert.deepEqual(f.stats(), { connected: 1, closed: 1 });
});
test('SMTP acceptance returns existing ok response', async () => {
  const f = await fixture(deliverySteps());
  const response = await f.route.POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
test('stalled server times out and closes', async () => {
  const f = await fixture([], { SMTP_PASSWORD: 'test-only-password' }, true);
  await assert.rejects(f.module.sendNamecheapEmail(message), /SMTP timed out/);
  assert.equal(f.stats().closed, 1);
});
test('Appointment sends from appointments alias using the hello login and recipient', async () => {
  const f = await fixture(deliverySteps('LOGIN', 'appointments'));
  const response = await f.appointment.POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(f.steps.length, 0);
  assert.match(f.sent.at(-1), /From: Jess Counselling Website <appointments@jesscounselling.online>/);
  const htmlPart = f.sent.at(-1).match(/Content-Type: text\/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/);
  assert.match(Buffer.from(htmlPart[1], 'base64').toString(), /New Appointment Booking/);
});
test('Appointment with missing password returns 503 without connecting', async () => {
  const f = await fixture([], {});
  assert.equal((await f.appointment.POST(request())).status, 503);
  assert.equal(f.stats().connected, 0);
});
test('Appointment rejected by SMTP returns 502', async () => {
  const steps = deliverySteps('PLAIN', 'appointments');
  steps[5][1] = '550 refused\r\n';
  const f = await fixture(steps);
  assert.equal((await f.appointment.POST(request())).status, 502);
});
test('old generic sender setting does not override the two form-specific aliases', async () => {
  const f = await fixture([], { SMTP_PASSWORD: 'test-only-password', SMTP_FROM_EMAIL: 'sender@jesscounselling.online' });
  assert.equal(f.module.getNamecheapConfiguration().from, 'free-consult@jesscounselling.online');
  assert.equal(f.module.getNamecheapConfiguration('appointment').from, 'appointments@jesscounselling.online');
});
