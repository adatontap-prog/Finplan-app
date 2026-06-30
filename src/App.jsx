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

// ?? Google Sheets Sync ??????????????????????????????????????
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

const DEFAULT_USER_PROFILES = USERS.map((name, index) => ({
  id: name.toLowerCase(),
  name,
  avatar: name === "Bape" ? "👑" : name === "Ibu" ? "🌸" : "👤",
  role: name === "Bape" ? "admin" : "member",
  active: true,
  order: index,
}));

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
  { id: "aroon", label: "\uD83D\uDCDA Aroon", color: "#6366f1" },
  { id: "arunika", label: "\uD83D\uDCDA Arunika", color: "#ec4899" },
  { id: "arkaja", label: "\uD83D\uDCDA Arkaja", color: "#10b981" },
  { id: "future", label: "\uD83C\uDFE0 Masa Depan", color: "#f59e0b" },
  { id: "pension", label: "\uD83D\uDC74 Pensiun", color: "#14b8a6" },
  { id: "health", label: "\uD83C\uDFE5 Kesehatan", color: "#ef4444" },
];

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
  let report = "? " + dateStr + "\n" + "=".repeat(40) + "\n\n";
  let totalIncome = 0, totalExpense = 0;
  Object.entries(userSummary).forEach(([user, data]) => {
    if (data.items.length === 0) return;
    report += "? " + user + "\n" + data.items.join("\n") + "\n  Saldo: " + formatFull(data.income - data.expense) + "\n\n";
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
  const [savingsTab, setSavingsTab] = useState("aroon");
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
  const [calcForm, setCalcForm] = useState({ beratGram: "", kadar: "24", tenor: "120" });
  const [sumberDanaList, setSumberDanaList] = useState([]);
  const [sumberDanaLedger, setSumberDanaLedger] = useState([]);
  const [walletFilterUser, setWalletFilterUser] = useState("");
  const [showSDForm, setShowSDForm] = useState(false);
  const [sdForm, setSdForm] = useState({ name: "", icon: "\uD83D\uDCB5", initialBalance: "" });
  const [selectedSD, setSelectedSD] = useState(null);
  const [transactionSDId, setTransactionSDId] = useState("");
  const [savingsSDId, setSavingsSDId] = useState("");
  const [assetSDId, setAssetSDId] = useState("");
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("finplan_user") || "");
  const [form, setForm] = useState({ type: "expense", category: "makan", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
  const [invForm, setInvForm] = useState({ type: "usd", amount: "", buyPrice: "", note: "", buyDate: new Date().toISOString().split("T")[0] });
  const [savingsInput, setSavingsInput] = useState("");
  const [savingsInputDisplay, setSavingsInputDisplay] = useState("");
  const [assetForm, setAssetForm] = useState({ assetType: "lm", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" });
  const [amountDisplay, setAmountDisplay] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterUser, setFilterUser] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState("");
  const [userProfiles, setUserProfiles] = useState(DEFAULT_USER_PROFILES);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", avatar: "👤", role: "member", active: true });

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

  const activeUserProfiles = (userProfiles || DEFAULT_USER_PROFILES)
    .filter(u => u && u.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const appUsers = activeUserProfiles.map(u => u.name);
  const currentUserProfile = activeUserProfiles.find(u => u.name === currentUser) || userProfiles.find(u => u.name === currentUser) || { name: currentUser, avatar: "👤", role: "member" };
  const isAdmin = currentUserProfile?.role === "admin" || currentUser === ADMIN_USER;

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

  // Keep login simple after refresh: if session is still valid, restore last user automatically.
  useEffect(() => {
    if (hasValidSession() && authStep === "unlocked" && !currentUser) {
      const savedUser = localStorage.getItem("finplan_user") || "Bape";
      setCurrentUser(savedUser);
      setWalletFilterUser(savedUser);
    }
  }, [authStep, currentUser]);

  // Recovery safety: if Firestore data is already available, never keep Ringkasan/Riwayat stuck in loading state.
  useEffect(() => {
    if (transactions.length > 0 && loading) setLoading(false);
  }, [transactions.length, loading]);

  // Load editable user profiles from Firebase
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "users"),
      snap => {
        if (snap.exists() && Array.isArray(snap.data().users)) {
          setUserProfiles(snap.data().users);
        } else {
          setUserProfiles(DEFAULT_USER_PROFILES);
        }
      },
      err => {
        console.error("users settings listener error:", err);
        setUserProfiles(DEFAULT_USER_PROFILES);
      }
    );
    return () => unsub();
  }, []);

  async function saveUserProfiles(nextUsers) {
    const normalized = nextUsers.map((u, index) => ({
      id: u.id || String(u.name || "").toLowerCase().replace(/\s+/g, "_") || ("user_" + Date.now()),
      name: String(u.name || "").trim(),
      avatar: u.avatar || "👤",
      role: u.role === "admin" ? "admin" : "member",
      active: u.active !== false,
      order: typeof u.order === "number" ? u.order : index,
    })).filter(u => u.name);
    await setDoc(doc(db, "settings", "users"), { users: normalized, updatedAt: new Date().toISOString() }, { merge: true });
    setUserProfiles(normalized);
  }

  function openNewUserForm() {
    setEditingUser(null);
    setUserForm({ name: "", avatar: "👤", role: "member", active: true });
    setShowUserSettings(true);
  }

  function openEditUserForm(user) {
    setEditingUser(user);
    setUserForm({ name: user.name || "", avatar: user.avatar || "👤", role: user.role || "member", active: user.active !== false });
    setShowUserSettings(true);
  }

  async function handleSaveUser() {
    const name = String(userForm.name || "").trim();
    if (!name) return alert("Nama user wajib diisi.");
    const existing = userProfiles || DEFAULT_USER_PROFILES;
    let next;
    if (editingUser) {
      next = existing.map(u => u.id === editingUser.id || u.name === editingUser.name ? { ...u, ...userForm, name } : u);
    } else {
      if (existing.some(u => String(u.name).toLowerCase() === name.toLowerCase())) return alert("Nama user sudah ada.");
      next = [...existing, { id: name.toLowerCase().replace(/\s+/g, "_"), name, avatar: userForm.avatar || "👤", role: userForm.role || "member", active: userForm.active !== false, order: existing.length }];
    }
    await saveUserProfiles(next);
    setEditingUser(null);
    setUserForm({ name: "", avatar: "👤", role: "member", active: true });
  }

  async function toggleUserActive(user) {
    const next = (userProfiles || DEFAULT_USER_PROFILES).map(u => u.id === user.id || u.name === user.name ? { ...u, active: u.active === false ? true : false } : u);
    await saveUserProfiles(next);
  }

  async function resetUserPin(userName) {
    if (!window.confirm("Reset PIN untuk " + userName + "? User akan diminta membuat PIN baru.")) return;
    const userPins = { ...(securityData?.userPins || {}) };
    delete userPins[userName];
    const newData = { ...(securityData || {}), userPins };
    await setDoc(doc(db, "settings", "security"), newData, { merge: true });
    setSecurityData(newData);
    alert("PIN " + userName + " sudah di-reset.");
  }

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
        clearSession();
        setAuthStep("family");
        setPinInput("");
        setPinError("");
        setCurrentUser("");
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
  const usersWithData = [...new Set([...appUsers, ...transactions.map(t => t.user).filter(Boolean)])];
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
    const amt = parseAmount(savingsInput);
    if (!amt) return;
    const newData = { ...savingsData, [goalId]: (savingsData[goalId] || 0) + amt };
    await setDoc(doc(db, "savings", "goals"), newData);
    setSavingsData(newData);
    if (savingsSDId) {
      const goalLabel = SAVINGS_GOALS.find(g => g.id === goalId)?.label || goalId;
      await logLedger(savingsSDId, -amt, "Setor tabungan: " + goalLabel, "savings", goalId);
    }
    setShowSavingsForm(null); setSavingsInput(""); setSavingsInputDisplay(""); setSavingsSDId("");
  }

  async function addSavingsAsset(goalId) {
    const qty = parseDecimal(assetForm.qty);
    const buyPrice = parseDecimal(assetForm.buyPrice);
    if (!qty) return;

    const assetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);
    const newHolding = {
      id: Date.now(),
      assetType: assetForm.assetType,
      qty,
      buyPrice,
      manualPrice: assetForm.manualPrice ? parseDecimal(assetForm.manualPrice) : null,
      ticker: assetForm.ticker || null,
      note: assetForm.note || null,
      idrValue: assetForm.assetType === "idr" ? qty : assetForm.assetType === "obligasi" ? qty : null,
      addedAt: new Date().toISOString(),
    };

    const existing = savingsHoldings[goalId] || [];
    const updated = { ...savingsHoldings, [goalId]: [...existing, newHolding] };
    await setDoc(doc(db, "savings", "holdings"), updated);
    setSavingsHoldings(updated);

    if (assetSDId) {
      const buyValueIdr = ["idr","obligasi"].includes(assetForm.assetType) ? qty : qty * buyPrice;
      const goalLabel = SAVINGS_GOALS.find(g => g.id === goalId)?.label || goalId;
      await logLedger(assetSDId, -buyValueIdr, "Setor aset " + (assetType?.label||"") + " ke " + goalLabel, "savings", goalId);
    }

    // Sync ke Google Sheets
    const goalLabel = SAVINGS_GOALS.find(g => g.id === goalId)?.label || goalId;
    syncToSheets("addSavings", { ...newHolding, goalId, goalLabel, unit: assetType?.unit || "" });

    setShowAssetConvert(null);
    setAssetForm({ assetType: "lm", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" });
    setAssetSDId("");
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
    const amt = parseAmount(form.amount);
    if (!amt || !form.date || !transactionSDId) return;
    const sd = sumberDanaList.find(s => s.id === transactionSDId);
    const txData = { type: form.type, category: form.category, amount: amt, note: form.note, date: form.date, user: currentUser, sumberDanaId: transactionSDId, sumberDanaName: sd?.name || "", createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, "transactions"), txData);
    await logLedger(transactionSDId, form.type === "income" ? amt : -amt, (form.type === "income" ? "Pemasukan" : "Pengeluaran") + ": " + (form.note || CATEGORIES.find(c=>c.id===form.category)?.label||""), "transaction", docRef.id);
    // Sync ke Google Sheets
    syncToSheets("addTransaction", { ...txData, id: docRef.id });
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
    setAssetForm({ assetType: "lm", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" });
    setAssetSDId("");
  }

  async function deleteTransaction(id) {
    await deleteDoc(doc(db, "transactions", id));
    const relatedLedger = sumberDanaLedger.filter(l => l.refType === "transaction" && l.refId === id);
    for (const l of relatedLedger) await deleteDoc(doc(db, "sumberDanaLedger", l.id));
    syncToSheets("deleteTransaction", { id });
  }
  async function deleteInvestment(id) {
    await deleteDoc(doc(db, "investments", id));
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
    const hasil = hitungGadai(berat, gadaiForm.kadar, harga, parseInt(gadaiForm.tenor));
    const gadaiData = {
      namaBarang: gadaiForm.namaBarang, beratGram: berat, kadar: gadaiForm.kadar,
      hargaEmasGadai: harga, nilaiTaksiran: hasil.nilaiTaksiran,
      uangPinjaman: hasil.uangPinjaman, totalBunga: hasil.totalBunga,
      totalLunas: hasil.totalLunas, tanggalGadai: gadaiForm.tanggalGadai,
      tenor: parseInt(gadaiForm.tenor), catatan: gadaiForm.catatan,
      status: "aktif", createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "gadai"), gadaiData);
    syncToSheets("addGadai", { ...gadaiData, id: docRef.id });
    setShowGadaiForm(false);
    setGadaiForm({ namaBarang: "", beratGram: "", kadar: "24", hargaEmas: "", nilaiTaksiran: "", uangPinjaman: "", tanggalGadai: new Date().toISOString().split("T")[0], tenor: "120", catatan: "" });
  }

  async function updateGadaiStatus(id, status) {
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "gadai", id), { status, updatedAt: new Date().toISOString() });
    syncToSheets("updateGadai", { id, status });
  }

  async function deleteGadai(id) { await deleteDoc(doc(db, "gadai", id)); }

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

  async function addSumberDana() {
    if (!sdForm.name) return;
    const initBal = parseAmount(sdForm.initialBalance);
    await addDoc(collection(db, "sumberDana"), {
      user: currentUser, name: sdForm.name, icon: sdForm.icon, initialBalance: initBal,
      createdAt: new Date().toISOString(),
    });
    setShowSDForm(false);
    setSdForm({ name: "", icon: "\uD83D\uDCB5", initialBalance: "" });
  }

  async function deleteSumberDana(id) {
    await deleteDoc(doc(db, "sumberDana", id));
  }

  const myFundingSources = sumberDanaList.filter(sd => sd.user === currentUser);

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
  const tabStyle = (key) => ({ flex: "0 0 auto", padding: "8px 10px", border: "none", cursor: "pointer", borderRadius: "10px", fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", background: activeTab === key ? "#6366f1" : "transparent", color: activeTab === key ? "#fff" : "#666", transition: "all 0.2s" });
  const savTabStyle = (key) => ({ padding: "6px 12px", border: "none", cursor: "pointer", borderRadius: "20px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, background: savingsTab === key ? "#6366f1" : "rgba(255,255,255,0.07)", color: savingsTab === key ? "#fff" : "#888" });
  const inputStyle = { width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 14px", color: "#fff", fontSize: "14px", fontWeight: 600, outline: "none", boxSizing: "border-box" };
  const selectedAssetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);

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
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "280px", margin: "0 auto" }}>
        {digits.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            {row.map((d, j) => (
              <button key={j} onClick={() => d === "\u232B" ? onDelete() : d ? onPress(d) : null}
                disabled={disabled || (!d && d !== "0")}
                style={{
                  width: "76px", height: "76px", borderRadius: "50%", border: "none",
                  background: d ? "rgba(255,255,255,0.1)" : "transparent",
                  color: "#fff", fontSize: d === "\u232B" ? "22px" : "24px",
                  fontWeight: 700, cursor: d ? "pointer" : "default",
                  transition: "all 0.15s",
                  opacity: (!d && d !== "0") ? 0 : 1,
                }}>{d}</button>
            ); })}
          </div>
        ))}
        <button onClick={onSubmit} style={{
          width: "100%", padding: "16px", borderRadius: "14px", border: "none",
          background: "linear-gradient(135deg,#6366f1,#7c3aed)",
          color: "#fff", fontSize: "16px", fontWeight: 800,
          cursor: "pointer", marginTop: "8px",
          opacity: pinInput.length === PIN_DIGITS ? 1 : 0.4,
        }}>Konfirmasi</button>
      </div>
    );
  };

  const PinDots = ({ filled }) => (
    <div style={{ display: "flex", gap: "16px", justifyContent: "center", margin: "28px 0" }}>
      {Array.from({ length: PIN_DIGITS }).map((_, i) => (
        <div key={i} style={{
          width: i < filled ? "16px" : "16px",
          height: i < filled ? "16px" : "16px",
          borderRadius: "50%",
          background: i < filled ? "#6366f1" : "rgba(255,255,255,0.2)",
          transition: "all 0.15s",
          transform: i < filled ? "scale(1.2)" : "scale(1)",
        }} />
      ))}
    </div>
  );

  const AuthScreen = ({ children }) => (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "380px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>💰</div>
        <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "4px" }}>FinPlan ADP</div>
        {children}







        {showUserSettings && isAdmin && (
          <div onClick={() => setShowUserSettings(false)} style={{
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
                  <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#10b981", fontWeight: 900, textTransform: "uppercase" }}>User Management</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Kelola Member</div>
                </div>
                <button onClick={() => setShowUserSettings(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800 }}>×</button>
              </div>

              <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                {(userProfiles || DEFAULT_USER_PROFILES).map(u => (
                  <div key={u.id || u.name} style={{ padding: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 900 }}>{u.avatar || "👤"} {u.name}</div>
                      <div style={{ fontSize: "12px", color: "#888" }}>{u.role || "member"} · {u.active === false ? "nonaktif" : "aktif"}</div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openEditUserForm(u)} style={{ padding: "8px 10px", borderRadius: "10px", border: "none", background: "rgba(99,102,241,0.25)", color: "#fff", fontWeight: 800 }}>Edit</button>
                      <button onClick={() => toggleUserActive(u)} style={{ padding: "8px 10px", borderRadius: "10px", border: "none", background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 800 }}>{u.active === false ? "On" : "Off"}</button>
                      <button onClick={() => resetUserPin(u.name)} style={{ padding: "8px 10px", borderRadius: "10px", border: "none", background: "rgba(245,158,11,0.18)", color: "#fbbf24", fontWeight: 800 }}>PIN</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: "14px", borderRadius: "18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", gap: "10px" }}>
                <div style={{ fontSize: "14px", fontWeight: 900 }}>{editingUser ? "Edit User" : "Tambah User Baru"}</div>
                <input value={userForm.name} onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Nama user" style={inputStyle} />
                <input value={userForm.avatar} onChange={(e) => setUserForm(prev => ({ ...prev, avatar: e.target.value }))} placeholder="Emoji avatar, contoh 👤" style={inputStyle} />
                <select value={userForm.role} onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={handleSaveUser} style={{ padding: "14px", borderRadius: "16px", border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 900 }}>
                  {editingUser ? "Simpan Perubahan" : "Tambah User"}
                </button>
                {editingUser && <button onClick={() => { setEditingUser(null); setUserForm({ name: "", avatar: "👤", role: "member", active: true }); }} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#aaa", fontWeight: 800 }}>Batal Edit</button>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );



  const AddTransactionModal = () => {
    if (!showForm) return null;
    const selectableFundingSources = myFundingSources.length > 0 ? myFundingSources : sumberDanaList;
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
            <button onClick={async () => { const ok = window.confirm("Hapus transaksi ini?"); if (!ok) return; await deleteTransaction(tx.id); setSelectedTransaction(null); }} style={{ marginTop: "6px", width: "100%", padding: "14px", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.12)", color: "#fca5a5", fontWeight: 900, fontSize: "14px" }}>Hapus Transaksi</button>
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>💰</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff" }}>FinPlan ADP</div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>Siapa yang sedang login?</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {activeUserProfiles.map(profile => { const u = profile.name; return (
            <button key={u} onClick={() => handleUserSelectForPin(u)} style={{
              padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.05)", color: "#e8e8f0", fontSize: "15px",
              fontWeight: 700, cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>{u} {u === ADMIN_USER ? "\uD83D\uDC51" : ""}</span>
              <span style={{ fontSize: "12px", color: (securityData?.userPins || {})[u] ? "#34d399" : "#f59e0b" }}>
                {(securityData?.userPins || {})[u] ? "\uD83D\uDD12 PIN aktif" : "\u26A0 Belum ada PIN"}
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0" }}>
      <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", position: "relative" }}>

        <div style={{ padding: "28px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#6366f1", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>💰 FinPlan ADP</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>Halo, {currentUser}! {currentUser === ADMIN_USER ? "\uD83D\uDC51" : "\uD83D\uDC4B"}</div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => { clearSession(); setAuthStep("family"); setPinInput(""); setPinError(""); setCurrentUser(""); localStorage.removeItem("finplan_user"); }} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "10px", padding: "8px 12px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>💰</button>
            {currentUser === ADMIN_USER && <button onClick={() => handleChangePw("family")} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#888", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>??</button>}
          </div>
        </div>

        <div style={{ padding: "8px 20px", display: "flex", gap: "6px", overflowX: "auto" }}>
          {MONTHS.map((m, i) => <button key={i} onClick={() => setFilterMonth(i)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 600, flexShrink: 0, background: filterMonth === i ? "#6366f1" : "rgba(255,255,255,0.07)", color: filterMonth === i ? "#fff" : "#888" }}>{m}</button>)}
        </div>

        <div style={{ padding: "6px 20px 12px", display: "flex", gap: "6px", overflowX: "auto" }}>
          {["semua", ...usersWithData].map(u => <button key={u} onClick={() => setFilterUser(u)} style={{ padding: "5px 12px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "11px", fontWeight: 600, flexShrink: 0, background: filterUser === u ? "#10b981" : "rgba(255,255,255,0.07)", color: filterUser === u ? "#fff" : "#888" }}>{u === "semua" ? "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66 Semua" : u}</button>)}
        </div>

        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)", borderRadius: "20px", padding: "22px", boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "rgba(255,255,255,0.7)", marginBottom: "6px", textTransform: "uppercase" }}>Saldo {filterUser === "semua" ? "Keluarga" : filterUser}</div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#fff", marginBottom: "18px" }}>{balance < 0 ? "-" : ""}{formatFull(Math.abs(balance))}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ display: "flex", gap: "24px" }}>
                <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>📥 Pemasukan</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#a5f3c4" }}>{formatRupiah(totalIncome)}</div></div>
                <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>📤 Pengeluaran</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#fca5a5" }}>{formatRupiah(totalExpense)}</div></div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={handleSendReport} disabled={sending} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>{sending ? "\uD83D\uDCE4..." : "\uD83D\uDCE7"}</button>
                <button onClick={handleSyncAll} disabled={syncingSheets} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>{syncingSheets ? "\u23F3" : "\uD83D\uDCCA Sync"}</button>
                <button onClick={exportBackupJSON} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>💾 JSON</button>
              </div>
            </div>
            {emailStatus && <div style={{ marginTop: "10px", fontSize: "12px", color: "#fff", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>{emailStatus}</div>}
            {sheetsStatus && <div style={{ marginTop: "6px", fontSize: "12px", color: "#fff", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>{sheetsStatus}</div>}
          </div>
        </div>

        <div style={{ margin: "0 20px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "4px", display: "flex", gap: "2px", overflowX: "auto" }}>
          <button style={tabStyle("dashboard")} onClick={() => setActiveTab("dashboard")}>📊 Ringkasan</button>
          <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>📋 Riwayat</button>
          <button style={tabStyle("family")} onClick={() => setActiveTab("family")}>👨‍👩‍👧‍👦 Keluarga</button>
          <button style={tabStyle("savings")} onClick={() => setActiveTab("savings")}>🎯 Tabungan</button>
          <button style={tabStyle("invest")} onClick={() => setActiveTab("invest")}>📈 Investasi</button>
          <button style={tabStyle("gadai")} onClick={() => setActiveTab("gadai")}>🏦 Gadai</button>
          <button style={tabStyle("dompet")} onClick={() => setActiveTab("dompet")}>👛 Dompet</button>
        </div>

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
            {usersWithData.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>???????</div><div style={{ fontSize: "14px" }}>Belum ada data</div></div>
            : usersWithData.map(user => {
              const ut = transactions.filter(t => {
                const d = getTxnDate(t);
                return d && d.getMonth() === filterMonth && d.getFullYear() === targetYear && t.user === user;
              });
              const ui = ut.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
              const ue = ut.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
              return (
                <div key={user} style={{ padding: "16px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800 }}>{user} {user === ADMIN_USER ? "\uD83D\uDC51" : ""}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: ui - ue >= 0 ? "#34d399" : "#f87171" }}>{formatRupiah(ui - ue)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>📥 Masuk</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#34d399" }}>{formatRupiah(ui)}</div></div>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>📤 Keluar</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>{formatRupiah(ue)}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABUNGAN */}
        {activeTab === "savings" && (
          <div style={{ padding: "0 20px" }}>
            {/* Harga pasar mini */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", marginBottom: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "12px", color: "#555" }}>
                {marketPrices ? "USD " + formatFull(marketPrices.usdIdr) + " | Emas " + formatRupiah(marketPrices.goldPerGram) + "/gr" : "Harga belum dimuat"}
              </div>
              <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "8px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>{loadingPrices ? "\u23F3" : "\uD83D\uDD04"}</button>
            </div>

            {/* Total */}
            <div style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(124,58,237,0.15))", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ fontSize: "11px", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Total Semua Tabungan {marketPrices ? "(nilai pasar)" : ""}</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "2px" }}>{formatRupiah(totalSavingsCurrent)}</div>
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px" }}>dari {formatRupiah(totalSavingsTarget)}</div>
              <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "10px", width: (Math.min((totalSavingsCurrent / totalSavingsTarget) * 100, 100)) + "%", background: "linear-gradient(90deg,#6366f1,#10b981)", transition: "width 0.8s ease" }} />
              </div>
              <div style={{ fontSize: "11px", color: "#a5b4fc", marginTop: "4px", textAlign: "right" }}>{((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(2)}%</div>
            </div>

            {/* Per anak mini */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              {childTotals.map(({ child, target, current }) => (
                <div key={child} style={{ flex: 1, padding: "10px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#e8e8f0", textTransform: "capitalize", marginBottom: "4px" }}>{child}</div>
                  <div style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>{formatRupiah(current)}</div>
                  <div style={{ fontSize: "10px", color: "#555" }}>/ {formatRupiah(target)}</div>
                  <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginTop: "4px" }}>
                    <div style={{ height: "100%", borderRadius: "10px", width: (Math.min((current / target) * 100, 100)) + "%", background: "#6366f1" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "14px" }}>
              {CATEGORY_GROUPS.map(g => <button key={g.id} style={savTabStyle(g.id)} onClick={() => setSavingsTab(g.id)}>{g.label}</button>)}
            </div>

            {/* Goals */}
            {SAVINGS_GOALS.filter(g => g.category === savingsTab).map(goal => {
              const currentVal = calcGoalValue(goal.id);
              const idrCash = savingsData[goal.id] || 0;
              const holdings = savingsHoldings[goal.id] || [];
              const pct = Math.min((currentVal / goal.targetAmount) * 100, 100);
              const remaining = goal.targetAmount - currentVal;
              const monthlyNeeded = remaining > 0 ? Math.ceil(remaining / (goal.yearsLeft * 12)) : 0;

              return (
                <div key={goal.id} style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }} onClick={() => setSelectedGoal(goal.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 800 }}>{goal.icon} {goal.label}</div>
                      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{goal.desc} ? ? {goal.yearsLeft} thn lagi</div>
                    </div>
                    {currentUser === ADMIN_USER && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => { setShowSavingsForm(goal.id); setSavingsInput(""); setSavingsInputDisplay(""); }} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc", borderRadius: "8px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>? Tunai</button>
                        <button onClick={() => { setShowAssetConvert(goal.id); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" }); }} style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#34d399", borderRadius: "8px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>? Aset</button>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginBottom: "5px" }}>
                      <div style={{ height: "100%", borderRadius: "10px", width: (pct) + "%", background: "linear-gradient(90deg," + goal.color + "," + goal.color + "99)", transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#34d399", fontWeight: 700 }}>{formatRupiah(currentVal)}</span>
                      <span style={{ color: "#555" }}>{pct.toFixed(1)}% dari {formatRupiah(goal.targetAmount)}</span>
                    </div>
                  </div>

                  {/* Breakdown tunai vs aset */}
                  {(idrCash > 0 || holdings.length > 0) && (
                    <div style={{ marginBottom: "8px" }}>
                      {idrCash > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#666", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span>? Tunai IDR</span>
                          <span style={{ color: "#e8e8f0" }}>{formatRupiah(idrCash)}</span>
                        </div>
                      )}
                      {holdings.map(h => {
                        const at = ASSET_TYPES.find(a => a.id === h.assetType);
                        const val = calcAssetValue(h, marketPrices);
                        const buyVal = h.assetType === "usd" ? h.qty * h.buyPrice : h.assetType === "lm" ? h.qty * h.buyPrice : h.qty * (h.buyPrice || 0);
                        const gain = val - buyVal;
                        const needsManual = (at ? at.manual : false) && !h.manualPrice;
                        return (
                          <div key={h.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <span style={{ fontSize: "11px", color: "#888" }}>{at ? at.icon : ""} {h.ticker || (at ? at.label : "")} - {h.qty} {(at ? at.unit : "")}</span>
                                {h.note && <span style={{ fontSize: "10px", color: "#555", marginLeft: "4px" }}>({h.note})</span>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#e8e8f0" }}>{formatRupiah(val)}</div>
                                  {buyVal > 0 && <div style={{ fontSize: "10px", color: gain >= 0 ? "#34d399" : "#f87171" }}>{gain >= 0 ? "+" : ""}{formatRupiah(gain)}</div>}
                                </div>
                                {currentUser === ADMIN_USER && (
                                  <button onClick={() => removeHolding(goal.id, h.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: "16px", lineHeight: 1 }}>x</button>
                                )}
                              </div>
                            </div>
                            {needsManual && currentUser === ADMIN_USER && (
                              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                                <input placeholder="Update harga/unit sekarang" style={{ ...inputStyle, fontSize: "11px", padding: "6px 10px" }}
                                  onBlur={e => { if (e.target.value) updateManualPrice(goal.id, h.id, e.target.value); }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {remaining > 0 ? (
                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px", color: "#888" }}>
                      ? Kurang <span style={{ color: "#fff", fontWeight: 700 }}>{formatRupiah(remaining)}</span> ? Setor <span style={{ color: "#fff", fontWeight: 700 }}>{formatRupiah(monthlyNeeded)}/bln</span>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(16,185,129,0.1)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px", color: "#34d399", fontWeight: 700 }}>? Target tercapai!</div>
                  )}
                </div>
              );
            })}
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
                      <div style={{ fontSize: "11px", color: "#555" }}>{inv.qty || inv.amount} {at.unit} ? beli {formatRupiah(inv.buyPrice)} per {at.unit} - {inv.buyDate || "-"}</div>
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
                <button onClick={() => { setShowAssetConvert("invest_cash"); setAssetForm({ assetType: "idr", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" }); }} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "2px dashed rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>? + Tunai</button>
                <button onClick={() => { setShowAssetConvert("invest_asset"); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" }); }} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: "2px dashed rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.1)", color: "#34d399", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>? + Aset</button>
              </div>
            )}
          </div>
        )}

        {/* GADAI */}
        {activeTab === "gadai" && (
          <div style={{ padding: "0 20px" }}>

            {/* Ringkasan Gadai Aktif */}
            {gadaiList.filter(g => g.status === "aktif").length > 0 && (
              <div style={{ padding: "16px", marginBottom: "16px", borderRadius: "16px", background: "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(180,100,0,0.1))", border: "1px solid rgba(245,158,11,0.3)" }}>
                <div style={{ fontSize: "11px", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Gadai Aktif</div>
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
                <div style={{ fontSize: "14px", fontWeight: 800 }}>? Kalkulator Gadai Emas</div>
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
                        <div style={{ fontSize: "10px", color: "#555", marginBottom: "10px" }}>Harga LM: {formatRupiah(harga)}/gram ? Kadar {calcForm.kadar}K</div>
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
                            <div style={{ fontSize: "10px", color: "#34d399", marginBottom: "2px" }}>? Uang Pinjaman (90%)</div>
                            <div style={{ fontSize: "15px", fontWeight: 900, color: "#34d399" }}>{formatRupiah(hasil.uangPinjaman)}</div>
                          </div>
                          <div style={{ background: "rgba(239,68,68,0.1)", borderRadius: "8px", padding: "10px", border: "1px solid rgba(239,68,68,0.2)" }}>
                            <div style={{ fontSize: "10px", color: "#f87171", marginBottom: "2px" }}>? Total Lunas</div>
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

            {/* Daftar Gadai */}
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Daftar Gadai</div>

            {gadaiList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🧾</div>
                <div style={{ fontSize: "14px" }}>Belum ada gadai tercatat</div>
              </div>
            ) : gadaiList.map(g => {
              const { tglJatuh, sisa } = hitungSisaHari(g.tanggalGadai, g.tenor);
              const tglJatuhStr = tglJatuh.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
              const statusColor = g.status === "lunas" ? "#34d399" : g.status === "lelang" ? "#f87171" : sisa <= 7 ? "#f87171" : sisa <= 30 ? "#fbbf24" : "#a5b4fc";
              const statusLabel = g.status === "lunas" ? "\u2705 Lunas" : g.status === "lelang" ? "\uD83D\uDD34 Dilelang" : sisa <= 0 ? "\u26A0 Jatuh Tempo!" : sisa <= 7 ? "? " + sisa + " hari lagi" : sisa <= 30 ? "? " + sisa + " hari lagi" : "? " + sisa + " hari lagi";

              return (
                <div key={g.id} style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid " + (g.status === "aktif" && sisa <= 7 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)") }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800 }}>{g.namaBarang}</div>
                      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{g.beratGram}gr ? {g.kadar}K ? Digadai {g.tanggalGadai}</div>
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
                    </div>
                    <div style={{ background: "rgba(239,68,68,0.1)", borderRadius: "8px", padding: "8px" }}>
                      <div style={{ fontSize: "9px", color: "#f87171", marginBottom: "2px" }}>Total Lunas</div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>{formatRupiah(g.totalLunas)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "11px", color: "#555" }}>Jatuh tempo: <span style={{ color: "#e8e8f0" }}>{tglJatuhStr}</span></div>
                    {currentUser === ADMIN_USER && g.status === "aktif" && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => updateGadaiStatus(g.id, "lunas")} style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", borderRadius: "8px", padding: "5px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>? Lunas</button>
                        <button onClick={() => updateGadaiStatus(g.id, "lelang")} style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: "8px", padding: "5px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>? Lelang</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Tombol Catat Gadai */}
            {currentUser === ADMIN_USER && (
              <button onClick={() => setShowGadaiForm(true)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Catat Gadai Baru</button>
            )}
          </div>
        )}

        {/* DOMPET / SUMBER DANA */}
        {activeTab === "dompet" && (
          <div style={{ padding: "0 20px" }}>
            {/* User filter */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "16px" }}>
              {activeUserProfiles.map(profile => { const u = profile.name; return (
                <button key={u} onClick={() => setWalletFilterUser(u)} style={{
                  padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer",
                  whiteSpace: "nowrap", fontSize: "12px", fontWeight: 700, flexShrink: 0,
                  background: walletFilterUser === u ? "#6366f1" : "rgba(255,255,255,0.07)",
                  color: walletFilterUser === u ? "#fff" : "#888",
                }}>{u} {u === currentUser ? "(saya)" : ""}</button>
              ))}
            </div>

            {/* Total saldo */}
            {(() => {
              const userSDs = sumberDanaList.filter(sd => sd.user === walletFilterUser);
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
            {sumberDanaList.filter(sd => sd.user === walletFilterUser).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>💰</div>
                <div style={{ fontSize: "14px" }}>Belum ada sumber dana</div>
              </div>
            ) : sumberDanaList.filter(sd => sd.user === walletFilterUser).map(sd => {
              const balance = calcSumberDanaBalance(sd.id);
              return (
                <div key={sd.id} onClick={() => setSelectedSD(sd.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "26px" }}>{sd.icon}</div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>{sd.name}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>Saldo awal: {formatRupiah(sd.initialBalance || 0)}</div>
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
              <button onClick={() => { setShowSDForm(true); setSdForm({ name: "", icon: "\uD83D\uDCB5", initialBalance: "" }); }} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Tambah Sumber Dana</button>
            )}
          </div>
        )}

        {activeTab !== "invest" && activeTab !== "savings" && activeTab !== "dompet" && (
          <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "28px", right: "20px", width: "56px", height: "56px", borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "28px", boxShadow: "0 8px 32px rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>+</button>
        )}



        {AddTransactionModal()}
        {CategoryDetailModal()}
        {TransactionDetailModal()}

        {/* Recovery: semua modal sementara dinonaktifkan agar build stabil. Data history tetap dibaca dari Firestore. */}

      </div>
    </div>
  );
}
