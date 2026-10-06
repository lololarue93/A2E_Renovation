import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { services } from "@/lib/site-data";
export const metadata = { title: "Nos expertises", description: "Menuiseries, isolation, electricite, plomberie et renovation globale en Ile-de-France." };
export default function ServicesPage() {
  return <main id="main-content"><section className="page-heading"><div className="container"><p className="eyebrow">Nos expertises</p><h1>Les bons métiers.<br />Pour les bonnes idées.</h1><p>Un projet ponctuel ou une transformation complète : chaque lot a ses exigences. Ensemble, nous préparons un chantier cohérent.</p></div></section><section className="section"><div className="container expertise-grid expertise-catalog">{services.map((service, i) => <Link href={`/services/${service.slug}`} key={service.slug} className="expertise-item"><div className="expertise-top"><service.icon size={30} strokeWidth={1.25} /><span>{String(i + 1).padStart(2, "0")}</span></div><h2>{service.title}</h2><p>{service.excerpt}</p><span className="expertise-link">Explorer cette expertise <ArrowUpRight size={18} /></span></Link>)}</div></section><section className="project-invitation"><div className="container"><h2>Plusieurs lots ?<br />Un seul projet.</h2><Link href="/simulateur" className="button-light">Composer mes travaux <ArrowUpRight size={19} /></Link></div></section></main>;
}
