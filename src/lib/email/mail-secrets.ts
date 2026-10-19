import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { MailServiceError } from "./mail-errors";
export type SealedMailSecret = { version: 1; iv: string; tag: string; ciphertext: string };
function key() {
  const source = process.env.MAIL_ENCRYPTION_KEY || process.env.AUTH_SECRET || "";
  if (source.length < 32) throw new MailServiceError("mail_encryption_unavailable", 503);
  return createHash("sha256").update(`a2e-mail-v1:${source}`).digest();
}
export function mailEncryptionConfigured() { try { key(); return true; } catch { return false; } }
export function mailActionSignature(value: string) { return createHmac("sha256", key()).update(`mail-preview-v1:${value}`).digest("hex"); }
export function sealMailSecret(value: string, connectorId: string): SealedMailSecret {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`mail-connector-v1:${connectorId}`));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}
export function openMailSecret(value: SealedMailSecret, connectorId: string) {
  try {
    const cipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(value.iv, "base64"));
    cipher.setAAD(Buffer.from(`mail-connector-v1:${connectorId}`)); cipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return Buffer.concat([cipher.update(Buffer.from(value.ciphertext, "base64")), cipher.final()]).toString("utf8");
  } catch (error) { if (error instanceof MailServiceError) throw error; throw new MailServiceError("mail_secret_unreadable", 503); }
}
