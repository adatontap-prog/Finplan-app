import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCL4pDGpsBt4yR_Y5OJS0BdqmSNf1h0JxM",
  authDomain: "finplan-adp.firebaseapp.com",
  projectId: "finplan-adp",
  storageBucket: "finplan-adp.firebasestorage.app",
  messagingSenderId: "528693206812",
  appId: "1:528693206812:web:8bce8d7bfa0d604ae7e4d9",
};

const EMAILJS_SERVICE_ID = "service_mwasugh";
const EMAILJS_TEMPLATE_ID = "template_oq3ro9o";
const EMAILJS_PUBLIC_KEY = "JgSEIph8MbKy6IXbK";
const REPORT_EMAIL = "dwistapratama@gmail.com";
const PROJECT_REPORT_EMAIL = "projectadpkai@gmail.com";
const REPORT_EMAILS = [REPORT_EMAIL, PROJECT_REPORT_EMAIL];
const ADMIN_USER = "Bape";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbx8vt1azC0xFS3v5Qbe_9ksbcXjvOmpBUxN5kt4b22nA1D5EFFob863Xve7RS_xxm6i/exec";
const AUTO_LOCK_MS = 30 * 60 * 1000; // 30 menit tidak aktif
const SESSION_MS = 12 * 60 * 60 * 1000; // 12 jam tetap login setelah refresh
const SESSION_KEY = "finplan_session_until";
const PIN_SALT = "finplan_adp_2026";
const PIN_DIGITS = 6;
const APP_VERSION = "FinPlan v1.1.0 Family Edition · Phase 6.3.2 Wallet UI Polish";

const FINANCIAL_MOVEMENT_TYPES = [
  { id: "income", label: "Pemasukan", effect: "wallet_increase", netWorth: "increase" },
  { id: "expense", label: "Pengeluaran", effect: "wallet_decrease", netWorth: "decrease" },
  { id: "transfer", label: "Transfer Antar Wallet", effect: "wallet_to_wallet", netWorth: "neutral" },
  { id: "goal_allocation", label: "Alokasi ke Goal", effect: "wallet_to_goal", netWorth: "neutral" },
  { id: "goal_withdrawal", label: "Tarik dari Goal", effect: "goal_to_wallet", netWorth: "neutral" },
  { id: "investment_buy", label: "Beli Investasi", effect: "wallet_to_asset", netWorth: "neutral" },
  { id: "investment_sell", label: "Jual Investasi", effect: "asset_to_wallet", netWorth: "gain_loss" },
  { id: "existing_asset", label: "Input Aset Sudah Dimiliki", effect: "asset_onboarding", netWorth: "asset_added_no_cashflow" },
  { id: "asset_to_goal", label: "Pindah Aset ke Goal", effect: "investment_to_goal", netWorth: "neutral" },
  { id: "loan_disbursement", label: "Pencairan Pinjaman", effect: "wallet_increase_liability_increase", netWorth: "neutral" },
  { id: "loan_repayment", label: "Pembayaran Pinjaman", effect: "wallet_decrease_liability_decrease", netWorth: "neutral_plus_fee" },
  { id: "fee_interest", label: "Biaya / Bunga", effect: "wallet_decrease", netWorth: "decrease" },
];


function hasValidSession() {
  if (typeof localStorage === "undefined") return false;
  const until = Number(localStorage.getItem(SESSION_KEY) || 0);
  return until > Date.now();
}

function saveSession() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MS));
}

function clearSession() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Google Sheets Sync
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const CATEGORIES = [
  { id: "gaji", label: "Gaji", icon: "\uD83D\uDCBC", type: "income" },
  { id: "freelance", label: "Freelance", icon: "\uD83D\uDDA5", type: "income" },
  { id: "investasi", label: "Investasi", icon: "\uD83D\uDCC8", type: "income" },
  { id: "lainnya_in", label: "Lainnya", icon: "\u2795", type: "income" },
  { id: "makan", label: "Makan", icon: "\uD83C\uDF5C", type: "expense" },
  { id: "transport", label: "Transport", icon: "\uD83D\uDE97", type: "expense" },
  { id: "belanja", label: "Belanja", icon: "\uD83D\uDECD", type: "expense" },
  { id: "tagihan", label: "Tagihan", icon: "\uD83D\uDCC4", type: "expense" },
  { id: "hiburan", label: "Hiburan", icon: "\uD83C\uDFAC", type: "expense" },
  { id: "kesehatan", label: "Kesehatan", icon: "\uD83C\uDFE5", type: "expense" },
  { id: "tabungan", label: "Tabungan", icon: "\uD83C\uDFE6", type: "expense" },
  { id: "lainnya_ex", label: "Lainnya", icon: "\u2796", type: "expense" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
const USERS = ["Bape","Ibu","Aroon","Arunika","Arkaja"];


const FAMILY_MEMBERS_V110 = [
  { id: "bape", name: "Bape", role: "Owner", status: "active", pinStatus: "Aktif", avatar: "👑" },
  { id: "ibu", name: "Ibu", role: "Admin", status: "active", pinStatus: "Siap", avatar: "🌸" },
  { id: "aroon", name: "Aroon", role: "Member", status: "active", pinStatus: "Perlu setup", avatar: "📚" },
  { id: "arunika", name: "Arunika", role: "Member", status: "active", pinStatus: "Perlu setup", avatar: "🎨" },
  { id: "arkaja", name: "Arkaja", role: "Viewer", status: "active", pinStatus: "Perlu setup", avatar: "🧸" },
];

const FAMILY_ROLES_V110 = [
  { id: "owner", label: "Owner", icon: "👑", desc: "Kontrol penuh keluarga, security, backup, dan database.", color: "#fbbf24" },
  { id: "admin", label: "Admin", icon: "🛡️", desc: "Mengelola transaksi, sumber dana, goal, dan laporan harian.", color: "#60a5fa" },
  { id: "member", label: "Member", icon: "👤", desc: "Input transaksi dan melihat goal sesuai izin yang diberikan.", color: "#34d399" },
  { id: "viewer", label: "Viewer", icon: "👁️", desc: "Melihat ringkasan tanpa akses ubah data penting.", color: "#a78bfa" },
];

const PERMISSIONS_V110 = [
  { id: "dashboard", label: "Dashboard", icon: "📊", group: "Core" },
  { id: "history", label: "Riwayat", icon: "📋", group: "Core" },
  { id: "transaction_add", label: "Tambah Transaksi", icon: "➕", group: "Transaksi" },
  { id: "transaction_edit", label: "Edit Transaksi", icon: "✏️", group: "Transaksi" },
  { id: "transaction_delete", label: "Hapus Transaksi", icon: "🗑️", group: "Transaksi" },
  { id: "transaction_edit_own", label: "Edit Transaksi Sendiri", icon: "✏️", group: "Transaksi" },
  { id: "transaction_edit_all", label: "Edit Semua Transaksi", icon: "📝", group: "Transaksi" },
  { id: "transaction_delete_own", label: "Hapus Transaksi Sendiri", icon: "🗑️", group: "Transaksi" },
  { id: "transaction_delete_all", label: "Hapus Semua Transaksi", icon: "🔥", group: "Transaksi" },
  { id: "goal_contribute", label: "Alokasi ke Goal", icon: "🎯", group: "Keuangan" },
  { id: "goals", label: "Tabungan / Goal", icon: "🎯", group: "Keuangan" },
  { id: "investments", label: "Investasi", icon: "📈", group: "Keuangan" },
  { id: "gadai", label: "Pinjaman / Loan", icon: "🏦", group: "Keuangan" },
  { id: "wallets", label: "Sumber Dana", icon: "👛", group: "Keuangan" },
  { id: "family_manage", label: "Family Management", icon: "👨‍👩‍👧‍👦", group: "Family Admin" },
  { id: "permission_manage", label: "Permission Manager", icon: "🛡️", group: "Family Admin" },
  { id: "security", label: "Security / PIN", icon: "🔐", group: "Family Admin" },
  { id: "sync", label: "Sync Google Sheets", icon: "📊", group: "Backup" },
  { id: "reports", label: "Email Report", icon: "✉️", group: "Backup" },
  { id: "backup", label: "Export Backup", icon: "💾", group: "Backup" },
  { id: "activity_log", label: "Activity Log", icon: "📝", group: "System" },
  { id: "recycle_bin", label: "Recycle Bin", icon: "♻️", group: "System" },
  { id: "settings", label: "Settings", icon: "⚙️", group: "Core" },
];

const ROLE_PERMISSION_PRESET_V110 = {
  Owner: PERMISSIONS_V110.map(p => p.id),
  Admin: ["dashboard", "history", "transaction_add", "transaction_edit", "transaction_edit_all", "goal_contribute", "goals", "investments", "gadai", "wallets", "sync", "reports", "settings"],
  Member: ["dashboard", "history", "transaction_add", "transaction_edit_own", "goal_contribute", "goals", "settings"],
  Viewer: ["dashboard", "history", "settings"],
};

const OWNER_LOCKED_PERMISSIONS_V110 = ["dashboard", "settings", "family_manage", "permission_manage", "security", "activity_log"];

function normalizePermissionData(data) {
  const allowedIds = new Set(PERMISSIONS_V110.map(p => p.id));
  const normalized = {};
  FAMILY_ROLES_V110.forEach(role => {
    const base = Array.isArray(data?.[role.label]) ? data[role.label] : (ROLE_PERMISSION_PRESET_V110[role.label] || []);
    const clean = base.filter(id => allowedIds.has(id));
    normalized[role.label] = role.label === "Owner"
      ? [...new Set([...clean, ...OWNER_LOCKED_PERMISSIONS_V110])]
      : [...new Set(clean)];
  });
  return normalized;
}

const SUMBER_DANA_PRESETS = [
  { name: "Cash", icon: "\uD83D\uDCB5" },
  { name: "Bank BCA", icon: "\uD83C\uDFE6" },
  { name: "Bank Mandiri", icon: "\uD83C\uDFE6" },
  { name: "Bank BNI", icon: "\uD83C\uDFE6" },
  { name: "Bank BRI", icon: "\uD83C\uDFE6" },
  { name: "GoPay", icon: "\uD83D\uDFE2" },
  { name: "OVO", icon: "\uD83D\uDFE3" },
  { name: "DANA", icon: "\uD83D\uDD35" },
  { name: "ShopeePay", icon: "\uD83D\uDFE0" },
  { name: "Lainnya", icon: "\uD83D\uDCB3" },
];

const WALLET_COLOR_PRESETS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Biru", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Hijau", value: "#10b981" },
  { name: "Kuning", value: "#f59e0b" },
  { name: "Merah", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Ungu", value: "#8b5cf6" },
  { name: "Slate", value: "#64748b" },
];

const ASSET_TYPES = [
  { id: "idr", label: "Rupiah (IDR)", icon: "\uD83D\uDCB5", unit: "IDR", dynamic: false },
  { id: "usd", label: "Dollar USD", icon: "\uD83C\uDDFA\uD83C\uDDF8", unit: "USD", dynamic: true },
  { id: "lm", label: "LM Antam", icon: "\uD83E\uDD47", unit: "gram", dynamic: true },
  { id: "jewelry", label: "Perhiasan 18K", icon: "\uD83D\uDC8D", unit: "gram", dynamic: true },
  { id: "stock_id", label: "Saham IDX", icon: "\uD83D\uDCC8", unit: "lot", dynamic: true, manual: true },
  { id: "stock_us", label: "Saham US", icon: "\uD83C\uDF10", unit: "lembar", dynamic: true },
  { id: "crypto", label: "Crypto", icon: "\u20BF", unit: "unit", dynamic: true },
  { id: "reksadana", label: "Reksa Dana", icon: "\uD83D\uDCC1", unit: "unit", dynamic: true, manual: true },
  { id: "obligasi", label: "Obligasi/Sukuk", icon: "\uD83D\uDCDC", unit: "IDR", dynamic: false },
  { id: "etf", label: "ETF", icon: "\uD83D\uDDC2", unit: "lot", dynamic: true },
];

const SAVINGS_GOALS = [
  { id: "aroon_sd", label: "SD Aroon (kelas 1-6)", icon: "\uD83D\uDCDA", category: "aroon", targetAmount: 61724880, yearsLeft: 1, color: "#6366f1", desc: "SD kelas 1-6 \u00B7 2026-2032" },
  { id: "aroon_smp", label: "SMP Aroon", icon: "\uD83D\uDCD6", category: "aroon", targetAmount: 63776196, yearsLeft: 6, color: "#8b5cf6", desc: "Mulai 2032 \u00B7 3 tahun" },
  { id: "aroon_sma", label: "SMA Aroon", icon: "\uD83D\uDCDD", category: "aroon", targetAmount: 127329175, yearsLeft: 9, color: "#a78bfa", desc: "Mulai 2035 \u00B7 3 tahun" },
  { id: "aroon_kuliah", label: "Kuliah Aroon", icon: "\uD83C\uDF93", category: "aroon", targetAmount: 2353821282, yearsLeft: 12, color: "#c4b5fd", desc: "Mulai 2038 \u00B7 Eropa/Aussie" },
  { id: "arunika_kg1", label: "Kindergarten 1 Arunika", icon: "\uD83C\uDFA8", category: "arunika", targetAmount: 7700000, yearsLeft: 1, color: "#ec4899", desc: "Mulai 2027" },
  { id: "arunika_kg2", label: "Kindergarten 2 Arunika", icon: "\uD83C\uDFA8", category: "arunika", targetAmount: 8470000, yearsLeft: 2, color: "#f472b6", desc: "Mulai 2028" },
  { id: "arunika_sd", label: "SD Arunika", icon: "\uD83D\uDCDA", category: "arunika", targetAmount: 63888000, yearsLeft: 3, color: "#f9a8d4", desc: "Mulai 2029 \u00B7 kelas 1-6" },
  { id: "arunika_smp", label: "SMP Arunika", icon: "\uD83D\uDCD6", category: "arunika", targetAmount: 84886116, yearsLeft: 9, color: "#fbcfe8", desc: "Mulai 2035 \u00B7 3 tahun" },
  { id: "arunika_sma", label: "SMA Arunika", icon: "\uD83D\uDCDD", category: "arunika", targetAmount: 169475132, yearsLeft: 12, color: "#fce7f3", desc: "Mulai 2038 \u00B7 3 tahun" },
  { id: "arunika_kuliah", label: "Kuliah Arunika", icon: "\uD83C\uDF93", category: "arunika", targetAmount: 3132936127, yearsLeft: 15, color: "#fbcfe8", desc: "Mulai 2041 \u00B7 Eropa/Aussie" },
  { id: "arkaja_nursery1", label: "Nursery 1 Arkaja", icon: "\uD83E\uDDF8", category: "arkaja", targetAmount: 5500000, yearsLeft: 1, color: "#10b981", desc: "Mulai Juli 2027" },
  { id: "arkaja_nursery2", label: "Nursery 2 Arkaja", icon: "\uD83E\uDDF8", category: "arkaja", targetAmount: 6050000, yearsLeft: 2, color: "#34d399", desc: "Mulai 2028" },
  { id: "arkaja_kg1", label: "Kindergarten 1 Arkaja", icon: "\uD83C\uDFA8", category: "arkaja", targetAmount: 9317000, yearsLeft: 3, color: "#6ee7b7", desc: "Mulai 2029" },
  { id: "arkaja_kg2", label: "Kindergarten 2 Arkaja", icon: "\uD83C\uDFA8", category: "arkaja", targetAmount: 10248700, yearsLeft: 4, color: "#a7f3d0", desc: "Mulai 2030" },
  { id: "arkaja_sd", label: "SD Arkaja", icon: "\uD83D\uDCDA", category: "arkaja", targetAmount: 77304480, yearsLeft: 5, color: "#d1fae5", desc: "Mulai 2031 \u00B7 kelas 1-6" },
  { id: "arkaja_smp", label: "SMP Arkaja", icon: "\uD83D\uDCD6", category: "arkaja", targetAmount: 102712201, yearsLeft: 11, color: "#a7f3d0", desc: "Mulai 2037 \u00B7 3 tahun" },
  { id: "arkaja_sma", label: "SMA Arkaja", icon: "\uD83D\uDCDD", category: "arkaja", targetAmount: 205064910, yearsLeft: 14, color: "#6ee7b7", desc: "Mulai 2040 \u00B7 3 tahun" },
  { id: "arkaja_kuliah", label: "Kuliah Arkaja", icon: "\uD83C\uDF93", category: "arkaja", targetAmount: 3790852713, yearsLeft: 17, color: "#34d399", desc: "Mulai 2043 \u00B7 Eropa/Aussie" },
  { id: "emergency", label: "Dana Darurat", icon: "\uD83D\uDEE1", category: "future", targetAmount: 60000000, yearsLeft: 2, color: "#f59e0b", desc: "Target 6x pengeluaran bulanan" },
  { id: "future", label: "Masa Depan", icon: "\uD83C\uDFE0", category: "future", targetAmount: 500000000, yearsLeft: 10, color: "#fbbf24", desc: "Aset & masa depan keluarga" },
  { id: "pension", label: "Dana Pensiun", icon: "\uD83D\uDC74", category: "pension", targetAmount: 3000000000, yearsLeft: 23, color: "#14b8a6", desc: "Target usia 60 tahun (2049)" },
  { id: "health", label: "Dana Kesehatan", icon: "\uD83C\uDFE5", category: "health", targetAmount: 150000000, yearsLeft: 5, color: "#ef4444", desc: "Cadangan di luar BPJS" },
  { id: "insurance", label: "Asuransi Jiwa", icon: "\uD83D\uDC8A", category: "health", targetAmount: 60000000, yearsLeft: 3, color: "#f87171", desc: "Premi asuransi jiwa keluarga" },
];

const CATEGORY_GROUPS = [
  { id: "education", label: "🎓 Pendidikan", color: "#6366f1" },
  { id: "future", label: "🏠 Masa Depan", color: "#f59e0b" },
  { id: "pension", label: "👴 Pensiun", color: "#14b8a6" },
  { id: "health", label: "🏥 Kesehatan", color: "#ef4444" },
];

const EDUCATION_CHILDREN = [
  { id: "aroon", label: "📚 Aroon" },
  { id: "arunika", label: "📚 Arunika" },
  { id: "arkaja", label: "📚 Arkaja" },
];

function getGoalStageLabel(goal) {
  const label = String(goal?.label || "").toLowerCase();
  if (label.includes("nursery 1")) return "Nursery 1";
  if (label.includes("nursery 2")) return "Nursery 2";
  if (label.includes("kindergarten 1")) return "Kindergarten 1";
  if (label.includes("kindergarten 2")) return "Kindergarten 2";
  if (label.includes("sd")) return "SD";
  if (label.includes("smp")) return "SMP";
  if (label.includes("sma")) return "SMA";
  if (label.includes("kuliah")) return "Kuliah";
  if (label.includes("darurat")) return "Dana Darurat";
  if (label.includes("pensiun")) return "Pensiun";
  if (label.includes("kesehatan")) return "Kesehatan";
  if (label.includes("asuransi")) return "Asuransi";
  return goal?.label || "Goal";
}

function getGoalPriorityLabel(goal) {
  if (["aroon", "arunika", "arkaja", "health", "pension"].includes(goal?.category)) return "Wajib";
  if (goal?.id === "emergency") return "Wajib";
  if (goal?.category === "future") return "Penting";
  return "Opsional";
}

function formatRupiah(num) {
  if (!num && num !== 0) return "Rp 0";
  if (num >= 1000000000) return "Rp " + (num / 1000000000).toFixed(2) + " M";
  if (num >= 1000000) return "Rp " + (num / 1000000).toFixed(1) + " Jt";
  return "Rp " + Number(Math.round(num)).toLocaleString("id-ID");
}

function formatFull(num) {
  if (!num && num !== 0) return "Rp 0";
  return "Rp " + Number(Math.round(num)).toLocaleString("id-ID");
}

function parseAmount(str) {
  var s = String(str); var d = ""; for (var i=0;i<s.length;i++){if(s[i]>="0"&&s[i]<="9")d+=s[i];} return parseInt(d||"0")||0;
}

function parseDecimal(str) {
  var s = String(str); var d = ""; for (var i=0;i<s.length;i++){if((s[i]>="0"&&s[i]<="9")||s[i]===".") d+=s[i];} return parseFloat(d||"0")||0;
}

// Calculate current value of an asset holding based on market prices
function calcAssetValue(holding, prices) {
  if (!holding || !prices) return holding?.idrValue || 0;
  switch (holding.assetType) {
    case "idr": return holding.idrValue || 0;
    case "usd": return (holding.qty || 0) * (prices.usdIdr || 16200);
    case "lm": return (holding.qty || 0) * (prices.goldPerGram || 1680000);
    case "jewelry": return (holding.qty || 0) * (prices.jewelryPerGram || 1010000);
    case "obligasi": return holding.idrValue || 0;
    case "stock_id": return (holding.qty || 0) * (holding.manualPrice || holding.buyPrice || 0) * 100;
    case "stock_us": return (holding.qty || 0) * (holding.manualPrice || holding.buyPrice || 0) * (prices.usdIdr || 16200);
    case "crypto": return (holding.qty || 0) * (holding.manualPrice || holding.buyPrice || 0);
    case "reksadana": return (holding.qty || 0) * (holding.manualPrice || holding.buyPrice || 0);
    case "etf": return (holding.qty || 0) * (holding.manualPrice || holding.buyPrice || 0);
    default: return holding.idrValue || 0;
  }
}

async function fetchMarketPrices() {
  const FALLBACK = { usdIdr: 17810, goldPerGram: 2711000, jewelryPerGram: 1627000, goldSpot: 2557000, lastUpdated: "fallback Juni 2026 \u2014 tekan Refresh" };
  try {
    let usdIdr = 17810;
    try {
      const fxRes = await fetch("https://api.frankfurter.app/latest?from=USD&to=IDR");
      const fxData = await fxRes.json();
      if (fxData.rates?.IDR > 10000) usdIdr = fxData.rates.IDR;
    } catch(e) {}

    let antamPerGram = 2711000;
    let goldSpot = 2557000;
    let jewelryPerGram = 1627000;
    try {
      const goldRes = await fetch("https://data-asg.goldprice.org/dbXRates/USD");
      const goldData = await goldRes.json();
      const goldUsdPerOz = goldData?.items?.[0]?.xauPrice;
      if (goldUsdPerOz && goldUsdPerOz > 1000) {
        const goldUsdPerGram = goldUsdPerOz / 31.1035;
        goldSpot = Math.round(goldUsdPerGram * usdIdr);
        antamPerGram = Math.round(goldSpot * 1.06);
        jewelryPerGram = Math.round(goldSpot * 0.75 * 0.80);
      }
    } catch(e) {}

    return { usdIdr: Math.round(usdIdr), goldPerGram: antamPerGram, jewelryPerGram, goldSpot, lastUpdated: new Date().toLocaleTimeString("id-ID") };
  } catch {
    return FALLBACK;
  }
}

// ===== GOOGLE SHEETS SYNC =====
async function syncToSheets(action, payload) {
  try {
    const res = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action, payload }),
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error("Sheets sync error:", e);
    return { success: false, message: e.message };
  }
}

async function syncAllToSheets(transactions, savingsData, savingsHoldings, investments, gadaiList, sumberDanaList) {
  // Format savings holdings into flat rows
  const savingsRows = [];
  Object.entries(savingsHoldings || {}).forEach(([goalId, holdings]) => {
    const goal = SAVINGS_GOALS.find(g => g.id === goalId);
    (holdings || []).forEach(h => {
      savingsRows.push({ ...h, goalId, goalLabel: (goal ? goal.label : "") || goalId });
    });
  });

  // Add cash savings
  Object.entries(savingsData || {}).forEach(([goalId, amount]) => {
    if (amount > 0) {
      const goal = SAVINGS_GOALS.find(g => g.id === goalId);
      savingsRows.push({ id: "cash_" + goalId, goalId, goalLabel: (goal ? goal.label : "") || goalId, assetType: "idr", qty: amount, unit: "IDR", buyPrice: 0, note: "Tunai IDR", addedAt: new Date().toISOString() });
    }
  });

  return await syncToSheets("syncAll", {
    transactions: transactions || [],
    savings: savingsRows,
    investments: investments || [],
    gadai: gadaiList || [],
    sumberDana: sumberDanaList || [],
  });
}

