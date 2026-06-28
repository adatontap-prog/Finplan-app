// src/services/sheets.js
import { SHEETS_URL, SAVINGS_GOALS } from "../config/constants";

export async function syncToSheets(action, payload) {
  try {
    const res  = await fetch(SHEETS_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify({ action, payload }),
    });
    return await res.json();
  } catch (e) {
    console.error("Sheets sync error:", e);
    return { success: false, message: e.message };
  }
}

export async function syncAllToSheets({ transactions, savingsData, savingsHoldings, investments, gadaiList, sumberDanaList }) {
  // Flat-map holdings per goal
  const savingsRows = [];
  Object.entries(savingsHoldings || {}).forEach(([goalId, holdings]) => {
    const goal = SAVINGS_GOALS.find(g => g.id === goalId);
    (holdings || []).forEach(h => savingsRows.push({ ...h, goalId, goalLabel: goal?.label || goalId }));
  });

  // Add cash savings
  Object.entries(savingsData || {}).forEach(([goalId, amount]) => {
    if (amount <= 0) return;
    const goal = SAVINGS_GOALS.find(g => g.id === goalId);
    savingsRows.push({
      id: "cash_" + goalId, goalId, goalLabel: goal?.label || goalId,
      assetType: "idr", qty: amount, unit: "IDR",
      buyPrice: 0, note: "Tunai IDR", addedAt: new Date().toISOString(),
    });
  });

  return syncToSheets("syncAll", {
    transactions:  transactions  || [],
    savings:       savingsRows,
    investments:   investments   || [],
    gadai:         gadaiList     || [],
    sumberDana:    sumberDanaList|| [],
  });
}
