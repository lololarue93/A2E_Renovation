import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import type { ResolvedMailConnector } from "./mail-store";
import { MailServiceError, safeTransportReason } from "./mail-errors";

export type MailDelivery = { ok: boolean; reason?: string; acceptedCount: number; rejectedCount: number; partial?: boolean };
export type MailMessage = { recipients: string[]; subject: string; html: string; text: string; replyTo?: string; attachment?: { filename: string; content: Uint8Array } };
/** Public unicast addresses only, including IPv4 embedded in an IPv6 mapping. */
export function publicSmtpAddress(address: string): boolean {
  const value = address.toLowerCase();
  if (value.startsWith("::ffff:")) return publicSmtpAddress(value.slice(7));
  if (isIP(value) === 4) {
    const [a, b, c] = value.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 || b === 88 && c === 99) || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
  }
  return isIP(value) === 6 && /^[23]/.test(value) && !/^2001:0?db8:/i.test(value);
}
export async function resolvePublicSmtp(host: string) {
  if (!host.includes(".") || isIP(host) || /(?:^|\.)(localhost|local|internal|lan|home|invalid)$/.test(host) || /[\s/@:%]/.test(host)) throw new MailServiceError("smtp_host_refused");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const addresses = await Promise.race([lookup(host, { all: true, verbatim: true }), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new MailServiceError("smtp_dns_failed")), 3000); })]);
    if (!addresses.length || addresses.some(item => !publicSmtpAddress(item.address))) throw new MailServiceError("smtp_host_refused");
    return addresses[0];
  } catch (error) { if (error instanceof MailServiceError) throw error; throw new MailServiceError("smtp_dns_failed"); }
  finally { if (timer) clearTimeout(timer); }
}
async function smtpTransport(connector: ResolvedMailConnector) {
  if (!(connector.port === 465 && connector.security === "tls" || connector.port === 587 && connector.security === "starttls")) throw new MailServiceError("smtp_tls_failed");
  const address = await resolvePublicSmtp(connector.host);
  return nodemailer.createTransport({ host: address.address, port: connector.port, secure: connector.port === 465, requireTLS: connector.port === 587, ignoreTLS: false, auth: { user: connector.username, pass: connector.secret }, tls: { servername: connector.host, rejectUnauthorized: true, minVersion: "TLSv1.2" }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000, dnsTimeout: 3000, disableFileAccess: true, disableUrlAccess: true });
}
export async function verifyMailConnector(connector: ResolvedMailConnector) {
  try {
    if (connector.provider === "brevo") {
      const result = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": connector.secret, accept: "application/json" }, signal: AbortSignal.timeout(10000) });
      return result.ok ? { ok: true } : { ok: false, reason: `provider_http_${result.status}` };
    }
    const transport = await smtpTransport(connector);
    try { await transport.verify(); return { ok: true }; } finally { transport.close(); }
  } catch (error) { return { ok: false, reason: safeTransportReason(error) }; }
}
export async function deliverWithConnector(input: MailMessage, connector: ResolvedMailConnector): Promise<MailDelivery> {
  try {
    if (connector.provider === "brevo") {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", signal: AbortSignal.timeout(10000), headers: { "api-key": connector.secret, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: { name: connector.fromName || "A2E Renovation", email: connector.fromEmail }, to: input.recipients.map(email => ({ email })), replyTo: input.replyTo ? { email: input.replyTo } : undefined, subject: input.subject, htmlContent: input.html, textContent: input.text, attachment: input.attachment ? [{ content: Buffer.from(input.attachment.content).toString("base64"), name: input.attachment.filename }] : undefined }) });
      return response.ok ? { ok: true, acceptedCount: input.recipients.length, rejectedCount: 0 } : { ok: false, reason: `provider_http_${response.status}`, acceptedCount: 0, rejectedCount: response.status >= 400 && response.status < 500 ? input.recipients.length : 0 };
    }
    const transport = await smtpTransport(connector);
    try {
      const result = await transport.sendMail({ from: { name: connector.fromName, address: connector.fromEmail }, to: input.recipients, replyTo: input.replyTo, subject: input.subject, html: input.html, text: input.text, attachments: input.attachment ? [{ filename: input.attachment.filename, content: Buffer.from(input.attachment.content) }] : undefined });
      const acceptedCount = Array.isArray(result.accepted) ? result.accepted.length : 0, rejectedCount = Array.isArray(result.rejected) ? result.rejected.length : 0;
      return acceptedCount === input.recipients.length && !rejectedCount ? { ok: true, acceptedCount, rejectedCount } : { ok: false, reason: acceptedCount ? "partial_rejection" : "all_recipients_rejected", acceptedCount, rejectedCount, partial: acceptedCount > 0 };
    } finally { transport.close(); }
  } catch (error) { return { ok: false, reason: safeTransportReason(error), acceptedCount: 0, rejectedCount: 0 }; }
}
