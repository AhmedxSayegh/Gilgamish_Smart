import { AppError } from "./errors.js";
export const currencies = ["SAR", "USD", "EUR", "GBP", "AED", "TRY"];
export function cents(value) {
  const text = String(value);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text))
    throw new AppError(
      422,
      "INVALID_AMOUNT",
      "Amounts must be nonnegative with at most two decimal places.",
    );
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export const amount = (value) => (value / 100).toFixed(2);
export function sameCurrency(price, currency) {
  if (price.currency !== currency)
    throw new AppError(
      422,
      "CURRENCY_MISMATCH",
      `Offer currency ${price.currency} does not match ${currency}. Currency conversion is not enabled.`,
    );
}
