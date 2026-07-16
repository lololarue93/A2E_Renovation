import { team } from "@/lib/site-data";

export function TeamGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {team.map((person) => (
        <article key={person.name} className="a2e-card p-5">
          <div className="grid h-20 w-20 place-items-center rounded-card border border-navy/10 bg-pearl text-2xl font-black text-navy">
            {person.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}
          </div>
          <h3 className="mt-5 text-xl font-black text-navy">{person.name}</h3>
          <p className="font-bold text-ink/62">{person.role}</p>
          <p className="mt-3 text-sm leading-6 text-ink/66">{person.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {person.specialties.map((item) => <span key={item} className="rounded-card bg-pearl px-2 py-1 text-xs font-bold text-ink/70">{item}</span>)}
          </div>
        </article>
      ))}
    </div>
  );
}
