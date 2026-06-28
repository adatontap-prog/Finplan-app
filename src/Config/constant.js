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
  { id: "gaji",        label: "Gaji",       icon: "\uD83D\uDCBC", type: "income" },
  { id: "freelance",   label: "Freelance",  icon: "\uD83D\uDDA5\uFE0F", type: "income" },
  { id: "investasi",   label: "Investasi",  icon: "\uD83D\uDCC8", type: "income" },
  { id: "lainnya_in",  label: "Lainnya",    icon: "\u2795", type: "income" },
  { id: "makan",       label: "Makan",      icon: "\uD83C\uDF5C", type: "expense" },
  { id: "transport",   label: "Transport",  icon: "\uD83D\uDE97", type: "expense" },
  { id: "belanja",     label: "Belanja",    icon: "\uD83D\uDECD\uFE0F", type: "expense" },
  { id: "tagihan",     label: "Tagihan",    icon: "\uD83D\uDCC4", type: "expense" },
  { id: "hiburan",     label: "Hiburan",    icon: "\uD83C\uDFAC", type: "expense" },
  { id: "kesehatan",   label: "Kesehatan",  icon: "\uD83C\uDFE5", type: "expense" },
  { id: "tabungan",    label: "Tabungan",   icon: "\uD83C\uDFE6", type: "expense" },
  { id: "lainnya_ex",  label: "Lainnya",    icon: "\u2796", type: "expense" },
];

export const SUMBER_DANA_PRESETS = [
  { name: "Cash",        icon: "\uD83D\uDCB5" },
  { name: "Bank BCA",    icon: "\uD83C\uDFE6" },
  { name: "Bank Mandiri",icon: "\uD83C\uDFE6" },
  { name: "Bank BNI",    icon: "\uD83C\uDFE6" },
  { name: "Bank BRI",    icon: "\uD83C\uDFE6" },
  { name: "GoPay",       icon: "\uD83D\uDFE2" },
  { name: "OVO",         icon: "\uD83D\uDFE3" },
  { name: "DANA",        icon: "\uD83D\uDD35" },
  { name: "ShopeePay",   icon: "\uD83D\uDFE0" },
  { name: "Lainnya",     icon: "\uD83D\uDCB3" },
];

export const ASSET_TYPES = [
  { id: "idr",       label: "Rupiah (IDR)",    icon: "\uD83D\uDCB5", unit: "IDR",    dynamic: false },
  { id: "usd",       label: "Dollar USD",      icon: "\uD83C\uDDFA\uD83C\uDDF8", unit: "USD",    dynamic: true  },
  { id: "lm",        label: "LM Antam",        icon: "\uD83E\uDD47", unit: "gram",   dynamic: true  },
  { id: "jewelry",   label: "Perhiasan 18K",   icon: "\uD83D\uDC8D", unit: "gram",   dynamic: true  },
  { id: "stock_id",  label: "Saham IDX",       icon: "\uD83D\uDCC8", unit: "lot",    dynamic: true, manual: true },
  { id: "stock_us",  label: "Saham US",        icon: "\uD83C\uDF10", unit: "lembar", dynamic: true  },
  { id: "crypto",    label: "Crypto",          icon: "\u20BF",  unit: "unit",   dynamic: true  },
  { id: "reksadana", label: "Reksa Dana",      icon: "\uD83D\uDCC1", unit: "unit",   dynamic: true, manual: true },
  { id: "obligasi",  label: "Obligasi/Sukuk",  icon: "\uD83D\uDCDC", unit: "IDR",    dynamic: false },
  { id: "etf",       label: "ETF",             icon: "\uD83D\uDDC2\uFE0F", unit: "lot",    dynamic: true  },
];

