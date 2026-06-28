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
const ADMIN_USER = "Bape";
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbx8vt1azC0xFS3v5Qbe_9ksbcXjvOmpBUxN5kt4b22nA1D5EFFob863Xve7RS_xxm6i/exec";
const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 menit
const PIN_SALT = "finplan_adp_2026";
const PIN_DIGITS = 6;

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
  { id: "gaji", label: "Gaji", icon: "\u{1F4BC}", type: "income" },
  { id: "freelance", label: "Freelance", icon: "\u{1F5A5}\uFE0F", type: "income" },
  { id: "investasi", label: "Investasi", icon: "\u{1F4C8}", type: "income" },
  { id: "lainnya_in", label: "Lainnya", icon: "\u2795", type: "income" },
  { id: "makan", label: "Makan", icon: "\u{1F35C}", type: "expense" },
  { id: "transport", label: "Transport", icon: "\u{1F697}", type: "expense" },
  { id: "belanja", label: "Belanja", icon: "\u{1F6CD}\uFE0F", type: "expense" },
  { id: "tagihan", label: "Tagihan", icon: "\u{1F4C4}", type: "expense" },
  { id: "hiburan", label: "Hiburan", icon: "\u{1F3AC}", type: "expense" },
  { id: "kesehatan", label: "Kesehatan", icon: "\u{1F3E5}", type: "expense" },
  { id: "tabungan", label: "Tabungan", icon: "\u{1F3E6}", type: "expense" },
  { id: "lainnya_ex", label: "Lainnya", icon: "\u2796", type: "expense" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
const USERS = ["Bape","Ibu","Aroon","Arunika","Arkaja"];

const SUMBER_DANA_PRESETS = [
  { name: "Cash", icon: "\u{1F4B5}" },
  { name: "Bank BCA", icon: "\u{1F3E6}" },
  { name: "Bank Mandiri", icon: "\u{1F3E6}" },
  { name: "Bank BNI", icon: "\u{1F3E6}" },
  { name: "Bank BRI", icon: "\u{1F3E6}" },
  { name: "GoPay", icon: "\u{1F7E2}" },
  { name: "OVO", icon: "\u{1F7E3}" },
  { name: "DANA", icon: "\u{1F535}" },
  { name: "ShopeePay", icon: "\u{1F7E0}" },
  { name: "Lainnya", icon: "\u{1F4B3}" },
];

const ASSET_TYPES = [
  { id: "idr", label: "Rupiah (IDR)", icon: "\u{1F4B5}", unit: "IDR", dynamic: false },
  { id: "usd", label: "Dollar USD", icon: "\u{1F1FA}\u{1F1F8}", unit: "USD", dynamic: true },
  { id: "lm", label: "LM Antam", icon: "\u{1F947}", unit: "gram", dynamic: true },
  { id: "jewelry", label: "Perhiasan 18K", icon: "\u{1F48D}", unit: "gram", dynamic: true },
  { id: "stock_id", label: "Saham IDX", icon: "\u{1F4C8}", unit: "lot", dynamic: true, manual: true },
  { id: "stock_us", label: "Saham US", icon: "\u{1F310}", unit: "lembar", dynamic: true },
  { id: "crypto", label: "Crypto", icon: "\u20BF", unit: "unit", dynamic: true },
  { id: "reksadana", label: "Reksa Dana", icon: "\u{1F4C1}", unit: "unit", dynamic: true, manual: true },
  { id: "obligasi", label: "Obligasi/Sukuk", icon: "\u{1F4DC}", unit: "IDR", dynamic: false },
  { id: "etf", label: "ETF", icon: "\u{1F5C2}\uFE0F", unit: "lot", dynamic: true },
];

const SAVINGS_GOALS = [
  { id: "aroon_sd", label: "SD Aroon (kelas 1-6)", icon: "\u{1F4DA}", category: "aroon", targetAmount: 61724880, yearsLeft: 1, color: "#6366f1", desc: "SD kelas 1-6 \u00B7 2026-2032" },
  { id: "aroon_smp", label: "SMP Aroon", icon: "\u{1F4D6}", category: "aroon", targetAmount: 63776196, yearsLeft: 6, color: "#8b5cf6", desc: "Mulai 2032 \u00B7 3 tahun" },
  { id: "aroon_sma", label: "SMA Aroon", icon: "\u{1F4DD}", category: "aroon", targetAmount: 127329175, yearsLeft: 9, color: "#a78bfa", desc: "Mulai 2035 \u00B7 3 tahun" },
  { id: "aroon_kuliah", label: "Kuliah Aroon", icon: "\u{1F393}", category: "aroon", targetAmount: 2353821282, yearsLeft: 12, color: "#c4b5fd", desc: "Mulai 2038 \u00B7 Eropa/Aussie" },
  { id: "arunika_kg1", label: "Kindergarten 1 Arunika", icon: "\u{1F3A8}", category: "arunika", targetAmount: 7700000, yearsLeft: 1, color: "#ec4899", desc: "Mulai 2027" },
  { id: "arunika_kg2", label: "Kindergarten 2 Arunika", icon: "\u{1F3A8}", category: "arunika", targetAmount: 8470000, yearsLeft: 2, color: "#f472b6", desc: "Mulai 2028" },
  { id: "arunika_sd", label: "SD Arunika", icon: "\u{1F4DA}", category: "arunika", targetAmount: 63888000, yearsLeft: 3, color: "#f9a8d4", desc: "Mulai 2029 \u00B7 kelas 1-6" },
  { id: "arunika_smp", label: "SMP Arunika", icon: "\u{1F4D6}", category: "arunika", targetAmount: 84886116, yearsLeft: 9, color: "#fbcfe8", desc: "Mulai 2035 \u00B7 3 tahun" },
  { id: "arunika_sma", label: "SMA Arunika", icon: "\u{1F4DD}", category: "arunika", targetAmount: 169475132, yearsLeft: 12, color: "#fce7f3", desc: "Mulai 2038 \u00B7 3 tahun" },
  { id: "arunika_kuliah", label: "Kuliah Arunika", icon: "\u{1F393}", category: "arunika", targetAmount: 3132936127, yearsLeft: 15, color: "#fbcfe8", desc: "Mulai 2041 \u00B7 Eropa/Aussie" },
  { id: "arkaja_nursery1", label: "Nursery 1 Arkaja", icon: "\u{1F9F8}", category: "arkaja", targetAmount: 5500000, yearsLeft: 1, color: "#10b981", desc: "Mulai Juli 2027" },
  { id: "arkaja_nursery2", label: "Nursery 2 Arkaja", icon: "\u{1F9F8}", category: "arkaja", targetAmount: 6050000, yearsLeft: 2, color: "#34d399", desc: "Mulai 2028" },
  { id: "arkaja_kg1", label: "Kindergarten 1 Arkaja", icon: "\u{1F3A8}", category: "arkaja", targetAmount: 9317000, yearsLeft: 3, color: "#6ee7b7", desc: "Mulai 2029" },
  { id: "arkaja_kg2", label: "Kindergarten 2 Arkaja", icon: "\u{1F3A8}", category: "arkaja", targetAmount: 10248700, yearsLeft: 4, color: "#a7f3d0", desc: "Mulai 2030" },
  { id: "arkaja_sd", label: "SD Arkaja", icon: "\u{1F4DA}", category: "arkaja", targetAmount: 77304480, yearsLeft: 5, color: "#d1fae5", desc: "Mulai 2031 \u00B7 kelas 1-6" },
  { id: "arkaja_smp", label: "SMP Arkaja", icon: "\u{1F4D6}", category: "arkaja", targetAmount: 102712201, yearsLeft: 11, color: "#a7f3d0", desc: "Mulai 2037 \u00B7 3 tahun" },
  { id: "arkaja_sma", label: "SMA Arkaja", icon: "\u{1F4DD}", category: "arkaja", targetAmount: 205064910, yearsLeft: 14, color: "#6ee7b7", desc: "Mulai 2040 \u00B7 3 tahun" },
  { id: "arkaja_kuliah", label: "Kuliah Arkaja", icon: "\u{1F393}", category: "arkaja", targetAmount: 3790852713, yearsLeft: 17, color: "#34d399", desc: "Mulai 2043 \u00B7 Eropa/Aussie" },
  { id: "emergency", label: "Dana Darurat", icon: "\u{1F6E1}\uFE0F", category: "future", targetAmount: 60000000, yearsLeft: 2, color: "#f59e0b", desc: "Target 6x pengeluaran bulanan" },
  { id: "future", label: "Masa Depan", icon: "\u{1F3E0}", category: "future", targetAmount: 500000000, yearsLeft: 10, color: "#fbbf24", desc: "Aset & masa depan keluarga" },
  { id: "pension", label: "Dana Pensiun", icon: "\u{1F474}", category: "pension", targetAmount: 3000000000, yearsLeft: 23, color: "#14b8a6", desc: "Target usia 60 tahun (2049)" },
  { id: "health", label: "Dana Kesehatan", icon: "\u{1F3E5}", category: "health", targetAmount: 150000000, yearsLeft: 5, color: "#ef4444", desc: "Cadangan di luar BPJS" },
  { id: "insurance", label: "Asuransi Jiwa", icon: "\u{1F48A}", category: "health", targetAmount: 60000000, yearsLeft: 3, color: "#f87171", desc: "Premi asuransi jiwa keluarga" },
];

const CATEGORY_GROUPS = [
  { id: "aroon", label: "\u{1F4DA} Aroon", color: "#6366f1" },
  { id: "arunika", label: "\u{1F4DA} Arunika", color: "#ec4899" },
  { id: "arkaja", label: "\u{1F4DA} Arkaja", color: "#10b981" },
  { id: "future", label: "\u{1F3E0} Masa Depan", color: "#f59e0b" },
  { id: "pension", label: "\u{1F474} Pensiun", color: "#14b8a6" },
  { id: "health", label: "\u{1F3E5} Kesehatan", color: "#ef4444" },
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
  return parseInt(String(str).replace(/\D/g, "")) || 0;
}

function parseDecimal(str) {
  return parseFloat(String(str).replace(/[^0-9.]/g, "")) || 0;
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
      savingsRows.push({ ...h, goalId, goalLabel: goal?.label || goalId });
    });
  });

  // Add cash savings
  Object.entries(savingsData || {}).forEach(([goalId, amount]) => {
    if (amount > 0) {
      const goal = SAVINGS_GOALS.find(g => g.id === goalId);
      savingsRows.push({ id: `cash_${goalId}`, goalId, goalLabel: goal?.label || goalId, assetType: "idr", qty: amount, unit: "IDR", buyPrice: 0, note: "Tunai IDR", addedAt: new Date().toISOString() });
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
    userSummary[t.user].items.push(`  ${cat?.icon} ${cat?.label}: ${t.type==="income"?"+":"-"}${formatFull(t.amount)}${t.note?` (${t.note})`:""}`);
  });
  let report = `? ${dateStr}\n${"=".repeat(40)}\n\n`;
  let totalIncome = 0, totalExpense = 0;
  Object.entries(userSummary).forEach(([user, data]) => {
    if (data.items.length === 0) return;
    report += `? ${user}\n${data.items.join("\n")}\n  Saldo: ${formatFull(data.income - data.expense)}\n\n`;
    totalIncome += data.income; totalExpense += data.expense;
  });
  report += `${"=".repeat(40)}\n? RINGKASAN KELUARGA\n? Pemasukan: ${formatFull(totalIncome)}\n? Pengeluaran: ${formatFull(totalExpense)}\n? Saldo: ${formatFull(totalIncome - totalExpense)}`;
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { to_email: REPORT_EMAIL, date: dateStr, report } }),
    });
    return res.ok ? { success: true } : { success: false, message: "Gagal mengirim" };
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
  const [sdForm, setSdForm] = useState({ name: "", icon: "\u{1F4B5}", initialBalance: "" });
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
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState("");

  // ===== SECURITY STATES =====
  const [securityData, setSecurityData] = useState(null);
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [authStep, setAuthStep] = useState("family"); // "family" | "userSelect" | "userPin" | "unlocked"
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [setupMode, setSetupMode] = useState(null); // null | "familyPw" | "userPin" | "confirmFamilyPw" | "confirmUserPin"
  const [pinConfirm, setPinConfirm] = useState("");
  const [tempPin, setTempPin] = useState("");
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    const unsub1 = onSnapshot(query(collection(db, "transactions"), orderBy("createdAt", "desc")), snap => { setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const unsub2 = onSnapshot(query(collection(db, "investments"), orderBy("createdAt", "desc")), snap => { setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsub3 = onSnapshot(doc(db, "savings", "goals"), snap => { if (snap.exists()) setSavingsData(snap.data()); });
    const unsub4 = onSnapshot(doc(db, "savings", "holdings"), snap => { if (snap.exists()) setSavingsHoldings(snap.data()); });
    const unsub5 = onSnapshot(query(collection(db, "gadai"), orderBy("createdAt", "desc")), snap => { setGadaiList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsub6 = onSnapshot(query(collection(db, "sumberDana"), orderBy("createdAt", "desc")), snap => { setSumberDanaList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsub7 = onSnapshot(collection(db, "sumberDanaLedger"), snap => { setSumberDanaLedger(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); };
  }, [currentUser]);

  useEffect(() => { if (activeTab === "invest" && !marketPrices) loadPrices(); }, [activeTab]);
  useEffect(() => { if (activeTab === "savings" && !marketPrices) loadPrices(); }, [activeTab]);
  useEffect(() => { if (currentUser && !walletFilterUser) setWalletFilterUser(currentUser); }, [currentUser]);

  // Load security data from Firebase
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "security"), snap => {
      if (snap.exists()) {
        setSecurityData(snap.data());
        setSecurityLoaded(true);
      } else {
        // First time - no security setup yet
        setSecurityData({});
        setSecurityLoaded(true);
        setSetupMode("familyPw");
      }
    });
    return () => unsub();
  }, []);

  // Auto-lock after 5 minutes of inactivity
  useEffect(() => {
    if (authStep !== "unlocked") return;
    const handleActivity = () => setLastActivity(Date.now());
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("click", handleActivity);
    const timer = setInterval(() => {
      if (Date.now() - lastActivity > AUTO_LOCK_MS) {
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

  const year = new Date().getFullYear();
  const monthTxns = transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === filterMonth && d.getFullYear() === year && (filterUser === "semua" || t.user === filterUser); });
  const totalIncome = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const expenseByCategory = {};
  monthTxns.filter(t => t.type === "expense").forEach(t => { expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount; });
  const usersWithData = [...new Set(transactions.map(t => t.user))];
  const barMax = Math.max(...Object.values(expenseByCategory), 1);

  const invTypeLabel = { usd: "\u{1F4B5} USD", lm: "\u{1F947} LM Antam", jewelry: "\u{1F48D} Perhiasan" };
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
      await logLedger(savingsSDId, -amt, `Setor tabungan: ${goalLabel}`, "savings", goalId);
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
      await logLedger(assetSDId, -buyValueIdr, `Setor aset ${assetType?.label} ke ${goalLabel}`, "savings", goalId);
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
    await logLedger(transactionSDId, form.type === "income" ? amt : -amt, `${form.type === "income" ? "Pemasukan" : "Pengeluaran"}: ${form.note || CATEGORIES.find(c=>c.id===form.category)?.label}`, "transaction", docRef.id);
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
      await logLedger(assetSDId, -buyValueIdr, `Beli investasi: ${assetForm.ticker || at?.label}`, "investment", docRef.id);
    }
    // Sync ke Google Sheets
    syncToSheets("addInvestment", { id: docRef.id, assetType: assetForm.assetType, ticker: assetForm.ticker, qty, unit: at?.unit || "", buyPrice, note: assetForm.note, buyDate: new Date().toISOString().split("T")[0] });
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
    const harga = parseAmount(gadaiForm.hargaEmas) || (marketPrices?.goldPerGram || 1680000);
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
    setSdForm({ name: "", icon: "\u{1F4B5}", initialBalance: "" });
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
    setSending(false); setEmailStatus(result.success ? "\u2705 Laporan terkirim!" : "\u274C " + result.message);
    setTimeout(() => setEmailStatus(""), 4000);
  }

  const EXPENSE_CATS = CATEGORIES.filter(c => c.type === "expense");
  const INCOME_CATS = CATEGORIES.filter(c => c.type === "income");
  const tabStyle = (key) => ({ flex: "0 0 auto", padding: "8px 10px", border: "none", cursor: "pointer", borderRadius: "10px", fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", background: activeTab === key ? "#6366f1" : "transparent", color: activeTab === key ? "#fff" : "#666", transition: "all 0.2s" });
  const savTabStyle = (key) => ({ padding: "6px 12px", border: "none", cursor: "pointer", borderRadius: "20px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, background: savingsTab === key ? "#6366f1" : "rgba(255,255,255,0.07)", color: savingsTab === key ? "#fff" : "#888" });
  const inputStyle = { width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 14px", color: "#fff", fontSize: "14px", fontWeight: 600, outline: "none", boxSizing: "border-box" };
  const selectedAssetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);

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
            ))}
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
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>?</div>
        <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "4px" }}>FinPlan ADP</div>
        {children}
      </div>
    </div>
  );

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
        {setupMode === "userPin" ? `Buat PIN untuk ${currentUser}` : "Konfirmasi PIN"}
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
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>?</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff" }}>FinPlan ADP</div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>Siapa yang sedang login?</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {USERS.map(u => (
            <button key={u} onClick={() => handleUserSelectForPin(u)} style={{
              padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.05)", color: "#e8e8f0", fontSize: "15px",
              fontWeight: 700, cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>{u} {u === ADMIN_USER ? "\u{1F451}" : ""}</span>
              <span style={{ fontSize: "12px", color: (securityData?.userPins || {})[u] ? "#34d399" : "#f59e0b" }}>
                {(securityData?.userPins || {})[u] ? "\u{1F512} PIN aktif" : "\u26A0\uFE0F Belum ada PIN"}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => { setAuthStep("family"); setPinInput(""); }} style={{ width: "100%", marginTop: "20px", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#555", fontSize: "13px", cursor: "pointer" }}>? Kembali</button>
      </div>
    </div>
  );

  // User PIN Screen
  if (authStep === "userPin") return (
    <AuthScreen>
      <div style={{ fontSize: "13px", color: "#10b981", textTransform: "uppercase", letterSpacing: "2px", marginTop: "24px" }}>Halo, {currentUser}! ?</div>
      <div style={{ fontSize: "13px", color: "#555", marginTop: "8px" }}>Masukkan PIN 6 digit kamu</div>
      <PinDots filled={pinInput.length} />
      {pinError && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "16px" }}>{pinError}</div>}
      <PinPad onPress={handlePinPress} onDelete={handlePinDelete} onSubmit={handleUserPinSubmit} />
      <button onClick={() => { setAuthStep("userSelect"); setPinInput(""); setPinError(""); }} style={{ marginTop: "20px", background: "none", border: "none", color: "#555", fontSize: "13px", cursor: "pointer" }}>? Ganti User</button>
    </AuthScreen>
  );

  // Guard: hanya tampil jika sudah unlock
  if (authStep !== "unlocked") return null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0" }}>
      <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", position: "relative" }}>

        <div style={{ padding: "28px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#6366f1", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>? FinPlan ADP</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>Halo, {currentUser}! {currentUser === ADMIN_USER ? "\u{1F451}" : "\u{1F44B}"}</div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => { setAuthStep("family"); setPinInput(""); setPinError(""); setCurrentUser(""); localStorage.removeItem("finplan_user"); }} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "10px", padding: "8px 12px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>?</button>
            {currentUser === ADMIN_USER && <button onClick={() => handleChangePw("family")} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#888", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>??</button>}
          </div>
        </div>

        <div style={{ padding: "8px 20px", display: "flex", gap: "6px", overflowX: "auto" }}>
          {MONTHS.map((m, i) => <button key={i} onClick={() => setFilterMonth(i)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 600, flexShrink: 0, background: filterMonth === i ? "#6366f1" : "rgba(255,255,255,0.07)", color: filterMonth === i ? "#fff" : "#888" }}>{m}</button>)}
        </div>

        <div style={{ padding: "6px 20px 12px", display: "flex", gap: "6px", overflowX: "auto" }}>
          {["semua", ...usersWithData].map(u => <button key={u} onClick={() => setFilterUser(u)} style={{ padding: "5px 12px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "11px", fontWeight: 600, flexShrink: 0, background: filterUser === u ? "#10b981" : "rgba(255,255,255,0.07)", color: filterUser === u ? "#fff" : "#888" }}>{u === "semua" ? "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466} Semua" : u}</button>)}
        </div>

        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)", borderRadius: "20px", padding: "22px", boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "rgba(255,255,255,0.7)", marginBottom: "6px", textTransform: "uppercase" }}>Saldo {filterUser === "semua" ? "Keluarga" : filterUser}</div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#fff", marginBottom: "18px" }}>{balance < 0 ? "-" : ""}{formatFull(Math.abs(balance))}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ display: "flex", gap: "24px" }}>
                <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>? Pemasukan</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#a5f3c4" }}>{formatRupiah(totalIncome)}</div></div>
                <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>? Pengeluaran</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#fca5a5" }}>{formatRupiah(totalExpense)}</div></div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={handleSendReport} disabled={sending} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>{sending ? "\u{1F4E4}..." : "\u{1F4E7}"}</button>
                <button onClick={handleSyncAll} disabled={syncingSheets} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>{syncingSheets ? "\u23F3" : "\u{1F4CA} Sync"}</button>
              </div>
            </div>
            {emailStatus && <div style={{ marginTop: "10px", fontSize: "12px", color: "#fff", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>{emailStatus}</div>}
            {sheetsStatus && <div style={{ marginTop: "6px", fontSize: "12px", color: "#fff", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>{sheetsStatus}</div>}
          </div>
        </div>

        <div style={{ margin: "0 20px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "4px", display: "flex", gap: "2px", overflowX: "auto" }}>
          <button style={tabStyle("dashboard")} onClick={() => setActiveTab("dashboard")}>? Ringkasan</button>
          <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>? Riwayat</button>
          <button style={tabStyle("family")} onClick={() => setActiveTab("family")}>????? Keluarga</button>
          <button style={tabStyle("savings")} onClick={() => setActiveTab("savings")}>? Tabungan</button>
          <button style={tabStyle("invest")} onClick={() => setActiveTab("invest")}>? Investasi</button>
          <button style={tabStyle("gadai")} onClick={() => setActiveTab("gadai")}>?? Gadai</button>
          <button style={tabStyle("dompet")} onClick={() => setActiveTab("dompet")}>? Dompet</button>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ padding: "0 20px" }}>
            {loading ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>Memuat data...</div>
            : Object.keys(expenseByCategory).length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>?</div><div style={{ fontSize: "14px" }}>Belum ada transaksi bulan ini</div></div>
            : EXPENSE_CATS.filter(c => expenseByCategory[c.id]).map(cat => {
              const spent = expenseByCategory[cat.id] || 0;
              return (
                <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ marginBottom: "14px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}><span style={{ fontSize: "13px" }}>{cat.icon} {cat.label}</span><span style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(spent)}</span></div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}><div style={{ height: "100%", borderRadius: "10px", width: `${spent / barMax * 100}%`, background: "linear-gradient(90deg,#6366f1,#10b981)" }} /></div>
                </div>
              );
            })}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === "history" && (
          <div style={{ padding: "0 20px" }}>
            {loading ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>Memuat data...</div>
            : monthTxns.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>??</div><div style={{ fontSize: "14px" }}>Belum ada transaksi</div></div>
            : monthTxns.map(t => {
              const cat = CATEGORIES.find(c => c.id === t.category);
              return (
                <div key={t.id} onClick={() => setSelectedTransaction(t)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px", marginBottom: "8px", borderRadius: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "22px" }}>{cat?.icon}</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>{cat?.label}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{t.user} ? {t.note || t.date}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: t.type === "income" ? "#34d399" : "#f87171" }}>{t.type === "income" ? "+" : "-"}{formatRupiah(t.amount)}</div>
                    <div style={{ fontSize: "16px", color: "#444" }}>?</div>
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
              const ut = transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === filterMonth && d.getFullYear() === year && t.user === user; });
              const ui = ut.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
              const ue = ut.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
              return (
                <div key={user} style={{ padding: "16px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800 }}>{user} {user === ADMIN_USER ? "\u{1F451}" : ""}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: ui - ue >= 0 ? "#34d399" : "#f87171" }}>{formatRupiah(ui - ue)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>? Masuk</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#34d399" }}>{formatRupiah(ui)}</div></div>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>? Keluar</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>{formatRupiah(ue)}</div></div>
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
                {marketPrices ? `? ${formatFull(marketPrices.usdIdr)} ? ? ${formatRupiah(marketPrices.goldPerGram)}/gr` : "Harga belum dimuat"}
              </div>
              <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "8px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>{loadingPrices ? "\u23F3" : "\u{1F504}"}</button>
            </div>

            {/* Total */}
            <div style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(124,58,237,0.15))", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ fontSize: "11px", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Total Semua Tabungan {marketPrices ? "(nilai pasar)" : ""}</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginBottom: "2px" }}>{formatRupiah(totalSavingsCurrent)}</div>
              <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px" }}>dari {formatRupiah(totalSavingsTarget)}</div>
              <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "10px", width: `${Math.min((totalSavingsCurrent / totalSavingsTarget) * 100, 100)}%`, background: "linear-gradient(90deg,#6366f1,#10b981)", transition: "width 0.8s ease" }} />
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
                    <div style={{ height: "100%", borderRadius: "10px", width: `${Math.min((current / target) * 100, 100)}%`, background: "#6366f1" }} />
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
                      <div style={{ height: "100%", borderRadius: "10px", width: `${pct}%`, background: `linear-gradient(90deg,${goal.color},${goal.color}99)`, transition: "width 0.8s ease" }} />
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
                        const needsManual = at?.manual && !h.manualPrice;
                        return (
                          <div key={h.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <span style={{ fontSize: "11px", color: "#888" }}>{at?.icon} {h.ticker || at?.label} ? {h.qty} {at?.unit}</span>
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
                {marketPrices ? `? ${formatFull(marketPrices.usdIdr)} ? ? ${formatRupiah(marketPrices.goldPerGram)}/gr` : "Harga belum dimuat"}
              </div>
              <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "8px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>{loadingPrices ? "\u23F3" : "\u{1F504}"}</button>
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
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>?</div>
                <div style={{ fontSize: "14px" }}>Belum ada investasi tercatat</div>
              </div>
            ) : invSummary.map(inv => {
              const at = ASSET_TYPES.find(a => a.id === inv.assetType) || { icon: "\u{1F4B0}", label: inv.type, unit: "" };
              const needsManual = at?.manual && !inv.manualPrice;
              return (
                <div key={inv.id} onClick={() => setSelectedInvestment(inv)} style={{ padding: "14px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>{at.icon} {inv.ticker || at.label}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{inv.qty || inv.amount} {at.unit} ? beli {formatRupiah(inv.buyPrice)}/{at.unit} ? {inv.buyDate || "-"}</div>
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
                    const harga = marketPrices?.goldPerGram || 1680000;
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
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>??</div>
                <div style={{ fontSize: "14px" }}>Belum ada gadai tercatat</div>
              </div>
            ) : gadaiList.map(g => {
              const { tglJatuh, sisa } = hitungSisaHari(g.tanggalGadai, g.tenor);
              const tglJatuhStr = tglJatuh.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
              const statusColor = g.status === "lunas" ? "#34d399" : g.status === "lelang" ? "#f87171" : sisa <= 7 ? "#f87171" : sisa <= 30 ? "#fbbf24" : "#a5b4fc";
              const statusLabel = g.status === "lunas" ? "\u2705 Lunas" : g.status === "lelang" ? "\u{1F534} Dilelang" : sisa <= 0 ? "\u26A0\uFE0F Jatuh Tempo!" : sisa <= 7 ? `? ${sisa} hari lagi` : sisa <= 30 ? `? ${sisa} hari lagi` : `? ${sisa} hari lagi`;

              return (
                <div key={g.id} style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: `1px solid ${g.status === "aktif" && sisa <= 7 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 800 }}>? {g.namaBarang}</div>
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
              {USERS.map(u => (
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
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>?</div>
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
                    <div style={{ fontSize: "16px", color: "#444" }}>?</div>
                  </div>
                </div>
              );
            })}

            {/* Tombol tambah - hanya untuk diri sendiri */}
            {walletFilterUser === currentUser && (
              <button onClick={() => { setShowSDForm(true); setSdForm({ name: "", icon: "\u{1F4B5}", initialBalance: "" }); }} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Tambah Sumber Dana</button>
            )}
          </div>
        )}

        {activeTab !== "invest" && activeTab !== "savings" && activeTab !== "dompet" && (
          <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "28px", right: "20px", width: "56px", height: "56px", borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "28px", boxShadow: "0 8px 32px rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>+</button>
        )}

        {/* ===== MODAL SETOR TUNAI ===== */}
        {showSavingsForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowSavingsForm(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setShowSavingsForm(null)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
            <div style={{ position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 12px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>? Setor Tunai</div>
                <div style={{ fontSize: "13px", color: "#a5b4fc", marginTop: "4px" }}>{SAVINGS_GOALS.find(g => g.id === showSavingsForm)?.icon} {SAVINGS_GOALS.find(g => g.id === showSavingsForm)?.label}</div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Jumlah (Rupiah)</div>
                <input placeholder="Rp 0" value={savingsInputDisplay} inputMode="numeric"
                  onChange={e => { const raw = e.target.value.replace(/\D/g,""); setSavingsInputDisplay(raw ? "Rp " + parseInt(raw).toLocaleString("id-ID") : ""); setSavingsInput(raw); }}
                  style={{ ...inputStyle, fontSize: "18px" }} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Potong dari Sumber Dana (opsional)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <button onClick={() => setSavingsSDId("")} style={{ padding: "8px 12px", borderRadius: "20px", border: "1px solid", borderColor: !savingsSDId ? "#6366f1" : "rgba(255,255,255,0.08)", background: !savingsSDId ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", color: !savingsSDId ? "#a5b4fc" : "#666", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>? Tidak ?</button>
                  {myFundingSources.map(sd => (
                    <button key={sd.id} onClick={() => setSavingsSDId(sd.id)} style={{ padding: "8px 12px", borderRadius: "20px", border: "1px solid", borderColor: savingsSDId === sd.id ? "#6366f1" : "rgba(255,255,255,0.08)", background: savingsSDId === sd.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", color: savingsSDId === sd.id ? "#a5b4fc" : "#666", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>{sd.icon} {sd.name}</button>
                  ))}
                </div>
              </div>

              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              
              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              <button onClick={() => addSavingsCash(showSavingsForm)} disabled={!savingsInput} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: savingsInput ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.07)", color: savingsInput ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Setoran</button>
            </div>
          </div>
        )}

        {/* ===== MODAL SETOR ASET ===== */}
        {showAssetConvert && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowAssetConvert(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setShowAssetConvert(null)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
            <div style={{ position: "relative", position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 12px" }}>
              <button onClick={() => setShowAssetConvert(null)} style={{ position: "absolute", top: "16px", right: "20px", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", zIndex: 10 }}>x</button>
              <button onClick={() => setShowAssetConvert(null)} style={{ position: "absolute", top: "16px", right: "20px", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", zIndex: 10 }}>x</button>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>
                  {showAssetConvert === "invest_cash" || showAssetConvert === "invest_asset" ? "\u{1F4C8} Tambah ke Portofolio" : "\u{1F3E6} Setor dalam Bentuk Aset"}
                </div>
                <div style={{ fontSize: "13px", color: "#34d399", marginTop: "4px" }}>
                  {showAssetConvert === "invest_cash" || showAssetConvert === "invest_asset" ? "Investasi \u00B7 Nilai mengikuti harga pasar" : `${SAVINGS_GOALS.find(g => g.id === showAssetConvert)?.icon} ${SAVINGS_GOALS.find(g => g.id === showAssetConvert)?.label}`}
                </div>
              </div>

              {/* Pilih jenis aset */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px", textTransform: "uppercase" }}>Jenis Aset</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {ASSET_TYPES.map(at => (
                    <button key={at.id} onClick={() => setAssetForm(f => ({...f, assetType: at.id}))} style={{
                      padding: "7px 12px", borderRadius: "20px", border: "1px solid",
                      borderColor: assetForm.assetType === at.id ? "#10b981" : "rgba(255,255,255,0.08)",
                      background: assetForm.assetType === at.id ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)",
                      color: assetForm.assetType === at.id ? "#34d399" : "#666",
                      fontSize: "12px", cursor: "pointer", fontWeight: 700,
                    }}>{at.icon} {at.label}</button>
                  ))}
                </div>
              </div>

              {/* Ticker (saham/crypto/ETF/RD) */}
              {["stock_id","stock_us","crypto","reksadana","etf"].includes(assetForm.assetType) && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>
                    {assetForm.assetType === "stock_id" ? "Kode Saham (contoh: BBCA)" :
                     assetForm.assetType === "stock_us" ? "Ticker (contoh: AAPL)" :
                     assetForm.assetType === "crypto" ? "Simbol (contoh: BTC)" :
                     assetForm.assetType === "reksadana" ? "Nama Reksa Dana" : "Kode ETF"}
                  </div>
                  <input placeholder="Ketik di sini..." value={assetForm.ticker} onChange={e => setAssetForm(f => ({...f, ticker: e.target.value.toUpperCase()}))} style={inputStyle} />
                </div>
              )}

              {/* Jumlah */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>
                  Jumlah ({selectedAssetType?.unit})
                </div>
                <input placeholder={assetForm.assetType === "lm" ? "contoh: 5" : assetForm.assetType === "usd" ? "contoh: 100" : assetForm.assetType === "idr" || assetForm.assetType === "obligasi" ? "contoh: 5000000" : "contoh: 10"}
                  value={assetForm.qty} onChange={e => setAssetForm(f => ({...f, qty: e.target.value}))} inputMode="decimal" style={inputStyle} />
              </div>

              {/* Harga beli (untuk non-IDR/obligasi) */}
              {!["idr","obligasi"].includes(assetForm.assetType) && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>
                    Harga Beli per {selectedAssetType?.unit} {["stock_us"].includes(assetForm.assetType) ? "(USD)" : "(IDR)"}
                  </div>
                  <input placeholder="contoh: 1650000" value={assetForm.buyPrice} onChange={e => setAssetForm(f => ({...f, buyPrice: e.target.value}))} inputMode="decimal" style={inputStyle} />
                </div>
              )}

              {/* Harga manual untuk saham IDX/RD/ETF */}
              {["stock_id","reksadana","etf"].includes(assetForm.assetType) && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Harga Saat Ini per {selectedAssetType?.unit} (IDR) ? update manual</div>
                  <input placeholder="contoh: 9500 (per lembar)" value={assetForm.manualPrice} onChange={e => setAssetForm(f => ({...f, manualPrice: e.target.value}))} inputMode="decimal" style={inputStyle} />
                </div>
              )}

              {/* Catatan */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Catatan (opsional)</div>
                <input placeholder="contoh: beli di Pegadaian, portofolio BCA" value={assetForm.note} onChange={e => setAssetForm(f => ({...f, note: e.target.value}))} style={inputStyle} />
              </div>

              {/* Sumber dana opsional */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Potong dari Sumber Dana (opsional)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <button onClick={() => setAssetSDId("")} style={{ padding: "8px 12px", borderRadius: "20px", border: "1px solid", borderColor: !assetSDId ? "#6366f1" : "rgba(255,255,255,0.08)", background: !assetSDId ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", color: !assetSDId ? "#a5b4fc" : "#666", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>? Tidak ?</button>
                  {myFundingSources.map(sd => (
                    <button key={sd.id} onClick={() => setAssetSDId(sd.id)} style={{ padding: "8px 12px", borderRadius: "20px", border: "1px solid", borderColor: assetSDId === sd.id ? "#6366f1" : "rgba(255,255,255,0.08)", background: assetSDId === sd.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", color: assetSDId === sd.id ? "#a5b4fc" : "#666", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>{sd.icon} {sd.name}</button>
                  ))}
                </div>
              </div>

              {/* Preview nilai saat ini */}
              {assetForm.qty && marketPrices && (
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "12px 14px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", color: "#34d399", marginBottom: "4px" }}>Estimasi nilai saat ini:</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff" }}>
                    {(() => {
                      const tempHolding = { assetType: assetForm.assetType, qty: parseDecimal(assetForm.qty), buyPrice: parseDecimal(assetForm.buyPrice), manualPrice: assetForm.manualPrice ? parseDecimal(assetForm.manualPrice) : null, idrValue: parseDecimal(assetForm.qty) };
                      return formatRupiah(calcAssetValue(tempHolding, marketPrices));
                    })()}
                  </div>
                </div>
              )}


              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              
              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              <button onClick={() => {
                if (showAssetConvert === "invest_cash" || showAssetConvert === "invest_asset") {
                  addInvestmentAsset(showAssetConvert);
                } else {
                  addSavingsAsset(showAssetConvert);
                }
              }} disabled={!assetForm.qty} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: assetForm.qty ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.07)", color: assetForm.qty ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>
                {showAssetConvert === "invest_cash" || showAssetConvert === "invest_asset" ? "Simpan ke Portofolio" : "Simpan Aset ke Tabungan"}
              </button>
            </div>
          </div>
        )}

        {/* ===== MODAL DETAIL TRANSAKSI ===== */}
        {selectedTransaction && (() => {
          const t = selectedTransaction;
          const cat = CATEGORIES.find(c => c.id === t.category);
          const tglFormatted = new Date(t.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          const jamFormatted = t.createdAt ? new Date(t.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
          return (
            <div onClick={e => { if (e.target === e.currentTarget) setSelectedTransaction(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setSelectedTransaction(null)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
              <div style={{ position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 0" }}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 20px" }} />
                  <div style={{ fontSize: "48px", marginBottom: "8px" }}>{cat?.icon}</div>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: t.type === "income" ? "#34d399" : "#f87171" }}>
                    {t.type === "income" ? "+" : "-"}{formatFull(t.amount)}
                  </div>
                  <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>{cat?.label} ? {t.type === "income" ? "Pemasukan" : "Pengeluaran"}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0px", background: "rgba(255,255,255,0.04)", borderRadius: "16px", overflow: "hidden", marginBottom: "20px" }}>
                  {[
                    { label: "\u{1F464} Dicatat oleh", value: t.user },
                    { label: "\u{1F4C5} Tanggal", value: tglFormatted },
                    { label: "\u23F0 Jam input", value: jamFormatted },
                    { label: "\u{1F5C2}\uFE0F Kategori", value: cat?.label },
                    { label: "\u{1F4DD} Catatan", value: t.note || "\u2014" },
                    { label: "\u{1F516} Tipe", value: t.type === "income" ? "Pemasukan" : "Pengeluaran" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <div style={{ fontSize: "12px", color: "#555" }}>{item.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8f0", textAlign: "right", maxWidth: "60%" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

              </div>
              </div>
                <div style={{ padding: "12px 20px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#14141f", display: "flex", gap: "10px" }}>
                  {t.user === currentUser && (
                    <button onClick={() => { deleteTransaction(t.id); setSelectedTransaction(null); }} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>?? Hapus</button>
                  )}
                  <button onClick={() => setSelectedTransaction(null)} style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "none", background: "rgba(255,255,255,0.08)", color: "#e8e8f0", fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>Tutup</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===== MODAL DETAIL INVESTASI ===== */}
        {selectedInvestment && (() => {
          const inv = selectedInvestment;
          const at = ASSET_TYPES.find(a => a.id === inv.assetType) || { icon: "\u{1F4B0}", label: inv.type || "Aset", unit: "" };
          const currentValue = calcAssetValue(inv, marketPrices);
          const buyValue = ["idr","obligasi"].includes(inv.assetType) ? (inv.idrValue || 0) : (inv.qty || inv.amount || 0) * (inv.buyPrice || 0);
          const profitLoss = currentValue - buyValue;
          const pct = buyValue > 0 ? ((profitLoss / buyValue) * 100).toFixed(1) : 0;
          return (
            <div onClick={e => { if (e.target === e.currentTarget) setSelectedInvestment(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setSelectedInvestment(null)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
              <div style={{ position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 0" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 20px" }} />
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>{at.icon}</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff" }}>{inv.ticker || at.label}</div>
                  <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>{inv.qty || inv.amount} {at.unit}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px" }}>Modal</div>
                    <div style={{ fontSize: "15px", fontWeight: 800 }}>{formatRupiah(buyValue)}</div>
                    <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{formatRupiah(inv.buyPrice)}/{at.unit}</div>
                  </div>
                  <div style={{ background: "rgba(16,185,129,0.1)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <div style={{ fontSize: "10px", color: "#34d399", marginBottom: "4px" }}>Nilai Sekarang</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#34d399" }}>{formatRupiah(currentValue)}</div>
                    <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>{marketPrices ? "harga pasar" : "belum dimuat"}</div>
                  </div>
                  <div style={{ background: profitLoss >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", borderRadius: "12px", padding: "14px", border: `1px solid ${profitLoss >= 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px" }}>Untung/Rugi</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: profitLoss >= 0 ? "#34d399" : "#f87171" }}>{profitLoss >= 0 ? "+" : ""}{formatRupiah(profitLoss)}</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px" }}>Return</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: profitLoss >= 0 ? "#34d399" : "#f87171" }}>{pct}%</div>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", overflow: "hidden", marginBottom: "20px" }}>
                  {[
                    { label: "\u{1F4C5} Tanggal Beli", value: inv.buyDate || "-" },
                    { label: "\u{1F4B0} Harga Beli", value: `${formatRupiah(inv.buyPrice)}/${at.unit}` },
                    { label: "\u{1F4DD} Catatan", value: inv.note || "\u2014" },
                    { label: "\u{1F5C2}\uFE0F Jenis Aset", value: at.label },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <div style={{ fontSize: "12px", color: "#555" }}>{item.label}</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8f0" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

              <div style={{ padding: "12px 20px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#14141f", display: "flex", gap: "10px", flexShrink: 0 }}>
                  {currentUser === ADMIN_USER && (
                    <button onClick={() => { deleteInvestment(inv.id); setSelectedInvestment(null); }} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>?? Hapus</button>
                  )}
                  <button onClick={() => setSelectedInvestment(null)} style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "none", background: "rgba(255,255,255,0.08)", color: "#e8e8f0", fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>Tutup</button>
                </div>
            </div>
          );
        })()}

        {/* ===== MODAL DETAIL TABUNGAN ===== */}
        {selectedGoal && (() => {
          const goal = SAVINGS_GOALS.find(g => g.id === selectedGoal);
          if (!goal) return null;
          const currentVal = calcGoalValue(goal.id);
          const idrCash = savingsData[goal.id] || 0;
          const holdings = savingsHoldings[goal.id] || [];
          const pct = Math.min((currentVal / goal.targetAmount) * 100, 100);
          const remaining = goal.targetAmount - currentVal;
          const monthlyNeeded = remaining > 0 ? Math.ceil(remaining / (goal.yearsLeft * 12)) : 0;
          return (
            <div onClick={e => { if (e.target === e.currentTarget) setSelectedGoal(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setSelectedGoal(null)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
              <div style={{ position: "relative", position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 0" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>{goal.icon}</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff" }}>{goal.label}</div>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>{goal.desc} ? ? {goal.yearsLeft} tahun lagi</div>
                </div>

                {/* Progress */}
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#555" }}>Progress</div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: goal.color }}>{pct.toFixed(1)}%</div>
                  </div>
                  <div style={{ height: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginBottom: "10px" }}>
                    <div style={{ height: "100%", borderRadius: "10px", width: `${pct}%`, background: `linear-gradient(90deg,${goal.color},${goal.color}99)` }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Terkumpul</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#34d399" }}>{formatRupiah(currentVal)}</div></div>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Target</div><div style={{ fontSize: "12px", fontWeight: 700 }}>{formatRupiah(goal.targetAmount)}</div></div>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Kurang</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>{formatRupiah(Math.max(remaining, 0))}</div></div>
                  </div>
                </div>

                {/* Breakdown detail */}
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Rincian Aset</div>

                {idrCash > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", marginBottom: "8px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}>
                    <div><div style={{ fontSize: "13px", fontWeight: 600 }}>? Tunai IDR</div><div style={{ fontSize: "11px", color: "#555" }}>Nilai tetap</div></div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#e8e8f0" }}>{formatRupiah(idrCash)}</div>
                  </div>
                )}

                {holdings.map(h => {
                  const at = ASSET_TYPES.find(a => a.id === h.assetType);
                  const val = calcAssetValue(h, marketPrices);
                  const buyVal = (h.qty || 0) * (h.buyPrice || 0);
                  const gain = val - buyVal;
                  return (
                    <div key={h.id} style={{ padding: "12px 14px", marginBottom: "8px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <div><div style={{ fontSize: "13px", fontWeight: 600 }}>{at?.icon} {h.ticker || at?.label}</div><div style={{ fontSize: "11px", color: "#555" }}>{h.qty} {at?.unit} ? beli {formatRupiah(h.buyPrice)}/{at?.unit}</div></div>
                        <div style={{ textAlign: "right" }}><div style={{ fontSize: "14px", fontWeight: 800 }}>{formatRupiah(val)}</div><div style={{ fontSize: "11px", color: gain >= 0 ? "#34d399" : "#f87171" }}>{gain >= 0 ? "+" : ""}{formatRupiah(gain)}</div></div>
                      </div>
                      {h.note && <div style={{ fontSize: "11px", color: "#666" }}>? {h.note}</div>}
                      {h.addedAt && <div style={{ fontSize: "10px", color: "#444" }}>Ditambah: {new Date(h.addedAt).toLocaleDateString("id-ID")}</div>}
                    </div>
                  );
                })}

                {idrCash === 0 && holdings.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px", color: "#444", fontSize: "13px" }}>Belum ada setoran</div>
                )}

                {monthlyNeeded > 0 && (
                  <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", padding: "12px 14px", marginTop: "12px", fontSize: "12px", color: "#a5b4fc" }}>
                    ? Setor <strong style={{ color: "#fff" }}>{formatRupiah(monthlyNeeded)}/bulan</strong> selama {goal.yearsLeft * 12} bulan untuk mencapai target
                  </div>
                )}

              <div style={{ padding: "12px 20px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#14141f", display: "flex", gap: "10px", flexShrink: 0 }}>
                  {currentUser === ADMIN_USER && (
                    <button onClick={() => { setSelectedGoal(null); setShowSavingsForm(goal.id); setSavingsInput(""); setSavingsInputDisplay(""); }} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>+ Setor</button>
                  )}
                  <button onClick={() => setSelectedGoal(null)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: "rgba(255,255,255,0.08)", color: "#e8e8f0", fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>Tutup</button>
                </div>
            </div>
          );
        })()}

        {/* ===== MODAL DETAIL KATEGORI ===== */}
        {selectedCategory && (() => {
          const cat = CATEGORIES.find(c => c.id === selectedCategory);
          const catTxns = monthTxns.filter(t => t.category === selectedCategory).sort((a, b) => new Date(b.date) - new Date(a.date));
          const totalCat = catTxns.reduce((s, t) => s + t.amount, 0);
          const byUser = {};
          catTxns.forEach(t => { byUser[t.user] = (byUser[t.user] || 0) + t.amount; });

          return (
            <div onClick={e => { if (e.target === e.currentTarget) setSelectedCategory(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setSelectedCategory(null)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
              <div style={{ position: "relative", position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 0" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>{cat?.icon}</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff" }}>{cat?.label}</div>
                  <div style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>{MONTHS[filterMonth]} {year} ? {catTxns.length} transaksi</div>
                </div>

                {/* Total */}
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Total Pengeluaran</div>
                  <div style={{ fontSize: "26px", fontWeight: 900, color: "#f87171" }}>{formatFull(totalCat)}</div>
                </div>

                {/* Per user breakdown */}
                {Object.keys(byUser).length > 1 && (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                    {Object.entries(byUser).map(([user, amt]) => (
                      <div key={user} style={{ flex: "1 1 auto", minWidth: "100px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "8px 12px" }}>
                        <div style={{ fontSize: "10px", color: "#555" }}>{user}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(amt)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* List transaksi */}
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Semua Transaksi</div>
                {catTxns.map(t => (
                  <div key={t.id} onClick={() => { setSelectedCategory(null); setSelectedTransaction(t); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", marginBottom: "8px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>{t.user}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{t.note || "-"} ? {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#f87171" }}>-{formatRupiah(t.amount)}</div>
                      <div style={{ fontSize: "14px", color: "#444" }}>?</div>
                    </div>
                  </div>
                ))}

              <div style={{ padding: "12px 20px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#14141f", flexShrink: 0 }}>
                <button onClick={() => setSelectedCategory(null)} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "rgba(255,255,255,0.08)", color: "#e8e8f0", fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>Tutup</button>
              </div>
            </div>
          );
        })()}

        {/* ===== MODAL TAMBAH SUMBER DANA ===== */}
        {showSDForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowSDForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setShowSDForm(false)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
            <div style={{ position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 12px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>? Tambah Sumber Dana</div>
                <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>Untuk {currentUser}</div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "8px", textTransform: "uppercase" }}>Pilih Jenis</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {SUMBER_DANA_PRESETS.map(p => (
                    <button key={p.name} onClick={() => setSdForm(f => ({...f, name: p.name, icon: p.icon}))} style={{
                      padding: "7px 12px", borderRadius: "20px", border: "1px solid",
                      borderColor: sdForm.name === p.name ? "#6366f1" : "rgba(255,255,255,0.08)",
                      background: sdForm.name === p.name ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                      color: sdForm.name === p.name ? "#a5b4fc" : "#666",
                      fontSize: "12px", cursor: "pointer", fontWeight: 700,
                    }}>{p.icon} {p.name}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Nama (bisa diubah)</div>
                <input placeholder="contoh: BCA Tabungan" value={sdForm.name} onChange={e => setSdForm(f => ({...f, name: e.target.value}))} style={inputStyle} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Saldo Awal (Rp)</div>
                <input placeholder="contoh: 1000000" value={sdForm.initialBalance} onChange={e => setSdForm(f => ({...f, initialBalance: e.target.value.replace(/\D/g,"")}))} inputMode="numeric" style={inputStyle} />
              </div>


              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              
              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              <button onClick={addSumberDana} disabled={!sdForm.name} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: sdForm.name ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.07)", color: sdForm.name ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Sumber Dana</button>
            </div>
          </div>
        )}

        {/* ===== MODAL DETAIL SUMBER DANA ===== */}
        {selectedSD && (() => {
          const sd = sumberDanaList.find(s => s.id === selectedSD);
          if (!sd) return null;
          const balance = calcSumberDanaBalance(sd.id);
          const myLedger = sumberDanaLedger.filter(l => l.sumberDanaId === sd.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          return (
            <div onClick={e => { if (e.target === e.currentTarget) setSelectedSD(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setSelectedSD(null)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
              <div style={{ position: "relative", position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 0" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>{sd.icon}</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff" }}>{sd.name}</div>
                  <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>{sd.user}</div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px", textTransform: "uppercase" }}>Saldo Saat Ini</div>
                  <div style={{ fontSize: "26px", fontWeight: 900, color: balance >= 0 ? "#34d399" : "#f87171" }}>{formatFull(balance)}</div>
                  <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Saldo awal: {formatRupiah(sd.initialBalance || 0)}</div>
                </div>

                <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Riwayat Mutasi</div>
                {myLedger.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#444", fontSize: "13px" }}>Belum ada mutasi</div>
                ) : myLedger.map(l => (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", marginBottom: "6px", borderRadius: "10px", background: "rgba(255,255,255,0.04)" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#e8e8f0" }}>{l.note}</div>
                      <div style={{ fontSize: "10px", color: "#555" }}>{new Date(l.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: l.amount >= 0 ? "#34d399" : "#f87171" }}>{l.amount >= 0 ? "+" : ""}{formatRupiah(l.amount)}</div>
                  </div>
                ))}

              <div style={{ padding: "12px 20px 40px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#14141f", display: "flex", gap: "10px", flexShrink: 0 }}>
                  {sd.user === currentUser && (
                    <button onClick={() => { deleteSumberDana(sd.id); setSelectedSD(null); }} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "13px", cursor: "pointer", fontWeight: 700 }}>?? Hapus</button>
                  )}
                  <button onClick={() => setSelectedSD(null)} style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "none", background: "rgba(255,255,255,0.08)", color: "#e8e8f0", fontSize: "14px", cursor: "pointer", fontWeight: 700 }}>Tutup</button>
                </div>
            </div>
          );
        })()}

        {/* ===== MODAL CATAT GADAI ===== */}
        {showGadaiForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowGadaiForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setShowGadaiForm(false)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
            <div style={{ position: "relative", position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 12px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>?? Catat Gadai Emas</div>
                <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>Pegadaian ? Konvensional KCA</div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Nama Barang</div>
                <input placeholder="contoh: Cincin Kawin 18K, Gelang Emas 24K" value={gadaiForm.namaBarang} onChange={e => setGadaiForm(f => ({...f, namaBarang: e.target.value}))} style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Berat (gram)</div>
                  <input placeholder="contoh: 5" value={gadaiForm.beratGram} onChange={e => setGadaiForm(f => ({...f, beratGram: e.target.value}))} inputMode="decimal" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Kadar</div>
                  <select value={gadaiForm.kadar} onChange={e => setGadaiForm(f => ({...f, kadar: e.target.value}))} style={{ ...inputStyle, color: "#e8e8f0" }}>
                    <option value="24">24K (99.9%)</option>
                    <option value="22">22K (91.7%)</option>
                    <option value="21">21K (87.5%)</option>
                    <option value="20">20K (83.3%)</option>
                    <option value="18">18K (75%)</option>
                    <option value="17">17K (70.8%)</option>
                    <option value="16">16K (66.7%)</option>
                    <option value="14">14K (58.3%)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Tanggal Gadai</div>
                  <input type="date" value={gadaiForm.tanggalGadai} onChange={e => setGadaiForm(f => ({...f, tanggalGadai: e.target.value}))} style={{ ...inputStyle, color: "#888", colorScheme: "dark" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Tenor</div>
                  <select value={gadaiForm.tenor} onChange={e => setGadaiForm(f => ({...f, tenor: e.target.value}))} style={{ ...inputStyle, color: "#e8e8f0" }}>
                    <option value="15">15 hari</option>
                    <option value="30">30 hari</option>
                    <option value="60">60 hari</option>
                    <option value="90">90 hari</option>
                    <option value="120">120 hari</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Harga Emas Saat Gadai /gram (opsional)</div>
                <input placeholder={`Default: ${formatRupiah(marketPrices?.goldPerGram || 1680000)}/gram`} value={gadaiForm.hargaEmas} onChange={e => setGadaiForm(f => ({...f, hargaEmas: e.target.value}))} inputMode="numeric" style={inputStyle} />
              </div>

              {/* Preview kalkulasi */}
              {gadaiForm.beratGram && (() => {
                const harga = parseAmount(gadaiForm.hargaEmas) || marketPrices?.goldPerGram || 1680000;
                const hasil = hitungGadai(parseFloat(gadaiForm.beratGram), gadaiForm.kadar, harga, parseInt(gadaiForm.tenor));
                return (
                  <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px", padding: "14px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: "#fbbf24", marginBottom: "10px", fontWeight: 700 }}>? Estimasi Gadai</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div><div style={{ fontSize: "10px", color: "#555" }}>Nilai Taksiran</div><div style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(hasil.nilaiTaksiran)}</div></div>
                      <div><div style={{ fontSize: "10px", color: "#34d399" }}>Uang Pinjaman</div><div style={{ fontSize: "13px", fontWeight: 700, color: "#34d399" }}>{formatRupiah(hasil.uangPinjaman)}</div></div>
                      <div><div style={{ fontSize: "10px", color: "#555" }}>Total Bunga</div><div style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(hasil.totalBunga)}</div></div>
                      <div><div style={{ fontSize: "10px", color: "#f87171" }}>Total Lunas</div><div style={{ fontSize: "13px", fontWeight: 700, color: "#f87171" }}>{formatRupiah(hasil.totalLunas)}</div></div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Catatan (opsional)</div>
                <input placeholder="contoh: SBG No. 123456, cabang Kemang" value={gadaiForm.catatan} onChange={e => setGadaiForm(f => ({...f, catatan: e.target.value}))} style={inputStyle} />
              </div>


              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              
              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              <button onClick={addGadai} disabled={!gadaiForm.namaBarang || !gadaiForm.beratGram} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: gadaiForm.namaBarang && gadaiForm.beratGram ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.07)", color: gadaiForm.namaBarang && gadaiForm.beratGram ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Gadai</button>
            </div>
          </div>
        )}
        {showForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setShowForm(false)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
            <div style={{ position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 12px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>Tambah ? {currentUser}</div>
              </div>
              <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "4px", marginBottom: "16px" }}>
                {[["expense","Pengeluaran"],["income","Pemasukan"]].map(([val,label]) => (
                  <button key={val} onClick={() => setForm(f => ({...f, type: val, category: val === "expense" ? "makan" : "gaji"}))} style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer", borderRadius: "9px", fontSize: "13px", fontWeight: 700, background: form.type === val ? (val === "expense" ? "#ef4444" : "#10b981") : "transparent", color: form.type === val ? "#fff" : "#555" }}>{label}</button>
                ))}
              </div>
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Kategori</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(form.type === "expense" ? EXPENSE_CATS : INCOME_CATS).map(cat => (
                    <button key={cat.id} onClick={() => setForm(f => ({...f, category: cat.id}))} style={{ padding: "6px 12px", borderRadius: "20px", border: "1px solid", borderColor: form.category === cat.id ? "#6366f1" : "rgba(255,255,255,0.08)", background: form.category === cat.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", color: form.category === cat.id ? "#a5b4fc" : "#666", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>{cat.icon} {cat.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Jumlah</div>
                <input placeholder="Rp 0" value={amountDisplay} inputMode="numeric"
                  onChange={e => { const raw = e.target.value.replace(/\D/g,""); setAmountDisplay(raw ? "Rp " + parseInt(raw).toLocaleString("id-ID") : ""); setForm(f => ({...f, amount: raw})); }}
                  style={{ ...inputStyle, fontSize: "18px" }} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Sumber Dana *</div>
                {myFundingSources.length === 0 ? (
                  <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "12px", padding: "12px 14px", fontSize: "12px", color: "#fbbf24" }}>
                    ?? Kamu belum punya sumber dana. Buka tab ? Dompet untuk menambahkan dulu.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {myFundingSources.map(sd => (
                      <button key={sd.id} onClick={() => setTransactionSDId(sd.id)} style={{
                        padding: "8px 12px", borderRadius: "20px", border: "1px solid",
                        borderColor: transactionSDId === sd.id ? "#6366f1" : "rgba(255,255,255,0.08)",
                        background: transactionSDId === sd.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                        color: transactionSDId === sd.id ? "#a5b4fc" : "#666",
                        fontSize: "12px", cursor: "pointer", fontWeight: 600,
                      }}>{sd.icon} {sd.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <input placeholder="Catatan (opsional)" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} style={{ flex: 2, ...inputStyle, fontSize: "13px" }} />
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={{ flex: 1, ...inputStyle, color: "#888", fontSize: "12px", colorScheme: "dark" }} />
              </div>

              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              
              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              <button onClick={addTransaction} disabled={!form.amount || !transactionSDId} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: form.amount && transactionSDId ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.07)", color: form.amount && transactionSDId ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Transaksi</button>
            </div>
          </div>
        )}

        {/* Modal Investasi */}
        {showInvForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowInvForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <button onClick={() => setShowInvForm(false)} style={{ position: "fixed", top: "10vh", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(30,30,50,0.95)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: "22px", cursor: "pointer", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>x</button>
            <div style={{ position: "relative", width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ overflowY: "auto", flex: 1, padding: "24px 20px 12px" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>Tambah Investasi ?</div>
              </div>
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Jenis Aset</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[["usd","\u{1F4B5} USD"],["lm","\u{1F947} LM"],["jewelry","\u{1F48D} Perhiasan"]].map(([val,label]) => (
                    <button key={val} onClick={() => setInvForm(f => ({...f, type: val}))} style={{ flex: 1, padding: "10px 4px", border: "1px solid", borderColor: invForm.type === val ? "#10b981" : "rgba(255,255,255,0.08)", background: invForm.type === val ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)", color: invForm.type === val ? "#34d399" : "#666", borderRadius: "10px", fontSize: "12px", cursor: "pointer", fontWeight: 700 }}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Jumlah ({invTypeUnit[invForm.type]})</div>
                <input placeholder="contoh: 100" value={invForm.amount} onChange={e => setInvForm(f => ({...f, amount: e.target.value}))} inputMode="decimal" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Harga Beli per {invTypeUnit[invForm.type]} (Rp)</div>
                <input placeholder="contoh: 1650000" value={invForm.buyPrice} onChange={e => setInvForm(f => ({...f, buyPrice: e.target.value}))} inputMode="numeric" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Catatan (opsional)</div>
                <input placeholder="contoh: Beli di Pegadaian" value={invForm.note} onChange={e => setInvForm(f => ({...f, note: e.target.value}))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Tanggal Pembelian</div>
                <input type="date" value={invForm.buyDate} onChange={e => setInvForm(f => ({...f, buyDate: e.target.value}))} style={{ ...inputStyle, color: "#888", colorScheme: "dark" }} />
              </div>

              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              
              </div>
              <div style={{ padding: "12px 20px 32px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", background: "#14141f" }}>
              <button onClick={addInvestment} disabled={!invForm.amount || !invForm.buyPrice} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: invForm.amount && invForm.buyPrice ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.07)", color: invForm.amount && invForm.buyPrice ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Investasi</button>
            </div>
    </div>
  );
}
