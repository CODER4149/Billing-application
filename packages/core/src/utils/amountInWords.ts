import { fromPaise, round2, toPaise } from "./money.js";

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ` ${ones[o]}` : "");
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return (h ? `${ones[h]} Hundred${rest ? " " : ""}` : "") + (rest ? twoDigits(rest) : "");
}

function convertInteger(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Convert amount to Indian English words using paise-accurate rounding */
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "";

  const totalPaise = toPaise(amount);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  let words = convertInteger(rupees) + " Rupee" + (rupees === 1 ? "" : "s");
  if (paise > 0) {
    words += " and " + convertInteger(paise) + " Paise";
  }
  return words + " Only";
}

/** Normalize amount to 2 decimal places — use for display + words so both match */
export function normalizeMoney(amount: number): number {
  return fromPaise(toPaise(amount));
}

export { round2 };
