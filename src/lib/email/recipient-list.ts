/** Reject a malformed list as a whole: no silently discarded recipient. */
export function validateRecipients(emails: string[]) {
  const normalized = emails.map(email => email.trim().toLowerCase());
  if (!normalized.length || normalized.length > 20 || normalized.some(email => email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return [];
  return [...new Set(normalized)];
}
