// src/services/email.js
import {
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
  REPORT_EMAIL,
  USERS,
  CATEGORIES,
} from "../Config/constants";
import { formatFull } from "../utils/finance";

export async function sendEmailReport(transactions) {
  var today    = new Date();
  var dateStr  = today.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  var todayStr = today.toISOString().split("T")[0];

  var todayTxns = transactions.filter(function(t){ return t.date === todayStr; });
  if (todayTxns.length === 0) return { success: false, message: "Tidak ada transaksi hari ini" };

  var userSummary = {};
  USERS.forEach(function(u){ userSummary[u] = { income: 0, expense: 0, items: [] }; });

  todayTxns.forEach(function(t) {
    if (!userSummary[t.user]) userSummary[t.user] = { income: 0, expense: 0, items: [] };
    if (t.type === "income") userSummary[t.user].income += t.amount;
    else                     userSummary[t.user].expense += t.amount;
    var cat = CATEGORIES.find(function(c){ return c.id === t.category; });
    var icon = cat ? (cat.icon || "") : "";
    var label = cat ? (cat.label || "") : "";
    var sign = t.type === "income" ? "+" : "-";
    var note = t.note ? " (" + t.note + ")" : "";
    userSummary[t.user].items.push("  " + icon + " " + label + ": " + sign + formatFull(t.amount) + note);
  });

  var sep = "========================================";
  var report = "Laporan " + dateStr + "\n" + sep + "\n\n";
  var totalIncome = 0, totalExpense = 0;
  Object.entries(userSummary).forEach(function(entry) {
    var user = entry[0]; var data = entry[1];
    if (data.items.length === 0) return;
    report += "User: " + user + "\n" + data.items.join("\n") + "\n  Saldo: " + formatFull(data.income - data.expense) + "\n\n";
    totalIncome  += data.income;
    totalExpense += data.expense;
  });
  report += sep + "\nRINGKASAN KELUARGA\n";
  report += "Pemasukan: " + formatFull(totalIncome) + "\n";
  report += "Pengeluaran: " + formatFull(totalExpense) + "\n";
  report += "Saldo: " + formatFull(totalIncome - totalExpense);

  try {
    var res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        service_id:      EMAILJS_SERVICE_ID,
        template_id:     EMAILJS_TEMPLATE_ID,
        user_id:         EMAILJS_PUBLIC_KEY,
        template_params: { to_email: REPORT_EMAIL, date: dateStr, report: report },
      }),
    });
    return res.ok ? { success: true } : { success: false, message: "Gagal mengirim" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
