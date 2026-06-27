// src/config/constants.js

export const ADMIN_USER   = "Bape";
export const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 menit
export const PIN_SALT     = "finplan_adp_2026";
export const PIN_DIGITS   = 6;

export const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
export const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
export const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
export const REPORT_EMAIL        = import.meta.env.VITE_REPORT_EMAIL;
export const SHEETS_URL          = import.meta.env.VITE_SHEETS_URL;

export const USERS = ["Bape", "Ibu", "Aroon", "Arunika", "Arkaja"];

export const MONTHS = [
  "Jan","Feb","Mar","Apr","Mei","Jun",
  "Jul","Agt","Sep","Okt","Nov","Des",
];

export const CATEGORIES = [
  { id: "gaji",        label: "Gaji",       icon: "💼", type: "income" },
  { id: "freelance",   label: "Freelance",  icon: "🖥️", type: "income" },
  { id: "investasi",   label: "Investasi",  icon: "📈", type: "income" },
  { id: "lainnya_in",  label: "Lainnya",    icon: "➕", type: "income" },
  { id: "makan",       label: "Makan",      icon: "🍜", type: "expense" },
  { id: "transport",   label: "Transport",  icon: "🚗", type: "expense" },
  { id: "belanja",     label: "Belanja",    icon: "🛍️", type: "expense" },
  { id: "tagihan",     label: "Tagihan",    icon: "📄", type: "expense" },
  { id: "hiburan",     label: "Hiburan",    icon: "🎬", type: "expense" },
  { id: "kesehatan",   label: "Kesehatan",  icon: "🏥", type: "expense" },
  { id: "tabungan",    label: "Tabungan",   icon: "🏦", type: "expense" },
  { id: "lainnya_ex",  label: "Lainnya",    icon: "➖", type: "expense" },
];

export const SUMBER_DANA_PRESETS = [
  { name: "Cash",        icon: "💵" },
  { name: "Bank BCA",    icon: "🏦" },
  { name: "Bank Mandiri",icon: "🏦" },
  { name: "Bank BNI",    icon: "🏦" },
  { name: "Bank BRI",    icon: "🏦" },
  { name: "GoPay",       icon: "🟢" },
  { name: "OVO",         icon: "🟣" },
  { name: "DANA",        icon: "🔵" },
  { name: "ShopeePay",   icon: "🟠" },
  { name: "Lainnya",     icon: "💳" },
];

export const ASSET_TYPES = [
  { id: "idr",       label: "Rupiah (IDR)",    icon: "💵", unit: "IDR",    dynamic: false },
  { id: "usd",       label: "Dollar USD",      icon: "🇺🇸", unit: "USD",    dynamic: true  },
  { id: "lm",        label: "LM Antam",        icon: "🥇", unit: "gram",   dynamic: true  },
  { id: "jewelry",   label: "Perhiasan 18K",   icon: "💍", unit: "gram",   dynamic: true  },
  { id: "stock_id",  label: "Saham IDX",       icon: "📈", unit: "lot",    dynamic: true, manual: true },
  { id: "stock_us",  label: "Saham US",        icon: "🌐", unit: "lembar", dynamic: true  },
  { id: "crypto",    label: "Crypto",          icon: "₿",  unit: "unit",   dynamic: true  },
  { id: "reksadana", label: "Reksa Dana",      icon: "📁", unit: "unit",   dynamic: true, manual: true },
  { id: "obligasi",  label: "Obligasi/Sukuk",  icon: "📜", unit: "IDR",    dynamic: false },
  { id: "etf",       label: "ETF",             icon: "🗂️", unit: "lot",    dynamic: true  },
];