export const SAVINGS_GOALS = [
  { id: "aroon_sd",        label: "SD Aroon (kelas 1-6)",    icon: "\uD83D\uDCDA", category: "aroon",   targetAmount: 61724880,    yearsLeft: 1,  color: "#6366f1", desc: "SD kelas 1-6 \u00B7 2026-2032" },
  { id: "aroon_smp",       label: "SMP Aroon",               icon: "\uD83D\uDCD6", category: "aroon",   targetAmount: 63776196,    yearsLeft: 6,  color: "#8b5cf6", desc: "Mulai 2032 \u00B7 3 tahun" },
  { id: "aroon_sma",       label: "SMA Aroon",               icon: "\uD83D\uDCDD", category: "aroon",   targetAmount: 127329175,   yearsLeft: 9,  color: "#a78bfa", desc: "Mulai 2035 \u00B7 3 tahun" },
  { id: "aroon_kuliah",    label: "Kuliah Aroon",            icon: "\uD83C\uDF93", category: "aroon",   targetAmount: 2353821282,  yearsLeft: 12, color: "#c4b5fd", desc: "Mulai 2038 \u00B7 Eropa/Aussie" },
  { id: "arunika_kg1",     label: "Kindergarten 1 Arunika",  icon: "\uD83C\uDFA8", category: "arunika", targetAmount: 7700000,     yearsLeft: 1,  color: "#ec4899", desc: "Mulai 2027" },
  { id: "arunika_kg2",     label: "Kindergarten 2 Arunika",  icon: "\uD83C\uDFA8", category: "arunika", targetAmount: 8470000,     yearsLeft: 2,  color: "#f472b6", desc: "Mulai 2028" },
  { id: "arunika_sd",      label: "SD Arunika",              icon: "\uD83D\uDCDA", category: "arunika", targetAmount: 63888000,    yearsLeft: 3,  color: "#f9a8d4", desc: "Mulai 2029 \u00B7 kelas 1-6" },
  { id: "arunika_smp",     label: "SMP Arunika",             icon: "\uD83D\uDCD6", category: "arunika", targetAmount: 84886116,    yearsLeft: 9,  color: "#fbcfe8", desc: "Mulai 2035 \u00B7 3 tahun" },
  { id: "arunika_sma",     label: "SMA Arunika",             icon: "\uD83D\uDCDD", category: "arunika", targetAmount: 169475132,   yearsLeft: 12, color: "#fce7f3", desc: "Mulai 2038 \u00B7 3 tahun" },
  { id: "arunika_kuliah",  label: "Kuliah Arunika",          icon: "\uD83C\uDF93", category: "arunika", targetAmount: 3132936127,  yearsLeft: 15, color: "#fbcfe8", desc: "Mulai 2041 \u00B7 Eropa/Aussie" },
  { id: "arkaja_nursery1", label: "Nursery 1 Arkaja",        icon: "\uD83E\uDDF8", category: "arkaja",  targetAmount: 5500000,     yearsLeft: 1,  color: "#10b981", desc: "Mulai Juli 2027" },
  { id: "arkaja_nursery2", label: "Nursery 2 Arkaja",        icon: "\uD83E\uDDF8", category: "arkaja",  targetAmount: 6050000,     yearsLeft: 2,  color: "#34d399", desc: "Mulai 2028" },
  { id: "arkaja_kg1",      label: "Kindergarten 1 Arkaja",   icon: "\uD83C\uDFA8", category: "arkaja",  targetAmount: 9317000,     yearsLeft: 3,  color: "#6ee7b7", desc: "Mulai 2029" },
  { id: "arkaja_kg2",      label: "Kindergarten 2 Arkaja",   icon: "\uD83C\uDFA8", category: "arkaja",  targetAmount: 10248700,    yearsLeft: 4,  color: "#a7f3d0", desc: "Mulai 2030" },
  { id: "arkaja_sd",       label: "SD Arkaja",               icon: "\uD83D\uDCDA", category: "arkaja",  targetAmount: 77304480,    yearsLeft: 5,  color: "#d1fae5", desc: "Mulai 2031 \u00B7 kelas 1-6" },
  { id: "arkaja_smp",      label: "SMP Arkaja",              icon: "\uD83D\uDCD6", category: "arkaja",  targetAmount: 102712201,   yearsLeft: 11, color: "#a7f3d0", desc: "Mulai 2037 \u00B7 3 tahun" },
  { id: "arkaja_sma",      label: "SMA Arkaja",              icon: "\uD83D\uDCDD", category: "arkaja",  targetAmount: 205064910,   yearsLeft: 14, color: "#6ee7b7", desc: "Mulai 2040 \u00B7 3 tahun" },
  { id: "arkaja_kuliah",   label: "Kuliah Arkaja",           icon: "\uD83C\uDF93", category: "arkaja",  targetAmount: 3790852713,  yearsLeft: 17, color: "#34d399", desc: "Mulai 2043 \u00B7 Eropa/Aussie" },
  { id: "emergency",       label: "Dana Darurat",            icon: "\uD83D\uDEE1\uFE0F", category: "future",  targetAmount: 60000000,    yearsLeft: 2,  color: "#f59e0b", desc: "Target 6x pengeluaran bulanan" },
  { id: "future",          label: "Masa Depan",              icon: "\uD83C\uDFE0", category: "future",  targetAmount: 500000000,   yearsLeft: 10, color: "#fbbf24", desc: "Aset & masa depan keluarga" },
  { id: "pension",         label: "Dana Pensiun",            icon: "\uD83D\uDC74", category: "pension", targetAmount: 3000000000,  yearsLeft: 23, color: "#14b8a6", desc: "Target usia 60 tahun (2049)" },
  { id: "health",          label: "Dana Kesehatan",          icon: "\uD83C\uDFE5", category: "health",  targetAmount: 150000000,   yearsLeft: 5,  color: "#ef4444", desc: "Cadangan di luar BPJS" },
  { id: "insurance",       label: "Asuransi Jiwa",           icon: "\uD83D\uDC8A", category: "health",  targetAmount: 60000000,    yearsLeft: 3,  color: "#f87171", desc: "Premi asuransi jiwa keluarga" },
];

export const CATEGORY_GROUPS = [
  { id: "aroon",   label: "\uD83D\uDCDA Aroon",      color: "#6366f1" },
  { id: "arunika", label: "\uD83D\uDCDA Arunika",    color: "#ec4899" },
  { id: "arkaja",  label: "\uD83D\uDCDA Arkaja",     color: "#10b981" },
  { id: "future",  label: "\uD83C\uDFE0 Masa Depan", color: "#f59e0b" },
  { id: "pension", label: "\uD83D\uDC74 Pensiun",    color: "#14b8a6" },
  { id: "health",  label: "\uD83C\uDFE5 Kesehatan",  color: "#ef4444" },
];
