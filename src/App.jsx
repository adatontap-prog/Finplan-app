const SPREADSHEET_ID = "1msp_Wql5qeAlGulYwWxawiCM7TIAlwe6D_dx7wNKtAo";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = data.action;
    const payload = data.payload;

    if (action === "syncAll") {
      return syncAllData(ss, payload);
    } else if (action === "addTransaction") {
      return appendRow(ss, "Transaksi", formatTransaction(payload));
    } else if (action === "deleteTransaction") {
      return deleteRow(ss, "Transaksi", payload.id);
    } else if (action === "addSavings") {
      return appendRow(ss, "Tabungan", formatSavings(payload));
    } else if (action === "addInvestment") {
      return appendRow(ss, "Investasi", formatInvestment(payload));
    } else if (action === "addGadai") {
      return appendRow(ss, "Gadai", formatGadai(payload));
    } else if (action === "updateGadai") {
      return updateGadaiStatus(ss, payload);
    }

    return jsonResponse({ success: false, message: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ status: "FinPlan ADP Script Active", version: "2.0" });
}

// ===== SYNC ALL DATA =====
function syncAllData(ss, payload) {
  setupSheets(ss);

  // Sync Transaksi
  const txSheet = ss.getSheetByName("Transaksi");
  clearDataRows(txSheet);
  if (payload.transactions && payload.transactions.length > 0) {
    const txRows = payload.transactions.map(t => formatTransaction(t));
    txSheet.getRange(2, 1, txRows.length, txRows[0].length).setValues(txRows);
  }

  // Sync Tabungan
  const savSheet = ss.getSheetByName("Tabungan");
  clearDataRows(savSheet);
  if (payload.savings && payload.savings.length > 0) {
    const savRows = payload.savings.map(s => formatSavings(s));
    savSheet.getRange(2, 1, savRows.length, savRows[0].length).setValues(savRows);
  }

  // Sync Investasi
  const invSheet = ss.getSheetByName("Investasi");
  clearDataRows(invSheet);
  if (payload.investments && payload.investments.length > 0) {
    const invRows = payload.investments.map(i => formatInvestment(i));
    invSheet.getRange(2, 1, invRows.length, invRows[0].length).setValues(invRows);
  }

  // Sync Gadai
  const gadaiSheet = ss.getSheetByName("Gadai");
  clearDataRows(gadaiSheet);
  if (payload.gadai && payload.gadai.length > 0) {
    const gadaiRows = payload.gadai.map(g => formatGadai(g));
    gadaiSheet.getRange(2, 1, gadaiRows.length, gadaiRows[0].length).setValues(gadaiRows);
  }

  // Sync Sumber Dana
  const sdSheet = ss.getSheetByName("Sumber Dana");
  clearDataRows(sdSheet);
  if (payload.sumberDana && payload.sumberDana.length > 0) {
    const sdRows = payload.sumberDana.map(s => formatSumberDana(s));
    sdSheet.getRange(2, 1, sdRows.length, sdRows[0].length).setValues(sdRows);
  }

  // Update summary
  updateSummary(ss, payload);

  return jsonResponse({ success: true, message: "Semua data berhasil disync!" });
}

// ===== SETUP SHEETS =====
function setupSheets(ss) {
  setupSheet(ss, "Ringkasan", ["Kategori", "Nilai", "Update"]);
  setupSheet(ss, "Transaksi", ["ID", "Tanggal", "User", "Tipe", "Kategori", "Jumlah", "Catatan", "Sumber Dana", "Dibuat"]);
  setupSheet(ss, "Tabungan", ["ID", "Pos Tabungan", "Jenis", "Jumlah/Qty", "Unit", "Harga Beli", "Catatan", "Tanggal"]);
  setupSheet(ss, "Investasi", ["ID", "Jenis Aset", "Ticker", "Qty", "Unit", "Harga Beli", "Catatan", "Tanggal Beli"]);
  setupSheet(ss, "Gadai", ["ID", "Nama Barang", "Berat (gr)", "Kadar", "Taksiran", "Pinjaman", "Total Lunas", "Tgl Gadai", "Tenor", "Jatuh Tempo", "Status", "Catatan"]);
  setupSheet(ss, "Sumber Dana", ["ID", "User", "Nama", "Icon", "Saldo Awal", "Dibuat"]);
}

function setupSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#1a237e");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
  return sheet;
}

function clearDataRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

// ===== FORMAT FUNCTIONS =====
function formatTransaction(t) {
  return [
    t.id || "",
    t.date || "",
    t.user || "",
    t.type === "income" ? "Pemasukan" : "Pengeluaran",
    t.category || "",
    t.amount || 0,
    t.note || "",
    t.sumberDanaName || t.sumberDanaId || "",
    t.createdAt ? new Date(t.createdAt).toLocaleString("id-ID") : ""
  ];
}

function formatSavings(s) {
  return [
    s.id || "",
    s.goalLabel || s.goalId || "",
    s.assetType || "IDR",
    s.qty || s.amount || 0,
    s.unit || "IDR",
    s.buyPrice || 0,
    s.note || "",
    s.addedAt ? new Date(s.addedAt).toLocaleString("id-ID") : ""
  ];
}

function formatInvestment(i) {
  return [
    i.id || "",
    i.assetType || i.type || "",
    i.ticker || "",
    i.qty || i.amount || 0,
    i.unit || "",
    i.buyPrice || 0,
    i.note || "",
    i.buyDate || ""
  ];
}

function formatGadai(g) {
  const tglGadai = new Date(g.tanggalGadai);
  const tglJatuh = new Date(tglGadai);
  tglJatuh.setDate(tglJatuh.getDate() + (g.tenor || 120));
  return [
    g.id || "",
    g.namaBarang || "",
    g.beratGram || 0,
    g.kadar + "K" || "",
    g.nilaiTaksiran || 0,
    g.uangPinjaman || 0,
    g.totalLunas || 0,
    g.tanggalGadai || "",
    (g.tenor || 120) + " hari",
    tglJatuh.toISOString().split("T")[0],
    g.status || "aktif",
    g.catatan || ""
  ];
}

function formatSumberDana(s) {
  return [
    s.id || "",
    s.user || "",
    s.name || "",
    s.icon || "",
    s.initialBalance || 0,
    s.createdAt ? new Date(s.createdAt).toLocaleString("id-ID") : ""
  ];
}

// ===== APPEND ROW =====
function appendRow(ss, sheetName, rowData) {
  setupSheets(ss);
  const sheet = ss.getSheetByName(sheetName);
  sheet.appendRow(rowData);
  return jsonResponse({ success: true, message: "Row added to " + sheetName });
}

// ===== DELETE ROW =====
function deleteRow(ss, sheetName, id) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ success: false, message: "Sheet not found" });
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: "Row deleted" });
    }
  }
  return jsonResponse({ success: false, message: "Row not found" });
}

// ===== UPDATE GADAI STATUS =====
function updateGadaiStatus(ss, payload) {
  const sheet = ss.getSheetByName("Gadai");
  if (!sheet) return jsonResponse({ success: false });
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      sheet.getRange(i + 1, 11).setValue(payload.status);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false });
}

// ===== UPDATE SUMMARY =====
function updateSummary(ss, payload) {
  const sheet = ss.getSheetByName("Ringkasan");
  if (!sheet) return;
  clearDataRows(sheet);
  const now = new Date().toLocaleString("id-ID");
  const txns = payload.transactions || [];
  const totalIncome = txns.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = txns.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const summaryRows = [
    ["Total Transaksi", txns.length, now],
    ["Total Pemasukan", totalIncome, now],
    ["Total Pengeluaran", totalExpense, now],
    ["Saldo Bersih", totalIncome - totalExpense, now],
    ["Total Data Tabungan", (payload.savings || []).length, now],
    ["Total Investasi", (payload.investments || []).length, now],
    ["Total Gadai", (payload.gadai || []).length, now],
    ["Terakhir Sync", now, ""],
  ];
  sheet.getRange(2, 1, summaryRows.length, 3).setValues(summaryRows);
  sheet.getRange(2, 1, summaryRows.length, 3).setNumberFormat("#,##0");
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
