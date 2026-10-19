import { z } from "zod";

/** Single source of truth: SiteSettings.customer_reviews, no seeded testimonials. */
export const customerReviewsKey = "customer_reviews";
const reviewDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez une date valide.").refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Indiquez une date de calendrier valide.");
const sourceUrl = z.string().trim().max(500).refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, "Utilisez une URL http ou https sans identifiants, ou laissez vide.");

export const customerReviewSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  author: z.string().trim().min(2, "Indiquez le nom public autorise.").max(100),
  city: z.string().trim().min(2, "Indiquez la ville.").max(100),
  workType: z.string().trim().min(2, "Indiquez le type de travaux.").max(120),
  date: reviewDate,
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(10, "Saisissez le texte de l'avis reel.").max(3000),
  sourceUrl,
  consentConfirmed: z.boolean(),
  published: z.boolean()
}).strict().superRefine((review, context) => {
  if (review.published && !review.consentConfirmed) context.addIssue({ code: z.ZodIssueCode.custom, path: ["consentConfirmed"], message: "Confirmez l'accord du client avant de publier son avis." });
});

export const customerReviewsSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.number().int().nonnegative(),
  reviews: z.array(customerReviewSchema).max(100)
}).strict().superRefine((settings, context) => {
  if (new Set(settings.reviews.map(review => review.id)).size !== settings.reviews.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["reviews"], message: "Chaque avis doit avoir un identifiant unique." });
});

export type CustomerReview = z.infer<typeof customerReviewSchema>;
export type CustomerReviewsSettings = z.infer<typeof customerReviewsSchema>;

export function emptyCustomerReviews(): CustomerReviewsSettings {
  return { schemaVersion: 1, version: 0, reviews: [] };
}

/** A malformed stored value is never replaced by an empty editable configuration. */
export function readCustomerReviews(value: unknown): CustomerReviewsSettings {
  return customerReviewsSchema.parse(value);
}

export function publishedCustomerReviews(settings: CustomerReviewsSettings): CustomerReview[] {
  return settings.reviews.filter(review => review.published && review.consentConfirmed)
    .sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));
}
