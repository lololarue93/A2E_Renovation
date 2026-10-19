import type { NotificationSettingsValue } from "@/lib/settings/notification-settings";

type Environment = Record<string, string | undefined>;
export function emailTransportConfig(provider: NotificationSettingsValue["provider"], env: Environment = process.env) {
  const missing: string[] = [];
  if (provider === "brevo") {
    if (!env.BREVO_API_KEY) missing.push("BREVO_API_KEY");
    if (!env.BREVO_SENDER_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BREVO_SENDER_EMAIL)) missing.push("BREVO_SENDER_EMAIL");
    return { configured: !missing.length, missing, host: "", port: 0, secure: true, from: env.BREVO_SENDER_EMAIL ?? "" };
  }
  if (!env.SMTP_USER) missing.push("SMTP_USER");
  if (!env.SMTP_PASSWORD) missing.push("SMTP_PASSWORD");
  const host = env.SMTP_HOST || (provider === "gmail" ? "smtp.gmail.com" : provider === "ovh" ? "ssl0.ovh.net" : "");
  if (!host || /[\s/@]/.test(host)) missing.push("SMTP_HOST");
  const port = Number(env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push("SMTP_PORT");
  if (env.SMTP_SECURE && !["true", "false"].includes(env.SMTP_SECURE)) missing.push("SMTP_SECURE");
  const from = env.SMTP_FROM || env.SMTP_USER || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) missing.push("SMTP_FROM (ou SMTP_USER au format email)");
  return { configured: !missing.length, missing, host, port, secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465, from };
}
