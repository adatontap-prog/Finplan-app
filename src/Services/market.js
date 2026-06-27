// src/services/market.js

const FALLBACK = {
  usdIdr:        17810,
  goldPerGram:   2711000,
  jewelryPerGram:1627000,
  goldSpot:      2557000,
  lastUpdated:   "fallback Juni 2026 — tekan Refresh",
};

export async function fetchMarketPrices() {
  try {
    // USD/IDR
    let usdIdr = FALLBACK.usdIdr;
    try {
      const fxRes  = await fetch("https://api.frankfurter.app/latest?from=USD&to=IDR");
      const fxData = await fxRes.json();
      if (fxData.rates?.IDR > 10000) usdIdr = fxData.rates.IDR;
    } catch (_) {}

    // Harga emas spot
    let antamPerGram   = FALLBACK.goldPerGram;
    let goldSpot       = FALLBACK.goldSpot;
    let jewelryPerGram = FALLBACK.jewelryPerGram;
    try {
      const goldRes  = await fetch("https://data-asg.goldprice.org/dbXRates/USD");
      const goldData = await goldRes.json();
      const oz       = goldData?.items?.[0]?.xauPrice;
      if (oz && oz > 1000) {
        goldSpot       = Math.round((oz / 31.1035) * usdIdr);
        antamPerGram   = Math.round(goldSpot * 1.06);
        jewelryPerGram = Math.round(goldSpot * 0.75 * 0.80);
      }
    } catch (_) {}

    return {
      usdIdr: Math.round(usdIdr),
      goldPerGram: antamPerGram,
      jewelryPerGram,
      goldSpot,
      lastUpdated: new Date().toLocaleTimeString("id-ID"),
    };
  } catch {
    return FALLBACK;
  }
}
