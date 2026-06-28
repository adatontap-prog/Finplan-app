// src/utils/finance.js
import { PIN_SALT } from "../config/constants";

// \u2500\u2500 Format \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function formatRupiah(num) {
  if (!num && num !== 0) return "Rp 0";
  if (num >= 1_000_000_000) return "Rp " + (num / 1_000_000_000).toFixed(2) + " M";
  if (num >= 1_000_000)     return "Rp " + (num / 1_000_000).toFixed(1) + " Jt";
  return "Rp " + Number(Math.round(num)).toLocaleString("id-ID");
}

export function formatFull(num) {
  if (!num && num !== 0) return "Rp 0";
  return "Rp " + Number(Math.round(num)).toLocaleString("id-ID");
}

// \u2500\u2500 Parse \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function parseAmount(str) {
  return parseInt(String(str).replace(/\D/g, "")) || 0;
}

export function parseDecimal(str) {
  return parseFloat(String(str).replace(/[^0-9.]/g, "")) || 0;
}

// \u2500\u2500 Asset valuation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function calcAssetValue(holding, prices) {
  if (!holding || !prices) return holding?.idrValue || 0;
  const qty = holding.qty || 0;
  switch (holding.assetType) {
    case "idr":
    case "obligasi":   return holding.idrValue || 0;
    case "usd":        return qty * (prices.usdIdr        || 17810);
    case "lm":         return qty * (prices.goldPerGram   || 2711000);
    case "jewelry":    return qty * (prices.jewelryPerGram || 1627000);
    case "stock_id":   return qty * (holding.manualPrice  || holding.buyPrice || 0) * 100;
    case "stock_us":   return qty * (holding.manualPrice  || holding.buyPrice || 0) * (prices.usdIdr || 17810);
    case "crypto":
    case "reksadana":
    case "etf":        return qty * (holding.manualPrice  || holding.buyPrice || 0);
    default:           return holding.idrValue || 0;
  }
}

// \u2500\u2500 Security \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data    = encoder.encode(pin + PIN_SALT);
  const hash    = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// \u2500\u2500 Gadai \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
export function hitungGadai(beratGram, kadar, hargaEmasPerGram, tenor) {
  const purity        = parseInt(kadar) / 24;
  const nilaiEmas     = beratGram * purity * hargaEmasPerGram;
  const nilaiTaksiran = Math.round(nilaiEmas * 0.92);
  const uangPinjaman  = Math.round(nilaiTaksiran * 0.90);
  const bungaPer15    = 1.2; // % per 15 hari \u2014 KCA emas
  const periode       = Math.ceil(tenor / 15);
  const totalBunga    = Math.round(uangPinjaman * (bungaPer15 / 100) * periode);
  const totalLunas    = uangPinjaman + totalBunga;
  const biayaAdmin    = Math.round(uangPinjaman * 0.01);
  return { nilaiEmas: Math.round(nilaiEmas), nilaiTaksiran, uangPinjaman, bungaPer15, periode, totalBunga, totalLunas, biayaAdmin };
}

export function hitungSisaHari(tanggalGadai, tenor) {
  const tglGadai = new Date(tanggalGadai);
  const tglJatuh = new Date(tglGadai);
  tglJatuh.setDate(tglJatuh.getDate() + parseInt(tenor));
  const sisa = Math.ceil((tglJatuh - new Date()) / (1000 * 60 * 60 * 24));
  return { tglJatuh, sisa };
}
