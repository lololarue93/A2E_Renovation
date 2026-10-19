/** Reject a malformed list as a whole: no silently discarded recipient. */
export function validateRecipients(emails: string[], maximum = 20) {
  const normalized = emails.map(email => email.trim().toLowerCase());
  if (!normalized.length || normalized.length > maximum || normalized.some(email => email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return [];
  return [...new Set(normalized)];
}