async function sendEmailReport(transactions) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const todayStr = today.toISOString().split("T")[0];
  const todayTxns = transactions.filter(t => t.date === todayStr);
  if (todayTxns.length === 0) return { success: false, message: "Tidak ada transaksi hari ini" };
  const userSummary = {};
  USERS.forEach(u => { userSummary[u] = { income: 0, expense: 0, items: [] }; });
  todayTxns.forEach(t => {
    if (!userSummary[t.user]) userSummary[t.user] = { income: 0, expense: 0, items: [] };
    if (t.type === "income") userSummary[t.user].income += t.amount;
    else userSummary[t.user].expense += t.amount;
    const cat = CATEGORIES.find(c => c.id === t.category);
    userSummary[t.user].items.push("  " + ((cat ? cat.icon : "")||"") + " " + ((cat ? cat.label : "")||"") + ": " + (t.type==="income"?"+":"-") + formatFull(t.amount) + (t.note ? " (" + t.note + ")" : ""));
  });
  let report = "📅 " + dateStr + "\n" + "=".repeat(40) + "\n\n";
  let totalIncome = 0, totalExpense = 0;
  Object.entries(userSummary).forEach(([user, data]) => {
    if (data.items.length === 0) return;
    report += "👤 " + user + "\n" + data.items.join("\n") + "\n  Saldo: " + formatFull(data.income - data.expense) + "\n\n";
    totalIncome += data.income; totalExpense += data.expense;
  });
  report += "=".repeat(40) + "\n? RINGKASAN KELUARGA\n📥 Pemasukan: " + formatFull(totalIncome) + "\n📤 Pengeluaran: " + formatFull(totalExpense) + "\n? Saldo: " + formatFull(totalIncome - totalExpense);
  try {
    const results = [];
    for (const toEmail of REPORT_EMAILS) {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { to_email: toEmail, date: dateStr, report } }),
      });
      results.push({ email: toEmail, ok: res.ok });
    }
    const failed = results.filter(r => !r.ok);
    return failed.length === 0
      ? { success: true, message: "Laporan terkirim ke email pribadi dan project" }
      : { success: false, message: "Gagal kirim ke: " + failed.map(f => f.email).join(", ") };
  } catch (e) { return { success: false, message: e.message }; }
}

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [savingsData, setSavingsData] = useState({});
  const [savingsHoldings, setSavingsHoldings] = useState({});
  const [marketPrices, setMarketPrices] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [savingsTab, setSavingsTab] = useState("education");
  const [selectedEducationChild, setSelectedEducationChild] = useState("aroon");
  const [showForm, setShowForm] = useState(false);
  const [showInvForm, setShowInvForm] = useState(false);
  const [showSavingsForm, setShowSavingsForm] = useState(null);
  const [showAssetConvert, setShowAssetConvert] = useState(null);
  const [showGadaiForm, setShowGadaiForm] = useState(false);
  const [showGadaiCalc, setShowGadaiCalc] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [gadaiList, setGadaiList] = useState([]);
  const [gadaiForm, setGadaiForm] = useState({ namaBarang: "", beratGram: "", kadar: "24", hargaEmas: "", nilaiTaksiran: "", uangPinjaman: "", tanggalGadai: new Date().toISOString().split("T")[0], tenor: "120", catatan: "" });
  const [gadaiSDId, setGadaiSDId] = useState("");
  const [loanPaymentLoan, setLoanPaymentLoan] = useState(null);
  const [loanPaymentForm, setLoanPaymentForm] = useState({ walletId: "", principal: "", fee: "", date: new Date().toISOString().split("T")[0], note: "" });
  const [calcForm, setCalcForm] = useState({ beratGram: "", kadar: "24", tenor: "120" });
  const [sumberDanaList, setSumberDanaList] = useState([]);
  const [sumberDanaLedger, setSumberDanaLedger] = useState([]);
  const [walletFilterUser, setWalletFilterUser] = useState("");
  const [showSDForm, setShowSDForm] = useState(false);
  const [sdForm, setSdForm] = useState({ name: "", icon: "\uD83D\uDCB5", initialBalance: "", color: "#6366f1", status: "active" });
  const [selectedSD, setSelectedSD] = useState(null);
  const [mergeTargetSDId, setMergeTargetSDId] = useState("");
  const [showArchivedWallets, setShowArchivedWallets] = useState(false);
  const [transactionSDId, setTransactionSDId] = useState("");
  const [savingsSDId, setSavingsSDId] = useState("");
  const [assetSDId, setAssetSDId] = useState("");
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("finplan_user") || "");
  const [form, setForm] = useState({ type: "expense", category: "makan", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
  const [invForm, setInvForm] = useState({ type: "usd", amount: "", buyPrice: "", note: "", buyDate: new Date().toISOString().split("T")[0] });
  const [savingsInput, setSavingsInput] = useState("");
  const [savingsInputDisplay, setSavingsInputDisplay] = useState("");
  const [assetForm, setAssetForm] = useState({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" });
  const [amountDisplay, setAmountDisplay] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterUser, setFilterUser] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState("");
  const [showSettingsCenter, setShowSettingsCenter] = useState(false);
  const [familyMembers, setFamilyMembers] = useState(FAMILY_MEMBERS_V110);
  const [familyLoaded, setFamilyLoaded] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editingFamilyMemberId, setEditingFamilyMemberId] = useState(null);
  const [familyForm, setFamilyForm] = useState({ name: "", role: "Member", avatar: "👤", status: "active" });
  const [familyStatus, setFamilyStatus] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [recycleStatus, setRecycleStatus] = useState("");
  const [rolePermissions, setRolePermissions] = useState(ROLE_PERMISSION_PRESET_V110);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [familyPanel, setFamilyPanel] = useState("members");
  const [familyView, setFamilyView] = useState("overview");
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  // ===== SECURITY STATES =====
  const [securityData, setSecurityData] = useState(null);
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [authStep, setAuthStep] = useState(() => hasValidSession() ? "unlocked" : "family"); // "family" | "userSelect" | "userPin" | "unlocked"
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [setupMode, setSetupMode] = useState(null); // null | "familyPw" | "userPin" | "confirmFamilyPw" | "confirmUserPin"
  const [pinConfirm, setPinConfirm] = useState("");
  const [tempPin, setTempPin] = useState("");
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    function mapDocs(snap) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    function sortTxns(items) {
      return [...items].sort((a, b) => {
        const av = String(a.createdAt || a.date || "");
        const bv = String(b.createdAt || b.date || "");
        return bv.localeCompare(av);
      });
    }

    // Recovery strategy:
    // Read transactions WITHOUT orderBy first. This avoids runtime failure if Firestore index/rules/field format changes.
    const unsub1 = onSnapshot(
      collection(db, "transactions"),
      snap => {
        const loadedTransactions = sortTxns(mapDocs(snap));
        setTransactions(loadedTransactions);
        setDataError("");
        setLoading(false);
      },
      err => {
        console.error("transactions listener error:", err);
        setDataError("Gagal membaca transactions: " + (err?.message || String(err)));
        setTransactions([]);
        setLoading(false);
      }
    );

    const unsub2 = onSnapshot(collection(db, "investments"), snap => { setInvestments(sortTxns(mapDocs(snap))); }, err => console.error("investments listener error:", err));
    const unsub3 = onSnapshot(doc(db, "savings", "goals"), snap => { if (snap.exists()) setSavingsData(snap.data()); }, err => console.error("savings goals listener error:", err));
    const unsub4 = onSnapshot(doc(db, "savings", "holdings"), snap => { if (snap.exists()) setSavingsHoldings(snap.data()); }, err => console.error("savings holdings listener error:", err));
    const unsub5 = onSnapshot(collection(db, "gadai"), snap => { setGadaiList(sortTxns(mapDocs(snap))); }, err => console.error("gadai listener error:", err));
    const unsub6 = onSnapshot(collection(db, "sumberDana"), snap => { setSumberDanaList(sortTxns(mapDocs(snap))); }, err => console.error("sumberDana listener error:", err));
    const unsub7 = onSnapshot(collection(db, "sumberDanaLedger"), snap => { setSumberDanaLedger(mapDocs(snap)); }, err => console.error("sumberDanaLedger listener error:", err));

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); };
  }, [currentUser]);

  useEffect(() => { if (activeTab === "invest" && !marketPrices) loadPrices(); }, [activeTab]);
  useEffect(() => { if (activeTab === "savings" && !marketPrices) loadPrices(); }, [activeTab]);
  useEffect(() => { if (currentUser && !walletFilterUser) setWalletFilterUser(currentUser); }, [currentUser]);

  // ===== FAMILY EDITION V1.1 PHASE 2 =====
  // Members are stored in Firebase, but the default family list stays as a safe fallback.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "family", "members"),
      snap => {
        const savedMembers = snap.exists() ? snap.data()?.members : null;
        if (Array.isArray(savedMembers) && savedMembers.length > 0) {
          setFamilyMembers(savedMembers);
        } else {
          setFamilyMembers(FAMILY_MEMBERS_V110);
        }
        setFamilyLoaded(true);
      },
      err => {
        console.error("family members listener error:", err);
        setFamilyMembers(FAMILY_MEMBERS_V110);
        setFamilyLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "family", "permissions"),
      snap => {
        const saved = snap.exists() ? snap.data()?.permissions : null;
        setRolePermissions(normalizePermissionData(saved));
        setPermissionsLoaded(true);
      },
      err => {
        console.error("family permissions listener error:", err);
        setRolePermissions(ROLE_PERMISSION_PRESET_V110);
        setPermissionsLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "activityLog"),
      snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setActivityLog(items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 50));
      },
      err => console.error("activityLog listener error:", err)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "recycleBin"),
      snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRecycleBin(items.sort((a, b) => String(b.deletedAt || b.createdAt || "").localeCompare(String(a.deletedAt || a.createdAt || ""))));
      },
      err => console.error("recycleBin listener error:", err)
    );
    return () => unsub();
  }, []);

  // Keep login simple after refresh: if session is still valid, restore last user automatically.
  useEffect(() => {
    if (hasValidSession() && authStep === "unlocked" && !currentUser) {
      const savedUser = localStorage.getItem("finplan_user") || "Bape";
      setCurrentUser(savedUser);
      setWalletFilterUser(savedUser);
      setActiveTab("dashboard");
      setShowSettingsCenter(false);
    }
  }, [authStep, currentUser]);

  // Recovery safety: if Firestore data is already available, never keep Ringkasan/Riwayat stuck in loading state.
  useEffect(() => {
    if (transactions.length > 0 && loading) setLoading(false);
  }, [transactions.length, loading]);

  // Load security data from Firebase
  useEffect(() => {
    let finished = false;

    const safetyTimer = setTimeout(() => {
      if (!finished) {
        console.warn("Security load timeout. Entering recovery mode.");
        finished = true;
        setSecurityData({});
        setSecurityLoaded(true);
        saveSession();
        setAuthStep("unlocked");
        setActiveTab("dashboard");
        const savedUser = localStorage.getItem("finplan_user") || "Bape";
        setCurrentUser(savedUser);
        setWalletFilterUser(savedUser);
      }
    }, 5000);

    const unsub = onSnapshot(
      doc(db, "settings", "security"),
      snap => {
        finished = true;
        clearTimeout(safetyTimer);
        if (snap.exists()) {
          setSecurityData(snap.data());
          setSecurityLoaded(true);
        } else {
          // First time - no security setup yet
          setSecurityData({});
          setSecurityLoaded(true);
          setSetupMode("familyPw");
        }
      },
      error => {
        console.error("Security load error:", error);
        finished = true;
        clearTimeout(safetyTimer);
        setSecurityData({});
        setSecurityLoaded(true);
        saveSession();
        setAuthStep("unlocked");
        setActiveTab("dashboard");
        const savedUser = localStorage.getItem("finplan_user") || "Bape";
        setCurrentUser(savedUser);
        setWalletFilterUser(savedUser);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsub();
    };
  }, []);

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    if (authStep !== "unlocked") return;
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("click", handleActivity);
    const timer = setInterval(() => {
      if (Date.now() - lastActivity > AUTO_LOCK_MS) {
        setShowSettingsCenter(false);
        setSetupMode(null);
        setTempPin("");
        setPinConfirm("");
        clearSession();
        setActiveTab("dashboard");
        setAuthStep("family");
        setPinInput("");
        setPinError("");
        setCurrentUser("");
        setWalletFilterUser("");
        localStorage.removeItem("finplan_user");
      }
    }, 10000); // check every 10 seconds
    return () => {
      clearInterval(timer);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, [authStep, lastActivity]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const lastSent = localStorage.getItem("finplan_last_report");
      const todayStr = now.toISOString().split("T")[0];
      if (now.getHours() >= 21 && lastSent !== todayStr && transactions.length > 0) {
        localStorage.setItem("finplan_last_report", todayStr);
        sendEmailReport(transactions);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [transactions]);

  async function loadPrices() { setLoadingPrices(true); setMarketPrices(await fetchMarketPrices()); setLoadingPrices(false); }

  // ===== SECURITY FUNCTIONS =====
  function handlePinPress(digit) {
    if (pinInput.length < PIN_DIGITS) {
      setPinInput(prev => prev + digit);
      setPinError("");
    }
  }

  function handlePinDelete() {
    setPinInput(prev => prev.slice(0, -1));
    setPinError("");
  }

  async function handleFamilyPwSubmit() {
    if (pinInput.length < PIN_DIGITS) return;
    const hashed = await hashPin(pinInput);
    if (hashed === securityData?.familyPwHash) {
      setAuthStep("userSelect");
      setPinInput("");
      setPinError("");
    } else {
      setPinError("Password salah! Coba lagi.");
      setPinInput("");
    }
  }

  async function handleUserPinSubmit() {
    if (pinInput.length < PIN_DIGITS) return;
    const hashed = await hashPin(pinInput);
    const userPins = securityData?.userPins || {};
    if (!userPins[currentUser]) {
      // No PIN set yet - go to setup
      setSetupMode("userPin");
      setTempPin(pinInput);
      setPinInput("");
    } else if (hashed === userPins[currentUser]) {
      saveSession();
      setAuthStep("unlocked");
      setActiveTab("dashboard");
      setShowSettingsCenter(false);
      setShowUserSelect(false);
      setPinInput("");
      setPinError("");
      setLastActivity(Date.now());
    } else {
      setPinError("PIN salah! Coba lagi.");
      setPinInput("");
    }
  }

  async function handleSetupFamilyPw() {
    if (pinInput.length < PIN_DIGITS) return;
    if (setupMode === "familyPw") {
      setTempPin(pinInput);
      setSetupMode("confirmFamilyPw");
      setPinInput("");
    } else if (setupMode === "confirmFamilyPw") {
      if (pinInput !== tempPin) {
        setPinError("Password tidak cocok! Ulangi.");
        setSetupMode("familyPw");
        setPinInput("");
        setTempPin("");
        return;
      }
      const hashed = await hashPin(pinInput);
      const newData = { ...(securityData || {}), familyPwHash: hashed };
      await setDoc(doc(db, "settings", "security"), newData);
      setSetupMode(null);
      setAuthStep("userSelect");
      setPinInput("");
      setPinError("");
    }
  }

  async function handleSetupUserPin() {
    if (pinInput.length < PIN_DIGITS) return;
    if (setupMode === "userPin") {
      setTempPin(pinInput);
      setSetupMode("confirmUserPin");
      setPinInput("");
    } else if (setupMode === "confirmUserPin") {
      if (pinInput !== tempPin) {
        setPinError("PIN tidak cocok! Ulangi.");
        setSetupMode("userPin");
        setPinInput("");
        setTempPin("");
        return;
      }
      const hashed = await hashPin(pinInput);
      const userPins = securityData?.userPins || {};
      const newData = { ...(securityData || {}), userPins: { ...userPins, [currentUser]: hashed } };
      await setDoc(doc(db, "settings", "security"), newData);
      setSetupMode(null);
      saveSession();
      setAuthStep("unlocked");
      setActiveTab("dashboard");
      setShowSettingsCenter(false);
      setShowUserSelect(false);
      setPinInput("");
      setPinError("");
      setLastActivity(Date.now());
    }
  }

  async function handleChangePw(type) {
    if (type === "family") {
      setSetupMode("familyPw");
      setAuthStep("family");
      setTempPin("");
      setPinInput("");
    } else {
      setSetupMode("userPin");
      setTempPin("");
      setPinInput("");
    }
  }

  function lockApp() {
    setShowSettingsCenter(false);
    setShowForm(false);
    setShowInvForm(false);
    setShowSavingsForm(null);
    setShowAssetConvert(null);
    setShowGadaiForm(false);
    setShowGadaiCalc(false);
    setGadaiSDId("");
    setShowSDForm(false);
    setShowUserSelect(false);
    setSelectedTransaction(null);
    setSelectedInvestment(null);
    setSelectedGoal(null);
    setSelectedCategory(null);
    setSelectedSD(null);
    setSetupMode(null);
    setActiveTab("dashboard");
    setTempPin("");
    setPinConfirm("");
    clearSession();
    setAuthStep("family");
    setPinInput("");
    setPinError("");
    setCurrentUser("");
    setWalletFilterUser("");
    localStorage.removeItem("finplan_user");
  }

  function handleUserSelectForPin(name) {
    setCurrentUser(name);
    localStorage.setItem("finplan_user", name);
    setWalletFilterUser(name);
    setLoading(true);
    // Check if user has PIN
    const userPins = securityData?.userPins || {};
    if (!userPins[name]) {
      // First time - setup PIN
      setSetupMode("userPin");
      setPinInput("");
    } else {
      setAuthStep("userPin");
      setPinInput("");
    }
  }

  function selectUser(name) { setCurrentUser(name); localStorage.setItem("finplan_user", name); setShowUserSelect(false); setLoading(true); setWalletFilterUser(name); }

  async function addActivityLog(action, detail) {
    try {
      await addDoc(collection(db, "activityLog"), {
        actor: currentUser || "System",
        action,
        detail: detail || "",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("activity log write error:", err);
    }
  }

  function getRecycleExpiryDate(days = 30) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  function getRecycleTypeLabel(type) {
    const labels = {
      transaction: "Transaksi",
      investment: "Investasi",
      gadai: "Gadai",
      wallet: "Sumber Dana",
      familyMember: "Anggota Keluarga",
      goal: "Goal",
    };
    return labels[type] || type || "Data";
  }

  function getRecycleItemTitle(item) {
    const data = item?.data || {};
    if (item?.type === "transaction") {
      const cat = getCategoryInfo(data.category);
      return (data.type === "income" ? "Pemasukan" : "Pengeluaran") + " · " + (cat.label || "Transaksi") + " · " + formatRupiah(data.amount || 0);
    }
    if (item?.type === "investment") return "Investasi " + (data.ticker || data.assetType || data.note || item.originalId || "");
    if (item?.type === "gadai") return "Gadai " + (data.namaBarang || item.originalId || "");
    if (item?.type === "wallet") return "Sumber Dana " + (data.name || item.originalId || "");
    if (item?.type === "familyMember") return "Anggota " + (data.name || item.originalId || "");
    return getRecycleTypeLabel(item?.type) + " " + (item?.originalId || "");
  }

  function showRecycleMessage(message) {
    setRecycleStatus(message || "");
    if (message) setTimeout(() => setRecycleStatus(""), 4500);
  }

  async function softDeleteRecord({ type, collectionName, id, data, relatedLedger = [], detail }) {
    const now = new Date().toISOString();
    await addDoc(collection(db, "recycleBin"), {
      type,
      collectionName,
      originalId: id,
      data: data || {},
      relatedLedger: relatedLedger || [],
      deletedBy: currentUser || "System",
      deletedAt: now,
      expiresAt: getRecycleExpiryDate(30),
      status: "active",
    });
    await deleteDoc(doc(db, collectionName, id));
    for (const l of relatedLedger || []) await deleteDoc(doc(db, "sumberDanaLedger", l.id));
    await addActivityLog(type + "_soft_deleted", detail || ("Masuk Recycle Bin: " + id));
  }

  async function restoreRecycleItem(item) {
    if (!isOwner && item.deletedBy !== currentUser) {
      showRecycleMessage("⚠️ Restore hanya bisa dilakukan Owner atau penghapus data.");
      return;
    }
    if (!item?.collectionName || !item?.originalId) return;
    await setDoc(doc(db, item.collectionName, item.originalId), {
      ...(item.data || {}),
      restoredAt: new Date().toISOString(),
      restoredBy: currentUser || "System",
    }, { merge: true });
    for (const l of item.relatedLedger || []) {
      const ledgerId = l.id || ("restored_" + Date.now());
      const { id, ...ledgerData } = l;
      await setDoc(doc(db, "sumberDanaLedger", ledgerId), {
        ...ledgerData,
        restoredAt: new Date().toISOString(),
        restoredBy: currentUser || "System",
      }, { merge: true });
    }
    await deleteDoc(doc(db, "recycleBin", item.id));
    await addActivityLog(item.type + "_restored", "Restore dari Recycle Bin: " + getRecycleItemTitle(item));
    showRecycleMessage("✅ Data berhasil direstore.");
  }

  async function permanentDeleteRecycleItem(item) {
    if (!isOwner) {
      showRecycleMessage("⚠️ Hapus permanen hanya bisa dilakukan Owner.");
      return;
    }
    if (!window.confirm("Hapus permanen item ini dari Recycle Bin? Data tidak bisa direstore.")) return;
    await deleteDoc(doc(db, "recycleBin", item.id));
    await addActivityLog(item.type + "_permanent_deleted", "Hapus permanen dari Recycle Bin: " + getRecycleItemTitle(item));
    showRecycleMessage("🗑 Data dihapus permanen dari Recycle Bin.");
  }

  async function purgeExpiredRecycleItems() {
    if (!isOwner) {
      showRecycleMessage("⚠️ Purge expired hanya untuk Owner.");
      return;
    }
    const now = new Date().toISOString();
    const expired = recycleBin.filter(item => item.expiresAt && item.expiresAt < now);
    for (const item of expired) await deleteDoc(doc(db, "recycleBin", item.id));
    await addActivityLog("recycle_bin_purged", "Purge expired Recycle Bin: " + expired.length + " item");
    showRecycleMessage("✅ " + expired.length + " item expired dibersihkan.");
  }

  function resetFamilyForm() {
    setShowFamilyForm(false);
    setEditingFamilyMemberId(null);
    setFamilyForm({ name: "", role: "Member", avatar: "👤", status: "active" });
  }

  async function saveFamilyMembers(nextMembers, action, detail) {
    const cleaned = nextMembers.map(m => ({
      id: m.id || ("member_" + Date.now()),
      name: String(m.name || "").trim(),
      role: m.role || "Member",
      status: m.status || "active",
      avatar: m.avatar || "👤",
      pinStatus: m.pinStatus || "Perlu setup",
      updatedAt: new Date().toISOString(),
    })).filter(m => m.name);

    await setDoc(doc(db, "family", "members"), {
      members: cleaned,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser || "System",
    });
    setFamilyMembers(cleaned);
    setFamilyStatus("✅ " + (detail || "Family members tersimpan"));
    setTimeout(() => setFamilyStatus(""), 3500);
    await addActivityLog(action || "family_update", detail || "Update anggota keluarga");
  }

  function startAddFamilyMember() {
    setEditingFamilyMemberId(null);
    setFamilyForm({ name: "", role: "Member", avatar: "👤", status: "active" });
    setShowFamilyForm(true);
    setFamilyStatus("");
  }

  function startEditFamilyMember(member) {
    setEditingFamilyMemberId(member.id);
    setFamilyForm({
      name: member.name || "",
      role: member.role || "Member",
      avatar: member.avatar || "👤",
      status: member.status || "active",
    });
    setShowFamilyForm(true);
    setFamilyStatus("");
  }

  async function handleSaveFamilyMember() {
    const name = familyForm.name.trim();
    if (!name) { setFamilyStatus("⚠️ Nama anggota wajib diisi"); return; }
    const duplicate = familyMembers.some(m => m.id !== editingFamilyMemberId && String(m.name || "").toLowerCase() === name.toLowerCase());
    if (duplicate) { setFamilyStatus("⚠️ Nama anggota sudah ada"); return; }

    const memberData = {
      id: editingFamilyMemberId || ("member_" + Date.now()),
      name,
      role: familyForm.role || "Member",
      avatar: familyForm.avatar || "👤",
      status: familyForm.status || "active",
      pinStatus: editingFamilyMemberId ? (familyMembers.find(m => m.id === editingFamilyMemberId)?.pinStatus || "Perlu setup") : "Perlu setup",
    };

    const nextMembers = editingFamilyMemberId
      ? familyMembers.map(m => m.id === editingFamilyMemberId ? { ...m, ...memberData } : m)
      : [...familyMembers, memberData];

    await saveFamilyMembers(nextMembers, editingFamilyMemberId ? "family_member_updated" : "family_member_added", (editingFamilyMemberId ? "Edit anggota: " : "Tambah anggota: ") + name);
    resetFamilyForm();
  }

  async function archiveFamilyMember(memberId) {
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) return;
    const nextMembers = familyMembers.map(m => m.id === memberId ? { ...m, status: m.status === "archived" ? "active" : "archived" } : m);
    await saveFamilyMembers(nextMembers, "family_member_status", (member.status === "archived" ? "Aktifkan anggota: " : "Arsipkan anggota: ") + member.name);
  }

  async function resetMemberPin(memberName) {
    const userPins = securityData?.userPins || {};
    const nextPins = { ...userPins };
    delete nextPins[memberName];
    const newData = { ...(securityData || {}), userPins: nextPins };
    await setDoc(doc(db, "settings", "security"), newData);
    setSecurityData(newData);
    setFamilyStatus("✅ PIN " + memberName + " direset. Saat login berikutnya, user akan membuat PIN baru.");
    setTimeout(() => setFamilyStatus(""), 5000);
    await addActivityLog("member_pin_reset", "Reset PIN: " + memberName);
  }

  // Calculate total value of a savings goal (IDR cash + all assets)
  function calcGoalValue(goalId) {
    const idrCash = savingsData[goalId] || 0;
    const holdings = (savingsHoldings[goalId] || []);
    const assetValue = holdings.reduce((sum, h) => sum + calcAssetValue(h, marketPrices), 0);
    return idrCash + assetValue;
  }

  function getTxnDate(t) {
    if (!t?.date) return null;
    if (typeof t.date === "string") {
      const parts = t.date.split("-");
      if (parts.length >= 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) return new Date(y, m, d);
      }
    }
    const d = new Date(t.date);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const userTxns = transactions.filter(t => filterUser === "semua" || t.user === filterUser);
  const yearsForSelectedMonth = userTxns
    .map(t => getTxnDate(t))
    .filter(d => d && d.getMonth() === filterMonth)
    .map(d => d.getFullYear());
  const currentYear = new Date().getFullYear();
  const targetYear = yearsForSelectedMonth.includes(currentYear)
    ? currentYear
    : (yearsForSelectedMonth.length ? Math.max(...yearsForSelectedMonth) : currentYear);

  const filteredMonthTxns = userTxns.filter(t => {
    const d = getTxnDate(t);
    return d && d.getMonth() === filterMonth && d.getFullYear() === targetYear;
  });

  // Recovery fallback: if selected month has no data but Firestore has transactions,
  // show latest transactions instead of empty screen.
  const monthTxns = filteredMonthTxns.length > 0 ? filteredMonthTxns : userTxns.slice(0, 50);
  const displayTxns = monthTxns.length > 0 ? monthTxns : transactions.slice(0, 50);
  const totalIncome = filteredMonthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredMonthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const expenseByCategory = {};
  monthTxns.filter(t => t.type === "expense").forEach(t => { expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount; });
  const usersWithData = [...new Set(transactions.map(t => t.user))];
  const barMax = Math.max(...Object.values(expenseByCategory), 1);

  const invTypeLabel = { usd: "\uD83D\uDCB5 USD", lm: "\uD83E\uDD47 LM Antam", jewelry: "\uD83D\uDC8D Perhiasan" };
  const invTypeUnit = { usd: "USD", lm: "gram", jewelry: "gram" };
  const invSummary = investments.map(inv => {
    const currentValue = calcAssetValue(inv, marketPrices);
    const buyValue = ["idr","obligasi"].includes(inv.assetType) ? (inv.idrValue || 0) : (inv.qty || inv.amount || 0) * (inv.buyPrice || 0);
    const profitLoss = currentValue - buyValue;
    return { ...inv, currentValue, profitLoss, pct: buyValue > 0 ? ((profitLoss / buyValue) * 100).toFixed(1) : 0 };
  });
  const totalInvBuy = investments.reduce((s, i) => s + (["idr","obligasi"].includes(i.assetType) ? (i.idrValue || 0) : (i.qty || i.amount || 0) * (i.buyPrice || 0)), 0);
  const totalInvNow = invSummary.reduce((s, i) => s + i.currentValue, 0);

  const totalSavingsTarget = SAVINGS_GOALS.reduce((s, g) => s + g.targetAmount, 0);
  const totalSavingsCurrent = SAVINGS_GOALS.reduce((s, g) => s + calcGoalValue(g.id), 0);

  const childTotals = ["aroon","arunika","arkaja"].map(child => {
    const goals = SAVINGS_GOALS.filter(g => g.category === child);
    return { child, target: goals.reduce((s,g) => s+g.targetAmount, 0), current: goals.reduce((s,g) => s+calcGoalValue(g.id), 0) };
  });

  async function addSavingsCash(goalId) {
    if (!canContributeGoal()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin alokasi dana ke Goal.");
      return;
    }
    const amt = parseAmount(savingsInput);
    if (!amt) return;
    if (!savingsSDId) {
      showAccessNotice("Pilih Sumber Dana agar dana yang masuk ke goal adalah dana nyata, bukan target kosong.");
      return;
    }
    const source = sumberDanaList.find(s => s.id === savingsSDId);
    if (!source || !isSumberDanaActive(source)) {
      showAccessNotice("Sumber Dana tidak aktif atau tidak ditemukan.");
      return;
    }
    const sourceBalance = calcSumberDanaBalance(savingsSDId);
    if (sourceBalance < amt) {
      const ok = window.confirm("Saldo " + (source.name || "Sumber Dana") + " lebih kecil dari alokasi. Lanjutkan dan biarkan saldo sumber dana menjadi minus?");
      if (!ok) return;
    }
    const goal = SAVINGS_GOALS.find(g => g.id === goalId);
    const goalLabel = goal?.label || goalId;
    const newData = { ...savingsData, [goalId]: (savingsData[goalId] || 0) + amt };
    await setDoc(doc(db, "savings", "goals"), newData);
    setSavingsData(newData);
    await logLedger(savingsSDId, -amt, "Alokasi tunai ke goal: " + goalLabel, "goal_allocation", goalId);
    await addActivityLog("goal_cash_allocated", currentUser + " alokasi " + formatRupiah(amt) + " dari " + (source.name || "Sumber Dana") + " ke " + goalLabel);
    syncToSheets("addSavingsCash", { goalId, goalLabel, amount: amt, sumberDanaId: savingsSDId, sumberDanaName: source.name || "", user: currentUser, createdAt: new Date().toISOString() });
    setShowSavingsForm(null); setSavingsInput(""); setSavingsInputDisplay(""); setSavingsSDId("");
  }


  async function cancelGoalCashAllocation(goalId, allocationId) {
    if (!canContributeGoal()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin membatalkan alokasi tunai Goal.");
      return;
    }
    const allocation = sumberDanaLedger.find(l => String(l.id) === String(allocationId));
    if (!allocation || allocation.cancelled || allocation.refType !== "goal_allocation") return;
    const refundAmount = Math.abs(Number(allocation.amount || 0));
    if (!refundAmount) return;

    const currentGoalCash = savingsData[goalId] || 0;
    if (currentGoalCash < refundAmount) {
      const okEnough = window.confirm("Dana tunai di goal lebih kecil dari alokasi yang akan dibatalkan. Lanjutkan dan set dana tunai goal ke Rp 0?");
      if (!okEnough) return;
    }

    const goal = SAVINGS_GOALS.find(g => g.id === goalId);
    const source = sumberDanaList.find(s => s.id === allocation.sumberDanaId);
    const ok = window.confirm("Batalkan alokasi tunai " + formatRupiah(refundAmount) + "? Wallet sumber akan dikembalikan dan dana tunai goal akan dikurangi.");
    if (!ok) return;

    const nextGoalCash = Math.max(currentGoalCash - refundAmount, 0);
    const newData = { ...savingsData, [goalId]: nextGoalCash };
    await setDoc(doc(db, "savings", "goals"), newData);
    setSavingsData(newData);

    await setDoc(doc(db, "sumberDanaLedger", allocation.id), {
      ...allocation,
      cancelled: true,
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser,
    });

    if (allocation.sumberDanaId) {
      await logLedger(allocation.sumberDanaId, refundAmount, "Batalkan alokasi tunai dari goal: " + (goal?.label || goalId), "goal_cash_cancel", allocation.id);
    }

    await addActivityLog("goal_cash_cancelled", currentUser + " membatalkan alokasi tunai " + formatRupiah(refundAmount) + " dari " + (goal?.label || goalId) + (source ? " ke " + source.name : ""));
    syncToSheets("cancelGoalCash", { goalId, goalLabel: goal?.label || goalId, allocationId, refundAmount, sumberDanaId: allocation.sumberDanaId || "", sumberDanaName: source?.name || "", user: currentUser, createdAt: new Date().toISOString() });
  }

  async function addSavingsAsset(goalId) {
    if (!canContributeGoal()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin alokasi aset ke Goal.");
      return;
    }
    const qty = parseDecimal(assetForm.qty);
    const rawPriceInput = parseAmount(assetForm.buyPrice) || parseDecimal(assetForm.buyPrice);
    const valueMode = assetForm.valueMode || "total";
    if (!qty) return;
    if (!["idr", "obligasi"].includes(assetForm.assetType) && !rawPriceInput) {
      showAccessNotice("Isi total nilai pembelian atau harga per unit agar nilai aset goal bisa dihitung dengan benar.");
      return;
    }
    if (!assetSDId) {
      showAccessNotice("Pilih Sumber Dana agar pembelian/alokasi aset tidak menjadi modal semu.");
      return;
    }

    const assetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);
    const buyValueIdr = ["idr","obligasi"].includes(assetForm.assetType)
      ? qty
      : (valueMode === "unit" ? qty * rawPriceInput : rawPriceInput);
    const buyPrice = ["idr","obligasi"].includes(assetForm.assetType)
      ? 0
      : (valueMode === "unit" ? rawPriceInput : (qty ? buyValueIdr / qty : 0));
    const source = sumberDanaList.find(s => s.id === assetSDId);
    if (!source || !isSumberDanaActive(source)) {
      showAccessNotice("Sumber Dana tidak aktif atau tidak ditemukan.");
      return;
    }
    const sourceBalance = calcSumberDanaBalance(assetSDId);
    if (sourceBalance < buyValueIdr) {
      const ok = window.confirm("Saldo " + (source.name || "Sumber Dana") + " lebih kecil dari nilai aset. Lanjutkan dan biarkan saldo sumber dana menjadi minus?");
      if (!ok) return;
    }

    const newHolding = {
      id: Date.now(),
      assetType: assetForm.assetType,
      qty,
      buyPrice,
      manualPrice: assetForm.manualPrice ? parseDecimal(assetForm.manualPrice) : null,
      ticker: assetForm.ticker || null,
      note: assetForm.note || null,
      idrValue: assetForm.assetType === "idr" ? qty : assetForm.assetType === "obligasi" ? qty : null,
      sumberDanaId: assetSDId,
      sumberDanaName: source.name || "",
      costBasisIdr: buyValueIdr,
      addedBy: currentUser,
      addedAt: new Date().toISOString(),
    };

    const existing = savingsHoldings[goalId] || [];
    const updated = { ...savingsHoldings, [goalId]: [...existing, newHolding] };
    await setDoc(doc(db, "savings", "holdings"), updated);
    setSavingsHoldings(updated);

    const goalLabel = SAVINGS_GOALS.find(g => g.id === goalId)?.label || goalId;
    await logLedger(assetSDId, -buyValueIdr, "Alokasi aset " + (assetType?.label||"") + " ke goal: " + goalLabel, "goal_asset_allocation", goalId);
    await addActivityLog("goal_asset_allocated", currentUser + " alokasi aset " + (assetType?.label || assetForm.assetType) + " senilai " + formatRupiah(buyValueIdr) + " dari " + (source.name || "Sumber Dana") + " ke " + goalLabel);

    // Sync ke Google Sheets
    syncToSheets("addSavings", { ...newHolding, goalId, goalLabel, unit: assetType?.unit || "" });

    setShowAssetConvert(null);
    setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" });
    setAssetSDId("");
  }

  async function cancelGoalAssetAllocation(goalId, holdingId) {
    if (!canContributeGoal()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin membatalkan alokasi aset Goal.");
      return;
    }
    const existing = savingsHoldings[goalId] || [];
    const holding = existing.find(h => String(h.id) === String(holdingId));
    if (!holding) return;
    const goal = SAVINGS_GOALS.find(g => g.id === goalId);
    const assetType = ASSET_TYPES.find(a => a.id === holding.assetType);
    const sourceId = holding.sumberDanaId;
    const source = sumberDanaList.find(s => s.id === sourceId);
    const refundValue = holding.costBasisIdr || (["idr","obligasi"].includes(holding.assetType) ? (holding.idrValue || holding.qty || 0) : ((holding.qty || 0) * (holding.buyPrice || 0)));
    const ok = window.confirm("Batalkan alokasi aset ini? Wallet sumber akan dikembalikan " + formatRupiah(refundValue) + " dan aset dihapus dari goal.");
    if (!ok) return;

    const updated = { ...savingsHoldings, [goalId]: existing.filter(h => String(h.id) !== String(holdingId)) };
    await setDoc(doc(db, "savings", "holdings"), updated);
    setSavingsHoldings(updated);

    if (sourceId && refundValue) {
      await logLedger(sourceId, refundValue, "Batalkan alokasi aset " + (assetType?.label || holding.assetType || "Aset") + " dari goal: " + (goal?.label || goalId), "goal_asset_cancel", String(holdingId));
    }
    await addActivityLog("goal_asset_cancelled", currentUser + " membatalkan alokasi aset " + (assetType?.label || holding.assetType || "Aset") + " senilai " + formatRupiah(refundValue) + " dari " + (goal?.label || goalId) + (source ? " ke " + source.name : ""));
    syncToSheets("cancelGoalAsset", { goalId, goalLabel: goal?.label || goalId, holdingId, refundValue, sumberDanaId: sourceId || "", sumberDanaName: source?.name || "", user: currentUser, createdAt: new Date().toISOString() });
  }

  async function removeHolding(goalId, holdingId) {
    const existing = savingsHoldings[goalId] || [];
    const updated = { ...savingsHoldings, [goalId]: existing.filter(h => h.id !== holdingId) };
    await setDoc(doc(db, "savings", "holdings"), updated);
    setSavingsHoldings(updated);
  }

  async function updateManualPrice(goalId, holdingId, newPrice) {
    const existing = savingsHoldings[goalId] || [];
    const updated = { ...savingsHoldings, [goalId]: existing.map(h => h.id === holdingId ? { ...h, manualPrice: parseDecimal(newPrice) } : h) };
    await setDoc(doc(db, "savings", "holdings"), updated);
    setSavingsHoldings(updated);
  }

  async function addTransaction() {
    if (!hasPermission("transaction_add")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin Tambah Transaksi.");
      return;
    }
    const amt = parseAmount(form.amount);
    if (!amt || !form.date || !transactionSDId) return;
    const sd = sumberDanaList.find(s => s.id === transactionSDId);
    const txData = { type: form.type, category: form.category, amount: amt, note: form.note, date: form.date, user: currentUser, sumberDanaId: transactionSDId, sumberDanaName: sd?.name || "", createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, "transactions"), txData);
    await logLedger(transactionSDId, form.type === "income" ? amt : -amt, (form.type === "income" ? "Pemasukan" : "Pengeluaran") + ": " + (form.note || CATEGORIES.find(c=>c.id===form.category)?.label||""), "transaction", docRef.id);
    // Sync ke Google Sheets
    syncToSheets("addTransaction", { ...txData, id: docRef.id });
    await addActivityLog("transaction_created", (form.type === "income" ? "Tambah pemasukan" : "Tambah pengeluaran") + ": " + formatRupiah(amt));
    setShowForm(false); setForm({ type: "expense", category: "makan", amount: "", note: "", date: new Date().toISOString().split("T")[0] }); setAmountDisplay(""); setTransactionSDId("");
  }

  async function addInvestment() {
    // Handled by addSavingsAsset with goalId "invest_cash" or "invest_asset"
  }

  async function addInvestmentAsset(type) {
    const qty = parseDecimal(assetForm.qty);
    const buyPrice = parseDecimal(assetForm.buyPrice);
    if (!qty) return;
    const idrValue = ["idr","obligasi"].includes(assetForm.assetType) ? qty : null;
    const at = ASSET_TYPES.find(a => a.id === assetForm.assetType);
    const docRef = await addDoc(collection(db, "investments"), {
      assetType: assetForm.assetType,
      qty,
      amount: qty,
      buyPrice,
      manualPrice: assetForm.manualPrice ? parseDecimal(assetForm.manualPrice) : null,
      ticker: assetForm.ticker || null,
      note: assetForm.note || null,
      idrValue,
      buyDate: new Date().toISOString().split("T")[0],
      type: assetForm.assetType,
      createdAt: new Date().toISOString(),
    });
    if (assetSDId) {
      const buyValueIdr = idrValue !== null ? qty : qty * buyPrice;
      await logLedger(assetSDId, -buyValueIdr, "Beli investasi: " + (assetForm.ticker || (at ? at.label : "")||""), "investment", docRef.id);
    }
    // Sync ke Google Sheets
    syncToSheets("addInvestment", { id: docRef.id, assetType: assetForm.assetType, ticker: assetForm.ticker, qty, unit: (at ? at.unit : "") || "", buyPrice, note: assetForm.note, buyDate: new Date().toISOString().split("T")[0] });
    setShowAssetConvert(null);
    setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" });
    setAssetSDId("");
  }

  async function deleteTransaction(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return false;
    if (!canDeleteTransaction(tx)) {
      showAccessNotice("Role " + currentRole + " tidak punya izin menghapus transaksi ini.");
      return false;
    }
    const relatedLedger = sumberDanaLedger.filter(l => l.refType === "transaction" && l.refId === id);
    await softDeleteRecord({
      type: "transaction",
      collectionName: "transactions",
      id,
      data: tx,
      relatedLedger,
      detail: "Hapus transaksi ke Recycle Bin: " + formatRupiah(tx.amount || 0),
    });
    syncToSheets("deleteTransaction", { id, softDelete: true });
    return true;
  }
  async function deleteInvestment(id) {
    if (!isOwner && !hasPermission("investments")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin menghapus investasi.");
      return false;
    }
    const inv = investments.find(i => i.id === id);
    if (!inv) return false;
    await softDeleteRecord({ type: "investment", collectionName: "investments", id, data: inv, detail: "Hapus investasi ke Recycle Bin" });
    return true;
  }

  // ===== GADAI FUNCTIONS =====
  function hitungGadai(beratGram, kadar, hargaEmasPerGram, tenor) {
    const purity = parseInt(kadar) / 24;
    const nilaiEmas = beratGram * purity * hargaEmasPerGram;
    const nilaiTaksiran = Math.round(nilaiEmas * 0.92);
    const uangPinjaman = Math.round(nilaiTaksiran * 0.90);
    // Bunga KCA: golongan berdasarkan pinjaman
    let bungaPer15 = 1.2; // % per 15 hari untuk emas
    const periode = Math.ceil(tenor / 15);
    const totalBunga = Math.round(uangPinjaman * (bungaPer15 / 100) * periode);
    const totalLunas = uangPinjaman + totalBunga;
    const biayaAdmin = Math.round(uangPinjaman * 0.01);
    return { nilaiEmas: Math.round(nilaiEmas), nilaiTaksiran, uangPinjaman, bungaPer15, periode, totalBunga, totalLunas, biayaAdmin };
  }

  function hitungSisaHari(tanggalGadai, tenor) {
    const tglGadai = new Date(tanggalGadai);
    const tglJatuh = new Date(tglGadai);
    tglJatuh.setDate(tglJatuh.getDate() + parseInt(tenor));
    const today = new Date();
    const sisa = Math.ceil((tglJatuh - today) / (1000 * 60 * 60 * 24));
    return { tglJatuh, sisa };
  }

  async function addGadai() {
    const berat = parseFloat(gadaiForm.beratGram);
    const harga = parseAmount(gadaiForm.hargaEmas) || ((marketPrices ? marketPrices.goldPerGram : 1680000) || 1680000);
    if (!berat || !gadaiForm.namaBarang) return;
    if (!gadaiSDId) {
      showAccessNotice("Pilih Sumber Dana tujuan pencairan pinjaman.");
      return;
    }
    const sd = activeFundingSourceOptions.find(s => s.id === gadaiSDId);
    if (!sd) {
      showAccessNotice("Sumber Dana tidak aktif/tidak ditemukan.");
      return;
    }
    const hasil = hitungGadai(berat, gadaiForm.kadar, harga, parseInt(gadaiForm.tenor));
    const gadaiData = {
      namaBarang: gadaiForm.namaBarang,
      loanType: "gadai",
      movementType: "loan_disbursement",
      liabilityType: "secured_loan",
      sumberDanaId: gadaiSDId,
      sumberDanaName: sd.name,
      principal: hasil.uangPinjaman,
      outstandingPrincipal: hasil.uangPinjaman,
      collateralStatus: "pledged",
      beratGram: berat, kadar: gadaiForm.kadar,
      hargaEmasGadai: harga, nilaiTaksiran: hasil.nilaiTaksiran,
      uangPinjaman: hasil.uangPinjaman, totalBunga: hasil.totalBunga,
      totalLunas: hasil.totalLunas, tanggalGadai: gadaiForm.tanggalGadai,
      tenor: parseInt(gadaiForm.tenor), catatan: gadaiForm.catatan,
      status: "aktif", createdAt: new Date().toISOString(), createdBy: currentUser,
    };
    const docRef = await addDoc(collection(db, "gadai"), gadaiData);
    await logLedger(gadaiSDId, hasil.uangPinjaman, "Pencairan pinjaman gadai: " + gadaiForm.namaBarang, "loan_disbursement", docRef.id);
    await addActivityLog("loan_disbursement", currentUser + " mencatat pencairan gadai " + gadaiForm.namaBarang + " sebesar " + formatFull(hasil.uangPinjaman) + " ke " + sd.name + ". Ini dicatat sebagai pinjaman/kewajiban, bukan income.");
    syncToSheets("addGadai", { ...gadaiData, id: docRef.id });
    setShowGadaiForm(false);
    setGadaiSDId("");
    setGadaiForm({ namaBarang: "", beratGram: "", kadar: "24", hargaEmas: "", nilaiTaksiran: "", uangPinjaman: "", tanggalGadai: new Date().toISOString().split("T")[0], tenor: "120", catatan: "" });
  }

  async function updateGadaiStatus(id, status) {
    const { updateDoc } = await import("firebase/firestore");
    const item = gadaiList.find(g => g.id === id);
    if (status === "lunas") {
      openLoanPayment(item);
      return;
    }
    await updateDoc(doc(db, "gadai", id), {
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
      collateralStatus: status === "lelang" ? "lost" : "pledged",
    });
    await addActivityLog("loan_status_updated", (item?.namaBarang || id) + " diubah status menjadi " + status + ".");
    syncToSheets("updateGadai", { id, status });
  }

  function openLoanPayment(loan) {
    if (!loan) return;
    const outstanding = Number(loan.outstandingPrincipal ?? loan.uangPinjaman ?? 0);
    const estimatedFee = Math.max(Number(loan.totalLunas || 0) - Number(loan.uangPinjaman || 0), 0);
    setLoanPaymentLoan(loan);
    setLoanPaymentForm({
      walletId: "",
      principal: String(outstanding || ""),
      fee: String(estimatedFee || ""),
      date: new Date().toISOString().split("T")[0],
      note: "",
    });
  }

  async function repayLoan() {
    if (!loanPaymentLoan) return;
    const { updateDoc } = await import("firebase/firestore");
    const principalPaid = parseAmount(loanPaymentForm.principal) || parseDecimal(loanPaymentForm.principal);
    const feePaid = parseAmount(loanPaymentForm.fee) || parseDecimal(loanPaymentForm.fee) || 0;
    const walletId = loanPaymentForm.walletId;
    if (!walletId) {
      showAccessNotice("Pilih Sumber Dana untuk pembayaran pinjaman.");
      return;
    }
    if (!principalPaid || principalPaid <= 0) {
      showAccessNotice("Isi pokok yang dibayar.");
      return;
    }
    const wallet = activeFundingSourceOptions.find(s => s.id === walletId);
    if (!wallet) {
      showAccessNotice("Sumber Dana tidak aktif/tidak ditemukan.");
      return;
    }
    const outstandingBefore = Number(loanPaymentLoan.outstandingPrincipal ?? loanPaymentLoan.uangPinjaman ?? 0);
    const paidPrincipalSafe = Math.min(principalPaid, outstandingBefore);
    const totalPaid = paidPrincipalSafe + feePaid;
    if (totalPaid <= 0) return;

    const newOutstanding = Math.max(outstandingBefore - paidPrincipalSafe, 0);
    const newStatus = newOutstanding <= 0 ? "lunas" : "aktif";

    const paymentData = {
      loanId: loanPaymentLoan.id,
      loanType: loanPaymentLoan.loanType || "gadai",
      title: loanPaymentLoan.namaBarang || "Pinjaman",
      walletId,
      walletName: wallet.name || "",
      amount: totalPaid,
      principalPaid: paidPrincipalSafe,
      feePaid,
      paymentDate: loanPaymentForm.date,
      note: loanPaymentForm.note || "",
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      movementType: "loan_repayment",
    };

    const payRef = await addDoc(collection(db, "loanPayments"), paymentData);
    await logLedger(walletId, -totalPaid, "Pembayaran pinjaman: " + (loanPaymentLoan.namaBarang || "Pinjaman"), "loan_repayment", payRef.id);

    if (feePaid > 0) {
      await addDoc(collection(db, "transactions"), {
        type: "expense",
        category: "lainnya",
        amount: feePaid,
        note: "Bunga/biaya pinjaman: " + (loanPaymentLoan.namaBarang || "Pinjaman"),
        user: currentUser,
        date: loanPaymentForm.date,
        createdAt: new Date().toISOString(),
        movementType: "fee_interest",
        refType: "loan_payment",
        refId: payRef.id,
      });
    }

    await updateDoc(doc(db, "gadai", loanPaymentLoan.id), {
      outstandingPrincipal: newOutstanding,
      status: newStatus,
      collateralStatus: newStatus === "lunas" ? "released" : "pledged",
      lastPaymentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    });

    await addActivityLog(
      "loan_repayment",
      currentUser + " membayar pinjaman " + (loanPaymentLoan.namaBarang || "Pinjaman") + " sebesar " + formatFull(totalPaid) +
      " dari " + (wallet.name || "Sumber Dana") + ". Pokok: " + formatFull(paidPrincipalSafe) +
      (feePaid > 0 ? ", bunga/biaya: " + formatFull(feePaid) : "") +
      (newStatus === "lunas" ? ". Pinjaman lunas dan jaminan dilepas." : ". Sisa pokok: " + formatFull(newOutstanding) + ".")
    );

    syncToSheets("loanRepayment", { ...paymentData, id: payRef.id, newOutstanding, status: newStatus });
    setLoanPaymentLoan(null);
    setLoanPaymentForm({ walletId: "", principal: "", fee: "", date: new Date().toISOString().split("T")[0], note: "" });
  }

  async function cancelLoanDisbursement(loan) {
    if (!loan) return;
    const { updateDoc } = await import("firebase/firestore");
    const outstanding = Number(loan.outstandingPrincipal ?? loan.uangPinjaman ?? 0);
    const principal = Number(loan.principal ?? loan.uangPinjaman ?? 0);
    if (loan.status !== "aktif") {
      showAccessNotice("Hanya pinjaman aktif yang bisa dibatalkan.");
      return;
    }
    if (outstanding !== principal) {
      showAccessNotice("Pinjaman sudah pernah dibayar. Gunakan alur pembayaran/pelunasan, bukan batal pencairan.");
      return;
    }
    if (!loan.sumberDanaId) {
      showAccessNotice("Pinjaman lama tidak punya data wallet pencairan, tidak bisa dibatalkan otomatis.");
      return;
    }
    const ok = window.confirm("Batalkan pencairan pinjaman " + (loan.namaBarang || "Pinjaman") + "? Wallet pencairan akan dikurangi kembali sebesar " + formatFull(principal) + " dan pinjaman ditandai batal.");
    if (!ok) return;

    await logLedger(loan.sumberDanaId, -principal, "Batalkan pencairan pinjaman gadai: " + (loan.namaBarang || "Pinjaman"), "loan_disbursement_cancel", loan.id);
    await updateDoc(doc(db, "gadai", loan.id), {
      status: "dibatalkan",
      outstandingPrincipal: 0,
      collateralStatus: "released",
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    });
    await addActivityLog("loan_disbursement_cancelled", currentUser + " membatalkan pencairan pinjaman " + (loan.namaBarang || "Pinjaman") + " sebesar " + formatFull(principal) + (loan.sumberDanaName ? " dari " + loan.sumberDanaName : "") + ".");
    syncToSheets("cancelLoanDisbursement", { id: loan.id, amount: principal, walletId: loan.sumberDanaId, user: currentUser, createdAt: new Date().toISOString() });
  }

  async function deleteGadai(id) {
    if (!isOwner && !hasPermission("gadai")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin menghapus gadai.");
      return false;
    }
    const item = gadaiList.find(g => g.id === id);
    if (!item) return false;
    const relatedLedger = sumberDanaLedger.filter(l =>
      (l.refType === "loan_disbursement" && l.refId === id) ||
      (l.refType === "loan_disbursement_cancel" && l.refId === id) ||
      (l.refType === "orphan_loan_disbursement_reversal" && l.refId === id)
    );
    await softDeleteRecord({
      type: "gadai",
      collectionName: "gadai",
      id,
      data: item,
      relatedLedger,
      detail: "Hapus pinjaman/gadai ke Recycle Bin: " + (item.namaBarang || id) + (relatedLedger.length ? " · ledger wallet ikut diamankan" : ""),
    });
    return true;
  }

  // ===== SUMBER DANA (FUNDING SOURCE) FUNCTIONS =====
  function calcSumberDanaBalance(sdId) {
    const sd = sumberDanaList.find(s => s.id === sdId);
    if (!sd) return 0;
    const ledgerSum = sumberDanaLedger.filter(l => l.sumberDanaId === sdId).reduce((s, l) => s + l.amount, 0);
    return (sd.initialBalance || 0) + ledgerSum;
  }

  async function logLedger(sumberDanaId, amount, note, refType, refId) {
    if (!sumberDanaId) return;
    await addDoc(collection(db, "sumberDanaLedger"), {
      sumberDanaId, amount, note: note || "", refType, refId: refId || null,
      createdAt: new Date().toISOString(),
    });
  }

  function getLedgerTypeLabel(refType) {
    const labels = {
      transaction: "Transaksi",
      investment: "Investasi",
      goal_allocation: "Alokasi Tunai Goal",
      goal_cash_cancel: "Batal Alokasi Tunai",
      goal_asset_allocation: "Alokasi Aset Goal",
      goal_asset_purchase: "Beli Aset Goal",
      goal_asset_cancel: "Batal Alokasi Aset",
      loan_disbursement: "Pencairan Pinjaman",
      loan_repayment: "Pembayaran Pinjaman",
      loan_disbursement_cancel: "Batal Pencairan Pinjaman",
      orphan_loan_disbursement_reversal: "Koreksi Pinjaman Lama",
      wallet_merge_in: "Merge Masuk",
      wallet_merge_out: "Merge Keluar",
      wallet_adjustment: "Penyesuaian Wallet",
    };
    return labels[refType] || refType || "Ledger";
  }

  function getWalletLedgerSorted(sdId) {
    return sumberDanaLedger
      .filter(l => l.sumberDanaId === sdId)
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function getOrphanLoanDisbursementLedgers(sdId) {
    const loanIds = new Set(gadaiList.map(g => g.id));
    const reversedIds = new Set(
      sumberDanaLedger
        .filter(l => l.refType === "orphan_loan_disbursement_reversal" && l.refId)
        .map(l => l.refId)
    );
    return sumberDanaLedger.filter(l =>
      l.sumberDanaId === sdId &&
      l.refType === "loan_disbursement" &&
      Number(l.amount || 0) > 0 &&
      l.refId &&
      !loanIds.has(l.refId) &&
      !reversedIds.has(l.id)
    );
  }

  async function reverseOrphanLoanDisbursement(ledger) {
    if (!ledger) return;
    const amount = Math.abs(Number(ledger.amount || 0));
    if (!amount) return;
    const ok = window.confirm("Koreksi pencairan pinjaman lama sebesar " + formatFull(amount) + "? Saldo wallet akan dikurangi kembali dengan ledger pembalik. Audit lama tetap disimpan.");
    if (!ok) return;
    await logLedger(
      ledger.sumberDanaId,
      -amount,
      "Koreksi ledger pinjaman lama/orphan: " + (ledger.note || ledger.refId || ""),
      "orphan_loan_disbursement_reversal",
      ledger.id
    );
    await addActivityLog("wallet_ledger_repaired", currentUser + " melakukan koreksi wallet atas pencairan pinjaman lama sebesar " + formatFull(amount) + ".");
    syncToSheets("walletLedgerRepair", { ledgerId: ledger.id, sumberDanaId: ledger.sumberDanaId, amount: -amount, user: currentUser, createdAt: new Date().toISOString() });
  }

  function getSumberDanaStatus(sd) {
    return sd?.status || (sd?.active === false ? "inactive" : "active");
  }

  function isSumberDanaActive(sd) {
    return getSumberDanaStatus(sd) === "active";
  }

  function openSumberDanaEditor(sd) {
    if (!sd) return;
    setSelectedSD(sd.id);
    setMergeTargetSDId("");
    setSdForm({
      name: sd.name || "",
      icon: sd.icon || "💵",
      initialBalance: String(sd.initialBalance || ""),
      color: sd.color || "#6366f1",
      status: getSumberDanaStatus(sd),
    });
  }

  function resetSumberDanaForm() {
    setShowSDForm(false);
    setSelectedSD(null);
    setMergeTargetSDId("");
    setSdForm({ name: "", icon: "💵", initialBalance: "", color: "#6366f1", status: "active" });
  }

  async function addSumberDana() {
    if (!hasPermission("wallets")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin mengelola Sumber Dana.");
      return;
    }
    if (!sdForm.name) return;
    const initBal = parseAmount(sdForm.initialBalance);
    await addDoc(collection(db, "sumberDana"), {
      user: currentUser,
      name: sdForm.name.trim(),
      icon: sdForm.icon || "💵",
      color: sdForm.color || "#6366f1",
      initialBalance: initBal,
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    });
    await addActivityLog("wallet_created", "Tambah Sumber Dana: " + sdForm.name.trim());
    resetSumberDanaForm();
  }

  async function saveSumberDanaChanges(id) {
    if (!hasPermission("wallets")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin mengubah Sumber Dana.");
      return;
    }
    const sd = sumberDanaList.find(s => s.id === id);
    if (!sd || !sdForm.name.trim()) return;
    const initBal = parseAmount(sdForm.initialBalance);
    await setDoc(doc(db, "sumberDana", id), {
      name: sdForm.name.trim(),
      icon: sdForm.icon || "💵",
      color: sdForm.color || sd.color || "#6366f1",
      initialBalance: initBal,
      status: sdForm.status || getSumberDanaStatus(sd),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    }, { merge: true });

    // Keep old transactions readable after rename.
    const relatedTransactions = transactions.filter(t => t.sumberDanaId === id);
    for (const tx of relatedTransactions) {
      await setDoc(doc(db, "transactions", tx.id), { sumberDanaName: sdForm.name.trim(), updatedAt: new Date().toISOString() }, { merge: true });
    }

    await addActivityLog("wallet_renamed", (sd.name || "Sumber Dana") + " → " + sdForm.name.trim());
    setSelectedSD(null);
    setMergeTargetSDId("");
  }

  async function setSumberDanaStatus(id, status) {
    if (!hasPermission("wallets")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin mengubah status Sumber Dana.");
      return;
    }
    const sd = sumberDanaList.find(s => s.id === id);
    if (!sd) return;
    await setDoc(doc(db, "sumberDana", id), {
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    }, { merge: true });
    await addActivityLog("wallet_status_updated", (sd.name || "Sumber Dana") + " → " + status);
    setSdForm(prev => ({ ...prev, status }));
  }

  async function mergeSumberDana(sourceId, targetId) {
    if (!hasPermission("wallets")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin merge Sumber Dana.");
      return;
    }
    if (!sourceId || !targetId || sourceId === targetId) return;
    const source = sumberDanaList.find(s => s.id === sourceId);
    const target = sumberDanaList.find(s => s.id === targetId);
    if (!source || !target) return;
    const ok = window.confirm("Merge " + source.name + " ke " + target.name + "? Semua ledger dan transaksi lama akan dipindahkan ke sumber dana tujuan.");
    if (!ok) return;

    const now = new Date().toISOString();
    const relatedLedger = sumberDanaLedger.filter(l => l.sumberDanaId === sourceId);
    for (const l of relatedLedger) {
      await setDoc(doc(db, "sumberDanaLedger", l.id), { sumberDanaId: targetId, mergedFrom: sourceId, updatedAt: now }, { merge: true });
    }

    const relatedTransactions = transactions.filter(t => t.sumberDanaId === sourceId);
    for (const tx of relatedTransactions) {
      await setDoc(doc(db, "transactions", tx.id), { sumberDanaId: targetId, sumberDanaName: target.name, mergedFromSumberDanaId: sourceId, updatedAt: now }, { merge: true });
    }

    const sourceInitialBalance = Number(source.initialBalance || 0);
    if (sourceInitialBalance !== 0) {
      await setDoc(doc(db, "sumberDana", targetId), {
        initialBalance: Number(target.initialBalance || 0) + sourceInitialBalance,
        updatedAt: now,
        updatedBy: currentUser,
      }, { merge: true });
    }

    await setDoc(doc(db, "sumberDana", sourceId), {
      status: "archived",
      initialBalance: 0,
      mergedInitialBalanceMoved: sourceInitialBalance,
      mergedInto: targetId,
      mergedIntoName: target.name,
      mergedAt: now,
      updatedAt: now,
      updatedBy: currentUser,
    }, { merge: true });

    await addActivityLog("wallet_merged", source.name + " → " + target.name + " (" + relatedTransactions.length + " transaksi, " + relatedLedger.length + " ledger, saldo awal dipindah " + formatRupiah(sourceInitialBalance) + ")");
    setSelectedSD(null);
    setMergeTargetSDId("");
    setShowArchivedWallets(true);
  }

  async function deleteSumberDana(id) {
    if (!isOwner) {
      showAccessNotice("Hapus permanen Sumber Dana hanya bisa dilakukan oleh Owner.");
      return;
    }
    const sd = sumberDanaList.find(s => s.id === id);
    if (!sd) return;
    const hasUsage = transactions.some(t => t.sumberDanaId === id) || sumberDanaLedger.some(l => l.sumberDanaId === id);
    if (hasUsage) {
      showAccessNotice("Sumber Dana masih punya transaksi/ledger. Gunakan Archive atau Merge agar data tidak hilang.");
      return;
    }
    if (!window.confirm("Hapus permanen " + sd.name + "?")) return;
    await deleteDoc(doc(db, "sumberDana", id));
    await addActivityLog("wallet_deleted", "Hapus permanen Sumber Dana: " + sd.name);
    setSelectedSD(null);
  }

  const activeFundingSourceOptions = sumberDanaList.filter(sd => isSumberDanaActive(sd));
  const myFundingSources = activeFundingSourceOptions.filter(sd => sd.user === currentUser);
  const goalFundingSources = myFundingSources.length > 0 ? myFundingSources : activeFundingSourceOptions;

  async function handleSyncAll() {
    setSyncingSheets(true);
    setSheetsStatus("");
    const result = await syncAllToSheets(transactions, savingsData, savingsHoldings, investments, gadaiList, sumberDanaList);
    setSyncingSheets(false);
    setSheetsStatus(result.success ? "\u2705 Google Sheets tersync!" : "\u274C " + (result.message || "Gagal sync"));
    setTimeout(() => setSheetsStatus(""), 5000);
  }

  async function handleSendReport() {
    setSending(true);
    const result = await sendEmailReport(transactions);
    setSending(false); setEmailStatus(result.success ? "\u2705 " + (result.message || "Laporan terkirim!") : "\u274C " + result.message);
    setTimeout(() => setEmailStatus(""), 4000);
  }

  function exportBackupJSON() {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: "FinPlan ADP",
      version: "Kai-dev v1.4 backup-ready",
      transactions,
      investments,
      savingsData,
      savingsHoldings,
      gadaiList,
      sumberDanaList,
      sumberDanaLedger,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = "finplan-backup-" + date + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const EXPENSE_CATS = CATEGORIES.filter(c => c.type === "expense");
  const INCOME_CATS = CATEGORIES.filter(c => c.type === "income");
  const tabStyle = (key) => ({ flex: "1 1 118px", minWidth: 0, padding: "8px 8px", border: "none", cursor: "pointer", borderRadius: "10px", fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", textAlign: "center", background: activeTab === key ? "#6366f1" : "transparent", color: activeTab === key ? "#fff" : "#666", transition: "all 0.2s" });
  const savTabStyle = (key) => ({ padding: "6px 12px", border: "none", cursor: "pointer", borderRadius: "20px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", flex: "1 1 auto", background: savingsTab === key ? "#6366f1" : "rgba(255,255,255,0.07)", color: savingsTab === key ? "#fff" : "#888" });
  const inputStyle = { width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 14px", color: "#fff", fontSize: "14px", fontWeight: 600, outline: "none", boxSizing: "border-box" };
  const selectedAssetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);

  const familySourceMembers = Array.isArray(familyMembers) && familyMembers.length > 0 ? familyMembers : FAMILY_MEMBERS_V110;
  const activeFamilyMembers = familySourceMembers.filter(member => member.status !== "archived");
  const familyEditionMembers = familySourceMembers.map(member => {
    const hasPin = Boolean((securityData?.userPins || {})[member.name]);
    return {
      ...member,
      transactionCount: transactions.filter(t => t.user === member.name).length,
      walletCount: sumberDanaList.filter(sd => sd.user === member.name).length,
      isCurrent: member.name === currentUser,
      pinStatus: hasPin ? "PIN aktif" : "Perlu setup",
    };
  });
  const currentFamilyMember = familyEditionMembers.find(member => member.name === currentUser) || familyEditionMembers[0] || FAMILY_MEMBERS_V110[0];
  const userFilterNames = [...new Set([...familyEditionMembers.filter(m => m.status !== "archived").map(m => m.name), ...usersWithData])];
  const currentRole = currentFamilyMember?.role || "Viewer";
  const isOwner = currentRole === "Owner";
  const effectiveRolePermissions = normalizePermissionData(rolePermissions);
  function permissionsForRole(roleLabel = currentRole) {
    return effectiveRolePermissions?.[roleLabel] || ROLE_PERMISSION_PRESET_V110[roleLabel] || [];
  }
  function hasPermission(permissionId, roleLabel = currentRole) {
    return permissionsForRole(roleLabel).includes(permissionId);
  }
  function canContributeGoal() {
    return isOwner || hasPermission("goal_contribute") || hasPermission("goals");
  }
  function canEditTransaction(tx) {
    if (!tx) return false;
    if (isOwner || hasPermission("transaction_edit_all")) return true;
    if ((hasPermission("transaction_edit_own") || (hasPermission("transaction_edit") && currentRole === "Member")) && tx.user === currentUser) return true;
    return hasPermission("transaction_edit") && currentRole === "Admin";
  }
  function canDeleteTransaction(tx) {
    if (!tx) return false;
    if (isOwner || hasPermission("transaction_delete_all")) return true;
    if ((hasPermission("transaction_delete_own") || (hasPermission("transaction_delete") && currentRole === "Member")) && tx.user === currentUser) return true;
    return hasPermission("transaction_delete") && currentRole === "Admin";
  }
  const canManageFamily = isOwner || hasPermission("family_manage");
  const canManagePermissions = isOwner;
  const canAccessFamilyPage = canManageFamily || canManagePermissions;
  const isAdminOrOwner = currentRole === "Owner" || currentRole === "Admin";
  const rolePermissionSummary = FAMILY_ROLES_V110.map(role => {
    const permissions = permissionsForRole(role.label);
    return { ...role, permissions, count: permissions.length };
  });
  const showTimeFilters = activeTab === "dashboard" || activeTab === "history";
  const showMainNav = activeTab !== "family";

  function showAccessNotice(message) {
    setShowSettingsCenter(false);
    setEmailStatus("⛔ " + message);
    setTimeout(() => setEmailStatus(""), 4200);
  }

  function openUserSwitcher() {
    setShowSettingsCenter(false);
    setShowForm(false);
    setSelectedTransaction(null);
    setSelectedCategory(null);
    setSetupMode(null);
    setTempPin("");
    setPinConfirm("");
    setPinInput("");
    setPinError("");
    setActiveTab("dashboard");
    setAuthStep("userSelect");
  }

  async function saveRolePermissions(nextPermissions, detail) {
    if (!canManagePermissions) {
      showAccessNotice("Permission Manager hanya bisa dikelola oleh Owner.");
      return;
    }
    const normalized = normalizePermissionData(nextPermissions);
    await setDoc(doc(db, "family", "permissions"), {
      permissions: normalized,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser || "System",
    });
    setRolePermissions(normalized);
    setFamilyStatus("✅ Permission role tersimpan");
    setTimeout(() => setFamilyStatus(""), 3500);
    await addActivityLog("permissions_updated", detail || "Update permission role");
  }

  async function toggleRolePermission(roleLabel, permissionId) {
    if (!canManagePermissions) {
      showAccessNotice("Permission Manager hanya bisa dikelola oleh Owner.");
      return;
    }
    if (roleLabel === "Owner" && OWNER_LOCKED_PERMISSIONS_V110.includes(permissionId)) {
      setFamilyStatus("⚠️ Permission inti Owner dikunci agar tidak terjadi lockout.");
      setTimeout(() => setFamilyStatus(""), 3500);
      return;
    }
    const current = permissionsForRole(roleLabel);
    const nextForRole = current.includes(permissionId)
      ? current.filter(id => id !== permissionId)
      : [...current, permissionId];
    await saveRolePermissions({ ...effectiveRolePermissions, [roleLabel]: nextForRole }, roleLabel + " permission: " + permissionId);
  }

  function openFamilyManagement(panel = "members") {
    if (!canAccessFamilyPage) {
      showAccessNotice("Family Management hanya bisa diakses role yang memiliki izin Family Admin.");
      setActiveTab("dashboard");
      return;
    }
    setFamilyPanel(panel);
    setFamilyView("management");
    setShowSettingsCenter(false);
    setActiveTab("family");
  }

  function openPermissionManager() {
    if (!canManagePermissions) {
      showAccessNotice("Permission Manager hanya bisa dikelola oleh Owner.");
      setActiveTab("dashboard");
      return;
    }
    openFamilyManagement("permissions");
  }

  function openWalletManager() {
    if (!hasPermission("wallets")) {
      showAccessNotice("Sumber Dana belum diizinkan untuk role " + currentRole + ".");
      setActiveTab("dashboard");
      return;
    }
    setShowSettingsCenter(false);
    setActiveTab("dompet");
  }

  function getTransactionIcon(tx) {
    const note = String(tx?.note || "").toLowerCase();
    const cat = CATEGORIES.find(c => c.id === tx?.category) || {};
    if (cat?.icon && cat.icon !== "?") return cat.icon;
    if (note.includes("pizza")) return "🍕";
    if (note.includes("kopi") || note.includes("coffee") || note.includes("coffe") || note.includes("matcha")) return "☕";
    if (note.includes("juice") || note.includes("jus")) return "🥤";
    if (note.includes("ayam")) return "🍗";
    if (note.includes("hokben") || note.includes("makan")) return "🍜";
    if (tx?.category === "makan") return "🍜";
    if (tx?.category === "belanja") return "🛍️";
    if (tx?.category === "tagihan") return "📄";
    if (tx?.category === "hiburan") return "🎬";
    if (tx?.category === "kesehatan") return "🏥";
    if (tx?.type === "income") return "📥";
    return "🧾";
  }

  function getCategoryInfo(categoryId) {
    return CATEGORIES.find(c => c.id === categoryId) || { label: categoryId || "Tanpa kategori", icon: "🧾" };
  }

  function getTypeInfo(type) {
    if (type === "income") return { label: "Pemasukan", icon: "📥", color: "#34d399" };
    if (type === "expense") return { label: "Pengeluaran", icon: "📤", color: "#f87171" };
    if (type === "investment") return { label: "Investasi", icon: "📈", color: "#60a5fa" };
    if (type === "savings") return { label: "Tabungan", icon: "🎯", color: "#a78bfa" };
    return { label: type || "Transaksi", icon: "🧾", color: "#e5e7eb" };
  }

  // ===== PIN PAD COMPONENT =====
  const PinPad = ({ onPress, onDelete, onSubmit, disabled }) => {
    const digits = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","\u232B"]];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "240px", margin: "0 auto" }}>
        {digits.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            {row.map((d, j) => (
              <button key={j} onClick={() => d === "\u232B" ? onDelete() : d ? onPress(d) : null}
                disabled={disabled || (!d && d !== "0")}
                style={{
                  width: "62px", height: "62px", borderRadius: "50%", border: "none",
                  background: d ? "rgba(255,255,255,0.1)" : "transparent",
                  color: "#fff", fontSize: d === "\u232B" ? "22px" : "24px",
                  fontWeight: 800, cursor: d ? "pointer" : "default",
                  transition: "all 0.15s",
                  opacity: (!d && d !== "0") ? 0 : 1,
                }}>{d}</button>
            ))}
          </div>
        ))}
        <button onClick={onSubmit} style={{
          width: "100%", padding: "12px", borderRadius: "14px", border: "none",
          background: "linear-gradient(135deg,#6366f1,#7c3aed)",
          color: "#fff", fontSize: "16px", fontWeight: 800,
          cursor: "pointer", marginTop: "4px",
          opacity: pinInput.length === PIN_DIGITS ? 1 : 0.4,
        }}>Konfirmasi</button>
      </div>
    );
  };

  const PinDots = ({ filled }) => (
    <div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "16px 0" }}>
      {Array.from({ length: PIN_DIGITS }).map((_, i) => (
        <div key={i} style={{
          width: i < filled ? "12px" : "12px",
          height: i < filled ? "12px" : "12px",
          borderRadius: "50%",
          background: i < filled ? "#6366f1" : "rgba(255,255,255,0.2)",
          transition: "all 0.15s",
          transform: i < filled ? "scale(1.2)" : "scale(1)",
        }} />
      ))}
    </div>
  );

  const SettingsCenterModal = () => {
    if (!showSettingsCenter) return null;
    const sectionStyle = { padding: "14px", borderRadius: "18px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: "9px" };
    const sectionTitleStyle = { fontSize: "11px", letterSpacing: "1.8px", textTransform: "uppercase", color: "#94a3b8", fontWeight: 900, marginBottom: "2px" };
    const btnBase = { padding: "13px 14px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 900, textAlign: "left", cursor: "pointer", width: "100%" };
    const SettingButton = ({ children, onClick, tone = "default" }) => {
      const tones = {
        default: { background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" },
        purple: { background: "rgba(99,102,241,0.14)", color: "#c7d2fe", border: "1px solid rgba(99,102,241,0.30)" },
        green: { background: "rgba(16,185,129,0.12)", color: "#86efac", border: "1px solid rgba(16,185,129,0.24)" },
        amber: { background: "rgba(245,158,11,0.14)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" },
        red: { background: "rgba(248,113,113,0.10)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.25)" },
      };
      return <button onClick={onClick} style={{ ...btnBase, ...(tones[tone] || tones.default) }}>{children}</button>;
    };
    const Section = ({ title, children }) => children ? <div style={sectionStyle}><div style={sectionTitleStyle}>{title}</div>{children}</div> : null;
    return (
      <div onClick={() => setShowSettingsCenter(false)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99996,
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box"
      }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{
          width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", overflowX: "hidden",
          background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box",
          boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#6366f1", fontWeight: 900, textTransform: "uppercase" }}>Settings Center</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Pengaturan FinPlan</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>{currentFamilyMember?.avatar} {currentUser} · {currentRole}</div>
            </div>
            <button onClick={() => setShowSettingsCenter(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <Section title="Akun & Login">
              <SettingButton onClick={openUserSwitcher}>👤 Ganti / Pilih User</SettingButton>
              <SettingButton onClick={() => { setShowSettingsCenter(false); handleChangePw("user"); }}>🔑 Ganti PIN Saya</SettingButton>
            </Section>

            <Section title="Family Admin">
              {canManageFamily && <SettingButton onClick={() => openFamilyManagement("members")} tone="purple">👨‍👩‍👧 Family Management</SettingButton>}
              {canManagePermissions && <SettingButton onClick={openPermissionManager} tone="purple">🛡️ Permission Manager</SettingButton>}
              {hasPermission("security") && <SettingButton onClick={() => { setShowSettingsCenter(false); handleChangePw("family"); }}>🔐 Ganti Password Keluarga</SettingButton>}
              {hasPermission("security") && <SettingButton onClick={() => openFamilyManagement("members")}>🔑 Reset PIN Anggota</SettingButton>}
            </Section>

            <Section title="Keuangan Settings">
              {hasPermission("wallets") && <SettingButton onClick={openWalletManager} tone="green">🏦 Kelola Sumber Dana / Wallet v2</SettingButton>}
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.16)", color: "#a7f3d0", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>
                Settings hanya untuk konfigurasi keuangan. Tabungan / Goal dan Investasi tetap berada di navigasi utama agar tidak tercampur dengan pengaturan.
              </div>
            </Section>

            <Section title="Backup & Sinkronisasi">
              {hasPermission("sync") && <SettingButton onClick={() => { setShowSettingsCenter(false); handleSyncAll(); }} tone="purple">📊 Sync Google Sheets</SettingButton>}
              {hasPermission("reports") && <SettingButton onClick={() => { setShowSettingsCenter(false); handleSendReport(); }} tone="green">✉️ Kirim Email Report</SettingButton>}
              {hasPermission("backup") && <SettingButton onClick={() => { setShowSettingsCenter(false); exportBackupJSON(); }} tone="amber">💾 Export Backup JSON</SettingButton>}
            </Section>

            <Section title="Sistem & Keamanan Data">
              {hasPermission("activity_log") && <SettingButton onClick={() => { setShowSettingsCenter(false); setShowActivityLogModal(true); }} tone="purple">📝 Activity Log</SettingButton>}
              {(isOwner || hasPermission("recycle_bin")) && <SettingButton onClick={() => { setShowSettingsCenter(false); setShowRecycleBin(true); }} tone="amber">♻️ Recycle Bin / Undo Delete</SettingButton>}
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.16)", color: "#fde68a", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>
                Data yang dihapus masuk Recycle Bin selama 30 hari. Restore dan hapus permanen dikontrol oleh Owner.
              </div>
            </Section>

            {!isOwner && <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>Mode {currentRole}: menu mengikuti Permission Manager. Akses dapat diubah oleh Owner.</div>}
            {!permissionsLoaded && <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(99,102,241,0.08)", color: "#c7d2fe", fontSize: "12px", fontWeight: 800 }}>Memuat permission dari Firebase...</div>}
            <SettingButton onClick={lockApp} tone="red">🚪 Lock / Logout</SettingButton>
          </div>

          <div style={{ marginTop: "16px", padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", color: "#aaa", fontSize: "12px", lineHeight: 1.6 }}>
            FinPlan v1.1.0 Family Edition Phase 5.4.2. UI alokasi Goal dan Activity Log dirapikan; pembatalan tunai/aset tetap aktif.
          </div>
        </div>
      </div>
    );
  };


  const getActivityActionMeta = (action) => {
    const map = {
      goal_cash_allocated: { label: "Alokasi Tunai Goal", icon: "💵", tone: "green" },
      goal_cash_cancelled: { label: "Batal Alokasi Tunai", icon: "↩️", tone: "red" },
      goal_asset_allocated: { label: "Alokasi Aset Goal", icon: "🏦", tone: "green" },
      goal_asset_cancelled: { label: "Batal Alokasi Aset", icon: "↩️", tone: "red" },
      permissions_updated: { label: "Permission Diubah", icon: "🛡️", tone: "purple" },
      wallet_created: { label: "Wallet Dibuat", icon: "🏦", tone: "green" },
      wallet_updated: { label: "Wallet Diubah", icon: "✏️", tone: "purple" },
      wallet_merged: { label: "Wallet Digabung", icon: "🔄", tone: "amber" },
      wallet_deleted: { label: "Wallet Dihapus", icon: "🗑️", tone: "red" },
      transaction_added: { label: "Transaksi Ditambah", icon: "➕", tone: "green" },
      transaction_deleted: { label: "Transaksi Dihapus", icon: "🗑️", tone: "red" },
      transaction_restored: { label: "Transaksi Dipulihkan", icon: "♻️", tone: "green" },
    };
    const item = map[action] || { label: String(action || "Aktivitas").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon: "📝", tone: "default" };
    const colors = {
      green: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", color: "#86efac" },
      red: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)", color: "#fca5a5" },
      purple: { bg: "rgba(99,102,241,0.14)", border: "rgba(99,102,241,0.28)", color: "#c7d2fe" },
      amber: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", color: "#fde68a" },
      default: { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)", color: "#cbd5e1" },
    };
    return { ...item, ...(colors[item.tone] || colors.default) };
  };

  const ActivityLogModal = () => {
    if (!showActivityLogModal || !hasPermission("activity_log")) return null;
    return (
      <div onClick={() => setShowActivityLogModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99996, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", overflowX: "hidden", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#6366f1", fontWeight: 900, textTransform: "uppercase" }}>Audit Log</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Activity Log</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.45 }}>Ditampilkan sesuai permission Activity Log. Gunakan untuk audit perubahan penting.</div>
            </div>
            <button onClick={() => setShowActivityLogModal(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>
          {activityLog.length === 0 ? (
            <div style={{ padding: "18px", borderRadius: "18px", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: "13px" }}>Belum ada aktivitas tercatat.</div>
          ) : activityLog.slice(0, 50).map(item => {
            const meta = getActivityActionMeta(item.action);
            return (
              <div key={item.id} style={{ padding: "12px", marginBottom: "10px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.035)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "999px", background: meta.bg, border: "1px solid " + meta.border, color: meta.color, fontSize: "10px", fontWeight: 900 }}>{meta.icon} {meta.label}</span>
                      <span style={{ color: "#e0f2fe", fontSize: "11px", fontWeight: 900 }}>{item.actor || "System"}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px", lineHeight: 1.5 }}>{item.detail}</div>
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "8px" }}>{item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID") : ""}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AuthScreen = ({ children }) => (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "6px" }}>💰</div>
        <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff", marginBottom: "2px" }}>FinPlan ADP</div>
        {children}







        {showSettingsCenter && (
          <div onClick={() => setShowSettingsCenter(false)} style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 99996,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "16px",
            boxSizing: "border-box"
          }}>
            <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{
              width: "100%",
              maxWidth: "430px",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "linear-gradient(180deg,#181827,#0f1020)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "24px 24px 18px 18px",
              padding: "20px",
              boxShadow: "0 -20px 70px rgba(0,0,0,0.55)",
              color: "#e8e8f0"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#6366f1", fontWeight: 900, textTransform: "uppercase" }}>Settings Center</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Pengaturan FinPlan</div>
                </div>
                <button onClick={() => setShowSettingsCenter(false)} style={{
                  width: "40px", height: "40px", borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.07)", color: "#fff",
                  fontSize: "20px", fontWeight: 800
                }}>×</button>
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                <button onClick={openUserSwitcher} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 900, textAlign: "left" }}>👤 Ganti / Pilih User</button>
                {isOwner && <button onClick={() => { setShowSettingsCenter(false); handleChangePw("family"); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 900, textAlign: "left" }}>🔐 Ganti Password Keluarga</button>}
                {isOwner && <button onClick={() => { setShowSettingsCenter(false); handleChangePw("user"); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 900, textAlign: "left" }}>🔑 Reset / Ganti PIN User</button>}
                {isOwner && <button onClick={openFamilyManagement} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(99,102,241,0.30)", background: "rgba(99,102,241,0.14)", color: "#c7d2fe", fontWeight: 900, textAlign: "left" }}>👨‍👩‍👧 Family Management v1.1</button>}
                {isAdminOrOwner && <button onClick={openWalletManager} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(16,185,129,0.24)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontWeight: 900, textAlign: "left" }}>🏦 Kelola Sumber Dana / Wallet v2</button>}
                <button onClick={() => { setShowSettingsCenter(false); handleSyncAll(); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(99,102,241,0.18)", color: "#c7d2fe", fontWeight: 900, textAlign: "left" }}>📊 Sync Google Sheets</button>
                <button onClick={() => { setShowSettingsCenter(false); handleSendReport(); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(16,185,129,0.16)", color: "#86efac", fontWeight: 900, textAlign: "left" }}>✉️ Kirim Email Report</button>
                {typeof exportBackupJSON === "function" && <button onClick={() => { setShowSettingsCenter(false); exportBackupJSON(); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(245,158,11,0.14)", color: "#fbbf24", fontWeight: 900, textAlign: "left" }}>💾 Export Backup JSON</button>}
                <button onClick={lockApp} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.10)", color: "#fca5a5", fontWeight: 900, textAlign: "left" }}>🚪 Lock / Logout</button>
              </div>

              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", color: "#aaa", fontSize: "12px", lineHeight: 1.6 }}>
                FinPlan v1.1.0 Family Edition Phase 4. Wallet v2 mendukung rename, aktif/nonaktif, archive, merge, dan activity log.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );




  const RecycleBinModal = () => {
    if (!showRecycleBin) return null;
    const now = new Date().toISOString();
    const activeItems = recycleBin.filter(item => !item.expiresAt || item.expiresAt >= now);
    const expiredItems = recycleBin.filter(item => item.expiresAt && item.expiresAt < now);
    return (
      <div onClick={() => setShowRecycleBin(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99997, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#f59e0b", fontWeight: 900, textTransform: "uppercase" }}>Recycle Bin</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Undo Delete 30 Hari</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>{activeItems.length} aktif · {expiredItems.length} expired</div>
            </div>
            <button onClick={() => setShowRecycleBin(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          {recycleStatus && <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.18)", color: "#86efac", fontSize: "12px", fontWeight: 900, marginBottom: "12px" }}>{recycleStatus}</div>}

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", color: "#fde68a", fontSize: "12px", lineHeight: 1.5, fontWeight: 800, marginBottom: "14px" }}>
            Transaksi, investasi, dan gadai yang dihapus tidak langsung hilang. Data masuk ke Recycle Bin dan bisa direstore sebelum 30 hari.
          </div>

          {isOwner && expiredItems.length > 0 && <button onClick={purgeExpiredRecycleItems} style={{ width: "100%", padding: "12px", borderRadius: "14px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.10)", color: "#fca5a5", fontWeight: 900, marginBottom: "12px" }}>🧹 Bersihkan item expired</button>}

          {activeItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "34px 0", color: "#64748b" }}>
              <div style={{ fontSize: "42px", marginBottom: "10px" }}>♻️</div>
              <div style={{ fontSize: "14px", fontWeight: 900, color: "#94a3b8" }}>Recycle Bin kosong</div>
              <div style={{ fontSize: "12px", marginTop: "6px" }}>Data yang dihapus akan muncul di sini.</div>
            </div>
          ) : activeItems.map(item => {
            const title = getRecycleItemTitle(item);
            const deletedDate = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString("id-ID") : "-";
            const expiresDate = item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("id-ID") : "-";
            return (
              <div key={item.id} style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>{getRecycleTypeLabel(item.type)}</div>
                    <div style={{ fontSize: "14px", color: "#fff", fontWeight: 900, marginTop: "4px" }}>{title}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px", lineHeight: 1.5 }}>Dihapus: {deletedDate} oleh {item.deletedBy || "System"}<br/>Expired: {expiresDate}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isOwner ? "1fr 1fr" : "1fr", gap: "8px", marginTop: "12px" }}>
                  <button onClick={() => restoreRecycleItem(item)} style={{ padding: "10px", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontWeight: 900 }}>↩ Restore</button>
                  {isOwner && <button onClick={() => permanentDeleteRecycleItem(item)} style={{ padding: "10px", borderRadius: "12px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.10)", color: "#fca5a5", fontWeight: 900 }}>🗑 Permanen</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AddTransactionModal = () => {
    if (!showForm) return null;
    const activeFundingSources = sumberDanaList.filter(sd => isSumberDanaActive(sd));
    const selectableFundingSources = myFundingSources.length > 0 ? myFundingSources : activeFundingSources;
    return (
      <div onClick={() => setShowForm(false)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99997,
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box"
      }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{
          width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto",
          background: "linear-gradient(180deg,#181827,#0f1020)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px",
          padding: "20px", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#6366f1", fontWeight: 900, textTransform: "uppercase" }}>Tambah Transaksi</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>FinPlan Input</div>
            </div>
            <button onClick={() => setShowForm(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800 }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            <button onClick={() => setForm({...form, type: "expense", category: "makan"})} style={{ padding: "12px", borderRadius: "14px", border: "none", background: form.type === "expense" ? "#ef4444" : "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 900 }}>📤 Expense</button>
            <button onClick={() => setForm({...form, type: "income", category: "gaji"})} style={{ padding: "12px", borderRadius: "14px", border: "none", background: form.type === "income" ? "#10b981" : "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 900 }}>📥 Income</button>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Kategori</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(form.type === "income" ? INCOME_CATS : EXPENSE_CATS).map(c => (
                <button key={c.id} onClick={() => setForm({...form, category: c.id})} style={{
                  padding: "10px", borderRadius: "12px",
                  border: form.category === c.id ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
                  background: form.category === c.id ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
                  color: "#fff", fontWeight: 800, textAlign: "left"
                }}>{c.icon} {c.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Nominal</div>
              <input
                    value={form.amount}
                    inputMode="numeric"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setForm(prev => ({ ...prev, amount: raw }));
                      setAmountDisplay("");
                    }}
                    placeholder="Nominal angka, contoh 100000"
                    style={inputStyle}
                  />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Tanggal</div>
              <input type="date" value={form.date} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setForm(prev => ({...prev, date: e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Sumber Dana</div>
              <select value={transactionSDId} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setTransactionSDId(e.target.value)} style={inputStyle}>
                <option value="">Pilih sumber dana</option>
                {selectableFundingSources.map(sd => <option key={sd.id} value={sd.id}>{sd.icon} {sd.name} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Catatan</div>
              <input
                    value={form.note}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Contoh: makan siang, BBM, owner draw"
                    style={inputStyle}
                  />
            </div>
            <button onClick={async () => { await addTransaction(); }} style={{
              width: "100%", padding: "15px", borderRadius: "16px", border: "none",
              background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff",
              fontWeight: 900, fontSize: "15px", marginTop: "8px"
            }}>Simpan Transaksi</button>
            {!transactionSDId && <div style={{ fontSize: "12px", color: "#fbbf24", textAlign: "center" }}>Pilih sumber dana agar transaksi bisa disimpan.</div>}
          </div>
        </div>
      </div>
    );
  };

  const WalletColorSelector = ({ value, onChange }) => {
    const selected = value || "#6366f1";
    return (
      <div>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>Warna Label</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "7px", marginBottom: "10px" }}>
          {WALLET_COLOR_PRESETS.map(c => {
            const active = selected.toLowerCase() === c.value.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={(e) => { e.stopPropagation(); onChange(c.value); }}
                style={{
                  height: "34px",
                  borderRadius: "999px",
                  border: active ? "3px solid #fff" : "1px solid rgba(255,255,255,0.14)",
                  background: c.value,
                  boxShadow: active ? "0 0 0 3px rgba(99,102,241,0.45)" : "none",
                  cursor: "pointer",
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "14px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "12px", background: selected, border: "1px solid rgba(255,255,255,0.16)" }} />
          <div>
            <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900 }}>Preview warna wallet</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{selected}</div>
          </div>
        </div>
      </div>
    );
  };

  const SumberDanaModal = () => {
    if (!showSDForm) return null;
    const presets = SUMBER_DANA_PRESETS || [];
    return (
      <div onClick={resetSumberDanaForm} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99996,
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box"
      }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{
          width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto",
          background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px 24px 18px 18px", padding: "20px", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Wallet v2</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Tambah Dompet/Rekening</div>
            </div>
            <button onClick={resetSumberDanaForm} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800 }}>×</button>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Nama Sumber Dana</div>
              <input value={sdForm.name} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setSdForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Contoh: BCA, Cash, DANA, Owner Draw" style={inputStyle} />
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Icon</div>
              <input value={sdForm.icon} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setSdForm(prev => ({ ...prev, icon: e.target.value }))} placeholder="Emoji, contoh 💵" style={inputStyle} />
            </div>

            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Saldo Awal</div>
              <input value={sdForm.initialBalance} inputMode="numeric" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setSdForm(prev => ({ ...prev, initialBalance: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Contoh: 1000000" style={inputStyle} />
            </div>

            <WalletColorSelector value={sdForm.color || "#6366f1"} onChange={(color) => setSdForm(prev => ({ ...prev, color }))} />

            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Preset cepat</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {presets.map(p => (
                  <button key={p.name} onClick={() => setSdForm(prev => ({ ...prev, name: p.name, icon: p.icon }))} style={{ padding: "10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#fff", fontWeight: 800, textAlign: "left" }}>{p.icon} {p.name}</button>
                ))}
              </div>
            </div>

            <button onClick={async () => { await addSumberDana(); }} style={{
              width: "100%", padding: "15px", borderRadius: "16px", border: "none",
              background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontWeight: 900, fontSize: "15px", marginTop: "8px"
            }}>Simpan Sumber Dana</button>
          </div>
        </div>
      </div>
    );
  };

  const SumberDanaDetailModal = () => {
    if (!selectedSD) return null;
    const sd = sumberDanaList.find(s => s.id === selectedSD);
    if (!sd) return null;
    const status = getSumberDanaStatus(sd);
    const balance = calcSumberDanaBalance(sd.id);
    const walletTransactions = transactions.filter(t => t.sumberDanaId === sd.id);
    const walletLedger = sumberDanaLedger.filter(l => l.sumberDanaId === sd.id);
    const walletLedgerSorted = getWalletLedgerSorted(sd.id);
    const orphanLoanLedgers = getOrphanLoanDisbursementLedgers(sd.id);
    const mergeTargets = sumberDanaList.filter(item => item.user === sd.user && item.id !== sd.id && getSumberDanaStatus(item) !== "archived");
    return (
      <div onClick={() => setSelectedSD(null)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.74)", zIndex: 99996,
        display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box"
      }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{
          width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto",
          background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px 24px 18px 18px", padding: "20px", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#86efac", fontWeight: 900, textTransform: "uppercase" }}>Wallet v2 · {status}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                <div style={{ fontSize: "28px" }}>{sd.icon || "💵"}</div>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff" }}>{sd.name}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>{sd.user} · Saldo {formatFull(balance)}</div>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedSD(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800 }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "10px", color: "#94a3b8" }}>Saldo Awal</div><div style={{ fontSize: "13px", fontWeight: 900 }}>{formatRupiah(sd.initialBalance || 0)}</div></div>
            <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "10px", color: "#94a3b8" }}>Transaksi</div><div style={{ fontSize: "13px", fontWeight: 900 }}>{walletTransactions.length}</div></div>
            <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "10px", color: "#94a3b8" }}>Ledger</div><div style={{ fontSize: "13px", fontWeight: 900 }}>{walletLedger.length}</div></div>
          </div>

          {orphanLoanLedgers.length > 0 && (
            <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.26)", marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 900, marginBottom: "6px" }}>⚠️ Koreksi saldo dari pinjaman lama</div>
              <div style={{ fontSize: "11px", color: "#fde68a", lineHeight: 1.55, marginBottom: "10px" }}>
                Ada ledger pencairan pinjaman yang dokumen pinjamannya sudah tidak aktif/terhapus dari versi lama. Gunakan koreksi ini untuk membuat ledger pembalik, bukan menghapus audit lama.
              </div>
              <div style={{ display: "grid", gap: "8px" }}>
                {orphanLoanLedgers.slice(0, 3).map(l => (
                  <button key={l.id} onClick={() => reverseOrphanLoanDisbursement(l)} style={{ textAlign: "left", padding: "10px", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.30)", background: "rgba(15,23,42,0.55)", color: "#fff", fontWeight: 800 }}>
                    Koreksi {formatFull(Math.abs(l.amount || 0))} · {l.note || "Pencairan pinjaman lama"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff" }}>📜 Log Wallet</div>
              <div style={{ fontSize: "11px", color: "#a5b4fc", fontWeight: 800 }}>{walletLedgerSorted.length} item</div>
            </div>
            <div style={{ display: "grid", gap: "8px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
              {walletLedgerSorted.length === 0 && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Belum ada pergerakan wallet.</div>}
              {walletLedgerSorted.slice(0, 30).map(l => (
                <div key={l.id} style={{ padding: "10px", borderRadius: "12px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#c7d2fe", fontWeight: 900 }}>{getLedgerTypeLabel(l.refType)}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.45, marginTop: "3px" }}>{l.note || "-"}</div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "5px" }}>{l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID") : ""}</div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 900, color: Number(l.amount || 0) >= 0 ? "#34d399" : "#f87171", whiteSpace: "nowrap" }}>
                      {Number(l.amount || 0) >= 0 ? "+" : "-"}{formatRupiah(Math.abs(l.amount || 0))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Rename Sumber Dana</div>
              <input value={sdForm.name} onChange={(e) => setSdForm(prev => ({ ...prev, name: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Icon</div>
                <input value={sdForm.icon} onChange={(e) => setSdForm(prev => ({ ...prev, icon: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Saldo Awal</div>
                <input value={sdForm.initialBalance} inputMode="numeric" onChange={(e) => setSdForm(prev => ({ ...prev, initialBalance: e.target.value.replace(/[^0-9]/g, "") }))} style={inputStyle} />
              </div>
            </div>
            <WalletColorSelector value={sdForm.color || sd.color || "#6366f1"} onChange={(color) => setSdForm(prev => ({ ...prev, color }))} />
            <button onClick={() => saveSumberDanaChanges(sd.id)} style={{ padding: "14px", borderRadius: "16px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontWeight: 900 }}>💾 Simpan Perubahan</button>

            <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
            <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff" }}>Status</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button onClick={() => setSumberDanaStatus(sd.id, status === "active" ? "inactive" : "active")} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: status === "active" ? "rgba(245,158,11,0.14)" : "rgba(16,185,129,0.14)", color: status === "active" ? "#fbbf24" : "#86efac", fontWeight: 900 }}>{status === "active" ? "⏸ Nonaktifkan" : "✅ Aktifkan"}</button>
              <button onClick={() => setSumberDanaStatus(sd.id, "archived")} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontWeight: 900 }}>📦 Arsipkan</button>
            </div>

            <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
            <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff" }}>Merge Sumber Dana</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>Gunakan saat ada salah ketik, misalnya BCAA digabung ke BCA. Transaksi dan ledger akan dipindahkan, sumber lama otomatis diarsipkan.</div>
            <select value={mergeTargetSDId} onChange={(e) => setMergeTargetSDId(e.target.value)} style={inputStyle}>
              <option value="">Pilih tujuan merge...</option>
              {mergeTargets.map(target => <option key={target.id} value={target.id}>{target.icon || "💵"} {target.name} · {formatFull(calcSumberDanaBalance(target.id))}</option>)}
            </select>
            <button disabled={!mergeTargetSDId} onClick={() => mergeSumberDana(sd.id, mergeTargetSDId)} style={{ padding: "14px", borderRadius: "16px", border: "none", background: mergeTargetSDId ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)", color: mergeTargetSDId ? "#86efac" : "#64748b", fontWeight: 900, cursor: mergeTargetSDId ? "pointer" : "not-allowed" }}>🔄 Merge ke Sumber Dana Tujuan</button>

            {isOwner && <button onClick={() => deleteSumberDana(sd.id)} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontWeight: 900 }}>🗑 Hapus Permanen jika belum dipakai</button>}
          </div>
        </div>
      </div>
    );
  };


  const GoalCashFundingModal = () => {
    if (!showSavingsForm) return null;
    const goal = SAVINGS_GOALS.find(g => g.id === showSavingsForm);
    if (!goal) return null;
    const currentVal = calcGoalValue(goal.id);
    const amount = parseAmount(savingsInput);
    const selectedSource = sumberDanaList.find(sd => sd.id === savingsSDId);
    return (
      <div onClick={() => { setShowSavingsForm(null); setSavingsInput(""); setSavingsInputDisplay(""); setSavingsSDId(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Alokasi Tunai ke Goal</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>{goal.icon} {goal.label}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>Saat ini {formatRupiah(currentVal)} dari target {formatRupiah(goal.targetAmount)}</div>
            </div>
            <button onClick={() => { setShowSavingsForm(null); setSavingsInput(""); setSavingsInputDisplay(""); setSavingsSDId(""); }} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)", color: "#c7d2fe", fontSize: "12px", lineHeight: 1.5, fontWeight: 800, marginBottom: "14px" }}>
            Ini adalah transfer/alokasi dari Sumber Dana ke Goal. Bukan pengeluaran konsumtif dan tidak membuat modal semu.
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Sumber Dana</div>
              <select value={savingsSDId} onChange={(e) => setSavingsSDId(e.target.value)} style={inputStyle}>
                <option value="">Pilih sumber dana aktif...</option>
                {goalFundingSources.map(sd => <option key={sd.id} value={sd.id}>{sd.icon || "💵"} {sd.name} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Jumlah alokasi</div>
              <input value={savingsInputDisplay} onChange={(e) => { const raw = parseAmount(e.target.value); setSavingsInput(String(raw || "")); setSavingsInputDisplay(raw ? formatFull(raw) : ""); }} placeholder="Rp 0" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "10px", color: "#64748b" }}>Sumber</div><div style={{ fontSize: "12px", color: "#fff", fontWeight: 900 }}>{selectedSource ? selectedSource.name : "-"}</div></div>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "10px", color: "#64748b" }}>Nilai</div><div style={{ fontSize: "12px", color: "#86efac", fontWeight: 900 }}>{formatRupiah(amount)}</div></div>
            </div>

            <button onClick={() => addSavingsCash(goal.id)} disabled={!amount || !savingsSDId} style={{ padding: "15px", borderRadius: "16px", border: "none", background: amount && savingsSDId ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.06)", color: amount && savingsSDId ? "#fff" : "#64748b", fontSize: "14px", fontWeight: 900, cursor: amount && savingsSDId ? "pointer" : "not-allowed" }}>✅ Alokasikan ke Goal</button>
          </div>
        </div>
      </div>
    );
  };

  const GoalAssetFundingModal = () => {
    if (!showAssetConvert || String(showAssetConvert).startsWith("invest_")) return null;
    const goal = SAVINGS_GOALS.find(g => g.id === showAssetConvert);
    if (!goal) return null;
    const assetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);
    const qty = parseDecimal(assetForm.qty);
    const rawPriceInput = parseAmount(assetForm.buyPrice) || parseDecimal(assetForm.buyPrice);
    const valueMode = assetForm.valueMode || "total";
    const isCashLikeAsset = ["idr", "obligasi"].includes(assetForm.assetType);
    const estValue = isCashLikeAsset ? qty : (valueMode === "unit" ? qty * rawPriceInput : rawPriceInput);
    const unitPricePreview = (!isCashLikeAsset && qty && estValue) ? estValue / qty : 0;
    const selectedSource = sumberDanaList.find(sd => sd.id === assetSDId);
    return (
      <div onClick={() => { setShowAssetConvert(null); setAssetSDId(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#34d399", fontWeight: 900, textTransform: "uppercase" }}>Alokasi Aset ke Goal</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>{goal.icon} {goal.label}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>Aset akan menjadi holding di dalam goal dan nilainya dapat mengikuti harga pasar.</div>
            </div>
            <button onClick={() => { setShowAssetConvert(null); setAssetSDId(""); }} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.22)", color: "#86efac", fontSize: "12px", lineHeight: 1.5, fontWeight: 800, marginBottom: "14px" }}>
            Ini adalah pembelian/alokasi aset dari Sumber Dana ke Goal. Wallet berkurang, Goal bertambah holding aset. Bukan expense konsumtif.
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Sumber Dana</div>
              <select value={assetSDId} onChange={(e) => setAssetSDId(e.target.value)} style={inputStyle}>
                <option value="">Pilih sumber dana aktif...</option>
                {goalFundingSources.map(sd => <option key={sd.id} value={sd.id}>{sd.icon || "💵"} {sd.name} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Jenis Aset</div>
              <select value={assetForm.assetType} onChange={(e) => setAssetForm(prev => ({ ...prev, assetType: e.target.value }))} style={inputStyle}>
                {ASSET_TYPES.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
              </select>
            </div>

            {!isCashLikeAsset && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Mode input nilai</div>
                <select value={valueMode} onChange={(e) => setAssetForm(prev => ({ ...prev, valueMode: e.target.value }))} style={inputStyle}>
                  <option value="total">Total nilai pembelian aset</option>
                  <option value="unit">Harga per unit × qty</option>
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input value={assetForm.qty} onChange={(e) => setAssetForm(prev => ({ ...prev, qty: e.target.value }))} placeholder={assetType?.unit ? "Qty / " + assetType.unit : "Qty"} style={inputStyle} />
              <input value={assetForm.buyPrice} onChange={(e) => setAssetForm(prev => ({ ...prev, buyPrice: e.target.value }))} placeholder={isCashLikeAsset ? "Nilai IDR" : (valueMode === "unit" ? "Harga beli per unit" : "Total nilai pembelian")} style={inputStyle} />
            </div>

            {!isCashLikeAsset && (
              <div style={{ padding: "10px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.045)", color: "#94a3b8", fontSize: "11px", lineHeight: 1.45 }}>
                {valueMode === "total"
                  ? <>Mode total: angka nilai dianggap sebagai total pembelian. Harga/unit estimasi: <b style={{ color: "#fff" }}>{formatRupiah(unitPricePreview)}</b>.</>
                  : <>Mode unit: total dihitung dari qty × harga per unit = <b style={{ color: "#fff" }}>{formatRupiah(estValue)}</b>.</>}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input value={assetForm.ticker} onChange={(e) => setAssetForm(prev => ({ ...prev, ticker: e.target.value }))} placeholder="Ticker/kode opsional" style={inputStyle} />
              <input value={assetForm.manualPrice} onChange={(e) => setAssetForm(prev => ({ ...prev, manualPrice: e.target.value }))} placeholder="Harga pasar manual" style={inputStyle} />
            </div>

            <input value={assetForm.note} onChange={(e) => setAssetForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Catatan aset" style={inputStyle} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "10px", color: "#64748b" }}>Sumber</div><div style={{ fontSize: "12px", color: "#fff", fontWeight: 900 }}>{selectedSource ? selectedSource.name : "-"}</div></div>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "10px", color: "#64748b" }}>Estimasi nilai</div><div style={{ fontSize: "12px", color: "#86efac", fontWeight: 900 }}>{formatRupiah(estValue)}</div></div>
            </div>

            <button onClick={() => addSavingsAsset(goal.id)} disabled={!qty || !assetSDId || (!isCashLikeAsset && !rawPriceInput)} style={{ padding: "15px", borderRadius: "16px", border: "none", background: qty && assetSDId && (isCashLikeAsset || rawPriceInput) ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.06)", color: qty && assetSDId && (isCashLikeAsset || rawPriceInput) ? "#fff" : "#64748b", fontSize: "14px", fontWeight: 900, cursor: qty && assetSDId && (isCashLikeAsset || rawPriceInput) ? "pointer" : "not-allowed" }}>✅ Alokasikan Aset ke Goal</button>
          </div>
        </div>
      </div>
    );
  };

  const LoanGadaiModal = () => {
    if (!showGadaiForm) return null;
    const loanFundingSources = myFundingSources.length > 0 ? myFundingSources : activeFundingSourceOptions;
    const harga = parseAmount(gadaiForm.hargaEmas) || ((marketPrices ? marketPrices.goldPerGram : 1680000) || 1680000);
    const berat = parseFloat(gadaiForm.beratGram) || 0;
    const hasil = berat ? hitungGadai(berat, gadaiForm.kadar, harga, parseInt(gadaiForm.tenor)) : null;

    return (
      <div onClick={() => setShowGadaiForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99997, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Phase 6.2 · Loan Engine</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Catat Pinjaman Gadai</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px", lineHeight: 1.5 }}>Pencairan gadai menambah wallet dan menambah kewajiban. Ini bukan pemasukan murni.</div>
            </div>
            <button onClick={() => { setShowGadaiForm(false); setGadaiSDId(""); }} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <input placeholder="Nama barang jaminan, contoh: LM Antam 5gr" value={gadaiForm.namaBarang} onChange={e => setGadaiForm(f => ({ ...f, namaBarang: e.target.value }))} style={inputStyle} />

            <select value={gadaiSDId} onChange={e => setGadaiSDId(e.target.value)} style={{ ...inputStyle, color: "#e8e8f0" }}>
              <option value="">Pilih wallet tujuan pencairan</option>
              {loanFundingSources.map(sd => <option key={sd.id} value={sd.id}>{sd.icon} {sd.name} · saldo {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input placeholder="Berat gram" value={gadaiForm.beratGram} onChange={e => setGadaiForm(f => ({ ...f, beratGram: e.target.value }))} style={inputStyle} />
              <select value={gadaiForm.kadar} onChange={e => setGadaiForm(f => ({ ...f, kadar: e.target.value }))} style={{ ...inputStyle, color: "#e8e8f0" }}>
                <option value="24">24K</option>
                <option value="22">22K</option>
                <option value="18">18K</option>
                <option value="14">14K</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input placeholder="Harga emas/gram (kosongkan auto)" value={gadaiForm.hargaEmas} onChange={e => setGadaiForm(f => ({ ...f, hargaEmas: e.target.value }))} style={inputStyle} />
              <select value={gadaiForm.tenor} onChange={e => setGadaiForm(f => ({ ...f, tenor: e.target.value }))} style={{ ...inputStyle, color: "#e8e8f0" }}>
                <option value="15">15 hari</option>
                <option value="30">30 hari</option>
                <option value="60">60 hari</option>
                <option value="90">90 hari</option>
                <option value="120">120 hari</option>
              </select>
            </div>

            <input type="date" value={gadaiForm.tanggalGadai} onChange={e => setGadaiForm(f => ({ ...f, tanggalGadai: e.target.value }))} style={inputStyle} />
            <input placeholder="Catatan opsional" value={gadaiForm.catatan} onChange={e => setGadaiForm(f => ({ ...f, catatan: e.target.value }))} style={inputStyle} />
          </div>

          {hasil && (
            <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Nilai Taksiran</div>
                  <div style={{ fontSize: "15px", fontWeight: 900 }}>{formatFull(hasil.nilaiTaksiran)}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ fontSize: "10px", color: "#86efac", marginBottom: "4px" }}>Masuk Wallet</div>
                  <div style={{ fontSize: "15px", fontWeight: 900, color: "#86efac" }}>{formatFull(hasil.uangPinjaman)}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div style={{ fontSize: "10px", color: "#fca5a5", marginBottom: "4px" }}>Liability / Pokok</div>
                  <div style={{ fontSize: "15px", fontWeight: 900, color: "#fca5a5" }}>{formatFull(hasil.uangPinjaman)}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div style={{ fontSize: "10px", color: "#fbbf24", marginBottom: "4px" }}>Estimasi Bunga</div>
                  <div style={{ fontSize: "15px", fontWeight: 900, color: "#fbbf24" }}>{formatFull(hasil.totalBunga)}</div>
                </div>
              </div>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(99,102,241,0.12)", color: "#c7d2fe", fontSize: "12px", lineHeight: 1.6 }}>
                Net worth tidak otomatis naik karena wallet bertambah diimbangi kewajiban pinjaman. Bunga/biaya akan dihitung terpisah saat pelunasan di Phase 6.3.
              </div>
            </div>
          )}

          <button onClick={addGadai} disabled={!gadaiForm.namaBarang || !gadaiForm.beratGram || !gadaiSDId} style={{ width: "100%", marginTop: "16px", padding: "14px", borderRadius: "16px", border: "none", background: (!gadaiForm.namaBarang || !gadaiForm.beratGram || !gadaiSDId) ? "rgba(255,255,255,0.10)" : "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "15px", fontWeight: 900, cursor: (!gadaiForm.namaBarang || !gadaiForm.beratGram || !gadaiSDId) ? "not-allowed" : "pointer" }}>
            Catat Pencairan Pinjaman
          </button>
        </div>
      </div>
    );
  };

  const LoanRepaymentModal = () => {
    if (!loanPaymentLoan) return null;
    const paymentSources = myFundingSources.length > 0 ? myFundingSources : activeFundingSourceOptions;
    const principalPaid = parseAmount(loanPaymentForm.principal) || parseDecimal(loanPaymentForm.principal) || 0;
    const feePaid = parseAmount(loanPaymentForm.fee) || parseDecimal(loanPaymentForm.fee) || 0;
    const outstanding = Number(loanPaymentLoan.outstandingPrincipal ?? loanPaymentLoan.uangPinjaman ?? 0);
    const principalSafe = Math.min(principalPaid, outstanding);
    const totalPaid = principalSafe + feePaid;
    const remaining = Math.max(outstanding - principalSafe, 0);
    const willBePaidOff = remaining <= 0 && principalSafe > 0;

    return (
      <div onClick={() => setLoanPaymentLoan(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99997, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Phase 6.3 · Loan Repayment</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Bayar / Tebus Pinjaman</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px", lineHeight: 1.5 }}>{loanPaymentLoan.namaBarang || "Pinjaman"} · sisa pokok {formatFull(outstanding)}</div>
            </div>
            <button onClick={() => setLoanPaymentLoan(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <select value={loanPaymentForm.walletId} onChange={e => setLoanPaymentForm(f => ({ ...f, walletId: e.target.value }))} style={{ ...inputStyle, color: "#e8e8f0" }}>
              <option value="">Pilih wallet sumber pembayaran</option>
              {paymentSources.map(sd => <option key={sd.id} value={sd.id}>{sd.icon} {sd.name} · saldo {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input placeholder="Pokok dibayar" value={loanPaymentForm.principal} onChange={e => setLoanPaymentForm(f => ({ ...f, principal: e.target.value }))} style={inputStyle} />
              <input placeholder="Bunga / biaya" value={loanPaymentForm.fee} onChange={e => setLoanPaymentForm(f => ({ ...f, fee: e.target.value }))} style={inputStyle} />
            </div>

            <input type="date" value={loanPaymentForm.date} onChange={e => setLoanPaymentForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            <input placeholder="Catatan opsional" value={loanPaymentForm.note} onChange={e => setLoanPaymentForm(f => ({ ...f, note: e.target.value }))} style={inputStyle} />
          </div>

          <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ fontSize: "10px", color: "#fca5a5", marginBottom: "4px" }}>Wallet Keluar</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: "#fca5a5" }}>{formatFull(totalPaid)}</div>
              </div>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div style={{ fontSize: "10px", color: "#86efac", marginBottom: "4px" }}>Sisa Pokok</div>
                <div style={{ fontSize: "15px", fontWeight: 900, color: "#86efac" }}>{formatFull(remaining)}</div>
              </div>
            </div>
            <div style={{ padding: "12px", borderRadius: "14px", background: willBePaidOff ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.10)", color: willBePaidOff ? "#86efac" : "#fbbf24", fontSize: "12px", lineHeight: 1.6, fontWeight: 800 }}>
              {willBePaidOff ? "✅ Pinjaman akan lunas dan jaminan dilepas." : "⚠️ Pembayaran sebagian. Pinjaman tetap aktif sampai sisa pokok Rp 0."}
            </div>
            {feePaid > 0 && (
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: "12px", lineHeight: 1.6 }}>
                Bunga/biaya {formatFull(feePaid)} akan dicatat sebagai expense agar tidak bercampur dengan pokok pinjaman.
              </div>
            )}
          </div>

          <button onClick={repayLoan} disabled={!loanPaymentForm.walletId || !principalPaid} style={{ width: "100%", marginTop: "16px", padding: "14px", borderRadius: "16px", border: "none", background: (!loanPaymentForm.walletId || !principalPaid) ? "rgba(255,255,255,0.10)" : "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: "15px", fontWeight: 900, cursor: (!loanPaymentForm.walletId || !principalPaid) ? "not-allowed" : "pointer" }}>
            Simpan Pembayaran
          </button>
        </div>
      </div>
    );
  };

  const TransactionDetailModal = () => {
    if (!selectedTransaction) return null;
    const tx = selectedTransaction;
    const cat = getCategoryInfo(tx.category);
    const typeInfo = getTypeInfo(tx.type);
    return (
      <div onClick={() => setSelectedTransaction(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "82vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: typeInfo.color, fontWeight: 800 }}>{typeInfo.icon} {typeInfo.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: tx.type === "income" ? "#34d399" : "#f87171", marginTop: "8px" }}>{tx.type === "income" ? "+" : "-"}{formatFull(tx.amount || 0)}</div>
            </div>
            <button onClick={() => setSelectedTransaction(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800 }}>×</button>
          </div>
          <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Kategori</div><div style={{ fontSize: "15px", fontWeight: 800 }}>{cat.icon} {cat.label}</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Tanggal</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{tx.date || "-"}</div></div>
              <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>User</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{tx.user || "-"}</div></div>
            </div>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Sumber Dana</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{tx.sumberDanaName || tx.sumberDanaId || "Belum tercatat"}</div></div>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Catatan</div><div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.5 }}>{tx.note || "Tidak ada catatan"}</div></div>
            {canDeleteTransaction(tx) ? (
              <button onClick={async () => { const ok = window.confirm("Hapus transaksi ini?"); if (!ok) return; const deleted = await deleteTransaction(tx.id); if (deleted !== false) setSelectedTransaction(null); }} style={{ marginTop: "6px", width: "100%", padding: "14px", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.12)", color: "#fca5a5", fontWeight: 900, fontSize: "14px" }}>Hapus Transaksi</button>
            ) : (
              <div style={{ marginTop: "6px", padding: "12px", borderRadius: "14px", border: "1px solid rgba(245,158,11,0.22)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>Role {currentRole} tidak punya izin hapus transaksi ini. Member default hanya boleh mengubah data sendiri; Owner/Admin mengikuti permission.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CategoryDetailModal = () => {
    if (!selectedCategory) return null;
    const cat = getCategoryInfo(selectedCategory);
    const txns = displayTxns.filter(t => t.category === selectedCategory);
    const income = txns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return (
      <div onClick={() => setSelectedCategory(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "82vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", color: "#e8e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: "12px", color: "#888", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 800 }}>Ringkasan Kategori</div><div style={{ fontSize: "22px", fontWeight: 900, marginTop: "6px" }}>{cat.icon} {cat.label}</div></div>
            <button onClick={() => setSelectedCategory(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800 }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(52,211,153,0.1)" }}><div style={{ fontSize: "11px", color: "#777" }}>Pemasukan</div><div style={{ color: "#34d399", fontWeight: 900 }}>{formatRupiah(income)}</div></div>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(248,113,113,0.1)" }}><div style={{ fontSize: "11px", color: "#777" }}>Pengeluaran</div><div style={{ color: "#f87171", fontWeight: 900 }}>{formatRupiah(expense)}</div></div>
          </div>
          <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
            {txns.length === 0 ? <div style={{ padding: "20px", textAlign: "center", color: "#777" }}>Tidak ada transaksi</div> : txns.map(t => {
              const typeInfo = getTypeInfo(t.type);
              return <button key={t.id} onClick={() => { setSelectedCategory(null); setSelectedTransaction(t); }} style={{ width: "100%", textAlign: "left", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#e8e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}><span>{getTransactionIcon(t)} {t.note || cat.label}</span><strong style={{ color: t.type === "income" ? "#34d399" : "#f87171" }}>{t.type === "income" ? "+" : "-"}{formatRupiah(t.amount || 0)}</strong></div>
                <div style={{ fontSize: "11px", color: "#777", marginTop: "4px" }}>{t.date} · {t.user}</div>
              </button>;
            })}
          </div>
        </div>
      </div>
    );
  };

  // ===== AUTH SCREENS =====

  // Loading security
  if (!securityLoaded) return (
    <AuthScreen>
      <div style={{ fontSize: "14px", color: "#555", marginTop: "32px" }}>Memuat keamanan...</div>
    </AuthScreen>
  );

  // Setup Family Password (first time)
  if (setupMode === "familyPw" || setupMode === "confirmFamilyPw") return (
    <AuthScreen>
      <div style={{ fontSize: "13px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "2px", marginTop: "24px" }}>
        {setupMode === "familyPw" ? "Buat Password Keluarga" : "Konfirmasi Password"}
      </div>
      <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>
        {setupMode === "familyPw" ? "Masukkan 6 digit password baru" : "Masukkan password yang sama"}
      </div>
      <PinDots filled={pinInput.length} />
      {pinError && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{pinError}</div>}
      <PinPad onPress={handlePinPress} onDelete={handlePinDelete} onSubmit={handleSetupFamilyPw} />
    </AuthScreen>
  );

  // Setup User PIN
  if (setupMode === "userPin" || setupMode === "confirmUserPin") return (
    <AuthScreen>
      <div style={{ fontSize: "13px", color: "#10b981", textTransform: "uppercase", letterSpacing: "2px", marginTop: "24px" }}>
        {setupMode === "userPin" ? "Buat PIN untuk " + currentUser : "Konfirmasi PIN"}
      </div>
      <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>
        {setupMode === "userPin" ? "Masukkan 6 digit PIN baru" : "Masukkan PIN yang sama"}
      </div>
      <PinDots filled={pinInput.length} />
      {pinError && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{pinError}</div>}
      <PinPad onPress={handlePinPress} onDelete={handlePinDelete} onSubmit={handleSetupUserPin} />
    </AuthScreen>
  );

  // Family Password Screen
  if (authStep === "family") return (
    <AuthScreen>
      <div style={{ fontSize: "13px", color: "#6366f1", textTransform: "uppercase", letterSpacing: "2px", marginTop: "24px" }}>Password Keluarga</div>
      <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>Masukkan 6 digit password keluarga</div>
      <PinDots filled={pinInput.length} />
      {pinError && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{pinError}</div>}
      <PinPad onPress={handlePinPress} onDelete={handlePinDelete} onSubmit={handleFamilyPwSubmit} />
    </AuthScreen>
  );

  // User Selection Screen (after family password)
  if (authStep === "userSelect") return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "36px", marginBottom: "6px" }}>💰</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff" }}>FinPlan ADP</div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>Siapa yang sedang login?</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {activeFamilyMembers.map(member => (
            <button key={member.id} onClick={() => handleUserSelectForPin(member.name)} style={{
              padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.05)", color: "#e8e8f0", fontSize: "15px",
              fontWeight: 700, cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px",
            }}>
              <span>{member.avatar || "👤"} {member.name} {member.role === "Owner" ? "👑" : ""}</span>
              <span style={{ fontSize: "12px", color: (securityData?.userPins || {})[member.name] ? "#34d399" : "#f59e0b", whiteSpace: "nowrap" }}>
                {(securityData?.userPins || {})[member.name] ? "🔒 PIN aktif" : "⚠ Belum ada PIN"}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => { setAuthStep("family"); setPinInput(""); }} style={{ width: "100%", marginTop: "20px", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#555", fontSize: "13px", cursor: "pointer" }}>← Kembali</button>
      </div>
    </div>
  );

  // User PIN Screen
  if (authStep === "userPin") return (
    <AuthScreen>
      <div style={{ fontSize: "13px", color: "#10b981", textTransform: "uppercase", letterSpacing: "2px", marginTop: "24px" }}>Halo, {currentUser}! 👋</div>
      <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>Masukkan PIN 6 digit kamu</div>
      <PinDots filled={pinInput.length} />
      {pinError && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{pinError}</div>}
      <PinPad onPress={handlePinPress} onDelete={handlePinDelete} onSubmit={handleUserPinSubmit} />
      <button onClick={() => { setAuthStep("userSelect"); setPinInput(""); setPinError(""); }} style={{ marginTop: "20px", background: "none", border: "none", color: "#555", fontSize: "13px", cursor: "pointer" }}>🔄 Ganti User</button>
    </AuthScreen>
  );

  // Guard: hanya tampil jika sudah unlock
  if (authStep !== "unlocked") return null;

  return (
    <div style={{ minHeight: "100vh", width: "100%", overflowX: "hidden", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0" }}>
      <div style={{ maxWidth: "430px", width: "100%", margin: "0 auto", minHeight: "100vh", position: "relative", overflowX: "hidden", boxSizing: "border-box" }}>
        <SettingsCenterModal />
        <ActivityLogModal />

        <div style={{ padding: "28px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#6366f1", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>{APP_VERSION}</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>Halo, {currentUser}! {currentUser === ADMIN_USER ? "\uD83D\uDC51" : "\uD83D\uDC4B"}</div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => setShowSettingsCenter(true)} style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", color: "#e8e8f0", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 800 }}>⚙️</button>
            <button onClick={lockApp} style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.28)", color: "#fca5a5", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", cursor: "pointer", fontWeight: 800 }}>🔐</button>
          </div>
        </div>

        {showTimeFilters && (
          <div style={{ padding: "8px 20px", display: "flex", gap: "6px", flexWrap: "wrap", overflowX: "hidden" }}>
            {MONTHS.map((m, i) => <button key={i} onClick={() => setFilterMonth(i)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 600, flexShrink: 0, background: filterMonth === i ? "#6366f1" : "rgba(255,255,255,0.07)", color: filterMonth === i ? "#fff" : "#888" }}>{m}</button>)}
          </div>
        )}

        {showTimeFilters && (
          <div style={{ padding: "6px 20px 12px", display: "flex", gap: "6px", flexWrap: "wrap", overflowX: "hidden" }}>
            {["semua", ...userFilterNames].map(u => <button key={u} onClick={() => setFilterUser(u)} style={{ padding: "5px 12px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "11px", fontWeight: 600, flexShrink: 0, background: filterUser === u ? "#10b981" : "rgba(255,255,255,0.07)", color: filterUser === u ? "#fff" : "#888" }}>{u === "semua" ? "👨‍👩‍👧‍👦 Semua" : u}</button>)}
          </div>
        )}

        {activeTab === "dashboard" && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)", borderRadius: "20px", padding: "22px", boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "rgba(255,255,255,0.7)", marginBottom: "6px", textTransform: "uppercase" }}>Saldo {filterUser === "semua" ? "Keluarga" : filterUser}</div>
              <div style={{ fontSize: "30px", fontWeight: 900, color: "#fff", marginBottom: "18px" }}>{balance < 0 ? "-" : ""}{formatFull(Math.abs(balance))}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: "24px" }}>
                  <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>📥 Pemasukan</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#a5f3c4" }}>{formatRupiah(totalIncome)}</div></div>
                  <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>📤 Pengeluaran</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#fca5a5" }}>{formatRupiah(totalExpense)}</div></div>
                </div>
              </div>
              {emailStatus && <div style={{ marginTop: "10px", fontSize: "12px", color: "#fff", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>{emailStatus}</div>}
              {sheetsStatus && <div style={{ marginTop: "6px", fontSize: "12px", color: "#fff", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>{sheetsStatus}</div>}
            </div>
          </div>
        )}

        {showMainNav && (
          <div style={{ margin: "0 20px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "4px", display: "flex", gap: "4px", flexWrap: "wrap", overflowX: "hidden" }}>
            {hasPermission("dashboard") && <button style={tabStyle("dashboard")} onClick={() => setActiveTab("dashboard")}>📊 Ringkasan</button>}
            {hasPermission("history") && <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>📋 Riwayat</button>}
            {canAccessFamilyPage && <button style={tabStyle("family")} onClick={() => { setFamilyView("overview"); setActiveTab("family"); }}>👨‍👩‍👧‍👦 Keluarga</button>}
            {hasPermission("goals") && <button style={tabStyle("savings")} onClick={() => setActiveTab("savings")}>🎯 Tabungan</button>}
            {hasPermission("investments") && <button style={tabStyle("invest")} onClick={() => setActiveTab("invest")}>📈 Investasi</button>}
            {hasPermission("gadai") && <button style={tabStyle("gadai")} onClick={() => setActiveTab("gadai")}>🏦 Pinjaman</button>}
            {hasPermission("wallets") && <button style={tabStyle("dompet")} onClick={openWalletManager}>👛 Sumber Dana</button>}
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ padding: "0 20px" }}>
            {(loading && transactions.length === 0) ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>Memuat data...</div>
            : Object.keys(expenseByCategory).length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>💰</div><div style={{ fontSize: "14px" }}>{dataError || (transactions.length === 0 ? "Data Firestore belum terbaca" : "Bulan ini kosong, cek tab Riwayat untuk transaksi terbaru")}</div><div style={{ fontSize: "11px", marginTop: "8px", color: "#555" }}>Debug: {transactions.length} transaksi terbaca</div></div>
            : EXPENSE_CATS.filter(c => expenseByCategory[c.id]).map(cat => {
              const spent = expenseByCategory[cat.id] || 0;
              return (
                <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ marginBottom: "14px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}><span style={{ fontSize: "13px" }}>{cat.icon} {cat.label}</span><span style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(spent)}</span></div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}><div style={{ height: "100%", borderRadius: "10px", width: (spent / barMax * 100) + "%", background: "linear-gradient(90deg,#6366f1,#10b981)" }} /></div>
                </div>
              );
            })}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === "history" && (
          <div style={{ padding: "0 20px" }}>
            {(loading && transactions.length === 0) ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>Memuat data...</div>
            : displayTxns.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>🧾</div><div style={{ fontSize: "14px" }}>{dataError || (transactions.length === 0 ? "Data Firestore belum terbaca" : "Tidak ada transaksi untuk filter ini")}</div><div style={{ fontSize: "11px", marginTop: "8px", color: "#555" }}>Debug: {transactions.length} transaksi terbaca</div></div>
            : displayTxns.map(t => {
              const cat = CATEGORIES.find(c => c.id === t.category);
              return (
                <div key={t.id} onClick={() => setSelectedTransaction(t)} style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px", marginBottom: "8px", borderRadius: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "22px" }}>{cat ? cat.icon : ""}</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>{cat ? cat.label : ""}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{t.user} - {t.note || t.date}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: t.type === "income" ? "#34d399" : "#f87171" }}>{t.type === "income" ? "+" : "-"}{formatRupiah(t.amount)}</div>
                    <div style={{ fontSize: "16px", color: "#444" }}>💰</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAMILY */}
        {activeTab === "family" && (
          <div style={{ padding: "0 20px" }}>
            {!canAccessFamilyPage ? (
              <div style={{ padding: "22px", marginBottom: "14px", borderRadius: "20px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", color: "#fef3c7" }}>
                <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#fbbf24", fontWeight: 900, textTransform: "uppercase", marginBottom: "8px" }}>Akses dibatasi</div>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "8px" }}>Family Management belum diizinkan</div>
                <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#fde68a" }}>Role kamu saat ini: <b>{currentRole}</b>. Akses halaman ini mengikuti Permission Manager yang dikelola oleh Owner.</div>
                <button onClick={() => setActiveTab("dashboard")} style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Kembali ke Home</button>
              </div>
            ) : familyView === "overview" ? (
              <>
                <div style={{ padding: "18px", marginBottom: "14px", borderRadius: "20px", background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(16,185,129,0.10))", border: "1px solid rgba(99,102,241,0.28)" }}>
                  <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", marginBottom: "6px" }}>Keluarga</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "8px" }}>Log Transaksi per User</div>
                  <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>Halaman Keluarga sekarang fokus untuk melihat kontribusi dan transaksi setiap anggota. Pengaturan anggota tetap berada di Settings → Family Management.</div>
                </div>
                {activeFamilyMembers.map(member => {
                  const txns = transactions.filter(t => t.user === member.name).slice(0, 5);
                  const monthUserTxns = filteredMonthTxns.filter(t => t.user === member.name);
                  const income = monthUserTxns.filter(t => t.type === "income").reduce((s,t) => s + (t.amount || 0), 0);
                  const expense = monthUserTxns.filter(t => t.type === "expense").reduce((s,t) => s + (t.amount || 0), 0);
                  return (
                    <div key={member.id || member.name} style={{ padding: "16px", marginBottom: "12px", borderRadius: "18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                        <div>
                          <div style={{ fontSize: "18px", fontWeight: 900, color: "#fff" }}>{member.avatar || "👤"} {member.name}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{member.role} · {member.status || "active"}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "12px", color: "#86efac", fontWeight: 900 }}>+{formatRupiah(income)}</div>
                          <div style={{ fontSize: "12px", color: "#fca5a5", fontWeight: 900 }}>-{formatRupiah(expense)}</div>
                        </div>
                      </div>
                      {txns.length === 0 ? <div style={{ fontSize: "12px", color: "#64748b" }}>Belum ada transaksi untuk user ini.</div> : txns.map(tx => {
                        const info = getCategoryInfo(tx.category);
                        return <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "12px" }}><span style={{ color: "#cbd5e1" }}>{info.icon} {info.label} · {tx.date}</span><b style={{ color: tx.type === "income" ? "#86efac" : "#fca5a5" }}>{tx.type === "income" ? "+" : "-"}{formatRupiah(tx.amount)}</b></div>;
                      })}
                    </div>
                  );
                })}
                <button onClick={() => setActiveTab("dashboard")} style={{ padding: "12px 14px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontWeight: 900, cursor: "pointer", width: "100%" }}>← Kembali ke Home</button>
              </>
            ) : (
              <>
            <div style={{ padding: "18px", marginBottom: "14px", borderRadius: "20px", background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(16,185,129,0.10))", border: "1px solid rgba(99,102,241,0.28)" }}>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", marginBottom: "6px" }}>Family Edition Phase 3.2</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "8px" }}>Family Management</div>
              <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
                Phase 3.2 merapikan hierarki UI: Family Management fokus pada panel aktif, Settings fokus pada pengaturan, dan fitur utama tetap di navigasi utama.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "14px" }}>
                <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(0,0,0,0.18)" }}><div style={{ fontSize: "10px", color: "#94a3b8" }}>Active</div><div style={{ fontSize: "18px", fontWeight: 900 }}>{activeFamilyMembers.length}</div></div>
                <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(0,0,0,0.18)" }}><div style={{ fontSize: "10px", color: "#94a3b8" }}>Total</div><div style={{ fontSize: "18px", fontWeight: 900 }}>{familyEditionMembers.length}</div></div>
                <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(0,0,0,0.18)" }}><div style={{ fontSize: "10px", color: "#94a3b8" }}>Roles</div><div style={{ fontSize: "18px", fontWeight: 900 }}>{FAMILY_ROLES_V110.length}</div></div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              <button onClick={() => setActiveTab("dashboard")} style={{ padding: "10px 12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#e5e7eb", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>← Home</button>
              <button onClick={() => setFamilyPanel("members")} style={{ padding: "10px 12px", borderRadius: "14px", border: "none", background: familyPanel === "members" ? "#6366f1" : "rgba(255,255,255,0.07)", color: familyPanel === "members" ? "#fff" : "#94a3b8", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>👨‍👩‍👧 Anggota</button>
              {canManagePermissions && <button onClick={() => setFamilyPanel("permissions")} style={{ padding: "10px 12px", borderRadius: "14px", border: "none", background: familyPanel === "permissions" ? "#6366f1" : "rgba(255,255,255,0.07)", color: familyPanel === "permissions" ? "#fff" : "#94a3b8", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>🛡️ Permission</button>}
            </div>

            {familyStatus && <div style={{ marginBottom: "12px", padding: "12px", borderRadius: "14px", background: familyStatus.startsWith("✅") ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", border: "1px solid " + (familyStatus.startsWith("✅") ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"), color: familyStatus.startsWith("✅") ? "#86efac" : "#fbbf24", fontSize: "12px", fontWeight: 800 }}>{familyStatus}</div>}

            <div style={{ padding: "16px", marginBottom: "14px", borderRadius: "18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>Current Session</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#fff" }}>{currentFamilyMember.avatar} {currentFamilyMember.name}</div>
                </div>
                <div style={{ padding: "8px 12px", borderRadius: "999px", background: "rgba(251,191,36,0.12)", color: "#fbbf24", fontSize: "12px", fontWeight: 900 }}>{currentFamilyMember.role}</div>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>PIN status: {currentFamilyMember.pinStatus}. Halaman ini sekarang fokus pada panel aktif: Anggota atau Permission. Activity Log dipindahkan ke Settings dan mengikuti permission.</div>
            </div>

            {familyPanel === "members" && <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff" }}>👨‍👩‍👧‍👦 Anggota Keluarga</div>
                <button onClick={startAddFamilyMember} style={{ padding: "9px 12px", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>+ Tambah</button>
              </div>

              {showFamilyForm && (
                <div style={{ padding: "14px", marginBottom: "12px", borderRadius: "18px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.28)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 900, color: "#c7d2fe", marginBottom: "10px" }}>{editingFamilyMemberId ? "✏️ Edit Anggota" : "➕ Tambah Anggota"}</div>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <input value={familyForm.name} onChange={e => setFamilyForm({ ...familyForm, name: e.target.value })} placeholder="Nama anggota" style={inputStyle} />
                    <div style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: "8px" }}>
                      <input value={familyForm.avatar} onChange={e => setFamilyForm({ ...familyForm, avatar: e.target.value })} placeholder="Icon" style={inputStyle} />
                      <select value={familyForm.role} onChange={e => setFamilyForm({ ...familyForm, role: e.target.value })} style={inputStyle}>
                        {FAMILY_ROLES_V110.map(role => <option key={role.id} value={role.label}>{role.icon} {role.label}</option>)}
                      </select>
                    </div>
                    <select value={familyForm.status} onChange={e => setFamilyForm({ ...familyForm, status: e.target.value })} style={inputStyle}>
                      <option value="active">Aktif</option>
                      <option value="archived">Arsip</option>
                    </select>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button onClick={handleSaveFamilyMember} style={{ padding: "12px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: "13px", fontWeight: 900, cursor: "pointer" }}>Simpan</button>
                      <button onClick={resetFamilyForm} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#e5e7eb", fontSize: "13px", fontWeight: 900, cursor: "pointer" }}>Batal</button>
                    </div>
                  </div>
                </div>
              )}

              {!familyLoaded && <div style={{ padding: "12px", color: "#64748b", fontSize: "12px" }}>Memuat data family...</div>}
              {familyEditionMembers.map(member => {
                const role = FAMILY_ROLES_V110.find(r => r.label === member.role);
                return (
                  <div key={member.id} style={{ padding: "14px", marginBottom: "9px", borderRadius: "16px", background: member.isCurrent ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.05)", border: "1px solid " + (member.isCurrent ? "rgba(99,102,241,0.32)" : "rgba(255,255,255,0.06)"), opacity: member.status === "archived" ? 0.58 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.08)", fontSize: "20px" }}>{member.avatar}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{member.name} {member.isCurrent ? "· aktif" : ""}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>{member.transactionCount} transaksi · {member.walletCount} sumber dana · {member.status === "archived" ? "arsip" : "aktif"}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 900, color: role?.color || "#e5e7eb" }}>{role?.icon} {member.role}</div>
                        <div style={{ fontSize: "10px", color: member.pinStatus === "PIN aktif" ? "#34d399" : "#f59e0b" }}>{member.pinStatus}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "7px", marginTop: "11px" }}>
                      <button onClick={() => startEditFamilyMember(member)} style={{ padding: "9px", borderRadius: "12px", border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.10)", color: "#c7d2fe", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>✏️ Edit</button>
                      <button onClick={() => resetMemberPin(member.name)} style={{ padding: "9px", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.22)", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>🔑 Reset PIN</button>
                      <button onClick={() => archiveFamilyMember(member.id)} style={{ padding: "9px", borderRadius: "12px", border: "1px solid rgba(248,113,113,0.22)", background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>{member.status === "archived" ? "↩ Aktif" : "📦 Arsip"}</button>
                    </div>
                  </div>
                );
              })}
            </div>}

            {familyPanel === "permissions" && <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff", marginBottom: "10px" }}>🛡️ Permission Manager</div>
              {rolePermissionSummary.map(role => (
                <div key={role.id} style={{ padding: "14px", marginBottom: "9px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 900, color: role.color }}>{role.icon} {role.label}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{role.count}/{PERMISSIONS_V110.length} izin</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "8px" }}>{role.desc}</div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {PERMISSIONS_V110.map(permission => {
                      const allowed = role.permissions.includes(permission.id);
                      const locked = role.label === "Owner" && OWNER_LOCKED_PERMISSIONS_V110.includes(permission.id);
                      return <button key={permission.id} onClick={() => toggleRolePermission(role.label, permission.id)} disabled={locked || !canManagePermissions} style={{ padding: "9px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 900, textAlign: "left", cursor: locked || !canManagePermissions ? "not-allowed" : "pointer", background: allowed ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.04)", color: allowed ? "#86efac" : "#64748b", border: "1px solid " + (allowed ? "rgba(16,185,129,0.22)" : "rgba(255,255,255,0.05)"), opacity: locked ? 0.82 : 1 }}>{allowed ? "☑" : "☐"} {permission.icon} {permission.label}{locked ? " · locked" : ""}</button>;
                    })}
                  </div>
                </div>
              ))}
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", color: "#a5b4fc", fontSize: "12px", lineHeight: 1.5 }}>
                Permission tersimpan di Firebase. Owner dapat mencentang/mematikan akses role; permission inti Owner dikunci agar tidak terkunci dari sistem.
              </div>
            </div>}

            {familyPanel === "activity" && isOwner && <>
            <div style={{ padding: "16px", marginBottom: "14px", borderRadius: "18px", background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.22)" }}>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#7dd3fc", marginBottom: "8px" }}>📝 Activity Log Lengkap</div>
              {activityLog.length === 0 ? <div style={{ fontSize: "12px", color: "#94a3b8" }}>Belum ada aktivitas tercatat.</div> : activityLog.slice(0, 12).map(item => (
                <div key={item.id} style={{ padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 900, color: "#e0f2fe" }}>{item.actor || "System"} · {item.action}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{item.detail}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: "16px", marginBottom: "14px", borderRadius: "18px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)" }}>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#fbbf24", marginBottom: "8px" }}>🧭 Roadmap berikutnya</div>
              <div style={{ display: "grid", gap: "8px", fontSize: "12px", color: "#fef3c7", lineHeight: 1.5 }}>
                <div>✅ Phase 1: UI foundation, roles, permission blueprint.</div>
                <div>✅ Phase 2: CRUD anggota keluarga, role, reset PIN, activity log dasar.</div>
                <div>✅ Phase 2.1: Access control awal, relogin ke Home, UI per halaman aktif.</div>
                <div>✅ Phase 3.1: User switcher aktif dan izin tambah/hapus transaksi mengikuti permission.</div>
                <div>✅ Phase 3.2: Settings dirapikan; Tabungan/Goal dan Investasi keluar dari Settings dan tetap di navigasi utama.</div>
                <div>✅ Phase 4: Wallet v2: Rename, Archive, Merge Sumber Dana.</div>
                <div>✅ Phase 5: Activity Log lengkap + Recycle Bin 30 hari.</div>
                <div>✅ Phase 5.2: Goal UI dibuat sederhana; Activity Log mengikuti permission.</div>
                <div>✅ Phase 5.3: +Tunai/+Aset Goal aktif, terhubung ke Sumber Dana, dan dicatat di Activity Log.</div>
                <div>✅ Phase 5.4.2: UI Activity Log dan alokasi Goal dirapikan; pembatalan tunai/aset tetap aktif.</div>
              </div>
            </div>
            </>}

              </>
            )}
          </div>
        )}

        {/* TABUNGAN */}
        {activeTab === "savings" && (
          <div style={{ padding: "0 20px" }}>
            {/* Harga pasar mini */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", marginBottom: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>
                {marketPrices ? "Nilai pasar: USD " + formatFull(marketPrices.usdIdr) + " · Emas " + formatRupiah(marketPrices.goldPerGram) + "/gr" : "Harga pasar belum dimuat. Tekan refresh untuk update USD/emas."}
              </div>
              <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "8px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>{loadingPrices ? "⏳" : "🔄"}</button>
            </div>

            {/* Total */}
            <div style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(124,58,237,0.15))", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ fontSize: "11px", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Goal Engine Preview · Dana nyata vs target</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "2px" }}>{formatRupiah(totalSavingsCurrent)}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Dana/aset yang benar-benar dialokasikan</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 900, color: "#c7d2fe" }}>{((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(2)}%</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>dari {formatRupiah(totalSavingsTarget)}</div>
                </div>
              </div>
              <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginTop: "10px" }}>
                <div style={{ height: "100%", borderRadius: "10px", width: (Math.min((totalSavingsCurrent / totalSavingsTarget) * 100, 100)) + "%", background: "linear-gradient(90deg,#6366f1,#10b981)", transition: "width 0.8s ease" }} />
              </div>
              <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "12px", background: "rgba(0,0,0,0.18)", color: "#cbd5e1", fontSize: "11px", lineHeight: 1.5 }}>
                Target goal bukan aset. Yang dihitung sebagai modal hanya uang/aset yang sudah dialokasikan ke goal.
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", overflowX: "hidden", marginBottom: "12px" }}>
              {CATEGORY_GROUPS.map(g => <button key={g.id} style={savTabStyle(g.id)} onClick={() => setSavingsTab(g.id)}>{g.label}</button>)}
            </div>

            {savingsTab === "education" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                {EDUCATION_CHILDREN.map(child => {
                  const goals = SAVINGS_GOALS.filter(g => g.category === child.id);
                  const target = goals.reduce((s,g) => s + g.targetAmount, 0);
                  const current = goals.reduce((s,g) => s + calcGoalValue(g.id), 0);
                  const active = selectedEducationChild === child.id;
                  return <button key={child.id} onClick={() => setSelectedEducationChild(child.id)} style={{ padding: "12px 8px", borderRadius: "14px", border: "1px solid " + (active ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.06)"), background: active ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.04)", color: active ? "#fff" : "#cbd5e1", textAlign: "left", cursor: "pointer" }}>
                    <div style={{ fontSize: "12px", fontWeight: 900 }}>{child.label}</div>
                    <div style={{ fontSize: "10px", color: active ? "#c7d2fe" : "#64748b", marginTop: "3px" }}>{formatRupiah(current)}</div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginTop: "7px" }}>
                      <div style={{ height: "100%", width: Math.min((current / Math.max(target, 1)) * 100, 100) + "%", background: "#6366f1" }} />
                    </div>
                  </button>;
                })}
              </div>
            )}

            {(() => {
              const goalsToShow = savingsTab === "education"
                ? SAVINGS_GOALS.filter(g => g.category === selectedEducationChild)
                : SAVINGS_GOALS.filter(g => g.category === savingsTab);
              const groupTarget = goalsToShow.reduce((s,g) => s + g.targetAmount, 0);
              const groupCurrent = goalsToShow.reduce((s,g) => s + calcGoalValue(g.id), 0);
              const groupRemaining = Math.max(groupTarget - groupCurrent, 0);
              const groupTitle = savingsTab === "education"
                ? (EDUCATION_CHILDREN.find(c => c.id === selectedEducationChild)?.label || "Pendidikan")
                : (CATEGORY_GROUPS.find(g => g.id === savingsTab)?.label || "Goals");

              return <>
                <div style={{ padding: "14px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{groupTitle}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{goalsToShow.length} goal · kurang {formatRupiah(groupRemaining)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#34d399" }}>{formatRupiah(groupCurrent)}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>/ {formatRupiah(groupTarget)}</div>
                    </div>
                  </div>
                </div>

                {goalsToShow.map(goal => {
                  const currentVal = calcGoalValue(goal.id);
                  const idrCash = savingsData[goal.id] || 0;
                  const holdings = savingsHoldings[goal.id] || [];
                  const cashAllocations = sumberDanaLedger
                    .filter(l => l.refType === "goal_allocation" && String(l.refId) === String(goal.id) && Number(l.amount || 0) < 0 && !l.cancelled)
                    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
                  const pct = Math.min((currentVal / Math.max(goal.targetAmount, 1)) * 100, 100);
                  const remaining = Math.max(goal.targetAmount - currentVal, 0);
                  const monthlyNeeded = remaining > 0 ? Math.ceil(remaining / Math.max(goal.yearsLeft * 12, 1)) : 0;
                  const priority = getGoalPriorityLabel(goal);
                  const stage = getGoalStageLabel(goal);

                  return (
                    <div key={goal.id} style={{ padding: "14px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                            <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{goal.icon} {stage}</div>
                            <span style={{ padding: "3px 7px", borderRadius: "999px", background: priority === "Wajib" ? "rgba(239,68,68,0.14)" : "rgba(99,102,241,0.14)", color: priority === "Wajib" ? "#fca5a5" : "#c7d2fe", fontSize: "10px", fontWeight: 900 }}>{priority}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: 1.45 }}>{goal.desc} · {goal.yearsLeft} thn lagi</div>
                        </div>
                        {canContributeGoal() && (
                          <div style={{ display: "grid", gap: "6px", flexShrink: 0 }}>
                            <button onClick={() => { setShowSavingsForm(goal.id); setSavingsInput(""); setSavingsInputDisplay(""); }} style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.35)", color: "#a5b4fc", borderRadius: "9px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 800 }}>+ Tunai</button>
                            <button onClick={() => { setShowAssetConvert(goal.id); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" }); }} style={{ background: "rgba(16,185,129,0.16)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399", borderRadius: "9px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 800 }}>+ Aset</button>
                          </div>
                        )}
                      </div>

                      <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginBottom: "7px" }}>
                        <div style={{ height: "100%", borderRadius: "10px", width: pct + "%", background: "linear-gradient(90deg," + goal.color + "," + goal.color + "99)", transition: "width 0.8s ease" }} />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "9px" }}>
                        <div><div style={{ fontSize: "10px", color: "#64748b" }}>Terkumpul</div><div style={{ fontSize: "12px", fontWeight: 900, color: "#86efac" }}>{formatRupiah(currentVal)}</div></div>
                        <div><div style={{ fontSize: "10px", color: "#64748b" }}>Target</div><div style={{ fontSize: "12px", fontWeight: 900, color: "#e5e7eb" }}>{formatRupiah(goal.targetAmount)}</div></div>
                        <div><div style={{ fontSize: "10px", color: "#64748b" }}>Kurang</div><div style={{ fontSize: "12px", fontWeight: 900, color: remaining > 0 ? "#fca5a5" : "#86efac" }}>{formatRupiah(remaining)}</div></div>
                      </div>

                      {(idrCash > 0 || cashAllocations.length > 0 || holdings.length > 0) && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          {idrCash > 0 && cashAllocations.length === 0 && <span style={{ padding: "5px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#cbd5e1", fontSize: "10px", fontWeight: 800 }}>💵 Tunai teralokasi {formatRupiah(idrCash)}</span>}
                          {cashAllocations.slice(0, 3).map(a => {
                            const source = sumberDanaList.find(s => s.id === a.sumberDanaId);
                            const amount = Math.abs(Number(a.amount || 0));
                            return <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "999px", background: "rgba(99,102,241,0.08)", color: "#cbd5e1", fontSize: "10px", fontWeight: 800 }}>
                              <span>💵 Tunai {formatRupiah(amount)}{source ? " · " + source.name : ""}</span>
                              {canContributeGoal() && <button onClick={() => cancelGoalCashAllocation(goal.id, a.id)} title="Batalkan alokasi tunai" style={{ border: "none", background: "rgba(248,113,113,0.14)", color: "#fca5a5", borderRadius: "999px", padding: "2px 5px", cursor: "pointer", fontSize: "9px", fontWeight: 900 }}>Batal</button>}
                            </span>;
                          })}
                          {cashAllocations.length > 3 && <span style={{ padding: "5px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: "10px", fontWeight: 800 }}>+{cashAllocations.length - 3} alokasi tunai</span>}
                          {holdings.slice(0, 4).map(h => {
                            const at = ASSET_TYPES.find(a => a.id === h.assetType);
                            const val = calcAssetValue(h, marketPrices);
                            return <span key={h.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#cbd5e1", fontSize: "10px", fontWeight: 800 }}>
                              <span>{at ? at.icon : "🏦"} Aset · {h.ticker || (at ? at.label : "Aset")} {formatRupiah(val)}</span>
                              {canContributeGoal() && h.sumberDanaId && <button onClick={() => cancelGoalAssetAllocation(goal.id, h.id)} title="Batalkan alokasi aset" style={{ border: "none", background: "rgba(248,113,113,0.14)", color: "#fca5a5", borderRadius: "999px", padding: "2px 5px", cursor: "pointer", fontSize: "9px", fontWeight: 900 }}>Batal</button>}
                            </span>;
                          })}
                          {holdings.length > 4 && <span style={{ padding: "5px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: "10px", fontWeight: 800 }}>+{holdings.length - 4} aset</span>}
                        </div>
                      )}

                      {remaining > 0 ? (
                        <div style={{ background: "rgba(0,0,0,0.18)", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>
                          Butuh alokasi sekitar <b style={{ color: "#fff" }}>{formatRupiah(monthlyNeeded)}/bulan</b>. Nanti Financial Health Engine akan mengecek apakah income cukup sebelum goal opsional diaktifkan.
                        </div>
                      ) : (
                        <div style={{ background: "rgba(16,185,129,0.10)", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", color: "#86efac", fontWeight: 800 }}>✅ Target tercapai dan siap dipakai.</div>
                      )}
                    </div>
                  );
                })}
              </>;
            })()}
          </div>
        )}

        {/* INVESTASI */}
        {activeTab === "invest" && (
          <div style={{ padding: "0 20px" }}>

            {/* Harga pasar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", marginBottom: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "12px", color: "#555" }}>
                {marketPrices ? "USD " + formatFull(marketPrices.usdIdr) + " | Emas " + formatRupiah(marketPrices.goldPerGram) + "/gr" : "Harga belum dimuat"}
              </div>
              <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "8px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>{loadingPrices ? "\u23F3" : "\uD83D\uDD04"}</button>
            </div>

            {/* Total Portofolio */}
            <div style={{ padding: "16px", marginBottom: "16px", borderRadius: "16px", background: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(6,78,59,0.2))", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ fontSize: "11px", color: "#34d399", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Total Portofolio {marketPrices ? "(nilai pasar)" : ""}</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff", marginBottom: "8px" }}>{formatRupiah(totalInvNow)}</div>
              <div style={{ display: "flex", gap: "20px" }}>
                <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Modal</div><div style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(totalInvBuy)}</div></div>
                <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Untung/Rugi</div><div style={{ fontSize: "13px", fontWeight: 700, color: totalInvNow - totalInvBuy >= 0 ? "#34d399" : "#f87171" }}>{totalInvNow - totalInvBuy >= 0 ? "+" : ""}{formatRupiah(totalInvNow - totalInvBuy)}</div></div>
                <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Return</div><div style={{ fontSize: "13px", fontWeight: 700, color: totalInvNow - totalInvBuy >= 0 ? "#34d399" : "#f87171" }}>{totalInvBuy > 0 ? (((totalInvNow - totalInvBuy) / totalInvBuy) * 100).toFixed(1) : 0}%</div></div>
              </div>
            </div>

            {/* Daftar Investasi */}
            {invSummary.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>💰</div>
                <div style={{ fontSize: "14px" }}>Belum ada investasi tercatat</div>
              </div>
            ) : invSummary.map(inv => {
              const at = ASSET_TYPES.find(a => a.id === inv.assetType) || { icon: "\uD83D\uDCB0", label: inv.type, unit: "" };
              const needsManual = (at ? at.manual : false) && !inv.manualPrice;
              return (
                <div key={inv.id} onClick={() => setSelectedInvestment(inv)} style={{ padding: "14px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>{at.icon} {inv.ticker || at.label}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{inv.qty || inv.amount} {at.unit} • beli {formatRupiah(inv.buyPrice)} per {at.unit} - {inv.buyDate || "-"}</div>
                      {inv.note && <div style={{ fontSize: "11px", color: "#666" }}>{inv.note}</div>}
                    </div>
                    {currentUser === ADMIN_USER && <button onClick={() => deleteInvestment(inv.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: "18px" }}>x</button>}
                  </div>
                  {needsManual && currentUser === ADMIN_USER && (
                    <div style={{ marginBottom: "8px" }}>
                      <input placeholder="Update harga/unit sekarang (IDR)" style={{ ...inputStyle, fontSize: "11px", padding: "6px 10px" }}
                        onBlur={async e => {
                          if (!e.target.value) return;
                          const newPrice = parseDecimal(e.target.value);
                          // update in firebase
                          const snap = await import("firebase/firestore").then(m => m.getDocs(m.query(collection(db, "investments"), m.where("__name__", "==", inv.id))));
                          await import("firebase/firestore").then(m => m.updateDoc(doc(db, "investments", inv.id), { manualPrice: newPrice }));
                        }} />
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Nilai Sekarang</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{formatRupiah(inv.currentValue)}</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Untung/Rugi</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: inv.profitLoss >= 0 ? "#34d399" : "#f87171" }}>
                        {inv.profitLoss >= 0 ? "+" : ""}{formatRupiah(inv.profitLoss)} <span style={{ fontSize: "11px" }}>({inv.pct}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tombol tambah */}
            {currentUser === ADMIN_USER && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => { setShowAssetConvert("invest_cash"); setAssetForm({ assetType: "idr", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" }); }} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "2px dashed rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>? + Tunai</button>
                <button onClick={() => { setShowAssetConvert("invest_asset"); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" }); }} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "2px dashed rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.1)", color: "#34d399", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>? + Aset</button>
              </div>
            )}
          </div>
        )}

        {/* PINJAMAN / LOAN · GADAI SUBMODULE */}
        {activeTab === "gadai" && (
          <div style={{ padding: "0 20px" }}>
            <div style={{ padding: "18px", marginBottom: "16px", borderRadius: "18px", background: "linear-gradient(135deg,rgba(99,102,241,0.14),rgba(15,23,42,0.55))", border: "1px solid rgba(99,102,241,0.28)" }}>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", marginBottom: "6px" }}>Financial Engine · Phase 6.3</div>
              <div style={{ fontSize: "22px", color: "#fff", fontWeight: 900, marginBottom: "8px" }}>Pinjaman / Loan</div>
              <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.65 }}>
                Gadai sekarang menjadi submodul Pinjaman. Pencairan, pembayaran pokok, bunga/biaya, pembatalan pencairan, dan pelepasan jaminan mulai terhubung ke Financial Engine agar tidak double count.
              </div>
              <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(16,185,129,0.10)", color: "#86efac", fontSize: "12px", fontWeight: 800 }}>✅ Pencairan pinjaman: Wallet naik + Liability naik</div>
                <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(239,68,68,0.10)", color: "#fca5a5", fontSize: "12px", fontWeight: 800 }}>✅ Pelunasan: Wallet turun + Liability turun + bunga/biaya jadi expense</div>
                <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontSize: "12px", fontWeight: 800 }}>✅ Phase 6.3: tombol Bayar/Tebus mengurangi wallet, mengurangi pokok pinjaman, dan memisahkan bunga/biaya sebagai expense.</div>
              </div>
            </div>

            {/* Ringkasan Pinjaman Aktif */}
            {gadaiList.filter(g => g.status === "aktif").length > 0 && (
              <div style={{ padding: "16px", marginBottom: "16px", borderRadius: "16px", background: "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(180,100,0,0.1))", border: "1px solid rgba(245,158,11,0.3)" }}>
                <div style={{ fontSize: "11px", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Pinjaman Aktif · Gadai</div>
                <div style={{ display: "flex", gap: "20px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Total Pinjaman</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>{formatRupiah(gadaiList.filter(g => g.status === "aktif").reduce((s, g) => s + g.uangPinjaman, 0))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Total Lunas</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#f87171" }}>{formatRupiah(gadaiList.filter(g => g.status === "aktif").reduce((s, g) => s + g.totalLunas, 0))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Item Aktif</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#fbbf24" }}>{gadaiList.filter(g => g.status === "aktif").length} item</div>
                  </div>
                </div>
              </div>
            )}

            {/* Kalkulator Gadai */}
            <div style={{ padding: "16px", marginBottom: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showGadaiCalc ? "14px" : "0" }}>
                <div style={{ fontSize: "14px", fontWeight: 800 }}>🏦 Kalkulator Gadai Emas</div>
                <button onClick={() => setShowGadaiCalc(!showGadaiCalc)} style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24", borderRadius: "8px", padding: "6px 12px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>{showGadaiCalc ? "Tutup" : "Buka"}</button>
              </div>

              {showGadaiCalc && (
                <div>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Berat (gram)</div>
                      <input placeholder="contoh: 5" value={calcForm.beratGram} onChange={e => setCalcForm(f => ({...f, beratGram: e.target.value}))} inputMode="decimal" style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Kadar</div>
                      <select value={calcForm.kadar} onChange={e => setCalcForm(f => ({...f, kadar: e.target.value}))} style={{ ...inputStyle, color: "#e8e8f0" }}>
                        <option value="24">24K (99.9%)</option>
                        <option value="23">23K (95.8%)</option>
                        <option value="22">22K (91.7%)</option>
                        <option value="21">21K (87.5%)</option>
                        <option value="20">20K (83.3%)</option>
                        <option value="18">18K (75%)</option>
                        <option value="17">17K (70.8%)</option>
                        <option value="16">16K (66.7%)</option>
                        <option value="14">14K (58.3%)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Tenor</div>
                      <select value={calcForm.tenor} onChange={e => setCalcForm(f => ({...f, tenor: e.target.value}))} style={{ ...inputStyle, color: "#e8e8f0" }}>
                        <option value="15">15 hari</option>
                        <option value="30">30 hari</option>
                        <option value="60">60 hari</option>
                        <option value="90">90 hari</option>
                        <option value="120">120 hari</option>
                      </select>
                    </div>
                  </div>

                  {calcForm.beratGram && (() => {
                    const harga = (marketPrices ? marketPrices.goldPerGram : 1680000) || 1680000;
                    const hasil = hitungGadai(parseFloat(calcForm.beratGram), calcForm.kadar, harga, parseInt(calcForm.tenor));
                    return (
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "14px" }}>
                        <div style={{ fontSize: "10px", color: "#555", marginBottom: "10px" }}>Harga LM: {formatRupiah(harga)}/gram • Kadar {calcForm.kadar}K</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px" }}>
                            <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Nilai Emas</div>
                            <div style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(hasil.nilaiEmas)}</div>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px" }}>
                            <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Nilai Taksiran (92%)</div>
                            <div style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(hasil.nilaiTaksiran)}</div>
                          </div>
                          <div style={{ background: "rgba(16,185,129,0.1)", borderRadius: "8px", padding: "10px", border: "1px solid rgba(16,185,129,0.2)" }}>
                            <div style={{ fontSize: "10px", color: "#34d399", marginBottom: "2px" }}>💵 Uang Pinjaman (90%)</div>
                            <div style={{ fontSize: "15px", fontWeight: 900, color: "#34d399" }}>{formatRupiah(hasil.uangPinjaman)}</div>
                          </div>
                          <div style={{ background: "rgba(239,68,68,0.1)", borderRadius: "8px", padding: "10px", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <div style={{ fontSize: "10px", color: "#f87171", marginBottom: "2px" }}>💳 Total Lunas</div>
                            <div style={{ fontSize: "15px", fontWeight: 900, color: "#f87171" }}>{formatRupiah(hasil.totalLunas)}</div>
                          </div>
                        </div>
                        <div style={{ marginTop: "10px", background: "rgba(245,158,11,0.08)", borderRadius: "8px", padding: "10px", fontSize: "11px", color: "#888", lineHeight: 1.7 }}>
                          Bunga {hasil.bungaPer15}%/15hari x {hasil.periode} periode = <span style={{ color: "#fbbf24", fontWeight: 700 }}>{formatRupiah(hasil.totalBunga)}</span><br/>
                          Biaya admin estimasi: <span style={{ color: "#fbbf24" }}>{formatRupiah(hasil.biayaAdmin)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Daftar Pinjaman / Gadai */}
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Daftar Pinjaman / Gadai</div>

            {gadaiList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🧾</div>
                <div style={{ fontSize: "14px" }}>Belum ada pinjaman/gadai tercatat</div>
              </div>
            ) : gadaiList.map(g => {
              const { tglJatuh, sisa } = hitungSisaHari(g.tanggalGadai, g.tenor);
              const tglJatuhStr = tglJatuh.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
              const statusColor = g.status === "lunas" ? "#34d399" : g.status === "lelang" ? "#f87171" : sisa <= 7 ? "#f87171" : sisa <= 30 ? "#fbbf24" : "#a5b4fc";
              const statusLabel = g.status === "lunas" ? "✅ Lunas" : g.status === "lelang" ? "🔴 Dilelang" : g.status === "dibatalkan" ? "↩️ Dibatalkan" : sisa <= 0 ? "⚠️ Jatuh Tempo!" : "⏳ " + sisa + " hari lagi";

              return (
                <div key={g.id} style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid " + (g.status === "aktif" && sisa <= 7 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)") }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800 }}>{g.namaBarang}</div>
                      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{g.beratGram}gr • {g.kadar}K • Digadai {g.tanggalGadai}</div>
                      {g.sumberDanaName && <div style={{ fontSize: "11px", color: "#86efac", marginTop: "2px" }}>Masuk wallet: {g.sumberDanaName}</div>}
                      {g.catatan && <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{g.catatan}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                      {currentUser === ADMIN_USER && (
                        <button onClick={() => deleteGadai(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: "16px" }}>x</button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "8px" }}>
                      <div style={{ fontSize: "9px", color: "#555", marginBottom: "2px" }}>Taksiran</div>
                      <div style={{ fontSize: "12px", fontWeight: 700 }}>{formatRupiah(g.nilaiTaksiran)}</div>
                    </div>
                    <div style={{ background: "rgba(16,185,129,0.1)", borderRadius: "8px", padding: "8px" }}>
                      <div style={{ fontSize: "9px", color: "#34d399", marginBottom: "2px" }}>Pinjaman</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#34d399" }}>{formatRupiah(g.uangPinjaman)}</div>
                      {g.outstandingPrincipal !== undefined && <div style={{ fontSize: "9px", color: "#86efac", marginTop: "2px" }}>Sisa {formatRupiah(g.outstandingPrincipal)}</div>}
                    </div>
                    <div style={{ background: "rgba(239,68,68,0.1)", borderRadius: "8px", padding: "8px" }}>
                      <div style={{ fontSize: "9px", color: "#f87171", marginBottom: "2px" }}>Total Lunas</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>{formatRupiah(g.totalLunas)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "11px", color: "#555" }}>Jatuh tempo: <span style={{ color: "#e8e8f0" }}>{tglJatuhStr}</span></div>
                    {currentUser === ADMIN_USER && g.status === "aktif" && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button onClick={() => openLoanPayment(g)} style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", borderRadius: "8px", padding: "5px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>💳 Bayar / Tebus</button>
                        <button onClick={() => cancelLoanDisbursement(g)} style={{ background: "rgba(99,102,241,0.16)", border: "1px solid rgba(99,102,241,0.35)", color: "#c7d2fe", borderRadius: "8px", padding: "5px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>↩ Batal</button>
                        <button onClick={() => updateGadaiStatus(g.id, "lelang")} style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "8px", padding: "5px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>⚠️ Lelang</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Tombol Catat Gadai */}
            {currentUser === ADMIN_USER && (
              <button onClick={() => setShowGadaiForm(true)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Catat Pinjaman Gadai</button>
            )}
          </div>
        )}

        {/* DOMPET / SUMBER DANA */}
        {activeTab === "dompet" && (
          <div style={{ padding: "0 20px" }}>
            <div style={{ padding: "16px", marginBottom: "14px", borderRadius: "18px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", marginBottom: "6px" }}>Wallet v2 · Rename · Archive · Merge</div>
              <div style={{ fontSize: "20px", color: "#fff", fontWeight: 900, marginBottom: "8px" }}>Sumber Dana Keluarga</div>
              <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
                1. Tambahkan sumber dana sesuai kebutuhan: Cash, BCA, Mandiri, DANA, Owner Draw, atau lainnya.<br />
                2. Setiap transaksi wajib memilih sumber dana aktif agar saldo dompet akurat.<br />
                3. Jika salah ketik, gunakan Rename atau Merge agar data transaksi lama tidak hilang.
              </div>
            </div>
            {/* User filter */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", overflowX: "hidden", marginBottom: "16px" }}>
              {activeFamilyMembers.map(member => { const u = member.name; return (
                <button key={u} onClick={() => setWalletFilterUser(u)} style={{
                  padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
                  whiteSpace: "nowrap", fontSize: "12px", fontWeight: 700, flexShrink: 0,
                  background: walletFilterUser === u ? "#6366f1" : "rgba(255,255,255,0.07)",
                  color: walletFilterUser === u ? "#fff" : "#888",
                }}>{member.avatar || "👤"} {u} {u === currentUser ? "(saya)" : ""}</button>
              );})}
            </div>
            <button onClick={() => setShowArchivedWallets(prev => !prev)} style={{ width: "100%", padding: "10px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: showArchivedWallets ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)", color: showArchivedWallets ? "#fbbf24" : "#94a3b8", fontSize: "12px", fontWeight: 900, marginBottom: "14px" }}>
              {showArchivedWallets ? "📦 Menampilkan arsip/nonaktif" : "✅ Hanya sumber dana aktif/nonaktif"}
            </button>

            {/* Total saldo */}
            {(() => {
              const userSDs = sumberDanaList.filter(sd => sd.user === walletFilterUser && (showArchivedWallets || getSumberDanaStatus(sd) !== "archived"));
              const totalBalance = userSDs.reduce((s, sd) => s + calcSumberDanaBalance(sd.id), 0);
              return (
                <div style={{ padding: "18px", marginBottom: "16px", borderRadius: "16px", background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)", boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Total Saldo {walletFilterUser}</div>
                  <div style={{ fontSize: "26px", fontWeight: 900, color: "#fff" }}>{formatFull(totalBalance)}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>{userSDs.length} sumber dana</div>
                </div>
              );
            })()}

            {/* Daftar sumber dana */}
            {sumberDanaList.filter(sd => sd.user === walletFilterUser && (showArchivedWallets || getSumberDanaStatus(sd) !== "archived")).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>💰</div>
                <div style={{ fontSize: "14px" }}>Belum ada sumber dana</div>
              </div>
            ) : sumberDanaList.filter(sd => sd.user === walletFilterUser && (showArchivedWallets || getSumberDanaStatus(sd) !== "archived")).map(sd => {
              const balance = calcSumberDanaBalance(sd.id);
              const status = getSumberDanaStatus(sd);
              return (
                <div key={sd.id} onClick={() => openSumberDanaEditor(sd)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: "10px", borderRadius: "16px", background: status === "archived" ? "rgba(245,158,11,0.06)" : status === "inactive" ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.05)", border: "1px solid " + (sd.color || "rgba(255,255,255,0.06)"), cursor: "pointer", opacity: status === "archived" ? 0.72 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "26px" }}>{sd.icon}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>{sd.name}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>Saldo awal: {formatRupiah(sd.initialBalance || 0)}</div>
                      <div style={{ display: "inline-block", marginTop: "5px", padding: "3px 7px", borderRadius: "999px", background: status === "active" ? "rgba(16,185,129,0.14)" : status === "inactive" ? "rgba(245,158,11,0.14)" : "rgba(148,163,184,0.12)", color: status === "active" ? "#86efac" : status === "inactive" ? "#fbbf24" : "#94a3b8", fontSize: "10px", fontWeight: 900 }}>{status}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: balance >= 0 ? "#34d399" : "#f87171" }}>{formatRupiah(balance)}</div>
                    <div style={{ fontSize: "16px", color: "#444" }}>💰</div>
                  </div>
                </div>
              );
            })}

            {/* Tombol tambah - hanya untuk diri sendiri */}
            {walletFilterUser === currentUser && (
              <button onClick={() => { setShowSDForm(true); setSdForm({ name: "", icon: "💵", initialBalance: "", color: "#6366f1", status: "active" }); }} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Tambah Sumber Dana</button>
            )}
          </div>
        )}

        {hasPermission("transaction_add") && (activeTab === "dashboard" || activeTab === "history") && (
          <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "28px", right: "20px", width: "56px", height: "56px", borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "28px", boxShadow: "0 8px 32px rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>+</button>
        )}



        {AddTransactionModal()}
        {SumberDanaModal()}
        {SumberDanaDetailModal()}
        {RecycleBinModal()}
        {GoalCashFundingModal()}
        {GoalAssetFundingModal()}
        {LoanGadaiModal()}
        {LoanRepaymentModal()}
        {CategoryDetailModal()}
        {TransactionDetailModal()}

        {/* Recovery: semua modal sementara dinonaktifkan agar build stabil. Data history tetap dibaca dari Firestore. */}

      </div>
    </div>
  );
}
