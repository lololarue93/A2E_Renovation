export function calculateIndicativeVat(amount: number, rate: number) {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error("Montant ou taux de TVA invalide");
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const includingTax = round(amount);
  const excludingTax = round(includingTax / (1 + rate / 100));
  return { excludingTax, tax: round(includingTax - excludingTax), includingTax };
}