export const SAVINGS_GOALS = [
  { id: "aroon_sd",        label: "SD Aroon (kelas 1-6)",    icon: "📚", category: "aroon",   targetAmount: 61724880,    yearsLeft: 1,  color: "#6366f1", desc: "SD kelas 1-6 · 2026-2032" },
  { id: "aroon_smp",       label: "SMP Aroon",               icon: "📖", category: "aroon",   targetAmount: 63776196,    yearsLeft: 6,  color: "#8b5cf6", desc: "Mulai 2032 · 3 tahun" },
  { id: "aroon_sma",       label: "SMA Aroon",               icon: "📝", category: "aroon",   targetAmount: 127329175,   yearsLeft: 9,  color: "#a78bfa", desc: "Mulai 2035 · 3 tahun" },
  { id: "aroon_kuliah",    label: "Kuliah Aroon",            icon: "🎓", category: "aroon",   targetAmount: 2353821282,  yearsLeft: 12, color: "#c4b5fd", desc: "Mulai 2038 · Eropa/Aussie" },
  { id: "arunika_kg1",     label: "Kindergarten 1 Arunika",  icon: "🎨", category: "arunika", targetAmount: 7700000,     yearsLeft: 1,  color: "#ec4899", desc: "Mulai 2027" },
  { id: "arunika_kg2",     label: "Kindergarten 2 Arunika",  icon: "🎨", category: "arunika", targetAmount: 8470000,     yearsLeft: 2,  color: "#f472b6", desc: "Mulai 2028" },
  { id: "arunika_sd",      label: "SD Arunika",              icon: "📚", category: "arunika", targetAmount: 63888000,    yearsLeft: 3,  color: "#f9a8d4", desc: "Mulai 2029 · kelas 1-6" },
  { id: "arunika_smp",     label: "SMP Arunika",             icon: "📖", category: "arunika", targetAmount: 84886116,    yearsLeft: 9,  color: "#fbcfe8", desc: "Mulai 2035 · 3 tahun" },
  { id: "arunika_sma",     label: "SMA Arunika",             icon: "📝", category: "arunika", targetAmount: 169475132,   yearsLeft: 12, color: "#fce7f3", desc: "Mulai 2038 · 3 tahun" },
  { id: "arunika_kuliah",  label: "Kuliah Arunika",          icon: "🎓", category: "arunika", targetAmount: 3132936127,  yearsLeft: 15, color: "#fbcfe8", desc: "Mulai 2041 · Eropa/Aussie" },
  { id: "arkaja_nursery1", label: "Nursery 1 Arkaja",        icon: "🧸", category: "arkaja",  targetAmount: 5500000,     yearsLeft: 1,  color: "#10b981", desc: "Mulai Juli 2027" },
  { id: "arkaja_nursery2", label: "Nursery 2 Arkaja",        icon: "🧸", category: "arkaja",  targetAmount: 6050000,     yearsLeft: 2,  color: "#34d399", desc: "Mulai 2028" },
  { id: "arkaja_kg1",      label: "Kindergarten 1 Arkaja",   icon: "🎨", category: "arkaja",  targetAmount: 9317000,     yearsLeft: 3,  color: "#6ee7b7", desc: "Mulai 2029" },
  { id: "arkaja_kg2",      label: "Kindergarten 2 Arkaja",   icon: "🎨", category: "arkaja",  targetAmount: 10248700,    yearsLeft: 4,  color: "#a7f3d0", desc: "Mulai 2030" },
  { id: "arkaja_sd",       label: "SD Arkaja",               icon: "📚", category: "arkaja",  targetAmount: 77304480,    yearsLeft: 5,  color: "#d1fae5", desc: "Mulai 2031 · kelas 1-6" },
  { id: "arkaja_smp",      label: "SMP Arkaja",              icon: "📖", category: "arkaja",  targetAmount: 102712201,   yearsLeft: 11, color: "#a7f3d0", desc: "Mulai 2037 · 3 tahun" },
  { id: "arkaja_sma",      label: "SMA Arkaja",              icon: "📝", category: "arkaja",  targetAmount: 205064910,   yearsLeft: 14, color: "#6ee7b7", desc: "Mulai 2040 · 3 tahun" },
  { id: "arkaja_kuliah",   label: "Kuliah Arkaja",           icon: "🎓", category: "arkaja",  targetAmount: 3790852713,  yearsLeft: 17, color: "#34d399", desc: "Mulai 2043 · Eropa/Aussie" },
  { id: "emergency",       label: "Dana Darurat",            icon: "🛡️", category: "future",  targetAmount: 60000000,    yearsLeft: 2,  color: "#f59e0b", desc: "Target 6x pengeluaran bulanan" },
  { id: "future",          label: "Masa Depan",              icon: "🏠", category: "future",  targetAmount: 500000000,   yearsLeft: 10, color: "#fbbf24", desc: "Aset & masa depan keluarga" },
  { id: "pension",         label: "Dana Pensiun",            icon: "👴", category: "pension", targetAmount: 3000000000,  yearsLeft: 23, color: "#14b8a6", desc: "Target usia 60 tahun (2049)" },
  { id: "health",          label: "Dana Kesehatan",          icon: "🏥", category: "health",  targetAmount: 150000000,   yearsLeft: 5,  color: "#ef4444", desc: "Cadangan di luar BPJS" },
  { id: "insurance",       label: "Asuransi Jiwa",           icon: "💊", category: "health",  targetAmount: 60000000,    yearsLeft: 3,  color: "#f87171", desc: "Premi asuransi jiwa keluarga" },
];

export const CATEGORY_GROUPS = [
  { id: "aroon",   label: "📚 Aroon",      color: "#6366f1" },
  { id: "arunika", label: "📚 Arunika",    color: "#ec4899" },
  { id: "arkaja",  label: "📚 Arkaja",     color: "#10b981" },
  { id: "future",  label: "🏠 Masa Depan", color: "#f59e0b" },
  { id: "pension", label: "👴 Pensiun",    color: "#14b8a6" },
  { id: "health",  label: "🏥 Kesehatan",  color: "#ef4444" },
];
