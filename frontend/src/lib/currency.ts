/** System default currency — override via setCurrencyConfig for multi-currency tenants. */
export const DEFAULT_CURRENCY = {
  code: "JOD",
  symbol: "JD",
  symbolAr: "د.أ",
  decimalPlaces: 2,
} as const;

export type CurrencyConfig = {
  code: string;
  symbol: string;
  symbolAr?: string;
  decimalPlaces: number;
};

let activeCurrency: CurrencyConfig = { ...DEFAULT_CURRENCY };

export function setCurrencyConfig(config: Partial<CurrencyConfig>): void {
  activeCurrency = { ...activeCurrency, ...config };
}

export function getCurrencyConfig(): CurrencyConfig {
  return activeCurrency;
}

function resolveLocale(locale?: string): string {
  if (locale) return locale;
  if (typeof document !== "undefined") return document.documentElement.lang || "en";
  return "en";
}

function getSymbol(locale?: string): string {
  const loc = resolveLocale(locale);
  return loc.startsWith("ar")
    ? (activeCurrency.symbolAr ?? activeCurrency.symbol)
    : activeCurrency.symbol;
}

function formatAmount(amount: number, locale?: string): string {
  const loc = resolveLocale(locale);
  const intlLocale = loc.startsWith("ar") ? "ar-JO" : "en-JO";
  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: activeCurrency.decimalPlaces,
    maximumFractionDigits: activeCurrency.decimalPlaces,
  }).format(amount);
}

/** Standard display format: `10.00 JD` */
export function formatCurrency(amount: number, locale?: string): string {
  return `${formatAmount(amount, locale)} ${getSymbol(locale)}`;
}

/** Compact format for chart axes and tight spaces. */
export function formatCurrencyCompact(amount: number, locale?: string): string {
  const sym = getSymbol(locale);
  if (Math.abs(amount) >= 1000) {
    const compact = new Intl.NumberFormat(resolveLocale(locale), {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
    return `${compact} ${sym}`;
  }
  return formatCurrency(amount, locale);
}
