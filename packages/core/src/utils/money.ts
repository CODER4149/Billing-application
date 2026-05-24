/** Round to 2 decimal places (paise) for all money calculations */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Normalize any money value to integer paise to avoid float drift */
export function toPaise(amount: number): number {
  return Math.round(round2(amount) * 100);
}

export function fromPaise(paise: number): number {
  return round2(paise / 100);
}

export function formatCurrency(amount: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fromPaise(toPaise(amount)));
}
