import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Rates = Record<string, number>;

export type Currency = {
  code: string;
  symbol: string;
};

const DEFAULT_CURRENCY: Currency = { code: "INR", symbol: "₹" };

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates; // base = INR
  convert: (amountInINR: number, toCode?: string) => number;
  format: (amountInINR: number, code?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const presetSymbols: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<Rates>({ INR: 1, USD: 0.012, EUR: 0.011, AED: 0.044 });

  useEffect(() => {
    // Use fallback rates since exchange API requires API key
    // These are approximate rates for demonstration
    const fallbackRates = {
      INR: 1,
      USD: 0.012,
      EUR: 0.011,
      AED: 0.044
    };
    setRates(fallbackRates);
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const convert = (amountInINR: number, toCode?: string) => {
      const code = toCode || currency.code;
      const rate = rates[code] ?? 1;
      return amountInINR * rate;
    };
    const format = (amountInINR: number, code?: string) => {
      const c = code || currency.code;
      const symbol = presetSymbols[c] || c + " ";
      const value = convert(amountInINR, c);
      return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };
    return { currency, setCurrency, rates, convert, format };
  }, [currency, rates]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
