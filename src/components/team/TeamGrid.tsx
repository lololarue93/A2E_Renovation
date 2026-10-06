import { team } from "@/lib/site-data";

export function TeamGrid() {
  return (
    <div className="grid max-w-3xl gap-5">
      {team.map((person) => (
        <article key={person.name} className="grid gap-5 border-y border-navy/15 py-7 sm:grid-cols-[auto_1fr]">
          <div className="grid h-20 w-20 place-items-center rounded-card border border-navy/10 bg-pearl text-2xl font-black text-navy">
            {person.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}
          </div>
          <div><h3 className="text-2xl font-semibold text-navy">{person.name}</h3>
          <p className="font-bold text-ink/62">{person.role}</p>
          <p className="mt-3 text-sm leading-6 text-ink/66">{person.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {person.specialties.map((item) => <span key={item} className="rounded-card bg-pearl px-2 py-1 text-xs font-bold text-ink/70">{item}</span>)}
          </div></div>
        </article>
      ))}
    </div>
  );
}
