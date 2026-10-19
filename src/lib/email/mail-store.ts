import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { smtpPresets, type MailConnectorFields, type MailConnectorsView } from "./mail-contract";
import { mailEncryptionConfigured, openMailSecret, sealMailSecret } from "./mail-secrets";
import { emailTransportConfig } from "./transport-config";
import { MailServiceError } from "./mail-errors";
import { defaultNotificationSettings, getNotificationSettings } from "@/lib/settings/notification-settings";

export const CONNECTORS_KEY = "mail.connectors.v1", LISTS_KEY = "mail.lists.v1";
const email = z.string().trim().toLowerCase().email().max(160);
const id = z.string().uuid();
const connectorId = z.union([id, z.enum(["env-smtp", "env-brevo"])]);
const host = z.string().trim().toLowerCase().max(253).refine(value => !value || /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value));
const connectorFields = z.object({ id, name: z.string().trim().min(2).max(100), provider: z.enum(["smtp", "brevo"]), preset: z.enum(["ovh", "gmail", "custom"]), host, port: z.union([z.literal(465), z.literal(587)]), security: z.enum(["tls", "starttls"]), username: z.string().trim().max(320), fromEmail: email, fromName: z.string().trim().max(100).refine(value => !/[\r\n]/.test(value)), enabled: z.boolean() }).strict();
const secretSchema = z.object({ version: z.literal(1), iv: z.string().max(100), tag: z.string().max(100), ciphertext: z.string().max(12000) }).strict();
const storedConnector = connectorFields.extend({ sealedSecret: secretSchema.optional() }).strict();
const connectorInput = connectorFields.extend({ secret: z.string().max(8192).optional(), clearSecret: z.boolean().optional() }).strict().superRefine((value, context) => {
  if (value.provider === "smtp" && ((!value.host && value.preset === "custom") || !value.username || value.port === 465 && value.security !== "tls" || value.port === 587 && value.security !== "starttls")) context.addIssue({ code: "custom", message: "Hote, compte et mode TLS incoherents." });
  if (value.clearSecret && value.secret) context.addIssue({ code: "custom", message: "Choisissez un nouveau secret ou son effacement." });
});
const connectorStoreSchema = z.object({ schemaVersion: z.literal(1), version: z.number().int().nonnegative(), defaultConnectorId: connectorId.nullable(), connectors: z.array(storedConnector).max(10) }).strict();
export const connectorsInputSchema = z.object({ version: z.number().int().nonnegative(), defaultConnectorId: connectorId.nullable(), connectors: z.array(connectorInput).max(10) }).strict();
const list = z.object({ id, name: z.string().trim().min(2).max(100), type: z.enum(["team", "clients"]), members: z.array(z.object({ email, name: z.string().trim().max(100).default(""), consent: z.boolean().default(false) }).strict()).max(500) }).strict();
const listsFields = { version: z.number().int().nonnegative(), notificationListIds: z.array(id).max(20), lists: z.array(list).max(20) };
export const listsInputSchema = z.object(listsFields).strict().superRefine((value, context) => {
  if (value.lists.reduce((count, item) => count + item.members.length, 0) > 2000 || new Set(value.lists.map(item => item.id)).size !== value.lists.length || new Set(value.notificationListIds).size !== value.notificationListIds.length || value.notificationListIds.some(selected => !value.lists.some(item => item.id === selected && item.type === "team"))) context.addIssue({ code: "custom", message: "Listes dupliquees, trop volumineuses ou selection notification incompatible." });
});
const listsStoreSchema = z.object({ schemaVersion: z.literal(1), ...listsFields }).strict();
export type StoredConnector = z.infer<typeof storedConnector>;
export type ResolvedMailConnector = MailConnectorFields & { secret: string };
const emptyConnectors = () => ({ schemaVersion: 1 as const, version: 0, defaultConnectorId: null, connectors: [] as StoredConnector[] });
const emptyLists = () => ({ schemaVersion: 1 as const, version: 0, notificationListIds: [] as string[], lists: [] as z.infer<typeof list>[] });
async function read<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  if (!process.env.DATABASE_URL) throw new MailServiceError("mail_store_unavailable", 503);
  let row; try { row = await prisma.siteSettings.findUnique({ where: { key } }); } catch { throw new MailServiceError("mail_store_unavailable", 503); }
  if (!row) return fallback;
  const parsed = schema.safeParse(row.value); if (!parsed.success) throw new MailServiceError("mail_store_invalid", 503);
  return parsed.data;
}
export const readMailConnectorStore = () => read(CONNECTORS_KEY, connectorStoreSchema, emptyConnectors());
export const readMailLists = () => read(LISTS_KEY, listsStoreSchema, emptyLists());
export function environmentConnectors(preferred = "smtp"): ResolvedMailConnector[] {
  const smtpProvider = preferred === "gmail" ? "gmail" : preferred === "ovh" ? "ovh" : "smtp";
  const smtp = emailTransportConfig(smtpProvider), brevo = emailTransportConfig("brevo");
  return [
    { id: "env-smtp", name: "SMTP de l'hebergement", provider: "smtp", preset: smtpProvider === "gmail" ? "gmail" : smtpProvider === "ovh" ? "ovh" : "custom", host: smtp.host, port: smtp.port, security: smtp.secure ? "tls" : "starttls", username: process.env.SMTP_USER || "", fromEmail: smtp.from, fromName: "A2E Renovation", enabled: smtp.configured, secret: process.env.SMTP_PASSWORD || "" },
    { id: "env-brevo", name: "Brevo de l'hebergement", provider: "brevo", preset: "custom", host: "", port: 587, security: "starttls", username: "", fromEmail: brevo.from, fromName: process.env.BREVO_SENDER_NAME || "A2E Renovation", enabled: brevo.configured, secret: process.env.BREVO_API_KEY || "" },
  ];
}
function connectorComplete(value: MailConnectorFields, secretConfigured: boolean) { return value.enabled && !!value.fromEmail && secretConfigured && (value.provider === "brevo" || !!value.host && !!value.username && (value.port === 465 && value.security === "tls" || value.port === 587 && value.security === "starttls")); }
export async function mailConnectorsView(preferred?: string): Promise<MailConnectorsView> {
  preferred = preferred || (await getNotificationSettings({ strict: true })).provider;
  const stored = await readMailConnectorStore();
  const connectors = stored.connectors.map(({ sealedSecret, ...fields }) => ({ ...fields, source: "admin" as const, secretConfigured: !!sealedSecret, configured: connectorComplete(fields, !!sealedSecret && mailEncryptionConfigured()) }));
  const environment = environmentConnectors(preferred).map(({ secret, ...fields }) => ({ ...fields, source: "environment" as const, secretConfigured: !!secret, configured: connectorComplete(fields, !!secret) }));
  return { version: stored.version, defaultConnectorId: stored.defaultConnectorId, effectiveDefaultConnectorId: stored.defaultConnectorId || (preferred === "brevo" ? "env-brevo" : "env-smtp"), connectors: [...connectors, ...environment], encryptionConfigured: mailEncryptionConfigured() };
}
export async function resolveMailConnector(selected?: string, preferred?: string): Promise<ResolvedMailConnector> {
  preferred = preferred || (await getNotificationSettings({ strict: true })).provider;
  const store = await readMailConnectorStore();
  const chosen = selected || store.defaultConnectorId || (preferred === "brevo" ? "env-brevo" : "env-smtp");
  const item = store.connectors.find(value => value.id === chosen);
  if (item) {
    const { sealedSecret, ...fields } = item;
    if (!sealedSecret || !connectorComplete(fields, true)) throw new MailServiceError("mail_connector_unavailable", 409);
    return { ...fields, secret: openMailSecret(sealedSecret, item.id) };
  }
  const fallback = environmentConnectors(preferred).find(value => value.id === chosen);
  if (!fallback || !connectorComplete(fallback, !!fallback.secret)) throw new MailServiceError("mail_connector_unavailable", 409);
  return fallback;
}
async function writeVersioned(key: string, expectedVersion: number, value: Prisma.InputJsonValue, actor: string | null, schema: z.ZodTypeAny, oldDefault: { version: number }, validate?: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await prisma.$transaction(async tx => {
      const old = await tx.siteSettings.findUnique({ where: { key } });
      const parsed = old ? schema.safeParse(old.value) : { success: true as const, data: oldDefault };
      if (!parsed.success) throw new MailServiceError("mail_store_invalid", 503);
      if (parsed.data.version !== expectedVersion) throw new MailServiceError("mail_version_conflict", 409);
      if (validate) await validate(tx);
      await tx.siteSettings.upsert({ where: { key }, update: { value }, create: { key, value } });
      await tx.auditLog.create({ data: { actor, action: "mail.settings_updated", entity: "SiteSettings", entityId: key, payload: { version: expectedVersion + 1 } } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof MailServiceError) throw error;
    if (error && typeof error === "object" && "code" in error && ["P2034", "P2002"].includes(String(error.code))) throw new MailServiceError("mail_version_conflict", 409);
    throw new MailServiceError("mail_store_unavailable", 503);
  }
}
export async function saveMailConnectors(input: z.infer<typeof connectorsInputSchema>, actor: string | null) {
  const old = await readMailConnectorStore();
  if (old.version !== input.version) throw new MailServiceError("mail_version_conflict", 409);
  if (new Set(input.connectors.map(item => item.id)).size !== input.connectors.length || input.defaultConnectorId && !["env-smtp", "env-brevo"].includes(input.defaultConnectorId) && !input.connectors.some(item => item.id === input.defaultConnectorId && item.enabled)) throw new MailServiceError("mail_connector_unavailable");
  const connectors = input.connectors.map(({ secret, clearSecret, ...value }) => {
    const preset = value.provider === "smtp" && value.preset !== "custom" ? smtpPresets[value.preset] : null;
    const fields = { ...value, ...(preset || {}) };
    const prior = old.connectors.find(item => item.id === value.id);
    if (prior?.sealedSecret && !secret && !clearSecret && (prior.provider !== fields.provider || prior.host !== fields.host || prior.username !== fields.username)) throw new MailServiceError("mail_secret_context_changed");
    const sealedSecret = secret ? sealMailSecret(secret, value.id) : clearSecret ? undefined : prior?.sealedSecret;
    return { ...fields, ...(sealedSecret ? { sealedSecret } : {}) };
  });
  await writeVersioned(CONNECTORS_KEY, input.version, { schemaVersion: 1, version: input.version + 1, defaultConnectorId: input.defaultConnectorId, connectors }, actor, connectorStoreSchema, emptyConnectors());
  return mailConnectorsView();
}
export async function saveMailLists(input: z.infer<typeof listsInputSchema>, actor: string | null) {
  const lists = input.lists.map(item => ({ ...item, members: [...new Map(item.members.map(member => [member.email, member])).values()] }));
  const value = { schemaVersion: 1, version: input.version + 1, notificationListIds: input.notificationListIds, lists };
  await writeVersioned(LISTS_KEY, input.version, value, actor, listsStoreSchema, emptyLists(), async tx => {
    const legacy = await tx.siteSettings.findUnique({ where: { key: "notifications" } });
    assertMailNotificationLimit(legacyNotificationRecipients(legacy?.value), value);
  });
  return mailListsView();
}
function legacyNotificationRecipients(value: unknown) {
  if (value === undefined || value === null) return defaultNotificationSettings.recipients;
  if (typeof value !== "object" || Array.isArray(value)) throw new MailServiceError("mail_store_invalid", 503);
  const stored = value as Record<string, unknown>;
  const recipients = Array.isArray(stored.recipients) && stored.recipients.length ? stored.recipients : [stored.leadEmail || defaultNotificationSettings.leadEmail];
  const parsed = z.array(email).min(1).max(20).safeParse(recipients);
  if (!parsed.success) throw new MailServiceError("mail_store_invalid", 503);
  return parsed.data;
}
/** Used by both writers inside their serializable transaction before any write. */
export function assertMailNotificationLimit(base: string[], rawLists: unknown) {
  const parsed = rawLists === undefined || rawLists === null ? { success: true as const, data: emptyLists() } : listsStoreSchema.safeParse(rawLists);
  if (!parsed.success) throw new MailServiceError("mail_store_invalid", 503);
  const recipients = [...base];
  for (const selected of parsed.data.notificationListIds) {
    const list = parsed.data.lists.find(item => item.id === selected && item.type === "team");
    if (!list) throw new MailServiceError("mail_list_invalid", 503);
    recipients.push(...list.members.map(member => member.email));
  }
  const unique = [...new Set(recipients.map(value => value.toLowerCase().trim()))];
  if (unique.length > 50) throw new MailServiceError("mail_notification_limit");
  return unique;
}
export async function mailListsView() {
  const { schemaVersion: _schema, ...view } = await readMailLists();
  const settings = await getNotificationSettings({ strict: true });
  const effective = [...new Set([...settings.recipients, ...view.lists.filter(list => list.type === "team" && view.notificationListIds.includes(list.id)).flatMap(list => list.members.map(member => member.email))])];
  return { ...view, legacyRecipients: settings.recipients, effectiveNotificationRecipients: effective, notificationRecipientLimit: 50 };
}
export async function notificationListRecipients(base: string[]) {
  return assertMailNotificationLimit(base, await readMailLists());
}
