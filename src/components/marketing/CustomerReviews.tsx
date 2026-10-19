import React from "react";
import { getPublicCustomerReviews } from "@/lib/reviews/customer-review-store";

export async function CustomerReviews() {
  const reviews = await getPublicCustomerReviews();
  if (!reviews.length) return null;
  return <section className="section border-t border-navy/10" aria-labelledby="customer-reviews-title"><div className="container">
    <div className="section-intro"><div><p className="eyebrow">Les retours de nos clients</p><h2 id="customer-reviews-title">Leurs projets.<br />Leurs mots.</h2></div><p>Des avis transmis par nos clients et publies avec leur accord.</p></div>
    <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">{reviews.map(review => <figure key={review.id} className="min-w-0 border-t border-navy/20 pt-6">
      <p className="text-sm font-semibold text-navy" aria-label={`Note du client : ${review.rating} sur 5`}>Note : {review.rating} / 5</p>
      <blockquote className="mt-4 whitespace-pre-line break-words text-base leading-8 text-ink">{review.text}</blockquote>
      <figcaption className="mt-5 text-sm leading-7 text-ink"><strong className="font-semibold text-navy">{review.author}</strong><span className="block">{review.city} · {review.workType}</span><time dateTime={review.date}>{new Date(`${review.date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "long", day: "numeric" })}</time>{review.sourceUrl && <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 w-fit items-center font-semibold text-navy underline underline-offset-4">Consulter l'avis source <span className="sr-only">(nouvel onglet)</span></a>}</figcaption>
    </figure>)}</div>
  </div></section>;
}
