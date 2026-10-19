import { NextResponse } from "next/server";
import { MailServiceError, mailReasonMessage } from "./mail-errors";
export async function readMailBody(request: Request, maximum = 100000) {
  const raw = await request.text();
  if (raw.length > maximum) throw new MailServiceError("mail_destination_invalid", 413);
  try { return JSON.parse(raw) as unknown; } catch { throw new MailServiceError("mail_destination_invalid"); }
}
export function mailApiError(error: unknown) {
  const failure = error instanceof MailServiceError ? error : new MailServiceError("mail_store_unavailable", 503);
  return NextResponse.json({ error: mailReasonMessage(failure.reason), reason: failure.reason }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
}
export const mailJson = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
