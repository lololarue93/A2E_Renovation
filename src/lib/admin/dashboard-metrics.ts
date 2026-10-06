const parisDateFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
export const parisDayKey = (date: Date) => parisDateFormatter.format(date);

export function parisMidnight(key: string) {
  const midnight = new Date(`${key}T00:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" }).formatToParts(midnight).find((part) => part.type === "timeZoneName")?.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const minutes = offset ? (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) * (offset[1] === "+" ? 1 : -1) : 0;
  return new Date(midnight.getTime() - minutes * 60000);
}

export function dashboardPeriod(now = new Date()) {
  const currentDay = new Date(`${parisDayKey(now)}T12:00:00Z`);
  const keys = Array.from({ length: 30 }, (_, index) => { const date = new Date(currentDay); date.setUTCDate(date.getUTCDate() - (29 - index)); return parisDayKey(date); });
  const nextDay = new Date(currentDay); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return { keys, start: parisMidnight(keys[0]), end: parisMidnight(parisDayKey(nextDay)) };
}

type Event = { event: string; sessionId: string | null; createdAt: Date };
export function summarizeDashboardEvents(events: Event[], keys: string[]) {
  const counts: Record<string, number> = {};
  const daily = new Map(keys.map((key) => [key, { label: key.slice(5).split("-").reverse().join("/"), views: 0, quotes: 0, leads: 0 }]));
  const sessions = new Map<string, Record<string, number>>();
  let unidentified = 0;
  for (const event of events) {
    counts[event.event] = (counts[event.event] ?? 0) + 1;
    const point = daily.get(parisDayKey(event.createdAt));
    if (point) { if (event.event === "page_view") point.views += 1; else if (event.event === "quote_started") point.quotes += 1; else if (event.event === "lead_submitted") point.leads += 1; }
    if (!event.sessionId) { unidentified += 1; continue; }
    const session = sessions.get(event.sessionId) ?? {};
    session[event.event] = Math.min(session[event.event] ?? Infinity, event.createdAt.getTime());
    sessions.set(event.sessionId, session);
  }
  const viewed = [...sessions.values()].filter((session) => session.page_view !== undefined);
  const started = viewed.filter((session) => session.quote_started !== undefined && session.quote_started >= session.page_view);
  const inquiry = viewed.filter((session) => session.lead_submitted !== undefined && session.lead_submitted >= session.page_view);
  const startedAndInquiry = started.filter((session) => session.lead_submitted !== undefined && session.lead_submitted >= session.quote_started);
  return {
    counts, points: [...daily.values()], unidentified,
    sessions: viewed.length, startedSessions: started.length, inquirySessions: inquiry.length, startedAndInquirySessions: startedAndInquiry.length,
    startRate: viewed.length ? started.length / viewed.length * 100 : null,
    inquiryRate: viewed.length ? inquiry.length / viewed.length * 100 : null,
    completionRate: started.length ? startedAndInquiry.length / started.length * 100 : null
  };
}
