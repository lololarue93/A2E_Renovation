import { trustBadges } from "@/lib/site-data";

export function TrustBadges() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {trustBadges.map((badge) => (
        <div key={badge.label} className="a2e-card p-4">
          <badge.icon className="text-champagne" size={24} />
          <p className="mt-3 font-black text-navy">{badge.label}</p>
          <p className="mt-1 text-sm text-ink/62">{badge.note}</p>
        </div>
      ))}
    </div>
  );
}
