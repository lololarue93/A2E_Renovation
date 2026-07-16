export function calculateIndicativeVat(amount: number, rate: number) {
  const tax = Math.round((amount * rate) / 100);
  return { excludingTax: amount - tax, tax, includingTax: amount };
}
