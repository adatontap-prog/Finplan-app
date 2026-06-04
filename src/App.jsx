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

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const CATEGORIES = [
  { id: "gaji", label: "Gaji", icon: "💼", type: "income" },
  { id: "freelance", label: "Freelance", icon: "🖥️", type: "income" },
  { id: "investasi", label: "Investasi", icon: "📈", type: "income" },
  { id: "lainnya_in", label: "Lainnya", icon: "➕", type: "income" },
  { id: "makan", label: "Makan", icon: "🍜", type: "expense" },
  { id: "transport", label: "Transport", icon: "🚗", type: "expense" },
  { id: "belanja", label: "Belanja", icon: "🛍️", type: "expense" },
  { id: "tagihan", label: "Tagihan", icon: "📄", type: "expense" },
  { id: "hiburan", label: "Hiburan", icon: "🎬", type: "expense" },
  { id: "kesehatan", label: "Kesehatan", icon: "🏥", type: "expense" },
  { id: "tabungan", label: "Tabungan", icon: "🏦", type: "expense" },
  { id: "lainnya_ex", label: "Lainnya", icon: "➖", type: "expense" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
const USERS = ["Bape","Ibu","Aroon","Arunika","Arkaja"];

const ASSET_TYPES = [
  { id: "idr", label: "Rupiah (IDR)", icon: "💵", unit: "IDR", dynamic: false },
  { id: "usd", label: "Dollar USD", icon: "🇺🇸", unit: "USD", dynamic: true },
  { id: "lm", label: "LM Antam", icon: "🥇", unit: "gram", dynamic: true },
  { id: "jewelry", label: "Perhiasan 18K", icon: "💍", unit: "gram", dynamic: true },
  { id: "stock_id", label: "Saham IDX", icon: "📈", unit: "lot", dynamic: true, manual: true },
  { id: "stock_us", label: "Saham US", icon: "🌐", unit: "lembar", dynamic: true },
  { id: "crypto", label: "Crypto", icon: "₿", unit: "unit", dynamic: true },
  { id: "reksadana", label: "Reksa Dana", icon: "📁", unit: "unit", dynamic: true, manual: true },
  { id: "obligasi", label: "Obligasi/Sukuk", icon: "📜", unit: "IDR", dynamic: false },
  { id: "etf", label: "ETF", icon: "🗂️", unit: "lot", dynamic: true },
];

const SAVINGS_GOALS = [
  { id: "aroon_sd", label: "SD Aroon (kelas 1-6)", icon: "📚", category: "aroon", targetAmount: 61724880, yearsLeft: 1, color: "#6366f1", desc: "SD kelas 1-6 · 2026-2032" },
  { id: "aroon_smp", label: "SMP Aroon", icon: "📖", category: "aroon", targetAmount: 63776196, yearsLeft: 6, color: "#8b5cf6", desc: "Mulai 2032 · 3 tahun" },
  { id: "aroon_sma", label: "SMA Aroon", icon: "📝", category: "aroon", targetAmount: 127329175, yearsLeft: 9, color: "#a78bfa", desc: "Mulai 2035 · 3 tahun" },
  { id: "aroon_kuliah", label: "Kuliah Aroon", icon: "🎓", category: "aroon", targetAmount: 2353821282, yearsLeft: 12, color: "#c4b5fd", desc: "Mulai 2038 · Eropa/Aussie" },
  { id: "arunika_kg1", label: "Kindergarten 1 Arunika", icon: "🎨", category: "arunika", targetAmount: 7700000, yearsLeft: 1, color: "#ec4899", desc: "Mulai 2027" },
  { id: "arunika_kg2", label: "Kindergarten 2 Arunika", icon: "🎨", category: "arunika", targetAmount: 8470000, yearsLeft: 2, color: "#f472b6", desc: "Mulai 2028" },
  { id: "arunika_sd", label: "SD Arunika", icon: "📚", category: "arunika", targetAmount: 63888000, yearsLeft: 3, color: "#f9a8d4", desc: "Mulai 2029 · kelas 1-6" },
  { id: "arunika_smp", label: "SMP Arunika", icon: "📖", category: "arunika", targetAmount: 84886116, yearsLeft: 9, color: "#fbcfe8", desc: "Mulai 2035 · 3 tahun" },
  { id: "arunika_sma", label: "SMA Arunika", icon: "📝", category: "arunika", targetAmount: 169475132, yearsLeft: 12, color: "#fce7f3", desc: "Mulai 2038 · 3 tahun" },
  { id: "arunika_kuliah", label: "Kuliah Arunika", icon: "🎓", category: "arunika", targetAmount: 3132936127, yearsLeft: 15, color: "#fbcfe8", desc: "Mulai 2041 · Eropa/Aussie" },
  { id: "arkaja_nursery1", label: "Nursery 1 Arkaja", icon: "🧸", category: "arkaja", targetAmount: 5500000, yearsLeft: 1, color: "#10b981", desc: "Mulai Juli 2027" },
  { id: "arkaja_nursery2", label: "Nursery 2 Arkaja", icon: "🧸", category: "arkaja", targetAmount: 6050000, yearsLeft: 2, color: "#34d399", desc: "Mulai 2028" },
  { id: "arkaja_kg1", label: "Kindergarten 1 Arkaja", icon: "🎨", category: "arkaja", targetAmount: 9317000, yearsLeft: 3, color: "#6ee7b7", desc: "Mulai 2029" },
  { id: "arkaja_kg2", label: "Kindergarten 2 Arkaja", icon: "🎨", category: "arkaja", targetAmount: 10248700, yearsLeft: 4, color: "#a7f3d0", desc: "Mulai 2030" },
  { id: "arkaja_sd", label: "SD Arkaja", icon: "📚", category: "arkaja", targetAmount: 77304480, yearsLeft: 5, color: "#d1fae5", desc: "Mulai 2031 · kelas 1-6" },
  { id: "arkaja_smp", label: "SMP Arkaja", icon: "📖", category: "arkaja", targetAmount: 102712201, yearsLeft: 11, color: "#a7f3d0", desc: "Mulai 2037 · 3 tahun" },
  { id: "arkaja_sma", label: "SMA Arkaja", icon: "📝", category: "arkaja", targetAmount: 205064910, yearsLeft: 14, color: "#6ee7b7", desc: "Mulai 2040 · 3 tahun" },
  { id: "arkaja_kuliah", label: "Kuliah Arkaja", icon: "🎓", category: "arkaja", targetAmount: 3790852713, yearsLeft: 17, color: "#34d399", desc: "Mulai 2043 · Eropa/Aussie" },
  { id: "emergency", label: "Dana Darurat", icon: "🛡️", category: "future", targetAmount: 60000000, yearsLeft: 2, color: "#f59e0b", desc: "Target 6x pengeluaran bulanan" },
  { id: "future", label: "Masa Depan", icon: "🏠", category: "future", targetAmount: 500000000, yearsLeft: 10, color: "#fbbf24", desc: "Aset & masa depan keluarga" },
  { id: "pension", label: "Dana Pensiun", icon: "👴", category: "pension", targetAmount: 3000000000, yearsLeft: 23, color: "#14b8a6", desc: "Target usia 60 tahun (2049)" },
  { id: "health", label: "Dana Kesehatan", icon: "🏥", category: "health", targetAmount: 150000000, yearsLeft: 5, color: "#ef4444", desc: "Cadangan di luar BPJS" },
  { id: "insurance", label: "Asuransi Jiwa", icon: "💊", category: "health", targetAmount: 60000000, yearsLeft: 3, color: "#f87171", desc: "Premi asuransi jiwa keluarga" },
];

const CATEGORY_GROUPS = [
  { id: "aroon", label: "📚 Aroon", color: "#6366f1" },
  { id: "arunika", label: "📚 Arunika", color: "#ec4899" },
  { id: "arkaja", label: "📚 Arkaja", color: "#10b981" },
  { id: "future", label: "🏠 Masa Depan", color: "#f59e0b" },
  { id: "pension", label: "👴 Pensiun", color: "#14b8a6" },
  { id: "health", label: "🏥 Kesehatan", color: "#ef4444" },
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
  try {
    const fxRes = await fetch("https://api.frankfurter.app/latest?from=USD&to=IDR");
    const fxData = await fxRes.json();
    const usdIdr = fxData.rates?.IDR || 16200;
    const goldRes = await fetch("https://data-asg.goldprice.org/dbXRates/USD");
    const goldData = await goldRes.json();
    const goldUsdPerOz = goldData?.items?.[0]?.xauPrice || 3300;
    const goldUsdPerGram = goldUsdPerOz / 31.1035;
    const goldIdrPerGram = Math.round(goldUsdPerGram * usdIdr);
    const antamPerGram = Math.round(goldIdrPerGram * 1.06);
    const jewelryPerGram = Math.round(goldIdrPerGram * 0.75 * 0.80);
    return { usdIdr: Math.round(usdIdr), goldPerGram: antamPerGram, jewelryPerGram, goldSpot: goldIdrPerGram, lastUpdated: new Date().toLocaleTimeString("id-ID") };
  } catch {
    return { usdIdr: 16200, goldPerGram: 1680000, jewelryPerGram: 1010000, goldSpot: 1585000, lastUpdated: "gagal — tekan Refresh" };
  }
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
  let report = `📅 ${dateStr}\n${"=".repeat(40)}\n\n`;
  let totalIncome = 0, totalExpense = 0;
  Object.entries(userSummary).forEach(([user, data]) => {
    if (data.items.length === 0) return;
    report += `👤 ${user}\n${data.items.join("\n")}\n  Saldo: ${formatFull(data.income - data.expense)}\n\n`;
    totalIncome += data.income; totalExpense += data.expense;
  });
  report += `${"=".repeat(40)}\n📊 RINGKASAN KELUARGA\n↑ Pemasukan: ${formatFull(totalIncome)}\n↓ Pengeluaran: ${formatFull(totalExpense)}\n💰 Saldo: ${formatFull(totalIncome - totalExpense)}`;
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

  useEffect(() => {
    if (!currentUser) { setShowUserSelect(true); setLoading(false); return; }
    const unsub1 = onSnapshot(query(collection(db, "transactions"), orderBy("createdAt", "desc")), snap => { setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const unsub2 = onSnapshot(query(collection(db, "investments"), orderBy("createdAt", "desc")), snap => { setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsub3 = onSnapshot(doc(db, "savings", "goals"), snap => { if (snap.exists()) setSavingsData(snap.data()); });
    const unsub4 = onSnapshot(doc(db, "savings", "holdings"), snap => { if (snap.exists()) setSavingsHoldings(snap.data()); });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [currentUser]);

  useEffect(() => { if (activeTab === "invest" && !marketPrices) loadPrices(); }, [activeTab]);
  useEffect(() => { if (activeTab === "savings" && !marketPrices) loadPrices(); }, [activeTab]);

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
  function selectUser(name) { setCurrentUser(name); localStorage.setItem("finplan_user", name); setShowUserSelect(false); setLoading(true); }

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

  const invTypeLabel = { usd: "💵 USD", lm: "🥇 LM Antam", jewelry: "💍 Perhiasan" };
  const invTypeUnit = { usd: "USD", lm: "gram", jewelry: "gram" };
  const invSummary = investments.map(inv => {
    if (!marketPrices) return { ...inv, currentValue: 0, profitLoss: 0, pct: 0 };
    const currentPrice = inv.type === "usd" ? marketPrices.usdIdr : inv.type === "lm" ? marketPrices.goldPerGram : marketPrices.jewelryPerGram;
    const currentValue = inv.amount * currentPrice;
    const buyValue = inv.amount * inv.buyPrice;
    const profitLoss = currentValue - buyValue;
    return { ...inv, currentValue, profitLoss, pct: buyValue > 0 ? ((profitLoss / buyValue) * 100).toFixed(1) : 0 };
  });
  const totalInvBuy = investments.reduce((s, i) => s + (i.amount * i.buyPrice), 0);
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
    setSavingsData(newData); setShowSavingsForm(null); setSavingsInput(""); setSavingsInputDisplay("");
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
    setShowAssetConvert(null);
    setAssetForm({ assetType: "lm", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" });
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
    if (!amt || !form.date) return;
    await addDoc(collection(db, "transactions"), { type: form.type, category: form.category, amount: amt, note: form.note, date: form.date, user: currentUser, createdAt: new Date().toISOString() });
    setShowForm(false); setForm({ type: "expense", category: "makan", amount: "", note: "", date: new Date().toISOString().split("T")[0] }); setAmountDisplay("");
  }

  async function addInvestment() {
    const amt = parseFloat(invForm.amount), buyPrice = parseAmount(invForm.buyPrice);
    if (!amt || !buyPrice) return;
    await addDoc(collection(db, "investments"), { type: invForm.type, amount: amt, buyPrice, note: invForm.note, buyDate: invForm.buyDate, createdAt: new Date().toISOString() });
    setShowInvForm(false); setInvForm({ type: "usd", amount: "", buyPrice: "", note: "", buyDate: new Date().toISOString().split("T")[0] });
  }

  async function deleteTransaction(id) { await deleteDoc(doc(db, "transactions", id)); }
  async function deleteInvestment(id) { await deleteDoc(doc(db, "investments", id)); }

  async function handleSendReport() {
    setSending(true);
    const result = await sendEmailReport(transactions);
    setSending(false); setEmailStatus(result.success ? "✅ Laporan terkirim!" : "❌ " + result.message);
    setTimeout(() => setEmailStatus(""), 4000);
  }

  const EXPENSE_CATS = CATEGORIES.filter(c => c.type === "expense");
  const INCOME_CATS = CATEGORIES.filter(c => c.type === "income");
  const tabStyle = (key) => ({ flex: 1, padding: "8px 2px", border: "none", cursor: "pointer", borderRadius: "10px", fontSize: "9px", fontWeight: 700, background: activeTab === key ? "#6366f1" : "transparent", color: activeTab === key ? "#fff" : "#666", transition: "all 0.2s" });
  const savTabStyle = (key) => ({ padding: "6px 12px", border: "none", cursor: "pointer", borderRadius: "20px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, background: savingsTab === key ? "#6366f1" : "rgba(255,255,255,0.07)", color: savingsTab === key ? "#fff" : "#888" });
  const inputStyle = { width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 14px", color: "#fff", fontSize: "14px", fontWeight: 600, outline: "none", boxSizing: "border-box" };
  const selectedAssetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);

  if (showUserSelect) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>💰</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff" }}>FinPlan ADP</div>
          <div style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>Siapa yang sedang login?</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {USERS.map(u => (
            <button key={u} onClick={() => selectUser(u)} style={{ padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#e8e8f0", fontSize: "15px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
              {u} {u === ADMIN_USER ? "👑" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)", fontFamily: "sans-serif", color: "#e8e8f0" }}>
      <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", position: "relative" }}>

        <div style={{ padding: "28px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#6366f1", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>💰 FinPlan ADP</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>Halo, {currentUser}! {currentUser === ADMIN_USER ? "👑" : "👋"}</div>
          </div>
          <button onClick={() => setShowUserSelect(true)} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "10px", padding: "8px 12px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>Ganti</button>
        </div>

        <div style={{ padding: "8px 20px", display: "flex", gap: "6px", overflowX: "auto" }}>
          {MONTHS.map((m, i) => <button key={i} onClick={() => setFilterMonth(i)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 600, flexShrink: 0, background: filterMonth === i ? "#6366f1" : "rgba(255,255,255,0.07)", color: filterMonth === i ? "#fff" : "#888" }}>{m}</button>)}
        </div>

        <div style={{ padding: "6px 20px 12px", display: "flex", gap: "6px", overflowX: "auto" }}>
          {["semua", ...usersWithData].map(u => <button key={u} onClick={() => setFilterUser(u)} style={{ padding: "5px 12px", borderRadius: "20px", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "11px", fontWeight: 600, flexShrink: 0, background: filterUser === u ? "#10b981" : "rgba(255,255,255,0.07)", color: filterUser === u ? "#fff" : "#888" }}>{u === "semua" ? "👨‍👩‍👧‍👦 Semua" : u}</button>)}
        </div>

        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)", borderRadius: "20px", padding: "22px", boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "rgba(255,255,255,0.7)", marginBottom: "6px", textTransform: "uppercase" }}>Saldo {filterUser === "semua" ? "Keluarga" : filterUser}</div>
            <div style={{ fontSize: "30px", fontWeight: 900, color: "#fff", marginBottom: "18px" }}>{balance < 0 ? "-" : ""}{formatFull(Math.abs(balance))}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ display: "flex", gap: "24px" }}>
                <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>↑ Pemasukan</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#a5f3c4" }}>{formatRupiah(totalIncome)}</div></div>
                <div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>↓ Pengeluaran</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#fca5a5" }}>{formatRupiah(totalExpense)}</div></div>
              </div>
              <button onClick={handleSendReport} disabled={sending} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "10px", padding: "8px 12px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>{sending ? "📤..." : "📧 Kirim"}</button>
            </div>
            {emailStatus && <div style={{ marginTop: "10px", fontSize: "12px", color: "#fff", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>{emailStatus}</div>}
          </div>
        </div>

        <div style={{ margin: "0 20px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "4px", display: "flex", gap: "2px" }}>
          <button style={tabStyle("dashboard")} onClick={() => setActiveTab("dashboard")}>📊 Ringkasan</button>
          <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>📋 Riwayat</button>
          <button style={tabStyle("family")} onClick={() => setActiveTab("family")}>👨‍👩‍👧 Keluarga</button>
          <button style={tabStyle("savings")} onClick={() => setActiveTab("savings")}>🏦 Tabungan</button>
          <button style={tabStyle("invest")} onClick={() => setActiveTab("invest")}>📈 Investasi</button>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ padding: "0 20px" }}>
            {loading ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>Memuat data...</div>
            : Object.keys(expenseByCategory).length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div><div style={{ fontSize: "14px" }}>Belum ada transaksi bulan ini</div></div>
            : EXPENSE_CATS.filter(c => expenseByCategory[c.id]).map(cat => {
              const spent = expenseByCategory[cat.id] || 0;
              return (
                <div key={cat.id} style={{ marginBottom: "14px" }}>
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
            : monthTxns.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>🗒️</div><div style={{ fontSize: "14px" }}>Belum ada transaksi</div></div>
            : monthTxns.map(t => {
              const cat = CATEGORIES.find(c => c.id === t.category);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px", marginBottom: "8px", borderRadius: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "22px" }}>{cat?.icon}</div>
                    <div><div style={{ fontSize: "13px", fontWeight: 600 }}>{cat?.label}</div><div style={{ fontSize: "11px", color: "#555" }}>{t.user} · {t.note || t.date}</div></div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: t.type === "income" ? "#34d399" : "#f87171" }}>{t.type === "income" ? "+" : "-"}{formatRupiah(t.amount)}</div>
                    {t.user === currentUser && <button onClick={() => deleteTransaction(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: "18px" }}>×</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAMILY */}
        {activeTab === "family" && (
          <div style={{ padding: "0 20px" }}>
            {usersWithData.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>👨‍👩‍👧‍👦</div><div style={{ fontSize: "14px" }}>Belum ada data</div></div>
            : usersWithData.map(user => {
              const ut = transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === filterMonth && d.getFullYear() === year && t.user === user; });
              const ui = ut.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
              const ue = ut.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
              return (
                <div key={user} style={{ padding: "16px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 800 }}>{user} {user === ADMIN_USER ? "👑" : ""}</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: ui - ue >= 0 ? "#34d399" : "#f87171" }}>{formatRupiah(ui - ue)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>↑ Masuk</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#34d399" }}>{formatRupiah(ui)}</div></div>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>↓ Keluar</div><div style={{ fontSize: "12px", fontWeight: 700, color: "#f87171" }}>{formatRupiah(ue)}</div></div>
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
                {marketPrices ? `💵 ${formatFull(marketPrices.usdIdr)} · 🥇 ${formatRupiah(marketPrices.goldPerGram)}/gr` : "Harga belum dimuat"}
              </div>
              <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "8px", padding: "4px 10px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>{loadingPrices ? "⏳" : "🔄"}</button>
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
                <div key={goal.id} style={{ padding: "16px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 800 }}>{goal.icon} {goal.label}</div>
                      <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{goal.desc} · ⏳ {goal.yearsLeft} thn lagi</div>
                    </div>
                    {currentUser === ADMIN_USER && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => { setShowSavingsForm(goal.id); setSavingsInput(""); setSavingsInputDisplay(""); }} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc", borderRadius: "8px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>💵 Tunai</button>
                        <button onClick={() => { setShowAssetConvert(goal.id); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", note: "", ticker: "", manualPrice: "" }); }} style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#34d399", borderRadius: "8px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}>🏦 Aset</button>
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
                          <span>💵 Tunai IDR</span>
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
                                <span style={{ fontSize: "11px", color: "#888" }}>{at?.icon} {h.ticker || at?.label} · {h.qty} {at?.unit}</span>
                                {h.note && <span style={{ fontSize: "10px", color: "#555", marginLeft: "4px" }}>({h.note})</span>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#e8e8f0" }}>{formatRupiah(val)}</div>
                                  {buyVal > 0 && <div style={{ fontSize: "10px", color: gain >= 0 ? "#34d399" : "#f87171" }}>{gain >= 0 ? "+" : ""}{formatRupiah(gain)}</div>}
                                </div>
                                {currentUser === ADMIN_USER && (
                                  <button onClick={() => removeHolding(goal.id, h.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: "16px", lineHeight: 1 }}>×</button>
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
                      💡 Kurang <span style={{ color: "#fff", fontWeight: 700 }}>{formatRupiah(remaining)}</span> · Setor <span style={{ color: "#fff", fontWeight: 700 }}>{formatRupiah(monthlyNeeded)}/bln</span>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(16,185,129,0.1)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px", color: "#34d399", fontWeight: 700 }}>✅ Target tercapai!</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* INVESTASI */}
        {activeTab === "invest" && (
          <div style={{ padding: "0 20px" }}>
            <div style={{ padding: "14px", marginBottom: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "1px" }}>Harga Pasar Hari Ini</div>
                <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>{loadingPrices ? "⏳" : "🔄 Refresh"}</button>
              </div>
              {loadingPrices ? <div style={{ fontSize: "13px", color: "#555" }}>Memuat harga...</div>
              : marketPrices ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "13px" }}>💵 USD/IDR</span><span style={{ fontSize: "13px", fontWeight: 700 }}>{formatFull(marketPrices.usdIdr)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "13px" }}>⚡ Spot Emas /gram</span><span style={{ fontSize: "13px", fontWeight: 700, color: "#888" }}>{formatRupiah(marketPrices.goldSpot)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "13px" }}>🥇 LM Antam /gram</span><span style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(marketPrices.goldPerGram)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "13px" }}>💍 Perhiasan 18K /gram</span><span style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(marketPrices.jewelryPerGram)}</span></div>
                  <div style={{ fontSize: "10px", color: "#444", textAlign: "right" }}>Update: {marketPrices.lastUpdated}</div>
                </div>
              ) : <div style={{ fontSize: "13px", color: "#555" }}>Tekan Refresh untuk memuat harga</div>}
            </div>

            {investments.length > 0 && marketPrices && (
              <div style={{ padding: "16px", marginBottom: "16px", borderRadius: "16px", background: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(6,78,59,0.2))", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div style={{ fontSize: "11px", color: "#34d399", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Total Portofolio</div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff", marginBottom: "8px" }}>{formatRupiah(totalInvNow)}</div>
                <div style={{ display: "flex", gap: "20px" }}>
                  <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Modal</div><div style={{ fontSize: "13px", fontWeight: 700 }}>{formatRupiah(totalInvBuy)}</div></div>
                  <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Untung/Rugi</div><div style={{ fontSize: "13px", fontWeight: 700, color: totalInvNow - totalInvBuy >= 0 ? "#34d399" : "#f87171" }}>{totalInvNow - totalInvBuy >= 0 ? "+" : ""}{formatRupiah(totalInvNow - totalInvBuy)}</div></div>
                </div>
              </div>
            )}

            {invSummary.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>📈</div><div style={{ fontSize: "14px" }}>Belum ada investasi tercatat</div></div>
            : invSummary.map(inv => (
              <div key={inv.id} style={{ padding: "14px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{invTypeLabel[inv.type]}</div>
                    <div style={{ fontSize: "11px", color: "#555" }}>{inv.amount} {invTypeUnit[inv.type]} · beli {formatRupiah(inv.buyPrice)}/{invTypeUnit[inv.type]} · {inv.buyDate || "-"}</div>
                    {inv.note && <div style={{ fontSize: "11px", color: "#666" }}>{inv.note}</div>}
                  </div>
                  {currentUser === ADMIN_USER && <button onClick={() => deleteInvestment(inv.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: "18px" }}>×</button>}
                </div>
                {marketPrices && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Nilai Sekarang</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{formatRupiah(inv.currentValue)}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Untung/Rugi</div><div style={{ fontSize: "14px", fontWeight: 700, color: inv.profitLoss >= 0 ? "#34d399" : "#f87171" }}>{inv.profitLoss >= 0 ? "+" : ""}{formatRupiah(inv.profitLoss)} <span style={{ fontSize: "11px" }}>({inv.pct}%)</span></div></div>
                  </div>
                )}
              </div>
            ))}
            {currentUser === ADMIN_USER && <button onClick={() => setShowInvForm(true)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Tambah Investasi</button>}
          </div>
        )}

        <div style={{ height: "100px" }} />

        {activeTab !== "invest" && activeTab !== "savings" && (
          <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: "28px", right: "20px", width: "56px", height: "56px", borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "28px", boxShadow: "0 8px 32px rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>+</button>
        )}

        {/* ===== MODAL SETOR TUNAI ===== */}
        {showSavingsForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowSavingsForm(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>💵 Setor Tunai</div>
                <div style={{ fontSize: "13px", color: "#a5b4fc", marginTop: "4px" }}>{SAVINGS_GOALS.find(g => g.id === showSavingsForm)?.icon} {SAVINGS_GOALS.find(g => g.id === showSavingsForm)?.label}</div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Jumlah (Rupiah)</div>
                <input placeholder="Rp 0" value={savingsInputDisplay} inputMode="numeric"
                  onChange={e => { const raw = e.target.value.replace(/\D/g,""); setSavingsInputDisplay(raw ? "Rp " + parseInt(raw).toLocaleString("id-ID") : ""); setSavingsInput(raw); }}
                  style={{ ...inputStyle, fontSize: "18px" }} />
              </div>
              <button onClick={() => addSavingsCash(showSavingsForm)} disabled={!savingsInput} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: savingsInput ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.07)", color: savingsInput ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Setoran</button>
            </div>
          </div>
        )}

        {/* ===== MODAL SETOR ASET ===== */}
        {showAssetConvert && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowAssetConvert(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>🏦 Setor dalam Bentuk Aset</div>
                <div style={{ fontSize: "13px", color: "#34d399", marginTop: "4px" }}>{SAVINGS_GOALS.find(g => g.id === showAssetConvert)?.icon} {SAVINGS_GOALS.find(g => g.id === showAssetConvert)?.label}</div>
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Nilai akan otomatis mengikuti harga pasar</div>
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
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Harga Saat Ini per {selectedAssetType?.unit} (IDR) — update manual</div>
                  <input placeholder="contoh: 9500 (per lembar)" value={assetForm.manualPrice} onChange={e => setAssetForm(f => ({...f, manualPrice: e.target.value}))} inputMode="decimal" style={inputStyle} />
                </div>
              )}

              {/* Catatan */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Catatan (opsional)</div>
                <input placeholder="contoh: beli di Pegadaian, portofolio BCA" value={assetForm.note} onChange={e => setAssetForm(f => ({...f, note: e.target.value}))} style={inputStyle} />
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

              <button onClick={() => addSavingsAsset(showAssetConvert)} disabled={!assetForm.qty} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: assetForm.qty ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.07)", color: assetForm.qty ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Aset ke Tabungan</button>
            </div>
          </div>
        )}

        {/* Modal Transaksi */}
        {showForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>Tambah · {currentUser}</div>
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
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <input placeholder="Catatan (opsional)" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} style={{ flex: 2, ...inputStyle, fontSize: "13px" }} />
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} style={{ flex: 1, ...inputStyle, color: "#888", fontSize: "12px", colorScheme: "dark" }} />
              </div>
              <button onClick={addTransaction} disabled={!form.amount} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: form.amount ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.07)", color: form.amount ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Transaksi</button>
            </div>
          </div>
        )}

        {/* Modal Investasi */}
        {showInvForm && (
          <div onClick={e => { if (e.target === e.currentTarget) setShowInvForm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: "100%", maxWidth: "430px", background: "#14141f", borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.15)", borderRadius: "2px", margin: "0 auto 16px" }} />
                <div style={{ fontSize: "16px", fontWeight: 800 }}>Tambah Investasi 📈</div>
              </div>
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>Jenis Aset</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[["usd","💵 USD"],["lm","🥇 LM"],["jewelry","💍 Perhiasan"]].map(([val,label]) => (
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
              <button onClick={addInvestment} disabled={!invForm.amount || !invForm.buyPrice} style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", cursor: "pointer", background: invForm.amount && invForm.buyPrice ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.07)", color: invForm.amount && invForm.buyPrice ? "#fff" : "#444", fontSize: "15px", fontWeight: 800 }}>Simpan Investasi</button>
            </div>
          </div>
        )}

      </div>
      <style>{`* { margin:0; padding:0; box-sizing:border-box; } ::-webkit-scrollbar { display:none; }`}</style>
    </div>
  );
                 }
