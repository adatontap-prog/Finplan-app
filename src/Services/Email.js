// src/services/email.js
import {
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
  REPORT_EMAIL,
  USERS,
  CATEGORIES,
} from "../config/constants";
import { formatFull } from "../utils/finance";

export async function sendEmailReport(transactions) {
  const today    = new Date();
  const dateStr  = today.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const todayStr = today.toISOString().split("T")[0];

  const todayTxns = transactions.filter(t => t.date === todayStr);
  if (todayTxns.length === 0) return { success: false, message: "Tidak ada transaksi hari ini" };

  const userSummary = {};
  USERS.forEach(u => { userSummary[u] = { income: 0, expense: 0, items: [] }; });

  todayTxns.forEach(t => {
    if (!userSummary[t.user]) userSummary[t.user] = { income: 0, expense: 0, items: [] };
    if (t.type === "income") userSummary[t.user].income += t.amount;
    else                     userSummary[t.user].expense += t.amount;
    const cat = CATEGORIES.find(c => c.id === t.category);
    userSummary[t.user].items.push(
      `  ${cat?.icon} ${cat?.label}: ${t.type === "income" ? "+" : "-"}${formatFull(t.amount)}${t.note ? ` (${t.note})` : ""}`
    );
  });

  let report = `📅 ${dateStr}\n${"=".repeat(40)}\n\n`;
  let totalIncome = 0, totalExpense = 0;
  Object.entries(userSummary).forEach(([user, data]) => {
    if (data.items.length === 0) return;
    report += `👤 ${user}\n${data.items.join("\n")}\n  Saldo: ${formatFull(data.income - data.expense)}\n\n`;
    totalIncome  += data.income;
    totalExpense += data.expense;
  });
  report += `${"=".repeat(40)}\n📊 RINGKASAN KELUARGA\n↑ Pemasukan: ${formatFull(totalIncome)}\n↓ Pengeluaran: ${formatFull(totalExpense)}\n💰 Saldo: ${formatFull(totalIncome - totalExpense)}`;

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        service_id:      EMAILJS_SERVICE_ID,
        template_id:     EMAILJS_TEMPLATE_ID,
        user_id:         EMAILJS_PUBLIC_KEY,
        template_params: { to_email: REPORT_EMAIL, date: dateStr, report },
      }),
    });
    return res.ok ? { success: true } : { success: false, message: "Gagal mengirim" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
