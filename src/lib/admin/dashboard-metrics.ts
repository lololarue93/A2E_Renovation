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

export type DashboardEvent = { event: string; label?: string | null; path?: string; sessionId: string | null; createdAt: Date };
export const FUNNEL_STAGES = [
  { key: "sessions", label: "Sessions mesurees" },
  { key: "started", label: "Simulateur demarre" },
  { key: "budget", label: "Budget consulte" },
  { key: "contact", label: "Etape contact" },
  { key: "registered", label: "Demande enregistree" }
] as const;
type TimedEvent = DashboardEvent & { timestamp: number };
const after = (events: TimedEvent[], predicate: (event: TimedEvent) => boolean, minimum = -Infinity) => events.find((event) => event.timestamp >= minimum && predicate(event))?.timestamp;

export function summarizeDashboardEvents(events: DashboardEvent[], keys: string[]) {
  const counts: Record<string, number> = {};
  const daily = new Map(keys.map((key) => [key, { label: key.slice(5).split("-").reverse().join("/"), views: 0, quotes: 0, leads: 0 }]));
  const sessions = new Map<string, Record<string, number>>();
  const timelines = new Map<string, TimedEvent[]>();
  const acquisition = new Map(keys.map((key) => [key, { key, label: key.slice(5).split("-").reverse().join("/"), sessions: new Set<string>(), registered: new Set<string>() }]));
  let unidentified = 0;
  let stepEventsObserved = false;
  for (const event of events) {
    if (!Number.isFinite(event.createdAt.getTime()) || !daily.has(parisDayKey(event.createdAt)) || event.path?.startsWith("/admin")) continue;
    counts[event.event] = (counts[event.event] ?? 0) + 1;
    if (event.event === "quote_step_viewed" && ["selection", "details", "budget", "contact"].includes(event.label ?? "")) stepEventsObserved = true;
    const point = daily.get(parisDayKey(event.createdAt));
    if (point) { if (event.event === "page_view") point.views += 1; else if (event.event === "quote_started") point.quotes += 1; else if (event.event === "lead_submitted") point.leads += 1; }
    if (!event.sessionId) { unidentified += 1; continue; }
    const timeline = timelines.get(event.sessionId) ?? [];
    timeline.push({ ...event, timestamp: event.createdAt.getTime() }); timelines.set(event.sessionId, timeline);
    if (event.event === "page_view") acquisition.get(parisDayKey(event.createdAt))?.sessions.add(event.sessionId);
    const session = sessions.get(event.sessionId) ?? {};
    session[event.event] = Math.min(session[event.event] ?? Infinity, event.createdAt.getTime());
    sessions.set(event.sessionId, session);
  }
  const viewed = [...sessions.values()].filter((session) => session.page_view !== undefined);
  const started = viewed.filter((session) => session.quote_started !== undefined && session.quote_started >= session.page_view);
  const inquiry = viewed.filter((session) => session.lead_submitted !== undefined && session.lead_submitted >= session.page_view);
  const startedAndInquiry = started.filter((session) => session.lead_submitted !== undefined && session.lead_submitted >= session.quote_started);
  const funnelCounts = [0, 0, 0, 0, 0];
  const gallery = (["published", "inspiration"] as const).map((key) => ({ key, label: key === "published" ? "Chantiers publies" : "Inspirations", openedSessions: 0, comparedSessions: 0, estimateClickSessions: 0, startedAfterClickSessions: 0 }));
  let directContactSessions = 0, submissionsOutsideFunnel = 0, invalidLabels = 0;
  for (const [sessionId, unordered] of timelines) {
    const timeline = unordered.sort((left, right) => left.timestamp - right.timestamp);
    invalidLabels += timeline.filter((event) => (event.event === "quote_step_viewed" && !["selection", "details", "budget", "contact"].includes(event.label ?? "")) || (event.event.startsWith("gallery_") && !["published", "inspiration"].includes(event.label ?? ""))).length;
    const predicates: ((event: TimedEvent) => boolean)[] = [
      (event) => event.event === "page_view",
      (event) => event.event === "quote_started",
      (event) => event.event === "quote_step_viewed" && event.label === "budget",
      (event) => event.event === "quote_step_viewed" && event.label === "contact",
      (event) => event.event === "lead_submitted" && event.label === "simulateur"
    ];
    let minimum = -Infinity;
    let reached = 0;
    for (let index = 0; index < predicates.length; index++) {
      const timestamp = after(timeline, predicates[index], minimum);
      if (timestamp === undefined) break;
      funnelCounts[index]++; reached++; minimum = timestamp;
      if (index === 4) acquisition.get(parisDayKey(new Date(timestamp)))?.registered.add(sessionId);
    }
    const page = after(timeline, predicates[0]);
    if (page === undefined) continue;
    if (after(timeline, (event) => event.event === "lead_submitted" && event.label === "contact", page) !== undefined) directContactSessions++;
    if (reached < 5 && after(timeline, (event) => event.event === "lead_submitted", page) !== undefined) submissionsOutsideFunnel++;
    for (const item of gallery) {
      const opened = after(timeline, (event) => event.event === "gallery_opened" && event.label === item.key, page);
      if (opened !== undefined) {
        item.openedSessions++;
        if (after(timeline, (event) => event.event === "gallery_comparison_used" && event.label === item.key, opened) !== undefined) item.comparedSessions++;
      }
      // Card links also lead directly to the calculator without opening the viewer.
      const clicked = after(timeline, (event) => event.event === "gallery_estimate_clicked" && event.label === item.key, page);
      if (clicked === undefined) continue;
      item.estimateClickSessions++;
      if (after(timeline, (event) => event.event === "quote_started", clicked) !== undefined) item.startedAfterClickSessions++;
    }
  }
  const funnel = FUNNEL_STAGES.map((stage, index) => ({ ...stage, count: funnelCounts[index], previousCount: index === 0 ? null : funnelCounts[index - 1], rate: index === 0 || funnelCounts[index - 1] === 0 ? null : funnelCounts[index] / funnelCounts[index - 1] * 100 }));
  return {
    funnel, gallery, directContactSessions, submissionsOutsideFunnel, invalidLabels, stepEventsObserved,
    acquisition: [...acquisition.values()].map((point) => ({ key: point.key, label: point.label, sessions: point.sessions.size, registered: point.registered.size })),
    counts, points: [...daily.values()], unidentified,
    sessions: viewed.length, startedSessions: started.length, inquirySessions: inquiry.length, startedAndInquirySessions: startedAndInquiry.length,
    startRate: viewed.length ? started.length / viewed.length * 100 : null,
    inquiryRate: viewed.length ? inquiry.length / viewed.length * 100 : null,
    completionRate: started.length ? startedAndInquiry.length / started.length * 100 : null
  };
}
