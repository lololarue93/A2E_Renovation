/** Public DTOs only. Never add credential values or encrypted blobs here. */
export const smtpPresets = {
  ovh: { host: "ssl0.ovh.net", port: 465, security: "tls" },
  gmail: { host: "smtp.gmail.com", port: 465, security: "tls" },
  custom: { host: "", port: 587, security: "starttls" }
} as const;
export type MailProvider = "smtp" | "brevo";
export type SmtpPreset = keyof typeof smtpPresets;
export type MailConnectorFields = { id: string; name: string; provider: MailProvider; preset: SmtpPreset; host: string; port: number; security: "tls" | "starttls"; username: string; fromEmail: string; fromName: string; enabled: boolean };
export type MailConnectorInput = MailConnectorFields & { secret?: string; clearSecret?: boolean };
export type MailConnectorView = MailConnectorFields & { secretConfigured: boolean; configured: boolean; source: "admin" | "environment" };
export type MailConnectorsView = { version: number; defaultConnectorId: string | null; effectiveDefaultConnectorId: string; connectors: MailConnectorView[]; encryptionConfigured: boolean };
export type MailList = { id: string; name: string; type: "team" | "clients"; members: { email: string; name: string; consent: boolean }[] };
export type MailListsView = { version: number; notificationListIds: string[]; lists: MailList[]; legacyRecipients?: string[]; effectiveNotificationRecipients?: string[]; notificationRecipientLimit?: number };
export type MailComposeInput = { action: "preview" | "send"; requestId: string; connectorId?: string; listIds: string[]; recipients: string[]; consentConfirmed: boolean; subject: string; message: string; previewToken?: string };
export type MailPreview = { connectorId: string; fromEmail: string; fromName: string; subject: string; message: string; recipients: { email: string; name: string }[]; recipientCount: number; excludedCount: number; previewToken: string };
export type MailSendResult = { id: string; status: "sent" | "partial" | "failed" | "pending"; recipientCount: number; acceptedCount: number; rejectedCount: number; failedCount: number; duplicate: boolean; message: string };
