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
const APP_VERSION = "FinPlan v1.1.0 phase 7.2.2";

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

const FINANCIAL_ENGINE_VERSION = "7.2.2";
const FINANCIAL_ENGINE_NAME = "Predictive Allocation Execution Engine";
const FINANCIAL_ENGINE_STATUS_OK = "Engine Guard OK";

const LEDGER_FINANCIAL_TREATMENT = {
  transaction: { movementType: "cashflow", cashflowTreatment: "income_expense", netWorthEffect: "transaction_delta" },
  goal_allocation: { movementType: "goal_allocation", cashflowTreatment: "internal_allocation", netWorthEffect: "neutral" },
  goal_cash_cancel: { movementType: "goal_allocation_cancel", cashflowTreatment: "internal_allocation_reversal", netWorthEffect: "neutral" },
  goal_asset_allocation: { movementType: "goal_asset_allocation", cashflowTreatment: "wallet_to_goal_asset", netWorthEffect: "neutral" },
  goal_asset_purchase: { movementType: "goal_asset_purchase", cashflowTreatment: "wallet_to_goal_asset", netWorthEffect: "neutral" },
  goal_asset_cancel: { movementType: "goal_asset_cancel", cashflowTreatment: "wallet_to_goal_asset_reversal", netWorthEffect: "neutral" },
  investment: { movementType: "investment_buy", cashflowTreatment: "wallet_to_asset", netWorthEffect: "neutral" },
  investment_orphan_reversal: { movementType: "investment_reversal", cashflowTreatment: "wallet_to_asset_reversal", netWorthEffect: "neutral" },
  investment_delete_reversal: { movementType: "investment_delete_reversal", cashflowTreatment: "wallet_to_asset_reversal", netWorthEffect: "neutral" },
  loan_disbursement: { movementType: "loan_disbursement", cashflowTreatment: "liability_funding", netWorthEffect: "neutral" },
  loan_disbursement_cancel: { movementType: "loan_disbursement_cancel", cashflowTreatment: "liability_funding_reversal", netWorthEffect: "neutral" },
  loan_repayment: { movementType: "loan_repayment", cashflowTreatment: "principal_repayment", netWorthEffect: "neutral_principal_fee_separate" },
  loan_orphan_reversal: { movementType: "loan_reversal", cashflowTreatment: "liability_funding_reversal", netWorthEffect: "neutral" },
  orphan_loan_disbursement_reversal: { movementType: "loan_reversal", cashflowTreatment: "liability_funding_reversal", netWorthEffect: "neutral" },
  allowance_transfer_out: { movementType: "wallet_to_wallet", cashflowTreatment: "internal_transfer", netWorthEffect: "neutral" },
  allowance_transfer_in: { movementType: "wallet_to_wallet", cashflowTreatment: "internal_transfer", netWorthEffect: "neutral" },
  wallet_transfer_out: { movementType: "wallet_to_wallet", cashflowTreatment: "internal_transfer", netWorthEffect: "neutral" },
  wallet_transfer_in: { movementType: "wallet_to_wallet", cashflowTreatment: "internal_transfer", netWorthEffect: "neutral" },
  wallet_merge_in: { movementType: "wallet_merge", cashflowTreatment: "internal_transfer", netWorthEffect: "neutral" },
  wallet_merge_out: { movementType: "wallet_merge", cashflowTreatment: "internal_transfer", netWorthEffect: "neutral" },
  wallet_adjustment: { movementType: "wallet_baseline_adjustment", cashflowTreatment: "baseline_adjustment", netWorthEffect: "reconcile" },
  wallet_baseline_adjustment: { movementType: "wallet_baseline_adjustment", cashflowTreatment: "baseline_adjustment", netWorthEffect: "reconcile" },
  test_wallet_adjustment_reversal: { movementType: "test_reversal", cashflowTreatment: "test_reversal", netWorthEffect: "neutral" },
  test_transfer_reversal: { movementType: "test_reversal", cashflowTreatment: "test_reversal", netWorthEffect: "neutral" },
};

const FINANCIAL_BAD_STATUS = new Set(["archived", "archive", "deleted", "soft_deleted", "cancelled", "canceled", "void", "voided", "dibatalkan", "hapus"]);
const FINANCIAL_CLOSED_LOAN_STATUS = new Set(["lunas", "paid", "closed", "settled", "selesai", "dibatalkan", "cancelled", "canceled", "archived", "deleted"]);

function asEngineNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeEngineStatus(value, fallback = "active") {
  return String(value || fallback).trim().toLowerCase();
}

function isFinancialRecordActive(record) {
  if (!record) return false;
  if (record.archivedFromReports || record.isTestData || record.demoData || record.deleted || record.softDeleted) return false;
  const status = normalizeEngineStatus(record.status || record.lifecycleStatus || record.dataStatus || "active");
  return !FINANCIAL_BAD_STATUS.has(status);
}

function isFinancialAssetActive(asset) {
  if (!isFinancialRecordActive(asset)) return false;
  const status = normalizeEngineStatus(asset.status || "active");
  if (["sold", "jual", "liquidated", "moved_to_goal"].includes(status)) return false;
  return true;
}

function isActiveFinancialLoan(loan) {
  if (!loan || loan.archivedFromReports || loan.isTestData || loan.demoData || loan.deleted || loan.softDeleted) return false;
  const status = normalizeEngineStatus(loan.status || "aktif");
  if (FINANCIAL_CLOSED_LOAN_STATUS.has(status)) return false;
  return ["aktif", "active", "open", "berjalan", "running"].includes(status) || asEngineNumber(loan.outstandingPrincipal ?? loan.uangPinjaman ?? 0) > 0;
}

function getLedgerFinancialTreatment(refType) {
  return LEDGER_FINANCIAL_TREATMENT[refType] || { movementType: refType || "ledger", cashflowTreatment: "wallet_balance", netWorthEffect: "wallet_delta" };
}

function shouldCountLedgerInWalletBalance(ledger) {
  if (!ledger) return false;
  if (!isFinancialRecordActive(ledger)) return false;
  if (ledger.excludedFromWalletBalance || ledger.excludeFromWalletBalance || ledger.excludedFromReports) return false;
  return true;
}

function buildFinancialLedgerValidation(ledgerRows = [], walletRows = []) {
  const walletIds = new Set((walletRows || []).filter(w => isFinancialRecordActive(w)).map(w => String(w.id)));
  const countedLedgerRows = (ledgerRows || []).filter(shouldCountLedgerInWalletBalance);
  const missingWalletRows = countedLedgerRows.filter(l => !l.sumberDanaId);
  const orphanWalletRows = countedLedgerRows.filter(l => l.sumberDanaId && !walletIds.has(String(l.sumberDanaId)));
  const internalTransferRows = countedLedgerRows.filter(l => getLedgerFinancialTreatment(l.refType).cashflowTreatment === "internal_transfer");
  const internalGroups = internalTransferRows.reduce((map, row) => {
    const key = String(row.refId || row.transferId || row.batchId || row.id || "unknown");
    if (!map[key]) map[key] = { key, rows: [], total: 0 };
    map[key].rows.push(row);
    map[key].total += asEngineNumber(row.amount);
    return map;
  }, {});
  const unbalancedInternalGroups = Object.values(internalGroups).filter(group => Math.abs(group.total) > 1 || group.rows.length < 2);
  const issueCount = missingWalletRows.length + orphanWalletRows.length + unbalancedInternalGroups.length;
  return {
    countedLedgerCount: countedLedgerRows.length,
    missingWalletRows,
    orphanWalletRows,
    internalTransferRows,
    unbalancedInternalGroups,
    issueCount,
    ok: issueCount === 0,
  };
}

function buildFinancialAuditTrailGuard({ ledgerRows = [], walletRows = [], transactionRows = [], goalRows = [], investmentRows = [], loanRows = [] } = {}) {
  const walletsById = (walletRows || []).reduce((map, row) => {
    if (row?.id) map[String(row.id)] = row;
    return map;
  }, {});
  const activeTransactionIds = new Set((transactionRows || []).filter(isFinancialRecordActive).map(row => String(row.id)));
  const activeInvestmentIds = new Set((investmentRows || []).filter(isFinancialRecordActive).map(row => String(row.id)));
  const activeLoanIds = new Set((loanRows || []).filter(isFinancialRecordActive).map(row => String(row.id)));
  const activeGoalIds = new Set((goalRows || []).filter(isFinancialRecordActive).map(row => String(row.id)));
  const countedLedgerRows = (ledgerRows || []).filter(shouldCountLedgerInWalletBalance);
  const internalCashflowTreatments = new Set([
    "internal_transfer",
    "internal_allocation",
    "internal_allocation_reversal",
    "wallet_to_asset",
    "wallet_to_asset_reversal",
    "wallet_to_goal_asset",
    "wallet_to_goal_asset_reversal",
    "liability_funding",
    "liability_funding_reversal",
    "principal_repayment",
  ]);
  const knownEngineRefTypes = new Set(Object.keys(LEDGER_FINANCIAL_TREATMENT));
  const invalidAmountRows = countedLedgerRows.filter(row => row.amount === undefined || row.amount === null || String(row.amount).trim() === "" || !Number.isFinite(Number(row.amount)));
  const inactiveWalletRows = countedLedgerRows.filter(row => row.sumberDanaId && walletsById[String(row.sumberDanaId)] && !isFinancialRecordActive(walletsById[String(row.sumberDanaId)]));
  const missingEngineMetadataRows = countedLedgerRows.filter(row => {
    if (!knownEngineRefTypes.has(String(row.refType || ""))) return false;
    return !row.movementType || !row.cashflowTreatment || !row.netWorthEffect || !row.engineVersion;
  });
  const internalMovementCashflowLeakRows = countedLedgerRows.filter(row => {
    const treatment = getLedgerFinancialTreatment(row.refType);
    const declaredCashflow = String(row.cashflowTreatment || treatment.cashflowTreatment || "").toLowerCase();
    const declaredMovement = String(row.movementType || treatment.movementType || "").toLowerCase();
    const declaredType = String(row.type || row.transactionType || row.reportType || row.categoryType || "").toLowerCase();
    return internalCashflowTreatments.has(declaredCashflow) && (declaredType === "income" || declaredType === "expense" || declaredMovement === "cashflow");
  });
  const danglingTransactionLedgerRows = countedLedgerRows.filter(row => row.refType === "transaction" && row.refId && !activeTransactionIds.has(String(row.refId)));
  const danglingInvestmentLedgerRows = countedLedgerRows.filter(row => row.refType === "investment" && (row.investmentId || row.refId) && !activeInvestmentIds.has(String(row.investmentId || row.refId)));
  const danglingLoanLedgerRows = countedLedgerRows.filter(row => ["loan_disbursement", "loan_repayment"].includes(row.refType) && (row.loanId || row.refId) && !activeLoanIds.has(String(row.loanId || row.refId)));
  const danglingGoalLedgerRows = countedLedgerRows.filter(row => ["goal_allocation", "goal_cash_cancel", "goal_asset_allocation", "goal_asset_purchase", "goal_asset_cancel"].includes(row.refType) && row.goalId && !activeGoalIds.has(String(row.goalId)));
  const issueCount = invalidAmountRows.length + inactiveWalletRows.length + missingEngineMetadataRows.length + internalMovementCashflowLeakRows.length + danglingTransactionLedgerRows.length + danglingInvestmentLedgerRows.length + danglingLoanLedgerRows.length + danglingGoalLedgerRows.length;
  return {
    countedLedgerCount: countedLedgerRows.length,
    invalidAmountRows,
    inactiveWalletRows,
    missingEngineMetadataRows,
    internalMovementCashflowLeakRows,
    danglingTransactionLedgerRows,
    danglingInvestmentLedgerRows,
    danglingLoanLedgerRows,
    danglingGoalLedgerRows,
    danglingReferenceCount: danglingTransactionLedgerRows.length + danglingInvestmentLedgerRows.length + danglingLoanLedgerRows.length + danglingGoalLedgerRows.length,
    issueCount,
    ok: issueCount === 0,
  };
}


function buildFinancialStressGuard({ walletTotal = 0, goalTotal = 0, investmentTotal = 0, loanTotal = 0, netWorth = 0, debtRatio = 0, walletBreakdown = [], goalRows = [], totalGoalTarget = 0, totalGoalCurrent = 0 } = {}) {
  const wallets = (walletBreakdown || []).filter(row => isFinancialRecordActive(row));
  const walletBalances = wallets.map(row => ({ ...row, walletBalance: asEngineNumber(row.walletBalance) }));
  const totalAssets = asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal);
  const positiveWallets = walletBalances.filter(row => row.walletBalance > 0).sort((a, b) => b.walletBalance - a.walletBalance);
  const criticalNegativeWalletRows = walletBalances.filter(row => row.walletBalance < -50000);
  const zeroOrNearZeroWalletRows = walletBalances.filter(row => Math.abs(row.walletBalance) <= 1000 && row.walletLedgerCount > 0);
  const largestWallet = positiveWallets[0] || null;
  const walletConcentrationRatio = asEngineNumber(walletTotal) > 0 && largestWallet ? (largestWallet.walletBalance / asEngineNumber(walletTotal)) * 100 : 0;
  const walletConcentrationRisk = walletBalances.length >= 3 && walletConcentrationRatio >= 85;
  const liquidityToDebtRatio = asEngineNumber(loanTotal) > 0 ? (asEngineNumber(walletTotal) / asEngineNumber(loanTotal)) * 100 : 100;
  const liquidityStress = asEngineNumber(loanTotal) > 0 && asEngineNumber(walletTotal) > 0 && liquidityToDebtRatio < 20;
  const debtPressure = asEngineNumber(loanTotal) > 0 && (asEngineNumber(debtRatio) >= 55 || asEngineNumber(loanTotal) > Math.max(asEngineNumber(walletTotal) + asEngineNumber(goalTotal), 0));
  const goalFundingRatio = asEngineNumber(totalGoalTarget) > 0 ? (asEngineNumber(totalGoalCurrent) / asEngineNumber(totalGoalTarget)) * 100 : 100;
  const activeGoalCount = (goalRows || []).filter(isFinancialRecordActive).length;
  const goalFundingPressure = activeGoalCount > 0 && asEngineNumber(totalGoalTarget) > 0 && goalFundingRatio < 15 && asEngineNumber(walletTotal) <= 0;
  const netWorthFragile = asEngineNumber(netWorth) > 0 && asEngineNumber(netWorth) < Math.max(250000, asEngineNumber(loanTotal) * 0.12);
  const issueCount = criticalNegativeWalletRows.length + (liquidityStress ? 1 : 0) + (debtPressure ? 1 : 0) + (walletConcentrationRisk ? 1 : 0) + (goalFundingPressure ? 1 : 0) + (netWorthFragile ? 1 : 0);
  return {
    criticalNegativeWalletRows,
    zeroOrNearZeroWalletRows,
    largestWallet,
    walletConcentrationRatio,
    walletConcentrationRisk,
    liquidityToDebtRatio,
    liquidityStress,
    debtPressure,
    goalFundingRatio,
    goalFundingPressure,
    netWorthFragile,
    issueCount,
    ok: issueCount === 0,
  };
}

function buildFinancialRecoveryGuard({ walletTotal = 0, netWorth = 0, debtRatio = 0, loanTotal = 0, financialEngineIssues = [], ledgerValidation = {}, auditTrailGuard = {}, stressGuard = {}, negativeWalletBreakdown = [], goalFundingRatio = 100 } = {}) {
  const issues = [];
  const recoverySteps = [];
  const hasDataIntegrityIssue = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0;
  const hasCriticalCashIssue = asEngineNumber(walletTotal) < 0 || (negativeWalletBreakdown || []).length > 0 || (stressGuard.criticalNegativeWalletRows || []).length > 0;
  const hasCriticalNetWorthIssue = asEngineNumber(netWorth) < 0;
  const hasDebtRecoveryIssue = asEngineNumber(loanTotal) > 0 && (asEngineNumber(debtRatio) >= 65 || !!stressGuard.debtPressure || !!stressGuard.liquidityStress);
  const hasGoalRecoveryIssue = !!stressGuard.goalFundingPressure || (asEngineNumber(goalFundingRatio) < 20 && hasCriticalCashIssue);
  const hasFragilityIssue = !!stressGuard.netWorthFragile || (asEngineNumber(netWorth) > 0 && asEngineNumber(walletTotal) <= 0);

  if (hasDataIntegrityIssue) {
    issues.push("Data integrity recovery");
    recoverySteps.push("Pulihkan ledger/ref data sebelum membaca score final.");
  }
  if (hasCriticalCashIssue) {
    issues.push("Cash recovery");
    recoverySteps.push("Prioritaskan saldo wallet positif dan hentikan alokasi non-wajib sementara.");
  }
  if (hasCriticalNetWorthIssue) {
    issues.push("Net worth recovery");
    recoverySteps.push("Fokus turunkan liability atau tambah aset/cash sampai Net Worth kembali positif.");
  }
  if (hasDebtRecoveryIssue) {
    issues.push("Debt recovery");
    recoverySteps.push("Cek pinjaman aktif, bunga/fee, dan jadwal pembayaran pokok.");
  }
  if (hasGoalRecoveryIssue) {
    issues.push("Goal recovery");
    recoverySteps.push("Pause goal fleksibel sampai wallet dan kewajiban utama aman.");
  }
  if (hasFragilityIssue) {
    issues.push("Fragility recovery");
    recoverySteps.push("Bangun buffer kas sebelum menaikkan investasi atau target baru.");
  }

  const critical = hasCriticalNetWorthIssue || (hasCriticalCashIssue && hasDebtRecoveryIssue) || hasDataIntegrityIssue;
  const warning = !critical && (hasCriticalCashIssue || hasDebtRecoveryIssue || hasGoalRecoveryIssue || hasFragilityIssue || (financialEngineIssues || []).length > 0);
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(22, issueCount * 4 + (critical ? 6 : 0)) : 0;
  const scoreCap = critical ? 58 : (warning ? 76 : 100);
  const primaryAction = recoverySteps[0] || "Engine stabil. Lanjut monitoring rutin.";

  return {
    issues,
    recoverySteps,
    primaryAction,
    hasDataIntegrityIssue,
    hasCriticalCashIssue,
    hasCriticalNetWorthIssue,
    hasDebtRecoveryIssue,
    hasGoalRecoveryIssue,
    hasFragilityIssue,
    critical,
    warning,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: issueCount === 0,
  };
}

function buildFinancialResilienceGuard({ walletTotal = 0, goalTotal = 0, investmentTotal = 0, loanTotal = 0, netWorth = 0, debtRatio = 0, walletBreakdown = [], ledgerValidation = {}, auditTrailGuard = {}, stressGuard = {}, recoveryGuard = {}, noBaseline = false } = {}) {
  const issues = [];
  const resilienceActions = [];
  const activeWallets = (walletBreakdown || []).filter(isFinancialRecordActive);
  const positiveWallets = activeWallets.filter(row => asEngineNumber(row.walletBalance) > 0);
  const negativeWallets = activeWallets.filter(row => asEngineNumber(row.walletBalance) < 0);
  const grossAssets = asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal);
  const assetReserveTotal = asEngineNumber(goalTotal) + asEngineNumber(investmentTotal);
  const cashBufferRatio = grossAssets > 0 ? (asEngineNumber(walletTotal) / grossAssets) * 100 : (asEngineNumber(walletTotal) > 0 ? 100 : 0);
  const debtCoverageRatio = asEngineNumber(loanTotal) > 0 ? (Math.max(asEngineNumber(walletTotal), 0) / asEngineNumber(loanTotal)) * 100 : 100;
  const equityBufferRatio = asEngineNumber(loanTotal) > 0 ? (asEngineNumber(netWorth) / asEngineNumber(loanTotal)) * 100 : 100;
  const singleWalletDependency = activeWallets.length >= 2 && positiveWallets.length <= 1 && asEngineNumber(walletTotal) > 0;
  const weakCashBuffer = grossAssets > 0 && cashBufferRatio < 8 && assetReserveTotal > 0;
  const debtShockRisk = asEngineNumber(loanTotal) > 0 && (debtCoverageRatio < 15 || equityBufferRatio < 35 || asEngineNumber(debtRatio) >= 75);
  const assetHeavyLiquidityRisk = assetReserveTotal > 0 && asEngineNumber(walletTotal) <= 0;
  const dataResilienceRisk = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0;
  const openRecoveryRisk = asEngineNumber(recoveryGuard.issueCount) > 0;
  const baselineRisk = !!noBaseline;

  if (baselineRisk) {
    issues.push("Baseline resilience belum lengkap");
    resilienceActions.push("Lengkapi wallet/asset/loan baseline sebelum score dipakai sebagai keputusan final.");
  }
  if (dataResilienceRisk) {
    issues.push("Data resilience lemah");
    resilienceActions.push("Selesaikan isu ledger/ref agar engine tahan backup, restore, dan audit ulang.");
  }
  if (singleWalletDependency) {
    issues.push("Single wallet dependency");
    resilienceActions.push("Sebar buffer ke lebih dari satu wallet aktif agar tidak bergantung pada satu kantong.");
  }
  if (weakCashBuffer) {
    issues.push("Cash buffer tipis");
    resilienceActions.push("Tambah buffer wallet sebelum menambah goal/investment baru.");
  }
  if (debtShockRisk) {
    issues.push("Debt shock risk");
    resilienceActions.push("Simulasikan pembayaran pinjaman dan siapkan buffer minimum untuk tekanan utang.");
  }
  if (assetHeavyLiquidityRisk) {
    issues.push("Asset-heavy liquidity risk");
    resilienceActions.push("Jangan hitung asset non-cash sebagai likuiditas harian; pulihkan wallet dulu.");
  }
  if (openRecoveryRisk) {
    issues.push("Recovery belum selesai");
    resilienceActions.push("Tutup action Recovery Guard sebelum menaikkan status engine.");
  }

  const critical = baselineRisk || dataResilienceRisk || asEngineNumber(netWorth) < 0 || asEngineNumber(walletTotal) < 0 || (debtShockRisk && asEngineNumber(debtRatio) >= 75);
  const warning = !critical && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(18, issueCount * 3 + (critical ? 4 : 0)) : 0;
  const scoreCap = critical ? 61 : (warning ? 78 : 100);
  const primaryAction = resilienceActions[0] || "Engine resilient. Struktur wallet, asset, goal, dan loan siap dimonitor rutin.";

  return {
    issues,
    resilienceActions,
    primaryAction,
    cashBufferRatio,
    debtCoverageRatio,
    equityBufferRatio,
    singleWalletDependency,
    weakCashBuffer,
    debtShockRisk,
    assetHeavyLiquidityRisk,
    dataResilienceRisk,
    openRecoveryRisk,
    baselineRisk,
    negativeWalletCount: negativeWallets.length,
    critical,
    warning,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: issueCount === 0,
  };
}




function buildFinancialFinalSafetyGuard({
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
  loanTotal = 0,
  grossAssets = 0,
  negativeWalletBreakdown = [],
  goalDuplicateRows = [],
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const safetyActions = [];
  const dataIssueCount = asEngineNumber(ledgerValidation.issueCount) + asEngineNumber(auditTrailGuard.issueCount);
  const structuralIssueCount = asEngineNumber(stressGuard.issueCount) + asEngineNumber(recoveryGuard.issueCount) + asEngineNumber(resilienceGuard.issueCount);
  const duplicateGuardCount = (goalDuplicateRows || []).length;
  const negativeWalletCount = (negativeWalletBreakdown || []).length;
  const hardStopNetWorth = asEngineNumber(netWorth) < 0;
  const hardStopWallet = asEngineNumber(walletTotal) < 0 || negativeWalletCount > 0;
  const hardStopData = dataIssueCount > 0;
  const hardStopBaseline = !!noBaseline;
  const hardStopDebt = asEngineNumber(loanTotal) > 0 && (asEngineNumber(debtRatio) >= 80 || !!stressGuard.debtPressure || !!resilienceGuard.debtShockRisk);
  const hardStopRecovery = !!recoveryGuard.critical || !!resilienceGuard.critical;
  const softStopLiquidity = !!stressGuard.liquidityStress || !!resilienceGuard.weakCashBuffer || !!resilienceGuard.assetHeavyLiquidityRisk;
  const softStopDoubleCount = duplicateGuardCount > 0;
  const softStopFragility = !!stressGuard.netWorthFragile || !!recoveryGuard.hasFragilityIssue || !!resilienceGuard.singleWalletDependency;
  const hasGrossAssetMismatch = asEngineNumber(grossAssets) < 0 && asEngineNumber(loanTotal) <= 0;

  if (hardStopData) {
    issues.push("Final safety: data belum aman");
    safetyActions.push("Beresi ledger validation dan audit trail sebelum score dianggap final.");
  }
  if (hardStopNetWorth) {
    issues.push("Final safety: Net Worth negatif");
    safetyActions.push("Score dikunci rendah sampai Net Worth kembali positif.");
  }
  if (hardStopWallet) {
    issues.push("Final safety: wallet bermasalah");
    safetyActions.push("Pulihkan wallet minus/total wallet negatif sebelum status Sehat boleh muncul.");
  }
  if (hardStopDebt) {
    issues.push("Final safety: tekanan pinjaman tinggi");
    safetyActions.push("Turunkan debt pressure atau tambah buffer kas sebelum menaikkan score.");
  }
  if (hardStopRecovery) {
    issues.push("Final safety: recovery/resilience belum clear");
    safetyActions.push("Tutup rekomendasi Recovery dan Resilience Guard terlebih dahulu.");
  }
  if (hardStopBaseline) {
    issues.push("Final safety: baseline belum lengkap");
    safetyActions.push("Lengkapi baseline wallet, asset, goal, dan loan agar engine final valid.");
  }
  if (softStopLiquidity) {
    issues.push("Final safety: likuiditas belum kuat");
    safetyActions.push("Bangun cash buffer sebelum membaca status sebagai aman penuh.");
  }
  if (softStopDoubleCount) {
    issues.push("Final safety: anti double count aktif");
    safetyActions.push("Validasi asset yang dipindah ke Goal agar tidak terhitung dua kali.");
  }
  if (softStopFragility) {
    issues.push("Final safety: struktur masih fragile");
    safetyActions.push("Kurangi ketergantungan satu wallet dan perkuat cadangan kas.");
  }
  if (hasGrossAssetMismatch) {
    issues.push("Final safety: gross asset mismatch");
    safetyActions.push("Cek komponen Wallet + Goal + Investasi karena total aset tidak boleh negatif tanpa pinjaman.");
  }

  const hardStop = hardStopData || hardStopNetWorth || hardStopWallet || hardStopDebt || hardStopRecovery || hardStopBaseline || hasGrossAssetMismatch;
  const warning = !hardStop && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(26, issueCount * 3 + (hardStop ? 8 : 0)) : 0;
  const scoreCap = Math.min(
    hardStopNetWorth ? 37 : 100,
    hardStopWallet ? 47 : 100,
    hardStopData ? 68 : 100,
    hardStopDebt ? 66 : 100,
    hardStopRecovery ? 67 : 100,
    hardStopBaseline ? 69 : 100,
    softStopLiquidity ? 76 : 100,
    softStopDoubleCount ? 74 : 100,
    softStopFragility ? 79 : 100,
    issueCount > 0 ? 79 : 100
  );
  const primaryAction = safetyActions[0] || "Final Integrity Guard clear. Score boleh dibaca sebagai status final engine.";

  return {
    issues,
    safetyActions,
    primaryAction,
    dataIssueCount,
    structuralIssueCount,
    duplicateGuardCount,
    negativeWalletCount,
    hardStop,
    warning,
    hardStopData,
    hardStopNetWorth,
    hardStopWallet,
    hardStopDebt,
    hardStopRecovery,
    hardStopBaseline,
    softStopLiquidity,
    softStopDoubleCount,
    softStopFragility,
    hasGrossAssetMismatch,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: issueCount === 0,
  };
}


function buildFinancialFinalIntegrityGuard({
  walletTotal = 0,
  goalTotal = 0,
  investmentTotal = 0,
  loanTotal = 0,
  grossAssets = 0,
  netWorth = 0,
  walletBreakdown = [],
  goalBreakdown = {},
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  finalSafetyGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const integrityActions = [];
  const componentRows = [
    { key: "wallet", label: "Wallet", value: walletTotal },
    { key: "goal", label: "Goal", value: goalTotal },
    { key: "investment", label: "Investasi", value: investmentTotal },
    { key: "loan", label: "Pinjaman", value: loanTotal },
    { key: "grossAssets", label: "Gross Assets", value: grossAssets },
    { key: "netWorth", label: "Net Worth", value: netWorth },
  ];
  const invalidComponentRows = componentRows.filter(row => !Number.isFinite(Number(row.value)));
  const recomputedGrossAssets = asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal);
  const recomputedNetWorth = recomputedGrossAssets - asEngineNumber(loanTotal);
  const grossAssetDelta = Math.abs(recomputedGrossAssets - asEngineNumber(grossAssets));
  const netWorthDelta = Math.abs(recomputedNetWorth - asEngineNumber(netWorth));
  const grossAssetMismatch = grossAssetDelta > 1;
  const netWorthMismatch = netWorthDelta > 1;
  const activeWalletRows = (walletBreakdown || []).filter(isFinancialRecordActive);
  const missingWalletLedgerBalanceRows = activeWalletRows.filter(row => asEngineNumber(row.walletLedgerCount) === 0 && asEngineNumber(row.saldoAwal ?? row.initialBalance ?? row.balance ?? 0) === 0 && asEngineNumber(row.walletBalance) !== 0);
  const goalCountedTotal = asEngineNumber(goalBreakdown.cashTotal) + asEngineNumber(goalBreakdown.assetTotal);
  const goalTotalMismatch = Math.abs(goalCountedTotal - asEngineNumber(goalTotal)) > 1;
  const guardCascadeOpen = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0 || asEngineNumber(stressGuard.issueCount) > 0 || asEngineNumber(recoveryGuard.issueCount) > 0 || asEngineNumber(resilienceGuard.issueCount) > 0 || asEngineNumber(finalSafetyGuard.issueCount) > 0;
  const criticalGuardOpen = !!finalSafetyGuard.hardStop || !!recoveryGuard.critical || !!resilienceGuard.critical;
  const unsafeHealthyPotential = criticalGuardOpen || asEngineNumber(netWorth) < 0 || asEngineNumber(walletTotal) < 0;

  if (invalidComponentRows.length > 0) {
    issues.push("Final integrity: angka engine invalid");
    integrityActions.push("Cek komponen Wallet/Goal/Investasi/Pinjaman yang menghasilkan NaN atau Infinity sebelum score dibaca.");
  }
  if (grossAssetMismatch) {
    issues.push("Final integrity: Gross Assets mismatch");
    integrityActions.push("Samakan formula Gross Assets = Wallet + Goal + Investasi.");
  }
  if (netWorthMismatch) {
    issues.push("Final integrity: Net Worth mismatch");
    integrityActions.push("Samakan formula Net Worth = Wallet + Goal + Investasi - Pinjaman.");
  }
  if (goalTotalMismatch) {
    issues.push("Final integrity: Goal total mismatch");
    integrityActions.push("Cek Goal cash dan Goal asset agar total Goal sama dengan breakdown yang dihitung engine.");
  }
  if (missingWalletLedgerBalanceRows.length > 0) {
    issues.push("Final integrity: wallet balance trace lemah");
    integrityActions.push("Cek wallet aktif yang punya saldo tanpa saldo awal/ledger agar audit balance bisa ditelusuri.");
  }
  if (guardCascadeOpen) {
    issues.push("Final integrity: guard cascade belum clear");
    integrityActions.push("Tutup issue dari Validation, Audit, Stress, Recovery, Resilience, dan Safety sebelum status final dianggap bersih.");
  }
  if (unsafeHealthyPotential) {
    issues.push("Final integrity: healthy status lock aktif");
    integrityActions.push("Status Sehat dikunci sampai wallet, net worth, dan safety guard benar-benar aman.");
  }
  if (noBaseline) {
    issues.push("Final integrity: baseline kosong");
    integrityActions.push("Lengkapi baseline real agar integrity guard punya pembanding yang valid.");
  }

  const critical = invalidComponentRows.length > 0 || grossAssetMismatch || netWorthMismatch || criticalGuardOpen || asEngineNumber(netWorth) < 0 || asEngineNumber(walletTotal) < 0;
  const warning = !critical && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(30, issueCount * 3 + (critical ? 9 : 0)) : 0;
  const scoreCap = Math.min(
    invalidComponentRows.length > 0 ? 42 : 100,
    netWorthMismatch ? 58 : 100,
    grossAssetMismatch ? 63 : 100,
    criticalGuardOpen ? 66 : 100,
    asEngineNumber(netWorth) < 0 ? 37 : 100,
    asEngineNumber(walletTotal) < 0 ? 47 : 100,
    guardCascadeOpen ? 78 : 100,
    missingWalletLedgerBalanceRows.length > 0 ? 82 : 100,
    noBaseline ? 69 : 100,
    issueCount > 0 ? 82 : 100
  );
  const primaryAction = integrityActions[0] || "Final Integrity Guard clear. Formula engine, guard cascade, dan score lock sudah sinkron.";

  return {
    issues,
    integrityActions,
    primaryAction,
    invalidComponentRows,
    recomputedGrossAssets,
    recomputedNetWorth,
    grossAssetDelta,
    netWorthDelta,
    grossAssetMismatch,
    netWorthMismatch,
    goalTotalMismatch,
    missingWalletLedgerBalanceRows,
    guardCascadeOpen,
    criticalGuardOpen,
    unsafeHealthyPotential,
    critical,
    warning,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: issueCount === 0,
  };
}



function buildFinancialFinalLockGuard({
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
  grossAssets = 0,
  loanTotal = 0,
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  finalSafetyGuard = {},
  finalIntegrityGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const lockActions = [];
  const upstreamIssueCount =
    asEngineNumber(ledgerValidation.issueCount) +
    asEngineNumber(auditTrailGuard.issueCount) +
    asEngineNumber(stressGuard.issueCount) +
    asEngineNumber(recoveryGuard.issueCount) +
    asEngineNumber(resilienceGuard.issueCount) +
    asEngineNumber(finalSafetyGuard.issueCount) +
    asEngineNumber(finalIntegrityGuard.issueCount);
  const formulaLock = !!finalIntegrityGuard.netWorthMismatch || !!finalIntegrityGuard.grossAssetMismatch || !!finalIntegrityGuard.goalTotalMismatch || (finalIntegrityGuard.invalidComponentRows || []).length > 0;
  const dataTraceLock = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0;
  const safetyLock = !!finalSafetyGuard.hardStop || !!finalIntegrityGuard.critical || !!finalIntegrityGuard.unsafeHealthyPotential;
  const healthLock = asEngineNumber(walletTotal) < 0 || asEngineNumber(netWorth) < 0 || asEngineNumber(debtRatio) >= 65 || safetyLock;
  const liquidityLock = !!stressGuard.liquidityStress || !!resilienceGuard.weakCashBuffer || (!!resilienceGuard.assetHeavyLiquidityRisk && asEngineNumber(loanTotal) > 0);
  const cascadeLock = upstreamIssueCount > 0;
  const baselineLock = !!noBaseline || asEngineNumber(grossAssets) === 0 && asEngineNumber(loanTotal) === 0;
  const recoveryLock = !!recoveryGuard.critical || !!resilienceGuard.critical || !!finalSafetyGuard.hardStopRecovery;

  if (formulaLock) {
    issues.push("Final lock: formula engine belum terkunci");
    lockActions.push("Pastikan Gross Assets, Net Worth, dan Goal breakdown sudah sama dengan formula final sebelum status dibaca.");
  }
  if (dataTraceLock) {
    issues.push("Final lock: audit trail belum bersih");
    lockActions.push("Selesaikan issue ledger/wallet/ref agar semua angka bisa ditelusuri dari sumber data.");
  }
  if (healthLock) {
    issues.push("Final lock: status Sehat dikunci");
    lockActions.push("Status Sehat tidak boleh aktif selama wallet, net worth, debt ratio, atau safety guard masih bermasalah.");
  }
  if (liquidityLock) {
    issues.push("Final lock: likuiditas belum aman");
    lockActions.push("Perkuat wallet cash/buffer sebelum engine memberi status aman penuh.");
  }
  if (recoveryLock) {
    issues.push("Final lock: recovery/resilience belum clear");
    lockActions.push("Tutup action Recovery dan Resilience yang critical sebelum final score dianggap stabil.");
  }
  if (cascadeLock) {
    issues.push("Final lock: guard cascade masih terbuka");
    lockActions.push("Pastikan Validation, Audit, Stress, Recovery, Resilience, Safety, dan Integrity Guard clear berurutan.");
  }
  if (baselineLock) {
    issues.push("Final lock: baseline real belum cukup");
    lockActions.push("Lengkapi minimal wallet/asset/loan baseline agar Final Lock Guard bisa mengunci score secara valid.");
  }

  const hardLock = formulaLock || dataTraceLock || healthLock || recoveryLock;
  const warning = !hardLock && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(32, issueCount * 3 + (hardLock ? 8 : 0)) : 0;
  const scoreCap = Math.min(
    formulaLock ? 55 : 100,
    dataTraceLock ? 68 : 100,
    asEngineNumber(netWorth) < 0 ? 37 : 100,
    asEngineNumber(walletTotal) < 0 ? 47 : 100,
    asEngineNumber(debtRatio) >= 65 ? 69 : 100,
    recoveryLock ? 66 : 100,
    safetyLock ? 72 : 100,
    liquidityLock ? 76 : 100,
    baselineLock ? 69 : 100,
    cascadeLock ? 82 : 100,
    issueCount > 0 ? 84 : 100
  );
  const primaryAction = lockActions[0] || "Final Lock Guard clear. Score, status, dan guard cascade sudah terkunci sebagai output final engine.";

  return {
    issues,
    lockActions,
    primaryAction,
    upstreamIssueCount,
    formulaLock,
    dataTraceLock,
    safetyLock,
    healthLock,
    liquidityLock,
    cascadeLock,
    baselineLock,
    recoveryLock,
    hardLock,
    warning,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: issueCount === 0,
  };
}


function buildFinancialClosureGuard({
  walletTotal = 0,
  goalTotal = 0,
  investmentTotal = 0,
  loanTotal = 0,
  grossAssets = 0,
  netWorth = 0,
  debtRatio = 0,
  goalDuplicateRows = [],
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  finalSafetyGuard = {},
  finalIntegrityGuard = {},
  finalLockGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const closureActions = [];
  const upstreamIssueCount =
    asEngineNumber(ledgerValidation.issueCount) +
    asEngineNumber(auditTrailGuard.issueCount) +
    asEngineNumber(stressGuard.issueCount) +
    asEngineNumber(recoveryGuard.issueCount) +
    asEngineNumber(resilienceGuard.issueCount) +
    asEngineNumber(finalSafetyGuard.issueCount) +
    asEngineNumber(finalIntegrityGuard.issueCount) +
    asEngineNumber(finalLockGuard.issueCount);
  const closureDataOpen = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0;
  const closureFormulaOpen = !!finalIntegrityGuard.netWorthMismatch || !!finalIntegrityGuard.grossAssetMismatch || !!finalIntegrityGuard.goalTotalMismatch || (finalIntegrityGuard.invalidComponentRows || []).length > 0;
  const closureSafetyOpen = !!finalSafetyGuard.hardStop || !!finalSafetyGuard.warning || !!finalLockGuard.hardLock || !!finalLockGuard.safetyLock || !!finalLockGuard.healthLock;
  const closureLiquidityOpen = !!stressGuard.liquidityStress || !!stressGuard.debtPressure || !!resilienceGuard.weakCashBuffer || !!finalLockGuard.liquidityLock;
  const closureHealthOpen = asEngineNumber(walletTotal) < 0 || asEngineNumber(netWorth) < 0 || asEngineNumber(debtRatio) >= 65;
  const closureBaselineOpen = !!noBaseline || (asEngineNumber(grossAssets) === 0 && asEngineNumber(loanTotal) === 0 && asEngineNumber(walletTotal) === 0);
  const closureDoubleCountOpen = (goalDuplicateRows || []).length > 0;
  const grossAssetCompositionDelta = Math.abs((asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal)) - asEngineNumber(grossAssets));
  const closureCompositionOpen = grossAssetCompositionDelta > 1;

  if (closureDataOpen) {
    issues.push("Closure: data trace belum clear");
    closureActions.push("Bersihkan validation dan audit trail sebelum engine dianggap closing-ready.");
  }
  if (closureFormulaOpen || closureCompositionOpen) {
    issues.push("Closure: formula final belum clear");
    closureActions.push("Pastikan komposisi Gross Assets dan Net Worth sama dengan formula final engine.");
  }
  if (closureSafetyOpen) {
    issues.push("Closure: safety/lock masih aktif");
    closureActions.push("Tutup Final Safety, Integrity, dan Lock Guard sebelum score dianggap final closed.");
  }
  if (closureHealthOpen) {
    issues.push("Closure: health lock masih aktif");
    closureActions.push("Status Sehat tetap dikunci selama wallet, net worth, atau debt ratio bermasalah.");
  }
  if (closureLiquidityOpen) {
    issues.push("Closure: liquidity/debt belum aman");
    closureActions.push("Perkuat buffer wallet dan turunkan tekanan pinjaman sebelum closure penuh.");
  }
  if (closureDoubleCountOpen) {
    issues.push("Closure: anti double count masih menahan aset Goal");
    closureActions.push("Selesaikan aset Goal yang masih terdeteksi dobel dengan Investasi.");
  }
  if (closureBaselineOpen) {
    issues.push("Closure: baseline real belum siap");
    closureActions.push("Lengkapi baseline real minimal wallet/asset/loan agar closure guard valid.");
  }

  const hardClosure = closureDataOpen || closureFormulaOpen || closureSafetyOpen || closureHealthOpen;
  const warning = !hardClosure && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(36, issueCount * 3 + (hardClosure ? 10 : 0)) : 0;
  const scoreCap = Math.min(
    closureFormulaOpen || closureCompositionOpen ? 55 : 100,
    closureDataOpen ? 68 : 100,
    asEngineNumber(netWorth) < 0 ? 37 : 100,
    asEngineNumber(walletTotal) < 0 ? 47 : 100,
    asEngineNumber(debtRatio) >= 65 ? 69 : 100,
    closureSafetyOpen ? 72 : 100,
    closureLiquidityOpen ? 76 : 100,
    closureDoubleCountOpen ? 74 : 100,
    closureBaselineOpen ? 69 : 100,
    upstreamIssueCount > 0 ? 82 : 100,
    issueCount > 0 ? 84 : 100
  );
  const closureReady = issueCount === 0 && upstreamIssueCount === 0;
  const primaryAction = closureActions[0] || "Closure Guard clear. Financial Engine final sudah siap dibaca sebagai output tertutup.";

  return {
    issues,
    closureActions,
    primaryAction,
    upstreamIssueCount,
    grossAssetCompositionDelta,
    closureDataOpen,
    closureFormulaOpen,
    closureSafetyOpen,
    closureLiquidityOpen,
    closureHealthOpen,
    closureBaselineOpen,
    closureDoubleCountOpen,
    closureCompositionOpen,
    closureReady,
    hardClosure,
    warning,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: closureReady,
  };
}



function buildFinancialSealGuard({
  walletTotal = 0,
  goalTotal = 0,
  investmentTotal = 0,
  loanTotal = 0,
  grossAssets = 0,
  netWorth = 0,
  debtRatio = 0,
  goalDuplicateRows = [],
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  finalSafetyGuard = {},
  finalIntegrityGuard = {},
  finalLockGuard = {},
  closureGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const sealActions = [];
  const upstreamIssueCount =
    asEngineNumber(ledgerValidation.issueCount) +
    asEngineNumber(auditTrailGuard.issueCount) +
    asEngineNumber(stressGuard.issueCount) +
    asEngineNumber(recoveryGuard.issueCount) +
    asEngineNumber(resilienceGuard.issueCount) +
    asEngineNumber(finalSafetyGuard.issueCount) +
    asEngineNumber(finalIntegrityGuard.issueCount) +
    asEngineNumber(finalLockGuard.issueCount) +
    asEngineNumber(closureGuard.issueCount);

  const sealDataUnclear = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0 || !!closureGuard.closureDataOpen;
  const sealFormulaUnclear = !!finalIntegrityGuard.netWorthMismatch || !!finalIntegrityGuard.grossAssetMismatch || !!finalIntegrityGuard.goalTotalMismatch || !!closureGuard.closureFormulaOpen || !!closureGuard.closureCompositionOpen;
  const sealSafetyUnclear = !!finalSafetyGuard.hardStop || !!finalLockGuard.hardLock || !!closureGuard.hardClosure;
  const sealHealthLocked = asEngineNumber(walletTotal) < 0 || asEngineNumber(netWorth) < 0 || asEngineNumber(debtRatio) >= 65 || !!finalLockGuard.healthLock || !!closureGuard.closureHealthOpen;
  const sealLiquidityUnclear = !!stressGuard.liquidityStress || !!stressGuard.debtPressure || !!finalLockGuard.liquidityLock || !!closureGuard.closureLiquidityOpen;
  const sealDoubleCountUnclear = (goalDuplicateRows || []).length > 0 || !!closureGuard.closureDoubleCountOpen;
  const sealBaselineUnready = !!noBaseline || !!finalLockGuard.baselineLock || !!closureGuard.closureBaselineOpen;
  const sealCascadeOpen = upstreamIssueCount > 0 || closureGuard.closureReady === false;
  const sealComponentEmptyRisk = asEngineNumber(grossAssets) === 0 && asEngineNumber(walletTotal) === 0 && asEngineNumber(goalTotal) === 0 && asEngineNumber(investmentTotal) === 0 && asEngineNumber(loanTotal) === 0;
  const sealFormulaDelta = Math.abs((asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal) - asEngineNumber(loanTotal)) - asEngineNumber(netWorth));
  const sealFormulaMismatch = sealFormulaDelta > 1;

  if (sealDataUnclear) {
    issues.push("Seal: data trace belum clear");
    sealActions.push("Selesaikan validation dan audit trail sebelum engine disegel sebagai final output.");
  }
  if (sealFormulaUnclear || sealFormulaMismatch) {
    issues.push("Seal: formula final belum tersegel");
    sealActions.push("Pastikan formula Wallet + Goal + Investasi - Pinjaman sama dengan Net Worth final.");
  }
  if (sealSafetyUnclear) {
    issues.push("Seal: safety/lock masih terbuka");
    sealActions.push("Tutup Safety, Integrity, Lock, dan Closure Guard sebelum seal dinyatakan bersih.");
  }
  if (sealHealthLocked) {
    issues.push("Seal: status sehat masih dikunci");
    sealActions.push("Score Sehat tetap dikunci selama wallet, net worth, atau debt ratio bermasalah.");
  }
  if (sealLiquidityUnclear) {
    issues.push("Seal: likuiditas/debt belum aman");
    sealActions.push("Perkuat buffer wallet dan kurangi tekanan pinjaman sebelum final seal.");
  }
  if (sealDoubleCountUnclear) {
    issues.push("Seal: anti double count masih aktif");
    sealActions.push("Pastikan aset Goal yang bersumber dari Investasi sudah tidak dihitung ganda.");
  }
  if (sealBaselineUnready || sealComponentEmptyRisk) {
    issues.push("Seal: baseline real belum siap");
    sealActions.push("Lengkapi baseline real agar seal tidak menganggap data kosong sebagai sehat.");
  }
  if (sealCascadeOpen) {
    issues.push("Seal: guard cascade belum sealed");
    sealActions.push("Pastikan seluruh guard dari Validation sampai Closure sudah clear sebelum status final dipakai.");
  }

  const hardSeal = sealDataUnclear || sealFormulaUnclear || sealFormulaMismatch || sealSafetyUnclear || sealHealthLocked;
  const warning = !hardSeal && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(40, issueCount * 3 + (hardSeal ? 12 : 0)) : 0;
  const scoreCap = Math.min(
    sealFormulaUnclear || sealFormulaMismatch ? 54 : 100,
    sealDataUnclear ? 67 : 100,
    asEngineNumber(netWorth) < 0 ? 36 : 100,
    asEngineNumber(walletTotal) < 0 ? 46 : 100,
    asEngineNumber(debtRatio) >= 65 ? 68 : 100,
    sealSafetyUnclear ? 71 : 100,
    sealLiquidityUnclear ? 75 : 100,
    sealDoubleCountUnclear ? 73 : 100,
    sealBaselineUnready || sealComponentEmptyRisk ? 68 : 100,
    sealCascadeOpen ? 81 : 100,
    issueCount > 0 ? 83 : 100
  );
  const sealReady = issueCount === 0 && upstreamIssueCount === 0 && closureGuard.closureReady !== false;
  const primaryAction = sealActions[0] || "Seal Guard clear. Financial Engine sudah tersegel untuk output final harian.";

  return {
    issues,
    sealActions,
    primaryAction,
    upstreamIssueCount,
    sealFormulaDelta,
    sealDataUnclear,
    sealFormulaUnclear,
    sealFormulaMismatch,
    sealSafetyUnclear,
    sealHealthLocked,
    sealLiquidityUnclear,
    sealDoubleCountUnclear,
    sealBaselineUnready,
    sealCascadeOpen,
    sealComponentEmptyRisk,
    sealReady,
    hardSeal,
    warning,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: sealReady,
  };
}


function buildFinancialReleaseReadinessGuard({
  walletTotal = 0,
  goalTotal = 0,
  investmentTotal = 0,
  loanTotal = 0,
  grossAssets = 0,
  netWorth = 0,
  debtRatio = 0,
  financialLiquidityWarning = false,
  goalDuplicateRows = [],
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  finalSafetyGuard = {},
  finalIntegrityGuard = {},
  finalLockGuard = {},
  closureGuard = {},
  sealGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const releaseActions = [];
  const upstreamIssueCount =
    asEngineNumber(ledgerValidation.issueCount) +
    asEngineNumber(auditTrailGuard.issueCount) +
    asEngineNumber(stressGuard.issueCount) +
    asEngineNumber(recoveryGuard.issueCount) +
    asEngineNumber(resilienceGuard.issueCount) +
    asEngineNumber(finalSafetyGuard.issueCount) +
    asEngineNumber(finalIntegrityGuard.issueCount) +
    asEngineNumber(finalLockGuard.issueCount) +
    asEngineNumber(closureGuard.issueCount) +
    asEngineNumber(sealGuard.issueCount);

  const releaseDataBlocked = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0 || !!sealGuard.sealDataUnclear || !!closureGuard.closureDataOpen;
  const releaseFormulaBlocked = !!finalIntegrityGuard.netWorthMismatch || !!finalIntegrityGuard.grossAssetMismatch || !!finalIntegrityGuard.goalTotalMismatch || !!closureGuard.closureFormulaOpen || !!closureGuard.closureCompositionOpen || !!sealGuard.sealFormulaUnclear || !!sealGuard.sealFormulaMismatch;
  const releaseSafetyBlocked = !!finalSafetyGuard.hardStop || !!finalLockGuard.hardLock || !!closureGuard.hardClosure || !!sealGuard.hardSeal;
  const releaseHealthBlocked = asEngineNumber(walletTotal) < 0 || asEngineNumber(netWorth) < 0 || asEngineNumber(debtRatio) >= 65 || !!finalLockGuard.healthLock || !!sealGuard.sealHealthLocked;
  const releaseLiquidityBlocked = !!financialLiquidityWarning || !!stressGuard.liquidityStress || !!stressGuard.debtPressure || !!finalLockGuard.liquidityLock || !!sealGuard.sealLiquidityUnclear;
  const releaseDoubleCountBlocked = (goalDuplicateRows || []).length > 0 || !!closureGuard.closureDoubleCountOpen || !!sealGuard.sealDoubleCountUnclear;
  const releaseBaselineBlocked = !!noBaseline || !!sealGuard.sealBaselineUnready || !!sealGuard.sealComponentEmptyRisk || !!closureGuard.closureBaselineOpen;
  const releaseCascadeBlocked = upstreamIssueCount > 0 || closureGuard.closureReady === false || sealGuard.sealReady === false;
  const releaseCompositionDelta = Math.abs((asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal) - asEngineNumber(loanTotal)) - asEngineNumber(netWorth));
  const releaseCompositionBlocked = releaseCompositionDelta > 1 || asEngineNumber(grossAssets) < 0;
  const releaseEmptyButHealthyRisk = asEngineNumber(grossAssets) === 0 && asEngineNumber(walletTotal) === 0 && asEngineNumber(goalTotal) === 0 && asEngineNumber(investmentTotal) === 0 && asEngineNumber(loanTotal) === 0;

  if (releaseDataBlocked) {
    issues.push("Release: data trace belum ready");
    releaseActions.push("Bereskan validation dan audit trail sebelum engine dipakai untuk keputusan final.");
  }
  if (releaseFormulaBlocked || releaseCompositionBlocked) {
    issues.push("Release: formula final belum ready");
    releaseActions.push("Kunci ulang formula Wallet + Goal + Investasi - Pinjaman agar sama dengan Net Worth.");
  }
  if (releaseSafetyBlocked) {
    issues.push("Release: safety/seal masih blocking");
    releaseActions.push("Tutup Safety, Lock, Closure, dan Seal Guard sebelum release dianggap aman.");
  }
  if (releaseHealthBlocked) {
    issues.push("Release: health status belum boleh sehat");
    releaseActions.push("Score Sehat tetap diblokir selama wallet, net worth, atau debt ratio bermasalah.");
  }
  if (releaseLiquidityBlocked) {
    issues.push("Release: likuiditas/debt perlu review");
    releaseActions.push("Review buffer wallet, debt pressure, dan liquidity stress sebelum go-live data real.");
  }
  if (releaseDoubleCountBlocked) {
    issues.push("Release: anti double count masih aktif");
    releaseActions.push("Pastikan aset Goal dan Investasi tidak overlap sebelum final reporting.");
  }
  if (releaseBaselineBlocked || releaseEmptyButHealthyRisk) {
    issues.push("Release: baseline real belum layak release");
    releaseActions.push("Lengkapi baseline real agar data kosong tidak terbaca sebagai kondisi sehat.");
  }
  if (releaseCascadeBlocked) {
    issues.push("Release: guard cascade belum clear");
    releaseActions.push("Pastikan seluruh guard dari Validation sampai Seal sudah clear sebelum status release ready.");
  }

  const releaseBlocked = releaseDataBlocked || releaseFormulaBlocked || releaseCompositionBlocked || releaseSafetyBlocked || releaseHealthBlocked || releaseBaselineBlocked || releaseCascadeBlocked;
  const releaseReview = !releaseBlocked && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(44, issueCount * 3 + (releaseBlocked ? 14 : 0)) : 0;
  const scoreCap = Math.min(
    releaseFormulaBlocked || releaseCompositionBlocked ? 53 : 100,
    releaseDataBlocked ? 66 : 100,
    asEngineNumber(netWorth) < 0 ? 35 : 100,
    asEngineNumber(walletTotal) < 0 ? 45 : 100,
    asEngineNumber(debtRatio) >= 65 ? 67 : 100,
    releaseSafetyBlocked ? 70 : 100,
    releaseLiquidityBlocked ? 74 : 100,
    releaseDoubleCountBlocked ? 72 : 100,
    releaseBaselineBlocked || releaseEmptyButHealthyRisk ? 67 : 100,
    releaseCascadeBlocked ? 80 : 100,
    issueCount > 0 ? 82 : 100
  );
  const releaseReady = issueCount === 0 && upstreamIssueCount === 0 && sealGuard.sealReady !== false;
  const readinessLabel = releaseReady ? "Release Ready" : releaseBlocked ? "Blocked" : "Review";
  const primaryAction = releaseActions[0] || "Release Readiness Guard clear. Financial Engine siap dipakai sebagai baseline final Phase 6.8.";

  return {
    issues,
    releaseActions,
    primaryAction,
    upstreamIssueCount,
    releaseCompositionDelta,
    releaseDataBlocked,
    releaseFormulaBlocked,
    releaseCompositionBlocked,
    releaseSafetyBlocked,
    releaseHealthBlocked,
    releaseLiquidityBlocked,
    releaseDoubleCountBlocked,
    releaseBaselineBlocked,
    releaseCascadeBlocked,
    releaseEmptyButHealthyRisk,
    releaseBlocked,
    releaseReview,
    releaseReady,
    readinessLabel,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: releaseReady,
  };
}


function buildFinancialConsolidationGuard({
  walletTotal = 0,
  goalTotal = 0,
  investmentTotal = 0,
  loanTotal = 0,
  grossAssets = 0,
  netWorth = 0,
  debtRatio = 0,
  financialLiquidityWarning = false,
  goalDuplicateRows = [],
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  finalSafetyGuard = {},
  finalIntegrityGuard = {},
  finalLockGuard = {},
  closureGuard = {},
  sealGuard = {},
  releaseReadinessGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const consolidationActions = [];
  const upstreamIssueCount =
    asEngineNumber(ledgerValidation.issueCount) +
    asEngineNumber(auditTrailGuard.issueCount) +
    asEngineNumber(stressGuard.issueCount) +
    asEngineNumber(recoveryGuard.issueCount) +
    asEngineNumber(resilienceGuard.issueCount) +
    asEngineNumber(finalSafetyGuard.issueCount) +
    asEngineNumber(finalIntegrityGuard.issueCount) +
    asEngineNumber(finalLockGuard.issueCount) +
    asEngineNumber(closureGuard.issueCount) +
    asEngineNumber(sealGuard.issueCount) +
    asEngineNumber(releaseReadinessGuard.issueCount);

  const recomputedNetWorth = asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal) - asEngineNumber(loanTotal);
  const recomputedGrossAssets = asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal);
  const consolidationFormulaDelta = Math.abs(recomputedNetWorth - asEngineNumber(netWorth));
  const consolidationGrossDelta = Math.abs(recomputedGrossAssets - asEngineNumber(grossAssets));

  const consolidationDataOpen = asEngineNumber(ledgerValidation.issueCount) > 0 || asEngineNumber(auditTrailGuard.issueCount) > 0;
  const consolidationFormulaOpen = consolidationFormulaDelta > 1 || consolidationGrossDelta > 1 || !!finalIntegrityGuard.netWorthMismatch || !!finalIntegrityGuard.grossAssetMismatch || !!releaseReadinessGuard.releaseFormulaBlocked || !!releaseReadinessGuard.releaseCompositionBlocked;
  const consolidationSafetyOpen = !!finalSafetyGuard.hardStop || !!finalLockGuard.hardLock || !!closureGuard.hardClosure || !!sealGuard.hardSeal || !!releaseReadinessGuard.releaseBlocked;
  const consolidationHealthOpen = asEngineNumber(walletTotal) < 0 || asEngineNumber(netWorth) < 0 || asEngineNumber(debtRatio) >= 65 || !!finalLockGuard.healthLock || !!releaseReadinessGuard.releaseHealthBlocked;
  const consolidationLiquidityReview = !!financialLiquidityWarning || !!stressGuard.liquidityStress || !!stressGuard.debtPressure || !!resilienceGuard.weakCashBuffer || !!releaseReadinessGuard.releaseLiquidityBlocked;
  const consolidationDoubleCountOpen = (goalDuplicateRows || []).length > 0 || !!closureGuard.closureDoubleCountOpen || !!sealGuard.sealDoubleCountUnclear || !!releaseReadinessGuard.releaseDoubleCountBlocked;
  const consolidationBaselineOpen = !!noBaseline || !!releaseReadinessGuard.releaseBaselineBlocked || !!sealGuard.sealBaselineUnready || !!closureGuard.closureBaselineOpen;
  const consolidationCascadeOpen = upstreamIssueCount > 0 || releaseReadinessGuard.releaseReady === false || sealGuard.sealReady === false || closureGuard.closureReady === false;
  const progressPercent = Math.max(0, Math.min(100, Math.round(100 - Math.min(100, upstreamIssueCount * 6 + (consolidationFormulaOpen ? 18 : 0) + (consolidationSafetyOpen ? 16 : 0) + (consolidationBaselineOpen ? 10 : 0)))));

  if (consolidationDataOpen) {
    issues.push("Consolidation: data trace masih terbuka");
    consolidationActions.push("Selesaikan isu ledger, wallet, dan audit trail sebelum engine dikunci sebagai final.");
  }
  if (consolidationFormulaOpen) {
    issues.push("Consolidation: formula belum konsisten");
    consolidationActions.push("Pastikan Wallet + Goal + Investasi - Pinjaman sama dengan Net Worth final.");
  }
  if (consolidationSafetyOpen) {
    issues.push("Consolidation: safety/release lock masih aktif");
    consolidationActions.push("Tutup Safety, Lock, Closure, Seal, dan Release Guard yang masih blocking.");
  }
  if (consolidationHealthOpen) {
    issues.push("Consolidation: healthy status belum boleh terbuka");
    consolidationActions.push("Jangan tampilkan kondisi sehat selama wallet, net worth, atau debt ratio bermasalah.");
  }
  if (consolidationLiquidityReview) {
    issues.push("Consolidation: likuiditas/debt masih perlu review");
    consolidationActions.push("Review buffer wallet, debt pressure, dan resilience cash sebelum closing Phase 6.8.");
  }
  if (consolidationDoubleCountOpen) {
    issues.push("Consolidation: anti double count masih aktif");
    consolidationActions.push("Pastikan aset Goal dan Investasi tidak overlap di Net Worth.");
  }
  if (consolidationBaselineOpen) {
    issues.push("Consolidation: baseline real belum lengkap");
    consolidationActions.push("Lengkapi baseline real agar data kosong tidak dibaca sehat.");
  }
  if (consolidationCascadeOpen) {
    issues.push("Consolidation: guard cascade belum clear");
    consolidationActions.push("Baca ringkasan guard paling atas dulu, lalu tuntaskan guard prioritas satu per satu.");
  }

  const consolidationBlocked = consolidationDataOpen || consolidationFormulaOpen || consolidationSafetyOpen || consolidationHealthOpen || consolidationBaselineOpen || consolidationCascadeOpen;
  const consolidationReview = !consolidationBlocked && issues.length > 0;
  const issueCount = issues.length;
  const scorePenalty = issueCount > 0 ? Math.min(46, issueCount * 3 + (consolidationBlocked ? 15 : 0)) : 0;
  const scoreCap = Math.min(
    consolidationFormulaOpen ? 52 : 100,
    consolidationDataOpen ? 65 : 100,
    asEngineNumber(netWorth) < 0 ? 34 : 100,
    asEngineNumber(walletTotal) < 0 ? 44 : 100,
    asEngineNumber(debtRatio) >= 65 ? 66 : 100,
    consolidationSafetyOpen ? 69 : 100,
    consolidationLiquidityReview ? 73 : 100,
    consolidationDoubleCountOpen ? 71 : 100,
    consolidationBaselineOpen ? 66 : 100,
    consolidationCascadeOpen ? 79 : 100,
    issueCount > 0 ? 81 : 100
  );
  const consolidationReady = issueCount === 0 && upstreamIssueCount === 0 && releaseReadinessGuard.releaseReady !== false;
  const consolidationLabel = consolidationReady ? "Consolidated" : consolidationBlocked ? "Blocked" : "Review";
  const progressNotice = consolidationReady
    ? "Progress 7.1.5: Consolidation Guard clear · engine siap baseline Phase 7.1.5."
    : "Progress 7.1.5: " + progressPercent + "% · " + issueCount + " lock aktif · " + consolidationLabel;
  const primaryAction = consolidationActions[0] || "Consolidation Guard clear. Financial Engine sudah rapi sebagai baseline final sebagai baseline Phase 7.1.5.";

  return {
    issues,
    consolidationActions,
    primaryAction,
    upstreamIssueCount,
    recomputedNetWorth,
    recomputedGrossAssets,
    consolidationFormulaDelta,
    consolidationGrossDelta,
    consolidationDataOpen,
    consolidationFormulaOpen,
    consolidationSafetyOpen,
    consolidationHealthOpen,
    consolidationLiquidityReview,
    consolidationDoubleCountOpen,
    consolidationBaselineOpen,
    consolidationCascadeOpen,
    consolidationBlocked,
    consolidationReview,
    consolidationReady,
    consolidationLabel,
    progressPercent,
    progressNotice,
    issueCount,
    scorePenalty,
    scoreCap,
    ok: consolidationReady,
  };
}


function buildFinancialDeploymentSyncNotice(progressNotice = "", version = FINANCIAL_ENGINE_VERSION) {
  const baseNotice = String(progressNotice || "").trim();
  const suffix = " · deploy sync verified";
  if (!baseNotice) return "Progress " + version + ": deploy sync verified.";
  return baseNotice.includes("deploy sync verified") ? baseNotice : baseNotice + suffix;
}



function buildFinancialHealthEngine({
  engineScore = 100,
  walletTotal = 0,
  goalTotal = 0,
  investmentTotal = 0,
  loanTotal = 0,
  netWorth = 0,
  debtRatio = 0,
  liquidityWarning = false,
  negativeWalletBreakdown = [],
  engineIssues = [],
  progressMonitorGuard = {},
  periodIncome = 0,
  periodExpense = 0,
  periodNetFlow = 0,
  goalTarget = 0,
  goalCurrent = 0,
  transactionQualityScore = 100,
  noBaseline = false,
} = {}) {
  const safeEngineScore = Math.max(0, Math.min(100, Math.round(asEngineNumber(engineScore))));
  const safeTxnQuality = Math.max(0, Math.min(100, Math.round(asEngineNumber(transactionQualityScore))));
  const safeDebtRatio = Math.max(0, asEngineNumber(debtRatio));
  const safeWalletTotal = asEngineNumber(walletTotal);
  const safeGoalTotal = asEngineNumber(goalTotal);
  const safeInvestmentTotal = asEngineNumber(investmentTotal);
  const safeLoanTotal = asEngineNumber(loanTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safePeriodIncome = asEngineNumber(periodIncome);
  const safePeriodExpense = asEngineNumber(periodExpense);
  const safePeriodNetFlow = asEngineNumber(periodNetFlow);
  const safeGoalTarget = asEngineNumber(goalTarget);
  const safeGoalCurrent = asEngineNumber(goalCurrent);
  const activeEngineIssues = Array.isArray(engineIssues) ? engineIssues.length : 0;
  const blockingLocks = asEngineNumber(progressMonitorGuard?.blockingLockCount || 0);
  const activeLocks = asEngineNumber(progressMonitorGuard?.activeLockCount || 0);
  const goalFundingRatio = safeGoalTarget > 0 ? Math.min(150, (safeGoalCurrent / safeGoalTarget) * 100) : 100;
  const expenseCoverageRatio = safePeriodExpense > 0 ? safePeriodIncome / safePeriodExpense : (safePeriodIncome > 0 ? 2 : 1);
  const liquidCoverageRatio = safeLoanTotal > 0 ? safeWalletTotal / safeLoanTotal : (safeWalletTotal > 0 ? 2 : 1);

  const liquidityScore = Math.max(0, Math.min(100,
    safeWalletTotal < 0 ? 20 :
    liquidityWarning ? 55 :
    safeWalletTotal === 0 && (safeGoalTotal + safeInvestmentTotal + safeLoanTotal) > 0 ? 62 :
    liquidCoverageRatio >= 1 ? 95 :
    liquidCoverageRatio >= 0.5 ? 82 :
    liquidCoverageRatio >= 0.2 ? 70 : 58
  ));
  const debtScore = Math.max(0, Math.min(100,
    safeLoanTotal <= 0 ? 100 :
    safeDebtRatio >= 100 ? 20 :
    100 - (safeDebtRatio * 1.15)
  ));
  const netWorthScore = Math.max(0, Math.min(100,
    safeNetWorth < 0 ? 25 :
    safeNetWorth === 0 && (safeWalletTotal + safeGoalTotal + safeInvestmentTotal + safeLoanTotal) > 0 ? 55 :
    safeNetWorth >= safeLoanTotal * 2 ? 95 :
    safeNetWorth >= safeLoanTotal ? 82 : 70
  ));
  const cashflowScore = Math.max(0, Math.min(100,
    safePeriodExpense <= 0 && safePeriodIncome <= 0 ? 78 :
    safePeriodNetFlow >= 0 && expenseCoverageRatio >= 1.2 ? 94 :
    safePeriodNetFlow >= 0 ? 84 :
    expenseCoverageRatio >= 0.8 ? 68 :
    expenseCoverageRatio >= 0.5 ? 52 : 38
  ));
  const goalScore = Math.max(0, Math.min(100,
    safeGoalTarget <= 0 ? 76 :
    goalFundingRatio >= 100 ? 100 :
    goalFundingRatio >= 75 ? 88 :
    goalFundingRatio >= 50 ? 76 :
    goalFundingRatio >= 25 ? 62 : 48
  ));
  const dataQualityScore = Math.max(0, Math.min(100,
    noBaseline ? 58 :
    activeEngineIssues > 0 ? Math.max(45, 90 - Math.min(40, activeEngineIssues * 4)) :
    blockingLocks > 0 ? 68 :
    safeTxnQuality
  ));

  const componentRows = [
    { key: "liquidity", label: "Liquidity", score: Math.round(liquidityScore), detail: safeWalletTotal < 0 ? "wallet negatif" : (liquidityWarning ? "cash buffer rendah" : "cash buffer terbaca") },
    { key: "debt", label: "Debt", score: Math.round(debtScore), detail: safeLoanTotal > 0 ? `debt ratio ${safeDebtRatio.toFixed(1)}%` : "tanpa loan aktif" },
    { key: "netWorth", label: "Net Worth", score: Math.round(netWorthScore), detail: safeNetWorth < 0 ? "net worth negatif" : "net worth valid" },
    { key: "cashflow", label: "Cashflow", score: Math.round(cashflowScore), detail: safePeriodNetFlow >= 0 ? "arus kas periode positif" : "arus kas periode negatif" },
    { key: "goals", label: "Goals", score: Math.round(goalScore), detail: safeGoalTarget > 0 ? `funded ${Math.min(100, goalFundingRatio).toFixed(0)}%` : "target goal belum lengkap" },
    { key: "data", label: "Data", score: Math.round(dataQualityScore), detail: activeEngineIssues > 0 ? `${activeEngineIssues} engine issue` : "data terbaca" },
  ];

  const weightedScore = (
    liquidityScore * 0.22 +
    debtScore * 0.18 +
    netWorthScore * 0.22 +
    cashflowScore * 0.13 +
    goalScore * 0.10 +
    dataQualityScore * 0.15
  );
  const scoreCap = Math.min(
    safeEngineScore,
    safeNetWorth < 0 ? 39 : 100,
    safeWalletTotal < 0 ? 49 : 100,
    (negativeWalletBreakdown || []).length > 0 ? 59 : 100,
    safeDebtRatio >= 65 ? 69 : 100,
    liquidityWarning ? 79 : 100,
    blockingLocks > 0 ? 74 : 100,
    activeEngineIssues > 0 ? 79 : 100,
    noBaseline ? 69 : 100
  );
  const healthScore = Math.max(0, Math.min(scoreCap, Math.round(weightedScore)));
  const healthLabel = healthScore >= 80 ? "Sehat" : healthScore >= 65 ? "Stabil" : healthScore >= 45 ? "Waspada" : "Bahaya";
  const healthStage = healthScore >= 80 ? "Growth Ready" : healthScore >= 65 ? "Stabilize" : healthScore >= 45 ? "Recovery" : "Emergency";
  const healthColor = healthScore >= 80 ? "#86efac" : healthScore >= 65 ? "#c7d2fe" : healthScore >= 45 ? "#fde68a" : "#fecaca";
  const healthBg = healthScore >= 80 ? "rgba(16,185,129,0.12)" : healthScore >= 65 ? "rgba(99,102,241,0.12)" : healthScore >= 45 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.13)";

  const actionCandidates = [];
  if (safeWalletTotal < 0 || (negativeWalletBreakdown || []).length > 0) actionCandidates.push("Pulihkan wallet negatif sebelum membaca status sehat.");
  if (safeNetWorth < 0) actionCandidates.push("Naikkan Net Worth ke positif dengan cash/asset atau turunkan liability.");
  if (safeDebtRatio >= 65) actionCandidates.push("Turunkan debt pressure sebelum ekspansi goal/investasi.");
  if (liquidityWarning || liquidityScore < 70) actionCandidates.push("Perkuat cash buffer utama.");
  if (safePeriodNetFlow < 0) actionCandidates.push("Perbaiki arus kas periode aktif: income harus menutup expense.");
  if (goalFundingRatio < 50 && safeGoalTarget > 0) actionCandidates.push("Prioritaskan goal wajib dan cek required allocation bulanan.");
  if (activeEngineIssues > 0 || blockingLocks > 0 || noBaseline) actionCandidates.push("Bereskan baseline dan issue engine sebelum status health dianggap final.");
  const primaryAction = actionCandidates[0] || "Financial Health Engine clear: lanjutkan monitoring rutin dan mulai baca rekomendasi goal/income.";

  const progressPercent = Math.max(0, Math.min(100, Math.round((healthScore * 0.75) + (dataQualityScore * 0.15) + (safeEngineScore * 0.10))));
  const healthNotice = `Progress 7.1.5: ${progressPercent}% · Health ${healthLabel} · ${healthStage} · ${primaryAction}`;
  const issueCount = actionCandidates.length;
  return {
    healthScore,
    healthLabel,
    healthStage,
    healthColor,
    healthBg,
    scoreCap,
    progressPercent,
    healthNotice,
    primaryAction,
    actionCandidates,
    componentRows,
    liquidityScore: Math.round(liquidityScore),
    debtScore: Math.round(debtScore),
    netWorthScore: Math.round(netWorthScore),
    cashflowScore: Math.round(cashflowScore),
    goalScore: Math.round(goalScore),
    dataQualityScore: Math.round(dataQualityScore),
    goalFundingRatio,
    expenseCoverageRatio,
    activeEngineIssues,
    activeLocks,
    blockingLocks,
    issueCount,
    ok: issueCount === 0 && healthScore >= 80,
  };
}


function buildFinancialHealthDecisionEngine({
  healthEngine = {},
  periodIncome = 0,
  periodExpense = 0,
  periodNetFlow = 0,
  walletTotal = 0,
  loanTotal = 0,
  goals = [],
  now = new Date(),
} = {}) {
  const safeIncome = Math.max(0, asEngineNumber(periodIncome));
  const safeExpense = Math.max(0, asEngineNumber(periodExpense));
  const safeNetFlow = asEngineNumber(periodNetFlow);
  const safeWallet = asEngineNumber(walletTotal);
  const safeLoan = Math.max(0, asEngineNumber(loanTotal));
  const date = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - day + 1);

  const goalRows = (Array.isArray(goals) ? goals : []).filter(goal => String(goal?.status || "active").toLowerCase() === "active").map(goal => {
    const target = Math.max(0, asEngineNumber(goal?.targetAmount));
    const current = Math.max(0, asEngineNumber(goal?.currentAmount));
    const remaining = Math.max(0, target - current);
    const yearsLeft = Math.max(1 / 12, asEngineNumber(goal?.yearsLeft || 1));
    const monthsLeft = Math.max(1, Math.ceil(yearsLeft * 12));
    const monthlyRequired = remaining / monthsLeft;
    const dailyRequired = monthlyRequired * 12 / 365;
    const priority = getGoalPriorityLabel(goal);
    return { ...goal, target, current, remaining, monthsLeft, monthlyRequired, dailyRequired, priority };
  });

  const mandatoryRows = goalRows.filter(row => row.priority === "Wajib");
  const importantRows = goalRows.filter(row => row.priority === "Penting");
  const optionalRows = goalRows.filter(row => row.priority === "Opsional");
  const mandatoryMonthly = mandatoryRows.reduce((sum, row) => sum + row.monthlyRequired, 0);
  const importantMonthly = importantRows.reduce((sum, row) => sum + row.monthlyRequired, 0);
  const optionalMonthly = optionalRows.reduce((sum, row) => sum + row.monthlyRequired, 0);
  const debtReserveMonthly = safeLoan > 0 ? Math.min(safeLoan / 24, Math.max(safeExpense * 0.20, safeLoan * 0.02)) : 0;
  const liquidityReserveMonthly = safeWallet < safeExpense ? Math.max(0, (safeExpense - Math.max(0, safeWallet)) / 6) : 0;
  const coreIncomeTarget = safeExpense + mandatoryMonthly + debtReserveMonthly + liquidityReserveMonthly;
  const growthIncomeTarget = coreIncomeTarget + importantMonthly;
  const incomeShortfall = Math.max(0, coreIncomeTarget - safeIncome);
  const incomeSurplus = Math.max(0, safeIncome - coreIncomeTarget);
  const incomeTargetRemaining = Math.max(0, coreIncomeTarget - safeIncome);
  const dailyIncomeTarget = incomeTargetRemaining / remainingDays;

  const protectedCommitments = mandatoryMonthly + debtReserveMonthly + liquidityReserveMonthly;
  const safeSpendingMonthly = Math.max(0, safeIncome - protectedCommitments);
  const alreadySpent = safeExpense;
  const safeSpendingRemaining = Math.max(0, safeSpendingMonthly - alreadySpent);
  const safeSpendingDaily = safeSpendingRemaining / remainingDays;
  const spendingPressure = safeSpendingMonthly > 0 ? alreadySpent / safeSpendingMonthly : (alreadySpent > 0 ? 2 : 0);

  const goalCapacity = Math.max(0, safeIncome - safeExpense - debtReserveMonthly - liquidityReserveMonthly);
  const mandatoryGap = Math.max(0, mandatoryMonthly - goalCapacity);
  const lifestyleCapacity = Math.max(0, goalCapacity - mandatoryMonthly - importantMonthly);
  const mandatoryCoverage = mandatoryMonthly > 0 ? Math.min(150, goalCapacity / mandatoryMonthly * 100) : 100;

  const feasibilityRows = goalRows.map(row => {
    const capacityAfterMandatory = Math.max(0, goalCapacity - mandatoryMonthly);
    const isMandatory = row.priority === "Wajib";
    const affordable = isMandatory ? mandatoryCoverage >= 100 : row.monthlyRequired <= capacityAfterMandatory;
    const pressureRatio = goalCapacity > 0 ? row.monthlyRequired / goalCapacity : (row.monthlyRequired > 0 ? 9 : 0);
    const recommendation = affordable
      ? (isMandatory ? "Aktifkan dan lindungi alokasinya." : "Layak, selama goal wajib tetap aman.")
      : (isMandatory ? "Perpanjang deadline atau naikkan income." : "Tunda, kurangi target, atau perpanjang deadline.");
    return { ...row, affordable, pressureRatio, recommendation };
  }).sort((a, b) => {
    const rank = { Wajib: 0, Penting: 1, Opsional: 2 };
    return (rank[a.priority] - rank[b.priority]) || (b.monthlyRequired - a.monthlyRequired);
  });

  const recommendations = [];
  if ((healthEngine?.healthScore || 0) < 45) recommendations.push("Masuk mode pemulihan: hentikan ekspansi goal opsional dan pulihkan cashflow.");
  if (incomeShortfall > 0) recommendations.push(`Tutup kekurangan income ${formatRupiah(incomeShortfall)} bulan ini.`);
  if (mandatoryGap > 0) recommendations.push(`Goal wajib kekurangan kapasitas ${formatRupiah(mandatoryGap)} per bulan.`);
  if (safeSpendingDaily <= 0 && alreadySpent > 0) recommendations.push("Batas belanja aman periode ini telah habis; tahan pengeluaran non-wajib.");
  if (spendingPressure >= 0.85 && safeSpendingDaily > 0) recommendations.push("Pengeluaran mendekati batas aman; gunakan limit harian yang tersisa.");
  if (safeLoan > 0 && debtReserveMonthly > 0) recommendations.push(`Lindungi cadangan cicilan/utang sekitar ${formatRupiah(debtReserveMonthly)} per bulan.`);
  if (!recommendations.length) recommendations.push("Kondisi inti aman: pertahankan cashflow dan arahkan surplus ke goal prioritas.");

  const decisionStatus = incomeShortfall > 0 || mandatoryGap > 0 || safeSpendingDaily <= 0
    ? "Action Required"
    : lifestyleCapacity > 0 && (healthEngine?.healthScore || 0) >= 65
      ? "Growth Capacity"
      : "Stable Control";
  const decisionColor = decisionStatus === "Action Required" ? "#fde68a" : decisionStatus === "Growth Capacity" ? "#86efac" : "#c7d2fe";
  const decisionBg = decisionStatus === "Action Required" ? "rgba(245,158,11,0.11)" : decisionStatus === "Growth Capacity" ? "rgba(16,185,129,0.10)" : "rgba(99,102,241,0.10)";

  return {
    coreIncomeTarget,
    growthIncomeTarget,
    incomeShortfall,
    incomeSurplus,
    dailyIncomeTarget,
    remainingDays,
    safeSpendingMonthly,
    safeSpendingRemaining,
    safeSpendingDaily,
    spendingPressure,
    mandatoryMonthly,
    importantMonthly,
    optionalMonthly,
    mandatoryCoverage,
    mandatoryGap,
    lifestyleCapacity,
    debtReserveMonthly,
    liquidityReserveMonthly,
    goalCapacity,
    feasibilityRows,
    topGoalRisks: feasibilityRows.filter(row => !row.affordable).slice(0, 3),
    recommendations,
    primaryRecommendation: recommendations[0],
    decisionStatus,
    decisionColor,
    decisionBg,
    periodNetFlow: safeNetFlow,
    ok: incomeShortfall <= 0 && mandatoryGap <= 0 && safeSpendingDaily > 0,
  };
}


function buildPredictiveFinancialHealthEngine({
  healthEngine = {},
  decisionEngine = {},
  transactions = [],
  walletTotal = 0,
  loanTotal = 0,
  netWorth = 0,
  debtRatio = 0,
  now = new Date(),
} = {}) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const anchor = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const today = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const parseTxnDate = (row) => {
    const value = row?.date || row?.createdAt || row?.updatedAt;
    if (!value) return null;
    if (typeof value === "string") {
      const parts = value.slice(0, 10).split("-");
      if (parts.length >= 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) return new Date(y, m, d);
      }
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const rows = (Array.isArray(transactions) ? transactions : [])
    .filter(row => isFinancialRecordActive(row))
    .map(row => ({ ...row, _date: parseTxnDate(row), _amount: Math.max(0, asEngineNumber(row?.amount)) }))
    .filter(row => row._date && row._date <= today && ["income", "expense"].includes(String(row.type || "").toLowerCase()));

  const windowRows = rows.map(row => ({ ...row, _ageDays: Math.floor((today.getTime() - row._date.getTime()) / DAY_MS) })).filter(row => row._ageDays >= 0 && row._ageDays <= 90);
  const recent30Rows = windowRows.filter(row => row._ageDays <= 30);
  const previous30Rows = windowRows.filter(row => row._ageDays > 30 && row._ageDays <= 60);
  const last90Rows = windowRows.filter(row => row._ageDays <= 90);
  const sumByType = (list, type) => list.filter(row => row.type === type).reduce((sum, row) => sum + row._amount, 0);

  const recentIncome = sumByType(recent30Rows, "income");
  const recentExpense = sumByType(recent30Rows, "expense");
  const previousIncome = sumByType(previous30Rows, "income");
  const previousExpense = sumByType(previous30Rows, "expense");
  const income90 = sumByType(last90Rows, "income");
  const expense90 = sumByType(last90Rows, "expense");
  const recentNetFlow = recentIncome - recentExpense;
  const previousNetFlow = previousIncome - previousExpense;
  const netFlowTrend = recentNetFlow - previousNetFlow;

  const safeWallet = asEngineNumber(walletTotal);
  const safeLoan = Math.max(0, asEngineNumber(loanTotal));
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = Math.max(0, asEngineNumber(debtRatio));
  const negativeWalletLock = safeWallet < 0;
  const negativeNetWorthLock = safeNetWorth < 0;
  const recoveryGap = Math.max(0, -safeWallet);
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const monthlyCommitments = Math.max(0,
    asEngineNumber(decisionEngine?.mandatoryMonthly) +
    asEngineNumber(decisionEngine?.debtReserveMonthly) +
    asEngineNumber(decisionEngine?.liquidityReserveMonthly)
  );
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const safeSpendingDaily = Math.max(0, asEngineNumber(decisionEngine?.safeSpendingDaily));

  const dailyIncome30 = recentIncome / 30;
  const dailyExpense30 = recentExpense / 30;
  const dailyIncome90 = income90 / 90;
  const dailyExpense90 = expense90 / 90;
  const normalizedMonthlyIncome = recentIncome > 0 ? recentIncome : dailyIncome90 * 30;
  const normalizedMonthlyExpense = recentExpense > 0 ? recentExpense : dailyExpense90 * 30;
  const baselineMonthlyNet = normalizedMonthlyIncome - normalizedMonthlyExpense;
  const commitmentPressure = monthlyCommitments > 0 ? monthlyCommitments / Math.max(1, normalizedMonthlyIncome) : 0;
  const predictiveMonthlyNet = baselineMonthlyNet - Math.max(0, mandatoryGap) - Math.max(0, incomeShortfall * 0.35);

  const forecastRows = [30, 60, 90].map(days => {
    const months = days / 30;
    const expected = safeWallet + predictiveMonthlyNet * months;
    const lower = safeWallet + (predictiveMonthlyNet - Math.max(normalizedMonthlyExpense * 0.15, incomeShortfall * 0.25)) * months;
    const upper = safeWallet + (predictiveMonthlyNet + Math.max(normalizedMonthlyIncome * 0.10, safeSpendingDaily * 30 * 0.20)) * months;
    const risk = negativeWalletLock || lower < 0 ? "High" : expected < 0 ? "Medium" : lower < normalizedMonthlyExpense * 0.25 ? "Watch" : "Clear";
    return { days, label: `${days} hari`, expected, lower, upper, risk };
  });

  const dailyDeficit = Math.max(0, dailyExpense30 - dailyIncome30 + (mandatoryGap / 30));
  const runwayDaysRaw = negativeWalletLock ? 0 : dailyDeficit > 0 ? safeWallet / dailyDeficit : 999;
  const runwayDays = Math.max(0, Math.min(999, Math.round(runwayDaysRaw)));
  const runwayLabel = negativeWalletLock ? "Recovery Required" : runwayDays >= 180 ? "Long Runway" : runwayDays >= 90 ? "Stable Runway" : runwayDays >= 30 ? "Tight Runway" : "Critical Runway";
  const trendLabel = netFlowTrend >= 0 ? "Improving" : Math.abs(netFlowTrend) <= Math.max(250000, Math.abs(previousNetFlow) * 0.10) ? "Flat" : "Deteriorating";
  const trendColor = trendLabel === "Improving" ? "#86efac" : trendLabel === "Flat" ? "#c7d2fe" : "#fde68a";

  const volatilityBase = Math.max(1, Math.abs(previousNetFlow));
  const volatilityRatio = Math.min(3, Math.abs(netFlowTrend) / volatilityBase);
  const riskPenalty =
    (negativeWalletLock ? 34 : 0) +
    (negativeNetWorthLock ? 18 : 0) +
    (forecastRows.some(row => row.expected < 0) ? 28 : 0) +
    (forecastRows.some(row => row.lower < 0) ? 18 : 0) +
    (runwayDays < 30 ? 28 : runwayDays < 60 ? 16 : runwayDays < 90 ? 8 : 0) +
    (trendLabel === "Deteriorating" ? 12 : 0) +
    (commitmentPressure > 0.75 ? 14 : commitmentPressure > 0.55 ? 8 : 0) +
    (incomeShortfall > 0 ? 12 : 0) +
    (mandatoryGap > 0 ? 10 : 0) +
    (safeDebtRatio >= 65 ? 14 : safeDebtRatio >= 35 ? 7 : 0) +
    (healthScore < 45 ? 16 : healthScore < 65 ? 8 : 0) +
    (volatilityRatio > 1.25 ? 6 : 0);
  const rawPredictiveScore = Math.round(100 - riskPenalty);
  const scoreCaps = [100];
  if (negativeWalletLock) scoreCaps.push(38);
  if (negativeNetWorthLock) scoreCaps.push(45);
  if (forecastRows.some(row => row.lower < 0)) scoreCaps.push(55);
  const predictiveScore = Math.max(0, Math.min(...scoreCaps, rawPredictiveScore));
  const recoveryRequired = negativeWalletLock || forecastRows.some(row => row.expected < 0 || row.lower < 0) || runwayDays < 30;
  const recoveryMonthlyTarget = recoveryRequired ? Math.max(incomeShortfall + mandatoryGap, recoveryGap / 3, Math.abs(predictiveMonthlyNet < 0 ? predictiveMonthlyNet : 0)) : 0;
  const recoveryDailyTarget = recoveryMonthlyTarget / 30;
  const recoveryStage = negativeWalletLock ? "Saldo Recovery" : forecastRows.some(row => row.expected < 0 || row.lower < 0) ? "Runway Defense" : runwayDays < 30 ? "Cash Buffer Defense" : "No Recovery Lock";
  const predictiveLabel = negativeWalletLock ? "Recovery Mode" : predictiveScore >= 80 ? "Forecast Aman" : predictiveScore >= 65 ? "Forecast Stabil" : predictiveScore >= 45 ? "Forecast Waspada" : "Forecast Bahaya";
  const predictiveStage = negativeWalletLock ? "Cash Recovery Required" : predictiveScore >= 80 ? "Ready to Optimize" : predictiveScore >= 65 ? "Controlled" : predictiveScore >= 45 ? "Preventive Action" : "Immediate Recovery";
  const predictiveColor = predictiveScore >= 80 ? "#86efac" : predictiveScore >= 65 ? "#c7d2fe" : predictiveScore >= 45 ? "#fde68a" : "#fecaca";
  const predictiveBg = predictiveScore >= 80 ? "rgba(16,185,129,0.10)" : predictiveScore >= 65 ? "rgba(99,102,241,0.10)" : predictiveScore >= 45 ? "rgba(245,158,11,0.11)" : "rgba(239,68,68,0.12)";

  const actions = [];
  if (negativeWalletLock) actions.push(`Recovery saldo keluarga: pulihkan minimal ${formatRupiah(recoveryGap)} sebelum ekspansi, goal baru, atau investasi baru.`);
  if (forecastRows[0]?.expected < 0 || forecastRows[0]?.lower < 0) actions.push("Amankan 30 hari ke depan: kurangi expense non-wajib dan tambah cash-in cepat.");
  if (runwayDays < 30) actions.push("Runway kritis: lindungi wallet utama sebelum alokasi goal/investasi baru.");
  if (incomeShortfall > 0) actions.push(`Tutup shortfall income minimal ${formatRupiah(incomeShortfall)} bulan ini.`);
  if (mandatoryGap > 0) actions.push(`Goal wajib belum feasible: cari tambahan ${formatRupiah(mandatoryGap)} per bulan atau ubah deadline.`);
  if (trendLabel === "Deteriorating") actions.push("Trend cashflow memburuk: audit kategori expense terbesar 30 hari terakhir.");
  if (commitmentPressure > 0.75) actions.push("Komitmen bulanan terlalu menekan income; tahan ekspansi sampai coverage membaik.");
  if (safeLoan > 0 && safeDebtRatio >= 35) actions.push("Debt pressure mulai material; prioritaskan repayment atau restrukturisasi beban bunga/fee.");
  if (!actions.length) actions.push("Forecast aman: pertahankan cashflow, lanjutkan alokasi goal wajib, dan evaluasi peluang growth terbatas.");

  const primaryForecast = forecastRows[0] || { expected: safeWallet, lower: safeWallet, upper: safeWallet, risk: "Clear" };
  const recoveryNotice = recoveryRequired
    ? `${recoveryStage}: target recovery ${formatRupiah(recoveryMonthlyTarget)}/bulan atau ${formatRupiah(recoveryDailyTarget)}/hari.`
    : "Tidak ada recovery lock; lanjutkan optimasi bertahap.";
  const projectionNotice = `Predictive 7.1.5: ${predictiveLabel} · 30D ${formatRupiah(primaryForecast.expected)} · Runway ${runwayDays >= 999 ? "180+" : runwayDays} hari · ${actions[0]}`;

  return {
    predictiveScore,
    predictiveLabel,
    predictiveStage,
    predictiveColor,
    predictiveBg,
    projectionNotice,
    primaryAction: actions[0],
    actions,
    forecastRows,
    recentIncome,
    recentExpense,
    recentNetFlow,
    previousNetFlow,
    netFlowTrend,
    trendLabel,
    trendColor,
    monthlyCommitments,
    commitmentPressure,
    normalizedMonthlyIncome,
    normalizedMonthlyExpense,
    predictiveMonthlyNet,
    runwayDays,
    runwayLabel,
    recoveryRequired,
    recoveryGap,
    recoveryMonthlyTarget,
    recoveryDailyTarget,
    recoveryStage,
    recoveryNotice,
    volatilityRatio,
    transactionWindowCount: windowRows.length,
    noTrendData: windowRows.length < 3,
    ok: predictiveScore >= 65 && primaryForecast.expected >= 0 && runwayDays >= 60,
  };
}


function buildPredictiveActionPriorityEngine({
  healthEngine = {},
  decisionEngine = {},
  predictiveEngine = {},
  negativeWalletBreakdown = [],
  walletTotal = 0,
  netWorth = 0,
  loanTotal = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeLoan = Math.max(0, asEngineNumber(loanTotal));
  const safeDebtRatio = Math.max(0, asEngineNumber(debtRatio));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const safeSpendingDaily = Math.max(0, asEngineNumber(decisionEngine?.safeSpendingDaily));
  const recoveryMonthlyTarget = Math.max(0, asEngineNumber(predictiveEngine?.recoveryMonthlyTarget));
  const recoveryDailyTarget = Math.max(0, asEngineNumber(predictiveEngine?.recoveryDailyTarget));
  const runwayDays = asEngineNumber(predictiveEngine?.runwayDays);
  const trendLabel = String(predictiveEngine?.trendLabel || "Flat");
  const rows = [];
  const addRow = ({ key, label, action, reason, priority = 50, impact = 0, horizon = "30 hari", color = "#c7d2fe", lock = false }) => {
    if (!key || rows.some(row => row.key === key)) return;
    rows.push({ key, label, action, reason, priority: Math.max(0, Math.min(100, Math.round(priority))), impact: Math.max(0, asEngineNumber(impact)), horizon, color, lock });
  };

  if (safeWallet < 0) {
    const topWallet = (negativeWalletBreakdown || [])[0];
    addRow({
      key: "wallet-negative-recovery",
      label: "Pulihkan Wallet Negatif",
      action: topWallet ? `Prioritas koreksi ${topWallet.name || "wallet"}: ${formatFull(topWallet.walletBalance || 0)}.` : `Pulihkan saldo wallet minimal ${formatRupiah(Math.abs(safeWallet))}.`,
      reason: "Saldo wallet negatif mengunci status sehat dan forecast growth.",
      priority: 100,
      impact: Math.abs(safeWallet),
      horizon: "Hari ini",
      color: "#fecaca",
      lock: true,
    });
  }

  if (predictiveEngine?.recoveryRequired) {
    addRow({
      key: "predictive-recovery-lock",
      label: predictiveEngine?.recoveryStage || "Recovery Lock",
      action: predictiveEngine?.primaryAction || `Kejar recovery ${formatRupiah(recoveryMonthlyTarget)}/bulan.`,
      reason: predictiveEngine?.recoveryNotice || "Forecast 30/60/90 hari belum aman.",
      priority: safeWallet < 0 ? 96 : 92,
      impact: Math.max(recoveryMonthlyTarget, incomeShortfall, mandatoryGap),
      horizon: "0-30 hari",
      color: "#fecaca",
      lock: true,
    });
  }

  if (incomeShortfall > 0) {
    addRow({
      key: "income-shortfall",
      label: "Tutup Shortfall Income",
      action: `Tambahkan cash-in minimal ${formatRupiah(incomeShortfall)} bulan ini.`,
      reason: "Income belum menutup kebutuhan inti, reserve, dan tekanan recovery.",
      priority: 88,
      impact: incomeShortfall,
      horizon: "Bulan ini",
      color: "#fde68a",
      lock: true,
    });
  }

  if (mandatoryGap > 0) {
    addRow({
      key: "mandatory-goal-gap",
      label: "Goal Wajib Belum Feasible",
      action: `Cari tambahan ${formatRupiah(mandatoryGap)}/bulan atau ubah deadline goal wajib.`,
      reason: "Goal wajib tidak boleh dibaca aman jika funding plan belum cukup.",
      priority: 84,
      impact: mandatoryGap,
      horizon: "Bulan ini",
      color: "#fde68a",
      lock: true,
    });
  }

  if (safeSpendingDaily <= 0) {
    addRow({
      key: "spending-freeze",
      label: "Freeze Pengeluaran Non-Wajib",
      action: "Tahan belanja non-wajib sampai limit harian kembali positif.",
      reason: "Belanja aman harian sudah habis atau negatif.",
      priority: 82,
      impact: Math.max(incomeShortfall, mandatoryGap, recoveryDailyTarget * 30),
      horizon: "7 hari",
      color: "#fde68a",
      lock: true,
    });
  }

  if (runwayDays > 0 && runwayDays < 60) {
    addRow({
      key: "runway-defense",
      label: "Perkuat Runway",
      action: `Naikkan runway dari ${runwayDays} hari menuju minimal 60 hari.`,
      reason: "Runway pendek membuat forecast rentan terhadap expense tak terduga.",
      priority: runwayDays < 30 ? 86 : 72,
      impact: recoveryMonthlyTarget,
      horizon: "30-60 hari",
      color: runwayDays < 30 ? "#fecaca" : "#fde68a",
      lock: runwayDays < 30,
    });
  }

  if (trendLabel === "Deteriorating") {
    addRow({
      key: "cashflow-trend-audit",
      label: "Audit Cashflow Memburuk",
      action: "Review kategori expense terbesar 30 hari terakhir dan set batas belanja mingguan.",
      reason: "Trend net flow menurun dibanding periode sebelumnya.",
      priority: 70,
      impact: Math.max(0, asEngineNumber(predictiveEngine?.normalizedMonthlyExpense) * 0.10),
      horizon: "7-14 hari",
      color: "#fde68a",
    });
  }

  if (safeLoan > 0 && safeDebtRatio >= 35) {
    addRow({
      key: "debt-pressure-control",
      label: "Kontrol Debt Pressure",
      action: "Prioritaskan repayment, negosiasi tenor, atau kurangi fee/bunga sebelum ekspansi.",
      reason: `Debt ratio ${safeDebtRatio.toFixed(1)}% mulai menekan health score.`,
      priority: safeDebtRatio >= 65 ? 86 : 68,
      impact: safeLoan,
      horizon: "30-90 hari",
      color: safeDebtRatio >= 65 ? "#fecaca" : "#fde68a",
      lock: safeDebtRatio >= 65,
    });
  }

  if (healthScore < 60 || predictiveScore < 60 || safeNetWorth < 0) {
    addRow({
      key: "health-score-defense",
      label: "Defense Health Score",
      action: healthEngine?.primaryAction || predictiveEngine?.primaryAction || "Bersihkan guard utama sebelum menambah alokasi baru.",
      reason: "Health/predictive score belum cukup untuk mode growth.",
      priority: safeNetWorth < 0 ? 90 : 64,
      impact: Math.max(Math.abs(Math.min(0, safeNetWorth)), recoveryMonthlyTarget),
      horizon: "30 hari",
      color: safeNetWorth < 0 ? "#fecaca" : "#c7d2fe",
      lock: safeNetWorth < 0,
    });
  }

  if (!rows.length) {
    addRow({
      key: "controlled-growth",
      label: "Controlled Growth",
      action: "Forecast aman: lanjutkan goal wajib, simpan surplus, dan evaluasi peluang growth terbatas.",
      reason: "Tidak ada recovery lock mayor pada predictive engine.",
      priority: 42,
      impact: Math.max(0, asEngineNumber(decisionEngine?.incomeSurplus)),
      horizon: "30-90 hari",
      color: "#86efac",
    });
  }

  const actionRows = rows.sort((a, b) => b.priority - a.priority).slice(0, 5);
  const primaryAction = actionRows[0] || { label: "Locked", action: "Role tidak memiliki akses Financial Summary.", priority: 0, impact: 0, horizon: "-", color: "#94a3b8", lock: false };
  const blockerCount = actionRows.filter(row => row.lock || row.priority >= 80).length;
  const totalImpact = actionRows.reduce((sum, row) => sum + asEngineNumber(row.impact), 0);
  const monthlyActionTarget = Math.max(recoveryMonthlyTarget, incomeShortfall, mandatoryGap, actionRows[0]?.impact || 0);
  const actionStatus = blockerCount > 0 ? "Action Locked" : predictiveScore >= 80 && healthScore >= 70 ? "Optimize" : "Control";
  const actionColor = actionStatus === "Action Locked" ? "#fecaca" : actionStatus === "Optimize" ? "#86efac" : "#c7d2fe";
  const actionBg = actionStatus === "Action Locked" ? "rgba(239,68,68,0.11)" : actionStatus === "Optimize" ? "rgba(16,185,129,0.10)" : "rgba(99,102,241,0.10)";
  const actionNotice = `Action 7.1.5: ${actionStatus} · ${primaryAction.label} · target ${formatRupiah(monthlyActionTarget)}`;

  return {
    actionStatus,
    actionColor,
    actionBg,
    actionNotice,
    primaryAction: primaryAction.action,
    primaryLabel: primaryAction.label,
    primaryPriority: primaryAction.priority,
    actionRows,
    blockerCount,
    totalImpact,
    monthlyActionTarget,
    dailyActionTarget: monthlyActionTarget / 30,
    ok: blockerCount === 0 && predictiveScore >= 65 && healthScore >= 60,
  };
}


function buildPredictiveExecutionControlEngine({
  healthEngine = {},
  decisionEngine = {},
  predictiveEngine = {},
  actionEngine = {},
  walletTotal = 0,
  netWorth = 0,
  loanTotal = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeLoan = Math.max(0, asEngineNumber(loanTotal));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const blockerCount = Math.max(0, asEngineNumber(actionEngine?.blockerCount));
  const monthlyActionTarget = Math.max(0, asEngineNumber(actionEngine?.monthlyActionTarget));
  const dailyActionTarget = Math.max(0, asEngineNumber(actionEngine?.dailyActionTarget));
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const safeSpendingDaily = Math.max(0, asEngineNumber(decisionEngine?.safeSpendingDaily));
  const recoveryRequired = !!predictiveEngine?.recoveryRequired;
  const runwayDays = Math.max(0, asEngineNumber(predictiveEngine?.runwayDays));
  const actionRows = Array.isArray(actionEngine?.actionRows) ? actionEngine.actionRows : [];
  const lockRows = actionRows.filter(row => row?.lock || asEngineNumber(row?.priority) >= 80);
  const recoveryLock = safeWallet < 0 || recoveryRequired || blockerCount > 0;
  const growthLocked = recoveryLock || safeNetWorth < 0 || healthScore < 60 || predictiveScore < 65 || safeLoan > Math.max(0, safeWallet + Math.max(0, safeNetWorth));

  const executionPenalty =
    (safeWallet < 0 ? 28 : 0) +
    (safeNetWorth < 0 ? 18 : 0) +
    (recoveryRequired ? 20 : 0) +
    (blockerCount * 8) +
    (incomeShortfall > 0 ? 10 : 0) +
    (mandatoryGap > 0 ? 8 : 0) +
    (safeSpendingDaily <= 0 ? 8 : 0) +
    (runwayDays > 0 && runwayDays < 30 ? 10 : runwayDays < 60 ? 5 : 0);
  const scoreCap = safeWallet < 0 ? 42 : safeNetWorth < 0 ? 50 : recoveryRequired ? 62 : growthLocked ? 74 : 100;
  const executionScore = Math.max(0, Math.min(scoreCap, Math.round((healthScore * 0.25) + (predictiveScore * 0.35) + (asEngineNumber(actionEngine?.ok) ? 20 : 8) + 28 - executionPenalty)));
  const executionStatus = recoveryLock ? "Recovery Execution" : growthLocked ? "Control Execution" : "Growth Execution";
  const executionLabel = executionScore >= 80 ? "Execution Ready" : executionScore >= 60 ? "Controlled" : executionScore >= 40 ? "Recovery Control" : "Immediate Execution Lock";
  const executionColor = executionScore >= 80 ? "#86efac" : executionScore >= 60 ? "#c7d2fe" : executionScore >= 40 ? "#fde68a" : "#fecaca";
  const executionBg = executionScore >= 80 ? "rgba(16,185,129,0.10)" : executionScore >= 60 ? "rgba(99,102,241,0.10)" : executionScore >= 40 ? "rgba(245,158,11,0.11)" : "rgba(239,68,68,0.12)";
  const primaryRow = actionRows[0] || { label: "No Action", action: "Tidak ada action row aktif.", horizon: "-", priority: 0, color: "#94a3b8" };

  const todayAction = safeWallet < 0
    ? `Hari ini: koreksi wallet negatif atau input baseline saldo real. Target minimum ${formatRupiah(Math.max(Math.abs(safeWallet), dailyActionTarget))}.`
    : safeSpendingDaily <= 0
      ? "Hari ini: freeze pengeluaran non-wajib dan validasi transaksi yang membuat limit harian habis."
      : primaryRow.action || "Hari ini: jalankan action prioritas tertinggi.";
  const weekAction = incomeShortfall > 0
    ? `7 hari: cari tambahan cash-in minimal ${formatRupiah(incomeShortfall / 4)} per minggu.`
    : mandatoryGap > 0
      ? `7 hari: review deadline/funding goal wajib sebesar gap ${formatRupiah(mandatoryGap)} per bulan.`
      : recoveryRequired
        ? `7 hari: jaga recovery pace minimal ${formatRupiah(dailyActionTarget)} per hari.`
        : "7 hari: pertahankan cashflow positif dan monitor expense kategori terbesar.";
  const monthAction = monthlyActionTarget > 0
    ? `30 hari: capai target aksi ${formatRupiah(monthlyActionTarget)} sebelum ekspansi.`
    : growthLocked
      ? "30 hari: stabilkan health dan predictive score sebelum masuk growth mode."
      : "30 hari: alokasikan surplus secara terkendali ke goal prioritas atau reserve.";

  const executionRows = [
    { key: "today", label: "Hari Ini", action: todayAction, target: Math.max(dailyActionTarget, safeWallet < 0 ? Math.abs(safeWallet) : 0), color: safeWallet < 0 || safeSpendingDaily <= 0 ? "#fecaca" : executionColor },
    { key: "week", label: "7 Hari", action: weekAction, target: Math.max(dailyActionTarget * 7, incomeShortfall / 4, mandatoryGap / 4), color: recoveryRequired || incomeShortfall > 0 ? "#fde68a" : "#c7d2fe" },
    { key: "month", label: "30 Hari", action: monthAction, target: monthlyActionTarget, color: growthLocked ? "#fde68a" : "#86efac" },
  ];

  const forbiddenActions = [];
  if (growthLocked) forbiddenActions.push("Tunda investasi/goal baru yang tidak wajib.");
  if (safeSpendingDaily <= 0) forbiddenActions.push("Tunda pengeluaran non-wajib.");
  if (safeWallet < 0) forbiddenActions.push("Jangan baca saldo keluarga sebagai sehat sebelum baseline wallet pulih.");
  if (!forbiddenActions.length) forbiddenActions.push("Tidak ada hard stop mayor; tetap pakai limit belanja dan funding plan.");

  const executionNotice = `Execution 7.1.5: ${executionStatus} · ${primaryRow.label} · ${lockRows.length} lock · target ${formatRupiah(monthlyActionTarget)}`;

  return {
    executionStatus,
    executionLabel,
    executionScore,
    executionColor,
    executionBg,
    executionNotice,
    primaryAction: primaryRow.action,
    primaryLabel: primaryRow.label,
    executionRows,
    forbiddenActions,
    lockRows,
    lockCount: lockRows.length,
    monthlyExecutionTarget: monthlyActionTarget,
    dailyExecutionTarget: dailyActionTarget,
    growthLocked,
    recoveryLock,
    ok: !growthLocked && executionScore >= 65,
  };
}


function buildPredictiveCommandBriefEngine({
  healthEngine = {},
  decisionEngine = {},
  predictiveEngine = {},
  actionEngine = {},
  executionEngine = {},
  walletTotal = 0,
  netWorth = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const safeSpendingDaily = Math.max(0, asEngineNumber(decisionEngine?.safeSpendingDaily));
  const dailyIncomeTarget = Math.max(0, asEngineNumber(decisionEngine?.dailyIncomeTarget));
  const dailyExecutionTarget = Math.max(0, asEngineNumber(executionEngine?.dailyExecutionTarget));
  const recoveryDailyTarget = Math.max(0, asEngineNumber(predictiveEngine?.recoveryDailyTarget));
  const monthlyActionTarget = Math.max(0, asEngineNumber(actionEngine?.monthlyActionTarget));
  const blockerCount = Math.max(0, asEngineNumber(actionEngine?.blockerCount));
  const lockCount = Math.max(0, asEngineNumber(executionEngine?.lockCount));
  const recoveryRequired = !!predictiveEngine?.recoveryRequired || !!executionEngine?.recoveryLock || safeWallet < 0;
  const growthLocked = !!executionEngine?.growthLocked || safeNetWorth < 0 || blockerCount > 0;
  const executionRows = Array.isArray(executionEngine?.executionRows) ? executionEngine.executionRows : [];
  const forbiddenActions = Array.isArray(executionEngine?.forbiddenActions) ? executionEngine.forbiddenActions : [];
  const actionRows = Array.isArray(actionEngine?.actionRows) ? actionEngine.actionRows : [];
  const primaryExecution = executionRows[0]?.action || executionEngine?.primaryAction || actionEngine?.primaryAction || predictiveEngine?.primaryAction || healthEngine?.primaryAction || "Jalankan action prioritas tertinggi hari ini.";
  const dailyCashTarget = Math.max(dailyExecutionTarget, recoveryDailyTarget, dailyIncomeTarget);
  const commandPenalty =
    (safeWallet < 0 ? 24 : 0) +
    (safeNetWorth < 0 ? 16 : 0) +
    (recoveryRequired ? 18 : 0) +
    (growthLocked ? 12 : 0) +
    (blockerCount * 5) +
    (lockCount * 4) +
    (safeSpendingDaily <= 0 ? 8 : 0);
  const rawCommandScore = Math.round((healthScore * 0.25) + (predictiveScore * 0.30) + (executionScore * 0.35) + 14 - commandPenalty);
  const commandCap = Math.min(safeWallet < 0 ? 40 : 100, safeNetWorth < 0 ? 48 : 100, recoveryRequired ? 68 : 100, growthLocked ? 76 : 100);
  const commandScore = Math.max(0, Math.min(commandCap, rawCommandScore));
  const commandStatus = recoveryRequired ? "Recovery Command" : growthLocked ? "Control Command" : commandScore >= 80 ? "Growth Command" : "Stability Command";
  const commandLabel = commandScore >= 80 ? "Command Clear" : commandScore >= 60 ? "Command Controlled" : commandScore >= 40 ? "Command Watch" : "Command Lock";
  const commandColor = commandScore >= 80 ? "#86efac" : commandScore >= 60 ? "#c7d2fe" : commandScore >= 40 ? "#fde68a" : "#fecaca";
  const commandBg = commandScore >= 80 ? "rgba(16,185,129,0.10)" : commandScore >= 60 ? "rgba(99,102,241,0.10)" : commandScore >= 40 ? "rgba(245,158,11,0.11)" : "rgba(239,68,68,0.12)";

  const commandRows = [
    {
      key: "focus",
      label: "Fokus Hari Ini",
      value: primaryExecution,
      metric: dailyCashTarget > 0 ? formatRupiah(dailyCashTarget) : "Action",
      color: commandColor,
    },
    {
      key: "cash",
      label: recoveryRequired ? "Target Recovery" : "Target Cash",
      value: recoveryRequired
        ? `Kejar recovery minimal ${formatRupiah(dailyCashTarget)} hari ini sebelum ekspansi.`
        : `Jaga cash-in dan belanja aman; target income harian ${formatRupiah(dailyIncomeTarget)}.`,
      metric: formatRupiah(dailyCashTarget),
      color: recoveryRequired ? "#fecaca" : "#c7d2fe",
    },
    {
      key: "guardrail",
      label: "Guardrail",
      value: safeSpendingDaily <= 0
        ? "Freeze pengeluaran non-wajib sampai limit harian kembali positif."
        : `Batas belanja aman hari ini ${formatRupiah(safeSpendingDaily)}.`,
      metric: safeSpendingDaily > 0 ? formatRupiah(safeSpendingDaily) : "Freeze",
      color: safeSpendingDaily > 0 ? "#86efac" : "#fecaca",
    },
  ];

  const commandLocks = [];
  if (forbiddenActions.length) commandLocks.push(...forbiddenActions.slice(0, 3));
  if (actionRows.length > 0) commandLocks.push(...actionRows.filter(row => row?.lock).slice(0, 2).map(row => row.action));
  if (!commandLocks.length) commandLocks.push("Tidak ada command lock mayor; tetap eksekusi sesuai limit dan target harian.");

  const commandNotice = `Command 7.1.5: ${commandStatus} · score ${commandScore}/100 · ${blockerCount + lockCount} lock · target ${formatRupiah(monthlyActionTarget)}`;

  return {
    commandStatus,
    commandLabel,
    commandScore,
    commandColor,
    commandBg,
    commandNotice,
    commandRows,
    commandLocks,
    primaryCommand: commandRows[0]?.value || primaryExecution,
    dailyCashTarget,
    monthlyActionTarget,
    blockerCount,
    lockCount,
    recoveryRequired,
    growthLocked,
    ok: commandScore >= 65 && !recoveryRequired && !growthLocked,
  };
}

function buildPredictiveDecisionGateEngine({
  healthEngine = {},
  decisionEngine = {},
  predictiveEngine = {},
  actionEngine = {},
  executionEngine = {},
  commandEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const actionBlockers = Math.max(0, asEngineNumber(actionEngine?.blockerCount));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const commandScore = Math.max(0, Math.min(100, asEngineNumber(commandEngine?.commandScore)));
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const safeSpendingDaily = asEngineNumber(decisionEngine?.safeSpendingDaily);
  const recoveryRequired = !!predictiveEngine?.recoveryRequired || !!commandEngine?.recoveryRequired || safeWallet < 0;
  const growthLocked = !!executionEngine?.growthLocked || !!commandEngine?.growthLocked || safeNetWorth < 0 || safeDebtRatio >= 65;
  const commandLocks = Array.isArray(commandEngine?.commandLocks) ? commandEngine.commandLocks : [];
  const executionLocks = Array.isArray(executionEngine?.forbiddenActions) ? executionEngine.forbiddenActions : [];

  const gatePenalty =
    (safeWallet < 0 ? 24 : 0) +
    (safeNetWorth < 0 ? 18 : 0) +
    (safeDebtRatio >= 65 ? 16 : safeDebtRatio >= 45 ? 8 : 0) +
    (recoveryRequired ? 15 : 0) +
    (growthLocked ? 12 : 0) +
    (incomeShortfall > 0 ? 10 : 0) +
    (safeSpendingDaily <= 0 ? 8 : 0) +
    (actionBlockers * 5) +
    Math.min(12, commandLocks.length * 3) +
    Math.min(12, executionLocks.length * 3);
  const rawGateScore = Math.round((healthScore * 0.22) + (predictiveScore * 0.24) + (executionScore * 0.24) + (commandScore * 0.22) + 12 - gatePenalty);
  const gateCap = Math.min(
    safeWallet < 0 ? 38 : 100,
    safeNetWorth < 0 ? 44 : 100,
    safeDebtRatio >= 65 ? 58 : 100,
    recoveryRequired ? 64 : 100,
    growthLocked ? 72 : 100,
    safeSpendingDaily <= 0 ? 70 : 100
  );
  const gateScore = Math.max(0, Math.min(gateCap, rawGateScore));

  let gateDecision = "GO";
  let gateLabel = "Go Controlled";
  let gateStage = "Execute";
  if (safeWallet < 0 || safeNetWorth < 0 || recoveryRequired) {
    gateDecision = "RECOVERY";
    gateLabel = "Recovery Gate";
    gateStage = "Recover Before Expand";
  } else if (growthLocked || actionBlockers > 0 || gateScore < 55) {
    gateDecision = "HOLD";
    gateLabel = "Hold Gate";
    gateStage = "Control Before Growth";
  } else if (gateScore >= 80 && commandScore >= 75 && executionScore >= 70) {
    gateDecision = "GO";
    gateLabel = "Go Gate";
    gateStage = "Controlled Growth";
  }

  const gateColor = gateDecision === "GO" ? "#86efac" : gateDecision === "HOLD" ? "#fde68a" : "#fecaca";
  const gateBg = gateDecision === "GO" ? "rgba(16,185,129,0.10)" : gateDecision === "HOLD" ? "rgba(245,158,11,0.11)" : "rgba(239,68,68,0.12)";
  const nextAction = gateDecision === "RECOVERY"
    ? (actionEngine?.primaryAction || predictiveEngine?.primaryAction || "Tutup gap recovery wallet/net worth sebelum ekspansi.")
    : gateDecision === "HOLD"
      ? (executionEngine?.primaryAction || commandEngine?.primaryCommand || "Tahan ekspansi; selesaikan lock dan shortfall utama.")
      : (commandEngine?.primaryCommand || "Eksekusi command harian sesuai target dan guardrail.");

  const gateRows = [
    {
      key: "decision",
      label: "Gate Decision",
      value: `${gateDecision} · ${gateStage}`,
      metric: `${gateScore}/100`,
      color: gateColor,
    },
    {
      key: "next-action",
      label: "Next Action",
      value: nextAction,
      metric: gateDecision,
      color: gateColor,
    },
    {
      key: "allowance",
      label: "Allowed Move",
      value: gateDecision === "GO"
        ? "Boleh lanjut action income/growth yang tidak melanggar spending limit."
        : gateDecision === "HOLD"
          ? "Hanya action stabilisasi, cash-in, dan penyelesaian blocker."
          : "Hanya action recovery: cash-in, kurangi minus, freeze belanja non-wajib.",
      metric: gateDecision === "GO" ? "Controlled" : "Limited",
      color: gateColor,
    },
  ];

  const gateLocks = [];
  if (recoveryRequired) gateLocks.push("Recovery required before expansion.");
  if (growthLocked) gateLocks.push("Growth locked by execution/command guard.");
  if (incomeShortfall > 0) gateLocks.push("Income shortfall: " + formatRupiah(incomeShortfall));
  if (safeSpendingDaily <= 0) gateLocks.push("Daily spending guardrail is frozen.");
  if (actionBlockers > 0) gateLocks.push(`${actionBlockers} action blocker aktif.`);
  commandLocks.slice(0, 2).forEach(lock => gateLocks.push(lock));
  if (!gateLocks.length) gateLocks.push("Tidak ada decision gate lock mayor; tetap eksekusi dengan kontrol harian.");

  const gateNotice = `Decision Gate 7.1.5: ${gateLabel} · ${gateDecision} · score ${gateScore}/100 · ${gateLocks.length} lock`;

  return {
    gateDecision,
    gateLabel,
    gateStage,
    gateScore,
    gateColor,
    gateBg,
    gateNotice,
    gateRows,
    gateLocks,
    nextAction,
    recoveryRequired,
    growthLocked,
    incomeShortfall,
    safeSpendingDaily,
    actionBlockers,
    ok: gateDecision === "GO" && gateScore >= 65,
  };
}

function buildPredictiveGovernancePolicyEngine({
  healthEngine = {},
  decisionEngine = {},
  predictiveEngine = {},
  actionEngine = {},
  executionEngine = {},
  commandEngine = {},
  gateEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const commandScore = Math.max(0, Math.min(100, asEngineNumber(commandEngine?.commandScore)));
  const gateScore = Math.max(0, Math.min(100, asEngineNumber(gateEngine?.gateScore)));
  const gateDecision = String(gateEngine?.gateDecision || "LOCKED").toUpperCase();
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const safeSpendingDaily = asEngineNumber(decisionEngine?.safeSpendingDaily);
  const dailyCashTarget = Math.max(0, asEngineNumber(commandEngine?.dailyCashTarget), asEngineNumber(predictiveEngine?.recoveryDailyTarget), asEngineNumber(decisionEngine?.dailyIncomeTarget));
  const monthlyActionTarget = Math.max(0, asEngineNumber(actionEngine?.monthlyActionTarget), asEngineNumber(commandEngine?.monthlyActionTarget), asEngineNumber(executionEngine?.monthlyExecutionTarget));
  const recoveryRequired = !!gateEngine?.recoveryRequired || !!predictiveEngine?.recoveryRequired || safeWallet < 0;
  const growthLocked = !!gateEngine?.growthLocked || !!executionEngine?.growthLocked || !!commandEngine?.growthLocked || safeNetWorth < 0 || safeDebtRatio >= 65;
  const gateLocks = Array.isArray(gateEngine?.gateLocks) ? gateEngine.gateLocks : [];
  const commandLocks = Array.isArray(commandEngine?.commandLocks) ? commandEngine.commandLocks : [];
  const executionLocks = Array.isArray(executionEngine?.forbiddenActions) ? executionEngine.forbiddenActions : [];
  const actionRows = Array.isArray(actionEngine?.actionRows) ? actionEngine.actionRows : [];
  const lockCount = gateLocks.length + Math.max(0, asEngineNumber(actionEngine?.blockerCount)) + Math.max(0, asEngineNumber(executionEngine?.lockCount));

  const governancePenalty =
    (safeWallet < 0 ? 24 : 0) +
    (safeNetWorth < 0 ? 18 : 0) +
    (safeDebtRatio >= 65 ? 16 : safeDebtRatio >= 45 ? 8 : 0) +
    (recoveryRequired ? 16 : 0) +
    (growthLocked ? 12 : 0) +
    (incomeShortfall > 0 ? 10 : 0) +
    (safeSpendingDaily <= 0 ? 8 : 0) +
    Math.min(18, lockCount * 3);
  const governanceCap = Math.min(
    safeWallet < 0 ? 36 : 100,
    safeNetWorth < 0 ? 44 : 100,
    recoveryRequired ? 62 : 100,
    gateDecision === "HOLD" ? 72 : 100,
    gateDecision === "RECOVERY" ? 58 : 100,
    safeDebtRatio >= 65 ? 60 : 100
  );
  const rawGovernanceScore = Math.round((healthScore * 0.18) + (predictiveScore * 0.18) + (executionScore * 0.20) + (commandScore * 0.20) + (gateScore * 0.18) + (gateEngine?.ok ? 10 : 3) - governancePenalty);
  const governanceScore = Math.max(0, Math.min(governanceCap, rawGovernanceScore));

  let policyMode = "GROWTH_POLICY";
  let policyLabel = "Growth Policy";
  let policyStatus = "Controlled Growth Allowed";
  if (gateDecision === "RECOVERY" || recoveryRequired || safeWallet < 0 || safeNetWorth < 0) {
    policyMode = "RECOVERY_POLICY";
    policyLabel = "Recovery Policy";
    policyStatus = "Recovery Only";
  } else if (gateDecision === "HOLD" || growthLocked || governanceScore < 65) {
    policyMode = "CONTROL_POLICY";
    policyLabel = "Control Policy";
    policyStatus = "Hold Growth";
  }

  const policyColor = policyMode === "GROWTH_POLICY" ? "#86efac" : policyMode === "CONTROL_POLICY" ? "#fde68a" : "#fecaca";
  const policyBg = policyMode === "GROWTH_POLICY" ? "rgba(16,185,129,0.10)" : policyMode === "CONTROL_POLICY" ? "rgba(245,158,11,0.11)" : "rgba(239,68,68,0.12)";

  const allowedMoves = policyMode === "RECOVERY_POLICY"
    ? [
        "Tambah cash-in / income recovery.",
        "Koreksi baseline wallet yang negatif.",
        "Freeze belanja non-wajib sampai guardrail positif.",
      ]
    : policyMode === "CONTROL_POLICY"
      ? [
          "Selesaikan action blocker prioritas.",
          "Jaga limit belanja harian dan cashflow positif.",
          "Funding hanya ke goal wajib atau reserve.",
        ]
      : [
          "Lanjutkan action income dan goal prioritas.",
          "Alokasikan surplus secara bertahap.",
          "Evaluasi growth kecil tanpa melanggar guardrail.",
        ];

  const blockedMoves = [];
  if (policyMode !== "GROWTH_POLICY") blockedMoves.push("Jangan tambah goal/investasi non-wajib.");
  if (safeSpendingDaily <= 0) blockedMoves.push("Jangan tambah pengeluaran non-wajib hari ini.");
  if (safeWallet < 0) blockedMoves.push("Jangan baca wallet keluarga sebagai sehat sebelum minus dipulihkan.");
  if (safeDebtRatio >= 65) blockedMoves.push("Jangan tambah liability/pinjaman baru.");
  if (!blockedMoves.length) blockedMoves.push("Tidak ada hard block mayor; tetap pakai spending guardrail.");

  const governanceRows = [
    {
      key: "policy",
      label: "Policy Mode",
      value: `${policyMode.replace("_", " ")} · ${policyStatus}`,
      metric: `${governanceScore}/100`,
      color: policyColor,
    },
    {
      key: "cash-rule",
      label: "Cash Rule",
      value: dailyCashTarget > 0
        ? `Target cash/recovery harian minimal ${formatRupiah(dailyCashTarget)}.`
        : "Tidak ada target cash tambahan; jaga cashflow positif.",
      metric: dailyCashTarget > 0 ? formatRupiah(dailyCashTarget) : "Monitor",
      color: recoveryRequired ? "#fecaca" : "#c7d2fe",
    },
    {
      key: "monthly-rule",
      label: "Monthly Rule",
      value: monthlyActionTarget > 0
        ? `Selesaikan target aksi bulanan ${formatRupiah(monthlyActionTarget)} sebelum ekspansi.`
        : "Tidak ada monthly blocker mayor; lanjut kontrol rutin.",
      metric: monthlyActionTarget > 0 ? formatRupiah(monthlyActionTarget) : policyStatus,
      color: policyColor,
    },
  ];

  const governanceLocks = [...gateLocks.slice(0, 2), ...commandLocks.slice(0, 2), ...executionLocks.slice(0, 2)];
  if (actionRows.some(row => row?.lock)) governanceLocks.push("Action priority masih memiliki lock.");
  if (!governanceLocks.length) governanceLocks.push("Tidak ada governance lock mayor; policy tetap dikontrol harian.");

  const governanceNotice = `Governance 7.1.5: ${policyLabel} · ${policyStatus} · score ${governanceScore}/100 · ${governanceLocks.length} lock`;

  return {
    policyMode,
    policyLabel,
    policyStatus,
    governanceScore,
    policyColor,
    policyBg,
    governanceNotice,
    governanceRows,
    allowedMoves,
    blockedMoves,
    governanceLocks,
    dailyCashTarget,
    monthlyActionTarget,
    recoveryRequired,
    growthLocked,
    ok: policyMode === "GROWTH_POLICY" && governanceScore >= 70 && gateDecision === "GO",
  };
}





function buildPredictiveGovernanceComplianceEngine({
  healthEngine = {},
  decisionEngine = {},
  predictiveEngine = {},
  actionEngine = {},
  executionEngine = {},
  commandEngine = {},
  gateEngine = {},
  governanceEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const commandScore = Math.max(0, Math.min(100, asEngineNumber(commandEngine?.commandScore)));
  const gateScore = Math.max(0, Math.min(100, asEngineNumber(gateEngine?.gateScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || "LOCKED").toUpperCase();
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const safeSpendingDaily = asEngineNumber(decisionEngine?.safeSpendingDaily);
  const monthlyActionTarget = Math.max(0, asEngineNumber(governanceEngine?.monthlyActionTarget), asEngineNumber(actionEngine?.monthlyActionTarget));
  const dailyCashTarget = Math.max(0, asEngineNumber(governanceEngine?.dailyCashTarget), asEngineNumber(commandEngine?.dailyCashTarget), asEngineNumber(predictiveEngine?.recoveryDailyTarget));
  const recoveryRequired = !!governanceEngine?.recoveryRequired || !!gateEngine?.recoveryRequired || !!predictiveEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!governanceEngine?.growthLocked || !!gateEngine?.growthLocked || !!executionEngine?.growthLocked || !!commandEngine?.growthLocked;
  const allowedMoves = Array.isArray(governanceEngine?.allowedMoves) ? governanceEngine.allowedMoves : [];
  const blockedMoves = Array.isArray(governanceEngine?.blockedMoves) ? governanceEngine.blockedMoves : [];
  const governanceLocks = Array.isArray(governanceEngine?.governanceLocks) ? governanceEngine.governanceLocks : [];
  const gateLocks = Array.isArray(gateEngine?.gateLocks) ? gateEngine.gateLocks : [];
  const commandLocks = Array.isArray(commandEngine?.commandLocks) ? commandEngine.commandLocks : [];
  const forbiddenActions = Array.isArray(executionEngine?.forbiddenActions) ? executionEngine.forbiddenActions : [];
  const actionRows = Array.isArray(actionEngine?.actionRows) ? actionEngine.actionRows : [];
  const activeActionLocks = actionRows.filter(row => row?.lock || row?.type === "blocker" || row?.impact > 0).slice(0, 4);
  const hardBlockCount = blockedMoves.filter(row => !String(row || "").toLowerCase().includes("tidak ada hard block")).length;
  const lockCount = governanceLocks.length + gateLocks.length + commandLocks.length + forbiddenActions.length + activeActionLocks.length + hardBlockCount;

  const breachRows = [];
  if (policyMode === "RECOVERY_POLICY" && !recoveryRequired) breachRows.push("Recovery policy aktif tetapi recovery flag perlu direkonsiliasi.");
  if (policyMode !== "GROWTH_POLICY" && gateDecision === "GO") breachRows.push("Gate GO tidak boleh mengabaikan policy hold/recovery.");
  if (safeWallet < 0) breachRows.push("Wallet negatif: semua ekspansi otomatis non-compliant.");
  if (safeNetWorth < 0) breachRows.push("Net worth negatif: health label tidak boleh naik ke sehat.");
  if (safeDebtRatio >= 65) breachRows.push("Debt ratio tinggi: tambah liability/pinjaman baru diblokir.");
  if (safeSpendingDaily <= 0) breachRows.push("Daily spending guardrail nol/negatif: belanja non-wajib diblokir.");
  if (incomeShortfall > 0) breachRows.push("Income shortfall belum tertutup: fokus cash-in sebelum growth.");
  if (growthLocked) breachRows.push("Growth lock aktif dari execution/command/gate engine.");

  const compliancePenalty =
    (safeWallet < 0 ? 24 : 0) +
    (safeNetWorth < 0 ? 18 : 0) +
    (safeDebtRatio >= 65 ? 14 : safeDebtRatio >= 45 ? 7 : 0) +
    (safeSpendingDaily <= 0 ? 10 : 0) +
    (incomeShortfall > 0 ? 10 : 0) +
    (growthLocked ? 10 : 0) +
    Math.min(24, lockCount * 2) +
    Math.min(20, breachRows.length * 4);
  const rawComplianceScore = Math.round((healthScore * 0.12) + (predictiveScore * 0.14) + (executionScore * 0.16) + (commandScore * 0.16) + (gateScore * 0.18) + (governanceScore * 0.24) - compliancePenalty + 8);
  const complianceCap = Math.min(
    safeWallet < 0 ? 34 : 100,
    safeNetWorth < 0 ? 42 : 100,
    recoveryRequired ? 58 : 100,
    policyMode === "RECOVERY_POLICY" ? 55 : 100,
    policyMode === "CONTROL_POLICY" ? 72 : 100,
    gateDecision === "RECOVERY" ? 55 : 100,
    gateDecision === "HOLD" ? 72 : 100,
    safeDebtRatio >= 65 ? 62 : 100
  );
  const complianceScore = Math.max(0, Math.min(complianceCap, rawComplianceScore));

  let complianceStatus = "COMPLIANT";
  let complianceLabel = "Compliant";
  let complianceStage = "Policy Aligned";
  if (policyMode === "LOCKED" || gateDecision === "LOCKED") {
    complianceStatus = "LOCKED";
    complianceLabel = "Locked";
    complianceStage = "No Access";
  } else if (recoveryRequired || complianceScore < 45 || breachRows.length >= 3) {
    complianceStatus = "BREACH";
    complianceLabel = "Compliance Breach";
    complianceStage = "Correct Before Continue";
  } else if (growthLocked || complianceScore < 70 || breachRows.length > 0) {
    complianceStatus = "WATCH";
    complianceLabel = "Compliance Watch";
    complianceStage = "Controlled Execution";
  }

  const complianceColor = complianceStatus === "COMPLIANT" ? "#86efac" : complianceStatus === "WATCH" ? "#fde68a" : complianceStatus === "BREACH" ? "#fecaca" : "#94a3b8";
  const complianceBg = complianceStatus === "COMPLIANT" ? "rgba(16,185,129,0.10)" : complianceStatus === "WATCH" ? "rgba(245,158,11,0.11)" : complianceStatus === "BREACH" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const primaryCorrection = complianceStatus === "BREACH"
    ? (breachRows[0] || blockedMoves[0] || "Pulihkan policy breach sebelum melanjutkan.")
    : complianceStatus === "WATCH"
      ? (governanceLocks[0] || gateLocks[0] || commandLocks[0] || "Eksekusi hanya action yang diizinkan policy.")
      : (allowedMoves[0] || "Policy compliant: lanjutkan command harian dengan guardrail.");

  const complianceRows = [
    {
      key: "policy-alignment",
      label: "Policy Alignment",
      value: `${policyMode.replace("_", " ")} · ${gateDecision}`,
      metric: `${complianceScore}/100`,
      color: complianceColor,
    },
    {
      key: "breach-control",
      label: "Breach Control",
      value: breachRows.length > 0 ? breachRows[0] : "Tidak ada breach mayor dari policy stack.",
      metric: breachRows.length > 0 ? `${breachRows.length} breach` : "Clear",
      color: breachRows.length > 0 ? "#fecaca" : "#86efac",
    },
    {
      key: "next-correction",
      label: "Next Correction",
      value: primaryCorrection,
      metric: dailyCashTarget > 0 ? formatRupiah(dailyCashTarget) : complianceStatus,
      color: complianceColor,
    },
  ];

  const complianceLocks = [...breachRows.slice(0, 2), ...governanceLocks.slice(0, 2), ...gateLocks.slice(0, 1), ...forbiddenActions.slice(0, 1)];
  if (!complianceLocks.length) complianceLocks.push("Compliance clear: tetap gunakan allowed moves dan blocked moves sebagai guardrail.");
  const complianceNotice = `Compliance 7.1.5: ${complianceLabel} · ${complianceStage} · score ${complianceScore}/100 · ${complianceLocks.length} lock`;

  return {
    complianceStatus,
    complianceLabel,
    complianceStage,
    complianceScore,
    complianceColor,
    complianceBg,
    complianceNotice,
    complianceRows,
    breachRows,
    complianceLocks,
    primaryCorrection,
    monthlyActionTarget,
    dailyCashTarget,
    allowedMoves,
    blockedMoves,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: complianceStatus === "COMPLIANT" && complianceScore >= 70 && breachRows.length === 0,
  };
}


function buildPredictiveCfoAdvisoryEngine({
  healthEngine = {},
  decisionEngine = {},
  predictiveEngine = {},
  actionEngine = {},
  executionEngine = {},
  commandEngine = {},
  gateEngine = {},
  governanceEngine = {},
  complianceEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const actionPriority = Math.max(0, Math.min(100, asEngineNumber(actionEngine?.primaryPriority)));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const commandScore = Math.max(0, Math.min(100, asEngineNumber(commandEngine?.commandScore)));
  const gateScore = Math.max(0, Math.min(100, asEngineNumber(gateEngine?.gateScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const gateDecision = String(gateEngine?.gateDecision || complianceEngine?.gateDecision || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || complianceEngine?.policyMode || "LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const recoveryRequired = !!predictiveEngine?.recoveryRequired || !!gateEngine?.recoveryRequired || !!governanceEngine?.recoveryRequired || !!complianceEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!executionEngine?.growthLocked || !!commandEngine?.growthLocked || !!gateEngine?.growthLocked || !!governanceEngine?.growthLocked || !!complianceEngine?.growthLocked;
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const safeSpendingDaily = asEngineNumber(decisionEngine?.safeSpendingDaily);
  const dailyCashTarget = Math.max(0, asEngineNumber(commandEngine?.dailyCashTarget), asEngineNumber(governanceEngine?.dailyCashTarget), asEngineNumber(complianceEngine?.dailyCashTarget), asEngineNumber(predictiveEngine?.recoveryDailyTarget));
  const monthlyActionTarget = Math.max(0, asEngineNumber(actionEngine?.monthlyActionTarget), asEngineNumber(governanceEngine?.monthlyActionTarget), asEngineNumber(complianceEngine?.monthlyActionTarget), asEngineNumber(executionEngine?.monthlyExecutionTarget));
  const breachRows = Array.isArray(complianceEngine?.breachRows) ? complianceEngine.breachRows : [];
  const complianceLocks = Array.isArray(complianceEngine?.complianceLocks) ? complianceEngine.complianceLocks : [];
  const blockedMoves = Array.isArray(governanceEngine?.blockedMoves) ? governanceEngine.blockedMoves : [];
  const allowedMoves = Array.isArray(governanceEngine?.allowedMoves) ? governanceEngine.allowedMoves : [];
  const commandRows = Array.isArray(commandEngine?.commandRows) ? commandEngine.commandRows : [];
  const actionRows = Array.isArray(actionEngine?.actionRows) ? actionEngine.actionRows : [];
  const forecastRows = Array.isArray(predictiveEngine?.forecastRows) ? predictiveEngine.forecastRows : [];
  const forecastRiskCount = forecastRows.filter(row => ["High", "Medium", "Watch"].includes(String(row?.risk || ""))).length;

  const stackPenalty =
    (safeWallet < 0 ? 24 : 0) +
    (safeNetWorth < 0 ? 18 : 0) +
    (safeDebtRatio >= 65 ? 12 : safeDebtRatio >= 45 ? 7 : 0) +
    (recoveryRequired ? 16 : 0) +
    (growthLocked ? 10 : 0) +
    (complianceStatus === "BREACH" ? 18 : complianceStatus === "WATCH" ? 8 : complianceStatus === "LOCKED" ? 30 : 0) +
    (gateDecision === "RECOVERY" ? 12 : gateDecision === "HOLD" ? 7 : gateDecision === "LOCKED" ? 20 : 0) +
    (policyMode === "RECOVERY_POLICY" ? 12 : policyMode === "CONTROL_POLICY" ? 6 : policyMode === "LOCKED" ? 16 : 0) +
    (incomeShortfall > 0 ? 8 : 0) +
    (mandatoryGap > 0 ? 8 : 0) +
    (safeSpendingDaily <= 0 ? 8 : 0) +
    Math.min(15, breachRows.length * 3) +
    Math.min(10, forecastRiskCount * 3);

  const weightedBase = Math.round(
    (healthScore * 0.10) +
    (predictiveScore * 0.14) +
    (Math.min(100, actionPriority) * 0.10) +
    (executionScore * 0.14) +
    (commandScore * 0.14) +
    (gateScore * 0.14) +
    (governanceScore * 0.12) +
    (complianceScore * 0.12)
  );
  const advisoryCap = Math.min(
    safeWallet < 0 ? 35 : 100,
    safeNetWorth < 0 ? 42 : 100,
    recoveryRequired ? 58 : 100,
    complianceStatus === "BREACH" ? 55 : 100,
    complianceStatus === "WATCH" ? 72 : 100,
    gateDecision === "RECOVERY" ? 55 : 100,
    gateDecision === "HOLD" ? 72 : 100,
    policyMode === "RECOVERY_POLICY" ? 56 : 100,
    policyMode === "CONTROL_POLICY" ? 74 : 100
  );
  const advisoryScore = Math.max(0, Math.min(advisoryCap, weightedBase - stackPenalty + 18));

  let advisoryStatus = "CFO_GROWTH";
  let advisoryLabel = "CFO Growth Ready";
  let advisoryStage = "Controlled Growth";
  if (complianceStatus === "LOCKED" || gateDecision === "LOCKED" || policyMode === "LOCKED") {
    advisoryStatus = "CFO_LOCKED";
    advisoryLabel = "CFO Locked";
    advisoryStage = "Access / Policy Locked";
  } else if (recoveryRequired || complianceStatus === "BREACH" || gateDecision === "RECOVERY" || advisoryScore < 45) {
    advisoryStatus = "CFO_RECOVERY";
    advisoryLabel = "CFO Recovery";
    advisoryStage = "Cash Recovery First";
  } else if (growthLocked || complianceStatus === "WATCH" || gateDecision === "HOLD" || advisoryScore < 70) {
    advisoryStatus = "CFO_CONTROL";
    advisoryLabel = "CFO Control";
    advisoryStage = "Hold Growth / Execute Priority";
  }

  const advisoryColor = advisoryStatus === "CFO_GROWTH" ? "#86efac" : advisoryStatus === "CFO_CONTROL" ? "#fde68a" : advisoryStatus === "CFO_RECOVERY" ? "#fecaca" : "#94a3b8";
  const advisoryBg = advisoryStatus === "CFO_GROWTH" ? "rgba(16,185,129,0.10)" : advisoryStatus === "CFO_CONTROL" ? "rgba(245,158,11,0.11)" : advisoryStatus === "CFO_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";

  const doNow = [];
  if (safeWallet < 0) doNow.push(`Pulihkan saldo wallet negatif minimal ${formatRupiah(Math.abs(safeWallet))}.`);
  if (incomeShortfall > 0) doNow.push(`Tutup income shortfall ${formatRupiah(incomeShortfall)} bulan ini.`);
  if (mandatoryGap > 0) doNow.push(`Amankan mandatory goal gap ${formatRupiah(mandatoryGap)}.`);
  if (dailyCashTarget > 0) doNow.push(`Kejar target cash harian ${formatRupiah(dailyCashTarget)}.`);
  if (!doNow.length && commandRows[0]?.value) doNow.push(commandRows[0].value);
  if (!doNow.length && actionRows[0]?.action) doNow.push(actionRows[0].action);
  if (!doNow.length) doNow.push("Jaga cashflow positif dan ikuti command harian yang sudah compliant.");

  const doNext = [];
  if (monthlyActionTarget > 0) doNext.push(`Selesaikan target aksi bulanan ${formatRupiah(monthlyActionTarget)} sebelum ekspansi.`);
  if (allowedMoves[0]) doNext.push(allowedMoves[0]);
  if (forecastRows[0]) doNext.push(`Pantau forecast ${forecastRows[0].label}: ${forecastRows[0].risk}.`);
  if (!doNext.length) doNext.push("Review ulang goal wajib dan alokasi surplus setelah guardrail tetap hijau.");

  const doNot = [];
  if (blockedMoves[0]) doNot.push(blockedMoves[0]);
  if (growthLocked) doNot.push("Jangan lanjut growth sebelum lock dari gate/command/execution clear.");
  if (safeSpendingDaily <= 0) doNot.push("Jangan tambah belanja non-wajib hari ini.");
  if (!doNot.length) doNot.push("Jangan mengubah baseline atau policy tanpa audit wallet/ledger.");

  const cfoRows = [
    {
      key: "cfo-decision",
      label: "CFO Decision",
      value: `${advisoryLabel} · ${advisoryStage}`,
      metric: `${advisoryScore}/100`,
      color: advisoryColor,
    },
    {
      key: "cfo-do-now",
      label: "Do Now",
      value: doNow[0],
      metric: dailyCashTarget > 0 ? formatRupiah(dailyCashTarget) : gateDecision,
      color: advisoryStatus === "CFO_RECOVERY" ? "#fecaca" : advisoryColor,
    },
    {
      key: "cfo-do-next",
      label: "Do Next",
      value: doNext[0],
      metric: monthlyActionTarget > 0 ? formatRupiah(monthlyActionTarget) : complianceStatus,
      color: advisoryColor,
    },
  ];

  const advisoryLocks = [...breachRows.slice(0, 2), ...complianceLocks.slice(0, 2), ...doNot.slice(0, 2)];
  if (!advisoryLocks.length) advisoryLocks.push("CFO advisory clear: eksekusi command harian dengan guardrail.");
  const cfoMemo = `${advisoryLabel}: ${doNow[0]} Next: ${doNext[0]} Guardrail: ${doNot[0]}`;
  const advisoryNotice = `CFO Advisory 7.1.5: ${advisoryLabel} · ${advisoryStage} · score ${advisoryScore}/100`;

  return {
    advisoryStatus,
    advisoryLabel,
    advisoryStage,
    advisoryScore,
    advisoryColor,
    advisoryBg,
    advisoryNotice,
    cfoMemo,
    cfoRows,
    doNow,
    doNext,
    doNot,
    advisoryLocks,
    dailyCashTarget,
    monthlyActionTarget,
    gateDecision,
    policyMode,
    complianceStatus,
    recoveryRequired,
    growthLocked,
    ok: advisoryStatus === "CFO_GROWTH" && advisoryScore >= 70 && !recoveryRequired && !growthLocked,
  };
}


function buildPredictiveOperatingRhythmEngine({
  cfoEngine = {},
  commandEngine = {},
  actionEngine = {},
  executionEngine = {},
  governanceEngine = {},
  complianceEngine = {},
  predictiveEngine = {},
  decisionEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const commandScore = Math.max(0, Math.min(100, asEngineNumber(commandEngine?.commandScore)));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const actionPriority = Math.max(0, Math.min(100, asEngineNumber(actionEngine?.primaryPriority)));
  const advisoryStatus = String(cfoEngine?.advisoryStatus || "CFO_LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || cfoEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || cfoEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(cfoEngine?.gateDecision || commandEngine?.gateDecision || "LOCKED").toUpperCase();
  const recoveryRequired = !!cfoEngine?.recoveryRequired || !!predictiveEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!cfoEngine?.growthLocked || !!executionEngine?.growthLocked || !!commandEngine?.growthLocked;
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const dailyCashTarget = Math.max(0, asEngineNumber(cfoEngine?.dailyCashTarget), asEngineNumber(commandEngine?.dailyCashTarget), asEngineNumber(governanceEngine?.dailyCashTarget), asEngineNumber(predictiveEngine?.recoveryDailyTarget));
  const monthlyActionTarget = Math.max(0, asEngineNumber(cfoEngine?.monthlyActionTarget), asEngineNumber(actionEngine?.monthlyActionTarget), asEngineNumber(executionEngine?.monthlyExecutionTarget), asEngineNumber(governanceEngine?.monthlyActionTarget));
  const complianceLocks = Array.isArray(complianceEngine?.complianceLocks) ? complianceEngine.complianceLocks : [];
  const advisoryLocks = Array.isArray(cfoEngine?.advisoryLocks) ? cfoEngine.advisoryLocks : [];
  const blockedMoves = Array.isArray(governanceEngine?.blockedMoves) ? governanceEngine.blockedMoves : [];
  const allowedMoves = Array.isArray(governanceEngine?.allowedMoves) ? governanceEngine.allowedMoves : [];
  const doNow = Array.isArray(cfoEngine?.doNow) ? cfoEngine.doNow : [];
  const doNext = Array.isArray(cfoEngine?.doNext) ? cfoEngine.doNext : [];
  const doNot = Array.isArray(cfoEngine?.doNot) ? cfoEngine.doNot : [];

  const weightedBase = Math.round(
    (advisoryScore * 0.22) +
    (commandScore * 0.16) +
    (executionScore * 0.16) +
    (complianceScore * 0.15) +
    (governanceScore * 0.12) +
    (predictiveScore * 0.11) +
    (Math.min(100, actionPriority) * 0.08)
  );

  const rhythmPenalty =
    (safeWallet < 0 ? 18 : 0) +
    (safeNetWorth < 0 ? 16 : 0) +
    (safeDebtRatio >= 65 ? 10 : safeDebtRatio >= 45 ? 6 : 0) +
    (recoveryRequired ? 14 : 0) +
    (growthLocked ? 9 : 0) +
    (incomeShortfall > 0 ? 7 : 0) +
    (mandatoryGap > 0 ? 7 : 0) +
    (complianceStatus === "BREACH" ? 14 : complianceStatus === "WATCH" ? 7 : complianceStatus === "LOCKED" ? 24 : 0) +
    (advisoryStatus === "CFO_LOCKED" ? 24 : advisoryStatus === "CFO_RECOVERY" ? 12 : advisoryStatus === "CFO_CONTROL" ? 6 : 0) +
    Math.min(12, complianceLocks.length * 2) +
    Math.min(10, blockedMoves.length * 2);

  const rhythmCap = Math.min(
    safeWallet < 0 ? 38 : 100,
    safeNetWorth < 0 ? 44 : 100,
    recoveryRequired ? 60 : 100,
    advisoryStatus === "CFO_LOCKED" ? 25 : 100,
    advisoryStatus === "CFO_RECOVERY" ? 58 : 100,
    advisoryStatus === "CFO_CONTROL" ? 76 : 100,
    complianceStatus === "BREACH" ? 55 : 100,
    complianceStatus === "WATCH" ? 74 : 100,
    policyMode === "RECOVERY_POLICY" ? 58 : 100,
    gateDecision === "RECOVERY" ? 58 : 100,
    gateDecision === "HOLD" ? 76 : 100
  );
  const rhythmScore = Math.max(0, Math.min(rhythmCap, weightedBase - rhythmPenalty + 16));

  let rhythmStatus = "RHYTHM_GROWTH";
  let rhythmLabel = "Growth Rhythm";
  let rhythmStage = "Weekly Growth Review";
  let meetingMode = "Weekly CFO Review";
  if (advisoryStatus === "CFO_LOCKED" || complianceStatus === "LOCKED") {
    rhythmStatus = "RHYTHM_LOCKED";
    rhythmLabel = "Rhythm Locked";
    rhythmStage = "Access / Policy Locked";
    meetingMode = "Owner Review Required";
  } else if (recoveryRequired || advisoryStatus === "CFO_RECOVERY" || rhythmScore < 45) {
    rhythmStatus = "RHYTHM_RECOVERY";
    rhythmLabel = "Recovery Rhythm";
    rhythmStage = "Daily Cash Recovery";
    meetingMode = "Daily CFO Recovery Check";
  } else if (growthLocked || advisoryStatus === "CFO_CONTROL" || complianceStatus === "WATCH" || rhythmScore < 70) {
    rhythmStatus = "RHYTHM_CONTROL";
    rhythmLabel = "Control Rhythm";
    rhythmStage = "Daily Guardrail + Weekly Control";
    meetingMode = "Weekly Control Review";
  }

  const rhythmColor = rhythmStatus === "RHYTHM_GROWTH" ? "#86efac" : rhythmStatus === "RHYTHM_CONTROL" ? "#fde68a" : rhythmStatus === "RHYTHM_RECOVERY" ? "#fecaca" : "#94a3b8";
  const rhythmBg = rhythmStatus === "RHYTHM_GROWTH" ? "rgba(16,185,129,0.10)" : rhythmStatus === "RHYTHM_CONTROL" ? "rgba(245,158,11,0.11)" : rhythmStatus === "RHYTHM_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";

  const dailyRhythm = [];
  if (dailyCashTarget > 0) dailyRhythm.push(`Daily cash target: ${formatRupiah(dailyCashTarget)}.`);
  if (doNow[0]) dailyRhythm.push(`Execute: ${doNow[0]}`);
  if (complianceLocks[0]) dailyRhythm.push(`Clear lock: ${complianceLocks[0]}`);
  if (!dailyRhythm.length) dailyRhythm.push("Daily check: input transaksi, cek wallet, dan pastikan tidak ada leakage cashflow.");

  const weeklyRhythm = [];
  if (monthlyActionTarget > 0) weeklyRhythm.push(`Weekly target pace: ${formatRupiah(Math.ceil(monthlyActionTarget / 4))}.`);
  if (doNext[0]) weeklyRhythm.push(`Review next: ${doNext[0]}`);
  if (allowedMoves[0]) weeklyRhythm.push(`Allowed move: ${allowedMoves[0]}`);
  if (!weeklyRhythm.length) weeklyRhythm.push("Weekly review: cek forecast, goal wajib, dan net worth movement.");

  const monthlyRhythm = [];
  if (monthlyActionTarget > 0) monthlyRhythm.push(`Monthly close target: ${formatRupiah(monthlyActionTarget)}.`);
  if (incomeShortfall > 0) monthlyRhythm.push(`Close income shortfall: ${formatRupiah(incomeShortfall)}.`);
  if (mandatoryGap > 0) monthlyRhythm.push(`Secure mandatory goal gap: ${formatRupiah(mandatoryGap)}.`);
  if (!monthlyRhythm.length) monthlyRhythm.push("Monthly close: freeze baseline, audit backup, dan review policy sebelum growth.");

  const rhythmRows = [
    {
      key: "rhythm-daily",
      label: "Daily Rhythm",
      value: dailyRhythm[0],
      metric: dailyCashTarget > 0 ? formatRupiah(dailyCashTarget) : rhythmStatus,
      color: rhythmColor,
    },
    {
      key: "rhythm-weekly",
      label: "Weekly Rhythm",
      value: weeklyRhythm[0],
      metric: meetingMode,
      color: rhythmColor,
    },
    {
      key: "rhythm-monthly",
      label: "Monthly Close",
      value: monthlyRhythm[0],
      metric: monthlyActionTarget > 0 ? formatRupiah(monthlyActionTarget) : policyMode,
      color: rhythmColor,
    },
  ];

  const reviewLocks = [...advisoryLocks.slice(0, 2), ...complianceLocks.slice(0, 2), ...blockedMoves.slice(0, 2), ...doNot.slice(0, 1)];
  if (!reviewLocks.length) reviewLocks.push("Operating rhythm clear: jalankan daily/weekly/monthly cadence tanpa ekspansi liar.");
  const operatingCadence = `${rhythmLabel}: Daily = ${dailyRhythm[0]} Weekly = ${weeklyRhythm[0]} Monthly = ${monthlyRhythm[0]}`;
  const rhythmNotice = `Operating Rhythm 7.1.5: ${rhythmLabel} · ${rhythmStage} · score ${rhythmScore}/100`;

  return {
    rhythmStatus,
    rhythmLabel,
    rhythmStage,
    rhythmScore,
    rhythmColor,
    rhythmBg,
    rhythmNotice,
    operatingCadence,
    meetingMode,
    rhythmRows,
    dailyRhythm,
    weeklyRhythm,
    monthlyRhythm,
    reviewLocks,
    dailyCashTarget,
    monthlyActionTarget,
    advisoryStatus,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: rhythmStatus === "RHYTHM_GROWTH" && rhythmScore >= 70 && !recoveryRequired && !growthLocked,
  };
}



function buildPredictivePhaseClosureEngine({
  rhythmEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  commandEngine = {},
  executionEngine = {},
  actionEngine = {},
  predictiveEngine = {},
  healthEngine = {},
  decisionEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const rhythmScore = Math.max(0, Math.min(100, asEngineNumber(rhythmEngine?.rhythmScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const commandScore = Math.max(0, Math.min(100, asEngineNumber(commandEngine?.commandScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.score ?? healthEngine?.healthScore)));
  const actionPriority = Math.max(0, Math.min(100, asEngineNumber(actionEngine?.primaryPriority)));
  const rhythmStatus = String(rhythmEngine?.rhythmStatus || "RHYTHM_LOCKED").toUpperCase();
  const advisoryStatus = String(cfoEngine?.advisoryStatus || "CFO_LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || cfoEngine?.gateDecision || "LOCKED").toUpperCase();
  const recoveryRequired = !!rhythmEngine?.recoveryRequired || !!cfoEngine?.recoveryRequired || !!predictiveEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!rhythmEngine?.growthLocked || !!cfoEngine?.growthLocked || !!executionEngine?.growthLocked || !!commandEngine?.growthLocked;
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const monthlyActionTarget = Math.max(0, asEngineNumber(rhythmEngine?.monthlyActionTarget), asEngineNumber(cfoEngine?.monthlyActionTarget), asEngineNumber(actionEngine?.monthlyActionTarget));
  const dailyCashTarget = Math.max(0, asEngineNumber(rhythmEngine?.dailyCashTarget), asEngineNumber(cfoEngine?.dailyCashTarget), asEngineNumber(commandEngine?.dailyCashTarget));
  const reviewLocks = Array.isArray(rhythmEngine?.reviewLocks) ? rhythmEngine.reviewLocks : [];
  const advisoryLocks = Array.isArray(cfoEngine?.advisoryLocks) ? cfoEngine.advisoryLocks : [];
  const complianceLocks = Array.isArray(complianceEngine?.complianceLocks) ? complianceEngine.complianceLocks : [];
  const blockedMoves = Array.isArray(governanceEngine?.blockedMoves) ? governanceEngine.blockedMoves : [];
  const doNot = Array.isArray(cfoEngine?.doNot) ? cfoEngine.doNot : [];
  const weightedBase = Math.round(
    (rhythmScore * 0.20) +
    (advisoryScore * 0.18) +
    (complianceScore * 0.15) +
    (governanceScore * 0.13) +
    (executionScore * 0.12) +
    (commandScore * 0.10) +
    (predictiveScore * 0.08) +
    (healthScore * 0.04)
  );
  const closurePenalty =
    (safeWallet < 0 ? 18 : 0) +
    (safeNetWorth < 0 ? 18 : 0) +
    (safeDebtRatio >= 65 ? 10 : safeDebtRatio >= 45 ? 6 : 0) +
    (recoveryRequired ? 16 : 0) +
    (growthLocked ? 10 : 0) +
    (incomeShortfall > 0 ? 8 : 0) +
    (mandatoryGap > 0 ? 8 : 0) +
    (advisoryStatus === "CFO_LOCKED" ? 26 : advisoryStatus === "CFO_RECOVERY" ? 14 : advisoryStatus === "CFO_CONTROL" ? 7 : 0) +
    (complianceStatus === "LOCKED" ? 24 : complianceStatus === "BREACH" ? 16 : complianceStatus === "WATCH" ? 8 : 0) +
    (rhythmStatus === "RHYTHM_LOCKED" ? 22 : rhythmStatus === "RHYTHM_RECOVERY" ? 12 : rhythmStatus === "RHYTHM_CONTROL" ? 6 : 0) +
    Math.min(14, (reviewLocks.length + advisoryLocks.length + complianceLocks.length) * 2) +
    Math.min(10, blockedMoves.length * 2);
  const closureCap = Math.min(
    safeWallet < 0 ? 40 : 100,
    safeNetWorth < 0 ? 44 : 100,
    recoveryRequired ? 58 : 100,
    complianceStatus === "LOCKED" ? 25 : complianceStatus === "BREACH" ? 52 : complianceStatus === "WATCH" ? 72 : 100,
    advisoryStatus === "CFO_LOCKED" ? 25 : advisoryStatus === "CFO_RECOVERY" ? 56 : advisoryStatus === "CFO_CONTROL" ? 76 : 100,
    rhythmStatus === "RHYTHM_LOCKED" ? 28 : rhythmStatus === "RHYTHM_RECOVERY" ? 58 : rhythmStatus === "RHYTHM_CONTROL" ? 76 : 100,
    gateDecision === "RECOVERY" ? 58 : gateDecision === "HOLD" ? 76 : 100,
    policyMode === "RECOVERY_POLICY" ? 58 : policyMode === "CONTROL_POLICY" ? 78 : 100
  );
  const closureScore = Math.max(0, Math.min(closureCap, weightedBase - closurePenalty + 18));
  let closureStatus = "PHASE_READY";
  let closureLabel = "Phase Ready";
  let nextPhaseGate = "READY_FOR_7_1";
  let closureStage = "Close 7.0 and prepare 7.1";
  if (complianceStatus === "LOCKED" || advisoryStatus === "CFO_LOCKED" || rhythmStatus === "RHYTHM_LOCKED") {
    closureStatus = "PHASE_LOCKED";
    closureLabel = "Phase Locked";
    nextPhaseGate = "NO_NEXT_PHASE";
    closureStage = "Resolve access / policy lock";
  } else if (recoveryRequired || closureScore < 45) {
    closureStatus = "PHASE_RECOVERY";
    closureLabel = "Recovery Closure";
    nextPhaseGate = "RECOVERY_BEFORE_7_1";
    closureStage = "Complete recovery before expansion";
  } else if (growthLocked || complianceStatus === "WATCH" || closureScore < 72) {
    closureStatus = "PHASE_CONTROL";
    closureLabel = "Control Closure";
    nextPhaseGate = "CONTROLLED_7_1";
    closureStage = "Controlled next phase only";
  }
  const closureColor = closureStatus === "PHASE_READY" ? "#86efac" : closureStatus === "PHASE_CONTROL" ? "#fde68a" : closureStatus === "PHASE_RECOVERY" ? "#fecaca" : "#94a3b8";
  const closureBg = closureStatus === "PHASE_READY" ? "rgba(16,185,129,0.10)" : closureStatus === "PHASE_CONTROL" ? "rgba(245,158,11,0.11)" : closureStatus === "PHASE_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const closureLocks = [...reviewLocks.slice(0, 2), ...advisoryLocks.slice(0, 2), ...complianceLocks.slice(0, 2), ...blockedMoves.slice(0, 2), ...doNot.slice(0, 1)];
  if (!closureLocks.length) closureLocks.push("Phase 7.0 closure clear: boleh masuk 7.1 dengan baseline freeze dan backup audit.");
  const closureRows = [
    { key: "closure-gate", label: "Next Phase Gate", value: nextPhaseGate, metric: closureLabel, color: closureColor },
    { key: "closure-cash", label: "Cash Close", value: dailyCashTarget > 0 ? `Daily cash target ${formatRupiah(dailyCashTarget)}` : "Cash baseline clear", metric: safeWallet < 0 ? "Recovery" : "Clear", color: closureColor },
    { key: "closure-month", label: "Monthly Close", value: monthlyActionTarget > 0 ? `Monthly action target ${formatRupiah(monthlyActionTarget)}` : "Monthly action target clear", metric: incomeShortfall > 0 ? "Shortfall" : "Stable", color: closureColor },
  ];
  const phaseClosureMemo = `${closureLabel}: ${closureStage}. Gate ${nextPhaseGate}. ${closureLocks[0]}`;
  const closureNotice = `Phase Closure 7.1.5: ${closureLabel} · ${nextPhaseGate} · score ${closureScore}/100`;
  return {
    closureStatus,
    closureLabel,
    closureStage,
    nextPhaseGate,
    closureScore,
    closureColor,
    closureBg,
    closureNotice,
    phaseClosureMemo,
    closureRows,
    closureLocks,
    dailyCashTarget,
    monthlyActionTarget,
    rhythmStatus,
    advisoryStatus,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: closureStatus === "PHASE_READY" && closureScore >= 72 && !recoveryRequired && !growthLocked,
  };
}



function buildPredictiveScenarioSimulationEngine({
  closureEngine = {},
  rhythmEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  commandEngine = {},
  executionEngine = {},
  actionEngine = {},
  predictiveEngine = {},
  healthEngine = {},
  decisionEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const closureScore = Math.max(0, Math.min(100, asEngineNumber(closureEngine?.closureScore)));
  const rhythmScore = Math.max(0, Math.min(100, asEngineNumber(rhythmEngine?.rhythmScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const executionScore = Math.max(0, Math.min(100, asEngineNumber(executionEngine?.executionScore)));
  const predictiveScore = Math.max(0, Math.min(100, asEngineNumber(predictiveEngine?.predictiveScore)));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.score ?? healthEngine?.healthScore)));
  const closureStatus = String(closureEngine?.closureStatus || "PHASE_LOCKED").toUpperCase();
  const nextPhaseGate = String(closureEngine?.nextPhaseGate || "NO_NEXT_PHASE").toUpperCase();
  const advisoryStatus = String(cfoEngine?.advisoryStatus || "CFO_LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || cfoEngine?.gateDecision || "LOCKED").toUpperCase();
  const recoveryRequired = !!closureEngine?.recoveryRequired || !!rhythmEngine?.recoveryRequired || !!cfoEngine?.recoveryRequired || !!predictiveEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!closureEngine?.growthLocked || !!rhythmEngine?.growthLocked || !!cfoEngine?.growthLocked || !!executionEngine?.growthLocked || !!commandEngine?.growthLocked;
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const recoveryGap = Math.max(0, asEngineNumber(predictiveEngine?.recoveryGap), safeWallet < 0 ? Math.abs(safeWallet) : 0, safeNetWorth < 0 ? Math.abs(safeNetWorth) : 0);
  const monthlyActionTarget = Math.max(0, asEngineNumber(closureEngine?.monthlyActionTarget), asEngineNumber(rhythmEngine?.monthlyActionTarget), asEngineNumber(cfoEngine?.monthlyActionTarget), asEngineNumber(actionEngine?.monthlyActionTarget));
  const dailyCashTarget = Math.max(0, asEngineNumber(closureEngine?.dailyCashTarget), asEngineNumber(rhythmEngine?.dailyCashTarget), asEngineNumber(cfoEngine?.dailyCashTarget), asEngineNumber(commandEngine?.dailyCashTarget));
  const baseReadiness = Math.round((closureScore * 0.22) + (advisoryScore * 0.18) + (complianceScore * 0.16) + (governanceScore * 0.14) + (rhythmScore * 0.12) + (executionScore * 0.10) + (predictiveScore * 0.05) + (healthScore * 0.03));
  const scenarioPenalty =
    (safeWallet < 0 ? 16 : 0) +
    (safeNetWorth < 0 ? 16 : 0) +
    (safeDebtRatio >= 65 ? 10 : safeDebtRatio >= 45 ? 6 : 0) +
    (incomeShortfall > 0 ? 8 : 0) +
    (mandatoryGap > 0 ? 8 : 0) +
    (recoveryRequired ? 14 : 0) +
    (growthLocked ? 9 : 0) +
    (closureStatus === "PHASE_LOCKED" ? 24 : closureStatus === "PHASE_RECOVERY" ? 14 : closureStatus === "PHASE_CONTROL" ? 7 : 0) +
    (complianceStatus === "LOCKED" ? 22 : complianceStatus === "BREACH" ? 14 : complianceStatus === "WATCH" ? 7 : 0) +
    (advisoryStatus === "CFO_LOCKED" ? 22 : advisoryStatus === "CFO_RECOVERY" ? 13 : advisoryStatus === "CFO_CONTROL" ? 6 : 0);
  const scenarioCap = Math.min(
    safeWallet < 0 ? 42 : 100,
    safeNetWorth < 0 ? 44 : 100,
    recoveryRequired ? 58 : 100,
    growthLocked ? 74 : 100,
    closureStatus === "PHASE_LOCKED" ? 24 : closureStatus === "PHASE_RECOVERY" ? 56 : closureStatus === "PHASE_CONTROL" ? 76 : 100,
    complianceStatus === "LOCKED" ? 24 : complianceStatus === "BREACH" ? 54 : complianceStatus === "WATCH" ? 74 : 100,
    gateDecision === "RECOVERY" ? 58 : gateDecision === "HOLD" ? 76 : 100
  );
  const scenarioScore = Math.max(0, Math.min(scenarioCap, baseReadiness - scenarioPenalty + 18));
  const targetMonthlyRecovery = Math.max(monthlyActionTarget, Math.ceil(recoveryGap / 3), incomeShortfall, mandatoryGap);
  const targetDailyRecovery = Math.max(dailyCashTarget, Math.ceil(targetMonthlyRecovery / 30));
  const recoveryMonths = targetMonthlyRecovery > 0 ? Math.ceil(recoveryGap / targetMonthlyRecovery) : (recoveryGap > 0 ? 99 : 0);
  const controlBufferTarget = Math.max(targetMonthlyRecovery, Math.ceil(Math.max(0, monthlyActionTarget) * 1.15), Math.ceil(Math.max(0, incomeShortfall + mandatoryGap) * 1.10));
  const growthBufferTarget = Math.max(controlBufferTarget, Math.ceil(Math.max(0, safeWallet) * 0.10), Math.ceil(Math.max(0, safeNetWorth) * 0.03));
  const scenarios = [
    {
      id: "recovery",
      label: "Recovery Scenario",
      mode: "RECOVERY",
      horizon: recoveryGap > 0 ? `${Math.max(1, recoveryMonths)} bulan` : "30 hari",
      target: targetMonthlyRecovery,
      dailyTarget: targetDailyRecovery,
      score: Math.max(0, Math.min(100, scenarioScore + (recoveryRequired ? 12 : -8))),
      action: recoveryGap > 0 ? `Pulihkan gap ${formatRupiah(recoveryGap)} dengan target ${formatRupiah(targetMonthlyRecovery)}/bulan.` : "Jaga cash positif dan tutup shortfall wajib.",
      locked: false,
    },
    {
      id: "control",
      label: "Control Scenario",
      mode: "CONTROL",
      horizon: "90 hari",
      target: controlBufferTarget,
      dailyTarget: Math.ceil(controlBufferTarget / 30),
      score: Math.max(0, Math.min(100, scenarioScore + (!recoveryRequired && !growthLocked ? 8 : -10))),
      action: `Tahan ekspansi, bangun buffer ${formatRupiah(controlBufferTarget)}/bulan, review mingguan CFO.`,
      locked: closureStatus === "PHASE_LOCKED" || complianceStatus === "LOCKED",
    },
    {
      id: "growth",
      label: "Growth Scenario",
      mode: "GROWTH",
      horizon: "180 hari",
      target: growthBufferTarget,
      dailyTarget: Math.ceil(growthBufferTarget / 30),
      score: Math.max(0, Math.min(100, scenarioScore + (!recoveryRequired && !growthLocked && closureStatus === "PHASE_READY" ? 14 : -24))),
      action: `Boleh growth jika buffer minimal ${formatRupiah(growthBufferTarget)}/bulan dan semua lock clear.`,
      locked: recoveryRequired || growthLocked || closureStatus !== "PHASE_READY" || complianceStatus !== "COMPLIANT",
    },
  ];
  const availableScenarios = scenarios.filter(row => !row.locked);
  const recommended = (availableScenarios.length ? availableScenarios : scenarios).slice().sort((a, b) => b.score - a.score)[0] || scenarios[0];
  let scenarioStatus = "SCENARIO_READY";
  let scenarioLabel = "Scenario Ready";
  if (closureStatus === "PHASE_LOCKED" || complianceStatus === "LOCKED") {
    scenarioStatus = "SCENARIO_LOCKED";
    scenarioLabel = "Scenario Locked";
  } else if (recommended.mode === "RECOVERY" || recoveryRequired || scenarioScore < 45) {
    scenarioStatus = "SCENARIO_RECOVERY";
    scenarioLabel = "Recovery Scenario";
  } else if (recommended.mode === "CONTROL" || growthLocked || scenarioScore < 72) {
    scenarioStatus = "SCENARIO_CONTROL";
    scenarioLabel = "Control Scenario";
  }
  const scenarioColor = scenarioStatus === "SCENARIO_READY" ? "#86efac" : scenarioStatus === "SCENARIO_CONTROL" ? "#fde68a" : scenarioStatus === "SCENARIO_RECOVERY" ? "#fecaca" : "#94a3b8";
  const scenarioBg = scenarioStatus === "SCENARIO_READY" ? "rgba(16,185,129,0.10)" : scenarioStatus === "SCENARIO_CONTROL" ? "rgba(245,158,11,0.11)" : scenarioStatus === "SCENARIO_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const scenarioRows = scenarios.map(row => ({
    key: row.id,
    label: row.label,
    value: row.action,
    metric: `${row.mode} · ${row.score}/100`,
    color: row.locked ? "#94a3b8" : (row.id === recommended.id ? scenarioColor : "#c7d2fe"),
    locked: row.locked,
  }));
  const simulationLocks = [];
  if (closureStatus === "PHASE_LOCKED") simulationLocks.push("Phase closure locked: jangan buka scenario growth.");
  if (recoveryRequired) simulationLocks.push("Recovery required: scenario utama wajib pemulihan cash/net worth.");
  if (growthLocked) simulationLocks.push("Growth locked: tahan pembelian/ekspansi non-wajib.");
  if (incomeShortfall > 0) simulationLocks.push(`Income shortfall ${formatRupiah(incomeShortfall)} harus ditutup.`);
  if (!simulationLocks.length) simulationLocks.push("Scenario clear: gunakan Control sebagai baseline dan Growth hanya jika buffer terjaga.");
  const scenarioMemo = `${scenarioLabel}: rekomendasi ${recommended.label} (${recommended.horizon}). Target bulanan ${formatRupiah(recommended.target)} · harian ${formatRupiah(recommended.dailyTarget)}.`;
  const scenarioNotice = `Scenario Simulation 7.1.5: ${recommended.mode} · score ${scenarioScore}/100 · ${nextPhaseGate}`;
  return {
    scenarioStatus,
    scenarioLabel,
    scenarioScore,
    scenarioColor,
    scenarioBg,
    scenarioNotice,
    scenarioMemo,
    recommendedScenario: recommended,
    scenarioRows,
    simulationLocks,
    targetMonthlyRecovery,
    targetDailyRecovery,
    recoveryMonths,
    nextPhaseGate,
    advisoryStatus,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: scenarioStatus === "SCENARIO_READY" && scenarioScore >= 72 && !recoveryRequired && !growthLocked,
  };
}



function buildPredictiveScenarioStressTestEngine({
  scenarioEngine = {},
  closureEngine = {},
  rhythmEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  predictiveEngine = {},
  decisionEngine = {},
  walletTotal = 0,
  netWorth = 0,
  debtRatio = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
  mandatoryMonthlyTarget = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeDebtRatio = asEngineNumber(debtRatio);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const safeMandatory = Math.max(0, asEngineNumber(mandatoryMonthlyTarget));
  const scenarioScore = Math.max(0, Math.min(100, asEngineNumber(scenarioEngine?.scenarioScore)));
  const closureScore = Math.max(0, Math.min(100, asEngineNumber(closureEngine?.closureScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const rhythmScore = Math.max(0, Math.min(100, asEngineNumber(rhythmEngine?.rhythmScore)));
  const scenarioStatus = String(scenarioEngine?.scenarioStatus || "SCENARIO_LOCKED").toUpperCase();
  const recommendedMode = String(scenarioEngine?.recommendedScenario?.mode || "LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || cfoEngine?.gateDecision || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const closureStatus = String(closureEngine?.closureStatus || "PHASE_LOCKED").toUpperCase();
  const recoveryRequired = !!scenarioEngine?.recoveryRequired || !!closureEngine?.recoveryRequired || !!cfoEngine?.recoveryRequired || !!predictiveEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!scenarioEngine?.growthLocked || !!closureEngine?.growthLocked || !!cfoEngine?.growthLocked || policyMode === "RECOVERY" || gateDecision === "RECOVERY";
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const recoveryGap = Math.max(0, asEngineNumber(predictiveEngine?.recoveryGap), safeWallet < 0 ? Math.abs(safeWallet) : 0, safeNetWorth < 0 ? Math.abs(safeNetWorth) : 0);
  const baseMonthlyTarget = Math.max(0, asEngineNumber(scenarioEngine?.recommendedScenario?.target), asEngineNumber(scenarioEngine?.targetMonthlyRecovery), asEngineNumber(closureEngine?.monthlyActionTarget), asEngineNumber(rhythmEngine?.monthlyActionTarget));
  const baseDailyTarget = Math.max(0, asEngineNumber(scenarioEngine?.recommendedScenario?.dailyTarget), asEngineNumber(scenarioEngine?.targetDailyRecovery), asEngineNumber(closureEngine?.dailyCashTarget), asEngineNumber(rhythmEngine?.dailyCashTarget));
  const baselineMonthlyGap = Math.max(0, recoveryGap, incomeShortfall, mandatoryGap, safeMandatory - Math.max(0, safeIncome - safeExpense));
  const shockIncome20 = Math.max(0, Math.ceil((safeIncome * 0.20) + baselineMonthlyGap));
  const shockExpense15 = Math.max(0, Math.ceil((safeExpense * 0.15) + baselineMonthlyGap));
  const shockDebt10 = Math.max(0, Math.ceil(Math.max(0, safeNetWorth) * (safeDebtRatio >= 45 ? 0.03 : 0.015) + baselineMonthlyGap));
  const shockGoalPressure = Math.max(0, Math.ceil((safeMandatory + mandatoryGap) * 1.20));
  const shockLiquidity = Math.max(0, Math.ceil(Math.abs(Math.min(0, safeWallet)) + Math.max(baseMonthlyTarget, safeExpense * 0.35, safeMandatory)));
  const stressRowsRaw = [
    { key: "income", label: "Income Shock -20%", requiredBuffer: shockIncome20, severity: safeIncome <= 0 ? 90 : shockIncome20 > baseMonthlyTarget ? 70 : 35, action: `Siapkan buffer income shock minimal ${formatRupiah(shockIncome20)}.` },
    { key: "expense", label: "Expense Shock +15%", requiredBuffer: shockExpense15, severity: shockExpense15 > baseMonthlyTarget ? 64 : 32, action: `Tahan expense non-wajib sampai buffer ${formatRupiah(shockExpense15)}.` },
    { key: "debt", label: "Debt Pressure Shock", requiredBuffer: shockDebt10, severity: safeDebtRatio >= 65 ? 86 : safeDebtRatio >= 45 ? 62 : 28, action: `Kurangi tekanan hutang, siapkan ${formatRupiah(shockDebt10)}.` },
    { key: "goal", label: "Mandatory Goal Pressure", requiredBuffer: shockGoalPressure, severity: mandatoryGap > 0 ? 74 : safeMandatory > 0 ? 42 : 18, action: `Pastikan goal wajib tetap feasible: ${formatRupiah(shockGoalPressure)}.` },
    { key: "liquidity", label: "Liquidity Drawdown", requiredBuffer: shockLiquidity, severity: safeWallet < 0 ? 92 : shockLiquidity > Math.max(baseMonthlyTarget, 1) ? 58 : 30, action: `Jaga liquidity floor ${formatRupiah(shockLiquidity)} sebelum growth.` },
  ];
  const stressRows = stressRowsRaw.map(row => {
    const covered = baseMonthlyTarget >= row.requiredBuffer && !recoveryRequired && complianceStatus !== "LOCKED";
    const rowScore = Math.max(0, Math.min(100, 100 - row.severity + (covered ? 10 : -10)));
    return {
      ...row,
      covered,
      score: rowScore,
      metric: `${covered ? "COVERED" : "GAP"} · ${rowScore}/100`,
      color: covered ? "#86efac" : row.severity >= 75 ? "#fecaca" : "#fde68a",
    };
  });
  const uncoveredRows = stressRows.filter(row => !row.covered);
  const maxSeverity = stressRows.reduce((max, row) => Math.max(max, row.severity), 0);
  const averageStressScore = stressRows.length ? Math.round(stressRows.reduce((sum, row) => sum + row.score, 0) / stressRows.length) : 0;
  const readinessBlend = Math.round((scenarioScore * 0.26) + (closureScore * 0.15) + (advisoryScore * 0.14) + (complianceScore * 0.14) + (governanceScore * 0.11) + (rhythmScore * 0.08) + (averageStressScore * 0.12));
  const stressPenalty =
    (recoveryRequired ? 20 : 0) +
    (growthLocked ? 10 : 0) +
    (safeWallet < 0 ? 18 : 0) +
    (safeNetWorth < 0 ? 18 : 0) +
    (incomeShortfall > 0 ? 8 : 0) +
    (mandatoryGap > 0 ? 8 : 0) +
    (maxSeverity >= 90 ? 16 : maxSeverity >= 75 ? 10 : maxSeverity >= 60 ? 6 : 0) +
    (uncoveredRows.length >= 4 ? 14 : uncoveredRows.length >= 2 ? 8 : uncoveredRows.length === 1 ? 4 : 0) +
    (scenarioStatus === "SCENARIO_LOCKED" ? 22 : scenarioStatus === "SCENARIO_RECOVERY" ? 12 : scenarioStatus === "SCENARIO_CONTROL" ? 6 : 0) +
    (complianceStatus === "LOCKED" ? 18 : complianceStatus === "BREACH" ? 12 : complianceStatus === "WATCH" ? 6 : 0);
  const stressCap = Math.min(
    safeWallet < 0 ? 38 : 100,
    safeNetWorth < 0 ? 40 : 100,
    recoveryRequired ? 55 : 100,
    growthLocked ? 72 : 100,
    scenarioStatus === "SCENARIO_LOCKED" ? 24 : scenarioStatus === "SCENARIO_RECOVERY" ? 54 : scenarioStatus === "SCENARIO_CONTROL" ? 76 : 100,
    complianceStatus === "LOCKED" ? 24 : complianceStatus === "BREACH" ? 52 : complianceStatus === "WATCH" ? 74 : 100
  );
  const stressScore = Math.max(0, Math.min(stressCap, readinessBlend - stressPenalty + 20));
  let stressStatus = "STRESS_PASS";
  let stressLabel = "Stress Pass";
  if (scenarioStatus === "SCENARIO_LOCKED" || complianceStatus === "LOCKED") {
    stressStatus = "STRESS_LOCKED";
    stressLabel = "Stress Locked";
  } else if (stressScore < 45 || recoveryRequired || maxSeverity >= 90) {
    stressStatus = "STRESS_FAIL";
    stressLabel = "Stress Fail";
  } else if (stressScore < 72 || uncoveredRows.length > 0 || growthLocked) {
    stressStatus = "STRESS_WATCH";
    stressLabel = "Stress Watch";
  }
  const stressColor = stressStatus === "STRESS_PASS" ? "#86efac" : stressStatus === "STRESS_WATCH" ? "#fde68a" : stressStatus === "STRESS_FAIL" ? "#fecaca" : "#94a3b8";
  const stressBg = stressStatus === "STRESS_PASS" ? "rgba(16,185,129,0.10)" : stressStatus === "STRESS_WATCH" ? "rgba(245,158,11,0.11)" : stressStatus === "STRESS_FAIL" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const requiredStressBuffer = Math.max(baseMonthlyTarget, ...stressRows.map(row => row.requiredBuffer));
  const requiredDailyStressBuffer = Math.ceil(requiredStressBuffer / 30);
  const stressLocks = [];
  if (stressStatus === "STRESS_LOCKED") stressLocks.push("Stress test terkunci: clear compliance/scenario lock dulu.");
  if (recoveryRequired) stressLocks.push("Recovery required: jangan gunakan Growth scenario.");
  if (uncoveredRows.length) stressLocks.push(`${uncoveredRows.length} stress area belum covered.`);
  if (requiredStressBuffer > baseMonthlyTarget) stressLocks.push(`Naikkan buffer bulanan ke ${formatRupiah(requiredStressBuffer)}.`);
  if (!stressLocks.length) stressLocks.push("Stress test pass: scenario dapat dipakai sebagai baseline keputusan.");
  const primaryStress = uncoveredRows.slice().sort((a, b) => b.severity - a.severity)[0] || stressRows.slice().sort((a, b) => b.severity - a.severity)[0] || null;
  const stressMemo = `${stressLabel}: ${primaryStress ? primaryStress.label : "No shock"}. Buffer bulanan ${formatRupiah(requiredStressBuffer)} · harian ${formatRupiah(requiredDailyStressBuffer)}.`;
  const stressNotice = `Scenario Stress Test 7.1.5: ${recommendedMode} · ${stressStatus} · score ${stressScore}/100`;
  return {
    stressStatus,
    stressLabel,
    stressScore,
    stressColor,
    stressBg,
    stressNotice,
    stressMemo,
    stressRows,
    uncoveredRows,
    stressLocks,
    requiredStressBuffer,
    requiredDailyStressBuffer,
    primaryStress,
    maxSeverity,
    averageStressScore,
    recommendedMode,
    scenarioStatus,
    complianceStatus,
    gateDecision,
    policyMode,
    closureStatus,
    recoveryRequired,
    growthLocked,
    ok: stressStatus === "STRESS_PASS" && stressScore >= 72 && !recoveryRequired && !growthLocked,
  };
}



function buildPredictiveScenarioCashflowProjectionEngine({
  scenarioEngine = {},
  stressEngine = {},
  closureEngine = {},
  rhythmEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  predictiveEngine = {},
  decisionEngine = {},
  walletTotal = 0,
  netWorth = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
  mandatoryMonthlyTarget = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const safeMandatory = Math.max(0, asEngineNumber(mandatoryMonthlyTarget));
  const scenarioScore = Math.max(0, Math.min(100, asEngineNumber(scenarioEngine?.scenarioScore)));
  const stressScore = Math.max(0, Math.min(100, asEngineNumber(stressEngine?.stressScore)));
  const closureScore = Math.max(0, Math.min(100, asEngineNumber(closureEngine?.closureScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const rhythmScore = Math.max(0, Math.min(100, asEngineNumber(rhythmEngine?.rhythmScore)));
  const scenarioStatus = String(scenarioEngine?.scenarioStatus || "SCENARIO_LOCKED").toUpperCase();
  const stressStatus = String(stressEngine?.stressStatus || "STRESS_LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || cfoEngine?.gateDecision || "LOCKED").toUpperCase();
  const recommendedMode = String(scenarioEngine?.recommendedScenario?.mode || stressEngine?.recommendedMode || "LOCKED").toUpperCase();
  const recoveryRequired = !!scenarioEngine?.recoveryRequired || !!stressEngine?.recoveryRequired || !!closureEngine?.recoveryRequired || !!cfoEngine?.recoveryRequired || !!predictiveEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!scenarioEngine?.growthLocked || !!stressEngine?.growthLocked || !!closureEngine?.growthLocked || !!cfoEngine?.growthLocked || policyMode === "RECOVERY" || gateDecision === "RECOVERY";
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGap = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const recoveryGap = Math.max(0, asEngineNumber(predictiveEngine?.recoveryGap), safeWallet < 0 ? Math.abs(safeWallet) : 0, safeNetWorth < 0 ? Math.abs(safeNetWorth) : 0);
  const requiredStressBuffer = Math.max(0, asEngineNumber(stressEngine?.requiredStressBuffer));
  const scenarioMonthlyTarget = Math.max(0, asEngineNumber(scenarioEngine?.recommendedScenario?.target), asEngineNumber(scenarioEngine?.targetMonthlyRecovery));
  const rhythmMonthlyTarget = Math.max(0, asEngineNumber(rhythmEngine?.monthlyActionTarget), asEngineNumber(closureEngine?.monthlyActionTarget), asEngineNumber(cfoEngine?.monthlyActionTarget));
  const baseActionTarget = Math.max(scenarioMonthlyTarget, rhythmMonthlyTarget, requiredStressBuffer, incomeShortfall, mandatoryGap, Math.ceil(recoveryGap / 3));
  const netMonthlyCashflow = safeIncome - safeExpense - safeMandatory;
  const scenarioAdjustment = recommendedMode === "RECOVERY" ? baseActionTarget : recommendedMode === "CONTROL" ? Math.ceil(baseActionTarget * 0.75) : Math.ceil(baseActionTarget * 0.45);
  const projectedMonthlyDelta = netMonthlyCashflow + scenarioAdjustment;
  const monthProjection = (months) => Math.round(safeWallet + (projectedMonthlyDelta * months));
  const projectionRowsRaw = [
    { key: "30d", label: "30 Hari", months: 1 },
    { key: "60d", label: "60 Hari", months: 2 },
    { key: "90d", label: "90 Hari", months: 3 },
  ];
  const projectionRows = projectionRowsRaw.map(row => {
    const projectedCash = monthProjection(row.months);
    const minimumFloor = Math.max(0, Math.ceil((safeExpense + safeMandatory) * (row.months * 0.35)));
    const gap = Math.max(0, minimumFloor - projectedCash);
    const covered = projectedCash >= minimumFloor && projectedCash >= 0;
    const score = Math.max(0, Math.min(100, Math.round((covered ? 80 : 44) + (projectedMonthlyDelta > 0 ? 10 : -12) - (gap > 0 ? Math.min(24, Math.ceil(gap / Math.max(1, minimumFloor || 1) * 20)) : 0))));
    return {
      ...row,
      projectedCash,
      minimumFloor,
      gap,
      covered,
      score,
      metric: `${formatRupiah(projectedCash)} · ${score}/100`,
      action: covered ? `Cashflow ${row.label} masih di atas floor ${formatRupiah(minimumFloor)}.` : `Tutup gap ${formatRupiah(gap)} agar ${row.label} tidak jatuh di bawah floor.`,
      color: covered ? "#86efac" : projectedCash < 0 ? "#fecaca" : "#fde68a",
    };
  });
  const criticalRows = projectionRows.filter(row => !row.covered || row.projectedCash < 0);
  const worstProjection = projectionRows.slice().sort((a, b) => a.score - b.score)[0] || null;
  const projectionFloorGap = Math.max(0, ...projectionRows.map(row => row.gap));
  const requiredMonthlyProjectionBuffer = Math.max(baseActionTarget, Math.ceil(projectionFloorGap / 3), incomeShortfall, mandatoryGap, recoveryGap > 0 ? Math.ceil(recoveryGap / 3) : 0);
  const requiredDailyProjectionBuffer = Math.ceil(requiredMonthlyProjectionBuffer / 30);
  const projectionBlend = Math.round((scenarioScore * 0.22) + (stressScore * 0.22) + (closureScore * 0.12) + (advisoryScore * 0.12) + (complianceScore * 0.12) + (governanceScore * 0.08) + (rhythmScore * 0.06) + ((projectionRows.reduce((sum, row) => sum + row.score, 0) / Math.max(1, projectionRows.length)) * 0.06));
  const projectionPenalty =
    (scenarioStatus === "SCENARIO_LOCKED" ? 22 : scenarioStatus === "SCENARIO_RECOVERY" ? 10 : scenarioStatus === "SCENARIO_CONTROL" ? 5 : 0) +
    (stressStatus === "STRESS_LOCKED" ? 18 : stressStatus === "STRESS_FAIL" ? 14 : stressStatus === "STRESS_WATCH" ? 7 : 0) +
    (complianceStatus === "LOCKED" ? 18 : complianceStatus === "BREACH" ? 12 : complianceStatus === "WATCH" ? 6 : 0) +
    (safeWallet < 0 ? 16 : 0) +
    (safeNetWorth < 0 ? 14 : 0) +
    (projectedMonthlyDelta < 0 ? 14 : 0) +
    (criticalRows.length >= 3 ? 16 : criticalRows.length === 2 ? 10 : criticalRows.length === 1 ? 5 : 0) +
    (recoveryRequired ? 10 : 0) +
    (incomeShortfall > 0 ? 6 : 0) +
    (mandatoryGap > 0 ? 6 : 0);
  const projectionCap = Math.min(
    safeWallet < 0 ? 44 : 100,
    safeNetWorth < 0 ? 46 : 100,
    scenarioStatus === "SCENARIO_LOCKED" ? 25 : 100,
    stressStatus === "STRESS_LOCKED" ? 28 : stressStatus === "STRESS_FAIL" ? 56 : stressStatus === "STRESS_WATCH" ? 76 : 100,
    complianceStatus === "LOCKED" ? 26 : complianceStatus === "BREACH" ? 54 : complianceStatus === "WATCH" ? 76 : 100,
    projectedMonthlyDelta < 0 ? 58 : 100
  );
  const projectionScore = Math.max(0, Math.min(projectionCap, projectionBlend - projectionPenalty + 20));
  let projectionStatus = "CASHFLOW_SAFE";
  let projectionLabel = "Cashflow Safe";
  if (scenarioStatus === "SCENARIO_LOCKED" || stressStatus === "STRESS_LOCKED" || complianceStatus === "LOCKED") {
    projectionStatus = "CASHFLOW_LOCKED";
    projectionLabel = "Cashflow Locked";
  } else if (projectionScore < 45 || criticalRows.some(row => row.projectedCash < 0) || recoveryRequired) {
    projectionStatus = "CASHFLOW_DEFICIT";
    projectionLabel = "Cashflow Deficit";
  } else if (projectionScore < 72 || criticalRows.length > 0 || growthLocked) {
    projectionStatus = "CASHFLOW_WATCH";
    projectionLabel = "Cashflow Watch";
  }
  const projectionColor = projectionStatus === "CASHFLOW_SAFE" ? "#86efac" : projectionStatus === "CASHFLOW_WATCH" ? "#fde68a" : projectionStatus === "CASHFLOW_DEFICIT" ? "#fecaca" : "#94a3b8";
  const projectionBg = projectionStatus === "CASHFLOW_SAFE" ? "rgba(16,185,129,0.10)" : projectionStatus === "CASHFLOW_WATCH" ? "rgba(245,158,11,0.11)" : projectionStatus === "CASHFLOW_DEFICIT" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const projectionLocks = [];
  if (projectionStatus === "CASHFLOW_LOCKED") projectionLocks.push("Cashflow projection locked: clear scenario/stress/compliance lock dulu.");
  if (projectedMonthlyDelta < 0) projectionLocks.push(`Cashflow bulanan negatif ${formatRupiah(Math.abs(projectedMonthlyDelta))}.`);
  if (criticalRows.length) projectionLocks.push(`${criticalRows.length} horizon cashflow belum aman.`);
  if (requiredMonthlyProjectionBuffer > baseActionTarget) projectionLocks.push(`Naikkan buffer proyeksi ke ${formatRupiah(requiredMonthlyProjectionBuffer)}/bulan.`);
  if (!projectionLocks.length) projectionLocks.push("Cashflow projection aman untuk baseline scenario.");
  const projectionMemo = `${projectionLabel}: worst horizon ${worstProjection ? worstProjection.label : "N/A"}. Target bulanan ${formatRupiah(requiredMonthlyProjectionBuffer)} · harian ${formatRupiah(requiredDailyProjectionBuffer)}.`;
  const projectionNotice = `Scenario Cashflow Projection 7.1.5: ${recommendedMode} · ${projectionStatus} · score ${projectionScore}/100`;
  return {
    projectionStatus,
    projectionLabel,
    projectionScore,
    projectionColor,
    projectionBg,
    projectionNotice,
    projectionMemo,
    projectionRows,
    criticalRows,
    worstProjection,
    projectionLocks,
    netMonthlyCashflow,
    projectedMonthlyDelta,
    requiredMonthlyProjectionBuffer,
    requiredDailyProjectionBuffer,
    projectionFloorGap,
    recommendedMode,
    scenarioStatus,
    stressStatus,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: projectionStatus === "CASHFLOW_SAFE" && projectionScore >= 72 && !recoveryRequired && !growthLocked,
  };
}



function buildPredictiveScenarioGoalFeasibilityEngine({
  scenarioEngine = {},
  stressEngine = {},
  projectionEngine = {},
  closureEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  decisionEngine = {},
  healthEngine = {},
  goalRows = [],
  walletTotal = 0,
  netWorth = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
  mandatoryMonthlyTarget = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const safeMandatory = Math.max(0, asEngineNumber(mandatoryMonthlyTarget));
  const scenarioScore = Math.max(0, Math.min(100, asEngineNumber(scenarioEngine?.scenarioScore)));
  const stressScore = Math.max(0, Math.min(100, asEngineNumber(stressEngine?.stressScore)));
  const projectionScore = Math.max(0, Math.min(100, asEngineNumber(projectionEngine?.projectionScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const closureScore = Math.max(0, Math.min(100, asEngineNumber(closureEngine?.closureScore)));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const scenarioStatus = String(scenarioEngine?.scenarioStatus || "SCENARIO_LOCKED").toUpperCase();
  const stressStatus = String(stressEngine?.stressStatus || "STRESS_LOCKED").toUpperCase();
  const projectionStatus = String(projectionEngine?.projectionStatus || "CASHFLOW_LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || cfoEngine?.gateDecision || "LOCKED").toUpperCase();
  const recommendedMode = String(scenarioEngine?.recommendedScenario?.mode || projectionEngine?.recommendedMode || stressEngine?.recommendedMode || "LOCKED").toUpperCase();
  const recoveryRequired = !!scenarioEngine?.recoveryRequired || !!stressEngine?.recoveryRequired || !!projectionEngine?.recoveryRequired || !!closureEngine?.recoveryRequired || !!cfoEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!scenarioEngine?.growthLocked || !!stressEngine?.growthLocked || !!projectionEngine?.growthLocked || !!closureEngine?.growthLocked || !!cfoEngine?.growthLocked || policyMode === "RECOVERY" || gateDecision === "RECOVERY";
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const mandatoryGapFromDecision = Math.max(0, asEngineNumber(decisionEngine?.mandatoryGap));
  const goalCapacityBase = Math.max(0, asEngineNumber(decisionEngine?.goalCapacity), safeIncome - safeExpense);
  const projectionBuffer = Math.max(0, asEngineNumber(projectionEngine?.requiredMonthlyProjectionBuffer));
  const stressBuffer = Math.max(0, asEngineNumber(stressEngine?.requiredStressBuffer));
  const reservedBuffer = Math.max(projectionBuffer, stressBuffer, incomeShortfall, safeMandatory);
  const availableForGoals = Math.max(0, goalCapacityBase - Math.max(0, reservedBuffer - safeMandatory));
  const activeGoalRows = (Array.isArray(goalRows) ? goalRows : [])
    .filter(goal => isFinancialRecordActive(goal) || String(goal?.status || "active").toLowerCase() === "active")
    .map(goal => {
      const target = Math.max(0, asEngineNumber(goal?.targetAmount ?? goal?.target));
      const current = Math.max(0, asEngineNumber(goal?.currentAmount ?? goal?.current ?? goal?.funded));
      const remaining = Math.max(0, target - current);
      const yearsLeft = Math.max(1 / 12, asEngineNumber(goal?.yearsLeft || goal?.years || 1));
      const monthsLeft = Math.max(1, Math.ceil(yearsLeft * 12));
      const monthlyRequired = remaining / monthsLeft;
      const dailyRequired = monthlyRequired / 30;
      const priority = getGoalPriorityLabel(goal);
      const fundingRatio = target > 0 ? Math.min(150, (current / target) * 100) : 100;
      const priorityWeight = priority === "Wajib" ? 1.0 : priority === "Penting" ? 0.65 : 0.35;
      const weightedRequired = monthlyRequired * priorityWeight;
      return { ...goal, target, current, remaining, monthsLeft, monthlyRequired, dailyRequired, priority, fundingRatio, weightedRequired };
    });
  const mandatoryRows = activeGoalRows.filter(row => row.priority === "Wajib");
  const importantRows = activeGoalRows.filter(row => row.priority === "Penting");
  const optionalRows = activeGoalRows.filter(row => row.priority === "Opsional");
  const mandatoryMonthly = mandatoryRows.reduce((sum, row) => sum + row.monthlyRequired, 0);
  const importantMonthly = importantRows.reduce((sum, row) => sum + row.monthlyRequired, 0);
  const optionalMonthly = optionalRows.reduce((sum, row) => sum + row.monthlyRequired, 0);
  const weightedMonthlyNeed = activeGoalRows.reduce((sum, row) => sum + row.weightedRequired, 0);
  const mandatoryGoalGap = Math.max(0, mandatoryMonthly - availableForGoals, mandatoryGapFromDecision);
  const importantGoalGap = Math.max(0, mandatoryMonthly + importantMonthly - availableForGoals);
  const totalGoalGap = Math.max(0, weightedMonthlyNeed - availableForGoals, mandatoryGoalGap);
  let runningCapacity = availableForGoals;
  const rank = { Wajib: 0, Penting: 1, Opsional: 2 };
  const goalFeasibilityRows = activeGoalRows
    .sort((a, b) => (rank[a.priority] - rank[b.priority]) || (b.monthlyRequired - a.monthlyRequired))
    .map(row => {
      const allocated = Math.min(runningCapacity, row.monthlyRequired);
      runningCapacity = Math.max(0, runningCapacity - row.monthlyRequired);
      const coverage = row.monthlyRequired > 0 ? Math.min(150, (allocated / row.monthlyRequired) * 100) : 150;
      const feasible = row.remaining <= 0 || coverage >= 100;
      const gap = Math.max(0, row.monthlyRequired - allocated);
      const locked = (row.priority === "Wajib" && gap > 0) || recoveryRequired || projectionStatus === "CASHFLOW_LOCKED" || stressStatus === "STRESS_LOCKED";
      const score = Math.max(0, Math.min(100, Math.round((feasible ? 82 : 48) + Math.min(16, row.fundingRatio / 8) - (gap > 0 ? Math.min(28, (gap / Math.max(1, row.monthlyRequired)) * 24) : 0) - (locked ? 12 : 0))));
      const color = feasible ? "#86efac" : row.priority === "Wajib" ? "#fecaca" : "#fde68a";
      const action = feasible
        ? `${row.priority} feasible: lindungi alokasi ${formatRupiah(row.monthlyRequired)}/bulan.`
        : row.priority === "Wajib"
          ? `Tutup gap ${formatRupiah(gap)}/bulan atau ubah deadline target wajib.`
          : `Tunda/kurangi target sampai kapasitas goal naik ${formatRupiah(gap)}/bulan.`;
      return {
        key: row.id || row.label || row.name || `goal-${row.priority}-${row.monthlyRequired}`,
        label: row.label || row.name || getGoalStageLabel(row),
        priority: row.priority,
        target: row.target,
        current: row.current,
        remaining: row.remaining,
        monthlyRequired: row.monthlyRequired,
        dailyRequired: row.dailyRequired,
        allocated,
        coverage,
        gap,
        feasible,
        locked,
        score,
        color,
        metric: `${formatRupiah(row.monthlyRequired)}/bln · ${Math.round(coverage)}%`,
        action,
      };
    });
  const blockedGoalRows = goalFeasibilityRows.filter(row => !row.feasible || row.locked || row.gap > 0);
  const mandatoryBlockedRows = blockedGoalRows.filter(row => row.priority === "Wajib");
  const averageGoalScore = goalFeasibilityRows.length ? Math.round(goalFeasibilityRows.reduce((sum, row) => sum + row.score, 0) / goalFeasibilityRows.length) : 100;
  const blendScore = Math.round((scenarioScore * 0.15) + (stressScore * 0.14) + (projectionScore * 0.20) + (advisoryScore * 0.10) + (complianceScore * 0.12) + (governanceScore * 0.08) + (closureScore * 0.08) + (healthScore * 0.05) + (averageGoalScore * 0.08));
  const feasibilityPenalty =
    (projectionStatus === "CASHFLOW_LOCKED" ? 22 : projectionStatus === "CASHFLOW_DEFICIT" ? 15 : projectionStatus === "CASHFLOW_WATCH" ? 7 : 0) +
    (stressStatus === "STRESS_LOCKED" ? 18 : stressStatus === "STRESS_FAIL" ? 12 : stressStatus === "STRESS_WATCH" ? 6 : 0) +
    (scenarioStatus === "SCENARIO_LOCKED" ? 18 : scenarioStatus === "SCENARIO_RECOVERY" ? 8 : 0) +
    (mandatoryBlockedRows.length ? 18 : 0) +
    (blockedGoalRows.length >= 3 ? 10 : blockedGoalRows.length === 2 ? 7 : blockedGoalRows.length === 1 ? 4 : 0) +
    (recoveryRequired ? 12 : 0) +
    (safeWallet < 0 ? 14 : 0) +
    (safeNetWorth < 0 ? 12 : 0) +
    (incomeShortfall > 0 ? 6 : 0);
  const feasibilityCap = Math.min(
    safeWallet < 0 ? 44 : 100,
    safeNetWorth < 0 ? 46 : 100,
    projectionStatus === "CASHFLOW_LOCKED" ? 28 : projectionStatus === "CASHFLOW_DEFICIT" ? 56 : projectionStatus === "CASHFLOW_WATCH" ? 78 : 100,
    stressStatus === "STRESS_LOCKED" ? 30 : stressStatus === "STRESS_FAIL" ? 58 : 100,
    mandatoryBlockedRows.length ? 62 : 100,
    recoveryRequired ? 68 : 100
  );
  const goalFeasibilityScore = Math.max(0, Math.min(feasibilityCap, blendScore - feasibilityPenalty + 18));
  let goalFeasibilityStatus = "GOAL_FEASIBLE";
  let goalFeasibilityLabel = "Goal Feasible";
  if (projectionStatus === "CASHFLOW_LOCKED" || stressStatus === "STRESS_LOCKED" || scenarioStatus === "SCENARIO_LOCKED") {
    goalFeasibilityStatus = "GOAL_LOCKED";
    goalFeasibilityLabel = "Goal Locked";
  } else if (goalFeasibilityScore < 48 || mandatoryBlockedRows.length > 0 || recoveryRequired) {
    goalFeasibilityStatus = "GOAL_GAP";
    goalFeasibilityLabel = "Goal Gap";
  } else if (goalFeasibilityScore < 74 || blockedGoalRows.length > 0 || growthLocked) {
    goalFeasibilityStatus = "GOAL_WATCH";
    goalFeasibilityLabel = "Goal Watch";
  }
  const goalFeasibilityColor = goalFeasibilityStatus === "GOAL_FEASIBLE" ? "#86efac" : goalFeasibilityStatus === "GOAL_WATCH" ? "#fde68a" : goalFeasibilityStatus === "GOAL_GAP" ? "#fecaca" : "#94a3b8";
  const goalFeasibilityBg = goalFeasibilityStatus === "GOAL_FEASIBLE" ? "rgba(16,185,129,0.10)" : goalFeasibilityStatus === "GOAL_WATCH" ? "rgba(245,158,11,0.11)" : goalFeasibilityStatus === "GOAL_GAP" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const requiredMonthlyGoalBuffer = Math.max(totalGoalGap, mandatoryGoalGap, incomeShortfall, projectionBuffer > goalCapacityBase ? projectionBuffer - goalCapacityBase : 0);
  const requiredDailyGoalBuffer = Math.ceil(requiredMonthlyGoalBuffer / 30);
  const feasibilityLocks = [];
  if (goalFeasibilityStatus === "GOAL_LOCKED") feasibilityLocks.push("Goal feasibility locked: clear scenario/stress/projection lock dulu.");
  if (mandatoryBlockedRows.length) feasibilityLocks.push(`${mandatoryBlockedRows.length} goal wajib belum feasible.`);
  if (blockedGoalRows.length) feasibilityLocks.push(`${blockedGoalRows.length} goal perlu koreksi target/deadline.`);
  if (requiredMonthlyGoalBuffer > 0) feasibilityLocks.push(`Butuh tambahan buffer goal ${formatRupiah(requiredMonthlyGoalBuffer)}/bulan.`);
  if (!feasibilityLocks.length) feasibilityLocks.push("Goal scenario feasible dengan baseline saat ini.");
  const goalFeasibilityMemo = `${goalFeasibilityLabel}: ${mandatoryRows.length} wajib · ${importantRows.length} penting · ${optionalRows.length} opsional. Buffer ${formatRupiah(requiredMonthlyGoalBuffer)}/bulan · ${formatRupiah(requiredDailyGoalBuffer)}/hari.`;
  const goalFeasibilityNotice = `Scenario Goal Feasibility 7.1.5: ${recommendedMode} · ${goalFeasibilityStatus} · score ${goalFeasibilityScore}/100`;
  return {
    goalFeasibilityStatus,
    goalFeasibilityLabel,
    goalFeasibilityScore,
    goalFeasibilityColor,
    goalFeasibilityBg,
    goalFeasibilityNotice,
    goalFeasibilityMemo,
    goalFeasibilityRows,
    blockedGoalRows,
    mandatoryBlockedRows,
    feasibilityLocks,
    availableForGoals,
    goalCapacityBase,
    reservedBuffer,
    mandatoryMonthly,
    importantMonthly,
    optionalMonthly,
    weightedMonthlyNeed,
    mandatoryGoalGap,
    importantGoalGap,
    totalGoalGap,
    requiredMonthlyGoalBuffer,
    requiredDailyGoalBuffer,
    recommendedMode,
    scenarioStatus,
    stressStatus,
    projectionStatus,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: goalFeasibilityStatus === "GOAL_FEASIBLE" && goalFeasibilityScore >= 74 && mandatoryBlockedRows.length === 0 && !recoveryRequired,
  };
}



function buildPredictiveScenarioDecisionRecommendationEngine({
  scenarioEngine = {},
  stressEngine = {},
  projectionEngine = {},
  goalFeasibilityEngine = {},
  closureEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  decisionEngine = {},
  healthEngine = {},
  walletTotal = 0,
  netWorth = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const netMonthlyCashflow = safeIncome - safeExpense;
  const scenarioScore = Math.max(0, Math.min(100, asEngineNumber(scenarioEngine?.scenarioScore)));
  const stressScore = Math.max(0, Math.min(100, asEngineNumber(stressEngine?.stressScore)));
  const projectionScore = Math.max(0, Math.min(100, asEngineNumber(projectionEngine?.projectionScore)));
  const goalScore = Math.max(0, Math.min(100, asEngineNumber(goalFeasibilityEngine?.goalFeasibilityScore)));
  const closureScore = Math.max(0, Math.min(100, asEngineNumber(closureEngine?.closureScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const scenarioStatus = String(scenarioEngine?.scenarioStatus || "SCENARIO_LOCKED").toUpperCase();
  const stressStatus = String(stressEngine?.stressStatus || "STRESS_LOCKED").toUpperCase();
  const projectionStatus = String(projectionEngine?.projectionStatus || "CASHFLOW_LOCKED").toUpperCase();
  const goalFeasibilityStatus = String(goalFeasibilityEngine?.goalFeasibilityStatus || "GOAL_LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || cfoEngine?.gateDecision || "LOCKED").toUpperCase();
  const nextPhaseGate = String(closureEngine?.nextPhaseGate || "LOCKED").toUpperCase();
  const recommendedMode = String(scenarioEngine?.recommendedScenario?.mode || projectionEngine?.recommendedMode || stressEngine?.recommendedMode || goalFeasibilityEngine?.recommendedMode || "LOCKED").toUpperCase();
  const recoveryRequired = !!scenarioEngine?.recoveryRequired || !!stressEngine?.recoveryRequired || !!projectionEngine?.recoveryRequired || !!goalFeasibilityEngine?.recoveryRequired || !!closureEngine?.recoveryRequired || !!cfoEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!scenarioEngine?.growthLocked || !!stressEngine?.growthLocked || !!projectionEngine?.growthLocked || !!goalFeasibilityEngine?.growthLocked || !!closureEngine?.growthLocked || policyMode === "RECOVERY" || gateDecision === "RECOVERY" || nextPhaseGate === "RECOVERY_FIRST";
  const incomeShortfall = Math.max(0, asEngineNumber(decisionEngine?.incomeShortfall));
  const projectionBuffer = Math.max(0, asEngineNumber(projectionEngine?.requiredMonthlyProjectionBuffer));
  const stressBuffer = Math.max(0, asEngineNumber(stressEngine?.requiredStressBuffer));
  const goalBuffer = Math.max(0, asEngineNumber(goalFeasibilityEngine?.requiredMonthlyGoalBuffer));
  const walletRecoveryBuffer = safeWallet < 0 ? Math.ceil(Math.abs(safeWallet) / 3) : 0;
  const netWorthRecoveryBuffer = safeNetWorth < 0 ? Math.ceil(Math.abs(safeNetWorth) / 6) : 0;
  const requiredMonthlyDecisionBuffer = Math.max(incomeShortfall, projectionBuffer, stressBuffer, goalBuffer, walletRecoveryBuffer, netWorthRecoveryBuffer);
  const requiredDailyDecisionBuffer = Math.ceil(requiredMonthlyDecisionBuffer / 30);
  const blockedGoals = Array.isArray(goalFeasibilityEngine?.blockedGoalRows) ? goalFeasibilityEngine.blockedGoalRows.length : 0;
  const mandatoryBlocked = Array.isArray(goalFeasibilityEngine?.mandatoryBlockedRows) ? goalFeasibilityEngine.mandatoryBlockedRows.length : 0;
  const blockers = [];
  if (safeWallet < 0) blockers.push("wallet_negatif");
  if (safeNetWorth < 0) blockers.push("net_worth_negatif");
  if (incomeShortfall > 0) blockers.push("income_shortfall");
  if (["SCENARIO_LOCKED"].includes(scenarioStatus)) blockers.push("scenario_locked");
  if (["STRESS_LOCKED", "STRESS_FAIL"].includes(stressStatus)) blockers.push("stress_failed");
  if (["CASHFLOW_LOCKED", "CASHFLOW_DEFICIT"].includes(projectionStatus)) blockers.push("cashflow_deficit");
  if (["GOAL_LOCKED", "GOAL_GAP"].includes(goalFeasibilityStatus)) blockers.push("goal_gap");
  if (["LOCKED", "BREACH"].includes(complianceStatus)) blockers.push("compliance_breach");
  if (["LOCKED", "RECOVERY"].includes(policyMode)) blockers.push("governance_lock");
  if (["LOCKED", "RECOVERY"].includes(gateDecision)) blockers.push("decision_gate_lock");
  const blendScore = Math.round((scenarioScore * 0.14) + (stressScore * 0.13) + (projectionScore * 0.16) + (goalScore * 0.15) + (closureScore * 0.08) + (advisoryScore * 0.12) + (complianceScore * 0.10) + (governanceScore * 0.07) + (healthScore * 0.05));
  const decisionPenalty =
    (safeWallet < 0 ? 16 : 0) +
    (safeNetWorth < 0 ? 14 : 0) +
    (incomeShortfall > 0 ? 8 : 0) +
    (scenarioStatus === "SCENARIO_LOCKED" ? 18 : scenarioStatus === "SCENARIO_RECOVERY" ? 8 : 0) +
    (stressStatus === "STRESS_LOCKED" ? 18 : stressStatus === "STRESS_FAIL" ? 13 : stressStatus === "STRESS_WATCH" ? 6 : 0) +
    (projectionStatus === "CASHFLOW_LOCKED" ? 20 : projectionStatus === "CASHFLOW_DEFICIT" ? 14 : projectionStatus === "CASHFLOW_WATCH" ? 6 : 0) +
    (goalFeasibilityStatus === "GOAL_LOCKED" ? 17 : goalFeasibilityStatus === "GOAL_GAP" ? 12 : goalFeasibilityStatus === "GOAL_WATCH" ? 5 : 0) +
    (mandatoryBlocked > 0 ? 10 : blockedGoals > 0 ? 5 : 0) +
    (complianceStatus === "LOCKED" ? 13 : complianceStatus === "BREACH" ? 9 : complianceStatus === "WATCH" ? 4 : 0) +
    (growthLocked ? 8 : 0);
  const decisionCap = Math.min(
    safeWallet < 0 ? 42 : 100,
    safeNetWorth < 0 ? 44 : 100,
    projectionStatus === "CASHFLOW_LOCKED" ? 32 : projectionStatus === "CASHFLOW_DEFICIT" ? 58 : 100,
    stressStatus === "STRESS_LOCKED" ? 34 : stressStatus === "STRESS_FAIL" ? 60 : 100,
    goalFeasibilityStatus === "GOAL_LOCKED" ? 36 : goalFeasibilityStatus === "GOAL_GAP" ? 62 : 100,
    complianceStatus === "LOCKED" ? 38 : complianceStatus === "BREACH" ? 64 : 100,
    recoveryRequired ? 68 : 100
  );
  const decisionScore = Math.max(0, Math.min(decisionCap, blendScore - decisionPenalty + 20));
  let decisionStatus = "DECISION_GO";
  let decisionLabel = "Decision GO";
  let decisionRecommendation = "GROWTH_SCENARIO";
  if (blockers.includes("scenario_locked") || blockers.includes("decision_gate_lock") || blockers.includes("governance_lock") || complianceStatus === "LOCKED") {
    decisionStatus = "DECISION_LOCKED";
    decisionLabel = "Decision Locked";
    decisionRecommendation = "LOCKED_SCENARIO";
  } else if (recoveryRequired || decisionScore < 48 || blockers.includes("wallet_negatif") || blockers.includes("net_worth_negatif")) {
    decisionStatus = "DECISION_RECOVERY";
    decisionLabel = "Decision Recovery";
    decisionRecommendation = "RECOVERY_FIRST";
  } else if (decisionScore < 74 || blockers.length > 0 || growthLocked || requiredMonthlyDecisionBuffer > 0) {
    decisionStatus = "DECISION_CONTROL";
    decisionLabel = "Decision Control";
    decisionRecommendation = "CONTROL_SCENARIO";
  }
  const decisionColor = decisionStatus === "DECISION_GO" ? "#86efac" : decisionStatus === "DECISION_CONTROL" ? "#fde68a" : decisionStatus === "DECISION_RECOVERY" ? "#fecaca" : "#94a3b8";
  const decisionBg = decisionStatus === "DECISION_GO" ? "rgba(16,185,129,0.10)" : decisionStatus === "DECISION_CONTROL" ? "rgba(245,158,11,0.11)" : decisionStatus === "DECISION_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const recommendationRows = [];
  recommendationRows.push({
    key: "primary-decision",
    label: decisionRecommendation === "RECOVERY_FIRST" ? "Recovery first" : decisionRecommendation === "CONTROL_SCENARIO" ? "Control scenario" : decisionRecommendation === "LOCKED_SCENARIO" ? "Locked scenario" : "Growth scenario",
    color: decisionColor,
    metric: `${formatRupiah(requiredMonthlyDecisionBuffer)}/bln`,
    action: decisionRecommendation === "RECOVERY_FIRST"
      ? `Pulihkan wallet/cashflow dulu dengan target ${formatRupiah(requiredMonthlyDecisionBuffer)}/bulan.`
      : decisionRecommendation === "CONTROL_SCENARIO"
        ? `Jalankan control scenario sampai buffer ${formatRupiah(requiredMonthlyDecisionBuffer)}/bulan tertutup.`
        : decisionRecommendation === "LOCKED_SCENARIO"
          ? "Jangan tambah ekspansi sampai gate, governance, dan compliance clear."
          : "Growth scenario boleh berjalan dengan guardrail cash dan goal tetap aktif.",
  });
  recommendationRows.push({
    key: "cashflow-decision",
    label: projectionStatus.includes("DEFICIT") || projectionStatus.includes("LOCKED") ? "Cashflow correction" : "Cashflow guard",
    color: projectionStatus.includes("DEFICIT") || projectionStatus.includes("LOCKED") ? "#fecaca" : "#c7d2fe",
    metric: `${formatRupiah(projectionBuffer)}/bln`,
    action: projectionBuffer > 0 ? `Prioritaskan buffer cashflow ${formatRupiah(projectionBuffer)}/bulan sebelum growth.` : "Cashflow projection cukup aman; tetap review 30/60/90 hari.",
  });
  recommendationRows.push({
    key: "goal-decision",
    label: mandatoryBlocked > 0 ? "Goal wajib correction" : blockedGoals > 0 ? "Goal rebalance" : "Goal protected",
    color: mandatoryBlocked > 0 ? "#fecaca" : blockedGoals > 0 ? "#fde68a" : "#86efac",
    metric: `${formatRupiah(goalBuffer)}/bln`,
    action: goalBuffer > 0 ? `Tutup gap goal ${formatRupiah(goalBuffer)}/bulan atau ubah target/deadline.` : "Goal scenario feasible; pertahankan alokasi berjalan.",
  });
  recommendationRows.push({
    key: "stress-decision",
    label: stressStatus === "STRESS_PASS" ? "Stress pass" : "Stress guard",
    color: stressStatus === "STRESS_PASS" ? "#86efac" : stressStatus === "STRESS_WATCH" ? "#fde68a" : "#fecaca",
    metric: `${formatRupiah(stressBuffer)}/bln`,
    action: stressBuffer > 0 ? `Bangun stress buffer ${formatRupiah(stressBuffer)}/bulan untuk shock income/expense/debt.` : "Stress buffer cukup; jangan turunkan disiplin cash target.",
  });
  const decisionLocks = [];
  if (decisionStatus === "DECISION_LOCKED") decisionLocks.push("Scenario decision locked: clear gate/governance/compliance dulu.");
  if (decisionStatus === "DECISION_RECOVERY") decisionLocks.push("Recovery first: negatif/cashflow gap belum boleh ditutup dengan ekspansi.");
  if (decisionStatus === "DECISION_CONTROL") decisionLocks.push("Control scenario: growth boleh dipertimbangkan setelah buffer wajib clear.");
  if (requiredMonthlyDecisionBuffer > 0) decisionLocks.push(`Decision buffer ${formatRupiah(requiredMonthlyDecisionBuffer)}/bulan · ${formatRupiah(requiredDailyDecisionBuffer)}/hari.`);
  if (!decisionLocks.length) decisionLocks.push("Decision recommendation clear: growth boleh berjalan dengan guardrail aktif.");
  const decisionMemo = `${decisionLabel}: ${decisionRecommendation} · mode ${recommendedMode} · blocker ${blockers.length} · buffer ${formatRupiah(requiredMonthlyDecisionBuffer)}/bulan.`;
  const decisionNotice = `Scenario Decision Recommendation 7.1.5: ${decisionRecommendation} · ${decisionStatus} · score ${decisionScore}/100`;
  return {
    decisionStatus,
    decisionLabel,
    decisionRecommendation,
    decisionScore,
    decisionColor,
    decisionBg,
    decisionNotice,
    decisionMemo,
    recommendationRows,
    decisionLocks,
    blockers,
    blockerCount: blockers.length,
    requiredMonthlyDecisionBuffer,
    requiredDailyDecisionBuffer,
    netMonthlyCashflow,
    recommendedMode,
    scenarioStatus,
    stressStatus,
    projectionStatus,
    goalFeasibilityStatus,
    complianceStatus,
    policyMode,
    gateDecision,
    nextPhaseGate,
    recoveryRequired,
    growthLocked,
    ok: decisionStatus === "DECISION_GO" && decisionScore >= 74 && blockers.length === 0 && !recoveryRequired,
  };
}




function buildPredictiveScenarioClosureEngine({
  scenarioEngine = {},
  stressEngine = {},
  projectionEngine = {},
  goalFeasibilityEngine = {},
  decisionRecommendationEngine = {},
  closureEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  healthEngine = {},
  walletTotal = 0,
  netWorth = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const netMonthlyCashflow = safeIncome - safeExpense;
  const scenarioScore = Math.max(0, Math.min(100, asEngineNumber(scenarioEngine?.scenarioScore)));
  const stressScore = Math.max(0, Math.min(100, asEngineNumber(stressEngine?.stressScore)));
  const projectionScore = Math.max(0, Math.min(100, asEngineNumber(projectionEngine?.projectionScore)));
  const goalScore = Math.max(0, Math.min(100, asEngineNumber(goalFeasibilityEngine?.goalFeasibilityScore)));
  const decisionScore = Math.max(0, Math.min(100, asEngineNumber(decisionRecommendationEngine?.decisionScore)));
  const phaseClosureScore = Math.max(0, Math.min(100, asEngineNumber(closureEngine?.closureScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.healthScore)));
  const scenarioStatus = String(scenarioEngine?.scenarioStatus || "SCENARIO_LOCKED").toUpperCase();
  const stressStatus = String(stressEngine?.stressStatus || "STRESS_LOCKED").toUpperCase();
  const projectionStatus = String(projectionEngine?.projectionStatus || "CASHFLOW_LOCKED").toUpperCase();
  const goalFeasibilityStatus = String(goalFeasibilityEngine?.goalFeasibilityStatus || "GOAL_LOCKED").toUpperCase();
  const decisionStatus = String(decisionRecommendationEngine?.decisionStatus || "DECISION_LOCKED").toUpperCase();
  const decisionRecommendation = String(decisionRecommendationEngine?.decisionRecommendation || "LOCKED_SCENARIO").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || cfoEngine?.gateDecision || "LOCKED").toUpperCase();
  const phaseClosureStatus = String(closureEngine?.closureStatus || "PHASE_LOCKED").toUpperCase();
  const nextPhaseGate = String(closureEngine?.nextPhaseGate || "LOCKED").toUpperCase();
  const recommendedMode = String(scenarioEngine?.recommendedScenario?.mode || decisionRecommendationEngine?.recommendedMode || projectionEngine?.recommendedMode || "LOCKED").toUpperCase();
  const recoveryRequired = !!scenarioEngine?.recoveryRequired || !!stressEngine?.recoveryRequired || !!projectionEngine?.recoveryRequired || !!goalFeasibilityEngine?.recoveryRequired || !!decisionRecommendationEngine?.recoveryRequired || !!closureEngine?.recoveryRequired || !!cfoEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0;
  const growthLocked = !!scenarioEngine?.growthLocked || !!stressEngine?.growthLocked || !!projectionEngine?.growthLocked || !!goalFeasibilityEngine?.growthLocked || !!decisionRecommendationEngine?.growthLocked || !!closureEngine?.growthLocked || policyMode === "RECOVERY" || gateDecision === "RECOVERY" || nextPhaseGate === "RECOVERY_FIRST";
  const scenarioBuffer = Math.max(0, asEngineNumber(scenarioEngine?.recommendedScenario?.target), asEngineNumber(scenarioEngine?.targetMonthlyRecovery));
  const stressBuffer = Math.max(0, asEngineNumber(stressEngine?.requiredStressBuffer));
  const projectionBuffer = Math.max(0, asEngineNumber(projectionEngine?.requiredMonthlyProjectionBuffer));
  const goalBuffer = Math.max(0, asEngineNumber(goalFeasibilityEngine?.requiredMonthlyGoalBuffer));
  const decisionBuffer = Math.max(0, asEngineNumber(decisionRecommendationEngine?.requiredMonthlyDecisionBuffer));
  const walletBuffer = safeWallet < 0 ? Math.ceil(Math.abs(safeWallet) / 3) : 0;
  const netWorthBuffer = safeNetWorth < 0 ? Math.ceil(Math.abs(safeNetWorth) / 6) : 0;
  const requiredMonthlyClosureBuffer = Math.max(scenarioBuffer, stressBuffer, projectionBuffer, goalBuffer, decisionBuffer, walletBuffer, netWorthBuffer);
  const requiredDailyClosureBuffer = Math.ceil(requiredMonthlyClosureBuffer / 30);
  const blockers = [];
  if (safeWallet < 0) blockers.push("wallet_negatif");
  if (safeNetWorth < 0) blockers.push("net_worth_negatif");
  if (netMonthlyCashflow < 0) blockers.push("cashflow_negatif");
  if (scenarioStatus === "SCENARIO_LOCKED") blockers.push("scenario_locked");
  if (["STRESS_LOCKED", "STRESS_FAIL"].includes(stressStatus)) blockers.push("stress_not_closed");
  if (["CASHFLOW_LOCKED", "CASHFLOW_DEFICIT"].includes(projectionStatus)) blockers.push("cashflow_not_closed");
  if (["GOAL_LOCKED", "GOAL_GAP"].includes(goalFeasibilityStatus)) blockers.push("goal_not_closed");
  if (["DECISION_LOCKED", "DECISION_RECOVERY"].includes(decisionStatus)) blockers.push("decision_not_closed");
  if (["LOCKED", "BREACH"].includes(complianceStatus)) blockers.push("compliance_not_closed");
  if (["LOCKED", "RECOVERY"].includes(policyMode)) blockers.push("governance_not_closed");
  if (["LOCKED", "RECOVERY"].includes(gateDecision)) blockers.push("gate_not_closed");
  const closureBlend = Math.round((scenarioScore * 0.12) + (stressScore * 0.12) + (projectionScore * 0.14) + (goalScore * 0.14) + (decisionScore * 0.18) + (phaseClosureScore * 0.08) + (advisoryScore * 0.09) + (complianceScore * 0.06) + (governanceScore * 0.04) + (healthScore * 0.03));
  const closurePenalty =
    (safeWallet < 0 ? 18 : 0) +
    (safeNetWorth < 0 ? 16 : 0) +
    (netMonthlyCashflow < 0 ? 10 : 0) +
    (scenarioStatus === "SCENARIO_LOCKED" ? 18 : scenarioStatus === "SCENARIO_RECOVERY" ? 8 : 0) +
    (stressStatus === "STRESS_LOCKED" ? 16 : stressStatus === "STRESS_FAIL" ? 12 : stressStatus === "STRESS_WATCH" ? 5 : 0) +
    (projectionStatus === "CASHFLOW_LOCKED" ? 18 : projectionStatus === "CASHFLOW_DEFICIT" ? 13 : projectionStatus === "CASHFLOW_WATCH" ? 5 : 0) +
    (goalFeasibilityStatus === "GOAL_LOCKED" ? 16 : goalFeasibilityStatus === "GOAL_GAP" ? 12 : goalFeasibilityStatus === "GOAL_WATCH" ? 5 : 0) +
    (decisionStatus === "DECISION_LOCKED" ? 18 : decisionStatus === "DECISION_RECOVERY" ? 13 : decisionStatus === "DECISION_CONTROL" ? 6 : 0) +
    (complianceStatus === "LOCKED" ? 12 : complianceStatus === "BREACH" ? 9 : complianceStatus === "WATCH" ? 4 : 0) +
    (growthLocked ? 7 : 0);
  const closureCap = Math.min(
    safeWallet < 0 ? 40 : 100,
    safeNetWorth < 0 ? 42 : 100,
    scenarioStatus === "SCENARIO_LOCKED" ? 28 : 100,
    stressStatus === "STRESS_LOCKED" ? 30 : stressStatus === "STRESS_FAIL" ? 58 : 100,
    projectionStatus === "CASHFLOW_LOCKED" ? 30 : projectionStatus === "CASHFLOW_DEFICIT" ? 58 : 100,
    goalFeasibilityStatus === "GOAL_LOCKED" ? 34 : goalFeasibilityStatus === "GOAL_GAP" ? 62 : 100,
    decisionStatus === "DECISION_LOCKED" ? 34 : decisionStatus === "DECISION_RECOVERY" ? 58 : 100,
    complianceStatus === "LOCKED" ? 34 : complianceStatus === "BREACH" ? 62 : 100,
    recoveryRequired ? 68 : 100
  );
  const scenarioClosureScore = Math.max(0, Math.min(closureCap, closureBlend - closurePenalty + 22));
  let scenarioClosureStatus = "SCENARIO_READY";
  let scenarioClosureLabel = "Scenario Ready";
  let nextScenarioTrack = "READY_FOR_7_2";
  if (scenarioStatus === "SCENARIO_LOCKED" || complianceStatus === "LOCKED" || gateDecision === "LOCKED" || decisionStatus === "DECISION_LOCKED") {
    scenarioClosureStatus = "SCENARIO_LOCKED";
    scenarioClosureLabel = "Scenario Locked";
    nextScenarioTrack = "LOCKED_BEFORE_7_2";
  } else if (recoveryRequired || decisionStatus === "DECISION_RECOVERY" || scenarioClosureScore < 48) {
    scenarioClosureStatus = "SCENARIO_RECOVERY";
    scenarioClosureLabel = "Scenario Recovery";
    nextScenarioTrack = "RECOVERY_BEFORE_7_2";
  } else if (growthLocked || blockers.length > 0 || requiredMonthlyClosureBuffer > 0 || scenarioClosureScore < 76) {
    scenarioClosureStatus = "SCENARIO_CONTROL";
    scenarioClosureLabel = "Scenario Control";
    nextScenarioTrack = "CONTROLLED_7_2";
  }
  const scenarioClosureColor = scenarioClosureStatus === "SCENARIO_READY" ? "#86efac" : scenarioClosureStatus === "SCENARIO_CONTROL" ? "#fde68a" : scenarioClosureStatus === "SCENARIO_RECOVERY" ? "#fecaca" : "#94a3b8";
  const scenarioClosureBg = scenarioClosureStatus === "SCENARIO_READY" ? "rgba(16,185,129,0.10)" : scenarioClosureStatus === "SCENARIO_CONTROL" ? "rgba(245,158,11,0.11)" : scenarioClosureStatus === "SCENARIO_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const closureRows = [
    {
      key: "scenario-closure",
      label: scenarioClosureLabel,
      color: scenarioClosureColor,
      metric: `${scenarioClosureScore}/100`,
      action: scenarioClosureStatus === "SCENARIO_READY"
        ? "Scenario Simulation 7.1 lengkap; lanjut 7.2 dengan guardrail aktif."
        : scenarioClosureStatus === "SCENARIO_CONTROL"
          ? `Tutup buffer ${formatRupiah(requiredMonthlyClosureBuffer)}/bulan sebelum growth bebas.`
          : scenarioClosureStatus === "SCENARIO_RECOVERY"
            ? "Recovery wajib diprioritaskan sebelum scenario expansion."
            : "Scenario terkunci; clear gate, governance, compliance, dan decision dulu.",
    },
    {
      key: "decision-closure",
      label: decisionRecommendation === "RECOVERY_FIRST" ? "Decision recovery" : decisionRecommendation === "CONTROL_SCENARIO" ? "Decision control" : decisionRecommendation === "LOCKED_SCENARIO" ? "Decision locked" : "Decision growth",
      color: decisionStatus === "DECISION_GO" ? "#86efac" : decisionStatus === "DECISION_CONTROL" ? "#fde68a" : decisionStatus === "DECISION_RECOVERY" ? "#fecaca" : "#94a3b8",
      metric: `${formatRupiah(decisionBuffer)}/bln`,
      action: decisionRecommendationEngine?.decisionMemo || "Decision recommendation belum clear.",
    },
    {
      key: "projection-closure",
      label: projectionStatus === "CASHFLOW_SAFE" ? "Cashflow closed" : "Cashflow guard",
      color: projectionStatus === "CASHFLOW_SAFE" ? "#86efac" : projectionStatus === "CASHFLOW_WATCH" ? "#fde68a" : "#fecaca",
      metric: `${formatRupiah(projectionBuffer)}/bln`,
      action: projectionBuffer > 0 ? `Cashflow buffer ${formatRupiah(projectionBuffer)}/bulan masih wajib.` : "Cashflow projection 30/60/90 sudah masuk baseline.",
    },
    {
      key: "goal-closure",
      label: goalFeasibilityStatus === "GOAL_FEASIBLE" ? "Goal feasible" : "Goal guard",
      color: goalFeasibilityStatus === "GOAL_FEASIBLE" ? "#86efac" : goalFeasibilityStatus === "GOAL_WATCH" ? "#fde68a" : "#fecaca",
      metric: `${formatRupiah(goalBuffer)}/bln`,
      action: goalBuffer > 0 ? `Goal buffer ${formatRupiah(goalBuffer)}/bulan masih perlu ditutup.` : "Goal feasibility sudah masuk scenario closure.",
    },
  ];
  const scenarioClosureLocks = [];
  if (scenarioClosureStatus === "SCENARIO_LOCKED") scenarioClosureLocks.push("Scenario closure locked: gate/governance/compliance/decision belum clear.");
  if (scenarioClosureStatus === "SCENARIO_RECOVERY") scenarioClosureLocks.push("Recovery before expansion: jangan lanjut growth sebelum gap utama tertutup.");
  if (scenarioClosureStatus === "SCENARIO_CONTROL") scenarioClosureLocks.push("Controlled next phase: 7.2 boleh lanjut hanya dengan guardrail aktif.");
  if (requiredMonthlyClosureBuffer > 0) scenarioClosureLocks.push(`Closure buffer ${formatRupiah(requiredMonthlyClosureBuffer)}/bulan · ${formatRupiah(requiredDailyClosureBuffer)}/hari.`);
  if (!scenarioClosureLocks.length) scenarioClosureLocks.push("Scenario closure clear: 7.1 lengkap dan siap menuju 7.2.");
  const scenarioClosureMemo = `${scenarioClosureLabel}: ${nextScenarioTrack} · blocker ${blockers.length} · buffer ${formatRupiah(requiredMonthlyClosureBuffer)}/bulan.`;
  const scenarioClosureNotice = `Scenario Closure 7.1.5: ${nextScenarioTrack} · ${scenarioClosureStatus} · score ${scenarioClosureScore}/100`;
  return {
    scenarioClosureStatus,
    scenarioClosureLabel,
    scenarioClosureScore,
    scenarioClosureColor,
    scenarioClosureBg,
    scenarioClosureNotice,
    scenarioClosureMemo,
    closureRows,
    scenarioClosureLocks,
    blockers,
    blockerCount: blockers.length,
    requiredMonthlyClosureBuffer,
    requiredDailyClosureBuffer,
    nextScenarioTrack,
    netMonthlyCashflow,
    recommendedMode,
    scenarioStatus,
    stressStatus,
    projectionStatus,
    goalFeasibilityStatus,
    decisionStatus,
    decisionRecommendation,
    complianceStatus,
    policyMode,
    gateDecision,
    phaseClosureStatus,
    nextPhaseGate,
    recoveryRequired,
    growthLocked,
    ok: scenarioClosureStatus === "SCENARIO_READY" && scenarioClosureScore >= 76 && blockers.length === 0 && !recoveryRequired,
  };
}



function buildPredictiveAllocationPlanningEngine({
  scenarioClosureEngine = {},
  scenarioEngine = {},
  stressEngine = {},
  projectionEngine = {},
  goalFeasibilityEngine = {},
  decisionRecommendationEngine = {},
  cfoEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  healthEngine = {},
  walletTotal = 0,
  netWorth = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
  mandatoryMonthlyTarget = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const netMonthlyCashflow = safeIncome - safeExpense;
  const scenarioClosureScore = Math.max(0, Math.min(100, asEngineNumber(scenarioClosureEngine?.scenarioClosureScore)));
  const scenarioScore = Math.max(0, Math.min(100, asEngineNumber(scenarioEngine?.scenarioScore)));
  const stressScore = Math.max(0, Math.min(100, asEngineNumber(stressEngine?.stressScore)));
  const projectionScore = Math.max(0, Math.min(100, asEngineNumber(projectionEngine?.projectionScore)));
  const goalScore = Math.max(0, Math.min(100, asEngineNumber(goalFeasibilityEngine?.goalFeasibilityScore)));
  const decisionScore = Math.max(0, Math.min(100, asEngineNumber(decisionRecommendationEngine?.decisionScore)));
  const advisoryScore = Math.max(0, Math.min(100, asEngineNumber(cfoEngine?.advisoryScore)));
  const complianceScore = Math.max(0, Math.min(100, asEngineNumber(complianceEngine?.complianceScore)));
  const governanceScore = Math.max(0, Math.min(100, asEngineNumber(governanceEngine?.governanceScore)));
  const healthScore = Math.max(0, Math.min(100, asEngineNumber(healthEngine?.score ?? healthEngine?.healthScore)));
  const scenarioClosureStatus = String(scenarioClosureEngine?.scenarioClosureStatus || "SCENARIO_LOCKED").toUpperCase();
  const nextScenarioTrack = String(scenarioClosureEngine?.nextScenarioTrack || "LOCKED_BEFORE_7_2").toUpperCase();
  const scenarioStatus = String(scenarioEngine?.scenarioStatus || "SCENARIO_LOCKED").toUpperCase();
  const stressStatus = String(stressEngine?.stressStatus || "STRESS_LOCKED").toUpperCase();
  const projectionStatus = String(projectionEngine?.projectionStatus || "CASHFLOW_LOCKED").toUpperCase();
  const goalFeasibilityStatus = String(goalFeasibilityEngine?.goalFeasibilityStatus || "GOAL_LOCKED").toUpperCase();
  const decisionStatus = String(decisionRecommendationEngine?.decisionStatus || "DECISION_LOCKED").toUpperCase();
  const decisionRecommendation = String(decisionRecommendationEngine?.decisionRecommendation || "LOCKED_SCENARIO").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || "LOCKED").toUpperCase();
  const recoveryRequired = !!scenarioClosureEngine?.recoveryRequired || !!scenarioEngine?.recoveryRequired || !!decisionRecommendationEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0 || decisionRecommendation === "RECOVERY_FIRST";
  const growthLocked = !!scenarioClosureEngine?.growthLocked || !!scenarioEngine?.growthLocked || !!decisionRecommendationEngine?.growthLocked || policyMode === "RECOVERY" || gateDecision === "RECOVERY" || nextScenarioTrack.includes("RECOVERY");
  const scenarioTarget = Math.max(0, asEngineNumber(scenarioEngine?.recommendedScenario?.target), asEngineNumber(scenarioEngine?.targetMonthlyRecovery));
  const closureBuffer = Math.max(0, asEngineNumber(scenarioClosureEngine?.requiredMonthlyClosureBuffer));
  const stressBuffer = Math.max(0, asEngineNumber(stressEngine?.requiredStressBuffer));
  const projectionBuffer = Math.max(0, asEngineNumber(projectionEngine?.requiredMonthlyProjectionBuffer));
  const goalBuffer = Math.max(0, asEngineNumber(goalFeasibilityEngine?.requiredMonthlyGoalBuffer));
  const decisionBuffer = Math.max(0, asEngineNumber(decisionRecommendationEngine?.requiredMonthlyDecisionBuffer));
  const mandatoryBuffer = Math.max(0, asEngineNumber(mandatoryMonthlyTarget));
  const recoveryGap = Math.max(0, safeWallet < 0 ? Math.abs(safeWallet) : 0, safeNetWorth < 0 ? Math.ceil(Math.abs(safeNetWorth) / 6) : 0);
  const requiredMonthlyAllocationBuffer = Math.max(scenarioTarget, closureBuffer, stressBuffer, projectionBuffer, goalBuffer, decisionBuffer, mandatoryBuffer, Math.ceil(recoveryGap / 3));
  const requiredDailyAllocationBuffer = Math.ceil(requiredMonthlyAllocationBuffer / 30);
  const allocatableMonthly = Math.max(0, safeIncome - safeExpense);
  const protectedMonthly = Math.max(0, Math.min(safeIncome, safeExpense + mandatoryBuffer));
  const recoveryAllocation = recoveryRequired ? Math.max(Math.ceil(recoveryGap / 3), decisionBuffer, projectionBuffer) : Math.max(0, Math.ceil(requiredMonthlyAllocationBuffer * 0.25));
  const mandatoryGoalAllocation = Math.max(goalBuffer, mandatoryBuffer);
  const controlBufferAllocation = Math.max(stressBuffer, closureBuffer, Math.ceil(Math.max(0, safeIncome) * 0.05));
  const growthAllocation = (!recoveryRequired && !growthLocked && scenarioClosureStatus === "SCENARIO_READY") ? Math.max(0, allocatableMonthly - mandatoryGoalAllocation - controlBufferAllocation) : 0;
  const allocationShortfall = Math.max(0, requiredMonthlyAllocationBuffer - allocatableMonthly);
  const allocationBlend = Math.round((scenarioClosureScore * 0.18) + (decisionScore * 0.16) + (projectionScore * 0.14) + (goalScore * 0.12) + (stressScore * 0.12) + (scenarioScore * 0.10) + (advisoryScore * 0.08) + (complianceScore * 0.05) + (governanceScore * 0.03) + (healthScore * 0.02));
  const allocationPenalty =
    (safeWallet < 0 ? 18 : 0) +
    (safeNetWorth < 0 ? 16 : 0) +
    (netMonthlyCashflow < 0 ? 14 : 0) +
    (allocationShortfall > 0 ? 12 : 0) +
    (scenarioClosureStatus === "SCENARIO_LOCKED" ? 20 : scenarioClosureStatus === "SCENARIO_RECOVERY" ? 12 : scenarioClosureStatus === "SCENARIO_CONTROL" ? 6 : 0) +
    (decisionStatus === "DECISION_LOCKED" ? 18 : decisionStatus === "DECISION_RECOVERY" ? 12 : decisionStatus === "DECISION_CONTROL" ? 6 : 0) +
    (projectionStatus === "CASHFLOW_LOCKED" ? 16 : projectionStatus === "CASHFLOW_DEFICIT" ? 12 : projectionStatus === "CASHFLOW_WATCH" ? 5 : 0) +
    (goalFeasibilityStatus === "GOAL_LOCKED" ? 14 : goalFeasibilityStatus === "GOAL_GAP" ? 10 : goalFeasibilityStatus === "GOAL_WATCH" ? 4 : 0) +
    (["LOCKED", "BREACH"].includes(complianceStatus) ? 10 : complianceStatus === "WATCH" ? 4 : 0) +
    (growthLocked ? 6 : 0);
  const allocationCap = Math.min(
    safeWallet < 0 ? 40 : 100,
    safeNetWorth < 0 ? 42 : 100,
    scenarioClosureStatus === "SCENARIO_LOCKED" ? 28 : scenarioClosureStatus === "SCENARIO_RECOVERY" ? 58 : 100,
    decisionStatus === "DECISION_LOCKED" ? 32 : decisionStatus === "DECISION_RECOVERY" ? 60 : 100,
    projectionStatus === "CASHFLOW_LOCKED" ? 34 : projectionStatus === "CASHFLOW_DEFICIT" ? 60 : 100,
    allocationShortfall > 0 ? 72 : 100,
    recoveryRequired ? 68 : 100
  );
  const allocationScore = Math.max(0, Math.min(allocationCap, allocationBlend - allocationPenalty + 22));
  let allocationStatus = "ALLOCATION_READY";
  let allocationLabel = "Allocation Ready";
  let allocationMode = "GROWTH_ALLOCATION";
  if (scenarioClosureStatus === "SCENARIO_LOCKED" || decisionStatus === "DECISION_LOCKED" || complianceStatus === "LOCKED" || gateDecision === "LOCKED") {
    allocationStatus = "ALLOCATION_LOCKED";
    allocationLabel = "Allocation Locked";
    allocationMode = "LOCKED_ALLOCATION";
  } else if (recoveryRequired || decisionStatus === "DECISION_RECOVERY" || allocationScore < 48) {
    allocationStatus = "ALLOCATION_RECOVERY";
    allocationLabel = "Recovery Allocation";
    allocationMode = "RECOVERY_ALLOCATION";
  } else if (growthLocked || allocationShortfall > 0 || scenarioClosureStatus === "SCENARIO_CONTROL" || allocationScore < 76) {
    allocationStatus = "ALLOCATION_CONTROL";
    allocationLabel = "Control Allocation";
    allocationMode = "CONTROL_ALLOCATION";
  }
  const allocationColor = allocationStatus === "ALLOCATION_READY" ? "#86efac" : allocationStatus === "ALLOCATION_CONTROL" ? "#fde68a" : allocationStatus === "ALLOCATION_RECOVERY" ? "#fecaca" : "#94a3b8";
  const allocationBg = allocationStatus === "ALLOCATION_READY" ? "rgba(16,185,129,0.10)" : allocationStatus === "ALLOCATION_CONTROL" ? "rgba(245,158,11,0.11)" : allocationStatus === "ALLOCATION_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const allocationRows = [
    {
      key: "income-base",
      label: "Income allocation base",
      color: safeIncome > 0 ? "#c7d2fe" : "#fecaca",
      metric: formatRupiah(safeIncome),
      action: safeIncome > 0 ? `Alokasi dihitung dari income bulanan ${formatRupiah(safeIncome)}.` : "Income bulanan belum cukup sebagai basis alokasi.",
    },
    {
      key: "protected-spend",
      label: "Protected expense",
      color: "#e0e7ff",
      metric: formatRupiah(protectedMonthly),
      action: "Pengeluaran wajib dan kebutuhan dasar dilindungi sebelum growth.",
    },
    {
      key: "recovery-buffer",
      label: recoveryRequired ? "Recovery allocation" : "Reserve allocation",
      color: recoveryRequired ? "#fecaca" : "#fde68a",
      metric: formatRupiah(recoveryAllocation),
      action: recoveryRequired ? "Prioritas pertama: tutup wallet/net worth/cashflow gap." : "Cadangan kontrol tetap disiapkan sebelum ekspansi.",
    },
    {
      key: "goal-buffer",
      label: "Mandatory goal allocation",
      color: mandatoryGoalAllocation > 0 ? "#fde68a" : "#86efac",
      metric: formatRupiah(mandatoryGoalAllocation),
      action: mandatoryGoalAllocation > 0 ? "Goal wajib masuk buffer alokasi, bukan sisa uang." : "Goal wajib tidak memberi gap tambahan saat ini.",
    },
    {
      key: "growth-allocation",
      label: "Growth allocation",
      color: growthAllocation > 0 ? "#86efac" : "#94a3b8",
      metric: formatRupiah(growthAllocation),
      action: growthAllocation > 0 ? "Growth boleh memakai sisa setelah recovery, goal, dan buffer aman." : "Growth ditahan sampai recovery/control clear.",
    },
  ];
  const allocationLocks = [];
  if (allocationStatus === "ALLOCATION_LOCKED") allocationLocks.push("Allocation locked: scenario closure / decision / compliance / gate belum clear.");
  if (recoveryRequired) allocationLocks.push("Recovery allocation wajib menjadi prioritas pertama.");
  if (allocationShortfall > 0) allocationLocks.push(`Allocation shortfall ${formatRupiah(allocationShortfall)}/bulan harus ditutup.`);
  if (growthLocked) allocationLocks.push("Growth allocation ditahan oleh governance/gate/scenario lock.");
  if (!allocationLocks.length) allocationLocks.push("Allocation clear: distribusi cash bisa masuk mode growth terkontrol.");
  const allocationMemo = `${allocationLabel}: ${allocationMode} · buffer ${formatRupiah(requiredMonthlyAllocationBuffer)}/bulan · shortfall ${formatRupiah(allocationShortfall)}.`;
  const allocationNotice = `Allocation Planning 7.2.0: ${allocationMode} · ${allocationStatus} · score ${allocationScore}/100`;
  return {
    allocationStatus,
    allocationLabel,
    allocationMode,
    allocationScore,
    allocationColor,
    allocationBg,
    allocationNotice,
    allocationMemo,
    allocationRows,
    allocationLocks,
    requiredMonthlyAllocationBuffer,
    requiredDailyAllocationBuffer,
    allocationShortfall,
    allocatableMonthly,
    protectedMonthly,
    recoveryAllocation,
    mandatoryGoalAllocation,
    controlBufferAllocation,
    growthAllocation,
    netMonthlyCashflow,
    scenarioClosureStatus,
    nextScenarioTrack,
    scenarioStatus,
    stressStatus,
    projectionStatus,
    goalFeasibilityStatus,
    decisionStatus,
    decisionRecommendation,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: allocationStatus === "ALLOCATION_READY" && allocationScore >= 76 && allocationShortfall === 0 && !recoveryRequired,
  };
}




function buildPredictiveAllocationGuardrailEngine({
  allocationEngine = {},
  scenarioClosureEngine = {},
  projectionEngine = {},
  goalFeasibilityEngine = {},
  decisionRecommendationEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  walletTotal = 0,
  netWorth = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const netMonthlyCashflow = safeIncome - safeExpense;
  const allocationStatus = String(allocationEngine?.allocationStatus || "ALLOCATION_LOCKED").toUpperCase();
  const allocationMode = String(allocationEngine?.allocationMode || "LOCKED_ALLOCATION").toUpperCase();
  const allocationScore = Math.max(0, Math.min(100, asEngineNumber(allocationEngine?.allocationScore)));
  const scenarioClosureStatus = String(scenarioClosureEngine?.scenarioClosureStatus || allocationEngine?.scenarioClosureStatus || "SCENARIO_LOCKED").toUpperCase();
  const projectionStatus = String(projectionEngine?.projectionStatus || allocationEngine?.projectionStatus || "CASHFLOW_LOCKED").toUpperCase();
  const goalFeasibilityStatus = String(goalFeasibilityEngine?.goalFeasibilityStatus || allocationEngine?.goalFeasibilityStatus || "GOAL_LOCKED").toUpperCase();
  const decisionStatus = String(decisionRecommendationEngine?.decisionStatus || allocationEngine?.decisionStatus || "DECISION_LOCKED").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || allocationEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || allocationEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || allocationEngine?.gateDecision || "LOCKED").toUpperCase();
  const allocationShortfall = Math.max(0, asEngineNumber(allocationEngine?.allocationShortfall));
  const requiredMonthlyAllocationBuffer = Math.max(0, asEngineNumber(allocationEngine?.requiredMonthlyAllocationBuffer));
  const recoveryAllocation = Math.max(0, asEngineNumber(allocationEngine?.recoveryAllocation));
  const mandatoryGoalAllocation = Math.max(0, asEngineNumber(allocationEngine?.mandatoryGoalAllocation));
  const controlBufferAllocation = Math.max(0, asEngineNumber(allocationEngine?.controlBufferAllocation));
  const growthAllocation = Math.max(0, asEngineNumber(allocationEngine?.growthAllocation));
  const projectedBuffer = Math.max(0, asEngineNumber(projectionEngine?.requiredMonthlyProjectionBuffer));
  const goalBuffer = Math.max(0, asEngineNumber(goalFeasibilityEngine?.requiredMonthlyGoalBuffer));
  const recoveryRequired = !!allocationEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0 || allocationMode === "RECOVERY_ALLOCATION" || gateDecision === "RECOVERY";
  const growthLocked = !!allocationEngine?.growthLocked || allocationMode === "LOCKED_ALLOCATION" || allocationMode === "RECOVERY_ALLOCATION" || policyMode === "RECOVERY" || gateDecision === "RECOVERY";
  const monthlyRecoveryFloor = recoveryRequired ? Math.max(recoveryAllocation, Math.ceil(Math.abs(Math.min(0, safeWallet)) / 3), projectedBuffer) : Math.max(0, Math.ceil(controlBufferAllocation * 0.35));
  const monthlyGoalFloor = Math.max(mandatoryGoalAllocation, goalBuffer);
  const monthlyReserveFloor = Math.max(controlBufferAllocation, projectedBuffer, Math.ceil(Math.max(0, safeIncome) * 0.05));
  const protectedMonthlyOutflow = Math.max(0, Math.min(safeIncome, safeExpense + monthlyGoalFloor + monthlyRecoveryFloor));
  const monthlySpendLimit = Math.max(0, safeIncome - monthlyRecoveryFloor - monthlyGoalFloor - monthlyReserveFloor);
  const dailySpendLimit = Math.ceil(monthlySpendLimit / 30);
  const growthCap = growthLocked ? 0 : Math.max(0, Math.min(growthAllocation, safeIncome - safeExpense - monthlyRecoveryFloor - monthlyGoalFloor - monthlyReserveFloor));
  const guardrailGap = Math.max(0, monthlyRecoveryFloor + monthlyGoalFloor + monthlyReserveFloor - Math.max(0, netMonthlyCashflow));
  const blockers = [];
  if (safeWallet < 0) blockers.push("wallet_negatif");
  if (safeNetWorth < 0) blockers.push("net_worth_negatif");
  if (netMonthlyCashflow < 0) blockers.push("cashflow_negatif");
  if (allocationStatus === "ALLOCATION_LOCKED") blockers.push("allocation_locked");
  if (allocationStatus === "ALLOCATION_RECOVERY") blockers.push("allocation_recovery");
  if (scenarioClosureStatus === "SCENARIO_LOCKED") blockers.push("scenario_locked");
  if (["CASHFLOW_LOCKED", "CASHFLOW_DEFICIT"].includes(projectionStatus)) blockers.push("cashflow_projection_not_safe");
  if (["GOAL_LOCKED", "GOAL_GAP"].includes(goalFeasibilityStatus)) blockers.push("goal_feasibility_not_safe");
  if (["DECISION_LOCKED", "DECISION_RECOVERY"].includes(decisionStatus)) blockers.push("decision_not_safe");
  if (["LOCKED", "BREACH"].includes(complianceStatus)) blockers.push("compliance_not_safe");
  if (["LOCKED", "RECOVERY"].includes(policyMode)) blockers.push("policy_not_safe");
  if (["LOCKED", "RECOVERY"].includes(gateDecision)) blockers.push("gate_not_safe");
  if (allocationShortfall > 0) blockers.push("allocation_shortfall");
  if (guardrailGap > 0) blockers.push("guardrail_gap");
  const guardrailPenalty =
    (safeWallet < 0 ? 18 : 0) +
    (safeNetWorth < 0 ? 16 : 0) +
    (netMonthlyCashflow < 0 ? 14 : 0) +
    (allocationShortfall > 0 ? 10 : 0) +
    (guardrailGap > 0 ? 10 : 0) +
    (allocationStatus === "ALLOCATION_LOCKED" ? 20 : allocationStatus === "ALLOCATION_RECOVERY" ? 13 : allocationStatus === "ALLOCATION_CONTROL" ? 6 : 0) +
    (["LOCKED", "BREACH"].includes(complianceStatus) ? 9 : complianceStatus === "WATCH" ? 4 : 0) +
    (growthLocked ? 6 : 0);
  const guardrailCap = Math.min(
    safeWallet < 0 ? 38 : 100,
    safeNetWorth < 0 ? 40 : 100,
    allocationStatus === "ALLOCATION_LOCKED" ? 30 : allocationStatus === "ALLOCATION_RECOVERY" ? 58 : 100,
    projectionStatus === "CASHFLOW_LOCKED" ? 34 : projectionStatus === "CASHFLOW_DEFICIT" ? 58 : 100,
    complianceStatus === "LOCKED" ? 34 : complianceStatus === "BREACH" ? 60 : 100,
    guardrailGap > 0 ? 72 : 100,
    recoveryRequired ? 68 : 100
  );
  const guardrailScore = Math.max(0, Math.min(guardrailCap, allocationScore - guardrailPenalty + 18));
  let guardrailStatus = "GUARDRAIL_CLEAR";
  let guardrailLabel = "Guardrail Clear";
  let guardrailMode = "GROWTH_GUARDRAIL";
  if (allocationStatus === "ALLOCATION_LOCKED" || complianceStatus === "LOCKED" || gateDecision === "LOCKED") {
    guardrailStatus = "GUARDRAIL_LOCKED";
    guardrailLabel = "Guardrail Locked";
    guardrailMode = "LOCKED_GUARDRAIL";
  } else if (recoveryRequired || allocationStatus === "ALLOCATION_RECOVERY" || guardrailScore < 48) {
    guardrailStatus = "GUARDRAIL_RECOVERY";
    guardrailLabel = "Recovery Guardrail";
    guardrailMode = "RECOVERY_GUARDRAIL";
  } else if (growthLocked || allocationStatus === "ALLOCATION_CONTROL" || guardrailGap > 0 || allocationShortfall > 0 || guardrailScore < 76) {
    guardrailStatus = "GUARDRAIL_CONTROL";
    guardrailLabel = "Control Guardrail";
    guardrailMode = "CONTROL_GUARDRAIL";
  }
  const guardrailColor = guardrailStatus === "GUARDRAIL_CLEAR" ? "#86efac" : guardrailStatus === "GUARDRAIL_CONTROL" ? "#fde68a" : guardrailStatus === "GUARDRAIL_RECOVERY" ? "#fecaca" : "#94a3b8";
  const guardrailBg = guardrailStatus === "GUARDRAIL_CLEAR" ? "rgba(16,185,129,0.10)" : guardrailStatus === "GUARDRAIL_CONTROL" ? "rgba(245,158,11,0.11)" : guardrailStatus === "GUARDRAIL_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const guardrailRows = [
    {
      key: "spend-limit",
      label: "Monthly spend limit",
      color: monthlySpendLimit > 0 ? "#c7d2fe" : "#fecaca",
      metric: formatRupiah(monthlySpendLimit),
      action: monthlySpendLimit > 0 ? `Batasi pengeluaran fleksibel maksimal ${formatRupiah(monthlySpendLimit)}/bulan.` : "Tidak ada ruang belanja fleksibel; semua cashflow masuk recovery/control.",
    },
    {
      key: "daily-limit",
      label: "Daily spend guard",
      color: dailySpendLimit > 0 ? "#e0e7ff" : "#fecaca",
      metric: formatRupiah(dailySpendLimit),
      action: dailySpendLimit > 0 ? `Batas harian aman sekitar ${formatRupiah(dailySpendLimit)}.` : "Stop discretionary spending sampai cash buffer aman.",
    },
    {
      key: "recovery-floor",
      label: recoveryRequired ? "Recovery floor" : "Reserve floor",
      color: recoveryRequired ? "#fecaca" : "#fde68a",
      metric: formatRupiah(monthlyRecoveryFloor),
      action: recoveryRequired ? "Recovery floor wajib dibayar sebelum goal/growth tambahan." : "Reserve floor menjaga allocation plan tidak bocor ke konsumsi.",
    },
    {
      key: "goal-floor",
      label: "Goal protection floor",
      color: monthlyGoalFloor > 0 ? "#fde68a" : "#86efac",
      metric: formatRupiah(monthlyGoalFloor),
      action: monthlyGoalFloor > 0 ? "Goal wajib diproteksi sebagai floor, bukan sisa cash." : "Goal floor tidak menambah tekanan bulan ini.",
    },
    {
      key: "growth-cap",
      label: "Growth cap",
      color: growthCap > 0 ? "#86efac" : "#94a3b8",
      metric: formatRupiah(growthCap),
      action: growthCap > 0 ? "Growth boleh berjalan maksimal sebesar cap ini." : "Growth cap nol sampai guardrail clear.",
    },
  ];
  const guardrailLocks = [];
  if (guardrailStatus === "GUARDRAIL_LOCKED") guardrailLocks.push("Guardrail locked: allocation/compliance/gate belum clear.");
  if (recoveryRequired) guardrailLocks.push("Recovery floor wajib dipenuhi sebelum spending fleksibel dan growth.");
  if (guardrailGap > 0) guardrailLocks.push(`Guardrail gap ${formatRupiah(guardrailGap)}/bulan harus ditutup.`);
  if (allocationShortfall > 0) guardrailLocks.push(`Allocation shortfall ${formatRupiah(allocationShortfall)}/bulan masih aktif.`);
  if (!guardrailLocks.length) guardrailLocks.push("Guardrail clear: allocation bisa dieksekusi dengan spend limit aktif.");
  const guardrailMemo = `${guardrailLabel}: ${guardrailMode} · spend cap ${formatRupiah(monthlySpendLimit)}/bulan · growth cap ${formatRupiah(growthCap)}.`;
  const guardrailNotice = `Allocation Guardrail 7.2.1: ${guardrailMode} · ${guardrailStatus} · score ${guardrailScore}/100`;
  return {
    guardrailStatus,
    guardrailLabel,
    guardrailMode,
    guardrailScore,
    guardrailColor,
    guardrailBg,
    guardrailNotice,
    guardrailMemo,
    guardrailRows,
    guardrailLocks,
    blockers,
    blockerCount: blockers.length,
    monthlySpendLimit,
    dailySpendLimit,
    monthlyRecoveryFloor,
    monthlyGoalFloor,
    monthlyReserveFloor,
    protectedMonthlyOutflow,
    growthCap,
    guardrailGap,
    allocationShortfall,
    requiredMonthlyAllocationBuffer,
    netMonthlyCashflow,
    allocationStatus,
    allocationMode,
    scenarioClosureStatus,
    projectionStatus,
    goalFeasibilityStatus,
    decisionStatus,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: guardrailStatus === "GUARDRAIL_CLEAR" && guardrailScore >= 76 && guardrailGap === 0 && allocationShortfall === 0 && !recoveryRequired,
  };
}



function buildPredictiveAllocationExecutionEngine({
  allocationEngine = {},
  guardrailEngine = {},
  scenarioClosureEngine = {},
  decisionRecommendationEngine = {},
  complianceEngine = {},
  governanceEngine = {},
  gateEngine = {},
  walletTotal = 0,
  netWorth = 0,
  monthlyIncome = 0,
  monthlyExpense = 0,
} = {}) {
  const safeWallet = asEngineNumber(walletTotal);
  const safeNetWorth = asEngineNumber(netWorth);
  const safeIncome = Math.max(0, asEngineNumber(monthlyIncome));
  const safeExpense = Math.max(0, asEngineNumber(monthlyExpense));
  const netMonthlyCashflow = safeIncome - safeExpense;
  const allocationStatus = String(allocationEngine?.allocationStatus || "ALLOCATION_LOCKED").toUpperCase();
  const allocationMode = String(allocationEngine?.allocationMode || "LOCKED_ALLOCATION").toUpperCase();
  const allocationScore = Math.max(0, Math.min(100, asEngineNumber(allocationEngine?.allocationScore)));
  const guardrailStatus = String(guardrailEngine?.guardrailStatus || "GUARDRAIL_LOCKED").toUpperCase();
  const guardrailMode = String(guardrailEngine?.guardrailMode || "LOCKED_GUARDRAIL").toUpperCase();
  const guardrailScore = Math.max(0, Math.min(100, asEngineNumber(guardrailEngine?.guardrailScore)));
  const scenarioClosureStatus = String(scenarioClosureEngine?.scenarioClosureStatus || guardrailEngine?.scenarioClosureStatus || "SCENARIO_LOCKED").toUpperCase();
  const decisionStatus = String(decisionRecommendationEngine?.decisionStatus || guardrailEngine?.decisionStatus || "DECISION_LOCKED").toUpperCase();
  const decisionRecommendation = String(decisionRecommendationEngine?.decisionRecommendation || allocationEngine?.decisionRecommendation || "LOCKED_SCENARIO").toUpperCase();
  const complianceStatus = String(complianceEngine?.complianceStatus || guardrailEngine?.complianceStatus || "LOCKED").toUpperCase();
  const policyMode = String(governanceEngine?.policyMode || guardrailEngine?.policyMode || "LOCKED").toUpperCase();
  const gateDecision = String(gateEngine?.gateDecision || guardrailEngine?.gateDecision || "LOCKED").toUpperCase();
  const monthlySpendLimit = Math.max(0, asEngineNumber(guardrailEngine?.monthlySpendLimit));
  const dailySpendLimit = Math.max(0, asEngineNumber(guardrailEngine?.dailySpendLimit));
  const monthlyRecoveryFloor = Math.max(0, asEngineNumber(guardrailEngine?.monthlyRecoveryFloor));
  const monthlyGoalFloor = Math.max(0, asEngineNumber(guardrailEngine?.monthlyGoalFloor));
  const monthlyReserveFloor = Math.max(0, asEngineNumber(guardrailEngine?.monthlyReserveFloor));
  const growthCap = Math.max(0, asEngineNumber(guardrailEngine?.growthCap));
  const guardrailGap = Math.max(0, asEngineNumber(guardrailEngine?.guardrailGap));
  const allocationShortfall = Math.max(0, asEngineNumber(allocationEngine?.allocationShortfall ?? guardrailEngine?.allocationShortfall));
  const requiredMonthlyAllocationBuffer = Math.max(0, asEngineNumber(allocationEngine?.requiredMonthlyAllocationBuffer ?? guardrailEngine?.requiredMonthlyAllocationBuffer));
  const recoveryRequired = !!allocationEngine?.recoveryRequired || !!guardrailEngine?.recoveryRequired || safeWallet < 0 || safeNetWorth < 0 || decisionRecommendation === "RECOVERY_FIRST" || gateDecision === "RECOVERY";
  const growthLocked = !!allocationEngine?.growthLocked || !!guardrailEngine?.growthLocked || guardrailMode === "RECOVERY_GUARDRAIL" || guardrailMode === "LOCKED_GUARDRAIL" || policyMode === "RECOVERY" || gateDecision === "RECOVERY";
  const executableBase = Math.max(0, Math.min(safeIncome, safeIncome - Math.max(0, safeExpense)));
  const recoveryExecution = recoveryRequired ? Math.min(executableBase, Math.max(monthlyRecoveryFloor, Math.ceil(Math.abs(Math.min(0, safeWallet)) / 3))) : Math.min(executableBase, Math.ceil(monthlyRecoveryFloor * 0.35));
  const goalExecution = Math.min(Math.max(0, executableBase - recoveryExecution), monthlyGoalFloor);
  const reserveExecution = Math.min(Math.max(0, executableBase - recoveryExecution - goalExecution), monthlyReserveFloor);
  const growthExecution = (!growthLocked && guardrailStatus === "GUARDRAIL_CLEAR") ? Math.min(Math.max(0, executableBase - recoveryExecution - goalExecution - reserveExecution), growthCap) : 0;
  const holdCash = Math.max(0, safeIncome - safeExpense - recoveryExecution - goalExecution - reserveExecution - growthExecution);
  const releaseCashNow = Math.max(0, recoveryExecution + goalExecution + reserveExecution + growthExecution);
  const executionGap = Math.max(0, requiredMonthlyAllocationBuffer - releaseCashNow, guardrailGap, allocationShortfall);
  const blockers = [];
  if (safeWallet < 0) blockers.push("wallet_negatif");
  if (safeNetWorth < 0) blockers.push("net_worth_negatif");
  if (netMonthlyCashflow < 0) blockers.push("cashflow_negatif");
  if (allocationStatus === "ALLOCATION_LOCKED") blockers.push("allocation_locked");
  if (guardrailStatus === "GUARDRAIL_LOCKED") blockers.push("guardrail_locked");
  if (scenarioClosureStatus === "SCENARIO_LOCKED") blockers.push("scenario_locked");
  if (["DECISION_LOCKED", "DECISION_RECOVERY"].includes(decisionStatus)) blockers.push("decision_not_clear");
  if (["LOCKED", "BREACH"].includes(complianceStatus)) blockers.push("compliance_not_clear");
  if (["LOCKED", "RECOVERY"].includes(policyMode)) blockers.push("policy_not_clear");
  if (["LOCKED", "RECOVERY"].includes(gateDecision)) blockers.push("gate_not_clear");
  if (executionGap > 0) blockers.push("execution_gap");
  const executionPenalty =
    (safeWallet < 0 ? 18 : 0) +
    (safeNetWorth < 0 ? 16 : 0) +
    (netMonthlyCashflow < 0 ? 14 : 0) +
    (executionGap > 0 ? 12 : 0) +
    (guardrailStatus === "GUARDRAIL_LOCKED" ? 22 : guardrailStatus === "GUARDRAIL_RECOVERY" ? 14 : guardrailStatus === "GUARDRAIL_CONTROL" ? 7 : 0) +
    (allocationStatus === "ALLOCATION_LOCKED" ? 18 : allocationStatus === "ALLOCATION_RECOVERY" ? 12 : allocationStatus === "ALLOCATION_CONTROL" ? 6 : 0) +
    (["LOCKED", "BREACH"].includes(complianceStatus) ? 10 : complianceStatus === "WATCH" ? 4 : 0) +
    (growthLocked ? 5 : 0);
  const executionCap = Math.min(
    safeWallet < 0 ? 38 : 100,
    safeNetWorth < 0 ? 40 : 100,
    guardrailStatus === "GUARDRAIL_LOCKED" ? 30 : guardrailStatus === "GUARDRAIL_RECOVERY" ? 58 : 100,
    allocationStatus === "ALLOCATION_LOCKED" ? 32 : allocationStatus === "ALLOCATION_RECOVERY" ? 60 : 100,
    executionGap > 0 ? 70 : 100,
    recoveryRequired ? 68 : 100
  );
  const executionScore = Math.max(0, Math.min(executionCap, Math.round((guardrailScore * 0.42) + (allocationScore * 0.28) + (Math.max(0, 100 - Math.min(100, Math.ceil(executionGap / 100000))) * 0.20) + (netMonthlyCashflow >= 0 ? 10 : 0)) - executionPenalty + 18));
  let executionStatus = "EXECUTION_READY";
  let executionLabel = "Execution Ready";
  let executionMode = "GROWTH_EXECUTION";
  if (guardrailStatus === "GUARDRAIL_LOCKED" || allocationStatus === "ALLOCATION_LOCKED" || complianceStatus === "LOCKED" || gateDecision === "LOCKED") {
    executionStatus = "EXECUTION_LOCKED";
    executionLabel = "Execution Locked";
    executionMode = "LOCKED_EXECUTION";
  } else if (recoveryRequired || guardrailStatus === "GUARDRAIL_RECOVERY" || executionScore < 48) {
    executionStatus = "EXECUTION_RECOVERY";
    executionLabel = "Recovery Execution";
    executionMode = "RECOVERY_EXECUTION";
  } else if (growthLocked || guardrailStatus === "GUARDRAIL_CONTROL" || executionGap > 0 || executionScore < 76) {
    executionStatus = "EXECUTION_CONTROL";
    executionLabel = "Control Execution";
    executionMode = "CONTROL_EXECUTION";
  }
  const executionColor = executionStatus === "EXECUTION_READY" ? "#86efac" : executionStatus === "EXECUTION_CONTROL" ? "#fde68a" : executionStatus === "EXECUTION_RECOVERY" ? "#fecaca" : "#94a3b8";
  const executionBg = executionStatus === "EXECUTION_READY" ? "rgba(16,185,129,0.10)" : executionStatus === "EXECUTION_CONTROL" ? "rgba(245,158,11,0.11)" : executionStatus === "EXECUTION_RECOVERY" ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.10)";
  const executionRows = [
    {
      key: "release-now",
      label: "Release cash now",
      color: releaseCashNow > 0 ? "#86efac" : "#94a3b8",
      metric: formatRupiah(releaseCashNow),
      action: releaseCashNow > 0 ? "Cash yang boleh dieksekusi sesuai urutan recovery → goal → reserve → growth." : "Belum ada cash yang aman dieksekusi.",
    },
    {
      key: "recovery-execution",
      label: "Recovery execution",
      color: recoveryExecution > 0 ? "#fecaca" : "#86efac",
      metric: formatRupiah(recoveryExecution),
      action: recoveryExecution > 0 ? "Prioritaskan bayar gap/defisit sebelum alokasi opsional." : "Recovery tidak menjadi tekanan utama bulan ini.",
    },
    {
      key: "goal-execution",
      label: "Goal execution",
      color: goalExecution > 0 ? "#fde68a" : "#94a3b8",
      metric: formatRupiah(goalExecution),
      action: goalExecution > 0 ? "Alokasi goal wajib/penting dapat dieksekusi sesuai floor." : "Goal execution tertahan oleh guardrail atau cashflow.",
    },
    {
      key: "reserve-execution",
      label: "Reserve execution",
      color: reserveExecution > 0 ? "#c7d2fe" : "#94a3b8",
      metric: formatRupiah(reserveExecution),
      action: reserveExecution > 0 ? "Sisihkan reserve agar spending limit tidak bocor." : "Reserve belum bisa dibangun dari cashflow saat ini.",
    },
    {
      key: "growth-execution",
      label: "Growth execution",
      color: growthExecution > 0 ? "#86efac" : "#94a3b8",
      metric: formatRupiah(growthExecution),
      action: growthExecution > 0 ? "Growth boleh berjalan dalam cap ini." : "Growth execution ditahan sampai guardrail clear.",
    },
  ];
  const executionLocks = [];
  if (executionStatus === "EXECUTION_LOCKED") executionLocks.push("Execution locked: guardrail/allocation/compliance/gate belum clear.");
  if (recoveryRequired) executionLocks.push("Recovery execution didahulukan sebelum goal tambahan dan growth.");
  if (executionGap > 0) executionLocks.push(`Execution gap ${formatRupiah(executionGap)}/bulan harus ditutup.`);
  if (holdCash > 0) executionLocks.push(`Hold cash ${formatRupiah(holdCash)} sampai guardrail berikutnya clear.`);
  if (!executionLocks.length) executionLocks.push("Execution clear: allocation bisa dijalankan sesuai urutan prioritas.");
  const executionMemo = `${executionLabel}: ${executionMode} · release ${formatRupiah(releaseCashNow)}/bulan · hold ${formatRupiah(holdCash)}.`;
  const executionNotice = `Allocation Execution 7.2.2: ${executionMode} · ${executionStatus} · score ${executionScore}/100`;
  return {
    executionStatus,
    executionLabel,
    executionMode,
    executionScore,
    executionColor,
    executionBg,
    executionNotice,
    executionMemo,
    executionRows,
    executionLocks,
    blockers,
    blockerCount: blockers.length,
    releaseCashNow,
    holdCash,
    recoveryExecution,
    goalExecution,
    reserveExecution,
    growthExecution,
    executionGap,
    monthlySpendLimit,
    dailySpendLimit,
    monthlyRecoveryFloor,
    monthlyGoalFloor,
    monthlyReserveFloor,
    growthCap,
    guardrailGap,
    allocationShortfall,
    requiredMonthlyAllocationBuffer,
    netMonthlyCashflow,
    allocationStatus,
    allocationMode,
    guardrailStatus,
    guardrailMode,
    scenarioClosureStatus,
    decisionStatus,
    decisionRecommendation,
    complianceStatus,
    policyMode,
    gateDecision,
    recoveryRequired,
    growthLocked,
    ok: executionStatus === "EXECUTION_READY" && executionScore >= 76 && executionGap === 0 && !recoveryRequired,
  };
}


function buildFinancialProgressMonitorGuard({
  walletTotal = 0,
  goalTotal = 0,
  investmentTotal = 0,
  loanTotal = 0,
  grossAssets = 0,
  netWorth = 0,
  debtRatio = 0,
  financialLiquidityWarning = false,
  ledgerValidation = {},
  auditTrailGuard = {},
  stressGuard = {},
  recoveryGuard = {},
  resilienceGuard = {},
  finalSafetyGuard = {},
  finalIntegrityGuard = {},
  finalLockGuard = {},
  closureGuard = {},
  sealGuard = {},
  releaseReadinessGuard = {},
  consolidationGuard = {},
  noBaseline = false,
} = {}) {
  const issues = [];
  const progressActions = [];
  const guardStack = [
    { key: "validation", label: "Validation", guard: ledgerValidation, blocking: asEngineNumber(ledgerValidation.issueCount) > 0 },
    { key: "audit", label: "Audit Trail", guard: auditTrailGuard, blocking: asEngineNumber(auditTrailGuard.issueCount) > 0 },
    { key: "stress", label: "Stress", guard: stressGuard, blocking: asEngineNumber(stressGuard.issueCount) > 0 && (!!stressGuard.liquidityStress || !!stressGuard.debtPressure || !!stressGuard.netWorthFragile) },
    { key: "recovery", label: "Recovery", guard: recoveryGuard, blocking: !!recoveryGuard.critical || asEngineNumber(recoveryGuard.issueCount) > 0 },
    { key: "resilience", label: "Resilience", guard: resilienceGuard, blocking: !!resilienceGuard.critical || !!resilienceGuard.baselineRisk },
    { key: "safety", label: "Safety", guard: finalSafetyGuard, blocking: !!finalSafetyGuard.hardStop },
    { key: "integrity", label: "Integrity", guard: finalIntegrityGuard, blocking: !!finalIntegrityGuard.critical || !!finalIntegrityGuard.netWorthMismatch || !!finalIntegrityGuard.grossAssetMismatch },
    { key: "lock", label: "Lock", guard: finalLockGuard, blocking: !!finalLockGuard.hardLock },
    { key: "closure", label: "Closure", guard: closureGuard, blocking: !!closureGuard.hardClosure || closureGuard.closureReady === false },
    { key: "seal", label: "Seal", guard: sealGuard, blocking: !!sealGuard.hardSeal || sealGuard.sealReady === false },
    { key: "release", label: "Release", guard: releaseReadinessGuard, blocking: !!releaseReadinessGuard.releaseBlocked || releaseReadinessGuard.releaseReady === false },
    { key: "consolidation", label: "Consolidation", guard: consolidationGuard, blocking: !!consolidationGuard.consolidationBlocked || consolidationGuard.consolidationReady === false },
  ];
  const activeGuardRows = guardStack.filter(row => asEngineNumber(row.guard?.issueCount) > 0 || row.blocking);
  const blockingGuardRows = guardStack.filter(row => row.blocking);
  const upstreamIssueCount = guardStack.reduce((sum, row) => sum + asEngineNumber(row.guard?.issueCount), 0);
  const componentCount = [walletTotal, goalTotal, investmentTotal, loanTotal].filter(value => Math.abs(asEngineNumber(value)) > 0).length;
  const formulaDelta = Math.abs((asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal) - asEngineNumber(loanTotal)) - asEngineNumber(netWorth));
  const assetDelta = Math.abs((asEngineNumber(walletTotal) + asEngineNumber(goalTotal) + asEngineNumber(investmentTotal)) - asEngineNumber(grossAssets));
  const formulaDrift = formulaDelta > 1 || assetDelta > 1;
  const healthBlocked = asEngineNumber(walletTotal) < 0 || asEngineNumber(netWorth) < 0 || asEngineNumber(debtRatio) >= 65 || !!financialLiquidityWarning;
  const baselineBlocked = !!noBaseline || componentCount === 0;
  const cascadeBlocked = blockingGuardRows.length > 0;

  if (cascadeBlocked) {
    issues.push("Progress Monitor: guard stack belum clear");
    progressActions.push("Tuntaskan guard blocking paling awal: " + blockingGuardRows.slice(0, 3).map(row => row.label).join(" → ") + ".");
  }
  if (formulaDrift) {
    issues.push("Progress Monitor: formula drift terdeteksi");
    progressActions.push("Recheck komposisi Wallet + Goal + Investasi - Pinjaman terhadap Net Worth.");
  }
  if (healthBlocked) {
    issues.push("Progress Monitor: status sehat masih terkunci");
    progressActions.push("Score sehat tetap ditahan sampai wallet, net worth, liquidity, dan debt pressure aman.");
  }
  if (baselineBlocked) {
    issues.push("Progress Monitor: baseline belum cukup");
    progressActions.push("Lengkapi minimal wallet/data real agar progress engine tidak membaca data kosong sebagai aman.");
  }

  const issueCount = issues.length;
  const monitorBlocked = cascadeBlocked || formulaDrift || baselineBlocked || asEngineNumber(netWorth) < 0 || asEngineNumber(walletTotal) < 0;
  const monitorReview = !monitorBlocked && issueCount > 0;
  const scorePenalty = issueCount > 0 ? Math.min(48, issueCount * 3 + (monitorBlocked ? 16 : 0) + Math.min(12, activeGuardRows.length)) : 0;
  const scoreCap = Math.min(
    formulaDrift ? 51 : 100,
    cascadeBlocked ? 68 : 100,
    asEngineNumber(netWorth) < 0 ? 33 : 100,
    asEngineNumber(walletTotal) < 0 ? 43 : 100,
    asEngineNumber(debtRatio) >= 65 ? 65 : 100,
    financialLiquidityWarning ? 76 : 100,
    baselineBlocked ? 66 : 100,
    activeGuardRows.length > 0 ? 82 : 100
  );
  const progressPenalty = Math.min(100, upstreamIssueCount * 4 + blockingGuardRows.length * 7 + (formulaDrift ? 16 : 0) + (healthBlocked ? 10 : 0) + (baselineBlocked ? 9 : 0));
  const progressPercent = Math.max(0, Math.min(100, Math.round(100 - progressPenalty)));
  const monitorReady = issueCount === 0 && upstreamIssueCount === 0 && !baselineBlocked && !formulaDrift;
  const monitorLabel = monitorReady ? "Ready" : monitorBlocked ? "Blocked" : "Review";
  const activeLockCount = activeGuardRows.length;
  const blockingLockCount = blockingGuardRows.length;
  const primaryAction = progressActions[0] || "Progress Monitor clear. Predictive Scenario Closure Engine 7.1.5 aktif setelah Phase 6.8 freeze.";
  const progressNotice = monitorReady
    ? "Progress 7.1.5: 100% · scenario closure clear · siap baseline Phase 7.1.5."
    : "Progress 7.1.5: " + progressPercent + "% · " + activeLockCount + " guard aktif · " + blockingLockCount + " blocking · " + monitorLabel;

  return {
    issues,
    progressActions,
    primaryAction,
    guardStack,
    activeGuardRows,
    blockingGuardRows,
    activeLockCount,
    blockingLockCount,
    upstreamIssueCount,
    componentCount,
    formulaDelta,
    assetDelta,
    formulaDrift,
    healthBlocked,
    baselineBlocked,
    cascadeBlocked,
    monitorBlocked,
    monitorReview,
    monitorReady,
    monitorLabel,
    progressPercent,
    progressNotice: buildFinancialDeploymentSyncNotice(progressNotice),
    issueCount,
    scorePenalty,
    scoreCap,
    ok: monitorReady,
  };
}


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
  { id: "pendidikan_anak", label: "Pendidikan Anak", icon: "\uD83C\uDF93", type: "expense" },
  { id: "kesehatan_anak", label: "Kesehatan Anak", icon: "\uD83C\uDFE5", type: "expense" },
  { id: "kebutuhan_anak", label: "Kebutuhan Anak", icon: "\uD83E\uDDF8", type: "expense" },
  { id: "hiburan_anak", label: "Hiburan Anak", icon: "\uD83C\uDFA1", type: "expense" },
  { id: "tabungan_anak", label: "Tabungan Anak", icon: "\uD83D\uDCB0", type: "expense" },
  { id: "anak_lainnya", label: "Lainnya Anak", icon: "\uD83D\uDC76", type: "expense" },
  { id: "pinjaman", label: "Pinjaman / Loan", icon: "\uD83C\uDFE6", type: "expense" },
  { id: "hiburan", label: "Hiburan", icon: "\uD83C\uDFAC", type: "expense" },
  { id: "kesehatan", label: "Kesehatan", icon: "\uD83C\uDFE5", type: "expense" },
  { id: "tabungan", label: "Tabungan", icon: "\uD83C\uDFE6", type: "expense" },
  { id: "lainnya_ex", label: "Lainnya", icon: "\u2796", type: "expense" },
];

const CHILD_EXPENSE_CATEGORY_IDS = ["pendidikan_anak", "kesehatan_anak", "kebutuhan_anak", "hiburan_anak", "tabungan_anak", "anak_lainnya"];

const CATEGORY_INPUT_GROUPS = [
  { id: "daily", label: "Harian", hint: "makan, transport, belanja", categoryIds: ["makan", "transport", "belanja"] },
  { id: "child", label: "Anak", hint: "pendidikan, kesehatan, kebutuhan", categoryIds: CHILD_EXPENSE_CATEGORY_IDS },
  { id: "commitment", label: "Komitmen", hint: "tagihan, pinjaman, tabungan", categoryIds: ["tagihan", "pinjaman", "tabungan"] },
  { id: "lifestyle", label: "Lifestyle & Lainnya", hint: "hiburan, kesehatan umum, lainnya", categoryIds: ["hiburan", "kesehatan", "lainnya_ex"] },
];

const INCOME_INPUT_GROUPS = [
  { id: "income", label: "Income", hint: "sumber pemasukan", categoryIds: ["gaji", "freelance", "investasi", "lainnya_in"] },
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
  { id: "settings", label: "Settings", icon: "⚙️", group: "Core" },

  { id: "transaction_add", label: "Tambah Transaksi", icon: "➕", group: "Transaksi" },
  { id: "transaction_view_own", label: "Lihat Transaksi Sendiri", icon: "👤", group: "Transaksi" },
  { id: "transaction_view_all", label: "Lihat Semua Transaksi", icon: "👥", group: "Transaksi" },
  { id: "transaction_edit_own", label: "Edit Transaksi Sendiri", icon: "✏️", group: "Transaksi" },
  { id: "transaction_edit_all", label: "Edit Semua Transaksi", icon: "📝", group: "Transaksi" },
  { id: "transaction_delete_own", label: "Hapus Transaksi Sendiri", icon: "🗑️", group: "Transaksi" },
  { id: "transaction_delete_all", label: "Hapus Semua Transaksi", icon: "🔥", group: "Transaksi" },

  { id: "wallet_view_own", label: "Lihat Wallet Sendiri", icon: "👛", group: "Wallet" },
  { id: "wallet_view_all", label: "Lihat Semua Wallet", icon: "🏦", group: "Wallet" },
  { id: "wallet_create_own", label: "Buat Wallet Sendiri", icon: "➕", group: "Wallet" },
  { id: "wallet_create_member", label: "Buat Wallet Member", icon: "👨‍👩‍👧‍👦", group: "Wallet" },
  { id: "wallet_create_family", label: "Buat Wallet Family/Main", icon: "🏠", group: "Wallet" },
  { id: "wallet_manage_own", label: "Kelola Wallet Sendiri", icon: "🛠️", group: "Wallet" },
  { id: "wallet_manage_all", label: "Kelola Semua Wallet", icon: "🧰", group: "Wallet" },
  { id: "wallet_adjust", label: "Penyesuaian Saldo Wallet", icon: "🧭", group: "Wallet" },
  { id: "wallet_merge", label: "Merge Wallet", icon: "🔀", group: "Wallet" },
  { id: "wallet_archive", label: "Arsip/Nonaktif Wallet", icon: "📦", group: "Wallet" },

  { id: "goal_view_public", label: "Lihat Goal Public", icon: "🎯", group: "Goal" },
  { id: "goal_view_sensitive", label: "Lihat Goal Sensitif", icon: "🔒", group: "Goal" },
  { id: "goal_contribute", label: "Alokasi ke Goal", icon: "➕", group: "Goal" },
  { id: "goal_manage", label: "Kelola Goal", icon: "🧭", group: "Goal" },

  { id: "investment_view", label: "Lihat Investasi", icon: "📈", group: "Sensitif" },
  { id: "investment_manage", label: "Kelola Investasi", icon: "🧰", group: "Sensitif" },
  { id: "loan_view", label: "Lihat Pinjaman", icon: "🏦", group: "Sensitif" },
  { id: "loan_manage", label: "Kelola Pinjaman", icon: "💳", group: "Sensitif" },
  { id: "financial_summary_view", label: "Lihat Net Worth / Financial Summary", icon: "🧠", group: "Sensitif" },
  { id: "financial_health_view", label: "Lihat Financial Health", icon: "❤️‍🩹", group: "Sensitif" },

  { id: "family_manage", label: "Family Management", icon: "👨‍👩‍👧‍👦", group: "Family Admin" },
  { id: "permission_manage", label: "Permission Manager", icon: "🛡️", group: "Family Admin" },
  { id: "security", label: "Security / PIN", icon: "🔐", group: "Family Admin" },

  { id: "sync", label: "Sync Google Sheets", icon: "📊", group: "Backup" },
  { id: "reports", label: "Email Report", icon: "✉️", group: "Backup" },
  { id: "backup_export", label: "Backup / Export", icon: "💾", group: "Backup" },

  { id: "activity_log_view", label: "Activity Log", icon: "📝", group: "System" },
  { id: "recycle_bin_view", label: "Recycle Bin", icon: "♻️", group: "System" },

  // Legacy aliases kept so old Firestore permissions do not break during migration.
  { id: "transaction_edit", label: "Legacy: Edit Transaksi", icon: "✏️", group: "Legacy" },
  { id: "transaction_delete", label: "Legacy: Hapus Transaksi", icon: "🗑️", group: "Legacy" },
  { id: "goals", label: "Legacy: Tabungan / Goal", icon: "🎯", group: "Legacy" },
  { id: "investments", label: "Legacy: Investasi", icon: "📈", group: "Legacy" },
  { id: "gadai", label: "Legacy: Pinjaman / Loan", icon: "🏦", group: "Legacy" },
  { id: "wallets", label: "Legacy: Sumber Dana", icon: "👛", group: "Legacy" },
  { id: "backup", label: "Legacy: Export Backup", icon: "💾", group: "Legacy" },
  { id: "activity_log", label: "Legacy: Activity Log", icon: "📝", group: "Legacy" },
  { id: "recycle_bin", label: "Legacy: Recycle Bin", icon: "♻️", group: "Legacy" },
];

const ROLE_PERMISSION_PRESET_V110 = {
  Owner: PERMISSIONS_V110.map(p => p.id),
  Admin: [
    "dashboard", "history", "settings",
    "transaction_add", "transaction_view_own", "transaction_view_all", "transaction_edit_own", "transaction_edit_all", "transaction_delete_own",
    "wallet_view_own", "wallet_view_all", "wallet_create_member", "wallet_manage_own", "wallet_adjust", "wallet_archive",
    "goal_view_public", "goal_view_sensitive", "goal_contribute",
    "investment_view", "loan_view", "financial_summary_view", "financial_health_view",
    "sync", "reports"
  ],
  Member: [
    "dashboard", "history", "settings",
    "transaction_add", "transaction_view_own", "transaction_edit_own",
    "wallet_view_own",
    "goal_view_public"
  ],
  Viewer: ["dashboard", "history", "settings"],
};

const OWNER_LOCKED_PERMISSIONS_V110 = [
  "dashboard", "settings", "family_manage", "permission_manage", "security",
  "activity_log_view", "financial_summary_view", "wallet_view_all", "wallet_create_own", "wallet_create_member", "wallet_create_family", "wallet_manage_all", "wallet_adjust", "wallet_merge", "wallet_archive"
];

function expandLegacyPermissions(roleLabel, permissionIds) {
  const set = new Set(permissionIds || []);
  const has = (id) => set.has(id);

  if (has("history")) set.add("transaction_view_own");
  if (roleLabel === "Owner" || roleLabel === "Admin") {
    if (has("history")) set.add("transaction_view_all");
  }

  if (has("transaction_edit")) {
    set.add(roleLabel === "Member" ? "transaction_edit_own" : "transaction_edit_all");
  }
  if (has("transaction_delete")) {
    set.add(roleLabel === "Member" ? "transaction_delete_own" : "transaction_delete_all");
  }

  if (has("wallets")) {
    set.add("wallet_view_own");
    if (roleLabel === "Owner" || roleLabel === "Admin") {
      set.add("wallet_view_all");
      set.add("wallet_manage_own");
      set.add("wallet_adjust");
      set.add("wallet_archive");
    }
    if (roleLabel === "Admin") set.add("wallet_create_member");
    if (roleLabel === "Owner") {
      set.add("wallet_create_own");
      set.add("wallet_create_member");
      set.add("wallet_create_family");
      set.add("wallet_manage_all");
      set.add("wallet_merge");
    }
  }

  if (has("goals")) {
    set.add("goal_view_public");
    if (roleLabel === "Owner" || roleLabel === "Admin") set.add("goal_view_sensitive");
    if (roleLabel !== "Viewer") set.add("goal_contribute");
  }

  if (has("investments")) {
    if (roleLabel === "Owner" || roleLabel === "Admin") set.add("investment_view");
    if (roleLabel === "Owner") set.add("investment_manage");
  }

  if (has("gadai")) {
    if (roleLabel === "Owner" || roleLabel === "Admin") set.add("loan_view");
    if (roleLabel === "Owner") set.add("loan_manage");
  }

  if (has("backup")) set.add("backup_export");
  if (has("activity_log")) set.add("activity_log_view");
  if (has("recycle_bin")) set.add("recycle_bin_view");
  if (roleLabel === "Owner" || roleLabel === "Admin") {
    if (has("investments") || has("gadai") || has("wallets")) set.add("financial_summary_view");
  }

  return [...set];
}

function normalizePermissionData(data) {
  const allowedIds = new Set(PERMISSIONS_V110.map(p => p.id));
  const normalized = {};
  FAMILY_ROLES_V110.forEach(role => {
    const base = Array.isArray(data?.[role.label]) ? data[role.label] : (ROLE_PERMISSION_PRESET_V110[role.label] || []);
    const expanded = expandLegacyPermissions(role.label, base);
    const clean = expanded.filter(id => allowedIds.has(id));
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
  { id: "education", label: "🎓 Pendidikan", color: "#6366f1", hint: "biru" },
  { id: "future", label: "🏠 Masa Depan", color: "#10b981", hint: "hijau" },
  { id: "pension", label: "👴 Pensiun", color: "#14b8a6", hint: "teal" },
  { id: "health", label: "🏥 Kesehatan", color: "#ef4444", hint: "merah" },
  { id: "custom", label: "✨ Custom", color: "#8b5cf6", hint: "ungu" },
];

const EDUCATION_CHILDREN = [
  { id: "aroon", label: "📚 Aroon", color: "#60a5fa" },
  { id: "arunika", label: "📚 Arunika", color: "#ec4899" },
  { id: "arkaja", label: "📚 Arkaja", color: "#f59e0b" },
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
  const p = String(goal?.priority || "").toLowerCase();
  if (p === "wajib") return "Wajib";
  if (p === "penting") return "Penting";
  if (p === "opsional") return "Opsional";
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

    return { usdIdr: Math.round(usdIdr), goldPerGram: antamPerGram, jewelryPerGram, goldSpot, lastUpdated: new Date().toLocaleString("id-ID"), source: "Frankfurter FX + GoldPrice estimate", status: "refreshed" };
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
  const [customGoals, setCustomGoals] = useState([]);
  const [goalOverrides, setGoalOverrides] = useState({});
  const [goalUsageLog, setGoalUsageLog] = useState([]);
  const [marketPrices, setMarketPrices] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [savingsTab, setSavingsTab] = useState("education");
  const [selectedEducationChild, setSelectedEducationChild] = useState("aroon");
  const [showForm, setShowForm] = useState(false);
  const [showInvForm, setShowInvForm] = useState(false);
  const [showSavingsForm, setShowSavingsForm] = useState(null);
  const [showGoalBuilder, setShowGoalBuilder] = useState(false);
  const [showGoalTemplateManager, setShowGoalTemplateManager] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedPermissionRole, setSelectedPermissionRole] = useState(null);
  const [expandedPermissionGroups, setExpandedPermissionGroups] = useState({});
  const [goalBuilderForm, setGoalBuilderForm] = useState({
    label: "",
    icon: "🎯",
    category: "future",
    targetAmount: "",
    yearsLeft: "",
    priority: "penting",
    desc: "",
    visibility: "owner_admin",
    fundingType: "mixed",
    status: "active",
    color: "#6366f1",
    program: "",
    provider: "",
    beneficiary: "",
    premiumAmount: "",
    coverageAmount: "",
    renewalCycle: "",
  });
  const [showGoalUsage, setShowGoalUsage] = useState(null);
  const [goalUsageForm, setGoalUsageForm] = useState({
    mode: "cash",
    amount: "",
    assetHoldingId: "",
    assetQty: "",
    category: "pendidikan",
    usedFor: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [showAssetConvert, setShowAssetConvert] = useState(null);
  const [showGadaiForm, setShowGadaiForm] = useState(false);
  const [showGadaiCalc, setShowGadaiCalc] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionEditMode, setTransactionEditMode] = useState(false);
  const [transactionEditStatus, setTransactionEditStatus] = useState("");
  const [transactionGoalLinkForm, setTransactionGoalLinkForm] = useState({ goalId: "", status: "" });
  const [transactionEditForm, setTransactionEditForm] = useState({
    type: "expense",
    category: "makan",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    user: "",
    sumberDanaId: "",
    note: "",
    revisionReason: "",
  });
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [investmentEditMode, setInvestmentEditMode] = useState(false);
  const [investmentEditForm, setInvestmentEditForm] = useState({ assetType: "lm", qty: "", costBasis: "", ticker: "", note: "", manualPrice: "", buyDate: "" });
  const [assetToGoalInvestment, setAssetToGoalInvestment] = useState(null);
  const [assetToGoalForm, setAssetToGoalForm] = useState({ goalId: "", qty: "", note: "" });
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFamilyLogUser, setSelectedFamilyLogUser] = useState(null);
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
  const [walletAdjustForm, setWalletAdjustForm] = useState({ targetBalance: "", note: "" });
  const [showWalletTransfer, setShowWalletTransfer] = useState(false);
  const [walletTransferForm, setWalletTransferForm] = useState({
    sourceWalletId: "",
    destinationWalletId: "",
    amount: "",
    purpose: "uang_saku",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [transactionSDId, setTransactionSDId] = useState("");
  const [savingsSDId, setSavingsSDId] = useState("");
  const [assetSDId, setAssetSDId] = useState("");
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("finplan_user") || "");
  const [form, setForm] = useState({
    type: "expense",
    category: "makan",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
    user: currentUser || "",
    goalId: "",
  });
  const [invForm, setInvForm] = useState({ type: "usd", amount: "", buyPrice: "", note: "", buyDate: new Date().toISOString().split("T")[0] });
  const [savingsInput, setSavingsInput] = useState("");
  const [savingsInputDisplay, setSavingsInputDisplay] = useState("");
  const [assetForm, setAssetForm] = useState({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" });
  const [amountDisplay, setAmountDisplay] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateRangeMode, setDateRangeMode] = useState("month");
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [filterUser, setFilterUser] = useState("semua");
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txCategoryFilter, setTxCategoryFilter] = useState("all");
  const [txSortMode, setTxSortMode] = useState("newest");
  const [txIntelligenceCompact, setTxIntelligenceCompact] = useState(true);
  const [showAdvancedTxFilters, setShowAdvancedTxFilters] = useState(false);
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
  const [investmentLogs, setInvestmentLogs] = useState([]);
  const [loanPayments, setLoanPayments] = useState([]);
  const [walletTransfers, setWalletTransfers] = useState([]);
  const [backupExportStatus, setBackupExportStatus] = useState("");
  const [recycleBin, setRecycleBin] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [recycleStatus, setRecycleStatus] = useState("");
  const [rolePermissions, setRolePermissions] = useState(ROLE_PERMISSION_PRESET_V110);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [familyPanel, setFamilyPanel] = useState("members");
  const [familyView, setFamilyView] = useState("overview");
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [showLogAuditCenter, setShowLogAuditCenter] = useState(false);

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
    const unsub8 = onSnapshot(collection(db, "goalUsage"), snap => { setGoalUsageLog(sortTxns(mapDocs(snap))); }, err => console.error("goalUsage listener error:", err));
    const unsub9 = onSnapshot(collection(db, "customGoals"), snap => { setCustomGoals(sortTxns(mapDocs(snap))); }, err => console.error("customGoals listener error:", err));
    const unsub10 = onSnapshot(doc(db, "savings", "goalOverrides"), snap => { setGoalOverrides(snap.exists() ? (snap.data()?.items || {}) : {}); }, err => console.error("goalOverrides listener error:", err));
    const unsub11 = onSnapshot(collection(db, "investmentLogs"), snap => { setInvestmentLogs(sortTxns(mapDocs(snap))); }, err => console.error("investmentLogs listener error:", err));
    const unsub12 = onSnapshot(collection(db, "loanPayments"), snap => { setLoanPayments(sortTxns(mapDocs(snap))); }, err => console.error("loanPayments listener error:", err));
    const unsub13 = onSnapshot(collection(db, "walletTransfers"), snap => { setWalletTransfers(sortTxns(mapDocs(snap))); }, err => console.error("walletTransfers listener error:", err));

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12(); unsub13(); };
  }, [currentUser]);

  useEffect(() => { if (activeTab === "invest" && !marketPrices) loadPrices(); }, [activeTab]);
  useEffect(() => { if (activeTab === "savings" && !marketPrices) loadPrices(); }, [activeTab]);
  useEffect(() => { if (currentUser && !walletFilterUser) setWalletFilterUser(currentUser); }, [currentUser]);
  useEffect(() => {
    setTransactionEditMode(false);
    setTransactionEditStatus("");
    setTransactionGoalLinkForm({ goalId: "", status: "" });
  }, [selectedTransaction?.id]);

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
        setActivityLog(items.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))));
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
    setInvestmentEditMode(false);
    setAssetToGoalInvestment(null);
    setShowWalletTransfer(false);
    setShowGoalBuilder(false);
    setShowGoalTemplateManager(false);
    setShowPeriodPicker(false);
    setSelectedPermissionRole(null);
    setEditingGoal(null);
    setShowGoalUsage(null);
    setSelectedGoal(null);
    setSelectedCategory(null);
    setSelectedFamilyLogUser(null);
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

  async function addInvestmentLog(investmentId, action, detail, extra = {}) {
    if (!investmentId) return;
    try {
      await addDoc(collection(db, "investmentLogs"), {
        investmentId,
        action,
        detail: detail || "",
        actor: currentUser || "System",
        createdAt: new Date().toISOString(),
        ...extra,
      });
    } catch (err) {
      console.error("investment log write error:", err);
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
    const idrCash = asEngineNumber(savingsData[goalId] || 0);
    const holdings = (savingsHoldings[goalId] || []).filter(h => isFinancialRecordActive(h));
    const assetValue = holdings.reduce((sum, h) => sum + calcAssetValue(h, marketPrices), 0);
    return idrCash + assetValue;
  }

  function getGoalFinancialBreakdown(goals = savingsGoals) {
    let cashTotal = 0;
    let assetTotal = 0;
    let duplicateGuardTotal = 0;
    const countedRows = [];
    const duplicateGuardRows = [];

    (goals || []).filter(g => isFinancialRecordActive(g)).forEach(goal => {
      const goalId = goal.id;
      const cashValue = asEngineNumber(savingsData?.[goalId] || 0);
      if (cashValue > 0) {
        cashTotal += cashValue;
        countedRows.push({ goalId, goalLabel: goal.label || goalId, mode: "cash", value: cashValue, counted: true });
      }

      const holdings = Array.isArray(savingsHoldings?.[goalId]) ? savingsHoldings[goalId] : [];
      holdings.filter(h => isFinancialRecordActive(h)).forEach(holding => {
        const value = asEngineNumber(calcAssetValue(holding, marketPrices));
        if (value <= 0) return;

        const sourceInvestmentId = holding.sourceInvestmentId ? String(holding.sourceInvestmentId) : "";
        const sourceInvestment = sourceInvestmentId
          ? investments.find(inv => String(inv.id) === sourceInvestmentId)
          : null;

        // Release Readiness Guard 6.8.13.0:
        // If a Goal holding points to an investment but the investment has not been marked/reduced by the move flow,
        // count the investment side and exclude the Goal copy from Net Worth to avoid double counting the same asset.
        const sourceStillLooksUnreduced = Boolean(
          sourceInvestmentId &&
          sourceInvestment &&
          isFinancialAssetActive(sourceInvestment) &&
          !sourceInvestment.movedToGoalAt &&
          !sourceInvestment.restoredFromGoalAt &&
          asEngineNumber(sourceInvestment.qty ?? sourceInvestment.amount ?? 0) > 0
        );

        const row = {
          goalId,
          goalLabel: goal.label || goalId,
          mode: "asset",
          value,
          assetType: holding.assetType || "asset",
          sourceInvestmentId,
          sourceInvestmentName: holding.sourceInvestmentName || sourceInvestment?.ticker || sourceInvestment?.note || "",
          counted: !sourceStillLooksUnreduced,
        };

        if (sourceStillLooksUnreduced) {
          duplicateGuardTotal += value;
          duplicateGuardRows.push(row);
        } else {
          assetTotal += value;
          countedRows.push(row);
        }
      });
    });

    return {
      cashTotal,
      assetTotal,
      total: cashTotal + assetTotal,
      countedRows,
      duplicateGuardRows,
      duplicateGuardTotal,
    };
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

  const earlyFamilyMembersForScope = Array.isArray(familyMembers) && familyMembers.length > 0 ? familyMembers : FAMILY_MEMBERS_V110;
  const earlyCurrentMemberForScope = earlyFamilyMembersForScope.find(member => member.name === currentUser) || FAMILY_MEMBERS_V110[0];
  const earlyCurrentRoleForScope = earlyCurrentMemberForScope?.role || "Viewer";
  const earlyIsOwnerForScope = earlyCurrentRoleForScope === "Owner";
  const earlyPermissionsForScope = normalizePermissionData(rolePermissions)?.[earlyCurrentRoleForScope] || ROLE_PERMISSION_PRESET_V110[earlyCurrentRoleForScope] || [];
  const earlyHasPermission = (id) => earlyPermissionsForScope.includes(id);
  const canViewAllTransactionsNow = earlyIsOwnerForScope || earlyHasPermission("transaction_view_all");
  const canViewFinancialSummaryNow = earlyIsOwnerForScope || earlyHasPermission("financial_summary_view");
  const canViewInvestmentsNow = earlyIsOwnerForScope || earlyHasPermission("investment_view");
  const canViewLoansNow = earlyIsOwnerForScope || earlyHasPermission("loan_view");
  const canViewSensitiveGoalsNow = earlyIsOwnerForScope || earlyHasPermission("goal_view_sensitive");
  const effectiveFilterUser = canViewAllTransactionsNow ? filterUser : currentUser;

  const userTxns = transactions.filter(t => effectiveFilterUser === "semua" || t.user === effectiveFilterUser);

  function parseLocalDateString(value) {
    if (!value) return new Date();
    const parts = String(value).split("-");
    if (parts.length >= 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) return new Date(y, m, d);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function toLocalDateInput(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function shiftSelectedDate(days) {
    const d = parseLocalDateString(selectedDate);
    d.setDate(d.getDate() + days);
    const next = toLocalDateInput(d);
    setSelectedDate(next);
    setFilterMonth(d.getMonth());
  }

  function goToday() {
    const d = new Date();
    setSelectedDate(toLocalDateInput(d));
    setFilterMonth(d.getMonth());
    setDateRangeMode("day");
  }

  function isSameLocalDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isTxnInSelectedRange(txn) {
    const d = getTxnDate(txn);
    if (!d) return false;
    const base = parseLocalDateString(selectedDate);
    if (dateRangeMode === "day") return isSameLocalDay(d, base);
    if (dateRangeMode === "week") {
      const start = new Date(base); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
      const end = new Date(base); end.setHours(23,59,59,999);
      return d >= start && d <= end;
    }
    return d.getMonth() === base.getMonth() && d.getFullYear() === base.getFullYear();
  }

  const periodBaseDate = parseLocalDateString(selectedDate);
  const periodYears = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - 5 + i);
  const rangeLabel = periodBaseDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const filteredPeriodTxns = userTxns.filter(isTxnInSelectedRange);
  const familyLogPeriodTxns = (canViewAllTransactionsNow ? transactions : userTxns).filter(isTxnInSelectedRange);
  const filteredMonthTxns = filteredPeriodTxns; // legacy alias for existing summary code
  const baseDisplayTxns = filteredPeriodTxns; // Phase 6.7.5e: respect selected period; do not fallback to other periods
  const normalizedTxSearch = txSearch.trim().toLowerCase();
  const txCategoryOptions = CATEGORIES.filter(c => txTypeFilter === "all" || c.type === txTypeFilter);
  const displayTxns = baseDisplayTxns
    .filter(t => {
      const typeOk = txTypeFilter === "all" || t.type === txTypeFilter;
      const txnCategoryId = t.category || "uncategorized";
      const categoryOk = txCategoryFilter === "all" || txnCategoryId === txCategoryFilter;
      const cat = getCategoryInfo(t.category, t);
      const searchable = [
        t.note, t.notes, t.date, t.user, t.userName, t.sumberDanaName, t.sumberDanaId, t.sourceFund, cat.label, cat.icon, t.type
      ].filter(Boolean).join(" ").toLowerCase();
      const searchOk = !normalizedTxSearch || searchable.includes(normalizedTxSearch);
      return typeOk && categoryOk && searchOk;
    })
    .sort((a, b) => {
      const aDate = getTxnDate(a)?.getTime() || 0;
      const bDate = getTxnDate(b)?.getTime() || 0;
      const aAmount = Number(a.amount || 0);
      const bAmount = Number(b.amount || 0);
      if (txSortMode === "oldest") return aDate - bDate;
      if (txSortMode === "biggest") return bAmount - aAmount;
      if (txSortMode === "smallest") return aAmount - bAmount;
      return bDate - aDate;
    });
  const totalIncome = filteredPeriodTxns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = filteredPeriodTxns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const visibleIncome = displayTxns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const visibleExpense = displayTxns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const visibleNetFlow = visibleIncome - visibleExpense;
  const expenseByCategory = {};
  displayTxns.filter(t => t.type === "expense").forEach(t => { expenseByCategory[t.category || "uncategorized"] = (expenseByCategory[t.category || "uncategorized"] || 0) + Number(t.amount || 0); });
  const topExpenseEntry = Object.entries(expenseByCategory).sort((a,b) => b[1] - a[1])[0] || null;
  const topExpenseCategory = topExpenseEntry ? getCategoryInfo(topExpenseEntry[0]) : null;
  const biggestVisibleExpense = displayTxns.filter(t => t.type === "expense").sort((a,b) => Number(b.amount || 0) - Number(a.amount || 0))[0] || null;
  function buildCategoryDrilldown(rows) {
    const map = {};
    rows.forEach(t => {
      const id = t.category || "uncategorized";
      const meta = getCategoryInfo(id, t);
      const amount = Number(t.amount || 0);
      if (!map[id]) map[id] = { id, label: meta?.label || "Tanpa Kategori", icon: meta?.icon || "🧾", type: t.type || "expense", income: 0, expense: 0, count: 0 };
      if (t.type === "income") map[id].income += amount;
      if (t.type === "expense") map[id].expense += amount;
      map[id].count += 1;
    });
    return Object.values(map).sort((a,b) => (b.expense - a.expense) || (b.income - a.income) || (b.count - a.count));
  }
  const periodCategoryDrilldown = buildCategoryDrilldown(filteredPeriodTxns).slice(0, 6);
  const visibleIncomeCount = displayTxns.filter(t => t.type === "income").length;
  const visibleExpenseCount = displayTxns.filter(t => t.type === "expense").length;
  const topExpenseShare = topExpenseEntry && visibleExpense > 0 ? Math.round((Number(topExpenseEntry[1] || 0) / visibleExpense) * 100) : 0;
  const averageVisibleExpense = visibleExpenseCount > 0 ? visibleExpense / visibleExpenseCount : 0;
  const biggestExpenseShare = biggestVisibleExpense && visibleExpense > 0 ? Math.round((Number(biggestVisibleExpense.amount || 0) / visibleExpense) * 100) : 0;
  const visibleUncategorizedCount = displayTxns.filter(t => !t.category).length;
  const visibleNoSourceCount = displayTxns.filter(t => !(t.sumberDanaName || t.sumberDanaId || t.sourceFund)).length;
  const visibleNoNoteCount = displayTxns.filter(t => !(t.note || t.notes)).length;
  const highExpenseThreshold = averageVisibleExpense > 0 ? Math.max(averageVisibleExpense * 2, 250000) : 0;
  const highExpenseCount = highExpenseThreshold > 0 ? displayTxns.filter(t => t.type === "expense" && Number(t.amount || 0) >= highExpenseThreshold).length : 0;
  function getTransactionReviewReasons(tx) {
    const reasons = [];
    if (!tx?.category) reasons.push("Tanpa kategori");
    if (!(tx?.sumberDanaName || tx?.sumberDanaId || tx?.sourceFund)) reasons.push("Tanpa sumber dana");
    if (!(tx?.note || tx?.notes)) reasons.push("Tanpa catatan");
    if (highExpenseThreshold > 0 && tx?.type === "expense" && Number(tx?.amount || 0) >= highExpenseThreshold) reasons.push("Expense besar");
    return reasons;
  }
  const transactionReviewQueue = displayTxns
    .map(tx => ({ tx, reasons: getTransactionReviewReasons(tx) }))
    .filter(item => item.reasons.length > 0)
    .slice(0, 4);
  const transactionQualityPenalty = (visibleUncategorizedCount * 8) + (visibleNoSourceCount * 8) + (visibleNoNoteCount * 3) + (highExpenseCount * 5) + (visibleNetFlow < 0 ? 10 : 0);
  const transactionQualityScore = displayTxns.length === 0 ? 100 : Math.max(0, Math.min(100, 100 - transactionQualityPenalty));
  const transactionQualityTone = transactionQualityScore >= 80 ? "#86efac" : transactionQualityScore >= 60 ? "#fbbf24" : "#fca5a5";
  const transactionReviewSignals = [
    visibleUncategorizedCount > 0 ? { label: `${visibleUncategorizedCount} tanpa kategori`, tone: "amber" } : null,
    visibleNoSourceCount > 0 ? { label: `${visibleNoSourceCount} tanpa sumber dana`, tone: "amber" } : null,
    visibleNoNoteCount > 0 ? { label: `${visibleNoNoteCount} tanpa catatan`, tone: "muted" } : null,
    highExpenseCount > 0 ? { label: `${highExpenseCount} expense besar`, tone: "red" } : null,
    visibleNetFlow < 0 ? { label: "net filter negatif", tone: "red" } : null,
  ].filter(Boolean);
  const transactionQualityText = displayTxns.length === 0
    ? "Belum ada data tampil untuk direview pada filter ini."
    : transactionReviewSignals.length === 0
      ? "Data transaksi tampil sudah rapi: kategori, sumber dana, dan catatan utama aman."
      : "Review signal membantu menemukan transaksi yang perlu dirapikan sebelum analisis keuangan lanjut.";
  const transactionCompactText = displayTxns.length === 0
    ? (filteredPeriodTxns.length === 0 ? "Periode ini masih kosong. Tambah transaksi dulu sebelum membaca intelligence." : "Tidak ada transaksi yang cocok dengan filter aktif.")
    : transactionQualityScore >= 80
      ? "Data periode aktif cukup rapi. Buka detail hanya jika ingin cek kategori dan signal lebih dalam."
      : "Ada signal yang perlu dirapikan. Buka detail untuk review kategori, sumber dana, catatan, dan expense besar.";
  const transactionInsightText = displayTxns.length === 0
    ? (filteredPeriodTxns.length === 0 ? "Tidak ada transaksi pada periode ini." : "Tidak ada transaksi yang cocok dengan filter aktif.")
    : visibleExpense > visibleIncome
      ? `Pengeluaran terlihat lebih besar dari pemasukan pada hasil filter ini. ${topExpenseCategory ? `${topExpenseCategory.label} mengambil ${topExpenseShare}% dari expense tampil.` : "Cek kategori terbesar sebelum menambah transaksi baru."}`
      : "Arus kas hasil filter masih positif atau seimbang. Gunakan drilldown kategori untuk membaca pola transaksi.";
  const transactionScopeLabel = canViewAllTransactionsNow && filterUser === "semua" ? "Family/Semua" : (filterUser || currentUser);
  const activeTransactionFilterCount = [normalizedTxSearch, txTypeFilter !== "all", txCategoryFilter !== "all", txSortMode !== "newest"].filter(Boolean).length;
  const hasTransactionFilters = activeTransactionFilterCount > 0;
  const transactionScopeNote = filteredPeriodTxns.length === 0
    ? `Periode ${rangeLabel} belum punya transaksi untuk scope ${transactionScopeLabel}.`
    : hasTransactionFilters
      ? `${activeTransactionFilterCount} filter aktif dari ${filteredPeriodTxns.length} transaksi periode.`
      : `Menampilkan semua transaksi periode ${rangeLabel}.`;
  function resetTransactionFilters() {
    setTxSearch("");
    setTxTypeFilter("all");
    setTxCategoryFilter("all");
    setTxSortMode("newest");
  }
  function setTransactionQuickPeriod(mode) {
    const d = new Date();
    setSelectedDate(toLocalDateInput(d));
    setFilterMonth(d.getMonth());
    setDateRangeMode(mode);
  }
  const usersWithData = [...new Set(transactions.map(t => t.user || t.userName || "Tanpa User"))];
  const barMax = Math.max(...Object.values(expenseByCategory), 1);

  const invTypeLabel = { usd: "\uD83D\uDCB5 USD", lm: "\uD83E\uDD47 LM Antam", jewelry: "\uD83D\uDC8D Perhiasan" };
  const invTypeUnit = { usd: "USD", lm: "gram", jewelry: "gram" };
  const invSummary = investments.filter(inv => isFinancialAssetActive(inv) && Number(inv.qty ?? inv.amount ?? 0) > 0).map(inv => {
    const currentValue = calcAssetValue(inv, marketPrices);
    const buyValue = Number(inv.costBasis ?? (["idr","obligasi"].includes(inv.assetType) ? (inv.idrValue || 0) : (inv.qty || inv.amount || 0) * (inv.buyPrice || 0)));
    const profitLoss = currentValue - buyValue;
    return { ...inv, currentValue, profitLoss, pct: buyValue > 0 ? ((profitLoss / buyValue) * 100).toFixed(1) : 0 };
  });
  const totalInvBuy = investments.filter(inv => isFinancialAssetActive(inv)).reduce((s, i) => s + Number(i.costBasis ?? (["idr","obligasi"].includes(i.assetType) ? (i.idrValue || 0) : (i.qty || i.amount || 0) * (i.buyPrice || 0))), 0);
  const totalInvNow = invSummary.reduce((s, i) => s + i.currentValue, 0);
  const selectedInvestmentSummary = selectedInvestment ? (invSummary.find(i => i.id === selectedInvestment.id) || selectedInvestment) : null;

  const allSavingsGoals = [
    ...SAVINGS_GOALS.map(g => ({
      ...g,
      ...(goalOverrides?.[g.id] || {}),
      id: g.id,
      sourceType: "template",
      templateId: g.id,
      targetAmount: Number((goalOverrides?.[g.id]?.targetAmount ?? g.targetAmount) || 0),
      yearsLeft: Number((goalOverrides?.[g.id]?.yearsLeft ?? g.yearsLeft) || 0),
      status: goalOverrides?.[g.id]?.status || g.status || "active",
    })),
    ...customGoals.map(g => ({
      ...g,
      sourceType: "custom",
      targetAmount: Number(g.targetAmount || 0),
      yearsLeft: Number(g.yearsLeft || 0),
      status: g.status || "active",
    })),
  ];
  const savingsGoals = allSavingsGoals.filter(g => g.status !== "archived");
  const archivedSavingsGoals = allSavingsGoals.filter(g => g.status === "archived");

  const goalLinkReviewCandidates = earlyIsOwnerForScope
    ? displayTxns
        .filter(tx => tx.type === "expense" && !tx.goalId && !tx.goalUsageId)
        .map(tx => {
          const suggestions = getGoalLinkSuggestionsForTransaction(tx).filter(g => Number(g._linkScore || 0) > 0);
          const topGoal = suggestions[0] || null;
          const score = Number(topGoal?._linkScore || 0);
          return { tx, topGoal, score };
        })
        .filter(item => item.topGoal && item.score > 0)
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || Number(b.tx?.amount || 0) - Number(a.tx?.amount || 0))
        .slice(0, 5)
    : [];
  const goalLinkReviewTotal = goalLinkReviewCandidates.length;
  function getGoalLinkAuditForTransaction(tx) {
    if (!tx) return null;
    const hasGoalSignal = tx.goalId || tx.goalUsageId || Number(tx.goalPendingAmount || 0) > 0 || Number(tx.goalLinkedAmount || 0) > 0;
    if (!hasGoalSignal) return null;
    const goal = tx.goalId ? savingsGoals.find(g => String(g.id) === String(tx.goalId)) : null;
    const linkedAmount = Number(tx.goalLinkedAmount || 0);
    const txAmount = Number(tx.amount || 0);
    const pendingAmount = Number(tx.goalPendingAmount || 0);
    const issues = [];
    if (!tx.goalId) issues.push("Goal kosong");
    if (tx.goalId && !goal) issues.push("Goal tidak ditemukan");
    if (tx.type !== "expense") issues.push("Bukan expense");
    if (!tx.goalUsageId) issues.push("Usage log kosong");
    if (linkedAmount <= 0) issues.push("Linked Rp 0");
    if (txAmount > 0 && linkedAmount > txAmount) issues.push("Linked > nominal");
    if (pendingAmount > 0) issues.push("Pending settlement");
    const severity = pendingAmount > 0 || !goal || !tx.goalId ? "warning" : (issues.length > 0 ? "check" : "synced");
    return {
      tx,
      goal,
      issues,
      severity,
      linkedAmount,
      pendingAmount,
      txAmount,
      goalCash: tx.goalId ? Number(savingsData[tx.goalId] || 0) : 0,
    };
  }
  const goalLinkAuditQueue = earlyIsOwnerForScope
    ? displayTxns
        .map(getGoalLinkAuditForTransaction)
        .filter(item => item && item.issues.length > 0)
        .sort((a, b) => {
          const aWeight = a.severity === "warning" ? 2 : 1;
          const bWeight = b.severity === "warning" ? 2 : 1;
          return bWeight - aWeight || Number(b.pendingAmount || 0) - Number(a.pendingAmount || 0) || Number(b.txAmount || 0) - Number(a.txAmount || 0);
        })
        .slice(0, 5)
    : [];
  const goalLinkAuditTotal = goalLinkAuditQueue.length;
  const goalLinkedVisibleCount = earlyIsOwnerForScope ? displayTxns.filter(tx => tx.goalId || tx.goalUsageId || Number(tx.goalLinkedAmount || 0) > 0).length : 0;
  const goalLinkedSyncedVisibleCount = Math.max(goalLinkedVisibleCount - goalLinkAuditTotal, 0);

  const totalSavingsTarget = savingsGoals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
  const totalSavingsCurrent = savingsGoals.reduce((s, g) => s + calcGoalValue(g.id), 0);

  const financialScopeUser = canViewAllTransactionsNow
    ? (filterUser === "semua" ? null : filterUser)
    : currentUser;
  const financialWallets = sumberDanaList.filter(sd =>
    (!financialScopeUser || sd.user === financialScopeUser) &&
    getSumberDanaStatus(sd) !== "archived"
  );
  const financialWalletBreakdown = canViewFinancialSummaryNow ? financialWallets
    .map(sd => {
      const walletBalance = calcSumberDanaBalance(sd.id);
      const walletLedgerCount = sumberDanaLedger.filter(l => String(l.sumberDanaId || "") === String(sd.id || "") && shouldCountLedgerInWalletBalance(l)).length;
      const walletTransactionCount = transactions.filter(t => t.sumberDanaId === sd.id).length;
      return { ...sd, walletBalance, walletLedgerCount, walletTransactionCount };
    })
    .sort((a, b) => Number(a.walletBalance || 0) - Number(b.walletBalance || 0)) : [];
  const financialWalletTotal = canViewFinancialSummaryNow ? financialWalletBreakdown.reduce((sum, sd) => sum + Number(sd.walletBalance || 0), 0) : 0;
  const negativeWalletBreakdown = financialWalletBreakdown.filter(sd => Number(sd.walletBalance || 0) < 0);
  const mostNegativeWallet = negativeWalletBreakdown[0] || null;
  const positiveWalletBreakdown = financialWalletBreakdown.filter(sd => Number(sd.walletBalance || 0) > 0);
  const walletAuditLabel = negativeWalletBreakdown.length > 0
    ? negativeWalletBreakdown.length + " wallet minus"
    : "Wallet aman";
  const financialInvestmentTotal = (canViewFinancialSummaryNow && canViewInvestmentsNow) ? invSummary
    .filter(inv => isFinancialAssetActive(inv))
    .filter(inv => !financialScopeUser || inv.createdBy === financialScopeUser || (!inv.createdBy && financialScopeUser === currentUser))
    .reduce((sum, inv) => sum + asEngineNumber(inv.currentValue || 0), 0) : 0;
  const financialGoalBreakdown = (canViewFinancialSummaryNow && canViewSensitiveGoalsNow && !financialScopeUser)
    ? getGoalFinancialBreakdown(savingsGoals)
    : { cashTotal: 0, assetTotal: 0, total: 0, countedRows: [], duplicateGuardRows: [], duplicateGuardTotal: 0 };
  const financialGoalTotal = financialGoalBreakdown.total;
  const financialLoanItems = (canViewFinancialSummaryNow && canViewLoansNow) ? gadaiList.filter(g =>
    isActiveFinancialLoan(g) &&
    (!financialScopeUser || g.createdBy === financialScopeUser || (!g.createdBy && financialScopeUser === currentUser))
  ) : [];
  const financialLoanTotal = financialLoanItems.reduce((sum, g) => sum + Math.max(asEngineNumber(g.outstandingPrincipal ?? g.uangPinjaman ?? 0), 0), 0);
  const financialLedgerValidation = canViewFinancialSummaryNow
    ? buildFinancialLedgerValidation(sumberDanaLedger, sumberDanaList)
    : { countedLedgerCount: 0, missingWalletRows: [], orphanWalletRows: [], internalTransferRows: [], unbalancedInternalGroups: [], issueCount: 0, ok: true };
  const financialAuditTrailGuard = canViewFinancialSummaryNow
    ? buildFinancialAuditTrailGuard({ ledgerRows: sumberDanaLedger, walletRows: sumberDanaList, transactionRows: transactions, goalRows: savingsGoals, investmentRows: invSummary, loanRows: gadaiList })
    : { countedLedgerCount: 0, invalidAmountRows: [], inactiveWalletRows: [], missingEngineMetadataRows: [], internalMovementCashflowLeakRows: [], danglingTransactionLedgerRows: [], danglingInvestmentLedgerRows: [], danglingLoanLedgerRows: [], danglingGoalLedgerRows: [], danglingReferenceCount: 0, issueCount: 0, ok: true };
  const financialGrossAssets = financialWalletTotal + financialGoalTotal + financialInvestmentTotal;
  const financialNetWorth = financialGrossAssets - financialLoanTotal;
  const financialDebtRatio = financialGrossAssets > 0 ? (financialLoanTotal / financialGrossAssets) * 100 : (financialLoanTotal > 0 ? 100 : 0);
  const financialNoBaseline = financialWalletBreakdown.length === 0 || (financialGrossAssets === 0 && financialLoanTotal === 0);
  const financialLiquidityWarning = financialWalletTotal <= 0 && financialGrossAssets > 0;
  const financialStressGuard = canViewFinancialSummaryNow
    ? buildFinancialStressGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        walletBreakdown: financialWalletBreakdown,
        goalRows: savingsGoals,
        totalGoalTarget: totalSavingsTarget,
        totalGoalCurrent: totalSavingsCurrent,
      })
    : { criticalNegativeWalletRows: [], zeroOrNearZeroWalletRows: [], largestWallet: null, walletConcentrationRatio: 0, walletConcentrationRisk: false, liquidityToDebtRatio: 100, liquidityStress: false, debtPressure: false, goalFundingRatio: 100, goalFundingPressure: false, netWorthFragile: false, issueCount: 0, ok: true };
  const financialRecoveryGuard = canViewFinancialSummaryNow
    ? buildFinancialRecoveryGuard({
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        loanTotal: financialLoanTotal,
        financialEngineIssues: [],
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        negativeWalletBreakdown,
        goalFundingRatio: financialStressGuard.goalFundingRatio,
      })
    : { issues: [], recoverySteps: [], primaryAction: "Engine stabil. Lanjut monitoring rutin.", hasDataIntegrityIssue: false, hasCriticalCashIssue: false, hasCriticalNetWorthIssue: false, hasDebtRecoveryIssue: false, hasGoalRecoveryIssue: false, hasFragilityIssue: false, critical: false, warning: false, issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialResilienceGuard = canViewFinancialSummaryNow
    ? buildFinancialResilienceGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        walletBreakdown: financialWalletBreakdown,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], resilienceActions: [], primaryAction: "Engine resilient. Struktur wallet, asset, goal, dan loan siap dimonitor rutin.", cashBufferRatio: 100, debtCoverageRatio: 100, equityBufferRatio: 100, singleWalletDependency: false, weakCashBuffer: false, debtShockRisk: false, assetHeavyLiquidityRisk: false, dataResilienceRisk: false, openRecoveryRisk: false, baselineRisk: false, negativeWalletCount: 0, critical: false, warning: false, issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialFinalSafetyGuard = canViewFinancialSummaryNow
    ? buildFinancialFinalSafetyGuard({
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        loanTotal: financialLoanTotal,
        grossAssets: financialGrossAssets,
        negativeWalletBreakdown,
        goalDuplicateRows: financialGoalBreakdown.duplicateGuardRows,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], safetyActions: [], primaryAction: "Final Integrity Guard clear. Score boleh dibaca sebagai status final engine.", dataIssueCount: 0, structuralIssueCount: 0, duplicateGuardCount: 0, negativeWalletCount: 0, hardStop: false, warning: false, hardStopData: false, hardStopNetWorth: false, hardStopWallet: false, hardStopDebt: false, hardStopRecovery: false, hardStopBaseline: false, softStopLiquidity: false, softStopDoubleCount: false, softStopFragility: false, hasGrossAssetMismatch: false, issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialFinalIntegrityGuard = canViewFinancialSummaryNow
    ? buildFinancialFinalIntegrityGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        grossAssets: financialGrossAssets,
        netWorth: financialNetWorth,
        walletBreakdown: financialWalletBreakdown,
        goalBreakdown: financialGoalBreakdown,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        finalSafetyGuard: financialFinalSafetyGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], integrityActions: [], primaryAction: "Final Integrity Guard clear. Formula engine, guard cascade, dan score lock sudah sinkron.", invalidComponentRows: [], recomputedGrossAssets: 0, recomputedNetWorth: 0, grossAssetDelta: 0, netWorthDelta: 0, grossAssetMismatch: false, netWorthMismatch: false, goalTotalMismatch: false, missingWalletLedgerBalanceRows: [], guardCascadeOpen: false, criticalGuardOpen: false, unsafeHealthyPotential: false, critical: false, warning: false, issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialFinalLockGuard = canViewFinancialSummaryNow
    ? buildFinancialFinalLockGuard({
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        grossAssets: financialGrossAssets,
        loanTotal: financialLoanTotal,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        finalSafetyGuard: financialFinalSafetyGuard,
        finalIntegrityGuard: financialFinalIntegrityGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], lockActions: [], primaryAction: "Final Lock Guard clear. Score, status, dan guard cascade sudah terkunci sebagai output final engine.", upstreamIssueCount: 0, formulaLock: false, dataTraceLock: false, safetyLock: false, healthLock: false, liquidityLock: false, cascadeLock: false, baselineLock: false, recoveryLock: false, hardLock: false, warning: false, issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialClosureGuard = canViewFinancialSummaryNow
    ? buildFinancialClosureGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        grossAssets: financialGrossAssets,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        goalDuplicateRows: financialGoalBreakdown.duplicateGuardRows,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        finalSafetyGuard: financialFinalSafetyGuard,
        finalIntegrityGuard: financialFinalIntegrityGuard,
        finalLockGuard: financialFinalLockGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], closureActions: [], primaryAction: "Closure Guard clear. Financial Engine final sudah siap dibaca sebagai output tertutup.", upstreamIssueCount: 0, grossAssetCompositionDelta: 0, closureDataOpen: false, closureFormulaOpen: false, closureSafetyOpen: false, closureLiquidityOpen: false, closureHealthOpen: false, closureBaselineOpen: false, closureDoubleCountOpen: false, closureCompositionOpen: false, closureReady: true, hardClosure: false, warning: false, issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialSealGuard = canViewFinancialSummaryNow
    ? buildFinancialSealGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        grossAssets: financialGrossAssets,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        goalDuplicateRows: financialGoalBreakdown.duplicateGuardRows,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        finalSafetyGuard: financialFinalSafetyGuard,
        finalIntegrityGuard: financialFinalIntegrityGuard,
        finalLockGuard: financialFinalLockGuard,
        closureGuard: financialClosureGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], sealActions: [], primaryAction: "Seal Guard clear. Financial Engine sudah tersegel untuk output final harian.", upstreamIssueCount: 0, sealFormulaDelta: 0, sealDataUnclear: false, sealFormulaUnclear: false, sealFormulaMismatch: false, sealSafetyUnclear: false, sealHealthLocked: false, sealLiquidityUnclear: false, sealDoubleCountUnclear: false, sealBaselineUnready: false, sealCascadeOpen: false, sealComponentEmptyRisk: false, sealReady: true, hardSeal: false, warning: false, issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialReleaseReadinessGuard = canViewFinancialSummaryNow
    ? buildFinancialReleaseReadinessGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        grossAssets: financialGrossAssets,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        financialLiquidityWarning,
        goalDuplicateRows: financialGoalBreakdown.duplicateGuardRows,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        finalSafetyGuard: financialFinalSafetyGuard,
        finalIntegrityGuard: financialFinalIntegrityGuard,
        finalLockGuard: financialFinalLockGuard,
        closureGuard: financialClosureGuard,
        sealGuard: financialSealGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], releaseActions: [], primaryAction: "Release Readiness Guard clear. Financial Engine siap dipakai sebagai baseline final Phase 6.8.", upstreamIssueCount: 0, releaseCompositionDelta: 0, releaseDataBlocked: false, releaseFormulaBlocked: false, releaseCompositionBlocked: false, releaseSafetyBlocked: false, releaseHealthBlocked: false, releaseLiquidityBlocked: false, releaseDoubleCountBlocked: false, releaseBaselineBlocked: false, releaseCascadeBlocked: false, releaseEmptyButHealthyRisk: false, releaseBlocked: false, releaseReview: false, releaseReady: true, readinessLabel: "Release Ready", issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialConsolidationGuard = canViewFinancialSummaryNow
    ? buildFinancialConsolidationGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        grossAssets: financialGrossAssets,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        financialLiquidityWarning,
        goalDuplicateRows: financialGoalBreakdown.duplicateGuardRows,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        finalSafetyGuard: financialFinalSafetyGuard,
        finalIntegrityGuard: financialFinalIntegrityGuard,
        finalLockGuard: financialFinalLockGuard,
        closureGuard: financialClosureGuard,
        sealGuard: financialSealGuard,
        releaseReadinessGuard: financialReleaseReadinessGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], consolidationActions: [], primaryAction: "Consolidation Guard clear. Financial Engine sudah rapi sebagai baseline final sebagai baseline Phase 7.1.5.", upstreamIssueCount: 0, recomputedNetWorth: 0, recomputedGrossAssets: 0, consolidationFormulaDelta: 0, consolidationGrossDelta: 0, consolidationDataOpen: false, consolidationFormulaOpen: false, consolidationSafetyOpen: false, consolidationHealthOpen: false, consolidationLiquidityReview: false, consolidationDoubleCountOpen: false, consolidationBaselineOpen: false, consolidationCascadeOpen: false, consolidationBlocked: false, consolidationReview: false, consolidationReady: true, consolidationLabel: "Consolidated", progressPercent: 100, progressNotice: "Progress 7.1.5: Consolidation Guard clear · engine siap baseline Phase 7.1.5.", issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialProgressMonitorGuard = canViewFinancialSummaryNow
    ? buildFinancialProgressMonitorGuard({
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        grossAssets: financialGrossAssets,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        financialLiquidityWarning,
        ledgerValidation: financialLedgerValidation,
        auditTrailGuard: financialAuditTrailGuard,
        stressGuard: financialStressGuard,
        recoveryGuard: financialRecoveryGuard,
        resilienceGuard: financialResilienceGuard,
        finalSafetyGuard: financialFinalSafetyGuard,
        finalIntegrityGuard: financialFinalIntegrityGuard,
        finalLockGuard: financialFinalLockGuard,
        closureGuard: financialClosureGuard,
        sealGuard: financialSealGuard,
        releaseReadinessGuard: financialReleaseReadinessGuard,
        consolidationGuard: financialConsolidationGuard,
        noBaseline: financialNoBaseline,
      })
    : { issues: [], progressActions: [], primaryAction: "Progress Monitor clear. Predictive Scenario Closure Engine 7.1.5 aktif setelah Phase 6.8 freeze.", guardStack: [], activeGuardRows: [], blockingGuardRows: [], activeLockCount: 0, blockingLockCount: 0, upstreamIssueCount: 0, componentCount: 0, formulaDelta: 0, assetDelta: 0, formulaDrift: false, healthBlocked: false, baselineBlocked: false, cascadeBlocked: false, monitorBlocked: false, monitorReview: false, monitorReady: true, monitorLabel: "Ready", progressPercent: 100, progressNotice: buildFinancialDeploymentSyncNotice("Progress 7.1.5: 100% · scenario closure clear · siap baseline Phase 7.1.5."), issueCount: 0, scorePenalty: 0, scoreCap: 100, ok: true };
  const financialEngineIssues = [
    ...(financialNetWorth < 0 ? ["Net Worth negatif"] : []),
    ...(financialWalletTotal < 0 ? ["Total Wallet negatif"] : []),
    ...(negativeWalletBreakdown.length > 0 ? [negativeWalletBreakdown.length + " wallet minus"] : []),
    ...(financialDebtRatio >= 65 ? ["Debt Ratio tinggi"] : []),
    ...(financialLiquidityWarning ? ["Likuiditas wallet rendah"] : []),
    ...(financialGoalBreakdown.duplicateGuardRows.length > 0 ? [financialGoalBreakdown.duplicateGuardRows.length + " aset Goal ditahan anti double count"] : []),
    ...(financialLedgerValidation.missingWalletRows.length > 0 ? [financialLedgerValidation.missingWalletRows.length + " ledger tanpa wallet"] : []),
    ...(financialLedgerValidation.orphanWalletRows.length > 0 ? [financialLedgerValidation.orphanWalletRows.length + " ledger wallet tidak ditemukan"] : []),
    ...(financialLedgerValidation.unbalancedInternalGroups.length > 0 ? [financialLedgerValidation.unbalancedInternalGroups.length + " transfer internal tidak balance"] : []),
    ...(financialAuditTrailGuard.invalidAmountRows.length > 0 ? [financialAuditTrailGuard.invalidAmountRows.length + " ledger nominal invalid"] : []),
    ...(financialAuditTrailGuard.inactiveWalletRows.length > 0 ? [financialAuditTrailGuard.inactiveWalletRows.length + " ledger ke wallet nonaktif"] : []),
    ...(financialAuditTrailGuard.missingEngineMetadataRows.length > 0 ? [financialAuditTrailGuard.missingEngineMetadataRows.length + " ledger belum bermetadata engine"] : []),
    ...(financialAuditTrailGuard.internalMovementCashflowLeakRows.length > 0 ? [financialAuditTrailGuard.internalMovementCashflowLeakRows.length + " internal movement bocor cashflow"] : []),
    ...(financialAuditTrailGuard.danglingReferenceCount > 0 ? [financialAuditTrailGuard.danglingReferenceCount + " ledger ref dangling"] : []),
    ...(financialStressGuard.criticalNegativeWalletRows.length > 0 ? [financialStressGuard.criticalNegativeWalletRows.length + " wallet kritis"] : []),
    ...(financialStressGuard.liquidityStress ? ["Liquidity stress vs loan"] : []),
    ...(financialStressGuard.debtPressure ? ["Debt pressure tinggi"] : []),
    ...(financialStressGuard.walletConcentrationRisk ? ["Wallet concentration risk"] : []),
    ...(financialStressGuard.goalFundingPressure ? ["Goal funding pressure"] : []),
    ...(financialStressGuard.netWorthFragile ? ["Net Worth fragile"] : []),
    ...(financialRecoveryGuard.issueCount > 0 ? [financialRecoveryGuard.issueCount + " recovery action aktif"] : []),
    ...(financialResilienceGuard.singleWalletDependency ? ["Single wallet dependency"] : []),
    ...(financialResilienceGuard.weakCashBuffer ? ["Cash buffer tipis"] : []),
    ...(financialResilienceGuard.debtShockRisk ? ["Debt shock risk"] : []),
    ...(financialResilienceGuard.assetHeavyLiquidityRisk ? ["Asset-heavy liquidity risk"] : []),
    ...(financialResilienceGuard.dataResilienceRisk ? ["Data resilience lemah"] : []),
    ...(financialFinalSafetyGuard.hardStop ? ["Final Integrity hard stop"] : []),
    ...(financialFinalSafetyGuard.warning ? ["Final Integrity warning"] : []),
    ...(financialFinalIntegrityGuard.netWorthMismatch ? ["Net Worth formula mismatch"] : []),
    ...(financialFinalIntegrityGuard.grossAssetMismatch ? ["Gross Assets formula mismatch"] : []),
    ...(financialFinalIntegrityGuard.guardCascadeOpen ? ["Guard cascade belum clear"] : []),
    ...(financialFinalIntegrityGuard.unsafeHealthyPotential ? ["Healthy status lock aktif"] : []),
    ...(financialFinalLockGuard.formulaLock ? ["Final Lock formula aktif"] : []),
    ...(financialFinalLockGuard.dataTraceLock ? ["Final Lock audit trace aktif"] : []),
    ...(financialFinalLockGuard.healthLock ? ["Final Lock healthy status aktif"] : []),
    ...(financialFinalLockGuard.liquidityLock ? ["Final Lock liquidity aktif"] : []),
    ...(financialFinalLockGuard.cascadeLock ? ["Final Lock cascade aktif"] : []),
    ...(financialClosureGuard.closureDataOpen ? ["Closure data trace belum clear"] : []),
    ...(financialClosureGuard.closureFormulaOpen || financialClosureGuard.closureCompositionOpen ? ["Closure formula belum clear"] : []),
    ...(financialClosureGuard.closureSafetyOpen ? ["Closure safety/lock aktif"] : []),
    ...(financialClosureGuard.closureHealthOpen ? ["Closure health lock aktif"] : []),
    ...(financialClosureGuard.closureLiquidityOpen ? ["Closure liquidity/debt aktif"] : []),
    ...(financialClosureGuard.closureDoubleCountOpen ? ["Closure anti double count aktif"] : []),
    ...(financialSealGuard.sealDataUnclear ? ["Seal data trace belum clear"] : []),
    ...(financialSealGuard.sealFormulaUnclear || financialSealGuard.sealFormulaMismatch ? ["Seal formula belum clear"] : []),
    ...(financialSealGuard.sealSafetyUnclear ? ["Seal safety/lock aktif"] : []),
    ...(financialSealGuard.sealHealthLocked ? ["Seal healthy status aktif"] : []),
    ...(financialSealGuard.sealLiquidityUnclear ? ["Seal liquidity/debt aktif"] : []),
    ...(financialSealGuard.sealDoubleCountUnclear ? ["Seal anti double count aktif"] : []),
    ...(financialSealGuard.sealCascadeOpen ? ["Seal cascade belum clear"] : []),
    ...(financialReleaseReadinessGuard.releaseDataBlocked ? ["Release data trace belum ready"] : []),
    ...(financialReleaseReadinessGuard.releaseFormulaBlocked || financialReleaseReadinessGuard.releaseCompositionBlocked ? ["Release formula belum ready"] : []),
    ...(financialReleaseReadinessGuard.releaseSafetyBlocked ? ["Release safety/seal blocking"] : []),
    ...(financialReleaseReadinessGuard.releaseHealthBlocked ? ["Release healthy status terkunci"] : []),
    ...(financialReleaseReadinessGuard.releaseCascadeBlocked ? ["Release guard cascade belum clear"] : []),
    ...(financialConsolidationGuard.consolidationDataOpen ? ["Consolidation data trace belum clear"] : []),
    ...(financialConsolidationGuard.consolidationFormulaOpen ? ["Consolidation formula belum clear"] : []),
    ...(financialConsolidationGuard.consolidationSafetyOpen ? ["Consolidation safety/release lock aktif"] : []),
    ...(financialConsolidationGuard.consolidationHealthOpen ? ["Consolidation healthy status terkunci"] : []),
    ...(financialConsolidationGuard.consolidationCascadeOpen ? ["Consolidation guard cascade belum clear"] : []),
    ...(financialProgressMonitorGuard.cascadeBlocked ? ["Progress Monitor guard stack belum clear"] : []),
    ...(financialProgressMonitorGuard.formulaDrift ? ["Progress Monitor formula drift"] : []),
    ...(financialProgressMonitorGuard.healthBlocked ? ["Progress Monitor healthy status terkunci"] : []),
    ...(financialProgressMonitorGuard.baselineBlocked ? ["Progress Monitor baseline belum cukup"] : []),
    ...(financialNoBaseline ? ["Baseline data belum lengkap"] : []),
  ];
  const financialRawScore = 100
    - (financialDebtRatio * 1.15)
    - (financialWalletTotal < 0 ? 30 : 0)
    - (financialNetWorth < 0 ? 40 : 0)
    - (negativeWalletBreakdown.length > 0 ? Math.min(18, negativeWalletBreakdown.length * 6) : 0)
    - (financialLiquidityWarning ? 12 : 0)
    - (financialGoalBreakdown.duplicateGuardRows.length > 0 ? Math.min(16, financialGoalBreakdown.duplicateGuardRows.length * 4) : 0)
    - (financialLedgerValidation.issueCount > 0 ? Math.min(22, financialLedgerValidation.issueCount * 4) : 0)
    - (financialAuditTrailGuard.issueCount > 0 ? Math.min(24, financialAuditTrailGuard.issueCount * 3) : 0)
    - (financialStressGuard.issueCount > 0 ? Math.min(20, financialStressGuard.issueCount * 4) : 0)
    - asEngineNumber(financialRecoveryGuard.scorePenalty)
    - asEngineNumber(financialResilienceGuard.scorePenalty)
    - asEngineNumber(financialFinalSafetyGuard.scorePenalty)
    - asEngineNumber(financialFinalIntegrityGuard.scorePenalty)
    - asEngineNumber(financialFinalLockGuard.scorePenalty)
    - asEngineNumber(financialClosureGuard.scorePenalty)
    - asEngineNumber(financialSealGuard.scorePenalty)
    - asEngineNumber(financialReleaseReadinessGuard.scorePenalty)
    - asEngineNumber(financialConsolidationGuard.scorePenalty)
    - asEngineNumber(financialProgressMonitorGuard.scorePenalty)
    - (financialNoBaseline ? 18 : 0);
  const financialScoreCap = Math.min(
    financialNetWorth < 0 ? 39 : 100,
    financialWalletTotal < 0 ? 49 : 100,
    negativeWalletBreakdown.length > 0 ? 59 : 100,
    financialDebtRatio >= 65 ? 69 : 100,
    financialLiquidityWarning ? 79 : 100,
    financialGoalBreakdown.duplicateGuardRows.length > 0 ? 74 : 100,
    financialLedgerValidation.issueCount > 0 ? 74 : 100,
    financialAuditTrailGuard.issueCount > 0 ? 72 : 100,
    financialStressGuard.criticalNegativeWalletRows.length > 0 ? 64 : 100,
    financialStressGuard.debtPressure ? 69 : 100,
    financialStressGuard.liquidityStress ? 74 : 100,
    financialStressGuard.netWorthFragile ? 79 : 100,
    financialRecoveryGuard.scoreCap,
    financialResilienceGuard.scoreCap,
    financialFinalSafetyGuard.scoreCap,
    financialFinalIntegrityGuard.scoreCap,
    financialFinalLockGuard.scoreCap,
    financialClosureGuard.scoreCap,
    financialSealGuard.scoreCap,
    financialReleaseReadinessGuard.scoreCap,
    financialConsolidationGuard.scoreCap,
    financialProgressMonitorGuard.scoreCap,
    financialNoBaseline ? 69 : 100
  );
  const financialScore = Math.max(0, Math.min(financialScoreCap, Math.round(financialRawScore)));
  const financialStatus =
    financialScore >= 80 ? { label: "Sehat", color: "#34d399", bg: "rgba(16,185,129,0.14)" } :
    financialScore >= 60 ? { label: "Aman", color: "#a3e635", bg: "rgba(163,230,53,0.12)" } :
    financialScore >= 40 ? { label: "Waspada", color: "#fbbf24", bg: "rgba(245,158,11,0.13)" } :
    { label: "Bahaya", color: "#f87171", bg: "rgba(239,68,68,0.14)" };
  const financialEngineGuardLabel = financialEngineIssues.length > 0 ? financialEngineIssues.slice(0, 2).join(" · ") : FINANCIAL_ENGINE_STATUS_OK;
  const financialHealthEngine = canViewFinancialSummaryNow
    ? buildFinancialHealthEngine({
        engineScore: financialScore,
        walletTotal: financialWalletTotal,
        goalTotal: financialGoalTotal,
        investmentTotal: financialInvestmentTotal,
        loanTotal: financialLoanTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        liquidityWarning: financialLiquidityWarning,
        negativeWalletBreakdown,
        engineIssues: financialEngineIssues,
        progressMonitorGuard: financialProgressMonitorGuard,
        periodIncome: visibleIncome,
        periodExpense: visibleExpense,
        periodNetFlow: visibleNetFlow,
        goalTarget: totalSavingsTarget,
        goalCurrent: totalSavingsCurrent,
        transactionQualityScore,
        noBaseline: financialNoBaseline,
      })
    : { healthScore: 0, healthLabel: "Locked", healthStage: "No Access", healthColor: "#94a3b8", healthBg: "rgba(148,163,184,0.10)", progressPercent: 0, healthNotice: "Progress 7.1.5: Financial Health Engine terkunci untuk role ini.", primaryAction: "Role tidak memiliki akses Financial Summary.", actionCandidates: [], componentRows: [], issueCount: 0, ok: false };

  const financialHealthDecisionEngine = canViewFinancialSummaryNow
    ? buildFinancialHealthDecisionEngine({
        healthEngine: financialHealthEngine,
        periodIncome: visibleIncome,
        periodExpense: visibleExpense,
        periodNetFlow: visibleNetFlow,
        walletTotal: financialWalletTotal,
        loanTotal: financialLoanTotal,
        goals: savingsGoals.map(goal => ({ ...goal, currentAmount: calcGoalValue(goal.id) })),
      })
    : { coreIncomeTarget: 0, growthIncomeTarget: 0, incomeShortfall: 0, incomeSurplus: 0, dailyIncomeTarget: 0, remainingDays: 0, safeSpendingMonthly: 0, safeSpendingRemaining: 0, safeSpendingDaily: 0, mandatoryMonthly: 0, mandatoryCoverage: 0, mandatoryGap: 0, lifestyleCapacity: 0, feasibilityRows: [], topGoalRisks: [], recommendations: ["Role tidak memiliki akses Financial Summary."], primaryRecommendation: "Role tidak memiliki akses Financial Summary.", decisionStatus: "Locked", decisionColor: "#94a3b8", decisionBg: "rgba(148,163,184,0.10)", ok: false };

  const financialPredictiveHealthEngine = canViewFinancialSummaryNow
    ? buildPredictiveFinancialHealthEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        transactions: userTxns,
        walletTotal: financialWalletTotal,
        loanTotal: financialLoanTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { predictiveScore: 0, predictiveLabel: "Locked", predictiveStage: "No Access", predictiveColor: "#94a3b8", predictiveBg: "rgba(148,163,184,0.10)", projectionNotice: "Predictive 7.1.5: engine terkunci untuk role ini.", primaryAction: "Role tidak memiliki akses Financial Summary.", actions: [], forecastRows: [], runwayDays: 0, runwayLabel: "Locked", recoveryRequired: false, recoveryGap: 0, recoveryMonthlyTarget: 0, recoveryDailyTarget: 0, recoveryStage: "Locked", recoveryNotice: "Role tidak memiliki akses Financial Summary.", trendLabel: "Locked", trendColor: "#94a3b8", transactionWindowCount: 0, noTrendData: true, ok: false };

  const financialPredictiveActionEngine = canViewFinancialSummaryNow
    ? buildPredictiveActionPriorityEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        negativeWalletBreakdown,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        loanTotal: financialLoanTotal,
        debtRatio: financialDebtRatio,
      })
    : { actionStatus: "Locked", actionColor: "#94a3b8", actionBg: "rgba(148,163,184,0.10)", actionNotice: "Action 7.1.5: engine terkunci untuk role ini.", primaryAction: "Role tidak memiliki akses Financial Summary.", primaryLabel: "Locked", primaryPriority: 0, actionRows: [], blockerCount: 0, totalImpact: 0, monthlyActionTarget: 0, dailyActionTarget: 0, ok: false };

  const financialPredictiveExecutionEngine = canViewFinancialSummaryNow
    ? buildPredictiveExecutionControlEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        actionEngine: financialPredictiveActionEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        loanTotal: financialLoanTotal,
      })
    : { executionStatus: "Locked", executionLabel: "No Access", executionScore: 0, executionColor: "#94a3b8", executionBg: "rgba(148,163,184,0.10)", executionNotice: "Execution 7.1.5: engine terkunci untuk role ini.", primaryAction: "Role tidak memiliki akses Financial Summary.", primaryLabel: "Locked", executionRows: [], forbiddenActions: ["Role tidak memiliki akses Financial Summary."], lockRows: [], lockCount: 0, monthlyExecutionTarget: 0, dailyExecutionTarget: 0, growthLocked: true, recoveryLock: false, ok: false };

  const financialPredictiveCommandBriefEngine = canViewFinancialSummaryNow
    ? buildPredictiveCommandBriefEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        actionEngine: financialPredictiveActionEngine,
        executionEngine: financialPredictiveExecutionEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
      })
    : { commandStatus: "Locked", commandLabel: "No Access", commandScore: 0, commandColor: "#94a3b8", commandBg: "rgba(148,163,184,0.10)", commandNotice: "Command 7.1.5: engine terkunci untuk role ini.", commandRows: [], commandLocks: ["Role tidak memiliki akses Financial Summary."], primaryCommand: "Role tidak memiliki akses Financial Summary.", dailyCashTarget: 0, monthlyActionTarget: 0, blockerCount: 0, lockCount: 0, recoveryRequired: false, growthLocked: true, ok: false };

  const financialPredictiveDecisionGateEngine = canViewFinancialSummaryNow
    ? buildPredictiveDecisionGateEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        actionEngine: financialPredictiveActionEngine,
        executionEngine: financialPredictiveExecutionEngine,
        commandEngine: financialPredictiveCommandBriefEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { gateDecision: "LOCKED", gateLabel: "No Access", gateStage: "Locked", gateScore: 0, gateColor: "#94a3b8", gateBg: "rgba(148,163,184,0.10)", gateNotice: "Decision Gate 7.1.5: engine terkunci untuk role ini.", gateRows: [], gateLocks: ["Role tidak memiliki akses Financial Summary."], nextAction: "Role tidak memiliki akses Financial Summary.", recoveryRequired: false, growthLocked: true, incomeShortfall: 0, safeSpendingDaily: 0, actionBlockers: 0, ok: false };

  const financialPredictiveGovernancePolicyEngine = canViewFinancialSummaryNow
    ? buildPredictiveGovernancePolicyEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        actionEngine: financialPredictiveActionEngine,
        executionEngine: financialPredictiveExecutionEngine,
        commandEngine: financialPredictiveCommandBriefEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { policyMode: "LOCKED", policyLabel: "No Access", policyStatus: "Locked", governanceScore: 0, policyColor: "#94a3b8", policyBg: "rgba(148,163,184,0.10)", governanceNotice: "Governance 7.1.5: engine terkunci untuk role ini.", governanceRows: [], allowedMoves: [], blockedMoves: ["Role tidak memiliki akses Financial Summary."], governanceLocks: ["Role tidak memiliki akses Financial Summary."], dailyCashTarget: 0, monthlyActionTarget: 0, recoveryRequired: false, growthLocked: true, ok: false };


  const financialPredictiveGovernanceComplianceEngine = canViewFinancialSummaryNow
    ? buildPredictiveGovernanceComplianceEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        actionEngine: financialPredictiveActionEngine,
        executionEngine: financialPredictiveExecutionEngine,
        commandEngine: financialPredictiveCommandBriefEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { complianceStatus: "LOCKED", complianceLabel: "No Access", complianceStage: "Locked", complianceScore: 0, complianceColor: "#94a3b8", complianceBg: "rgba(148,163,184,0.10)", complianceNotice: "Compliance 7.1.5: engine terkunci untuk role ini.", complianceRows: [], breachRows: [], complianceLocks: ["Role tidak memiliki akses Financial Summary."], primaryCorrection: "Role tidak memiliki akses Financial Summary.", monthlyActionTarget: 0, dailyCashTarget: 0, allowedMoves: [], blockedMoves: ["Role tidak memiliki akses Financial Summary."], policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };


  const financialPredictiveCfoAdvisoryEngine = canViewFinancialSummaryNow
    ? buildPredictiveCfoAdvisoryEngine({
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        actionEngine: financialPredictiveActionEngine,
        executionEngine: financialPredictiveExecutionEngine,
        commandEngine: financialPredictiveCommandBriefEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { advisoryStatus: "CFO_LOCKED", advisoryLabel: "No Access", advisoryStage: "Locked", advisoryScore: 0, advisoryColor: "#94a3b8", advisoryBg: "rgba(148,163,184,0.10)", advisoryNotice: "CFO Advisory 7.1.5: engine terkunci untuk role ini.", cfoMemo: "Role tidak memiliki akses Financial Summary.", cfoRows: [], doNow: ["Role tidak memiliki akses Financial Summary."], doNext: [], doNot: ["Role tidak memiliki akses Financial Summary."], advisoryLocks: ["Role tidak memiliki akses Financial Summary."], dailyCashTarget: 0, monthlyActionTarget: 0, gateDecision: "LOCKED", policyMode: "LOCKED", complianceStatus: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };



  const financialPredictiveOperatingRhythmEngine = canViewFinancialSummaryNow
    ? buildPredictiveOperatingRhythmEngine({
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        commandEngine: financialPredictiveCommandBriefEngine,
        actionEngine: financialPredictiveActionEngine,
        executionEngine: financialPredictiveExecutionEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { rhythmStatus: "RHYTHM_LOCKED", rhythmLabel: "No Access", rhythmStage: "Locked", rhythmScore: 0, rhythmColor: "#94a3b8", rhythmBg: "rgba(148,163,184,0.10)", rhythmNotice: "Operating Rhythm 7.1.5: engine terkunci untuk role ini.", operatingCadence: "Role tidak memiliki akses Financial Summary.", meetingMode: "Locked", rhythmRows: [], dailyRhythm: ["Role tidak memiliki akses Financial Summary."], weeklyRhythm: [], monthlyRhythm: [], reviewLocks: ["Role tidak memiliki akses Financial Summary."], dailyCashTarget: 0, monthlyActionTarget: 0, advisoryStatus: "CFO_LOCKED", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };


  const financialPredictivePhaseClosureEngine = canViewFinancialSummaryNow
    ? buildPredictivePhaseClosureEngine({
        rhythmEngine: financialPredictiveOperatingRhythmEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        commandEngine: financialPredictiveCommandBriefEngine,
        executionEngine: financialPredictiveExecutionEngine,
        actionEngine: financialPredictiveActionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { closureStatus: "PHASE_LOCKED", closureLabel: "No Access", closureStage: "Locked", nextPhaseGate: "NO_ACCESS", closureScore: 0, closureColor: "#94a3b8", closureBg: "rgba(148,163,184,0.10)", closureNotice: "Phase Closure 7.1.5: engine terkunci untuk role ini.", phaseClosureMemo: "Role tidak memiliki akses Financial Summary.", closureRows: [], closureLocks: ["Role tidak memiliki akses Financial Summary."], dailyCashTarget: 0, monthlyActionTarget: 0, rhythmStatus: "RHYTHM_LOCKED", advisoryStatus: "CFO_LOCKED", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };

  const financialPredictiveScenarioSimulationEngine = canViewFinancialSummaryNow
    ? buildPredictiveScenarioSimulationEngine({
        closureEngine: financialPredictivePhaseClosureEngine,
        rhythmEngine: financialPredictiveOperatingRhythmEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        commandEngine: financialPredictiveCommandBriefEngine,
        executionEngine: financialPredictiveExecutionEngine,
        actionEngine: financialPredictiveActionEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        healthEngine: financialHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
      })
    : { scenarioStatus: "SCENARIO_LOCKED", scenarioLabel: "No Access", scenarioScore: 0, scenarioColor: "#94a3b8", scenarioBg: "rgba(148,163,184,0.10)", scenarioNotice: "Scenario Simulation 7.1.5: engine terkunci untuk role ini.", scenarioMemo: "Role tidak memiliki akses Financial Summary.", recommendedScenario: { id: "locked", label: "No Access", mode: "LOCKED", horizon: "-", target: 0, dailyTarget: 0, score: 0, action: "Role tidak memiliki akses.", locked: true }, scenarioRows: [], simulationLocks: ["Role tidak memiliki akses Financial Summary."], targetMonthlyRecovery: 0, targetDailyRecovery: 0, recoveryMonths: 0, nextPhaseGate: "NO_ACCESS", advisoryStatus: "CFO_LOCKED", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };

  const financialPredictiveScenarioStressTestEngine = canViewFinancialSummaryNow
    ? buildPredictiveScenarioStressTestEngine({
        scenarioEngine: financialPredictiveScenarioSimulationEngine,
        closureEngine: financialPredictivePhaseClosureEngine,
        rhythmEngine: financialPredictiveOperatingRhythmEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        debtRatio: financialDebtRatio,
        monthlyIncome,
        monthlyExpense,
        mandatoryMonthlyTarget: financialHealthDecisionEngine?.mandatoryMonthlyTarget || 0,
      })
    : { stressStatus: "STRESS_LOCKED", stressLabel: "No Access", stressScore: 0, stressColor: "#94a3b8", stressBg: "rgba(148,163,184,0.10)", stressNotice: "Scenario Stress Test 7.1.5: engine terkunci untuk role ini.", stressMemo: "Role tidak memiliki akses Financial Summary.", stressRows: [], uncoveredRows: [], stressLocks: ["Role tidak memiliki akses Financial Summary."], requiredStressBuffer: 0, requiredDailyStressBuffer: 0, primaryStress: null, maxSeverity: 0, averageStressScore: 0, recommendedMode: "LOCKED", scenarioStatus: "SCENARIO_LOCKED", complianceStatus: "LOCKED", gateDecision: "LOCKED", policyMode: "LOCKED", closureStatus: "PHASE_LOCKED", recoveryRequired: false, growthLocked: true, ok: false };

  const financialPredictiveScenarioCashflowProjectionEngine = canViewFinancialSummaryNow
    ? buildPredictiveScenarioCashflowProjectionEngine({
        scenarioEngine: financialPredictiveScenarioSimulationEngine,
        stressEngine: financialPredictiveScenarioStressTestEngine,
        closureEngine: financialPredictivePhaseClosureEngine,
        rhythmEngine: financialPredictiveOperatingRhythmEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        predictiveEngine: financialPredictiveHealthEngine,
        decisionEngine: financialHealthDecisionEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        monthlyIncome,
        monthlyExpense,
        mandatoryMonthlyTarget: financialHealthDecisionEngine?.mandatoryMonthlyTarget || 0,
      })
    : { projectionStatus: "CASHFLOW_LOCKED", projectionLabel: "No Access", projectionScore: 0, projectionColor: "#94a3b8", projectionBg: "rgba(148,163,184,0.10)", projectionNotice: "Scenario Cashflow Projection 7.1.5: engine terkunci untuk role ini.", projectionMemo: "Role tidak memiliki akses Financial Summary.", projectionRows: [], criticalRows: [], worstProjection: null, projectionLocks: ["Role tidak memiliki akses Financial Summary."], netMonthlyCashflow: 0, projectedMonthlyDelta: 0, requiredMonthlyProjectionBuffer: 0, requiredDailyProjectionBuffer: 0, projectionFloorGap: 0, recommendedMode: "LOCKED", scenarioStatus: "SCENARIO_LOCKED", stressStatus: "STRESS_LOCKED", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };

  const financialPredictiveScenarioGoalFeasibilityEngine = canViewFinancialSummaryNow
    ? buildPredictiveScenarioGoalFeasibilityEngine({
        scenarioEngine: financialPredictiveScenarioSimulationEngine,
        stressEngine: financialPredictiveScenarioStressTestEngine,
        projectionEngine: financialPredictiveScenarioCashflowProjectionEngine,
        closureEngine: financialPredictivePhaseClosureEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        decisionEngine: financialHealthDecisionEngine,
        healthEngine: financialHealthEngine,
        goalRows: savingsGoals.map(goal => ({ ...goal, currentAmount: calcGoalValue(goal.id) })),
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        monthlyIncome,
        monthlyExpense,
        mandatoryMonthlyTarget: financialHealthDecisionEngine?.mandatoryMonthlyTarget || 0,
      })
    : { goalFeasibilityStatus: "GOAL_LOCKED", goalFeasibilityLabel: "No Access", goalFeasibilityScore: 0, goalFeasibilityColor: "#94a3b8", goalFeasibilityBg: "rgba(148,163,184,0.10)", goalFeasibilityNotice: "Scenario Goal Feasibility 7.1.5: engine terkunci untuk role ini.", goalFeasibilityMemo: "Role tidak memiliki akses Financial Summary.", goalFeasibilityRows: [], blockedGoalRows: [], mandatoryBlockedRows: [], feasibilityLocks: ["Role tidak memiliki akses Financial Summary."], availableForGoals: 0, goalCapacityBase: 0, reservedBuffer: 0, mandatoryMonthly: 0, importantMonthly: 0, optionalMonthly: 0, weightedMonthlyNeed: 0, mandatoryGoalGap: 0, importantGoalGap: 0, totalGoalGap: 0, requiredMonthlyGoalBuffer: 0, requiredDailyGoalBuffer: 0, recommendedMode: "LOCKED", scenarioStatus: "SCENARIO_LOCKED", stressStatus: "STRESS_LOCKED", projectionStatus: "CASHFLOW_LOCKED", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };

  const financialPredictiveScenarioDecisionRecommendationEngine = canViewFinancialSummaryNow
    ? buildPredictiveScenarioDecisionRecommendationEngine({
        scenarioEngine: financialPredictiveScenarioSimulationEngine,
        stressEngine: financialPredictiveScenarioStressTestEngine,
        projectionEngine: financialPredictiveScenarioCashflowProjectionEngine,
        goalFeasibilityEngine: financialPredictiveScenarioGoalFeasibilityEngine,
        closureEngine: financialPredictivePhaseClosureEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        decisionEngine: financialHealthDecisionEngine,
        healthEngine: financialHealthEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        monthlyIncome,
        monthlyExpense,
      })
    : { decisionStatus: "DECISION_LOCKED", decisionLabel: "No Access", decisionRecommendation: "LOCKED_SCENARIO", decisionScore: 0, decisionColor: "#94a3b8", decisionBg: "rgba(148,163,184,0.10)", decisionNotice: "Scenario Decision Recommendation 7.1.5: engine terkunci untuk role ini.", decisionMemo: "Role tidak memiliki akses Financial Summary.", recommendationRows: [], decisionLocks: ["Role tidak memiliki akses Financial Summary."], blockers: ["role_locked"], blockerCount: 1, requiredMonthlyDecisionBuffer: 0, requiredDailyDecisionBuffer: 0, netMonthlyCashflow: 0, recommendedMode: "LOCKED", scenarioStatus: "SCENARIO_LOCKED", stressStatus: "STRESS_LOCKED", projectionStatus: "CASHFLOW_LOCKED", goalFeasibilityStatus: "GOAL_LOCKED", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", nextPhaseGate: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };

  const financialPredictiveScenarioClosureEngine = canViewFinancialSummaryNow
    ? buildPredictiveScenarioClosureEngine({
        scenarioEngine: financialPredictiveScenarioSimulationEngine,
        stressEngine: financialPredictiveScenarioStressTestEngine,
        projectionEngine: financialPredictiveScenarioCashflowProjectionEngine,
        goalFeasibilityEngine: financialPredictiveScenarioGoalFeasibilityEngine,
        decisionRecommendationEngine: financialPredictiveScenarioDecisionRecommendationEngine,
        closureEngine: financialPredictivePhaseClosureEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        healthEngine: financialHealthEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        monthlyIncome,
        monthlyExpense,
      })
    : { scenarioClosureStatus: "SCENARIO_LOCKED", scenarioClosureLabel: "No Access", scenarioClosureScore: 0, scenarioClosureColor: "#94a3b8", scenarioClosureBg: "rgba(148,163,184,0.10)", scenarioClosureNotice: "Scenario Closure 7.1.5: engine terkunci untuk role ini.", scenarioClosureMemo: "Role tidak memiliki akses Financial Summary.", closureRows: [], scenarioClosureLocks: ["Role tidak memiliki akses Financial Summary."], blockers: ["role_locked"], blockerCount: 1, requiredMonthlyClosureBuffer: 0, requiredDailyClosureBuffer: 0, nextScenarioTrack: "LOCKED_BEFORE_7_2", netMonthlyCashflow: 0, recommendedMode: "LOCKED", scenarioStatus: "SCENARIO_LOCKED", stressStatus: "STRESS_LOCKED", projectionStatus: "CASHFLOW_LOCKED", goalFeasibilityStatus: "GOAL_LOCKED", decisionStatus: "DECISION_LOCKED", decisionRecommendation: "LOCKED_SCENARIO", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", phaseClosureStatus: "PHASE_LOCKED", nextPhaseGate: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };


  const financialPredictiveAllocationPlanningEngine = canViewFinancialSummaryNow
    ? buildPredictiveAllocationPlanningEngine({
        scenarioClosureEngine: financialPredictiveScenarioClosureEngine,
        scenarioEngine: financialPredictiveScenarioSimulationEngine,
        stressEngine: financialPredictiveScenarioStressTestEngine,
        projectionEngine: financialPredictiveScenarioCashflowProjectionEngine,
        goalFeasibilityEngine: financialPredictiveScenarioGoalFeasibilityEngine,
        decisionRecommendationEngine: financialPredictiveScenarioDecisionRecommendationEngine,
        cfoEngine: financialPredictiveCfoAdvisoryEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        healthEngine: financialHealthEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        monthlyIncome,
        monthlyExpense,
        mandatoryMonthlyTarget: financialHealthDecisionEngine?.mandatoryMonthlyTarget || 0,
      })
    : { allocationStatus: "ALLOCATION_LOCKED", allocationLabel: "No Access", allocationMode: "LOCKED_ALLOCATION", allocationScore: 0, allocationColor: "#94a3b8", allocationBg: "rgba(148,163,184,0.10)", allocationNotice: "Allocation Planning 7.2.0: engine terkunci untuk role ini.", allocationMemo: "Role tidak memiliki akses Financial Summary.", allocationRows: [], allocationLocks: ["Role tidak memiliki akses Financial Summary."], requiredMonthlyAllocationBuffer: 0, requiredDailyAllocationBuffer: 0, allocationShortfall: 0, allocatableMonthly: 0, protectedMonthly: 0, recoveryAllocation: 0, mandatoryGoalAllocation: 0, controlBufferAllocation: 0, growthAllocation: 0, netMonthlyCashflow: 0, scenarioClosureStatus: "SCENARIO_LOCKED", nextScenarioTrack: "NO_ACCESS", scenarioStatus: "SCENARIO_LOCKED", stressStatus: "STRESS_LOCKED", projectionStatus: "CASHFLOW_LOCKED", goalFeasibilityStatus: "GOAL_LOCKED", decisionStatus: "DECISION_LOCKED", decisionRecommendation: "LOCKED_SCENARIO", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };




  const financialPredictiveAllocationGuardrailEngine = canViewFinancialSummaryNow
    ? buildPredictiveAllocationGuardrailEngine({
        allocationEngine: financialPredictiveAllocationPlanningEngine,
        scenarioClosureEngine: financialPredictiveScenarioClosureEngine,
        projectionEngine: financialPredictiveScenarioCashflowProjectionEngine,
        goalFeasibilityEngine: financialPredictiveScenarioGoalFeasibilityEngine,
        decisionRecommendationEngine: financialPredictiveScenarioDecisionRecommendationEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        monthlyIncome,
        monthlyExpense,
      })
    : { guardrailStatus: "GUARDRAIL_LOCKED", guardrailLabel: "No Access", guardrailMode: "LOCKED_GUARDRAIL", guardrailScore: 0, guardrailColor: "#94a3b8", guardrailBg: "rgba(148,163,184,0.10)", guardrailNotice: "Allocation Guardrail 7.2.1: engine terkunci untuk role ini.", guardrailMemo: "Role tidak memiliki akses Financial Summary.", guardrailRows: [], guardrailLocks: ["Role tidak memiliki akses Financial Summary."], blockers: ["role_locked"], blockerCount: 1, monthlySpendLimit: 0, dailySpendLimit: 0, monthlyRecoveryFloor: 0, monthlyGoalFloor: 0, monthlyReserveFloor: 0, protectedMonthlyOutflow: 0, growthCap: 0, guardrailGap: 0, allocationShortfall: 0, requiredMonthlyAllocationBuffer: 0, netMonthlyCashflow: 0, allocationStatus: "ALLOCATION_LOCKED", allocationMode: "LOCKED_ALLOCATION", scenarioClosureStatus: "SCENARIO_LOCKED", projectionStatus: "CASHFLOW_LOCKED", goalFeasibilityStatus: "GOAL_LOCKED", decisionStatus: "DECISION_LOCKED", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };



  const financialPredictiveAllocationExecutionEngine = canViewFinancialSummaryNow
    ? buildPredictiveAllocationExecutionEngine({
        allocationEngine: financialPredictiveAllocationPlanningEngine,
        guardrailEngine: financialPredictiveAllocationGuardrailEngine,
        scenarioClosureEngine: financialPredictiveScenarioClosureEngine,
        decisionRecommendationEngine: financialPredictiveScenarioDecisionRecommendationEngine,
        complianceEngine: financialPredictiveGovernanceComplianceEngine,
        governanceEngine: financialPredictiveGovernancePolicyEngine,
        gateEngine: financialPredictiveDecisionGateEngine,
        walletTotal: financialWalletTotal,
        netWorth: financialNetWorth,
        monthlyIncome,
        monthlyExpense,
      })
    : { executionStatus: "EXECUTION_LOCKED", executionLabel: "No Access", executionMode: "LOCKED_EXECUTION", executionScore: 0, executionColor: "#94a3b8", executionBg: "rgba(148,163,184,0.10)", executionNotice: "Allocation Execution 7.2.2: engine terkunci untuk role ini.", executionMemo: "Role tidak memiliki akses Financial Summary.", executionRows: [], executionLocks: ["Role tidak memiliki akses Financial Summary."], blockers: ["role_locked"], blockerCount: 1, releaseCashNow: 0, holdCash: 0, recoveryExecution: 0, goalExecution: 0, reserveExecution: 0, growthExecution: 0, executionGap: 0, monthlySpendLimit: 0, dailySpendLimit: 0, monthlyRecoveryFloor: 0, monthlyGoalFloor: 0, monthlyReserveFloor: 0, growthCap: 0, guardrailGap: 0, allocationShortfall: 0, requiredMonthlyAllocationBuffer: 0, netMonthlyCashflow: 0, allocationStatus: "ALLOCATION_LOCKED", allocationMode: "LOCKED_ALLOCATION", guardrailStatus: "GUARDRAIL_LOCKED", guardrailMode: "LOCKED_GUARDRAIL", scenarioClosureStatus: "SCENARIO_LOCKED", decisionStatus: "DECISION_LOCKED", decisionRecommendation: "LOCKED_SCENARIO", complianceStatus: "LOCKED", policyMode: "LOCKED", gateDecision: "LOCKED", recoveryRequired: false, growthLocked: true, ok: false };


  const childTotals = ["aroon","arunika","arkaja"].map(child => {
    const goals = savingsGoals.filter(g => g.category === child);
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
    const goal = savingsGoals.find(g => g.id === goalId);
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

    const goal = savingsGoals.find(g => g.id === goalId);
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

    const goalLabel = savingsGoals.find(g => g.id === goalId)?.label || goalId;
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
    const goal = savingsGoals.find(g => g.id === goalId);
    const assetType = ASSET_TYPES.find(a => a.id === holding.assetType);
    const sourceId = holding.sumberDanaId;
    const source = sumberDanaList.find(s => s.id === sourceId);
    const refundValue = holding.costBasisIdr || (["idr","obligasi"].includes(holding.assetType) ? (holding.idrValue || holding.qty || 0) : ((holding.qty || 0) * (holding.buyPrice || 0)));

    const isFromInvestment = holding.sourceMode === "investment_transfer" && holding.sourceInvestmentId;
    const confirmText = isFromInvestment
      ? "Batalkan pemindahan aset ini? Aset akan dikembalikan ke Investasi dan wallet tidak berubah."
      : "Batalkan alokasi aset ini? Wallet sumber akan dikembalikan " + formatRupiah(refundValue) + " dan aset dihapus dari goal.";
    const ok = window.confirm(confirmText);
    if (!ok) return;

    const updated = { ...savingsHoldings, [goalId]: existing.filter(h => String(h.id) !== String(holdingId)) };
    await setDoc(doc(db, "savings", "holdings"), updated);
    setSavingsHoldings(updated);

    if (isFromInvestment) {
      const { updateDoc } = await import("firebase/firestore");
      const inv = investments.find(i => i.id === holding.sourceInvestmentId);
      if (inv) {
        const restoredQty = Number(inv.qty ?? inv.amount ?? 0) + Number(holding.qty || 0);
        const restoredCost = Number(inv.costBasis || 0) + Number(refundValue || 0);
        await updateDoc(doc(db, "investments", inv.id), {
          qty: restoredQty,
          amount: restoredQty,
          costBasis: restoredCost,
          status: "active",
          restoredFromGoalAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser,
        });
      }
      await addActivityLog("asset_to_goal_cancelled", currentUser + " membatalkan pemindahan aset " + (assetType?.label || holding.assetType || "Aset") + " dari Goal " + (goal?.label || goalId) + " kembali ke Investasi. Wallet tidak berubah.");
      syncToSheets("cancelAssetToGoal", { goalId, goalLabel: goal?.label || goalId, holdingId, sourceInvestmentId: holding.sourceInvestmentId, amount: refundValue, user: currentUser });
      return;
    }

    if (sourceId && refundValue) {
      await logLedger(sourceId, refundValue, "Batalkan alokasi aset " + (assetType?.label || holding.assetType || "Aset") + " dari goal: " + (goal?.label || goalId), "goal_asset_cancel", String(holdingId));
    }
    await addActivityLog("goal_asset_cancelled", currentUser + " membatalkan alokasi aset " + (assetType?.label || holding.assetType || "Aset") + " senilai " + formatRupiah(refundValue) + " dari " + (goal?.label || goalId) + (source ? " ke " + source.name : ""));
    syncToSheets("cancelGoalAsset", { goalId, goalLabel: goal?.label || goalId, holdingId, refundValue, sumberDanaId: sourceId || "", sumberDanaName: source?.name || "", user: currentUser, createdAt: new Date().toISOString() });
  }

  function getGoalCategoryColor(category = "custom") {
    const colors = {
      education: "#6366f1",
      aroon: "#60a5fa",
      arunika: "#ec4899",
      arkaja: "#f59e0b",
      future: "#10b981",
      pension: "#14b8a6",
      health: "#ef4444",
      custom: "#8b5cf6",
    };
    return colors[category] || "#6366f1";
  }

  function getGoalPriorityMeta(priority = "Penting") {
    const p = String(priority || "").toLowerCase();
    if (p.includes("wajib")) return { label: "Wajib", color: "#fca5a5", bg: "rgba(239,68,68,0.16)", border: "rgba(239,68,68,0.36)" };
    if (p.includes("opsional")) return { label: "Opsional", color: "#cbd5e1", bg: "rgba(148,163,184,0.13)", border: "rgba(148,163,184,0.26)" };
    return { label: "Penting", color: "#fbbf24", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.34)" };
  }

  function resetGoalBuilderForm(seedCategory = null) {
    const inferredCategory = seedCategory || (savingsTab === "education" ? selectedEducationChild : savingsTab) || "future";
    setGoalBuilderForm({
      label: "",
      icon: "🎯",
      category: inferredCategory,
      targetAmount: "",
      yearsLeft: "",
      priority: inferredCategory === "future" || inferredCategory === "custom" ? "penting" : "wajib",
      desc: "",
      visibility: "owner_admin",
      fundingType: "mixed",
      status: "active",
      color: getGoalCategoryColor(inferredCategory),
      program: "",
      provider: "",
      beneficiary: "",
      premiumAmount: "",
      coverageAmount: "",
      renewalCycle: "",
    });
  }

  function openGoalBuilder(goal = null, forcedCategory = null) {
    if (!canManageGoalFunds()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin membuat/mengubah Goal.");
      return;
    }
    if (goal) {
      setEditingGoal(goal);
      setGoalBuilderForm({
        label: goal.label || "",
        icon: goal.icon || "🎯",
        category: goal.category || "future",
        targetAmount: goal.targetAmount ? String(Math.round(Number(goal.targetAmount))) : "",
        yearsLeft: goal.yearsLeft ? String(goal.yearsLeft) : "",
        priority: String(goal.priority || getGoalPriorityLabel(goal) || "penting").toLowerCase(),
        desc: goal.desc || "",
        visibility: goal.visibility || "owner_admin",
        fundingType: goal.fundingType || "mixed",
        status: goal.status || "active",
        color: goal.color || getGoalCategoryColor(goal.category || "custom"),
        program: goal.program || "",
        provider: goal.provider || "",
        beneficiary: goal.beneficiary || "",
        premiumAmount: goal.premiumAmount ? String(Math.round(Number(goal.premiumAmount))) : "",
        coverageAmount: goal.coverageAmount ? String(Math.round(Number(goal.coverageAmount))) : "",
        renewalCycle: goal.renewalCycle || "",
      });
    } else {
      setEditingGoal(null);
      resetGoalBuilderForm(forcedCategory);
    }
    setShowGoalBuilder(true);
  }

  function normalizeGoalPayload() {
    const label = (goalBuilderForm.label || "").trim();
    const targetAmount = parseAmount(goalBuilderForm.targetAmount);
    const yearsLeft = parseDecimal(goalBuilderForm.yearsLeft);
    if (!label) {
      showAccessNotice("Isi nama/tujuan Goal.");
      return null;
    }
    if (!targetAmount || targetAmount <= 0) {
      showAccessNotice("Isi target nominal Goal.");
      return null;
    }
    return {
      label,
      icon: goalBuilderForm.icon || "🎯",
      category: goalBuilderForm.category || "custom",
      targetAmount,
      yearsLeft: yearsLeft || 1,
      priority: goalBuilderForm.priority || "penting",
      desc: goalBuilderForm.desc || "",
      visibility: goalBuilderForm.visibility || "owner_admin",
      fundingType: goalBuilderForm.fundingType || "mixed",
      status: goalBuilderForm.status || "active",
      color: getGoalCategoryColor(goalBuilderForm.category || "custom"),
      program: goalBuilderForm.program || "",
      provider: goalBuilderForm.provider || "",
      beneficiary: goalBuilderForm.beneficiary || "",
      premiumAmount: parseAmount(goalBuilderForm.premiumAmount),
      coverageAmount: parseAmount(goalBuilderForm.coverageAmount),
      renewalCycle: goalBuilderForm.renewalCycle || "",
      updatedBy: currentUser,
      updatedAt: new Date().toISOString(),
    };
  }

  async function saveGoalBuilder() {
    if (!canManageGoalFunds()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin membuat/mengubah Goal.");
      return;
    }
    const payload = normalizeGoalPayload();
    if (!payload) return;

    if (editingGoal) {
      if (editingGoal.sourceType === "custom") {
        await setDoc(doc(db, "customGoals", editingGoal.id), {
          ...editingGoal,
          ...payload,
          createdAt: editingGoal.createdAt || new Date().toISOString(),
          createdBy: editingGoal.createdBy || currentUser,
        });
      } else {
        const nextOverrides = {
          ...(goalOverrides || {}),
          [editingGoal.id]: {
            ...(goalOverrides?.[editingGoal.id] || {}),
            ...payload,
          },
        };
        await setDoc(doc(db, "savings", "goalOverrides"), { items: nextOverrides, updatedAt: new Date().toISOString(), updatedBy: currentUser });
        setGoalOverrides(nextOverrides);
      }
      await addActivityLog("goal_updated", currentUser + " mengubah Goal " + payload.label + ".");
      syncToSheets("goalUpdated", { id: editingGoal.id, ...payload, sourceType: editingGoal.sourceType || "template" });
    } else {
      const docRef = await addDoc(collection(db, "customGoals"), {
        ...payload,
        createdBy: currentUser,
        createdAt: new Date().toISOString(),
        sourceType: "custom",
      });
      await addActivityLog("goal_created", currentUser + " membuat Goal custom " + payload.label + " dengan target " + formatRupiah(payload.targetAmount) + ".");
      syncToSheets("goalCreated", { id: docRef.id, ...payload, user: currentUser });
    }

    setShowGoalBuilder(false);
    setShowGoalTemplateManager(false);
    setShowPeriodPicker(false);
    setSelectedPermissionRole(null);
    setEditingGoal(null);
    resetGoalBuilderForm();
  }

  async function archiveGoal(goal) {
    if (!goal || !canManageGoalFunds()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin mengarsipkan Goal.");
      return;
    }
    const currentVal = calcGoalValue(goal.id);
    const ok = window.confirm("Arsipkan Goal " + (goal.label || goal.id) + "? Data alokasi/log tidak dihapus. Nilai teralokasi saat ini: " + formatRupiah(currentVal) + ".");
    if (!ok) return;

    if (goal.sourceType === "custom") {
      await setDoc(doc(db, "customGoals", goal.id), {
        ...goal,
        status: "archived",
        archivedAt: new Date().toISOString(),
        archivedBy: currentUser,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      });
    } else {
      const nextOverrides = {
        ...(goalOverrides || {}),
        [goal.id]: {
          ...(goalOverrides?.[goal.id] || {}),
          status: "archived",
          archivedAt: new Date().toISOString(),
          archivedBy: currentUser,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser,
        },
      };
      await setDoc(doc(db, "savings", "goalOverrides"), { items: nextOverrides, updatedAt: new Date().toISOString(), updatedBy: currentUser });
      setGoalOverrides(nextOverrides);
    }
    await addActivityLog("goal_archived", currentUser + " mengarsipkan Goal " + (goal.label || goal.id) + ".");
    syncToSheets("goalArchived", { id: goal.id, label: goal.label, sourceType: goal.sourceType || "template", user: currentUser });
  }

  async function restoreGoal(goal) {
    if (!goal || !canManageGoalFunds()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin restore Goal.");
      return;
    }
    if (goal.sourceType === "custom") {
      await setDoc(doc(db, "customGoals", goal.id), {
        ...goal,
        status: "active",
        restoredAt: new Date().toISOString(),
        restoredBy: currentUser,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      });
    } else {
      const nextOverrides = {
        ...(goalOverrides || {}),
        [goal.id]: {
          ...(goalOverrides?.[goal.id] || {}),
          status: "active",
          restoredAt: new Date().toISOString(),
          restoredBy: currentUser,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser,
        },
      };
      await setDoc(doc(db, "savings", "goalOverrides"), { items: nextOverrides, updatedAt: new Date().toISOString(), updatedBy: currentUser });
      setGoalOverrides(nextOverrides);
    }
    await addActivityLog("goal_restored", currentUser + " mengaktifkan kembali Goal " + (goal.label || goal.id) + ".");
    syncToSheets("goalRestored", { id: goal.id, label: goal.label, sourceType: goal.sourceType || "template", user: currentUser });
  }

  async function duplicateGoalTemplate(goal) {
    if (!goal || !canManageGoalFunds()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin duplikasi Goal.");
      return;
    }
    const payload = {
      label: (goal.label || "Goal") + " Custom",
      icon: goal.icon || "🎯",
      category: goal.category || "custom",
      targetAmount: Number(goal.targetAmount || 0),
      yearsLeft: Number(goal.yearsLeft || 1),
      priority: String(goal.priority || getGoalPriorityLabel(goal) || "penting").toLowerCase(),
      desc: goal.desc || "",
      visibility: goal.visibility || "owner_admin",
      fundingType: goal.fundingType || "mixed",
      status: "active",
      color: goal.color || "#6366f1",
      sourceType: "custom",
      duplicatedFrom: goal.id,
      duplicatedFromType: goal.sourceType || "template",
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      updatedBy: currentUser,
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "customGoals"), payload);
    await addActivityLog("goal_duplicated", currentUser + " menduplikasi Goal " + (goal.label || goal.id) + " menjadi custom goal.");
    syncToSheets("goalDuplicated", { id: docRef.id, ...payload });
  }

  function resetGoalUsageForm(goalId = null) {
    const holdings = goalId ? (savingsHoldings[goalId] || []) : [];
    const hasCash = goalId ? Number(savingsData[goalId] || 0) > 0 : true;
    setGoalUsageForm({
      mode: hasCash ? "cash" : "asset",
      amount: "",
      assetHoldingId: holdings[0]?.id ? String(holdings[0].id) : "",
      assetQty: "",
      category: "pendidikan",
      usedFor: "",
      note: "",
      date: new Date().toISOString().split("T")[0],
    });
  }

  function openGoalUsageModal(goalId) {
    if (!canManageGoalFunds()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin memakai dana Goal.");
      return;
    }
    resetGoalUsageForm(goalId);
    setShowGoalUsage(goalId);
  }

  function goalUsagesFor(goalId) {
    return goalUsageLog
      .filter(u => String(u.goalId) === String(goalId))
      .sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")));
  }

  function getGoalLinkSuggestionsForTransaction(tx) {
    const beneficiary = String(tx?.user || tx?.userName || "").toLowerCase();
    const category = String(tx?.category || "").toLowerCase();
    const note = String(tx?.note || tx?.notes || "").toLowerCase();
    return (savingsGoals || [])
      .filter(g => g.status !== "archived")
      .map(g => {
        const label = String(g.label || g.id || "").toLowerCase();
        const goalCategory = String(g.category || "").toLowerCase();
        let score = 0;
        if (beneficiary && label.includes(beneficiary)) score += 4;
        if (beneficiary && goalCategory.includes(beneficiary)) score += 3;
        if (category.includes("pendidikan") && label.includes("pendidikan")) score += 3;
        if (category.includes("pendidikan") && (label.includes("sd") || label.includes("sekolah"))) score += 3;
        if (category.includes("kesehatan") && (label.includes("kesehatan") || label.includes("health"))) score += 2;
        if (note && label && note.includes(label.slice(0, Math.min(label.length, 8)))) score += 1;
        return { ...g, _linkScore: score };
      })
      .sort((a, b) => Number(b._linkScore || 0) - Number(a._linkScore || 0) || String(a.label || "").localeCompare(String(b.label || "")));
  }

  async function linkExistingTransactionToGoalUsage(tx) {
    if (!tx?.id) return;
    if (!isOwner) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Link transaksi ke Goal hanya untuk Owner." }));
      return;
    }
    if (tx.type !== "expense") {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Hanya transaksi expense yang bisa mengurangi Goal." }));
      return;
    }
    if (tx.goalId || tx.goalUsageId) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "✅ Transaksi ini sudah terhubung ke Goal." }));
      return;
    }
    const goalId = transactionGoalLinkForm.goalId;
    if (!goalId) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Pilih Goal yang akan dikurangi." }));
      return;
    }
    const goal = savingsGoals.find(g => String(g.id) === String(goalId));
    if (!goal) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Goal tidak ditemukan." }));
      return;
    }

    const amount = Number(tx.amount || 0);
    const currentCash = Number(savingsData[goalId] || 0);
    if (!amount || amount <= 0) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Nominal transaksi tidak valid." }));
      return;
    }
    if (currentCash <= 0) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Dana tunai Goal masih Rp 0. Transaksi bisa dicatat sebagai expense, tapi belum ada saldo Goal yang bisa dikurangi." }));
      return;
    }

    const usedAmount = Math.min(amount, currentCash);
    const goalLabel = goal.label || goalId;
    const confirmText = usedAmount < amount
      ? "Dana tunai Goal lebih kecil dari transaksi. Kurangi Goal " + goalLabel + " sebesar " + formatRupiah(usedAmount) + " dari transaksi " + formatRupiah(amount) + "? Wallet tidak akan dipotong ulang."
      : "Hubungkan transaksi " + formatRupiah(amount) + " ke Goal " + goalLabel + " dan kurangi saldo Goal? Wallet tidak akan dipotong ulang karena transaksi sudah tercatat sebagai expense.";
    const ok = window.confirm(confirmText);
    if (!ok) return;

    const now = new Date().toISOString();
    setTransactionGoalLinkForm(prev => ({ ...prev, status: "Merekonsiliasi transaksi ke Goal..." }));

    const newGoalCash = { ...savingsData, [goalId]: Math.max(currentCash - usedAmount, 0) };
    await setDoc(doc(db, "savings", "goals"), newGoalCash);
    setSavingsData(newGoalCash);

    const usageRef = await addDoc(collection(db, "goalUsage"), {
      goalId,
      goalLabel,
      mode: "cash",
      amount: usedAmount,
      originalTransactionAmount: amount,
      category: tx.category || "linked_transaction",
      usedFor: tx.note || tx.notes || "Transaksi expense yang direkonsiliasi ke Goal",
      note: "Linked from existing transaction. Wallet ledger tidak dipotong ulang.",
      date: tx.date || String(tx.createdAt || "").slice(0, 10) || new Date().toISOString().split("T")[0],
      sourceTransactionId: tx.id,
      linkedWithoutWalletMutation: true,
      createdBy: currentUser,
      createdAt: now,
    });

    const updateData = {
      goalId,
      goalLabel,
      goalUsageId: usageRef.id,
      goalLinkedAt: now,
      goalLinkedBy: currentUser || "Owner",
      goalLinkedAmount: usedAmount,
      goalLinkMode: "existing_expense_reconciliation",
      updatedAt: now,
      updatedBy: currentUser || "Owner",
    };
    await setDoc(doc(db, "transactions", tx.id), updateData, { merge: true });

    await addActivityLog("transaction_goal_reconciled", "Owner menghubungkan transaksi " + formatRupiah(amount) + " ke Goal " + goalLabel + " dan mengurangi saldo Goal " + formatRupiah(usedAmount) + ".");
    syncToSheets("transactionGoalReconciled", { id: tx.id, goalId, goalLabel, amount, usedAmount, user: currentUser, createdAt: now });

    setSelectedTransaction({ ...tx, ...updateData });
    setTransactionGoalLinkForm({ goalId: "", status: "✅ Transaksi sudah dihubungkan ke Goal. Saldo Goal berkurang tanpa memotong wallet ulang." });
  }


  async function unlinkGoalUsageFromTransaction(tx) {
    if (!tx?.id) return;
    if (!isOwner) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Batalkan link Goal hanya untuk Owner." }));
      return;
    }
    const goalId = tx.goalId || "";
    const goalUsageId = tx.goalUsageId || "";
    if (!goalId && !goalUsageId) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Transaksi ini belum terhubung ke Goal." }));
      return;
    }
    const amount = Number(tx.goalLinkedAmount || tx.amount || 0);
    if (!amount || amount <= 0) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Nominal link Goal tidak valid." }));
      return;
    }
    const goal = savingsGoals.find(g => String(g.id) === String(goalId));
    const goalLabel = goal?.label || tx.goalLabel || goalId || "Goal";
    const ok = window.confirm("Batalkan link transaksi ini dari Goal " + goalLabel + "? Saldo tunai Goal akan dikembalikan " + formatRupiah(amount) + ". Wallet tidak berubah karena expense tetap tercatat.");
    if (!ok) return;

    const now = new Date().toISOString();
    try {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "Membatalkan link Goal..." }));
      if (goalId) {
        const nextGoalCash = { ...savingsData, [goalId]: Number(savingsData[goalId] || 0) + amount };
        await setDoc(doc(db, "savings", "goals"), nextGoalCash);
        setSavingsData(nextGoalCash);
      }
      if (goalUsageId) {
        try {
          await deleteDoc(doc(db, "goalUsage", goalUsageId));
        } catch (err) {
          console.warn("goalUsage delete skipped", err);
        }
      }

      const updateData = {
        goalId: "",
        goalLabel: "",
        goalUsageId: "",
        goalLinkedAmount: 0,
        goalLinkMode: "goal_link_unlinked",
        previousGoalId: goalId,
        previousGoalLabel: goalLabel,
        previousGoalUsageId: goalUsageId,
        goalUnlinkedAt: now,
        goalUnlinkedBy: currentUser || "Owner",
        updatedAt: now,
        updatedBy: currentUser || "Owner",
      };
      await setDoc(doc(db, "transactions", tx.id), updateData, { merge: true });
      await addActivityLog("transaction_goal_unlinked", "Owner membatalkan link transaksi " + formatRupiah(amount) + " dari Goal " + goalLabel + ". Expense tetap tercatat dan wallet tidak berubah.");
      syncToSheets("transactionGoalUnlinked", { id: tx.id, goalId, goalLabel, amount, user: currentUser, createdAt: now });
      setSelectedTransaction({ ...tx, ...updateData });
      setTransactionGoalLinkForm({ goalId: "", status: "✅ Link Goal dibatalkan. Saldo Goal dikembalikan, wallet tidak berubah." });
    } catch (err) {
      console.error(err);
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Gagal membatalkan link Goal. Cek koneksi lalu coba lagi." }));
    }
  }

  async function settlePendingGoalAmountForTransaction(tx) {
    if (!tx?.id) return;
    if (!isOwner) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Penyelesaian selisih Goal hanya untuk Owner." }));
      return;
    }
    if (tx.type !== "expense") {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Hanya transaksi expense yang bisa mengurangi Goal." }));
      return;
    }
    const goalId = tx.goalId || "";
    if (!goalId) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Transaksi ini belum punya link Goal." }));
      return;
    }
    const pendingAmount = Number(tx.goalPendingAmount || 0);
    if (!pendingAmount || pendingAmount <= 0) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "✅ Tidak ada selisih Goal yang perlu diselesaikan." }));
      return;
    }
    const currentCash = Number(savingsData[goalId] || 0);
    if (currentCash <= 0) {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Saldo tunai Goal masih Rp 0, jadi selisih belum bisa dikurangi dari Goal." }));
      return;
    }
    const goal = savingsGoals.find(g => String(g.id) === String(goalId));
    const goalLabel = goal?.label || tx.goalLabel || goalId || "Goal";
    const settleAmount = Math.min(pendingAmount, currentCash);
    const ok = window.confirm("Kurangi saldo Goal " + goalLabel + " sebesar " + formatRupiah(settleAmount) + " untuk menyelesaikan selisih transaksi ini? Wallet tidak akan dipotong ulang.");
    if (!ok) return;

    const now = new Date().toISOString();
    try {
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "Menyelesaikan selisih Goal..." }));
      const nextGoalCash = { ...savingsData, [goalId]: Math.max(currentCash - settleAmount, 0) };
      await setDoc(doc(db, "savings", "goals"), nextGoalCash);
      setSavingsData(nextGoalCash);

      const previousLinkedAmount = Number(tx.goalLinkedAmount || 0);
      const nextLinkedAmount = previousLinkedAmount + settleAmount;
      const remainingPendingAmount = Math.max(pendingAmount - settleAmount, 0);
      let nextGoalUsageId = tx.goalUsageId || "";

      if (nextGoalUsageId) {
        await setDoc(doc(db, "goalUsage", nextGoalUsageId), {
          amount: nextLinkedAmount,
          originalTransactionAmount: Number(tx.amount || nextLinkedAmount),
          category: tx.category || "linked_transaction",
          usedFor: tx.note || tx.notes || "Transaksi expense terhubung ke Goal",
          note: "Goal usage diperbarui dari penyelesaian selisih pending. Wallet ledger tidak dipotong ulang.",
          date: tx.date || String(tx.createdAt || "").slice(0, 10) || new Date().toISOString().split("T")[0],
          updatedAt: now,
          updatedBy: currentUser || "Owner",
          pendingSettlementSynced: true,
        }, { merge: true });
      } else {
        const usageRef = await addDoc(collection(db, "goalUsage"), {
          goalId,
          goalLabel,
          mode: "cash",
          amount: nextLinkedAmount,
          originalTransactionAmount: Number(tx.amount || nextLinkedAmount),
          category: tx.category || "linked_transaction",
          usedFor: tx.note || tx.notes || "Transaksi expense terhubung ke Goal",
          note: "Goal usage dibuat saat penyelesaian selisih pending. Wallet ledger tidak dipotong ulang.",
          date: tx.date || String(tx.createdAt || "").slice(0, 10) || new Date().toISOString().split("T")[0],
          sourceTransactionId: tx.id,
          linkedWithoutWalletMutation: true,
          createdBy: currentUser || "Owner",
          createdAt: now,
          pendingSettlementCreated: true,
        });
        nextGoalUsageId = usageRef.id;
      }

      const updateData = {
        goalUsageId: nextGoalUsageId,
        goalLinkedAmount: nextLinkedAmount,
        goalPendingAmount: remainingPendingAmount,
        goalPendingSettledAt: now,
        goalPendingSettledBy: currentUser || "Owner",
        goalPendingLastSettledAmount: settleAmount,
        goalPendingSettlementStatus: remainingPendingAmount > 0 ? "partial" : "settled",
        updatedAt: now,
        updatedBy: currentUser || "Owner",
      };
      await setDoc(doc(db, "transactions", tx.id), updateData, { merge: true });
      await addActivityLog("transaction_goal_pending_settled", "Owner menyelesaikan selisih Goal " + goalLabel + " sebesar " + formatRupiah(settleAmount) + ". Wallet tidak berubah.");
      syncToSheets("transactionGoalPendingSettled", { id: tx.id, goalId, goalLabel, amount: settleAmount, remainingPendingAmount, user: currentUser, createdAt: now });
      setSelectedTransaction({ ...tx, ...updateData });
      setTransactionGoalLinkForm({ goalId: "", status: remainingPendingAmount > 0 ? "✅ Sebagian selisih Goal diselesaikan. Sisa pending: " + formatRupiah(remainingPendingAmount) + "." : "✅ Selisih Goal selesai. Saldo Goal sudah dikurangi tanpa memotong wallet ulang." });
    } catch (err) {
      console.error(err);
      setTransactionGoalLinkForm(prev => ({ ...prev, status: "⚠️ Gagal menyelesaikan selisih Goal. Cek koneksi lalu coba lagi." }));
    }
  }

  async function useGoalFunds() {
    const goalId = showGoalUsage;
    if (!goalId) return;
    if (!canManageGoalFunds()) {
      showAccessNotice("Role " + currentRole + " tidak punya izin memakai dana Goal.");
      return;
    }

    const goal = savingsGoals.find(g => g.id === goalId);
    const goalLabel = goal?.label || goalId;
    const usedFor = (goalUsageForm.usedFor || "").trim();
    if (!usedFor) {
      showAccessNotice("Isi dana goal dipakai untuk apa.");
      return;
    }

    const mode = goalUsageForm.mode || "cash";
    const now = new Date().toISOString();

    if (mode === "cash") {
      const amount = parseAmount(goalUsageForm.amount);
      const currentCash = Number(savingsData[goalId] || 0);
      if (!amount || amount <= 0) {
        showAccessNotice("Isi nominal dana goal yang dipakai.");
        return;
      }
      if (amount > currentCash) {
        showAccessNotice("Dana tunai goal tidak cukup. Gunakan nominal maksimal " + formatRupiah(currentCash) + ".");
        return;
      }

      const ok = window.confirm("Pakai dana tunai " + formatRupiah(amount) + " dari Goal " + goalLabel + " untuk: " + usedFor + "?");
      if (!ok) return;

      const newData = { ...savingsData, [goalId]: Math.max(currentCash - amount, 0) };
      await setDoc(doc(db, "savings", "goals"), newData);
      setSavingsData(newData);

      const usageRef = await addDoc(collection(db, "goalUsage"), {
        goalId,
        goalLabel,
        mode: "cash",
        amount,
        category: goalUsageForm.category || "lainnya",
        usedFor,
        note: goalUsageForm.note || "",
        date: goalUsageForm.date || new Date().toISOString().split("T")[0],
        createdBy: currentUser,
        createdAt: now,
      });

      await addActivityLog("goal_funds_used", currentUser + " memakai " + formatRupiah(amount) + " dari Goal " + goalLabel + " untuk " + usedFor + ".");
      syncToSheets("goalFundsUsed", { id: usageRef.id, goalId, goalLabel, mode: "cash", amount, usedFor, category: goalUsageForm.category, user: currentUser, createdAt: now });

      setShowGoalUsage(null);
      resetGoalUsageForm();
      return;
    }

    const holdings = savingsHoldings[goalId] || [];
    const holding = holdings.find(h => String(h.id) === String(goalUsageForm.assetHoldingId));
    if (!holding) {
      showAccessNotice("Pilih aset goal yang akan dipakai.");
      return;
    }

    const qty = parseDecimal(goalUsageForm.assetQty);
    const availableQty = Number(holding.qty || holding.amount || 0);
    if (!qty || qty <= 0) {
      showAccessNotice("Isi qty aset yang dipakai.");
      return;
    }
    if (qty > availableQty) {
      showAccessNotice("Qty aset melebihi aset tersedia.");
      return;
    }

    const assetType = ASSET_TYPES.find(a => a.id === holding.assetType);
    const currentAssetValue = calcAssetValue(holding, marketPrices);
    const ratio = availableQty ? qty / availableQty : 0;
    const usedValue = Math.round(currentAssetValue * ratio);
    const totalCost = Number(holding.costBasisIdr || (["idr","obligasi"].includes(holding.assetType) ? (holding.idrValue || holding.qty || 0) : ((holding.qty || 0) * (holding.buyPrice || 0))));
    const usedCost = Math.round(totalCost * ratio);
    const remainingQty = Math.max(availableQty - qty, 0);
    const remainingCost = Math.max(totalCost - usedCost, 0);

    const ok = window.confirm("Pakai aset " + (assetType?.label || holding.assetType || "Aset") + " " + qty + " " + (assetType?.unit || "unit") + " dari Goal " + goalLabel + " untuk: " + usedFor + "?");
    if (!ok) return;

    const updatedHoldings = remainingQty <= 0
      ? holdings.filter(h => String(h.id) !== String(holding.id))
      : holdings.map(h => String(h.id) === String(holding.id)
          ? {
              ...h,
              qty: remainingQty,
              amount: remainingQty,
              costBasisIdr: remainingCost,
              idrValue: ["idr","obligasi"].includes(h.assetType) ? remainingQty : h.idrValue,
              updatedAt: now,
              updatedBy: currentUser,
            }
          : h
        );

    const nextHoldings = { ...savingsHoldings, [goalId]: updatedHoldings };
    await setDoc(doc(db, "savings", "holdings"), nextHoldings);
    setSavingsHoldings(nextHoldings);

    const usageRef = await addDoc(collection(db, "goalUsage"), {
      goalId,
      goalLabel,
      mode: "asset",
      amount: usedValue,
      costBasis: usedCost,
      assetType: holding.assetType,
      assetLabel: holding.ticker || assetType?.label || holding.assetType,
      qty,
      unit: assetType?.unit || "unit",
      sourceHoldingId: holding.id,
      sourceMode: holding.sourceMode || "",
      category: goalUsageForm.category || "lainnya",
      usedFor,
      note: goalUsageForm.note || "",
      date: goalUsageForm.date || new Date().toISOString().split("T")[0],
      createdBy: currentUser,
      createdAt: now,
    });

    await addActivityLog("goal_asset_used", currentUser + " memakai aset " + (holding.ticker || assetType?.label || holding.assetType) + " dari Goal " + goalLabel + " senilai estimasi " + formatRupiah(usedValue) + " untuk " + usedFor + ".");
    syncToSheets("goalAssetUsed", { id: usageRef.id, goalId, goalLabel, mode: "asset", amount: usedValue, costBasis: usedCost, assetType: holding.assetType, qty, usedFor, category: goalUsageForm.category, user: currentUser, createdAt: now });

    setShowGoalUsage(null);
    resetGoalUsageForm();
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
    const txUser = form.user || currentUser || "Tanpa User";
    const now = new Date().toISOString();
    const directGoalId = form.type === "expense" ? (form.goalId || "") : "";
    const directGoal = directGoalId ? savingsGoals.find(g => String(g.id) === String(directGoalId)) : null;
    if (directGoalId && !directGoal) {
      showAccessNotice("Goal tidak ditemukan. Pilih Goal ulang atau kosongkan link Goal.");
      return;
    }

    let directGoalUsageAmount = 0;
    if (directGoal) {
      const goalCash = Number(savingsData[directGoalId] || 0);
      if (goalCash <= 0) {
        showAccessNotice("Dana tunai Goal masih Rp 0. Simpan sebagai expense biasa atau alokasikan dana ke Goal dulu.");
        return;
      }
      directGoalUsageAmount = Math.min(amt, goalCash);
      if (directGoalUsageAmount < amt) {
        const okPartial = window.confirm("Dana tunai Goal " + (directGoal.label || directGoalId) + " hanya " + formatRupiah(goalCash) + ". Kurangi Goal sebesar saldo tersedia dan tetap catat expense " + formatRupiah(amt) + "?");
        if (!okPartial) return;
      } else {
        const okGoal = window.confirm("Catat expense dan langsung kurangi Goal " + (directGoal.label || directGoalId) + " sebesar " + formatRupiah(amt) + "? Wallet hanya terpotong 1x.");
        if (!okGoal) return;
      }
    }

    const goalLinkData = directGoal ? {
      goalId: directGoalId,
      goalLabel: directGoal.label || directGoalId,
      goalLinkedAt: now,
      goalLinkedBy: currentUser || txUser,
      goalLinkedAmount: directGoalUsageAmount,
      goalLinkMode: "direct_expense_input",
      goalPendingAmount: Math.max(amt - directGoalUsageAmount, 0),
    } : {};

    const txData = {
      type: form.type,
      category: form.category,
      amount: amt,
      note: form.note,
      date: form.date,
      user: txUser,
      userName: txUser,
      createdBy: currentUser || txUser,
      sumberDanaId: transactionSDId,
      sumberDanaName: sd?.name || "",
      createdAt: now,
      ...goalLinkData,
    };
    const docRef = await addDoc(collection(db, "transactions"), txData);
    await logLedger(transactionSDId, form.type === "income" ? amt : -amt, (form.type === "income" ? "Pemasukan" : "Pengeluaran") + ": " + (form.note || CATEGORIES.find(c=>c.id===form.category)?.label||""), "transaction", docRef.id);

    if (directGoal && directGoalUsageAmount > 0) {
      const newGoalCash = { ...savingsData, [directGoalId]: Math.max(Number(savingsData[directGoalId] || 0) - directGoalUsageAmount, 0) };
      await setDoc(doc(db, "savings", "goals"), newGoalCash);
      setSavingsData(newGoalCash);
      const usageRef = await addDoc(collection(db, "goalUsage"), {
        goalId: directGoalId,
        goalLabel: directGoal.label || directGoalId,
        mode: "cash",
        amount: directGoalUsageAmount,
        originalTransactionAmount: amt,
        category: form.category || "linked_transaction",
        usedFor: form.note || "Expense langsung dari input transaksi",
        note: "Linked from transaction input. Wallet ledger hanya dipotong oleh transaksi expense.",
        date: form.date || new Date().toISOString().split("T")[0],
        sourceTransactionId: docRef.id,
        linkedWithoutWalletMutation: true,
        createdBy: currentUser || txUser,
        createdAt: now,
      });
      await setDoc(doc(db, "transactions", docRef.id), { goalUsageId: usageRef.id, updatedAt: now, updatedBy: currentUser || txUser }, { merge: true });
      await addActivityLog("transaction_goal_direct_input", (currentUser || txUser) + " mencatat expense " + formatRupiah(amt) + " dan langsung mengurangi Goal " + (directGoal.label || directGoalId) + " sebesar " + formatRupiah(directGoalUsageAmount) + ".");
      syncToSheets("transactionGoalDirectInput", { id: docRef.id, goalId: directGoalId, goalLabel: directGoal.label || directGoalId, amount: amt, usedAmount: directGoalUsageAmount, user: currentUser || txUser, createdAt: now });
    } else {
      await addActivityLog("transaction_created", (form.type === "income" ? "Tambah pemasukan" : "Tambah pengeluaran") + ": " + formatRupiah(amt));
    }

    // Sync ke Google Sheets
    syncToSheets("addTransaction", { ...txData, id: docRef.id });
    setShowForm(false); setForm({ type: "expense", category: "makan", amount: "", note: "", date: new Date().toISOString().split("T")[0], user: currentUser || "", goalId: "" }); setAmountDisplay(""); setTransactionSDId("");
  }

  async function addInvestment() {
    // Handled by addSavingsAsset with goalId "invest_cash" or "invest_asset"
  }

  function openInvestmentDetail(inv) {
    if (!inv) return;
    const costBasis = Number(inv.costBasis ?? (["idr","obligasi"].includes(inv.assetType) ? (inv.idrValue || 0) : (inv.qty || inv.amount || 0) * (inv.buyPrice || 0)));
    setSelectedInvestment(inv);
    setInvestmentEditMode(false);
    setInvestmentEditForm({
      assetType: inv.assetType || inv.type || "lm",
      qty: String(inv.qty ?? inv.amount ?? ""),
      costBasis: costBasis ? String(Math.round(costBasis)) : "",
      ticker: inv.ticker || "",
      note: inv.note || "",
      manualPrice: inv.manualPrice ? String(Math.round(Number(inv.manualPrice))) : "",
      buyDate: inv.buyDate || (inv.createdAt ? String(inv.createdAt).slice(0, 10) : new Date().toISOString().split("T")[0]),
    });
  }

  async function updateInvestmentAsset() {
    if (!selectedInvestment) return;
    if (!canManageInvestments) {
      showAccessNotice("Role " + currentRole + " tidak punya izin edit investasi/aset.");
      return;
    }
    const qty = parseDecimal(investmentEditForm.qty);
    const costBasis = parseAmount(investmentEditForm.costBasis) || parseDecimal(investmentEditForm.costBasis);
    const assetType = investmentEditForm.assetType || selectedInvestment.assetType || "lm";
    const at = ASSET_TYPES.find(a => a.id === assetType);
    const isCashLike = ["idr","obligasi"].includes(assetType);
    if (!qty || !costBasis) {
      showAccessNotice("Isi jumlah aset dan modal/nilai perolehan.");
      return;
    }
    const updates = {
      assetType,
      type: assetType,
      qty,
      amount: qty,
      costBasis,
      buyPrice: isCashLike ? 1 : (qty ? costBasis / qty : 0),
      idrValue: isCashLike ? qty : null,
      ticker: investmentEditForm.ticker || null,
      note: investmentEditForm.note || null,
      manualPrice: investmentEditForm.manualPrice ? parseDecimal(investmentEditForm.manualPrice) : null,
      buyDate: investmentEditForm.buyDate || selectedInvestment.buyDate || new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    };
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "investments", selectedInvestment.id), updates);
    await addInvestmentLog(selectedInvestment.id, "investment_updated", "Edit aset/portfolio: " + (updates.ticker || at?.label || assetType) + ". Koreksi ini tidak otomatis mengubah wallet.", { after: updates });
    await addActivityLog("investment_updated", currentUser + " mengedit aset " + (updates.ticker || at?.label || assetType) + ". Wallet tidak otomatis berubah.");
    syncToSheets("updateInvestment", { id: selectedInvestment.id, ...updates });
    setSelectedInvestment(prev => ({ ...(prev || {}), ...updates }));
    setInvestmentEditMode(false);
  }

  async function addInvestmentAsset(type) {
    if (!canManageInvestments) {
      showAccessNotice("Role " + currentRole + " tidak punya izin mengelola investasi.");
      return;
    }
    const qty = parseDecimal(assetForm.qty);
    const rawValue = parseAmount(assetForm.buyPrice) || parseDecimal(assetForm.buyPrice);
    if (!qty) return;
    const at = ASSET_TYPES.find(a => a.id === assetForm.assetType);
    const isCashLike = ["idr","obligasi"].includes(assetForm.assetType);
    const sourceMode = showAssetConvert === "invest_existing" ? "existing" : "wallet";
    const valueMode = assetForm.valueMode || "total";
    const costBasis = isCashLike ? qty : (valueMode === "unit" ? qty * rawValue : rawValue);
    const unitBuyPrice = isCashLike ? 1 : (qty && costBasis ? costBasis / qty : rawValue);
    if (!isCashLike && !costBasis) {
      showAccessNotice("Isi nilai aset atau harga beli.");
      return;
    }
    if (sourceMode === "wallet" && !assetSDId) {
      showAccessNotice("Pilih Sumber Dana jika aset dibeli dari wallet.");
      return;
    }
    const sourceWallet = assetSDId ? activeFundingSourceOptions.find(s => s.id === assetSDId) : null;
    if (sourceMode === "wallet" && !sourceWallet) {
      showAccessNotice("Sumber Dana tidak aktif/tidak ditemukan.");
      return;
    }
    const idrValue = isCashLike ? qty : null;
    const docRef = await addDoc(collection(db, "investments"), {
      assetType: assetForm.assetType,
      qty,
      amount: qty,
      buyPrice: unitBuyPrice,
      costBasis,
      manualPrice: assetForm.manualPrice ? parseDecimal(assetForm.manualPrice) : null,
      ticker: assetForm.ticker || null,
      note: assetForm.note || null,
      idrValue,
      buyDate: new Date().toISOString().split("T")[0],
      type: assetForm.assetType,
      sourceMode,
      movementType: sourceMode === "existing" ? "existing_asset" : "investment_buy",
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
    });
    if (sourceMode === "wallet") {
      await logLedger(assetSDId, -costBasis, "Beli investasi: " + (assetForm.ticker || (at ? at.label : "")||""), "investment", docRef.id);
      await addInvestmentLog(docRef.id, "investment_buy", "Dibeli dari wallet " + (sourceWallet?.name || "Sumber Dana") + " senilai " + formatFull(costBasis) + ".", { amount: costBasis, walletId: assetSDId, walletName: sourceWallet?.name || "" });
      await addActivityLog("investment_buy", currentUser + " membeli aset investasi " + (assetForm.ticker || (at ? at.label : assetForm.assetType)) + " senilai " + formatFull(costBasis) + " dari " + (sourceWallet?.name || "Sumber Dana") + ".");
    } else {
      await addInvestmentLog(docRef.id, "existing_asset_onboarded", "Aset sudah dimiliki dicatat senilai/modal " + formatFull(costBasis) + ". Wallet tidak berubah.", { amount: costBasis });
      await addActivityLog("existing_asset_onboarded", currentUser + " mencatat aset yang sudah dimiliki: " + (assetForm.ticker || (at ? at.label : assetForm.assetType)) + " senilai/modal " + formatFull(costBasis) + ". Wallet tidak berubah.");
    }
    // Sync ke Google Sheets
    syncToSheets("addInvestment", { id: docRef.id, assetType: assetForm.assetType, ticker: assetForm.ticker, qty, unit: (at ? at.unit : "") || "", buyPrice: unitBuyPrice, costBasis, sourceMode, note: assetForm.note, buyDate: new Date().toISOString().split("T")[0] });
    setShowAssetConvert(null);
    setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" });
    setAssetSDId("");
  }

  function openMoveAssetToGoal(inv) {
    if (!canManageInvestments || !hasPermission("goal_contribute")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin memindahkan aset ke Goal.");
      return;
    }
    setAssetToGoalInvestment(inv);
    setAssetToGoalForm({ goalId: "", qty: "", note: "" });
  }

  async function moveInvestmentAssetToGoal() {
    if (!assetToGoalInvestment) return;
    if (!canManageInvestments || !hasPermission("goal_contribute")) {
      showAccessNotice("Role " + currentRole + " tidak punya izin memindahkan aset ke Goal.");
      return;
    }
    const goalId = assetToGoalForm.goalId;
    const moveQty = parseDecimal(assetToGoalForm.qty);
    if (!goalId || !moveQty || moveQty <= 0) {
      showAccessNotice("Pilih Goal dan isi qty aset yang akan dipindahkan.");
      return;
    }

    const inv = investments.find(i => i.id === assetToGoalInvestment.id) || assetToGoalInvestment;
    const availableQty = Number(inv.qty ?? inv.amount ?? 0);
    if (moveQty > availableQty) {
      showAccessNotice("Qty yang dipindahkan melebihi jumlah aset tersedia.");
      return;
    }

    const at = ASSET_TYPES.find(a => a.id === inv.assetType);
    const goal = savingsGoals.find(g => g.id === goalId);
    const totalCostBasis = Number(inv.costBasis ?? (["idr","obligasi"].includes(inv.assetType) ? (inv.idrValue || 0) : availableQty * (inv.buyPrice || 0)));
    const ratio = availableQty ? moveQty / availableQty : 0;
    const movedCostBasis = Math.round(totalCostBasis * ratio);
    const remainingQty = Math.max(availableQty - moveQty, 0);
    const remainingCostBasis = Math.max(totalCostBasis - movedCostBasis, 0);
    const movedBuyPrice = moveQty ? movedCostBasis / moveQty : Number(inv.buyPrice || 0);
    const sourceLabel = inv.ticker || at?.label || inv.assetType || "Aset";

    const newHolding = {
      id: Date.now(),
      assetType: inv.assetType,
      qty: moveQty,
      buyPrice: movedBuyPrice,
      manualPrice: inv.manualPrice || null,
      ticker: inv.ticker || null,
      note: assetToGoalForm.note || ("Dipindahkan dari Investasi: " + sourceLabel),
      idrValue: ["idr","obligasi"].includes(inv.assetType) ? moveQty : null,
      sourceMode: "investment_transfer",
      sourceInvestmentId: inv.id,
      sourceInvestmentName: sourceLabel,
      costBasisIdr: movedCostBasis,
      addedBy: currentUser,
      addedAt: new Date().toISOString(),
    };

    const existing = savingsHoldings[goalId] || [];
    const updatedHoldings = { ...savingsHoldings, [goalId]: [...existing, newHolding] };
    await setDoc(doc(db, "savings", "holdings"), updatedHoldings);
    setSavingsHoldings(updatedHoldings);

    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "investments", inv.id), {
      qty: remainingQty,
      amount: remainingQty,
      costBasis: remainingCostBasis,
      status: remainingQty <= 0 ? "moved_to_goal" : "active",
      movedToGoalAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    });

    await addInvestmentLog(inv.id, "asset_to_goal", "Dipindahkan ke Goal " + (goal?.label || goalId) + ": " + moveQty + " " + (at?.unit || "unit") + ". Wallet tidak berubah.", { goalId, goalLabel: goal?.label || goalId, qty: moveQty, costBasis: movedCostBasis });
    await addActivityLog(
      "asset_to_goal",
      currentUser + " memindahkan " + moveQty + " " + (at?.unit || "unit") + " " + sourceLabel + " dari Investasi ke Goal " + (goal?.label || goalId) + ". Wallet tidak berubah."
    );
    syncToSheets("assetToGoal", { investmentId: inv.id, goalId, goalLabel: goal?.label || goalId, qty: moveQty, costBasis: movedCostBasis, sourceLabel, user: currentUser, createdAt: new Date().toISOString() });

    setAssetToGoalInvestment(null);
    setAssetToGoalForm({ goalId: "", qty: "", note: "" });
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

  function startOwnerTransactionRevision(tx) {
    if (!tx) return;
    if (!isOwner) {
      showAccessNotice("Revisi kesalahan input transaksi hanya untuk Owner.");
      return;
    }
    const txType = tx.type === "income" ? "income" : "expense";
    const fallbackCategory = (txType === "income" ? INCOME_CATS : EXPENSE_CATS)[0]?.id || "";
    setTransactionEditForm({
      type: txType,
      category: tx.category || fallbackCategory,
      amount: String(tx.amount || ""),
      date: tx.date || String(tx.createdAt || "").slice(0, 10) || new Date().toISOString().split("T")[0],
      user: tx.user || tx.userName || currentUser || "",
      sumberDanaId: tx.sumberDanaId || tx.sourceFundId || "",
      note: tx.note || tx.notes || "",
      revisionReason: "",
    });
    setTransactionEditStatus("");
    setTransactionEditMode(true);
  }

  function changeOwnerTransactionType(nextType) {
    const safeType = nextType === "income" ? "income" : "expense";
    const nextCategory = (safeType === "income" ? INCOME_CATS : EXPENSE_CATS)[0]?.id || "";
    setTransactionEditForm(prev => ({ ...prev, type: safeType, category: nextCategory }));
  }

  async function saveOwnerTransactionRevision(tx) {
    if (!tx?.id) return;
    if (!isOwner) {
      showAccessNotice("Revisi kesalahan input transaksi hanya untuk Owner.");
      return;
    }

    const amount = parseAmount(transactionEditForm.amount);
    const type = transactionEditForm.type === "income" ? "income" : "expense";
    const categoryFallback = (type === "income" ? INCOME_CATS : EXPENSE_CATS)[0]?.id || "";
    const category = transactionEditForm.category || categoryFallback;
    const date = transactionEditForm.date || new Date().toISOString().split("T")[0];
    const user = transactionEditForm.user || currentUser || tx.user || tx.userName || "Tanpa User";
    const sumberDanaId = transactionEditForm.sumberDanaId || tx.sumberDanaId || "";
    const source = sumberDanaList.find(sd => String(sd.id) === String(sumberDanaId));
    const note = transactionEditForm.note || "";
    const revisionReason = transactionEditForm.revisionReason || "Revisi kesalahan input data";

    if (!amount) {
      setTransactionEditStatus("⚠️ Nominal wajib diisi.");
      return;
    }
    if (!sumberDanaId) {
      setTransactionEditStatus("⚠️ Sumber dana wajib dipilih agar saldo wallet tetap akurat.");
      return;
    }

    const isLinkedToGoal = Boolean(tx.goalId || tx.goalUsageId);
    const oldGoalLinkedAmount = Number(tx.goalLinkedAmount || tx.amount || 0);
    const oldGoalId = tx.goalId || "";
    const oldGoalUsageId = tx.goalUsageId || "";
    const linkedGoalLabel = tx.goalLabel || (oldGoalId ? (savingsGoals.find(g => String(g.id) === String(oldGoalId))?.label || oldGoalId) : "Goal");

    if (isLinkedToGoal && type !== "expense") {
      setTransactionEditStatus("⚠️ Transaksi yang sudah terhubung ke Goal tidak bisa diubah menjadi Income. Batalkan Link Goal dulu agar saldo Goal tetap aman.");
      return;
    }

    const now = new Date().toISOString();
    let goalRevisionData = {};
    let goalRevisionMessage = "";
    if (isLinkedToGoal && oldGoalId) {
      const nextGoalLinkedAmount = Math.min(amount, oldGoalLinkedAmount);
      const refundToGoal = Math.max(oldGoalLinkedAmount - nextGoalLinkedAmount, 0);
      const pendingGoalAmount = Math.max(amount - nextGoalLinkedAmount, 0);
      goalRevisionData = {
        goalLinkedAmount: nextGoalLinkedAmount,
        goalPendingAmount: pendingGoalAmount,
        goalRevisionSyncedAt: now,
        goalRevisionSyncedBy: currentUser || "Owner",
      };
      if (refundToGoal > 0) {
        const nextGoalCash = { ...savingsData, [oldGoalId]: Number(savingsData[oldGoalId] || 0) + refundToGoal };
        await setDoc(doc(db, "savings", "goals"), nextGoalCash);
        setSavingsData(nextGoalCash);
        goalRevisionMessage = " Saldo Goal dikembalikan " + formatRupiah(refundToGoal) + " karena nominal transaksi lebih kecil.";
      } else if (pendingGoalAmount > 0) {
        goalRevisionMessage = " Nominal transaksi naik; tambahan " + formatRupiah(pendingGoalAmount) + " belum otomatis mengurangi Goal. Gunakan rekonsiliasi manual bila perlu.";
      } else {
        goalRevisionMessage = " Link Goal tetap sinkron.";
      }
      if (oldGoalUsageId) {
        await setDoc(doc(db, "goalUsage", oldGoalUsageId), {
          amount: nextGoalLinkedAmount,
          originalTransactionAmount: amount,
          category,
          usedFor: note || tx.note || tx.notes || "Transaksi expense terhubung ke Goal",
          note: "Goal usage disinkronkan dari Owner Revision. Wallet ledger tetap mengikuti transaksi.",
          date,
          updatedAt: now,
          updatedBy: currentUser || "Owner",
          ownerRevisionSynced: true,
        }, { merge: true });
      }
    }

    const updateData = {
      type,
      category,
      amount,
      date,
      user,
      userName: user,
      sumberDanaId,
      sumberDanaName: source?.name || tx.sumberDanaName || tx.sourceFund || "",
      sourceFundId: sumberDanaId,
      sourceFund: source?.name || tx.sumberDanaName || tx.sourceFund || "",
      note,
      notes: note,
      updatedAt: now,
      updatedBy: currentUser || "Owner",
      ownerRevisedAt: now,
      ownerRevisedBy: currentUser || "Owner",
      revisionReason,
      ...goalRevisionData,
    };

    setTransactionEditStatus("Menyimpan revisi...");
    await setDoc(doc(db, "transactions", tx.id), updateData, { merge: true });

    const relatedLedger = sumberDanaLedger.filter(l => l.refType === "transaction" && l.refId === tx.id);
    const signedAmount = type === "income" ? amount : -amount;
    const categoryInfo = getCategoryInfo(category, { ...tx, ...updateData });
    const ledgerNote = (type === "income" ? "Pemasukan" : "Pengeluaran") + ": " + (note || categoryInfo?.label || "Revisi transaksi");
    if (relatedLedger[0]?.id) {
      await setDoc(doc(db, "sumberDanaLedger", relatedLedger[0].id), {
        sumberDanaId,
        amount: signedAmount,
        note: ledgerNote,
        refType: "transaction",
        refId: tx.id,
        updatedAt: now,
        updatedBy: currentUser || "Owner",
        ownerRevised: true,
      }, { merge: true });
      for (const extraLedger of relatedLedger.slice(1)) {
        if (extraLedger?.id) await deleteDoc(doc(db, "sumberDanaLedger", extraLedger.id));
      }
    } else {
      await addDoc(collection(db, "sumberDanaLedger"), {
        sumberDanaId,
        amount: signedAmount,
        note: ledgerNote,
        refType: "transaction",
        refId: tx.id,
        createdAt: now,
        createdBy: currentUser || "Owner",
        ownerRevised: true,
      });
    }

    await addActivityLog(
      "transaction_owner_revised",
      "Owner revisi transaksi " + formatRupiah(tx.amount || 0) + " → " + formatRupiah(amount) + " · " + (tx.user || tx.userName || "-") + " → " + user + " · alasan: " + revisionReason + (isLinkedToGoal ? " · Goal: " + linkedGoalLabel + " ikut disinkronkan." : "")
    );
    syncToSheets("updateTransaction", { id: tx.id, ...updateData, goalRevisionMessage });

    setSelectedTransaction({ ...tx, ...updateData });
    setTransactionEditMode(false);
    setTransactionEditStatus("✅ Revisi transaksi tersimpan. Saldo wallet ikut dikoreksi." + goalRevisionMessage);
  }

  async function saveOwnerTransactionDate(tx, nextDate) {
    if (!tx?.id) return;
    if (!isOwner) {
      showAccessNotice("Ubah tanggal transaksi hanya untuk Owner.");
      return;
    }
    const safeDate = nextDate || new Date().toISOString().split("T")[0];
    const oldDate = tx.date || String(tx.createdAt || "").slice(0, 10) || "Tanpa Tanggal";
    if (safeDate === oldDate) return;

    const now = new Date().toISOString();
    setTransactionEditStatus("Menyimpan tanggal transaksi...");

    const updateData = {
      date: safeDate,
      updatedAt: now,
      updatedBy: currentUser || "Owner",
      ownerDateRevisedAt: now,
      ownerDateRevisedBy: currentUser || "Owner",
      ownerDateRevisionReason: "Revisi tanggal transaksi",
    };

    await setDoc(doc(db, "transactions", tx.id), updateData, { merge: true });

    const relatedLedger = sumberDanaLedger.filter(l => l.refType === "transaction" && l.refId === tx.id);
    for (const ledgerItem of relatedLedger) {
      if (ledgerItem?.id) {
        await setDoc(doc(db, "sumberDanaLedger", ledgerItem.id), {
          date: safeDate,
          transactionDate: safeDate,
          updatedAt: now,
          updatedBy: currentUser || "Owner",
          ownerDateRevised: true,
        }, { merge: true });
      }
    }

    if (tx.goalUsageId) {
      await setDoc(doc(db, "goalUsage", tx.goalUsageId), {
        date: safeDate,
        updatedAt: now,
        updatedBy: currentUser || "Owner",
        ownerDateSynced: true,
      }, { merge: true });
    }

    await addActivityLog(
      "transaction_date_revised",
      "Owner revisi tanggal transaksi " + formatRupiah(tx.amount || 0) + " · " + oldDate + " → " + safeDate
    );
    syncToSheets("updateTransaction", { id: tx.id, ...updateData, ownerDateQuickEdit: true });

    setSelectedTransaction(prev => prev?.id === tx.id ? { ...prev, ...updateData } : prev);
    setTransactionEditStatus("✅ Tanggal transaksi diperbarui.");
  }

  function hasLedgerReversal(ledgerId, reversalTypes = ["investment_orphan_reversal", "investment_delete_reversal", "test_transfer_reversal", "loan_orphan_reversal", "orphan_loan_disbursement_reversal", "test_wallet_adjustment_reversal"]) {
    if (!ledgerId) return false;
    return sumberDanaLedger.some(l => reversalTypes.includes(l.refType) && String(l.refId || "") === String(ledgerId));
  }

  async function reverseWalletLedgerItem(ledger, options = {}) {
    if (!isOwner) {
      showAccessNotice("Hanya Owner yang bisa melakukan ledger reconciliation.");
      return false;
    }
    if (!ledger?.id || !ledger.sumberDanaId) return false;
    if (ledger.reconciled || hasLedgerReversal(ledger.id, options.reversalTypes || undefined)) {
      window.alert("Ledger ini sudah pernah direkonsiliasi / direverse.");
      return false;
    }
    const originalAmount = Number(ledger.amount || 0);
    if (!originalAmount) {
      window.alert("Nominal ledger 0, tidak ada yang perlu direverse.");
      return false;
    }
    const now = new Date().toISOString();
    const reversalAmount = -originalAmount;
    const reversalRefType = options.refType || "ledger_reversal";
    const note = options.note || ("Reverse ledger: " + (ledger.note || ledger.refId || ledger.id));
    await addDoc(collection(db, "sumberDanaLedger"), {
      sumberDanaId: ledger.sumberDanaId,
      amount: reversalAmount,
      refType: reversalRefType,
      refId: ledger.id,
      originalRefType: ledger.refType || "",
      originalRefId: ledger.refId || "",
      note,
      createdAt: now,
      createdBy: currentUser || "System",
      reconciliation: true,
    });
    await setDoc(doc(db, "sumberDanaLedger", ledger.id), {
      reconciled: true,
      reconciledAt: now,
      reconciledBy: currentUser || "System",
      reconciliationType: reversalRefType,
      reversalAmount,
    }, { merge: true });
    await addActivityLog(reversalRefType, (currentUser || "Owner") + " reverse ledger " + formatFull(Math.abs(originalAmount)) + " · " + (ledger.note || ledger.refId || ledger.id));
    return true;
  }

  async function reverseOrphanInvestmentLedger(ledger) {
    if (!ledger || ledger.refType !== "investment") return false;
    const ok = window.confirm("Reverse orphan investment ledger ini? Wallet akan dikoreksi sebesar " + formatFull(Math.abs(Number(ledger.amount || 0))) + ". Aset tidak dibuat ulang.");
    if (!ok) return false;
    const done = await reverseWalletLedgerItem(ledger, {
      refType: "investment_orphan_reversal",
      reversalTypes: ["investment_orphan_reversal", "investment_delete_reversal"],
      note: "Reverse orphan investment ledger: " + (ledger.note || ledger.refId || ledger.id),
    });
    if (done) window.alert("✅ Orphan investment ledger sudah direverse. Cek ulang Wallet Balance Audit.");
    return done;
  }

  async function reverseTestAllowanceTransfer(refId) {
    if (!isOwner) {
      showAccessNotice("Hanya Owner yang bisa membersihkan data test.");
      return false;
    }
    const pair = sumberDanaLedger.filter(l =>
      String(l.refId || "") === String(refId || "") &&
      ["allowance_transfer_in", "allowance_transfer_out"].includes(l.refType) &&
      String(l.note || "").toLowerCase().includes("test") &&
      !l.reconciled &&
      !hasLedgerReversal(l.id, ["test_transfer_reversal"])
    );
    if (!pair.length) {
      window.alert("Tidak ada ledger transfer test aktif untuk direverse.");
      return false;
    }
    const gross = pair.reduce((sum, l) => sum + Math.abs(Number(l.amount || 0)), 0);
    const ok = window.confirm("Reverse transfer test ini? Semua efek wallet dari transfer test akan dinetralkan. Gross: " + formatFull(gross) + ".");
    if (!ok) return false;
    for (const l of pair) {
      await reverseWalletLedgerItem(l, {
        refType: "test_transfer_reversal",
        reversalTypes: ["test_transfer_reversal"],
        note: "Reverse data test: " + (l.note || l.refId || l.id),
      });
    }
    await addActivityLog("test_allowance_transfer_reversed", (currentUser || "Owner") + " reverse transfer test ref " + refId + ".");
    window.alert("✅ Transfer test sudah direverse. Cek wallet asal dan wallet penerima.");
    return true;
  }


  function isLoanLedgerType(refType) {
    return ["loan_disbursement", "loan_repayment", "loan_disbursement_cancel", "loan_repayment_cancel", "gadai", "gadai_lunas"].includes(refType);
  }

  async function reverseOrphanLoanLedger(ledger) {
    if (!ledger || !isLoanLedgerType(ledger.refType)) return false;
    const amount = Number(ledger.amount || 0);
    if (!amount) {
      window.alert("Nominal ledger pinjaman 0, tidak ada yang perlu direverse.");
      return false;
    }
    const ok = window.confirm(
      "Reverse orphan loan/gadai ledger ini?\n\n" +
      "Wallet akan dikoreksi sebesar " + formatFull(Math.abs(amount)) + ".\n" +
      "Ledger lama tetap disimpan sebagai audit."
    );
    if (!ok) return false;
    const done = await reverseWalletLedgerItem(ledger, {
      refType: "loan_orphan_reversal",
      reversalTypes: ["loan_orphan_reversal", "orphan_loan_disbursement_reversal"],
      note: "Reverse orphan loan/gadai ledger: " + (ledger.note || ledger.refId || ledger.id),
    });
    if (done) window.alert("✅ Orphan loan/gadai ledger sudah direverse. Cek ulang Wallet Balance Audit.");
    return done;
  }

  async function reverseTestWalletAdjustment(ledger) {
    if (!ledger || ledger.refType !== "wallet_adjustment") return false;
    const isTest = String(ledger.note || "").toLowerCase().includes("test");
    if (!isTest) {
      window.alert("Ledger ini bukan penyesuaian TEST.");
      return false;
    }
    const amount = Number(ledger.amount || 0);
    if (!amount) {
      window.alert("Nominal adjustment 0, tidak ada yang perlu direverse.");
      return false;
    }
    const ok = window.confirm(
      "Reverse penyesuaian saldo TEST ini?\n\n" +
      "Wallet akan dikoreksi sebesar " + formatFull(Math.abs(amount)) + ".\n" +
      "Gunakan hanya jika adjustment ini bukan data real."
    );
    if (!ok) return false;
    const done = await reverseWalletLedgerItem(ledger, {
      refType: "test_wallet_adjustment_reversal",
      reversalTypes: ["test_wallet_adjustment_reversal"],
      note: "Reverse wallet adjustment TEST: " + (ledger.note || ledger.refId || ledger.id),
    });
    if (done) window.alert("✅ Penyesuaian saldo TEST sudah direverse. Cek ulang saldo wallet.");
    return done;
  }

  async function deleteInvestment(id) {
    if (!canManageInvestments) {
      showAccessNotice("Role " + currentRole + " tidak punya izin menghapus investasi.");
      return false;
    }
    const inv = investments.find(i => i.id === id);
    if (!inv) return false;
    const relatedWalletLedgers = sumberDanaLedger.filter(l =>
      l.refType === "investment" &&
      String(l.refId || "") === String(id) &&
      !l.reconciled &&
      !hasLedgerReversal(l.id, ["investment_delete_reversal", "investment_orphan_reversal"])
    );
    if (relatedWalletLedgers.length > 0 && isOwner) {
      const totalLedger = relatedWalletLedgers.reduce((sum, l) => sum + Math.abs(Number(l.amount || 0)), 0);
      const reverseToo = window.confirm(
        "Aset ini punya ledger pembelian dari wallet sebesar " + formatFull(totalLedger) + ".\n\n" +
        "OK = Hapus aset + reverse efek wallet.\n" +
        "Cancel = Hapus aset saja, wallet tidak berubah."
      );
      if (reverseToo) {
        for (const l of relatedWalletLedgers) {
          await reverseWalletLedgerItem(l, {
            refType: "investment_delete_reversal",
            reversalTypes: ["investment_delete_reversal", "investment_orphan_reversal"],
            note: "Reverse wallet karena aset dihapus: " + (inv.ticker || inv.assetType || inv.id),
          });
        }
      }
    }
    await addInvestmentLog(id, "investment_deleted", "Aset dipindahkan ke Recycle Bin. Wallet tidak otomatis berubah kecuali Owner memilih reverse ledger saat hapus.");
    await softDeleteRecord({ type: "investment", collectionName: "investments", id, data: inv, detail: "Hapus investasi ke Recycle Bin" });
    if (selectedInvestment?.id === id) {
      setSelectedInvestment(null);
      setInvestmentEditMode(false);
    }
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
        category: "pinjaman",
        amount: feePaid,
        note: "Bunga/biaya pinjaman: " + (loanPaymentLoan.namaBarang || "Pinjaman"),
        user: currentUser,
        date: loanPaymentForm.date,
        sumberDanaId: walletId,
        sumberDanaName: wallet.name || "",
        createdAt: new Date().toISOString(),
        movementType: "fee_interest",
        refType: "loan_payment",
        refId: payRef.id,
        loanId: loanPaymentLoan.id,
        loanType: loanPaymentLoan.loanType || "gadai",
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
    if (!canManageLoans) {
      showAccessNotice("Role " + currentRole + " tidak punya izin menghapus pinjaman.");
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
    const ledgerSum = sumberDanaLedger
      .filter(l => String(l.sumberDanaId || "") === String(sdId || "") && shouldCountLedgerInWalletBalance(l))
      .reduce((s, l) => s + asEngineNumber(l.amount), 0);
    return asEngineNumber(sd.initialBalance || 0) + ledgerSum;
  }

  function calcTotalWalletBalanceForUser(userName, includeArchived = false) {
    return sumberDanaList
      .filter(sd => sd.user === userName && (includeArchived || getSumberDanaStatus(sd) !== "archived"))
      .reduce((sum, sd) => sum + calcSumberDanaBalance(sd.id), 0);
  }

  function getActiveLoansForUser(userName) {
    return gadaiList.filter(g =>
      g.status === "aktif" &&
      (g.createdBy === userName || (!g.createdBy && userName === currentUser))
    );
  }

  function calcOutstandingLoanForUser(userName) {
    return getActiveLoansForUser(userName).reduce((sum, g) => sum + Number(g.outstandingPrincipal ?? g.uangPinjaman ?? 0), 0);
  }

  function calcNetPositionForUser(userName) {
    return calcTotalWalletBalanceForUser(userName) - calcOutstandingLoanForUser(userName);
  }

  async function adjustWalletToTarget(sd) {
    if (!sd) return;
    if (!canAdjustWallets) {
      showAccessNotice("Role " + currentRole + " tidak punya izin penyesuaian saldo wallet.");
      return;
    }
    const target = parseAmount(walletAdjustForm.targetBalance);
    if (walletAdjustForm.targetBalance === "" || Number.isNaN(target)) {
      showAccessNotice("Isi saldo akhir yang benar.");
      return;
    }
    const current = calcSumberDanaBalance(sd.id);
    const delta = target - current;
    if (delta === 0) {
      showAccessNotice("Saldo sudah sesuai, tidak ada koreksi.");
      return;
    }
    const ok = window.confirm("Sesuaikan saldo " + (sd.name || "wallet") + " dari " + formatFull(current) + " menjadi " + formatFull(target) + "? Sistem akan membuat ledger koreksi sebesar " + (delta >= 0 ? "+" : "-") + formatFull(Math.abs(delta)) + ".");
    if (!ok) return;
    await logLedger(
      sd.id,
      delta,
      "Penyesuaian saldo wallet ke " + formatFull(target) + (walletAdjustForm.note ? " · " + walletAdjustForm.note : ""),
      "wallet_adjustment",
      sd.id
    );
    await addActivityLog("wallet_adjustment", currentUser + " menyesuaikan saldo " + (sd.name || "wallet") + " dari " + formatFull(current) + " menjadi " + formatFull(target) + ".");
    syncToSheets("walletAdjustment", { sumberDanaId: sd.id, targetBalance: target, delta, note: walletAdjustForm.note || "", user: currentUser, createdAt: new Date().toISOString() });
    setWalletAdjustForm({ targetBalance: "", note: "" });
  }

  async function createWalletBaselineAdjustment(sd, targetBalance = 0, noteExtra = "") {
    if (!sd) return false;
    if (!canAdjustWallets) {
      showAccessNotice("Role " + currentRole + " tidak punya izin membuat baseline saldo wallet.");
      return false;
    }
    const target = Number(targetBalance || 0);
    const current = calcSumberDanaBalance(sd.id);
    const delta = target - current;
    if (delta === 0) {
      showAccessNotice("Saldo " + (sd.name || "wallet") + " sudah sama dengan baseline target.");
      return false;
    }
    const ok = window.confirm(
      "Buat baseline saldo real untuk " + (sd.name || "wallet") + "?\n\n" +
      "Saldo FinPlan sekarang: " + formatFull(current) + "\n" +
      "Saldo real target: " + formatFull(target) + "\n" +
      "Ledger baseline: " + (delta >= 0 ? "+" : "-") + formatFull(Math.abs(delta)) + "\n\n" +
      "Ini tidak menghapus histori lama. Sistem hanya membuat ledger baseline resmi."
    );
    if (!ok) return false;
    const now = new Date().toISOString();
    await addDoc(collection(db, "sumberDanaLedger"), {
      sumberDanaId: sd.id,
      amount: delta,
      note: "Baseline saldo real wallet ke " + formatFull(target) + " · Wallet Baseline Final" + (noteExtra ? " · " + noteExtra : ""),
      refType: "wallet_baseline_adjustment",
      refId: sd.id,
      createdAt: now,
      createdBy: currentUser || "Owner",
      baseline: true,
      baselinePhase: FINANCIAL_ENGINE_VERSION,
      movementType: "wallet_baseline_adjustment",
      cashflowTreatment: "baseline_adjustment",
      netWorthEffect: "reconcile",
      engineVersion: FINANCIAL_ENGINE_VERSION,
      previousBalance: current,
      targetBalance: target,
    });
    await setDoc(doc(db, "sumberDana", sd.id), {
      baselineAppliedAt: now,
      baselineAppliedBy: currentUser || "Owner",
      baselineTargetBalance: target,
      baselinePreviousBalance: current,
      baselineDelta: delta,
      updatedAt: now,
      updatedBy: currentUser || "Owner",
    }, { merge: true });
    await addActivityLog("wallet_baseline_adjustment", (currentUser || "Owner") + " membuat baseline saldo " + (sd.name || "wallet") + " dari " + formatFull(current) + " menjadi " + formatFull(target) + ".");
    syncToSheets("walletBaselineAdjustment", { sumberDanaId: sd.id, targetBalance: target, previousBalance: current, delta, note: noteExtra || "Wallet Baseline Final", user: currentUser, createdAt: now });
    setWalletAdjustForm({ targetBalance: "", note: "" });
    window.alert("✅ Baseline saldo real tersimpan untuk " + (sd.name || "wallet") + ". Cek ulang Predictive Net Worth Console.");
    return true;
  }

  async function markLegacyNoWalletTransaction(tx, silent = false) {
    if (!tx?.id) return false;
    if (!canViewLogAuditCenter) {
      showAccessNotice("Role " + currentRole + " tidak punya izin review legacy transaction.");
      return false;
    }
    if (tx.sumberDanaId) {
      if (!silent) showAccessNotice("Transaksi ini sudah punya wallet/sumber dana.");
      return false;
    }
    if (!silent) {
      const ok = window.confirm(
        "Tandai transaksi lama ini sebagai Legacy / No Wallet?\n\n" +
        (tx.note || getCategoryInfo(tx.category).label || "Transaksi") + " · " + formatFull(tx.amount || 0) + "\n\n" +
        "Aksi ini tidak membuat ledger baru dan tidak mengubah saldo wallet. Hanya memberi label agar Financial Engine tahu ini data historis sebelum sistem wallet rapi."
      );
      if (!ok) return false;
    }
    const now = new Date().toISOString();
    await setDoc(doc(db, "transactions", tx.id), {
      legacyNoWallet: true,
      dataLineage: "legacy_no_wallet",
      excludedFromWalletLedger: true,
      legacyReviewedAt: now,
      legacyReviewedBy: currentUser || "Owner",
      updatedAt: now,
      updatedBy: currentUser || "Owner",
    }, { merge: true });
    if (!silent) {
      await addActivityLog("legacy_no_wallet_review", (currentUser || "Owner") + " menandai transaksi legacy tanpa wallet: " + (tx.note || tx.category || tx.id) + ".");
      syncToSheets("legacyNoWalletReview", { transactionId: tx.id, amount: tx.amount || 0, type: tx.type || "", category: tx.category || "", note: tx.note || "", user: currentUser, createdAt: now });
      window.alert("✅ Transaksi ditandai sebagai Legacy / No Wallet.");
    }
    return true;
  }

  async function markAllLegacyNoWalletTransactions() {
    if (!canViewLogAuditCenter) {
      showAccessNotice("Role " + currentRole + " tidak punya izin review legacy transaction.");
      return false;
    }
    const candidates = transactions.filter(tx =>
      ["income", "expense"].includes(tx.type) &&
      !tx.sumberDanaId &&
      !(tx.legacyNoWallet || tx.excludedFromWalletLedger || tx.dataLineage === "legacy_no_wallet")
    );
    if (candidates.length === 0) {
      showAccessNotice("Tidak ada legacy transaction yang perlu ditandai.");
      return false;
    }
    const expenseTotal = candidates.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const incomeTotal = candidates.filter(tx => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const ok = window.confirm(
      "Tandai " + candidates.length + " transaksi lama tanpa wallet sebagai Legacy / No Wallet?\n\n" +
      "Expense legacy: " + formatFull(expenseTotal) + "\n" +
      "Income legacy: " + formatFull(incomeTotal) + "\n\n" +
      "Ini tidak mengubah saldo wallet dan tidak membuat ledger baru. Hanya mengunci status historis agar Financial Engine tidak menganggapnya data rusak."
    );
    if (!ok) return false;
    const now = new Date().toISOString();
    for (const tx of candidates) {
      await setDoc(doc(db, "transactions", tx.id), {
        legacyNoWallet: true,
        dataLineage: "legacy_no_wallet",
        excludedFromWalletLedger: true,
        legacyReviewedAt: now,
        legacyReviewedBy: currentUser || "Owner",
        updatedAt: now,
        updatedBy: currentUser || "Owner",
      }, { merge: true });
    }
    await addActivityLog("legacy_no_wallet_bulk_review", (currentUser || "Owner") + " menandai " + candidates.length + " transaksi lama tanpa wallet sebagai Legacy / No Wallet.");
    syncToSheets("legacyNoWalletBulkReview", { count: candidates.length, expenseTotal, incomeTotal, user: currentUser, createdAt: now });
    window.alert("✅ " + candidates.length + " transaksi legacy sudah ditandai. Financial Engine sekarang punya pemisahan histori yang lebih bersih.");
    return true;
  }

  function resetWalletTransferForm() {
    setWalletTransferForm({
      sourceWalletId: "",
      destinationWalletId: "",
      amount: "",
      purpose: "uang_saku",
      note: "",
      date: new Date().toISOString().split("T")[0],
    });
  }

  async function executeWalletTransfer() {
    if (!canManageAllWallets) {
      showAccessNotice("Role " + currentRole + " tidak punya izin transfer antar wallet keluarga.");
      return;
    }

    const source = sumberDanaList.find(sd => sd.id === walletTransferForm.sourceWalletId);
    const destination = sumberDanaList.find(sd => sd.id === walletTransferForm.destinationWalletId);
    const amount = parseAmount(walletTransferForm.amount);

    if (!source || !destination) {
      showAccessNotice("Pilih wallet asal dan wallet tujuan.");
      return;
    }
    if (source.id === destination.id) {
      showAccessNotice("Wallet asal dan tujuan tidak boleh sama.");
      return;
    }
    if (!isSumberDanaActive(source) || !isSumberDanaActive(destination)) {
      showAccessNotice("Transfer hanya bisa memakai wallet aktif.");
      return;
    }
    if (!amount || amount <= 0) {
      showAccessNotice("Isi nominal transfer yang benar.");
      return;
    }

    const isAllowance = walletTransferForm.purpose === "uang_saku";
    const purposeLabel = isAllowance ? "Uang Saku" : "Transfer Antar Wallet";
    const ok = window.confirm(
      purposeLabel + " sebesar " + formatFull(amount) + "\n" +
      "Dari: " + source.name + " (" + source.user + ")\n" +
      "Ke: " + destination.name + " (" + destination.user + ")\n\n" +
      "Ini adalah transfer internal, bukan expense konsumtif."
    );
    if (!ok) return;

    const transferData = {
      type: isAllowance ? "allowance_transfer" : "wallet_transfer",
      purpose: walletTransferForm.purpose,
      amount,
      sourceWalletId: source.id,
      sourceWalletName: source.name,
      sourceUser: source.user,
      destinationWalletId: destination.id,
      destinationWalletName: destination.name,
      destinationUser: destination.user,
      date: walletTransferForm.date || new Date().toISOString().split("T")[0],
      note: walletTransferForm.note || "",
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      movementType: "wallet_to_wallet",
      netWorthEffect: "neutral",
    };

    const transferRef = await addDoc(collection(db, "walletTransfers"), transferData);
    await logLedger(
      source.id,
      -amount,
      purposeLabel + " ke " + destination.user + " · " + destination.name + (walletTransferForm.note ? " · " + walletTransferForm.note : ""),
      isAllowance ? "allowance_transfer_out" : "wallet_transfer_out",
      transferRef.id
    );
    await logLedger(
      destination.id,
      amount,
      purposeLabel + " dari " + source.user + " · " + source.name + (walletTransferForm.note ? " · " + walletTransferForm.note : ""),
      isAllowance ? "allowance_transfer_in" : "wallet_transfer_in",
      transferRef.id
    );

    await addActivityLog(
      isAllowance ? "allowance_transfer" : "wallet_transfer",
      currentUser + " mengirim " + (isAllowance ? "uang saku " : "transfer wallet ") + formatFull(amount) + " dari " + source.name + " (" + source.user + ") ke " + destination.name + " (" + destination.user + ")."
    );

    syncToSheets("walletTransfer", { ...transferData, id: transferRef.id });
    resetWalletTransferForm();
    setShowWalletTransfer(false);
  }

  async function logLedger(sumberDanaId, amount, note, refType, refId) {
    if (!sumberDanaId) return;
    const treatment = getLedgerFinancialTreatment(refType);
    await addDoc(collection(db, "sumberDanaLedger"), {
      sumberDanaId,
      amount,
      note: note || "",
      refType,
      refId: refId || null,
      movementType: treatment.movementType,
      cashflowTreatment: treatment.cashflowTreatment,
      netWorthEffect: treatment.netWorthEffect,
      engineVersion: FINANCIAL_ENGINE_VERSION,
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
      loan_orphan_reversal: "Reverse Pinjaman Orphan",
      test_wallet_adjustment_reversal: "Reverse Adjustment TEST",
      test_transfer_reversal: "Reverse Transfer TEST",
      investment_orphan_reversal: "Reverse Investasi Orphan",
      investment_delete_reversal: "Reverse Delete Investasi",
      wallet_merge_in: "Merge Masuk",
      wallet_merge_out: "Merge Keluar",
      wallet_adjustment: "Penyesuaian Wallet",
      allowance_transfer_out: "Uang Saku Keluar",
      allowance_transfer_in: "Uang Saku Masuk",
      wallet_transfer_out: "Transfer Wallet Keluar",
      wallet_transfer_in: "Transfer Wallet Masuk",
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

  function openSumberDanaEditor(sd, options = {}) {
    if (!sd) return;
    setSelectedSD(sd.id);
    setMergeTargetSDId("");
    setWalletAdjustForm({
      targetBalance: options.targetBalance !== undefined ? String(options.targetBalance) : "",
      note: options.note || "",
    });
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
    setWalletAdjustForm({ targetBalance: "", note: "" });
    setSdForm({ name: "", icon: "💵", initialBalance: "", color: "#6366f1", status: "active" });
  }

  async function addSumberDana() {
    const targetUser = canViewAllWallets ? (walletFilterUser || currentUser) : currentUser;
    if (!canCreateWalletForUser(targetUser)) {
      showAccessNotice("Role " + currentRole + " tidak punya izin membuat wallet untuk " + targetUser + ".");
      return;
    }
    if (!sdForm.name) return;
    const initBal = parseAmount(sdForm.initialBalance);
    await addDoc(collection(db, "sumberDana"), {
      user: targetUser,
      name: sdForm.name.trim(),
      icon: sdForm.icon || "💵",
      color: sdForm.color || "#6366f1",
      initialBalance: initBal,
      status: "active",
      walletScope: targetUser === currentUser ? "own" : "member",
      visibility: targetUser === currentUser ? "private" : "member_private_owner_audit",
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
    });
    await addActivityLog("wallet_created", currentUser + " membuat wallet " + sdForm.name.trim() + " untuk " + targetUser + ".");
    resetSumberDanaForm();
  }

  async function createDefaultWalletForMember(memberName, selectAsDestination = false) {
    if (!memberName) return null;
    if (!canCreateWalletForUser(memberName)) {
      showAccessNotice("Role " + currentRole + " tidak punya izin membuat wallet untuk " + memberName + ".");
      return null;
    }
    const existingActive = sumberDanaList.find(sd => sd.user === memberName && isSumberDanaActive(sd));
    if (existingActive) {
      if (selectAsDestination) setWalletTransferForm(prev => ({ ...prev, destinationWalletId: existingActive.id }));
      return existingActive.id;
    }
    const member = activeFamilyMembers.find(m => m.name === memberName);
    const walletName = "Wallet " + memberName;
    const docRef = await addDoc(collection(db, "sumberDana"), {
      user: memberName,
      name: walletName,
      icon: member?.avatar || "💵",
      color: "#10b981",
      initialBalance: 0,
      status: "active",
      walletScope: memberName === currentUser ? "own" : "member",
      visibility: "member_private_owner_audit",
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      autoCreated: true,
      purpose: "allowance_wallet",
    });
    await addActivityLog("wallet_created", currentUser + " membuat wallet member " + walletName + " untuk " + memberName + ".");
    syncToSheets("createMemberWallet", { id: docRef.id, user: memberName, name: walletName, createdBy: currentUser, createdAt: new Date().toISOString() });
    if (selectAsDestination) setWalletTransferForm(prev => ({ ...prev, destinationWalletId: docRef.id }));
    return docRef.id;
  }

  async function saveSumberDanaChanges(id) {
    const sd = sumberDanaList.find(s => s.id === id);
    if (!sd) return;
    if (!(canManageAllWallets || (sd.user === currentUser && canManageOwnWallets))) {
      showAccessNotice("Role " + currentRole + " tidak punya izin mengubah Sumber Dana ini.");
      return;
    }
    if (!sdForm.name.trim()) return;
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
    const sd = sumberDanaList.find(s => s.id === id);
    if (!sd) return;
    if (!(canArchiveWallets || canManageAllWallets || (sd.user === currentUser && canManageOwnWallets))) {
      showAccessNotice("Role " + currentRole + " tidak punya izin mengubah status Sumber Dana ini.");
      return;
    }
    await setDoc(doc(db, "sumberDana", id), {
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser,
    }, { merge: true });
    await addActivityLog("wallet_status_updated", (sd.name || "Sumber Dana") + " → " + status);
    setSdForm(prev => ({ ...prev, status }));
  }

  async function mergeSumberDana(sourceId, targetId) {
    if (!canMergeWallets) {
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

  function getBackupManifest() {
    const collections = [
      { key: "transactions", label: "Transactions", count: transactions.length, critical: true },
      { key: "sumberDanaList", label: "Wallet / Sumber Dana", count: sumberDanaList.length, critical: true },
      { key: "sumberDanaLedger", label: "Wallet Ledger", count: sumberDanaLedger.length, critical: true },
      { key: "savingsData", label: "Savings / Goal Balance", count: Object.keys(savingsData || {}).length, critical: true },
      { key: "savingsHoldings", label: "Goal Holdings", count: Object.values(savingsHoldings || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0), critical: true },
      { key: "customGoals", label: "Custom Goals", count: customGoals.length, critical: true },
      { key: "goalOverrides", label: "Goal Overrides", count: Object.keys(goalOverrides || {}).length, critical: true },
      { key: "goalUsageLog", label: "Goal Usage Log", count: goalUsageLog.length, critical: true },
      { key: "investments", label: "Investments", count: investments.length, critical: true },
      { key: "investmentLogs", label: "Investment Logs", count: investmentLogs.length, critical: true },
      { key: "gadaiList", label: "Loan / Gadai", count: gadaiList.length, critical: true },
      { key: "loanPayments", label: "Loan Payments", count: loanPayments.length, critical: true },
      { key: "walletTransfers", label: "Wallet Transfers", count: walletTransfers.length, critical: true },
      { key: "familyMembers", label: "Family Members", count: familyMembers.length, critical: true },
      { key: "rolePermissions", label: "Role Permissions", count: Object.keys(rolePermissions || {}).length, critical: true },
      { key: "activityLog", label: "Activity Log", count: activityLog.length, critical: true },
      { key: "recycleBin", label: "Recycle Bin", count: recycleBin.length, critical: true },
      { key: "predictiveHealthEngine", label: "Predictive Health Engine", count: financialPredictiveHealthEngine ? 1 : 0, critical: false },
      { key: "predictiveActionEngine", label: "Predictive Action Engine", count: financialPredictiveActionEngine ? 1 : 0, critical: false },
      { key: "predictiveExecutionEngine", label: "Predictive Execution Engine", count: financialPredictiveExecutionEngine ? 1 : 0, critical: false },
      { key: "predictiveCommandBriefEngine", label: "Predictive Command Brief Engine", count: financialPredictiveCommandBriefEngine ? 1 : 0, critical: false },
      { key: "predictiveDecisionGateEngine", label: "Predictive Decision Gate Engine", count: financialPredictiveDecisionGateEngine ? 1 : 0, critical: false },
      { key: "predictiveGovernancePolicyEngine", label: "Predictive Governance Policy Engine", count: financialPredictiveGovernancePolicyEngine ? 1 : 0, critical: false },
      { key: "predictiveGovernanceComplianceEngine", label: "Predictive Governance Compliance Engine", count: financialPredictiveGovernanceComplianceEngine ? 1 : 0, critical: false },
      { key: "predictiveCfoAdvisoryEngine", label: "Predictive CFO Advisory Engine", count: financialPredictiveCfoAdvisoryEngine ? 1 : 0, critical: false },
      { key: "predictiveOperatingRhythmEngine", label: "Predictive Operating Rhythm Engine", count: financialPredictiveOperatingRhythmEngine ? 1 : 0, critical: false },
      { key: "predictivePhaseClosureEngine", label: "Predictive Phase Closure Engine", count: financialPredictivePhaseClosureEngine ? 1 : 0, critical: false },
      { key: "predictiveScenarioSimulationEngine", label: "Predictive Scenario Simulation Engine", count: financialPredictiveScenarioSimulationEngine ? 1 : 0, critical: false },
      { key: "predictiveScenarioStressTestEngine", label: "Predictive Scenario Stress Test Engine", count: financialPredictiveScenarioStressTestEngine ? 1 : 0, critical: false },
      { key: "predictiveScenarioCashflowProjectionEngine", label: "Predictive Scenario Cashflow Projection Engine", count: financialPredictiveScenarioCashflowProjectionEngine ? 1 : 0, critical: false },
      { key: "predictiveScenarioGoalFeasibilityEngine", label: "Predictive Scenario Goal Feasibility Engine", count: financialPredictiveScenarioGoalFeasibilityEngine ? 1 : 0, critical: false },
      { key: "predictiveScenarioDecisionRecommendationEngine", label: "Predictive Scenario Decision Recommendation Engine", count: financialPredictiveScenarioDecisionRecommendationEngine ? 1 : 0, critical: false },
      { key: "predictiveScenarioClosureEngine", label: "Predictive Scenario Closure Engine", count: financialPredictiveScenarioClosureEngine ? 1 : 0, critical: false },
      { key: "predictiveAllocationPlanningEngine", label: "Predictive Allocation Planning Engine", count: financialPredictiveAllocationPlanningEngine ? 1 : 0, critical: false },
      { key: "predictiveAllocationGuardrailEngine", label: "Predictive Allocation Guardrail Engine", count: financialPredictiveAllocationGuardrailEngine ? 1 : 0, critical: false },
      { key: "predictiveAllocationExecutionEngine", label: "Predictive Allocation Execution Engine", count: financialPredictiveAllocationExecutionEngine ? 1 : 0, critical: false },
    ];
    const includedCount = collections.filter(c => c.count > 0 || ["savingsData", "savingsHoldings", "goalOverrides", "rolePermissions"].includes(c.key)).length;
    const criticalMissing = collections.filter(c => c.critical && c.count === 0 && !["gadaiList", "loanPayments", "goalUsageLog", "recycleBin", "activityLog", "investmentLogs", "walletTransfers", "customGoals", "goalOverrides", "savingsHoldings", "savingsData"].includes(c.key));
    return {
      phase: FINANCIAL_ENGINE_VERSION,
      label: "Predictive Financial Health Snapshot",
      includedCount,
      totalCollections: collections.length,
      criticalMissingCount: criticalMissing.length,
      collections,
      notes: [
        "Backup ini menyertakan transaksi, wallet, ledger, goals, usage log, investasi, loan, family, permission, activity log, recycle bin, dan transfer wallet yang sedang terbaca oleh aplikasi.",
        "Data security/PIN tidak diekspor penuh demi keamanan. Backup hanya menyertakan securityStatus tanpa PIN/password/hash.",
        "Gunakan export ini sebagai snapshot audit Phase 7.2.2: Predictive Allocation Execution Engine, score health, forecast runway, execution control, command rows, decision gate, governance policy, compliance audit, CFO memo, operating cadence, phase closure, scenario simulation, stress test, cashflow projection, goal feasibility, decision recommendation, scenario closure, allocation planning, allocation guardrail, allocation execution, dan net worth baseline."
      ]
    };
  }

  function exportBackupJSON() {
    const manifest = getBackupManifest();
    const backup = {
      exportedAt: new Date().toISOString(),
      app: "FinPlan ADP",
      version: APP_VERSION + " predictive-allocation-execution-engine-7-2-2",
      backupVersion: FINANCIAL_ENGINE_VERSION,
      backupType: "complete-finplan-snapshot",
      backupManifest: manifest,
      exportContext: {
        exportedBy: currentUser || "Unknown",
        currentRole,
        generatedFrom: "FinPlan Settings → Backup / Export",
        dataMode: "family_live_or_current_session",
      },
      transactions,
      investments,
      investmentLogs,
      savingsData,
      savingsHoldings,
      customGoals,
      goalOverrides,
      goalUsageLog,
      gadaiList,
      loanPayments,
      sumberDanaList,
      sumberDanaLedger,
      walletTransfers,
      familyMembers,
      rolePermissions,
      activityLog,
      recycleBin,
      predictiveHealthEngine: financialPredictiveHealthEngine,
      predictiveActionEngine: financialPredictiveActionEngine,
      predictiveExecutionEngine: financialPredictiveExecutionEngine,
      predictiveCommandBriefEngine: financialPredictiveCommandBriefEngine,
      predictiveDecisionGateEngine: financialPredictiveDecisionGateEngine,
      predictiveGovernancePolicyEngine: financialPredictiveGovernancePolicyEngine,
      predictiveGovernanceComplianceEngine: financialPredictiveGovernanceComplianceEngine,
      predictiveCfoAdvisoryEngine: financialPredictiveCfoAdvisoryEngine,
      predictiveOperatingRhythmEngine: financialPredictiveOperatingRhythmEngine,
      predictivePhaseClosureEngine: financialPredictivePhaseClosureEngine,
      predictiveScenarioSimulationEngine: financialPredictiveScenarioSimulationEngine,
      predictiveScenarioStressTestEngine: financialPredictiveScenarioStressTestEngine,
      predictiveScenarioCashflowProjectionEngine: financialPredictiveScenarioCashflowProjectionEngine,
      predictiveScenarioGoalFeasibilityEngine: financialPredictiveScenarioGoalFeasibilityEngine,
      predictiveScenarioDecisionRecommendationEngine: financialPredictiveScenarioDecisionRecommendationEngine,
      predictiveScenarioClosureEngine: financialPredictiveScenarioClosureEngine,
      predictiveAllocationPlanningEngine: financialPredictiveAllocationPlanningEngine,
      predictiveAllocationGuardrailEngine: financialPredictiveAllocationGuardrailEngine,
      predictiveAllocationExecutionEngine: financialPredictiveAllocationExecutionEngine,
      securityStatus: {
        hasSecurityData: !!securityData,
        hasFamilyPassword: !!(securityData && (securityData.familyPasswordHash || securityData.familyPassword)),
        userPinCount: securityData && securityData.userPins ? Object.keys(securityData.userPins).length : 0,
        exportedSensitiveCredentials: false,
        note: "PIN/password/hash tidak diekspor penuh untuk menjaga keamanan keluarga.",
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = "finplan-backup-complete-" + date + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBackupExportStatus("Backup lengkap berhasil dibuat · " + manifest.includedCount + "/" + manifest.totalCollections + " grup data ikut export.");
    setTimeout(() => setBackupExportStatus(""), 5000);
  }

  const EXPENSE_CATS = CATEGORIES.filter(c => c.type === "expense");
  const INCOME_CATS = CATEGORIES.filter(c => c.type === "income");
  const tabStyle = (key) => {
    const isActive = activeTab === key || (key === "dompet" && activeTab === "gadai");
    return {
      flex: "1 1 0",
      minWidth: 0,
      minHeight: "52px",
      padding: "7px 4px 6px",
      border: "none",
      cursor: "pointer",
      borderRadius: "18px",
      fontSize: "10px",
      fontWeight: 900,
      whiteSpace: "nowrap",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "3px",
      background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.95),rgba(124,58,237,0.95))" : "transparent",
      color: isActive ? "#fff" : "#94a3b8",
      boxShadow: isActive ? "0 10px 28px rgba(99,102,241,0.28)" : "none",
      transition: "all 0.2s",
    };
  };
  const savTabStyle = (key) => {
    const color = CATEGORY_GROUPS.find(g => g.id === key)?.color || getGoalCategoryColor(key);
    const active = savingsTab === key;
    return {
      padding: "8px 10px",
      border: "1px solid " + (active ? color + "99" : color + "33"),
      cursor: "pointer",
      borderRadius: "16px",
      fontSize: "11px",
      fontWeight: 900,
      whiteSpace: "nowrap",
      flex: "1 1 130px",
      minWidth: 0,
      textAlign: "center",
      background: active ? "linear-gradient(135deg," + color + "," + color + "bb)" : color + "18",
      color: active ? "#fff" : color,
      boxShadow: active ? "0 0 0 1px " + color + "44 inset" : "none",
    };
  };
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
    return isOwner || hasPermission("goal_contribute");
  }
  function canManageGoalFunds() {
    return isOwner || hasPermission("goal_manage");
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

  function hasAnyPermission(ids) {
    return ids.some(id => hasPermission(id));
  }

  const canViewAllTransactions = isOwner || hasPermission("transaction_view_all");
  const canViewOwnTransactions = isOwner || hasPermission("transaction_view_own") || hasPermission("history");
  const canViewOwnWallets = isOwner || hasPermission("wallet_view_own") || hasPermission("wallets");
  const canViewAllWallets = isOwner || hasPermission("wallet_view_all") || (currentRole === "Admin" && hasPermission("wallets"));
  const canCreateOwnWallets = isOwner || hasPermission("wallet_create_own");
  const canCreateMemberWallets = isOwner || hasPermission("wallet_create_member");
  const canCreateFamilyWallets = isOwner || hasPermission("wallet_create_family");
  const canManageOwnWallets = isOwner || hasPermission("wallet_manage_own") || (currentRole === "Admin" && hasPermission("wallets"));
  const canManageAllWallets = isOwner || hasPermission("wallet_manage_all");
  const canAdjustWallets = isOwner || hasPermission("wallet_adjust");
  const canMergeWallets = isOwner || hasPermission("wallet_merge");
  const canArchiveWallets = isOwner || hasPermission("wallet_archive");
  const canAccessWallets = canViewOwnWallets || canViewAllWallets;
  const canCreateWalletForUser = (name) => name === currentUser ? canCreateOwnWallets : canCreateMemberWallets;
  const canViewGoals = isOwner || hasPermission("goal_view_public") || hasPermission("goal_view_sensitive") || hasPermission("goals");
  const canViewSensitiveGoals = isOwner || hasPermission("goal_view_sensitive");
  const canViewInvestments = isOwner || hasPermission("investment_view") || (currentRole === "Admin" && hasPermission("investments"));
  const canManageInvestments = isOwner || hasPermission("investment_manage") || (currentRole === "Admin" && hasPermission("investments"));
  const canViewLoans = isOwner || hasPermission("loan_view") || (currentRole === "Admin" && hasPermission("gadai"));
  const canManageLoans = isOwner || hasPermission("loan_manage") || (currentRole === "Admin" && hasPermission("gadai"));
  const canViewFinancialSummary = isOwner || hasPermission("financial_summary_view");
  const canViewActivityLog = isOwner || hasPermission("activity_log_view") || hasPermission("activity_log");
  const canViewRecycleBin = isOwner || hasPermission("recycle_bin_view") || hasPermission("recycle_bin");
  const canViewLogAuditCenter = isOwner;
  const canBackupExport = isOwner || hasPermission("backup_export") || hasPermission("backup");
  const canAccessSelectedWalletUser = (name) => canViewAllWallets || name === currentUser;

  useEffect(() => {
    if (!canViewAllTransactions && filterUser !== currentUser) {
      setFilterUser(currentUser);
    }
    if (!canViewAllWallets && walletFilterUser !== currentUser) {
      setWalletFilterUser(currentUser);
    }
  }, [canViewAllTransactions, canViewAllWallets, currentUser, filterUser, walletFilterUser]);

  const visiblePermissions = PERMISSIONS_V110.filter(permission => permission.group !== "Legacy");
  const permissionGroups = [...new Set(visiblePermissions.map(permission => permission.group))];
  const rolePermissionSummary = FAMILY_ROLES_V110.map(role => {
    const permissions = permissionsForRole(role.label);
    const visibleCount = visiblePermissions.filter(permission => permissions.includes(permission.id)).length;
    return { ...role, permissions, count: permissions.length, visibleCount };
  });
  const scopeOptions = (canViewAllTransactions ? ["semua", ...userFilterNames] : [currentUser]).filter(Boolean);
  const selectedScopeLabel = canViewAllTransactions && filterUser === "semua" ? "Family/Semua" : (filterUser || currentUser);
  const canSwitchScope = scopeOptions.length > 1;
  const showTimeFilters = activeTab === "dashboard" || activeTab === "history";
  const showMainNav = true;

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
    setSelectedFamilyLogUser(null);
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

  async function applyRolePreset(roleLabel, preset = "default") {
    if (!canManagePermissions) {
      showAccessNotice("Permission Manager hanya bisa dikelola oleh Owner.");
      return;
    }
    if (roleLabel === "Owner") {
      setFamilyStatus("Owner memakai full access locked.");
      setTimeout(() => setFamilyStatus(""), 3000);
      return;
    }
    let next = ROLE_PERMISSION_PRESET_V110[roleLabel] || [];
    if (preset === "basic") {
      next = ["dashboard", "history", "settings", "transaction_view_own", "wallet_view_own", "goal_view_public"];
      if (roleLabel !== "Viewer") next.push("transaction_add");
    }
    if (preset === "trusted_admin") {
      next = ROLE_PERMISSION_PRESET_V110.Admin || next;
    }
    await saveRolePermissions({ ...effectiveRolePermissions, [roleLabel]: next }, roleLabel + " permission preset: " + preset);
  }

  function togglePermissionGroup(roleLabel, groupName) {
    const key = roleLabel + "::" + groupName;
    setExpandedPermissionGroups(prev => ({ ...prev, [key]: !prev[key] }));
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
    if (!canAccessWallets) {
      showAccessNotice("Sumber Dana belum diizinkan untuk role " + currentRole + ".");
      setActiveTab("dashboard");
      return;
    }
    if (!canViewAllWallets) setWalletFilterUser(currentUser);
    setShowSettingsCenter(false);
    setActiveTab("dompet");
  }

  function getTransactionIcon(tx) {
    const note = String(tx?.note || "").toLowerCase();
    const cat = CATEGORIES.find(c => c.id === tx?.category) || {};
    if (tx?.refType === "loan_payment" || note.includes("pinjaman") || note.includes("gadai")) return "🏦";
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

  function getCategoryInfo(categoryId, tx = null) {
    const note = String(tx?.note || "").toLowerCase();
    if (tx?.refType === "loan_payment" || note.includes("bunga/biaya pinjaman") || note.includes("pinjaman") || note.includes("gadai")) {
      return { id: "pinjaman", label: "Pinjaman / Loan", icon: "🏦", type: "expense" };
    }
    return CATEGORIES.find(c => c.id === categoryId) || { id: categoryId || "uncategorized", label: categoryId || "Tanpa Kategori", icon: "🧾" };
  }

  function getInputCategoryGroups(type = "expense") {
    const groups = type === "income" ? INCOME_INPUT_GROUPS : CATEGORY_INPUT_GROUPS;
    return groups.map(group => ({
      ...group,
      categories: group.categoryIds.map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean),
    })).filter(group => group.categories.length > 0);
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
              {canAccessWallets && <SettingButton onClick={openWalletManager} tone="green">🏦 Kelola Sumber Dana / Wallet v2</SettingButton>}
              {canManageAllWallets && <SettingButton onClick={() => { setShowSettingsCenter(false); resetWalletTransferForm(); setShowWalletTransfer(true); }} tone="green">💸 Uang Saku / Transfer Wallet</SettingButton>}
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.16)", color: "#a7f3d0", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>
                Settings hanya untuk konfigurasi keuangan. Tabungan / Goal dan Investasi tetap berada di navigasi utama agar tidak tercampur dengan pengaturan.
              </div>
            </Section>

            <Section title="Backup & Sinkronisasi">
              {hasPermission("sync") && isAdminOrOwner && <SettingButton onClick={() => { setShowSettingsCenter(false); handleSyncAll(); }} tone="purple">📊 Sync Google Sheets</SettingButton>}
              {hasPermission("reports") && isAdminOrOwner && <SettingButton onClick={() => { setShowSettingsCenter(false); handleSendReport(); }} tone="green">✉️ Kirim Email Report</SettingButton>}
              {canBackupExport && <SettingButton onClick={() => { setShowSettingsCenter(false); exportBackupJSON(); }} tone="amber">💾 Export Backup JSON</SettingButton>}
            </Section>

            <Section title="Sistem & Keamanan Data">
              {canViewActivityLog && <SettingButton onClick={() => { setShowSettingsCenter(false); setShowActivityLogModal(true); }} tone="purple">📝 Activity Log</SettingButton>}
              {canViewLogAuditCenter && <SettingButton onClick={() => { setShowSettingsCenter(false); setShowLogAuditCenter(true); }} tone="purple">🧭 Log Audit Center · Owner</SettingButton>}
              {(isOwner || canViewRecycleBin) && <SettingButton onClick={() => { setShowSettingsCenter(false); setShowRecycleBin(true); }} tone="amber">♻️ Recycle Bin / Undo Delete</SettingButton>}
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.16)", color: "#fde68a", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>
                Data yang dihapus masuk Recycle Bin selama 30 hari. Restore dan hapus permanen dikontrol oleh Owner.
              </div>
            </Section>

            {!isOwner && <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>Mode {currentRole}: menu mengikuti Permission Manager. Akses dapat diubah oleh Owner.</div>}
            {!permissionsLoaded && <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(99,102,241,0.08)", color: "#c7d2fe", fontSize: "12px", fontWeight: 800 }}>Memuat permission dari Firebase...</div>}
            <SettingButton onClick={lockApp} tone="red">🚪 Lock / Logout</SettingButton>
          </div>

          <div style={{ marginTop: "16px", padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", color: "#aaa", fontSize: "12px", lineHeight: 1.6 }}>
            FinPlan v1.1.0 phase 7.2.0. Predictive Scenario Closure Engine 7.1.5 aktif: backup JSON membawa transaksi, wallet, ledger, goals, portfolio, loan, family, permission, activity log, recycle bin, manifest audit, metadata guard engine, dan predictive allocation planning engine 7.2.0.
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
      goal_funds_used: { label: "Pakai Dana Goal", icon: "🧾", tone: "amber" },
      goal_asset_used: { label: "Pakai Aset Goal", icon: "🏦", tone: "amber" },
      goal_created: { label: "Goal Dibuat", icon: "🎯", tone: "green" },
      goal_updated: { label: "Goal Diubah", icon: "✏️", tone: "purple" },
      goal_archived: { label: "Goal Diarsipkan", icon: "📦", tone: "amber" },
      goal_restored: { label: "Goal Diaktifkan", icon: "✅", tone: "green" },
      goal_duplicated: { label: "Goal Diduplikasi", icon: "🧬", tone: "purple" },
      permissions_updated: { label: "Permission Diubah", icon: "🛡️", tone: "purple" },
      wallet_created: { label: "Wallet Dibuat", icon: "🏦", tone: "green" },
      wallet_updated: { label: "Wallet Diubah", icon: "✏️", tone: "purple" },
      wallet_merged: { label: "Wallet Digabung", icon: "🔄", tone: "amber" },
      wallet_deleted: { label: "Wallet Dihapus", icon: "🗑️", tone: "red" },
      allowance_transfer: { label: "Uang Saku", icon: "💸", tone: "green" },
      wallet_transfer: { label: "Transfer Wallet", icon: "🔁", tone: "purple" },
      wallet_baseline_adjustment: { label: "Baseline Saldo", icon: "🧭", tone: "green" },
      legacy_no_wallet_review: { label: "Review Legacy", icon: "🏷️", tone: "blue" },
      legacy_no_wallet_bulk_review: { label: "Bulk Legacy", icon: "🏷️", tone: "blue" },
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
    if (!showActivityLogModal || !canViewActivityLog) return null;
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



  const LogAuditCenterModal = () => {
    if (!showLogAuditCenter || !canViewLogAuditCenter) return null;

    const txIds = new Set(transactions.map(t => String(t.id)));
    const walletIds = new Set(sumberDanaList.map(sd => String(sd.id)));
    const investmentIds = new Set(investments.map(inv => String(inv.id)));
    const loanIds = new Set(gadaiList.map(g => String(g.id)));
    const goalIds = new Set(savingsGoals.map(g => String(g.id)));
    const goalUsageIds = new Set(goalUsageLog.map(g => String(g.id)));
    const investmentReversalLedgerIds = new Set(sumberDanaLedger
      .filter(l => ["investment_orphan_reversal", "investment_delete_reversal"].includes(l.refType) && l.refId)
      .map(l => String(l.refId)));
    const testReversalLedgerIds = new Set(sumberDanaLedger
      .filter(l => l.refType === "test_transfer_reversal" && l.refId)
      .map(l => String(l.refId)));
    const loanReversalLedgerIds = new Set(sumberDanaLedger
      .filter(l => ["loan_orphan_reversal", "orphan_loan_disbursement_reversal"].includes(l.refType) && l.refId)
      .map(l => String(l.refId)));
    const testWalletAdjustmentReversalIds = new Set(sumberDanaLedger
      .filter(l => l.refType === "test_wallet_adjustment_reversal" && l.refId)
      .map(l => String(l.refId)));

    const transactionLedgers = sumberDanaLedger.filter(l => l.refType === "transaction");
    const ledgerByTxId = transactionLedgers.reduce((acc, l) => {
      const key = String(l.refId || "");
      if (!key) return acc;
      acc[key] = acc[key] || [];
      acc[key].push(l);
      return acc;
    }, {});

    const txWithoutLedger = transactions.filter(tx => tx.sumberDanaId && (ledgerByTxId[String(tx.id)] || []).length === 0);
    const txDuplicateLedger = transactions.filter(tx => (ledgerByTxId[String(tx.id)] || []).length > 1);
    const orphanTransactionLedger = transactionLedgers.filter(l => l.refId && !txIds.has(String(l.refId)));
    const ledgerWithoutWallet = sumberDanaLedger.filter(l => l.sumberDanaId && !walletIds.has(String(l.sumberDanaId)));

    const goalLinkedNoUsage = transactions.filter(tx => (tx.goalId || tx.goalLinkedAmount || tx.goalPendingAmount) && (!tx.goalUsageId || !goalUsageIds.has(String(tx.goalUsageId))));
    const goalUsageOrphanTransaction = goalUsageLog.filter(u => u.sourceTransactionId && !txIds.has(String(u.sourceTransactionId)));
    const goalUsageGoalMissing = goalUsageLog.filter(u => u.goalId && !goalIds.has(String(u.goalId)));

    const investmentBuyNoLedger = investments.filter(inv => inv.sourceMode === "wallet" && !sumberDanaLedger.some(l => l.refType === "investment" && String(l.refId || "") === String(inv.id)));
    const investmentLedgerOrphan = sumberDanaLedger.filter(l =>
      l.refType === "investment" &&
      l.refId &&
      !investmentIds.has(String(l.refId)) &&
      !l.reconciled &&
      !investmentReversalLedgerIds.has(String(l.id))
    );
    const activeTestAllowanceRefs = Object.values(sumberDanaLedger
      .filter(l =>
        ["allowance_transfer_in", "allowance_transfer_out"].includes(l.refType) &&
        String(l.note || "").toLowerCase().includes("test") &&
        !l.reconciled &&
        !testReversalLedgerIds.has(String(l.id))
      )
      .reduce((acc, l) => {
        const key = String(l.refId || l.id);
        acc[key] = acc[key] || { id: key, refId: key, items: [], amount: 0, grossAmount: 0, note: l.note || "", createdAt: l.createdAt || "" };
        acc[key].items.push(l);
        acc[key].amount += Number(l.amount || 0);
        acc[key].grossAmount += Math.abs(Number(l.amount || 0));
        if (!acc[key].note && l.note) acc[key].note = l.note;
        return acc;
      }, {}));

    const loanDisbursementNoLedger = gadaiList.filter(g => g.sumberDanaId && !sumberDanaLedger.some(l => l.refType === "loan_disbursement" && String(l.refId || "") === String(g.id)));
    const loanLedgerOrphan = sumberDanaLedger.filter(l =>
      isLoanLedgerType(l.refType) &&
      l.refId &&
      !loanIds.has(String(l.refId)) &&
      !l.reconciled &&
      !loanReversalLedgerIds.has(String(l.id))
    );
    const activeTestWalletAdjustments = sumberDanaLedger.filter(l =>
      l.refType === "wallet_adjustment" &&
      String(l.note || "").toLowerCase().includes("test") &&
      !l.reconciled &&
      !testWalletAdjustmentReversalIds.has(String(l.id))
    );

    const negativeWallets = sumberDanaList
      .map(sd => ({ ...sd, balance: calcSumberDanaBalance(sd.id), ledgerCount: sumberDanaLedger.filter(l => String(l.sumberDanaId) === String(sd.id)).length }))
      .filter(sd => Number(sd.balance || 0) < 0)
      .sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0));
    const legacyNoWalletTransactions = transactions.filter(tx => ["income", "expense"].includes(tx.type) && !tx.sumberDanaId);
    const reviewedLegacyNoWalletTransactions = legacyNoWalletTransactions.filter(tx => tx.legacyNoWallet || tx.excludedFromWalletLedger || tx.dataLineage === "legacy_no_wallet");
    const unreviewedLegacyNoWalletTransactions = legacyNoWalletTransactions.filter(tx => !(tx.legacyNoWallet || tx.excludedFromWalletLedger || tx.dataLineage === "legacy_no_wallet"));
    const legacyNoWalletExpenseTotal = legacyNoWalletTransactions.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const legacyNoWalletIncomeTotal = legacyNoWalletTransactions.filter(tx => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const unreviewedLegacyExpenseTotal = unreviewedLegacyNoWalletTransactions.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const unreviewedLegacyIncomeTotal = unreviewedLegacyNoWalletTransactions.filter(tx => tx.type === "income").reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const legacyReviewComplete = unreviewedLegacyNoWalletTransactions.length === 0;
    const negativeRealWallets = negativeWallets.filter(sd => !String(sd.name || "").toLowerCase().includes("test"));
    const unresolvedCleanupCount = investmentLedgerOrphan.length + activeTestAllowanceRefs.length + loanLedgerOrphan.length + activeTestWalletAdjustments.length + ledgerWithoutWallet.length + orphanTransactionLedger.length + txDuplicateLedger.length + txWithoutLedger.length;
    const baselineReady = unresolvedCleanupCount === 0;
    const baselineComplete = baselineReady && negativeRealWallets.length === 0;
    const baselinePhaseLabel = baselineComplete ? "Baseline selesai" : baselineReady ? "Siap baseline real" : "Selesaikan cleanup dulu";
    const baselineAdvisorText = !baselineReady
      ? "Masih ada isu ledger/test/orphan. Selesaikan cleanup sebelum menetapkan baseline saldo real."
      : negativeRealWallets.length > 0
        ? "Ledger test/orphan sudah bersih. Sekarang masukkan saldo real untuk wallet negatif agar engine naik ke mode siap Financial Engine."
        : legacyReviewComplete
          ? "Tidak ada wallet real negatif setelah cleanup. Baseline dan legacy review siap untuk Financial Engine Cleanup."
          : "Baseline wallet sudah aman. Selesaikan review legacy transaction agar Financial Engine bisa memisahkan data historis dengan data wallet-ledger.";
    const legacyAdvisorText = legacyReviewComplete
      ? "Semua transaksi lama tanpa wallet sudah ditandai sebagai Legacy / No Wallet. Data historis tetap ada, tetapi tidak akan dibaca sebagai kerusakan wallet ledger."
      : "Masih ada transaksi lama tanpa wallet yang belum diberi label resmi. Tandai sebagai Legacy / No Wallet supaya Financial Engine tidak mencoba membuat saldo dari data historis.";

    const activeRecycle = recycleBin.filter(item => !item.expiresAt || item.expiresAt >= new Date().toISOString());
    const expiredRecycle = recycleBin.filter(item => item.expiresAt && item.expiresAt < new Date().toISOString());
    const backupManifest = getBackupManifest();
    const backupCriticalMissing = (backupManifest.collections || []).filter(c => c.critical && c.count === 0 && !["gadaiList", "loanPayments", "goalUsageLog", "recycleBin", "activityLog", "investmentLogs", "walletTransfers", "customGoals", "goalOverrides", "savingsHoldings", "savingsData"].includes(c.key));
    const backupCompletenessScore = Math.round((backupManifest.includedCount / Math.max(1, backupManifest.totalCollections)) * 100);

    const issueGroups = [
      { title: "Transaksi ↔ Wallet Ledger", icon: "🧾", tone: "red", items: [
        { label: "Transaksi tanpa ledger wallet", count: txWithoutLedger.length, items: txWithoutLedger, kind: "transaction" },
        { label: "Transaksi dengan ledger ganda", count: txDuplicateLedger.length, items: txDuplicateLedger, kind: "transaction" },
        { label: "Ledger transaksi tanpa transaksi aktif", count: orphanTransactionLedger.length, items: orphanTransactionLedger, kind: "ledger" },
        { label: "Ledger memakai wallet yang tidak ditemukan", count: ledgerWithoutWallet.length, items: ledgerWithoutWallet, kind: "ledger" },
      ]},
      { title: "Goal Usage ↔ Transaksi", icon: "🎯", tone: "amber", items: [
        { label: "Transaksi goal-linked tanpa usage valid", count: goalLinkedNoUsage.length, items: goalLinkedNoUsage, kind: "transaction" },
        { label: "Goal usage menunjuk transaksi hilang", count: goalUsageOrphanTransaction.length, items: goalUsageOrphanTransaction, kind: "usage" },
        { label: "Goal usage menunjuk goal hilang", count: goalUsageGoalMissing.length, items: goalUsageGoalMissing, kind: "usage" },
      ]},
      { title: "Portfolio ↔ Wallet Ledger", icon: "📈", tone: "purple", items: [
        { label: "Investasi dari wallet tanpa ledger", count: investmentBuyNoLedger.length, items: investmentBuyNoLedger, kind: "investment" },
        { label: "Ledger investasi tanpa aset aktif", count: investmentLedgerOrphan.length, items: investmentLedgerOrphan, kind: "ledger" },
      ]},
      { title: "Data Test / Cleanup", icon: "🧪", tone: "amber", items: [
        { label: "Transfer uang saku TEST aktif", count: activeTestAllowanceRefs.length, items: activeTestAllowanceRefs, kind: "test_transfer" },
        { label: "Penyesuaian saldo TEST aktif", count: activeTestWalletAdjustments.length, items: activeTestWalletAdjustments, kind: "test_wallet_adjustment" },
      ]},
      { title: "Legacy Transaction Review", icon: "🏷️", tone: "blue", items: [
        { label: "Legacy tanpa wallet belum direview", count: unreviewedLegacyNoWalletTransactions.length, items: unreviewedLegacyNoWalletTransactions, kind: "legacy_transaction" },
      ]},
      { title: "Pinjaman ↔ Wallet Ledger", icon: "🏦", tone: "blue", items: [
        { label: "Pencairan pinjaman tanpa ledger", count: loanDisbursementNoLedger.length, items: loanDisbursementNoLedger, kind: "loan" },
        { label: "Ledger pinjaman/gadai tanpa data aktif", count: loanLedgerOrphan.length, items: loanLedgerOrphan, kind: "loan_ledger" },
      ]},
      { title: "Backup Export Completeness", icon: "💾", tone: "green", items: [
        { label: "Grup data kritikal belum terbaca", count: backupCriticalMissing.length, items: backupCriticalMissing, kind: "backup_manifest" },
      ]},
      { title: "Wallet Balance", icon: "👛", tone: "red", items: [
        { label: "Wallet saldo negatif", count: negativeWallets.length, items: negativeWallets, kind: "wallet" },
      ]},
    ];
    const totalIssues = issueGroups.reduce((sum, group) => sum + group.items.reduce((s, item) => s + Number(item.count || 0), 0), 0);
    const auditScore = Math.max(0, Math.min(100, 100 - (totalIssues * 4)));
    const status = totalIssues === 0 ? "Aman" : totalIssues <= 5 ? "Perlu cek" : "Audit serius";
    const statusColor = totalIssues === 0 ? "#34d399" : totalIssues <= 5 ? "#fbbf24" : "#f87171";

    const openAuditItem = (item, kind) => {
      if (!item) return;
      if (kind === "transaction") { setSelectedTransaction(item); return; }
      if (kind === "wallet") { setSelectedSD(item); return; }
      if (kind === "investment") { setSelectedInvestment(item); return; }
      if (["ledger", "loan_ledger", "test_transfer", "test_wallet_adjustment"].includes(kind) && item.sumberDanaId) {
        const sd = sumberDanaList.find(w => String(w.id) === String(item.sumberDanaId));
        if (sd) setSelectedSD(sd);
      }
    };

    const ItemPreview = ({ row, kind }) => {
      const title = kind === "transaction"
        ? (getCategoryInfo(row.category).label + " · " + formatRupiah(row.amount || 0))
        : kind === "legacy_transaction"
          ? ((row.type === "income" ? "Pemasukan Legacy" : "Pengeluaran Legacy") + " · " + formatRupiah(row.amount || 0))
        : kind === "wallet"
          ? ((row.icon || "👛") + " " + (row.name || row.id) + " · " + formatRupiah(row.balance || 0))
          : kind === "investment"
            ? ((row.ticker || row.assetType || "Aset") + " · " + formatRupiah(row.costBasis || row.costBasisIdr || row.buyPrice || 0))
            : kind === "usage"
              ? ((row.goalLabel || row.goalId || "Goal Usage") + " · " + formatRupiah(row.amount || 0))
              : kind === "test_transfer"
                ? ("Transfer TEST · gross " + formatRupiah(row.grossAmount || 0))
                : kind === "test_wallet_adjustment"
                  ? ("Adjustment TEST · " + formatRupiah(row.amount || 0))
                  : kind === "backup_manifest"
            ? ((row.label || row.key || "Backup item") + " · " + (row.count || 0))
            : ((getLedgerTypeLabel(row.refType) || "Ledger") + " · " + formatRupiah(row.amount || 0));
      const sub = kind === "transaction"
        ? ((row.date || "Tanpa tanggal") + " · " + (row.sumberDanaName || row.sumberDanaId || "Tanpa wallet"))
        : kind === "legacy_transaction"
          ? ((row.date || "Tanpa tanggal") + " · " + (row.user || "Family") + " · " + (row.note || "Tanpa catatan"))
        : kind === "wallet"
          ? ((row.ledgerCount || 0) + " ledger · " + (row.user || "Family"))
          : kind === "ledger"
            ? ((row.refType || "ref") + " · " + (row.refId || "tanpa ref") + " · " + (row.note || ""))
            : kind === "test_transfer"
              ? ((row.items || []).length + " ledger · net " + formatRupiah(row.amount || 0) + " · " + (row.note || row.refId || ""))
              : ((row.date || row.createdAt || "") + " · " + (row.note || row.detail || ""));
      return (
        <div style={{ padding: "10px", borderRadius: "12px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)", marginTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", lineHeight: 1.4 }}>{sub}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
              {["transaction", "legacy_transaction", "wallet", "investment", "ledger", "loan_ledger", "test_wallet_adjustment"].includes(kind) && <button onClick={() => openAuditItem(row, kind === "legacy_transaction" ? "transaction" : kind)} style={{ padding: "7px 9px", borderRadius: "10px", border: "1px solid rgba(99,102,241,0.28)", background: "rgba(99,102,241,0.14)", color: "#c7d2fe", fontSize: "10px", fontWeight: 900, flexShrink: 0 }}>Buka</button>}
              {kind === "legacy_transaction" && !(row.legacyNoWallet || row.excludedFromWalletLedger || row.dataLineage === "legacy_no_wallet") && <button onClick={() => markLegacyNoWalletTransaction(row)} style={{ padding: "7px 9px", borderRadius: "10px", border: "1px solid rgba(125,211,252,0.35)", background: "rgba(14,165,233,0.12)", color: "#bae6fd", fontSize: "10px", fontWeight: 900, flexShrink: 0 }}>Tandai</button>}
              {kind === "ledger" && row.refType === "investment" && !row.reconciled && <button onClick={() => reverseOrphanInvestmentLedger(row)} style={{ padding: "7px 9px", borderRadius: "10px", border: "1px solid rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.12)", color: "#86efac", fontSize: "10px", fontWeight: 900, flexShrink: 0 }}>Reverse</button>}
              {kind === "loan_ledger" && !row.reconciled && <button onClick={() => reverseOrphanLoanLedger(row)} style={{ padding: "7px 9px", borderRadius: "10px", border: "1px solid rgba(96,165,250,0.35)", background: "rgba(96,165,250,0.12)", color: "#bfdbfe", fontSize: "10px", fontWeight: 900, flexShrink: 0 }}>Reverse Loan</button>}
              {kind === "test_wallet_adjustment" && !row.reconciled && <button onClick={() => reverseTestWalletAdjustment(row)} style={{ padding: "7px 9px", borderRadius: "10px", border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.12)", color: "#fde68a", fontSize: "10px", fontWeight: 900, flexShrink: 0 }}>Reverse Adj</button>}
              {kind === "test_transfer" && <button onClick={() => reverseTestAllowanceTransfer(row.refId)} style={{ padding: "7px 9px", borderRadius: "10px", border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.12)", color: "#fde68a", fontSize: "10px", fontWeight: 900, flexShrink: 0 }}>Reverse Test</button>}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div onClick={() => setShowLogAuditCenter(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", overflowX: "hidden", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Log Audit Center · Owner</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Audit Semua Log</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.45 }}>Cek hubungan Transaksi, Wallet Ledger, Goal Usage, Portfolio, Pinjaman, Activity Log, dan Recycle Bin.</div>
            </div>
            <button onClick={() => setShowLogAuditCenter(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ padding: "16px", borderRadius: "18px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.26)", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#c7d2fe", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.5px" }}>Audit Score</div>
                <div style={{ fontSize: "30px", color: "#fff", fontWeight: 1000, marginTop: "4px" }}>{auditScore}/100</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: statusColor, fontSize: "12px", fontWeight: 1000 }}>{status}</div>
            </div>
            <div style={{ fontSize: "11px", color: "#cbd5e1", lineHeight: 1.55, marginTop: "10px" }}>{totalIssues} isu terdeteksi dari log aktif yang sedang terbaca di aplikasi.</div>
          </div>

          <div style={{ padding: "13px", borderRadius: "18px", background: baselineComplete ? "rgba(16,185,129,0.10)" : baselineReady ? "rgba(14,165,233,0.10)" : "rgba(245,158,11,0.09)", border: "1px solid " + (baselineComplete ? "rgba(16,185,129,0.24)" : baselineReady ? "rgba(14,165,233,0.24)" : "rgba(245,158,11,0.22)"), marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "1.4px", color: baselineComplete ? "#86efac" : baselineReady ? "#7dd3fc" : "#fde68a", fontWeight: 1000, textTransform: "uppercase" }}>Financial Engine Gate</div>
                <div style={{ fontSize: "13px", color: "#fff", fontWeight: 1000, marginTop: "4px" }}>{baselinePhaseLabel}</div>
              </div>
              <div style={{ padding: "7px 9px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", color: baselineComplete ? "#86efac" : baselineReady ? "#bae6fd" : "#fde68a", fontSize: "10px", fontWeight: 1000 }}>
                {baselineComplete ? "READY" : baselineReady ? "BASELINE" : unresolvedCleanupCount + " cleanup"}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#cbd5e1", lineHeight: 1.55, marginTop: "8px" }}>{baselineAdvisorText}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            {[
              ["Transaksi", transactions.length],
              ["Legacy Review", reviewedLegacyNoWalletTransactions.length + "/" + legacyNoWalletTransactions.length],
              ["Wallet Ledger", sumberDanaLedger.length],
              ["Goal Usage", goalUsageLog.length],
              ["Invest Logs", investmentLogs.length],
              ["Loan Pay", loanPayments.length],
              ["Transfers", walletTransfers.length],
              ["Activity Log", activityLog.length],
              ["Recycle", activeRecycle.length + " aktif"],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: "11px", borderRadius: "14px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: "16px", color: "#fff", fontWeight: 1000, marginTop: "4px" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", color: "#fde68a", fontSize: "11px", lineHeight: 1.55, fontWeight: 800, marginBottom: "14px" }}>
            Backup phase 7.0.0 membawa manifest lengkap: {backupManifest.includedCount}/{backupManifest.totalCollections} grup data terbaca · completeness {backupCompletenessScore}%. Recycle expired: {expiredRecycle.length} item. Gunakan tombol Reverse hanya untuk ledger orphan/test yang sudah kamu verifikasi.
          </div>

          <div style={{ padding: "13px", borderRadius: "18px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "1.4px", color: "#86efac", fontWeight: 1000, textTransform: "uppercase" }}>Backup Export Completeness</div>
                <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5, marginTop: "6px" }}>Backup JSON sekarang menyertakan transaksi, wallet, ledger, goal usage, custom goals, portfolio, investment log, loan payment, wallet transfer, family, permission, activity log, recycle bin, dan manifest audit.</div>
              </div>
              <div style={{ padding: "7px 9px", borderRadius: "999px", background: "rgba(16,185,129,0.12)", color: "#86efac", fontSize: "10px", fontWeight: 1000, whiteSpace: "nowrap" }}>
                {backupCompletenessScore}%
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px", marginTop: "10px" }}>
              {(backupManifest.collections || []).slice(0, 8).map(c => (
                <div key={c.key} style={{ padding: "8px", borderRadius: "12px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</div>
                  <div style={{ fontSize: "13px", color: "#fff", fontWeight: 1000, marginTop: "3px" }}>{c.count}</div>
                </div>
              ))}
            </div>
            {backupExportStatus && <div style={{ marginTop: "9px", color: "#86efac", fontSize: "11px", fontWeight: 900 }}>{backupExportStatus}</div>}
            <button onClick={exportBackupJSON} style={{ marginTop: "10px", width: "100%", padding: "11px", borderRadius: "13px", border: "1px solid rgba(16,185,129,0.28)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontSize: "11px", fontWeight: 1000, cursor: "pointer" }}>💾 Export Backup Lengkap</button>
          </div>

          <div style={{ padding: "13px", borderRadius: "18px", background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.20)", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "1.4px", color: "#7dd3fc", fontWeight: 1000, textTransform: "uppercase" }}>Baseline & Legacy Advisor</div>
                <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5, marginTop: "6px" }}>{baselineAdvisorText}</div>
              </div>
              <div style={{ padding: "7px 9px", borderRadius: "999px", background: legacyNoWalletTransactions.length ? "rgba(245,158,11,0.14)" : "rgba(16,185,129,0.12)", color: legacyNoWalletTransactions.length ? "#fde68a" : "#86efac", fontSize: "10px", fontWeight: 1000, whiteSpace: "nowrap" }}>
                {legacyNoWalletTransactions.length} legacy
              </div>
            </div>
            {legacyNoWalletTransactions.length > 0 && (
              <div style={{ marginTop: "10px", fontSize: "11px", color: "#bae6fd", lineHeight: 1.55 }}>
                Ada <b>{legacyNoWalletTransactions.length}</b> transaksi lama tanpa wallet. Expense legacy: <b>{formatFull(legacyNoWalletExpenseTotal)}</b>, income legacy: <b>{formatFull(legacyNoWalletIncomeTotal)}</b>. Sudah direview: <b>{reviewedLegacyNoWalletTransactions.length}</b>, belum: <b>{unreviewedLegacyNoWalletTransactions.length}</b>. Data ini tetap tercatat sebagai riwayat transaksi, tetapi tidak ikut membentuk saldo wallet ledger.
              </div>
            )}
            {legacyNoWalletTransactions.length > 0 && (
              <div style={{ padding: "10px", borderRadius: "14px", background: legacyReviewComplete ? "rgba(16,185,129,0.09)" : "rgba(14,165,233,0.08)", border: "1px solid " + (legacyReviewComplete ? "rgba(16,185,129,0.20)" : "rgba(14,165,233,0.20)"), marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: legacyReviewComplete ? "#86efac" : "#7dd3fc", fontWeight: 1000 }}>🏷️ Legacy Transaction Cleanup</div>
                    <div style={{ fontSize: "10px", color: "#cbd5e1", marginTop: "4px", lineHeight: 1.45 }}>{legacyAdvisorText}</div>
                  </div>
                  {!legacyReviewComplete && <button onClick={markAllLegacyNoWalletTransactions} style={{ padding: "8px 9px", borderRadius: "10px", border: "1px solid rgba(125,211,252,0.28)", background: "rgba(14,165,233,0.12)", color: "#bae6fd", fontSize: "10px", fontWeight: 1000, cursor: "pointer", whiteSpace: "nowrap" }}>Tandai Semua</button>}
                </div>
                {!legacyReviewComplete && (
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "8px", lineHeight: 1.45 }}>
                    Belum direview: {unreviewedLegacyNoWalletTransactions.length} transaksi · Expense {formatFull(unreviewedLegacyExpenseTotal)} · Income {formatFull(unreviewedLegacyIncomeTotal)}.
                  </div>
                )}
                {!legacyReviewComplete && unreviewedLegacyNoWalletTransactions.slice(0, 3).map((row, idx) => <ItemPreview key={(row.id || idx) + "legacy_review"} row={row} kind="legacy_transaction" />)}
              </div>
            )}
            {negativeRealWallets.length > 0 && (
              <div style={{ display: "grid", gap: "7px", marginTop: "10px" }}>
                {negativeRealWallets.slice(0, 3).map(sd => (
                  <div key={sd.id} style={{ padding: "9px 10px", borderRadius: "13px", border: "1px solid rgba(125,211,252,0.22)", background: "rgba(15,23,42,0.54)", color: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 900 }}>{sd.icon || "💵"} {sd.name || "Wallet"}</span>
                      <span style={{ fontSize: "11px", fontWeight: 1000, color: "#fca5a5" }}>{formatFull(sd.balance || 0)}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", lineHeight: 1.4 }}>Masukkan saldo real. Quick action Rp0 hanya untuk wallet yang memang sudah kosong.</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px", marginTop: "8px" }}>
                      <button onClick={() => openSumberDanaEditor(sd, { note: "Baseline saldo real setelah audit ledger" })} style={{ padding: "8px", borderRadius: "10px", border: "1px solid rgba(125,211,252,0.25)", background: "rgba(14,165,233,0.12)", color: "#bae6fd", fontSize: "10px", fontWeight: 1000, cursor: "pointer" }}>Isi Saldo Real</button>
                      <button onClick={() => createWalletBaselineAdjustment(sd, 0, "Quick baseline Rp0 dari Log Audit Center")} style={{ padding: "8px", borderRadius: "10px", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontSize: "10px", fontWeight: 1000, cursor: "pointer" }}>Baseline Rp0</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {issueGroups.map(group => {
            const groupCount = group.items.reduce((sum, x) => sum + Number(x.count || 0), 0);
            return (
              <div key={group.title} style={{ padding: "14px", borderRadius: "18px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <div style={{ fontSize: "13px", color: "#fff", fontWeight: 1000 }}>{group.icon} {group.title}</div>
                  <div style={{ fontSize: "11px", color: groupCount ? "#fca5a5" : "#86efac", fontWeight: 1000 }}>{groupCount ? groupCount + " isu" : "Aman"}</div>
                </div>
                {group.items.map(section => (
                  <div key={section.label} style={{ marginTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: section.count ? "#fca5a5" : "#94a3b8", fontSize: "11px", fontWeight: 900 }}>
                      <span>{section.label}</span><span>{section.count}</span>
                    </div>
                    {section.items.slice(0, 3).map((row, idx) => <ItemPreview key={(row.id || row.refId || idx) + section.label} row={row} kind={section.kind} />)}
                    {section.count > 3 && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "7px" }}>+{section.count - 3} item lain. Buka module terkait untuk cek lanjutan.</div>}
                  </div>
                ))}
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
                {canAccessWallets && <button onClick={openWalletManager} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(16,185,129,0.24)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontWeight: 900, textAlign: "left" }}>🏦 Kelola Sumber Dana / Wallet v2</button>}
                <button onClick={() => { setShowSettingsCenter(false); handleSyncAll(); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(99,102,241,0.18)", color: "#c7d2fe", fontWeight: 900, textAlign: "left" }}>📊 Sync Google Sheets</button>
                <button onClick={() => { setShowSettingsCenter(false); handleSendReport(); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(16,185,129,0.16)", color: "#86efac", fontWeight: 900, textAlign: "left" }}>✉️ Kirim Email Report</button>
                {typeof exportBackupJSON === "function" && <button onClick={() => { setShowSettingsCenter(false); exportBackupJSON(); }} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(245,158,11,0.14)", color: "#fbbf24", fontWeight: 900, textAlign: "left" }}>💾 Export Backup JSON</button>}
                <button onClick={lockApp} style={{ padding: "14px", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.10)", color: "#fca5a5", fontWeight: 900, textAlign: "left" }}>🚪 Lock / Logout</button>
              </div>

              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", color: "#aaa", fontSize: "12px", lineHeight: 1.6 }}>
                FinPlan v1.1.0 phase 7.2.0. Predictive Scenario Closure Engine 7.1.5 aktif: backup JSON membawa manifest lengkap, log penting, metadata guard anti double count, dan predictive allocation planning engine 7.2.0.
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
    const transactionUserOptions = [...new Set([currentUser, ...(activeFamilyMembers || []).map(m => m.name), "Anak-anak", "Keluarga", ...USERS].filter(Boolean))];
    const selectedTransactionUser = form.user || currentUser || transactionUserOptions[0] || "";
    const selectedCategoryInfo = getCategoryInfo(form.category);
    const inputCategoryGroups = getInputCategoryGroups(form.type);
    const isChildExpenseInput = form.type === "expense" && CHILD_EXPENSE_CATEGORY_IDS.includes(form.category);
    const directGoalOptions = form.type === "expense"
      ? getGoalLinkSuggestionsForTransaction({ category: form.category, note: form.note, user: selectedTransactionUser, userName: selectedTransactionUser })
      : [];
    const selectedDirectGoal = form.goalId ? savingsGoals.find(g => String(g.id) === String(form.goalId)) : null;
    const selectedDirectGoalCash = selectedDirectGoal ? Number(savingsData[selectedDirectGoal.id] || 0) : 0;
    const childInputExamples = {
      pendidikan_anak: "SPP Aroon Juli 2026 / buku sekolah / seragam",
      kesehatan_anak: "Dokter Aroon / obat / vaksin / vitamin",
      kebutuhan_anak: "Susu / popok / baju / perlengkapan anak",
      hiburan_anak: "Playground / berenang / mainan anak",
      tabungan_anak: "Setoran tabungan anak / celengan pendidikan",
      anak_lainnya: "Kebutuhan anak lain yang belum masuk kategori",
    };
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
            <button onClick={() => setForm({...form, type: "expense", category: "makan", goalId: ""})} style={{ padding: "12px", borderRadius: "14px", border: "none", background: form.type === "expense" ? "#ef4444" : "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 900 }}>📤 Expense</button>
            <button onClick={() => setForm({...form, type: "income", category: "gaji", goalId: ""})} style={{ padding: "12px", borderRadius: "14px", border: "none", background: form.type === "income" ? "#10b981" : "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 900 }}>📥 Income</button>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", color: "#888" }}>Kategori</div>
              <div style={{ fontSize: "11px", color: "#c7d2fe", fontWeight: 900, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: "999px", padding: "5px 9px", whiteSpace: "nowrap" }}>
                {selectedCategoryInfo.icon} {selectedCategoryInfo.label}
              </div>
            </div>
            <div style={{ display: "grid", gap: "10px" }}>
              {inputCategoryGroups.map(group => (
                <div key={group.id} style={{ padding: "10px", borderRadius: "16px", background: group.id === "child" && isChildExpenseInput ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.035)", border: group.id === "child" && isChildExpenseInput ? "1px solid rgba(99,102,241,0.26)" : "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline", marginBottom: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900 }}>{group.label}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800, textAlign: "right" }}>{group.hint}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {group.categories.map(c => (
                      <button key={c.id} onClick={() => setForm({...form, category: c.id})} style={{
                        padding: "9px 11px", borderRadius: "999px",
                        border: form.category === c.id ? "1px solid #818cf8" : "1px solid rgba(255,255,255,0.08)",
                        background: form.category === c.id ? "rgba(99,102,241,0.30)" : "rgba(255,255,255,0.05)",
                        color: "#fff", fontWeight: 900, textAlign: "left", fontSize: "12px", whiteSpace: "nowrap"
                      }}>{c.icon} {c.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isChildExpenseInput && (
            <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)", color: "#c7d2fe", fontSize: "12px", lineHeight: 1.5, fontWeight: 800, marginBottom: "12px" }}>
              👨‍👩‍👧 Biaya anak: kategori menjawab <b>untuk apa</b>, Beneficiary menjawab <b>untuk siapa</b>. Pilih nama anak untuk biaya personal, atau <b>Anak-anak/Keluarga</b> untuk biaya bersama.
            </div>
          )}

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
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Untuk / Beneficiary</div>
              <select value={selectedTransactionUser} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setForm(prev => ({ ...prev, user: e.target.value }))} style={inputStyle}>
                {transactionUserOptions.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "5px", lineHeight: 1.4 }}>Pilih penerima manfaat transaksi. Untuk biaya anak, pilih nama anak; untuk biaya bersama, pilih Anak-anak atau Keluarga.</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Sumber Dana</div>
              <select value={transactionSDId} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setTransactionSDId(e.target.value)} style={inputStyle}>
                <option value="">Pilih sumber dana</option>
                {selectableFundingSources.map(sd => <option key={sd.id} value={sd.id}>{sd.icon} {sd.name} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
              </select>
            </div>
            {form.type === "expense" && (
              <div style={{ padding: "12px", borderRadius: "16px", background: form.goalId ? "rgba(16,185,129,0.10)" : "rgba(255,255,255,0.035)", border: form.goalId ? "1px solid rgba(16,185,129,0.24)" : "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "12px", color: "#888" }}>Hubungkan ke Goal</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800 }}>Opsional</div>
                </div>
                <select value={form.goalId || ""} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onChange={(e) => setForm(prev => ({ ...prev, goalId: e.target.value }))} style={inputStyle}>
                  <option value="">Tidak terkait Goal</option>
                  {directGoalOptions.map(g => <option key={g.id} value={g.id}>{g.icon} {g.label} · dana {formatRupiah(savingsData[g.id] || 0)}</option>)}
                </select>
                <div style={{ fontSize: "10px", color: form.goalId ? "#86efac" : "#64748b", marginTop: "6px", lineHeight: 1.45 }}>
                  {form.goalId
                    ? `Expense tetap tercatat 1x, wallet terpotong 1x, dan Goal ${selectedDirectGoal?.label || "terpilih"} akan berkurang maksimal ${formatRupiah(selectedDirectGoalCash)}.`
                    : "Gunakan jika transaksi ini memakai dana Goal. Untuk transaksi lama, tetap bisa hubungkan dari detail transaksi."}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Catatan</div>
              <input
                    value={form.note}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                    placeholder={isChildExpenseInput ? ("Contoh: " + (childInputExamples[form.category] || "kebutuhan anak")) : "Contoh: makan siang, BBM, owner draw"}
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

  const WalletTransferModal = () => {
    if (!showWalletTransfer) return null;

    const activeWallets = sumberDanaList.filter(sd => isSumberDanaActive(sd));
    const sourceOptions = activeWallets.filter(sd => canManageAllWallets || sd.user === currentUser);
    const destinationOptions = activeWallets.filter(sd => sd.id !== walletTransferForm.sourceWalletId);
    const membersWithoutActiveWallet = activeFamilyMembers
      .filter(member => member.status !== "archived")
      .filter(member => !activeWallets.some(sd => sd.user === member.name))
      .filter(member => canCreateWalletForUser(member.name));
    const amount = parseAmount(walletTransferForm.amount);
    const source = sumberDanaList.find(sd => sd.id === walletTransferForm.sourceWalletId);
    const destination = sumberDanaList.find(sd => sd.id === walletTransferForm.destinationWalletId);
    const isAllowance = walletTransferForm.purpose === "uang_saku";

    return (
      <div onClick={() => setShowWalletTransfer(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99997, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#86efac", fontWeight: 900, textTransform: "uppercase" }}>Phase 6.7.2 · Family Transfer</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Uang Saku / Transfer Wallet</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.5 }}>
                Transfer antar wallet keluarga. Wallet asal berkurang, wallet tujuan bertambah, net worth keluarga tidak berubah.
              </div>
            </div>
            <button onClick={() => setShowWalletTransfer(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <button onClick={() => setWalletTransferForm(prev => ({ ...prev, purpose: "uang_saku" }))} style={{ padding: "12px", borderRadius: "14px", border: "1px solid " + (isAllowance ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)"), background: isAllowance ? "rgba(16,185,129,0.16)" : "rgba(255,255,255,0.05)", color: isAllowance ? "#86efac" : "#94a3b8", fontWeight: 900, cursor: "pointer" }}>💸 Uang Saku</button>
            <button onClick={() => setWalletTransferForm(prev => ({ ...prev, purpose: "transfer_wallet" }))} style={{ padding: "12px", borderRadius: "14px", border: "1px solid " + (!isAllowance ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.08)"), background: !isAllowance ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.05)", color: !isAllowance ? "#c7d2fe" : "#94a3b8", fontWeight: 900, cursor: "pointer" }}>🔁 Transfer</button>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Wallet asal</div>
              <select value={walletTransferForm.sourceWalletId} onChange={(e) => setWalletTransferForm(prev => ({ ...prev, sourceWalletId: e.target.value, destinationWalletId: prev.destinationWalletId === e.target.value ? "" : prev.destinationWalletId }))} style={inputStyle}>
                <option value="">Pilih wallet asal...</option>
                {sourceOptions.map(sd => <option key={sd.id} value={sd.id}>{sd.icon || "💵"} {sd.name} · {sd.user} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Wallet tujuan</div>
              <select value={walletTransferForm.destinationWalletId} onChange={(e) => setWalletTransferForm(prev => ({ ...prev, destinationWalletId: e.target.value }))} style={inputStyle}>
                <option value="">Pilih wallet tujuan/member...</option>
                {destinationOptions.map(sd => <option key={sd.id} value={sd.id}>{sd.icon || "💵"} {sd.name} · {sd.user} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input value={walletTransferForm.amount} inputMode="numeric" onChange={(e) => setWalletTransferForm(prev => ({ ...prev, amount: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Nominal" style={inputStyle} />
              <input type="date" value={walletTransferForm.date} onChange={(e) => setWalletTransferForm(prev => ({ ...prev, date: e.target.value }))} style={inputStyle} />
            </div>

            <input value={walletTransferForm.note} onChange={(e) => setWalletTransferForm(prev => ({ ...prev, note: e.target.value }))} placeholder={isAllowance ? "Catatan, contoh: uang saku minggu ini" : "Catatan transfer"} style={inputStyle} />

            <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)" }}>
              <div style={{ fontSize: "12px", color: "#c7d2fe", fontWeight: 900, marginBottom: "8px" }}>Preview efek ledger</div>
              <div style={{ display: "grid", gap: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                <div>Wallet asal: <b style={{ color: "#fca5a5" }}>{source ? source.name + " -" + formatFull(amount || 0) : "-"}</b></div>
                <div>Wallet tujuan: <b style={{ color: "#86efac" }}>{destination ? destination.name + " +" + formatFull(amount || 0) : "-"}</b></div>
                <div>Net worth keluarga: <b style={{ color: "#fff" }}>tetap / netral</b></div>
              </div>
            </div>

            <button onClick={executeWalletTransfer} disabled={!walletTransferForm.sourceWalletId || !walletTransferForm.destinationWalletId || !amount} style={{ padding: "15px", borderRadius: "16px", border: "none", background: walletTransferForm.sourceWalletId && walletTransferForm.destinationWalletId && amount ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.06)", color: walletTransferForm.sourceWalletId && walletTransferForm.destinationWalletId && amount ? "#fff" : "#64748b", fontSize: "14px", fontWeight: 900, cursor: walletTransferForm.sourceWalletId && walletTransferForm.destinationWalletId && amount ? "pointer" : "not-allowed" }}>
              {isAllowance ? "💸 Kirim Uang Saku" : "🔁 Simpan Transfer"}
            </button>

            {membersWithoutActiveWallet.length > 0 && (
              <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.22)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 900, marginBottom: "8px" }}>Member tanpa wallet aktif</div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {membersWithoutActiveWallet.map(member => (
                    <button key={member.name} onClick={() => createDefaultWalletForMember(member.name, true)} style={{ padding: "10px", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.28)", background: "rgba(15,23,42,0.55)", color: "#fff", fontWeight: 900, textAlign: "left", cursor: "pointer" }}>
                      ➕ Buat Wallet {member.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {destinationOptions.length === 0 && membersWithoutActiveWallet.length === 0 && (
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>
                Belum ada wallet tujuan aktif atau kamu tidak punya izin membuat wallet tujuan.
              </div>
            )}
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
    const sensitiveLoanLedgerTypes = ["loan_disbursement","loan_repayment","loan_repayment_cancel","orphan_loan_disbursement_reversal","gadai","gadai_lunas","loan_status_updated"];
    const canSeeSensitiveWalletLedger = canViewLoans || isOwner;
    const visibleWalletLedgerSorted = walletLedgerSorted.filter(l => canSeeSensitiveWalletLedger || !sensitiveLoanLedgerTypes.includes(l.refType));
    const orphanLoanLedgers = canSeeSensitiveWalletLedger ? getOrphanLoanDisbursementLedgers(sd.id) : [];
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
              <div style={{ fontSize: "11px", color: "#a5b4fc", fontWeight: 800 }}>{visibleWalletLedgerSorted.length} item</div>
            </div>
            <div style={{ display: "grid", gap: "8px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
              {visibleWalletLedgerSorted.length === 0 && <div style={{ fontSize: "12px", color: "#94a3b8" }}>Belum ada pergerakan wallet yang bisa dilihat role ini.</div>}
              {visibleWalletLedgerSorted.slice(0, 30).map(l => (
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

          {balance < 0 && (
            <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#fca5a5", fontSize: "12px", lineHeight: 1.55, marginBottom: "14px", fontWeight: 800 }}>
              ⚠️ Saldo wallet negatif. Jika Log Audit Center sudah bersih, lakukan baseline saldo real. Baseline membuat ledger koreksi baru, bukan menghapus histori lama.
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                <button onClick={() => setWalletAdjustForm({ targetBalance: "0", note: "Baseline saldo real setelah audit ledger" })} style={{ padding: "9px", borderRadius: "12px", border: "1px solid rgba(125,211,252,0.24)", background: "rgba(14,165,233,0.12)", color: "#bae6fd", fontSize: "11px", fontWeight: 1000 }}>Isi Target Rp0</button>
                <button onClick={() => createWalletBaselineAdjustment(sd, 0, "Quick baseline Rp0 dari Wallet Editor")} style={{ padding: "9px", borderRadius: "12px", border: "1px solid rgba(16,185,129,0.24)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontSize: "11px", fontWeight: 1000 }}>Baseline Rp0</button>
              </div>
            </div>
          )}

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>🧭 Penyesuaian Saldo</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "10px" }}>
              Gunakan untuk baseline saldo real setelah audit ledger selesai. Sistem akan membuat ledger koreksi/baseline, bukan menghapus histori.
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              <input value={walletAdjustForm.targetBalance} inputMode="numeric" onChange={(e) => setWalletAdjustForm(prev => ({ ...prev, targetBalance: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Saldo akhir real, contoh: 1000000" style={inputStyle} />
              <input value={walletAdjustForm.note} onChange={(e) => setWalletAdjustForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Catatan koreksi, opsional" style={inputStyle} />
              <button onClick={() => adjustWalletToTarget(sd)} disabled={!walletAdjustForm.targetBalance} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(16,185,129,0.25)", background: walletAdjustForm.targetBalance ? "rgba(16,185,129,0.16)" : "rgba(255,255,255,0.05)", color: walletAdjustForm.targetBalance ? "#86efac" : "#64748b", fontWeight: 900, cursor: walletAdjustForm.targetBalance ? "pointer" : "not-allowed" }}>
                Buat Ledger Koreksi
              </button>
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
    const goal = savingsGoals.find(g => g.id === showSavingsForm);
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

  const AssetToGoalModal = () => {
    if (!assetToGoalInvestment) return null;
    const inv = assetToGoalInvestment;
    const at = ASSET_TYPES.find(a => a.id === inv.assetType) || { icon: "💰", label: inv.assetType || "Aset", unit: "unit" };
    const qtyAvailable = Number(inv.qty ?? inv.amount ?? 0);
    const moveQty = parseDecimal(assetToGoalForm.qty) || 0;
    const costBasis = Number(inv.costBasis ?? (["idr","obligasi"].includes(inv.assetType) ? (inv.idrValue || 0) : qtyAvailable * (inv.buyPrice || 0)));
    const movedCost = qtyAvailable ? Math.round(costBasis * Math.min(moveQty, qtyAvailable) / qtyAvailable) : 0;
    const currentValue = calcAssetValue(inv, marketPrices);
    const movedCurrentValue = qtyAvailable ? Math.round(currentValue * Math.min(moveQty, qtyAvailable) / qtyAvailable) : 0;
    const selectedGoal = savingsGoals.find(g => g.id === assetToGoalForm.goalId);

    return (
      <div onClick={() => setAssetToGoalInvestment(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Phase 6.6 · Asset to Goal</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Pindahkan Aset ke Goal</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.5 }}>Aset tidak dijual dan wallet tidak berubah. Ini hanya mengubah alokasi tujuan aset.</div>
            </div>
            <button onClick={() => setAssetToGoalInvestment(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)", marginBottom: "14px" }}>
            <div style={{ fontSize: "15px", fontWeight: 900, color: "#fff" }}>{at.icon} {inv.ticker || at.label}</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Tersedia {qtyAvailable} {at.unit} · Modal {formatRupiah(costBasis)} · Nilai pasar {formatRupiah(currentValue)}</div>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Pilih Goal Tujuan</div>
              <select value={assetToGoalForm.goalId} onChange={(e) => setAssetToGoalForm(prev => ({ ...prev, goalId: e.target.value }))} style={inputStyle}>
                <option value="">Pilih goal...</option>
                {savingsGoals.map(g => <option key={g.id} value={g.id}>{g.icon} {g.label} · target {formatRupiah(g.targetAmount)}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Qty dipindahkan</div>
              <input value={assetToGoalForm.qty} onChange={(e) => setAssetToGoalForm(prev => ({ ...prev, qty: e.target.value }))} placeholder={"Maks " + qtyAvailable + " " + at.unit} style={inputStyle} />
            </div>

            <input value={assetToGoalForm.note} onChange={(e) => setAssetToGoalForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Catatan opsional" style={inputStyle} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Modal pindah</div>
                <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900 }}>{formatRupiah(movedCost)}</div>
              </div>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Nilai pasar pindah</div>
                <div style={{ fontSize: "12px", color: "#86efac", fontWeight: 900 }}>{formatRupiah(movedCurrentValue)}</div>
              </div>
            </div>

            <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.55, fontWeight: 800 }}>
              Goal {selectedGoal ? selectedGoal.label : "tujuan"} akan bertambah aset. Investasi umum berkurang. Wallet tidak naik/turun.
            </div>

            <button onClick={moveInvestmentAssetToGoal} disabled={!assetToGoalForm.goalId || !moveQty || moveQty > qtyAvailable} style={{ padding: "15px", borderRadius: "16px", border: "none", background: assetToGoalForm.goalId && moveQty && moveQty <= qtyAvailable ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.06)", color: assetToGoalForm.goalId && moveQty && moveQty <= qtyAvailable ? "#fff" : "#64748b", fontSize: "14px", fontWeight: 900, cursor: assetToGoalForm.goalId && moveQty && moveQty <= qtyAvailable ? "pointer" : "not-allowed" }}>
              🎯 Pindahkan ke Goal
            </button>
          </div>
        </div>
      </div>
    );
  };

  const InvestmentAssetModal = () => {
    if (!showAssetConvert || !String(showAssetConvert).startsWith("invest_")) return null;
    const isExisting = showAssetConvert === "invest_existing";
    const assetType = ASSET_TYPES.find(a => a.id === assetForm.assetType);
    const qty = parseDecimal(assetForm.qty);
    const rawValueInput = parseAmount(assetForm.buyPrice) || parseDecimal(assetForm.buyPrice);
    const valueMode = assetForm.valueMode || "total";
    const isCashLikeAsset = ["idr", "obligasi"].includes(assetForm.assetType);
    const estValue = isCashLikeAsset ? qty : (valueMode === "unit" ? qty * rawValueInput : rawValueInput);
    const unitPricePreview = (!isCashLikeAsset && qty && estValue) ? estValue / qty : 0;
    const selectedSource = activeFundingSourceOptions.find(sd => sd.id === assetSDId);

    return (
      <div onClick={() => { setShowAssetConvert(null); setAssetSDId(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: isExisting ? "#fbbf24" : "#34d399", fontWeight: 900, textTransform: "uppercase" }}>{isExisting ? "Existing Asset Onboarding" : "Investment Buy"}</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>{isExisting ? "Input Aset Sudah Dimiliki" : "Beli Aset Investasi"}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.5 }}>
                {isExisting ? "Aset ini sudah kamu miliki sebelumnya. Wallet tidak berubah dan tidak dicatat sebagai pengeluaran baru." : "Aset dibeli dari Sumber Dana. Wallet berkurang, investasi bertambah. Bukan expense konsumtif."}
              </div>
            </div>
            <button onClick={() => { setShowAssetConvert(null); setAssetSDId(""); }} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ padding: "12px", borderRadius: "16px", background: isExisting ? "rgba(245,158,11,0.10)" : "rgba(16,185,129,0.10)", border: isExisting ? "1px solid rgba(245,158,11,0.22)" : "1px solid rgba(16,185,129,0.22)", color: isExisting ? "#fbbf24" : "#86efac", fontSize: "12px", lineHeight: 1.5, fontWeight: 800, marginBottom: "14px" }}>
            {isExisting ? "Mode aset sudah dimiliki: gunakan untuk mencatat LM, USD, saham, reksa dana, atau aset lain yang sudah ada sebelum masuk FinPlan. Tidak ada perubahan saldo wallet." : "Mode beli dari wallet: sumber dana wajib dipilih dan saldo wallet akan berkurang sesuai cost basis."}
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {!isExisting && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Sumber Dana Pembelian</div>
                <select value={assetSDId} onChange={(e) => setAssetSDId(e.target.value)} style={inputStyle}>
                  <option value="">Pilih sumber dana aktif...</option>
                  {activeFundingSourceOptions.map(sd => <option key={sd.id} value={sd.id}>{sd.icon || "💵"} {sd.name} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
                </select>
              </div>
            )}

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
                  <option value="total">Total nilai / modal aset</option>
                  <option value="unit">Harga per unit × qty</option>
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input value={assetForm.qty} onChange={(e) => setAssetForm(prev => ({ ...prev, qty: e.target.value }))} placeholder={assetType?.unit ? "Qty / " + assetType.unit : "Qty"} style={inputStyle} />
              <input value={assetForm.buyPrice} onChange={(e) => setAssetForm(prev => ({ ...prev, buyPrice: e.target.value }))} placeholder={isCashLikeAsset ? "Nilai IDR" : (valueMode === "unit" ? "Harga beli per unit" : "Total nilai/modal")} style={inputStyle} />
            </div>

            {!isCashLikeAsset && (
              <div style={{ padding: "10px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.045)", color: "#94a3b8", fontSize: "11px", lineHeight: 1.45 }}>
                {valueMode === "total"
                  ? <>Mode total: angka dianggap total nilai/modal aset. Harga/unit estimasi: <b style={{ color: "#fff" }}>{formatRupiah(unitPricePreview)}</b>.</>
                  : <>Mode unit: total dihitung dari qty × harga per unit = <b style={{ color: "#fff" }}>{formatRupiah(estValue)}</b>.</>}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input value={assetForm.ticker} onChange={(e) => setAssetForm(prev => ({ ...prev, ticker: e.target.value }))} placeholder="Ticker/nama aset" style={inputStyle} />
              <input value={assetForm.manualPrice} onChange={(e) => setAssetForm(prev => ({ ...prev, manualPrice: e.target.value }))} placeholder="Harga pasar manual" style={inputStyle} />
            </div>

            <input value={assetForm.note} onChange={(e) => setAssetForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Catatan aset / lokasi penyimpanan" style={inputStyle} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>{isExisting ? "Sumber" : "Wallet"}</div>
                <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900 }}>{isExisting ? "Aset sudah dimiliki" : (selectedSource ? selectedSource.name : "-")}</div>
              </div>
              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: "10px", color: "#64748b" }}>Cost Basis</div>
                <div style={{ fontSize: "12px", color: "#86efac", fontWeight: 900 }}>{formatRupiah(estValue)}</div>
              </div>
            </div>

            <button onClick={() => addInvestmentAsset(isExisting ? "existing" : "wallet")} disabled={!qty || (!isCashLikeAsset && !rawValueInput) || (!isExisting && !assetSDId)} style={{ padding: "15px", borderRadius: "16px", border: "none", background: qty && (isCashLikeAsset || rawValueInput) && (isExisting || assetSDId) ? "linear-gradient(135deg,#10b981,#059669)" : "rgba(255,255,255,0.06)", color: qty && (isCashLikeAsset || rawValueInput) && (isExisting || assetSDId) ? "#fff" : "#64748b", fontSize: "14px", fontWeight: 900, cursor: qty && (isCashLikeAsset || rawValueInput) && (isExisting || assetSDId) ? "pointer" : "not-allowed" }}>
              {isExisting ? "✅ Simpan Aset Existing" : "✅ Beli & Catat Investasi"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GoalTemplateManagerModal = () => {
    if (!showGoalTemplateManager) return null;

    const templateGoals = allSavingsGoals.filter(g => g.sourceType === "template");
    const customGoalItems = allSavingsGoals.filter(g => g.sourceType === "custom");
    const getGoalCategoryLabel = (goal) => {
      if (["aroon", "arunika", "arkaja"].includes(goal.category)) {
        return EDUCATION_CHILDREN.find(c => c.id === goal.category)?.label || "Pendidikan";
      }
      return CATEGORY_GROUPS.find(g => g.id === goal.category)?.label || goal.category || "Custom";
    };
    const GoalRow = ({ goal }) => {
      const isArchived = goal.status === "archived";
      const currentVal = calcGoalValue(goal.id);
      return (
        <div style={{ padding: "12px", borderRadius: "16px", background: isArchived ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.05)", border: "1px solid " + (isArchived ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.07)") }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{goal.icon || "🎯"} {goal.label}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", lineHeight: 1.45 }}>
                {goal.sourceType === "template" ? "Template" : "Custom"} · {getGoalCategoryLabel(goal)} · {getGoalPriorityLabel(goal)} · {isArchived ? "Arsip" : "Aktif"}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                Target {formatRupiah(goal.targetAmount || 0)} · Teralokasi {formatRupiah(currentVal)}
              </div>
            </div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "140px" }}>
              <button onClick={() => { setShowGoalTemplateManager(false); openGoalBuilder(goal); }} style={{ padding: "7px 8px", borderRadius: "10px", border: "1px solid rgba(168,85,247,0.28)", background: "rgba(168,85,247,0.10)", color: "#d8b4fe", fontSize: "10px", fontWeight: 900, cursor: "pointer" }}>Edit</button>
              {isArchived ? (
                <button onClick={() => restoreGoal(goal)} style={{ padding: "7px 8px", borderRadius: "10px", border: "1px solid rgba(16,185,129,0.28)", background: "rgba(16,185,129,0.10)", color: "#86efac", fontSize: "10px", fontWeight: 900, cursor: "pointer" }}>Restore</button>
              ) : (
                <button onClick={() => archiveGoal(goal)} style={{ padding: "7px 8px", borderRadius: "10px", border: "1px solid rgba(245,158,11,0.28)", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontSize: "10px", fontWeight: 900, cursor: "pointer" }}>Arsip</button>
              )}
              {goal.sourceType === "template" && (
                <button onClick={() => duplicateGoalTemplate(goal)} style={{ padding: "7px 8px", borderRadius: "10px", border: "1px solid rgba(99,102,241,0.28)", background: "rgba(99,102,241,0.10)", color: "#c7d2fe", fontSize: "10px", fontWeight: 900, cursor: "pointer" }}>Duplikat</button>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div onClick={() => setShowGoalTemplateManager(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#c084fc", fontWeight: 900, textTransform: "uppercase" }}>Phase 6.7.5 · Template System</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Goal Template Control</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.5 }}>
                Template bawaan bisa diedit, diarsipkan, direstore, atau diduplikasi menjadi custom goal. Alur engine tetap terkunci; isi goal fleksibel.
              </div>
            </div>
            <button onClick={() => setShowGoalTemplateManager(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Template</div>
              <div style={{ fontSize: "18px", color: "#fff", fontWeight: 900 }}>{templateGoals.length}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Custom</div>
              <div style={{ fontSize: "18px", color: "#d8b4fe", fontWeight: 900 }}>{customGoalItems.length}</div>
            </div>
            <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Arsip</div>
              <div style={{ fontSize: "18px", color: "#fbbf24", fontWeight: 900 }}>{archivedSavingsGoals.length}</div>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", marginBottom: "8px" }}>Template bawaan</div>
            <div style={{ display: "grid", gap: "8px" }}>
              {templateGoals.map(goal => <GoalRow key={goal.id} goal={goal} />)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", letterSpacing: "1px", color: "#d8b4fe", fontWeight: 900, textTransform: "uppercase", marginBottom: "8px" }}>Custom goals</div>
            {customGoalItems.length === 0 ? (
              <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(168,85,247,0.08)", border: "1px dashed rgba(168,85,247,0.22)", color: "#94a3b8", fontSize: "12px", lineHeight: 1.5 }}>
                Belum ada custom goal. Klik + Goal untuk membuat tujuan manual.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {customGoalItems.map(goal => <GoalRow key={goal.id} goal={goal} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const GoalBuilderModal = () => {
    if (!showGoalBuilder) return null;
    const isEdit = Boolean(editingGoal);
    const isTemplate = isEdit && editingGoal?.sourceType !== "custom";
    const categoryOptions = [
      { id: "aroon", label: "Pendidikan · Aroon" },
      { id: "arunika", label: "Pendidikan · Arunika" },
      { id: "arkaja", label: "Pendidikan · Arkaja" },
      { id: "future", label: "Masa Depan" },
      { id: "pension", label: "Pensiun" },
      { id: "health", label: "Kesehatan" },
      { id: "custom", label: "Custom / Lainnya" },
    ];

    return (
      <div onClick={() => setShowGoalBuilder(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#c084fc", fontWeight: 900, textTransform: "uppercase" }}>Phase 6.7.4 · Custom Goal Builder</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>{isEdit ? "Edit Goal" : "Buat Goal Manual"}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.5 }}>
                Preset goal adalah template awal. Nama, target, prioritas, visibility, dan status bisa disesuaikan Owner/Admin.
              </div>
            </div>
            <button onClick={() => setShowGoalBuilder(false)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          {isTemplate && (
            <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.22)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.55, fontWeight: 800, marginBottom: "14px" }}>
              Ini goal bawaan/template. Perubahan disimpan sebagai override, bukan menghapus template dasar.
            </div>
          )}

          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "8px" }}>
              <input value={goalBuilderForm.icon} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, icon: e.target.value }))} placeholder="Icon" style={inputStyle} />
              <input value={goalBuilderForm.label} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Nama tujuan, contoh: Liburan Keluarga Jepang" style={inputStyle} />
            </div>

            <select value={goalBuilderForm.category} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
              {categoryOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>

            <div style={{ padding: "10px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "11px", color: "#c7d2fe", fontWeight: 900, marginBottom: "8px" }}>Program detail opsional</div>
              <div style={{ display: "grid", gap: "8px" }}>
                <input value={goalBuilderForm.program} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, program: e.target.value }))} placeholder="Program/subkategori, contoh: Sertifikasi, Asuransi Kesehatan" style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <input value={goalBuilderForm.provider} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, provider: e.target.value }))} placeholder="Provider, contoh: Prudential" style={inputStyle} />
                  <input value={goalBuilderForm.beneficiary} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, beneficiary: e.target.value }))} placeholder="Untuk siapa" style={inputStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <input value={goalBuilderForm.premiumAmount} inputMode="numeric" onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, premiumAmount: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Premi/bulan opsional" style={inputStyle} />
                  <input value={goalBuilderForm.coverageAmount} inputMode="numeric" onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, coverageAmount: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Coverage/manfaat opsional" style={inputStyle} />
                </div>
                <input value={goalBuilderForm.renewalCycle} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, renewalCycle: e.target.value }))} placeholder="Renewal/jatuh tempo, contoh: bulanan / tahunan" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input value={goalBuilderForm.targetAmount} inputMode="numeric" onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, targetAmount: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Target nominal" style={inputStyle} />
              <input value={goalBuilderForm.yearsLeft} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, yearsLeft: e.target.value }))} placeholder="Berapa tahun lagi" style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <select value={goalBuilderForm.priority} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, priority: e.target.value }))} style={inputStyle}>
                <option value="wajib">Wajib</option>
                <option value="penting">Penting</option>
                <option value="opsional">Opsional</option>
              </select>
              <select value={goalBuilderForm.fundingType} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, fundingType: e.target.value }))} style={inputStyle}>
                <option value="cash">Tunai</option>
                <option value="asset">Aset</option>
                <option value="mixed">Campuran</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <select value={goalBuilderForm.visibility} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, visibility: e.target.value }))} style={inputStyle}>
                <option value="owner_admin">Owner/Admin</option>
                <option value="family_public">Family Public</option>
                <option value="selected_member">Selected Member</option>
                <option value="owner_only">Owner Only</option>
              </select>
              <select value={goalBuilderForm.status} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                <option value="active">Aktif</option>
                <option value="paused">Pause</option>
                <option value="done">Selesai</option>
                <option value="archived">Arsip</option>
              </select>
            </div>

            <div style={{ padding: "10px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8", fontSize: "11px", lineHeight: 1.45 }}>
              Warna goal otomatis mengikuti kategori agar gampang ditandai.
            </div>
            <input value={goalBuilderForm.desc} onChange={(e) => setGoalBuilderForm(prev => ({ ...prev, desc: e.target.value }))} placeholder="Deskripsi/catatan goal" style={inputStyle} />

            <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)", color: "#c7d2fe", fontSize: "12px", lineHeight: 1.55, fontWeight: 800 }}>
              Target bukan aset. Yang dihitung sebagai modal hanya dana/aset yang nanti benar-benar dialokasikan ke goal.
            </div>

            <button onClick={saveGoalBuilder} style={{ padding: "15px", borderRadius: "16px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "14px", fontWeight: 900, cursor: "pointer" }}>
              💾 {isEdit ? "Simpan Perubahan Goal" : "Buat Goal"}
            </button>

            {isEdit && (
              <button onClick={() => archiveGoal(editingGoal)} style={{ padding: "13px", borderRadius: "16px", border: "1px solid rgba(245,158,11,0.28)", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontSize: "13px", fontWeight: 900, cursor: "pointer" }}>
                📦 Arsipkan Goal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const GoalUsageModal = () => {
    if (!showGoalUsage) return null;
    const goal = savingsGoals.find(g => g.id === showGoalUsage);
    if (!goal) return null;

    const idrCash = Number(savingsData[goal.id] || 0);
    const holdings = savingsHoldings[goal.id] || [];
    const selectedHolding = holdings.find(h => String(h.id) === String(goalUsageForm.assetHoldingId));
    const selectedAssetType = selectedHolding ? ASSET_TYPES.find(a => a.id === selectedHolding.assetType) : null;
    const cashAmount = parseAmount(goalUsageForm.amount);
    const assetQty = parseDecimal(goalUsageForm.assetQty);
    const mode = goalUsageForm.mode || "cash";
    const assetAvailableQty = selectedHolding ? Number(selectedHolding.qty || selectedHolding.amount || 0) : 0;
    const assetValuePreview = selectedHolding && assetAvailableQty && assetQty
      ? Math.round(calcAssetValue(selectedHolding, marketPrices) * Math.min(assetQty, assetAvailableQty) / assetAvailableQty)
      : 0;

    return (
      <div onClick={() => setShowGoalUsage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 99998, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#fbbf24", fontWeight: 900, textTransform: "uppercase" }}>Phase 6.7.3 · Goal Usage Log</div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Pakai Dana Goal</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.5 }}>
                {goal.icon} {goal.label} · Setiap pemakaian goal wajib mencatat dipakai untuk apa.
              </div>
            </div>
            <button onClick={() => setShowGoalUsage(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>

          <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.22)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.55, fontWeight: 800, marginBottom: "14px" }}>
            Dana goal tidak boleh hilang tanpa cerita. Log ini mengurangi saldo/holding goal dan menyimpan audit penggunaan.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <button onClick={() => setGoalUsageForm(prev => ({ ...prev, mode: "cash" }))} disabled={idrCash <= 0} style={{ padding: "12px", borderRadius: "14px", border: "1px solid " + (mode === "cash" ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.08)"), background: mode === "cash" ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.05)", color: idrCash > 0 ? (mode === "cash" ? "#c7d2fe" : "#94a3b8") : "#475569", fontWeight: 900, cursor: idrCash > 0 ? "pointer" : "not-allowed" }}>💵 Tunai</button>
            <button onClick={() => setGoalUsageForm(prev => ({ ...prev, mode: "asset", assetHoldingId: prev.assetHoldingId || (holdings[0]?.id ? String(holdings[0].id) : "") }))} disabled={holdings.length === 0} style={{ padding: "12px", borderRadius: "14px", border: "1px solid " + (mode === "asset" ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)"), background: mode === "asset" ? "rgba(16,185,129,0.16)" : "rgba(255,255,255,0.05)", color: holdings.length > 0 ? (mode === "asset" ? "#86efac" : "#94a3b8") : "#475569", fontWeight: 900, cursor: holdings.length > 0 ? "pointer" : "not-allowed" }}>🏦 Aset</button>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {mode === "cash" ? (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Nominal dipakai · tersedia {formatRupiah(idrCash)}</div>
                <input value={goalUsageForm.amount} inputMode="numeric" onChange={(e) => setGoalUsageForm(prev => ({ ...prev, amount: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Nominal dana goal" style={inputStyle} />
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Pilih aset goal</div>
                  <select value={goalUsageForm.assetHoldingId} onChange={(e) => setGoalUsageForm(prev => ({ ...prev, assetHoldingId: e.target.value, assetQty: "" }))} style={inputStyle}>
                    <option value="">Pilih aset...</option>
                    {holdings.map(h => {
                      const at = ASSET_TYPES.find(a => a.id === h.assetType);
                      return <option key={h.id} value={h.id}>{at?.icon || "🏦"} {h.ticker || at?.label || h.assetType} · {h.qty || h.amount} {at?.unit || "unit"} · {formatRupiah(calcAssetValue(h, marketPrices))}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", marginBottom: "6px" }}>Qty dipakai {selectedHolding ? "· tersedia " + assetAvailableQty + " " + (selectedAssetType?.unit || "unit") : ""}</div>
                  <input value={goalUsageForm.assetQty} onChange={(e) => setGoalUsageForm(prev => ({ ...prev, assetQty: e.target.value }))} placeholder="Qty aset" style={inputStyle} />
                </div>
                <div style={{ padding: "10px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.045)", color: "#94a3b8", fontSize: "11px", lineHeight: 1.45 }}>
                  Estimasi nilai aset terpakai: <b style={{ color: "#fff" }}>{formatRupiah(assetValuePreview)}</b>
                </div>
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <select value={goalUsageForm.category} onChange={(e) => setGoalUsageForm(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                <option value="pendidikan">Pendidikan</option>
                <option value="kesehatan">Kesehatan</option>
                <option value="keluarga">Keluarga</option>
                <option value="darurat">Darurat</option>
                <option value="masa_depan">Masa Depan</option>
                <option value="lainnya">Lainnya</option>
              </select>
              <input type="date" value={goalUsageForm.date} onChange={(e) => setGoalUsageForm(prev => ({ ...prev, date: e.target.value }))} style={inputStyle} />
            </div>

            <input value={goalUsageForm.usedFor} onChange={(e) => setGoalUsageForm(prev => ({ ...prev, usedFor: e.target.value }))} placeholder="Dipakai untuk apa? contoh: uang pangkal sekolah" style={inputStyle} />
            <input value={goalUsageForm.note} onChange={(e) => setGoalUsageForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Catatan opsional" style={inputStyle} />

            <button onClick={useGoalFunds} disabled={!goalUsageForm.usedFor || (mode === "cash" ? !cashAmount || cashAmount > idrCash : !goalUsageForm.assetHoldingId || !assetQty || assetQty > assetAvailableQty)} style={{ padding: "15px", borderRadius: "16px", border: "none", background: goalUsageForm.usedFor && (mode === "cash" ? cashAmount && cashAmount <= idrCash : goalUsageForm.assetHoldingId && assetQty && assetQty <= assetAvailableQty) ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.06)", color: goalUsageForm.usedFor && (mode === "cash" ? cashAmount && cashAmount <= idrCash : goalUsageForm.assetHoldingId && assetQty && assetQty <= assetAvailableQty) ? "#fff" : "#64748b", fontSize: "14px", fontWeight: 900, cursor: goalUsageForm.usedFor && (mode === "cash" ? cashAmount && cashAmount <= idrCash : goalUsageForm.assetHoldingId && assetQty && assetQty <= assetAvailableQty) ? "pointer" : "not-allowed" }}>
              🧾 Simpan Penggunaan Goal
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GoalAssetFundingModal = () => {
    if (!showAssetConvert || String(showAssetConvert).startsWith("invest_")) return null;
    const goal = savingsGoals.find(g => g.id === showAssetConvert);
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
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Loan Engine · Subtipe Gadai</div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Tambah Loan · Gadai</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px", lineHeight: 1.5 }}>Gadai adalah salah satu jenis Loan. Pencairan menambah wallet dan menambah kewajiban, bukan pemasukan murni.</div>
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
            Simpan Loan Gadai
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
    const cat = getCategoryInfo(tx.category, tx);
    const typeInfo = getTypeInfo(tx.type);
    const editType = transactionEditForm.type === "income" ? "income" : "expense";
    const editCategories = editType === "income" ? INCOME_CATS : EXPENSE_CATS;
    const editCurrentSource = tx.sumberDanaId ? sumberDanaList.find(sd => String(sd.id) === String(tx.sumberDanaId)) : null;
    const goalLinkOptions = getGoalLinkSuggestionsForTransaction(tx);
    const linkedGoal = tx.goalId ? savingsGoals.find(g => String(g.id) === String(tx.goalId)) : null;
    const selectedGoalLink = transactionGoalLinkForm.goalId ? savingsGoals.find(g => String(g.id) === String(transactionGoalLinkForm.goalId)) : null;
    const pendingGoalAmount = Number(tx.goalPendingAmount || 0);
    const linkedGoalCashBalance = tx.goalId ? Number(savingsData[tx.goalId] || 0) : 0;
    const goalLinkedAmount = Number(tx.goalLinkedAmount || tx.amount || 0);
    const goalAuditModeLabel = tx.goalLinkMode === "direct_expense_input"
      ? "Input langsung"
      : tx.goalLinkMode === "existing_transaction_reconciliation"
        ? "Rekonsiliasi transaksi lama"
        : tx.goalLinkMode === "owner_revision_sync"
          ? "Sinkron revisi Owner"
          : tx.goalLinkMode || "Link Goal";
    const goalLinkHealth = !tx.goalId
      ? null
      : pendingGoalAmount > 0
        ? { label: "Pending settlement", color: "#fbbf24", bg: "rgba(251,191,36,0.10)", text: "Ada selisih yang belum dikurangi dari Goal." }
        : goalLinkedAmount > Number(tx.amount || 0)
          ? { label: "Perlu cek nominal", color: "#fca5a5", bg: "rgba(248,113,113,0.10)", text: "Nilai link Goal lebih besar dari nominal transaksi." }
          : { label: "Tersinkron", color: "#86efac", bg: "rgba(16,185,129,0.10)", text: "Goal dan transaksi sudah sejajar." };
    const editFundingSources = sumberDanaList
      .filter(sd => isSumberDanaActive(sd) || String(sd.id) === String(transactionEditForm.sumberDanaId || tx.sumberDanaId || ""))
      .sort((a, b) => String(a.user || "").localeCompare(String(b.user || "")) || String(a.name || "").localeCompare(String(b.name || "")));
    const closeTransactionDetail = () => {
      setTransactionEditMode(false);
      setTransactionEditStatus("");
      setSelectedTransaction(null);
    };
    return (
      <div onClick={closeTransactionDetail} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 100001, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "82vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "20px", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", color: "#e8e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: typeInfo.color, fontWeight: 800 }}>{typeInfo.icon} {typeInfo.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: tx.type === "income" ? "#34d399" : "#f87171", marginTop: "8px" }}>{tx.type === "income" ? "+" : "-"}{formatFull(tx.amount || 0)}</div>
            </div>
            <button onClick={closeTransactionDetail} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800 }}>×</button>
          </div>
          <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Kategori</div><div style={{ fontSize: "15px", fontWeight: 800 }}>{cat.icon || "🧾"} {cat.label || "Tanpa Kategori"}</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "11px", color: "#777" }}>Tanggal</div>
                  {isOwner && <div style={{ fontSize: "9px", color: "#93c5fd", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>Pilih tanggal</div>}
                </div>
                {isOwner ? (
                  <input
                    type="date"
                    value={tx.date || String(tx.createdAt || "").slice(0,10) || new Date().toISOString().split("T")[0]}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onChange={(e) => saveOwnerTransactionDate(tx, e.target.value)}
                    style={{ ...inputStyle, minHeight: "34px", padding: "0", border: "none", background: "transparent", fontSize: "14px", fontWeight: 800, color: "#e8e8f0" }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{tx.date || String(tx.createdAt || "").slice(0,10) || "Tanpa Tanggal"}</div>
                )}
              </div>
              <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Untuk / Beneficiary</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{tx.user || tx.userName || "Tanpa User"}</div></div>
            </div>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Sumber Dana</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{tx.sumberDanaName || editCurrentSource?.name || tx.sumberDanaId || tx.sourceFund || "Tanpa Sumber Dana"}</div></div>
            <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.06)" }}><div style={{ fontSize: "11px", color: "#777", marginBottom: "4px" }}>Catatan</div><div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.5 }}>{tx.note || tx.notes || "Tidak ada catatan"}</div></div>

            {tx.goalId && (
              <div style={{ padding: "14px", borderRadius: "16px", background: "rgba(245,158,11,0.09)", border: "1px solid rgba(245,158,11,0.22)", display: "grid", gap: "9px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#fbbf24", marginBottom: "4px", fontWeight: 900 }}>Terhubung ke Goal</div>
                  <div style={{ fontSize: "14px", fontWeight: 900, color: "#fde68a" }}>🎯 {linkedGoal?.label || tx.goalLabel || tx.goalId}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.45 }}>Diperhitungkan sebagai pemakaian Goal: {formatRupiah(goalLinkedAmount)}</div>
                  {goalLinkHealth && <div style={{ marginTop: "8px", padding: "10px", borderRadius: "13px", background: goalLinkHealth.bg, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>Goal Link Status</span>
                      <span style={{ fontSize: "11px", color: goalLinkHealth.color, fontWeight: 900 }}>{goalLinkHealth.label}</span>
                    </div>
                    <div style={{ marginTop: "5px", fontSize: "10px", color: "#cbd5e1", lineHeight: 1.45 }}>{goalLinkHealth.text}</div>
                  </div>}
                  <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                    <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "3px" }}>Linked</div><div style={{ fontSize: "11px", fontWeight: 900, color: "#fde68a" }}>{formatRupiah(goalLinkedAmount)}</div></div>
                    <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "3px" }}>Pending</div><div style={{ fontSize: "11px", fontWeight: 900, color: pendingGoalAmount > 0 ? "#fbbf24" : "#86efac" }}>{formatRupiah(pendingGoalAmount)}</div></div>
                    <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "3px" }}>Mode</div><div style={{ fontSize: "11px", fontWeight: 900 }}>{goalAuditModeLabel}</div></div>
                    <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }}><div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "3px" }}>Saldo Goal</div><div style={{ fontSize: "11px", fontWeight: 900 }}>{formatRupiah(linkedGoalCashBalance)}</div></div>
                  </div>
                  {pendingGoalAmount > 0 && <div style={{ marginTop: "7px", padding: "9px 10px", borderRadius: "12px", background: "rgba(251,191,36,0.10)", color: "#fde68a", fontSize: "11px", lineHeight: 1.45, fontWeight: 800 }}>Ada selisih Goal pending {formatRupiah(pendingGoalAmount)}. Ini biasanya terjadi setelah Owner menaikkan nominal transaksi. Saldo Goal tersedia: {formatRupiah(linkedGoalCashBalance)}.</div>}
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", lineHeight: 1.45 }}>Expense tetap tercatat. Link Goal hanya mengurangi saldo Goal, bukan memotong wallet ulang.</div>
                </div>
                {transactionGoalLinkForm.status && <div style={{ padding: "9px 10px", borderRadius: "12px", background: transactionGoalLinkForm.status.startsWith("✅") ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.10)", color: transactionGoalLinkForm.status.startsWith("✅") ? "#86efac" : "#fbbf24", fontSize: "11px", lineHeight: 1.45, fontWeight: 800 }}>{transactionGoalLinkForm.status}</div>}
                {isOwner && !transactionEditMode && pendingGoalAmount > 0 && (
                  <button onClick={() => settlePendingGoalAmountForTransaction(tx)} style={{ width: "100%", padding: "10px 12px", borderRadius: "13px", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.10)", color: "#86efac", fontWeight: 900, fontSize: "12px" }}>✅ Selesaikan Selisih Goal · Owner</button>
                )}
                {isOwner && !transactionEditMode && (
                  <button onClick={() => unlinkGoalUsageFromTransaction(tx)} style={{ width: "100%", padding: "10px 12px", borderRadius: "13px", border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.10)", color: "#fde68a", fontWeight: 900, fontSize: "12px" }}>↩️ Batalkan Link Goal · Owner</button>
                )}
              </div>
            )}

            {isOwner && !transactionEditMode && tx.type === "expense" && !tx.goalId && !tx.goalUsageId && (
              <div style={{ padding: "14px", borderRadius: "18px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.20)", display: "grid", gap: "9px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Goal Reconciliation · Owner</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.45 }}>Untuk transaksi lama yang sebenarnya bagian dari Goal. Sistem akan mengurangi saldo Goal tanpa memotong wallet ulang.</div>
                </div>
                <select value={transactionGoalLinkForm.goalId} onChange={(e) => setTransactionGoalLinkForm(prev => ({ ...prev, goalId: e.target.value, status: "" }))} style={inputStyle}>
                  <option value="">Pilih Goal yang terkait</option>
                  {goalLinkOptions.map(g => <option key={g.id} value={g.id}>{g._linkScore > 0 ? "⭐ " : "🎯 "}{g.label || g.id} · Saldo {formatFull(calcGoalValue(g.id))}</option>)}
                </select>
                {selectedGoalLink && <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.4 }}>Saldo tunai Goal: {formatRupiah(savingsData[selectedGoalLink.id] || 0)}. Rekonsiliasi tidak membuat expense baru.</div>}
                {transactionGoalLinkForm.status && <div style={{ padding: "9px 10px", borderRadius: "12px", background: transactionGoalLinkForm.status.startsWith("✅") ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.10)", color: transactionGoalLinkForm.status.startsWith("✅") ? "#86efac" : "#fbbf24", fontSize: "11px", lineHeight: 1.45, fontWeight: 800 }}>{transactionGoalLinkForm.status}</div>}
                <button onClick={() => linkExistingTransactionToGoalUsage(tx)} style={{ padding: "12px", borderRadius: "14px", border: "none", background: transactionGoalLinkForm.goalId ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.06)", color: transactionGoalLinkForm.goalId ? "#fff" : "#64748b", fontWeight: 900 }}>🎯 Hubungkan ke Goal</button>
              </div>
            )}

            {isOwner && !transactionEditMode && (
              <button onClick={() => startOwnerTransactionRevision(tx)} style={{ marginTop: "6px", width: "100%", padding: "14px", borderRadius: "16px", border: "1px solid rgba(96,165,250,0.35)", background: "rgba(96,165,250,0.12)", color: "#93c5fd", fontWeight: 900, fontSize: "14px" }}>✏️ Revisi Kesalahan Input · Owner</button>
            )}

            {transactionEditMode && isOwner && (
              <div style={{ marginTop: "6px", padding: "14px", borderRadius: "18px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.22)", display: "grid", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Owner Revision Mode</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>Gunakan hanya untuk koreksi salah input. Perubahan akan update transaksi, ledger wallet, dan Activity Log.</div>
                </div>
                {(tx.goalId || tx.goalUsageId) && (
                  <div style={{ padding: "10px 11px", borderRadius: "14px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.18)", color: "#fde68a", fontSize: "11px", lineHeight: 1.45, fontWeight: 800 }}>
                    🎯 Transaksi ini terhubung ke Goal. Revisi nominal akan disinkronkan ke Goal Usage. Jika ingin ubah menjadi Income, batalkan Link Goal dulu.
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button onClick={() => changeOwnerTransactionType("expense")} style={{ padding: "11px", borderRadius: "14px", border: editType === "expense" ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.08)", background: editType === "expense" ? "rgba(248,113,113,0.16)" : "rgba(255,255,255,0.04)", color: editType === "expense" ? "#fca5a5" : "#e8e8f0", fontWeight: 900 }}>📤 Expense</button>
                  <button onClick={() => changeOwnerTransactionType("income")} style={{ padding: "11px", borderRadius: "14px", border: editType === "income" ? "1px solid #34d399" : "1px solid rgba(255,255,255,0.08)", background: editType === "income" ? "rgba(52,211,153,0.16)" : "rgba(255,255,255,0.04)", color: editType === "income" ? "#86efac" : "#e8e8f0", fontWeight: 900 }}>📥 Income</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>Nominal</div>
                    <input value={transactionEditForm.amount} inputMode="numeric" onChange={(e) => setTransactionEditForm(prev => ({ ...prev, amount: e.target.value.replace(/[^0-9]/g, "") }))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>Tanggal</div>
                    <input type="date" value={transactionEditForm.date} onChange={(e) => setTransactionEditForm(prev => ({ ...prev, date: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>Kategori</div>
                  <select value={transactionEditForm.category} onChange={(e) => setTransactionEditForm(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                    {editCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                  {transactionEditForm.type === "expense" && CHILD_EXPENSE_CATEGORY_IDS.includes(transactionEditForm.category) && <div style={{ fontSize: "10px", color: "#c7d2fe", marginTop: "6px", lineHeight: 1.4 }}>Untuk koreksi biaya anak, pastikan Beneficiary di bawah adalah anak / Anak-anak / Keluarga yang menerima manfaat, bukan selalu user yang menginput.</div>}
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>Untuk / Beneficiary</div>
                  <select value={transactionEditForm.user} onChange={(e) => setTransactionEditForm(prev => ({ ...prev, user: e.target.value }))} style={inputStyle}>
                    {[...new Set([...(activeFamilyMembers || []).map(m => m.name), tx.user, tx.userName, currentUser].filter(Boolean))].map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>Sumber Dana</div>
                  <select value={transactionEditForm.sumberDanaId} onChange={(e) => setTransactionEditForm(prev => ({ ...prev, sumberDanaId: e.target.value }))} style={inputStyle}>
                    <option value="">Pilih sumber dana</option>
                    {editFundingSources.map(sd => <option key={sd.id} value={sd.id}>{sd.icon || "💵"} {sd.name} · {sd.user || "Family"} · {formatFull(calcSumberDanaBalance(sd.id))}</option>)}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>Catatan</div>
                  <input value={transactionEditForm.note} onChange={(e) => setTransactionEditForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Catatan transaksi" style={inputStyle} />
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>Alasan revisi</div>
                  <input value={transactionEditForm.revisionReason} onChange={(e) => setTransactionEditForm(prev => ({ ...prev, revisionReason: e.target.value }))} placeholder="Contoh: salah kategori / salah sumber dana / salah nominal" style={inputStyle} />
                </div>

                {transactionEditStatus && <div style={{ padding: "10px 12px", borderRadius: "13px", background: transactionEditStatus.startsWith("✅") ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.10)", color: transactionEditStatus.startsWith("✅") ? "#86efac" : "#fbbf24", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>{transactionEditStatus}</div>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button onClick={() => { setTransactionEditMode(false); setTransactionEditStatus(""); }} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#e8e8f0", fontWeight: 900 }}>Batal</button>
                  <button onClick={() => saveOwnerTransactionRevision(tx)} style={{ padding: "12px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff", fontWeight: 900 }}>Simpan Revisi</button>
                </div>
              </div>
            )}

            {transactionEditStatus && !transactionEditMode && <div style={{ padding: "10px 12px", borderRadius: "13px", background: transactionEditStatus.startsWith("✅") ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.10)", color: transactionEditStatus.startsWith("✅") ? "#86efac" : "#fbbf24", fontSize: "12px", lineHeight: 1.5, fontWeight: 800 }}>{transactionEditStatus}</div>}

            {canDeleteTransaction(tx) ? (
              <button onClick={async () => { const ok = window.confirm("Hapus transaksi ini? Data masuk Recycle Bin dan bisa direstore."); if (!ok) return; const deleted = await deleteTransaction(tx.id); if (deleted !== false) closeTransactionDetail(); }} style={{ marginTop: "6px", width: "100%", padding: "14px", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.12)", color: "#fca5a5", fontWeight: 900, fontSize: "14px" }}>Hapus Transaksi · Recycle Bin</button>
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
      <div style={{ maxWidth: "430px", width: "100%", margin: "0 auto", minHeight: "100vh", position: "relative", overflowX: "hidden", boxSizing: "border-box", paddingBottom: showMainNav ? "100px" : "0" }}>
        <SettingsCenterModal />
        <ActivityLogModal />
        <LogAuditCenterModal />
        {(() => {
          const hasPopupOpen = showSettingsCenter || showActivityLogModal || showLogAuditCenter || showForm || selectedTransaction || selectedCategory || selectedFamilyLogUser || selectedSD || showSDForm || showWalletTransfer || showSavingsForm || showGoalBuilder || showGoalTemplateManager || showGoalUsage || showAssetConvert || assetToGoalInvestment || showUserSelect;
          const closeCurrentPopup = () => {
            if (selectedTransaction) { setSelectedTransaction(null); return; }
            if (selectedFamilyLogUser) { setSelectedFamilyLogUser(null); return; }
            setShowSettingsCenter(false);
            setShowActivityLogModal(false);
            setShowLogAuditCenter(false);
            setShowForm(false);
            setSelectedTransaction(null);
            setSelectedCategory(null);
            setSelectedFamilyLogUser(null);
            setSelectedSD(null);
            setShowSDForm(false);
            setShowWalletTransfer(false);
            setShowSavingsForm(null);
            setShowGoalBuilder(false);
            setShowGoalTemplateManager(false);
            setShowGoalUsage(null);
            setShowAssetConvert(null);
            setSelectedInvestment(null);
            setInvestmentEditMode(false);
            setAssetToGoalInvestment(null);
            setShowUserSelect(false);
          };
          return hasPopupOpen ? (
            <div style={{ position: "fixed", left: "50%", bottom: "14px", transform: "translateX(-50%)", zIndex: 100001, width: "calc(100% - 32px)", maxWidth: "398px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", pointerEvents: "auto" }}>
              <button onClick={closeCurrentPopup} style={{ padding: "12px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(15,23,42,0.92)", color: "#e5e7eb", fontSize: "12px", fontWeight: 900, boxShadow: "0 12px 35px rgba(0,0,0,0.45)" }}>← Back</button>
              <button onClick={() => { closeCurrentPopup(); setActiveTab("dashboard"); }} style={{ padding: "12px", borderRadius: "16px", border: "1px solid rgba(99,102,241,0.32)", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "12px", fontWeight: 900, boxShadow: "0 12px 35px rgba(0,0,0,0.45)" }}>🏠 Home</button>
            </div>
          ) : null;
        })()}

        {showPeriodPicker && (
          <div onClick={() => setShowPeriodPicker(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 100000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "22px 22px 16px 16px", padding: "18px", color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Filter Bulan</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, marginTop: "3px" }}>Pilih Bulan & Tahun</div>
                </div>
                <button onClick={() => setShowPeriodPicker(false)} style={{ width: "38px", height: "38px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "18px", fontWeight: 900 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <select value={periodBaseDate.getMonth()} onChange={(e) => { const d = parseLocalDateString(selectedDate); d.setMonth(Number(e.target.value)); setSelectedDate(toLocalDateInput(d)); setFilterMonth(d.getMonth()); setDateRangeMode("month"); }} style={inputStyle}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={periodBaseDate.getFullYear()} onChange={(e) => { const d = parseLocalDateString(selectedDate); d.setFullYear(Number(e.target.value)); setSelectedDate(toLocalDateInput(d)); setFilterMonth(d.getMonth()); setDateRangeMode("month"); }} style={inputStyle}>
                  {periodYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {canSwitchScope && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 900, marginBottom: "8px" }}>Scope</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "8px" }}>
                    {scopeOptions.map(u => {
                      const active = filterUser === u || (!canViewAllTransactions && u === currentUser);
                      return <button key={u} onClick={() => setFilterUser(u)} style={{ padding: "10px", borderRadius: "13px", border: "1px solid " + (active ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)"), background: active ? "rgba(16,185,129,0.16)" : "rgba(255,255,255,0.05)", color: active ? "#86efac" : "#cbd5e1", fontSize: "11px", fontWeight: 900 }}>{u === "semua" ? "👨‍👩‍👧‍👦 Family/Semua" : "👤 " + u}</button>;
                    })}
                  </div>
                </div>
              )}
              <button onClick={() => setShowPeriodPicker(false)} style={{ width: "100%", padding: "13px", borderRadius: "15px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "13px", fontWeight: 900 }}>Terapkan: {rangeLabel} · {selectedScopeLabel}</button>
            </div>
          </div>
        )}

        {selectedInvestmentSummary && (() => {
          const inv = selectedInvestmentSummary;
          const at = ASSET_TYPES.find(a => a.id === inv.assetType) || { icon: "💰", label: inv.assetType || "Aset", unit: "unit" };
          const costBasis = Number(inv.costBasis ?? (["idr","obligasi"].includes(inv.assetType) ? (inv.idrValue || 0) : (inv.qty || inv.amount || 0) * (inv.buyPrice || 0)));
          const currentValue = inv.currentValue ?? calcAssetValue(inv, marketPrices);
          const profitLoss = currentValue - costBasis;
          const walletLogs = sumberDanaLedger.filter(l => l.refType === "investment" && l.refId === inv.id).map(l => ({
            id: "wallet-" + l.id,
            createdAt: l.createdAt,
            action: "wallet_ledger",
            detail: (l.amount < 0 ? "Wallet keluar " : "Wallet masuk ") + formatRupiah(Math.abs(l.amount || 0)) + " · " + (l.note || "Ledger investasi"),
          }));
          const directLogs = investmentLogs.filter(l => l.investmentId === inv.id);
          const baseLog = {
            id: "base-" + inv.id,
            createdAt: inv.createdAt || inv.buyDate || "",
            action: inv.sourceMode === "existing" ? "existing_asset_onboarded" : "investment_buy",
            detail: inv.sourceMode === "existing"
              ? "Aset sudah dimiliki dicatat. Wallet tidak berubah."
              : "Aset dibeli dari wallet. Ledger wallet dicatat jika sumber dana dipilih.",
          };
          const mergedLogs = [baseLog, ...directLogs, ...walletLogs]
            .filter(Boolean)
            .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

          return (
            <div onClick={() => { setSelectedInvestment(null); setInvestmentEditMode(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 100000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "18px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)", paddingBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Asset Detail</div>
                    <div style={{ fontSize: "22px", color: "#fff", fontWeight: 900, marginTop: "4px" }}>{at.icon} {inv.ticker || at.label}</div>
                    <div style={{ fontSize: "11px", color: inv.sourceMode === "existing" ? "#fbbf24" : "#86efac", marginTop: "5px", fontWeight: 800 }}>{inv.sourceMode === "existing" ? "Aset sudah dimiliki · wallet tidak berubah" : "Dibeli dari wallet"}</div>
                  </div>
                  <button onClick={() => { setSelectedInvestment(null); setInvestmentEditMode(false); }} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer" }}>×</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ padding: "11px", borderRadius: "15px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Nilai Sekarang</div>
                    <div style={{ fontSize: "16px", fontWeight: 900, color: "#fff" }}>{formatRupiah(currentValue)}</div>
                  </div>
                  <div style={{ padding: "11px", borderRadius: "15px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Untung/Rugi</div>
                    <div style={{ fontSize: "16px", fontWeight: 900, color: profitLoss >= 0 ? "#34d399" : "#f87171" }}>{profitLoss >= 0 ? "+" : ""}{formatRupiah(profitLoss)}</div>
                  </div>
                </div>

                {!investmentEditMode ? (
                  <>
                    <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "12px", display: "grid", gap: "7px", fontSize: "12px", color: "#cbd5e1" }}>
                      <div><b>Jumlah:</b> {inv.qty ?? inv.amount} {at.unit}</div>
                      <div><b>Modal/Nilai perolehan:</b> {formatRupiah(costBasis)}</div>
                      <div><b>Tanggal:</b> {inv.buyDate || String(inv.createdAt || "").slice(0, 10) || "-"}</div>
                      <div><b>Harga manual/unit:</b> {inv.manualPrice ? formatRupiah(inv.manualPrice) : "Tidak ada"}</div>
                      {inv.note && <div><b>Catatan:</b> {inv.note}</div>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: canManageInvestments ? "1fr 1fr" : "1fr", gap: "8px", marginBottom: "12px" }}>
                      {canManageInvestments && <button onClick={() => setInvestmentEditMode(true)} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(99,102,241,0.28)", background: "rgba(99,102,241,0.14)", color: "#c7d2fe", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>✏️ Edit Aset</button>}
                      {canManageInvestments && <button onClick={() => openMoveAssetToGoal(inv)} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(16,185,129,0.28)", background: "rgba(16,185,129,0.12)", color: "#86efac", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>🎯 Pindah ke Goal</button>}
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900, marginBottom: "8px" }}>🧾 Asset Log</div>
                      <div style={{ display: "grid", gap: "7px" }}>
                        {mergedLogs.slice(0, 8).map(log => (
                          <div key={log.id} style={{ padding: "9px 10px", borderRadius: "13px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "3px" }}>
                              <div style={{ fontSize: "10px", color: "#a5b4fc", fontWeight: 900 }}>{log.action || "log"}</div>
                              <div style={{ fontSize: "10px", color: "#64748b" }}>{String(log.createdAt || "").slice(0, 10) || "-"}</div>
                            </div>
                            <div style={{ fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{log.detail || "-"}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {canManageInvestments && <button onClick={async () => { const ok = window.confirm("Hapus aset ini? Data masuk Recycle Bin. Wallet tidak otomatis berubah."); if (!ok) return; await deleteInvestment(inv.id); }} style={{ width: "100%", padding: "12px", borderRadius: "14px", border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.10)", color: "#fca5a5", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>Hapus Aset · Recycle Bin</button>}
                  </>
                ) : (
                  <div style={{ display: "grid", gap: "9px" }}>
                    <select value={investmentEditForm.assetType} onChange={(e) => setInvestmentEditForm(prev => ({ ...prev, assetType: e.target.value }))} style={inputStyle}>
                      {ASSET_TYPES.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
                    </select>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <input value={investmentEditForm.qty} inputMode="decimal" onChange={(e) => setInvestmentEditForm(prev => ({ ...prev, qty: e.target.value.replace(/[^0-9.,]/g, "") }))} placeholder="Jumlah/qty" style={inputStyle} />
                      <input value={investmentEditForm.costBasis} inputMode="numeric" onChange={(e) => setInvestmentEditForm(prev => ({ ...prev, costBasis: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Modal/nilai perolehan total" style={inputStyle} />
                    </div>
                    <input value={investmentEditForm.ticker} onChange={(e) => setInvestmentEditForm(prev => ({ ...prev, ticker: e.target.value }))} placeholder="Nama/ticker aset" style={inputStyle} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <input value={investmentEditForm.manualPrice} inputMode="numeric" onChange={(e) => setInvestmentEditForm(prev => ({ ...prev, manualPrice: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Harga manual/unit opsional" style={inputStyle} />
                      <input type="date" value={investmentEditForm.buyDate} onChange={(e) => setInvestmentEditForm(prev => ({ ...prev, buyDate: e.target.value }))} style={inputStyle} />
                    </div>
                    <input value={investmentEditForm.note} onChange={(e) => setInvestmentEditForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Catatan" style={inputStyle} />
                    <div style={{ padding: "10px", borderRadius: "13px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)", color: "#fbbf24", fontSize: "11px", lineHeight: 1.45 }}>
                      Edit aset adalah koreksi portfolio. Wallet tidak otomatis berubah agar riwayat kas tetap aman.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button onClick={() => setInvestmentEditMode(false)} style={{ padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>Batal</button>
                      <button onClick={updateInvestmentAsset} style={{ padding: "12px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>Simpan</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {selectedFamilyLogUser && (() => {
          const member = activeFamilyMembers.find(m => m.name === selectedFamilyLogUser) || { name: selectedFamilyLogUser || "Tanpa User", avatar: "👤" };
          const rows = familyLogPeriodTxns.filter(t => (t.user || t.userName || "Tanpa User") === selectedFamilyLogUser).sort((a,b) => String(b.date || b.createdAt || "").localeCompare(String(a.date || a.createdAt || "")));
          const income = rows.filter(t => t.type === "income").reduce((s,t) => s + Number(t.amount || 0), 0);
          const expense = rows.filter(t => t.type === "expense").reduce((s,t) => s + Number(t.amount || 0), 0);
          const netFlow = income - expense;
          return (
            <div onClick={() => setSelectedFamilyLogUser(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 100000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto", overflowX: "hidden", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "18px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Family Log Detail</div>
                    <div style={{ fontSize: "22px", color: "#fff", fontWeight: 900, marginTop: "4px", overflowWrap: "anywhere" }}>{member.avatar || "👤"} {member.name || "Tanpa User"}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>{rangeLabel} · {rows.length} transaksi</div>
                  </div>
                  <button onClick={() => setSelectedFamilyLogUser(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>×</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ padding: "11px", borderRadius: "15px", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.18)", minWidth: 0 }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Total Income Periode</div>
                    <div style={{ fontSize: "15px", fontWeight: 900, color: "#86efac", overflowWrap: "anywhere" }}>+{formatRupiah(income)}</div>
                  </div>
                  <div style={{ padding: "11px", borderRadius: "15px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.18)", minWidth: 0 }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Total Expense Periode</div>
                    <div style={{ fontSize: "15px", fontWeight: 900, color: "#fca5a5", overflowWrap: "anywhere" }}>-{formatRupiah(expense)}</div>
                  </div>
                  <div style={{ padding: "11px", borderRadius: "15px", background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)", minWidth: 0 }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Net Flow Periode</div>
                    <div style={{ fontSize: "15px", fontWeight: 900, color: netFlow >= 0 ? "#86efac" : "#fca5a5", overflowWrap: "anywhere" }}>{netFlow >= 0 ? "+" : "-"}{formatRupiah(Math.abs(netFlow))}</div>
                  </div>
                </div>

                {rows.length === 0 ? (
                  <div style={{ padding: "20px", borderRadius: "18px", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.14)", color: "#94a3b8", fontSize: "12px", textAlign: "center", lineHeight: 1.6 }}>
                    <div style={{ fontSize: "24px", marginBottom: "6px" }}>🧾</div>
                    Belum ada transaksi untuk user ini pada periode {rangeLabel}. Family Log akan terisi otomatis setelah transaksi dibuat.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {rows.map(tx => {
                      const cat = getCategoryInfo(tx.category, tx);
                      const sign = tx.type === "income" ? "+" : "-";
                      const color = tx.type === "income" ? "#86efac" : "#fca5a5";
                      const txDate = tx.date || String(tx.createdAt || "").slice(0,10) || "Tanpa Tanggal";
                      const txSource = tx.sumberDanaName || tx.sumberDanaId || tx.sourceFund || "Tanpa Sumber Dana";
                      const txNote = tx.note || tx.notes || "Tidak ada catatan";
                      return (
                        <button key={tx.id || `${txDate}-${tx.amount}-${txNote}`} onClick={() => setSelectedTransaction(tx)} style={{ width: "100%", textAlign: "left", padding: "12px", borderRadius: "14px", background: "rgba(15,23,42,0.52)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", boxSizing: "border-box" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900, overflowWrap: "anywhere" }}>{cat.icon || "🧾"} {cat.label || "Tanpa Kategori"}</div>
                              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px", overflowWrap: "anywhere" }}>{txDate} · {txSource}</div>
                              <div style={{ fontSize: "10px", color: tx.note || tx.notes ? "#94a3b8" : "#64748b", marginTop: "4px", lineHeight: 1.35, overflowWrap: "anywhere" }}>{txNote}</div>
                            </div>
                            <div style={{ flexShrink: 0, textAlign: "right", fontSize: "12px", color, fontWeight: 900, minWidth: "84px" }}>{sign}{formatRupiah(tx.amount || 0)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button onClick={() => setSelectedFamilyLogUser(null)} style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>← Kembali ke Transaksi</button>
              </div>
            </div>
          );
        })()}

        <div style={{ padding: "18px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50, background: "linear-gradient(180deg,rgba(10,10,15,0.96),rgba(10,10,15,0.82),rgba(10,10,15,0))", backdropFilter: "blur(10px)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "9px", letterSpacing: "2.4px", color: "#818cf8", fontWeight: 900, textTransform: "uppercase", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{APP_VERSION}</div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Halo, {currentUser}! {currentUser === ADMIN_USER ? "\uD83D\uDC51" : "\uD83D\uDC4B"}</div>
          </div>
          <div style={{ display: "flex", gap: "7px", flexShrink: 0 }}>
            <button aria-label="Settings" onClick={() => setShowSettingsCenter(true)} style={{ width: "40px", height: "40px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8e8f0", borderRadius: "14px", padding: 0, fontSize: "14px", cursor: "pointer", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>⚙️</button>
            <button aria-label="Lock" onClick={lockApp} style={{ width: "40px", height: "40px", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.22)", color: "#fca5a5", borderRadius: "14px", padding: 0, fontSize: "14px", cursor: "pointer", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>🔐</button>
          </div>
        </div>

        {showMainNav && (
          <div style={{ position: "fixed", left: "50%", bottom: "12px", transform: "translateX(-50%)", width: "calc(100% - 28px)", maxWidth: "402px", padding: "7px", borderRadius: "24px", background: "rgba(15,15,28,0.94)", border: "1px solid rgba(255,255,255,0.10)", display: "flex", gap: "4px", zIndex: 99950, boxShadow: "0 -14px 44px rgba(0,0,0,0.44)", backdropFilter: "blur(16px)", boxSizing: "border-box" }}>
            {hasPermission("dashboard") && <button style={tabStyle("dashboard")} onClick={() => setActiveTab("dashboard")}><span style={{ fontSize: "16px", lineHeight: 1 }}>🏠</span><span>Home</span></button>}
            {hasPermission("history") && <button style={tabStyle("history")} onClick={() => setActiveTab("history")}><span style={{ fontSize: "16px", lineHeight: 1 }}>🧾</span><span>Transaksi</span></button>}
            {canViewGoals && <button style={tabStyle("savings")} onClick={() => setActiveTab("savings")}><span style={{ fontSize: "16px", lineHeight: 1 }}>🎯</span><span>Goals</span></button>}
            {canAccessWallets && <button style={tabStyle("dompet")} onClick={openWalletManager}><span style={{ fontSize: "16px", lineHeight: 1 }}>💼</span><span>Finance</span></button>}
            {canViewInvestments && <button style={tabStyle("invest")} onClick={() => setActiveTab("invest")}><span style={{ fontSize: "16px", lineHeight: 1 }}>📈</span><span>Portfolio</span></button>}
          </div>
        )}

        {showTimeFilters && (
          <div style={{ padding: "0 20px 6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "14px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase" }}>Filter Periode</div>
                <div style={{ fontSize: "12px", color: "#e5e7eb", fontWeight: 900, marginTop: "2px" }}>{rangeLabel} · {selectedScopeLabel}</div>
              </div>
              <button onClick={() => setShowPeriodPicker(true)} style={{ padding: "7px 10px", borderRadius: "11px", border: "1px solid rgba(99,102,241,0.26)", background: "rgba(99,102,241,0.12)", color: "#c7d2fe", fontSize: "10px", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>Ganti</button>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)", borderRadius: "20px", padding: "22px", boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "rgba(255,255,255,0.7)", marginBottom: "6px", textTransform: "uppercase" }}>Saldo {effectiveFilterUser === "semua" ? "Keluarga" : effectiveFilterUser}</div>
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

            {canViewFinancialSummary ? (
            <div style={{ marginTop: "12px", padding: "16px", borderRadius: "20px", background: "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.72))", border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 18px 50px rgba(0,0,0,0.28)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Financial Engine · Phase 7.1.5</div>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#fff", marginTop: "4px" }}>Net Worth Console</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{financialScopeUser ? "Scope user: " + financialScopeUser : "Scope keluarga"} · Wallet + Goals + Investasi - Pinjaman · Predictive Action Priority Engine 7.1.5</div>
                </div>
                <div style={{ padding: "8px 10px", borderRadius: "14px", background: financialHealthEngine.healthBg, color: financialHealthEngine.healthColor, fontSize: "11px", fontWeight: 900, whiteSpace: "nowrap" }}>
                  {financialHealthEngine.healthScore}/100 · {financialHealthEngine.healthLabel}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div style={{ padding: "12px", borderRadius: "15px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800 }}>Total Wallet</div>
                  <div style={{ fontSize: "15px", color: financialWalletTotal >= 0 ? "#86efac" : "#fca5a5", fontWeight: 900, marginTop: "4px" }}>{formatFull(financialWalletTotal)}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "15px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800 }}>Pinjaman Aktif</div>
                  <div style={{ fontSize: "15px", color: financialLoanTotal > 0 ? "#fca5a5" : "#86efac", fontWeight: 900, marginTop: "4px" }}>{formatFull(financialLoanTotal)}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "15px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800 }}>Goal Funded</div>
                  <div style={{ fontSize: "15px", color: "#c7d2fe", fontWeight: 900, marginTop: "4px" }}>{financialScopeUser ? "Family" : formatFull(financialGoalTotal)}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "15px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800 }}>Investasi Aktif</div>
                  <div style={{ fontSize: "15px", color: "#34d399", fontWeight: 900, marginTop: "4px" }}>{formatFull(financialInvestmentTotal)}</div>
                </div>
              </div>

              <div style={{ padding: "13px", borderRadius: "16px", background: financialNetWorth >= 0 ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)", border: financialNetWorth >= 0 ? "1px solid rgba(16,185,129,0.20)" : "1px solid rgba(239,68,68,0.20)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 900 }}>Net Position</div>
                    <div style={{ fontSize: "20px", color: financialNetWorth >= 0 ? "#86efac" : "#fca5a5", fontWeight: 900 }}>{formatFull(financialNetWorth)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800 }}>Debt Ratio</div>
                    <div style={{ fontSize: "14px", color: financialDebtRatio > 35 ? "#fca5a5" : "#c7d2fe", fontWeight: 900 }}>{financialDebtRatio.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ marginTop: "9px", fontSize: "11px", color: financialEngineIssues.length > 0 ? "#fde68a" : "#86efac", lineHeight: 1.45 }}>🛡️ {financialEngineGuardLabel}</div>
                <div style={{ marginTop: "7px", padding: "8px 10px", borderRadius: "12px", background: financialHealthEngine.ok ? "rgba(16,185,129,0.10)" : "rgba(99,102,241,0.10)", border: financialHealthEngine.ok ? "1px solid rgba(16,185,129,0.18)" : "1px solid rgba(99,102,241,0.20)", fontSize: "11px", color: financialHealthEngine.healthColor, lineHeight: 1.45 }}>📌 {financialHealthEngine.healthNotice}</div>
                <div style={{ marginTop: "7px", fontSize: "10px", color: "#94a3b8", lineHeight: 1.45 }}>Health Engine 7.0.0: {financialHealthEngine.componentRows.slice(0, 4).map(row => `${row.label} ${row.score}`).join(" · ")} · Prioritas: {financialHealthEngine.primaryAction}</div>
                <div style={{ marginTop: "9px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "7px" }}>
                  <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 800 }}>Target Income Inti</div>
                    <div style={{ marginTop: "3px", fontSize: "12px", color: financialHealthDecisionEngine.incomeShortfall > 0 ? "#fde68a" : "#86efac", fontWeight: 900 }}>{formatRupiah(financialHealthDecisionEngine.coreIncomeTarget)}</div>
                    <div style={{ marginTop: "2px", fontSize: "9px", color: "#64748b" }}>{financialHealthDecisionEngine.incomeShortfall > 0 ? `Kurang ${formatRupiah(financialHealthDecisionEngine.incomeShortfall)}` : `Surplus ${formatRupiah(financialHealthDecisionEngine.incomeSurplus)}`}</div>
                  </div>
                  <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 800 }}>Income / Hari</div>
                    <div style={{ marginTop: "3px", fontSize: "12px", color: "#c7d2fe", fontWeight: 900 }}>{formatRupiah(financialHealthDecisionEngine.dailyIncomeTarget)}</div>
                    <div style={{ marginTop: "2px", fontSize: "9px", color: "#64748b" }}>{financialHealthDecisionEngine.remainingDays} hari tersisa</div>
                  </div>
                  <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 800 }}>Belanja Aman / Hari</div>
                    <div style={{ marginTop: "3px", fontSize: "12px", color: financialHealthDecisionEngine.safeSpendingDaily > 0 ? "#86efac" : "#fca5a5", fontWeight: 900 }}>{formatRupiah(financialHealthDecisionEngine.safeSpendingDaily)}</div>
                    <div style={{ marginTop: "2px", fontSize: "9px", color: "#64748b" }}>Goal wajib {financialHealthDecisionEngine.mandatoryCoverage.toFixed(0)}%</div>
                  </div>
                </div>
                <div style={{ marginTop: "7px", padding: "8px 10px", borderRadius: "12px", background: financialHealthDecisionEngine.decisionBg, border: "1px solid rgba(255,255,255,0.07)", color: financialHealthDecisionEngine.decisionColor, fontSize: "10px", lineHeight: 1.45 }}><b>{financialHealthDecisionEngine.decisionStatus}</b> · {financialHealthDecisionEngine.primaryRecommendation}</div>

                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveHealthEngine.predictiveBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveHealthEngine.predictiveColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Action Engine 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveHealthEngine.projectionNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveHealthEngine.predictiveColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveHealthEngine.predictiveScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "7px" }}>
                    <div style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: "8px", color: "#94a3b8", fontWeight: 800 }}>Forecast 30D</div>
                      <div style={{ marginTop: "3px", fontSize: "11px", color: financialPredictiveHealthEngine.forecastRows?.[0]?.expected >= 0 ? "#86efac" : "#fca5a5", fontWeight: 900 }}>{formatRupiah(financialPredictiveHealthEngine.forecastRows?.[0]?.expected || 0)}</div>
                      <div style={{ marginTop: "2px", fontSize: "8px", color: "#64748b" }}>Risk {financialPredictiveHealthEngine.forecastRows?.[0]?.risk || "-"}</div>
                    </div>
                    <div style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: "8px", color: "#94a3b8", fontWeight: 800 }}>Runway</div>
                      <div style={{ marginTop: "3px", fontSize: "11px", color: financialPredictiveHealthEngine.runwayDays >= 60 ? "#86efac" : financialPredictiveHealthEngine.runwayDays >= 30 ? "#fde68a" : "#fca5a5", fontWeight: 900 }}>{financialPredictiveHealthEngine.runwayDays >= 999 ? "180+" : financialPredictiveHealthEngine.runwayDays} hari</div>
                      <div style={{ marginTop: "2px", fontSize: "8px", color: "#64748b" }}>{financialPredictiveHealthEngine.runwayLabel}</div>
                    </div>
                    <div style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: "8px", color: "#94a3b8", fontWeight: 800 }}>Cashflow Trend</div>
                      <div style={{ marginTop: "3px", fontSize: "11px", color: financialPredictiveHealthEngine.trendColor, fontWeight: 900 }}>{financialPredictiveHealthEngine.trendLabel}</div>
                      <div style={{ marginTop: "2px", fontSize: "8px", color: "#64748b" }}>{financialPredictiveHealthEngine.transactionWindowCount} data 90D</div>
                    </div>
                  </div>
                  {financialPredictiveHealthEngine.recoveryRequired && <div style={{ marginTop: "8px", padding: "8px 10px", borderRadius: "12px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.18)", color: "#fecaca", fontSize: "10px", lineHeight: 1.45 }}><b>{financialPredictiveHealthEngine.recoveryStage}</b> · {financialPredictiveHealthEngine.recoveryNotice}</div>}
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveActionEngine.actionBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveActionEngine.actionColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Action Priority 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveActionEngine.actionNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveActionEngine.actionColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveActionEngine.blockerCount} lock</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveActionEngine.actionRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right" }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.priority}</div>
                            <div style={{ marginTop: "2px", fontSize: "8px", color: "#64748b" }}>{row.horizon}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {financialPredictiveActionEngine.monthlyActionTarget > 0 && <div style={{ marginTop: "8px", fontSize: "10px", color: financialPredictiveActionEngine.actionColor, lineHeight: 1.45 }}>Target aksi: {formatRupiah(financialPredictiveActionEngine.monthlyActionTarget)}/bulan atau {formatRupiah(financialPredictiveActionEngine.dailyActionTarget)}/hari.</div>}
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveExecutionEngine.executionBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveExecutionEngine.executionColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Execution Control 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveExecutionEngine.executionNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveExecutionEngine.executionColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveExecutionEngine.executionScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveExecutionEngine.executionRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.target > 0 ? formatRupiah(row.target) : "-"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "10px", color: financialPredictiveExecutionEngine.executionColor, lineHeight: 1.45 }}>Hard stop: {financialPredictiveExecutionEngine.forbiddenActions.slice(0, 2).join(" · ")}</div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveCommandBriefEngine.commandBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveCommandBriefEngine.commandColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Command Brief 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveCommandBriefEngine.commandNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveCommandBriefEngine.commandColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveCommandBriefEngine.commandScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveCommandBriefEngine.commandRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "10px", color: financialPredictiveCommandBriefEngine.commandColor, lineHeight: 1.45 }}>Command lock: {financialPredictiveCommandBriefEngine.commandLocks.slice(0, 2).join(" · ")}</div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveDecisionGateEngine.gateBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveDecisionGateEngine.gateColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Decision Gate 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveDecisionGateEngine.gateNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveDecisionGateEngine.gateColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveDecisionGateEngine.gateDecision}</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveDecisionGateEngine.gateRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "10px", color: financialPredictiveDecisionGateEngine.gateColor, lineHeight: 1.45 }}>Gate lock: {financialPredictiveDecisionGateEngine.gateLocks.slice(0, 2).join(" · ")}</div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveGovernancePolicyEngine.policyBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveGovernancePolicyEngine.policyColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Governance Policy 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveGovernancePolicyEngine.governanceNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveGovernancePolicyEngine.policyColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveGovernancePolicyEngine.policyStatus}</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveGovernancePolicyEngine.governanceRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: "#86efac", lineHeight: 1.45 }}>Allowed: {financialPredictiveGovernancePolicyEngine.allowedMoves.slice(0, 2).join(" · ")}</div>
                    <div style={{ fontSize: "10px", color: financialPredictiveGovernancePolicyEngine.policyColor, lineHeight: 1.45 }}>Blocked: {financialPredictiveGovernancePolicyEngine.blockedMoves.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>

                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveGovernanceComplianceEngine.complianceBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveGovernanceComplianceEngine.complianceColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Governance Compliance 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveGovernanceComplianceEngine.complianceNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveGovernanceComplianceEngine.complianceColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveGovernanceComplianceEngine.complianceStatus}</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveGovernanceComplianceEngine.complianceRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveGovernanceComplianceEngine.complianceColor, lineHeight: 1.45 }}>Correction: {financialPredictiveGovernanceComplianceEngine.primaryCorrection}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Compliance lock: {financialPredictiveGovernanceComplianceEngine.complianceLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>

                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveCfoAdvisoryEngine.advisoryBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveCfoAdvisoryEngine.advisoryColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive CFO Advisory 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveCfoAdvisoryEngine.advisoryNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveCfoAdvisoryEngine.advisoryColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveCfoAdvisoryEngine.advisoryScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveCfoAdvisoryEngine.cfoRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveCfoAdvisoryEngine.advisoryColor, lineHeight: 1.45 }}>Memo: {financialPredictiveCfoAdvisoryEngine.cfoMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Do not: {financialPredictiveCfoAdvisoryEngine.doNot.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveOperatingRhythmEngine.rhythmBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveOperatingRhythmEngine.rhythmColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Operating Rhythm 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveOperatingRhythmEngine.rhythmNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveOperatingRhythmEngine.rhythmColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveOperatingRhythmEngine.rhythmScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveOperatingRhythmEngine.rhythmRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveOperatingRhythmEngine.rhythmColor, lineHeight: 1.45 }}>Cadence: {financialPredictiveOperatingRhythmEngine.operatingCadence}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Review lock: {financialPredictiveOperatingRhythmEngine.reviewLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictivePhaseClosureEngine.closureBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictivePhaseClosureEngine.closureColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Phase Closure 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictivePhaseClosureEngine.closureNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictivePhaseClosureEngine.closureColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictivePhaseClosureEngine.closureScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictivePhaseClosureEngine.closureRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictivePhaseClosureEngine.closureColor, lineHeight: 1.45 }}>Memo: {financialPredictivePhaseClosureEngine.phaseClosureMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Closure lock: {financialPredictivePhaseClosureEngine.closureLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveScenarioSimulationEngine.scenarioBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveScenarioSimulationEngine.scenarioColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Scenario Simulation 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveScenarioSimulationEngine.scenarioNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveScenarioSimulationEngine.scenarioColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveScenarioSimulationEngine.scenarioScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveScenarioSimulationEngine.scenarioRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)", opacity: row.locked ? 0.72 : 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.value}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveScenarioSimulationEngine.scenarioColor, lineHeight: 1.45 }}>Memo: {financialPredictiveScenarioSimulationEngine.scenarioMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Scenario lock: {financialPredictiveScenarioSimulationEngine.simulationLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveScenarioStressTestEngine.stressBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveScenarioStressTestEngine.stressColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Scenario Stress Test 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveScenarioStressTestEngine.stressNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveScenarioStressTestEngine.stressColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveScenarioStressTestEngine.stressScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveScenarioStressTestEngine.stressRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveScenarioStressTestEngine.stressColor, lineHeight: 1.45 }}>Memo: {financialPredictiveScenarioStressTestEngine.stressMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Stress lock: {financialPredictiveScenarioStressTestEngine.stressLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveScenarioCashflowProjectionEngine.projectionBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveScenarioCashflowProjectionEngine.projectionColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Scenario Cashflow Projection 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveScenarioCashflowProjectionEngine.projectionNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveScenarioCashflowProjectionEngine.projectionColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveScenarioCashflowProjectionEngine.projectionScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveScenarioCashflowProjectionEngine.projectionRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveScenarioCashflowProjectionEngine.projectionColor, lineHeight: 1.45 }}>Memo: {financialPredictiveScenarioCashflowProjectionEngine.projectionMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Projection lock: {financialPredictiveScenarioCashflowProjectionEngine.projectionLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>
                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Scenario Goal Feasibility 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityRows.slice(0, 3).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label} · {row.priority}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityColor, lineHeight: 1.45 }}>Memo: {financialPredictiveScenarioGoalFeasibilityEngine.goalFeasibilityMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Goal lock: {financialPredictiveScenarioGoalFeasibilityEngine.feasibilityLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>

                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveScenarioDecisionRecommendationEngine.decisionBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveScenarioDecisionRecommendationEngine.decisionColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Scenario Decision Recommendation 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveScenarioDecisionRecommendationEngine.decisionNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveScenarioDecisionRecommendationEngine.decisionColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveScenarioDecisionRecommendationEngine.decisionScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveScenarioDecisionRecommendationEngine.recommendationRows.slice(0, 4).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveScenarioDecisionRecommendationEngine.decisionColor, lineHeight: 1.45 }}>Memo: {financialPredictiveScenarioDecisionRecommendationEngine.decisionMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Decision lock: {financialPredictiveScenarioDecisionRecommendationEngine.decisionLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>

                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveScenarioClosureEngine.scenarioClosureBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveScenarioClosureEngine.scenarioClosureColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Scenario Closure 7.1.5</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveScenarioClosureEngine.scenarioClosureNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveScenarioClosureEngine.scenarioClosureColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveScenarioClosureEngine.scenarioClosureScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveScenarioClosureEngine.closureRows.slice(0, 4).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveScenarioClosureEngine.scenarioClosureColor, lineHeight: 1.45 }}>Memo: {financialPredictiveScenarioClosureEngine.scenarioClosureMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Scenario closure: {financialPredictiveScenarioClosureEngine.scenarioClosureLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>

                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveAllocationPlanningEngine.allocationBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveAllocationPlanningEngine.allocationColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Allocation Planning 7.2.0</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveAllocationPlanningEngine.allocationNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveAllocationPlanningEngine.allocationColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveAllocationPlanningEngine.allocationScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveAllocationPlanningEngine.allocationRows.slice(0, 5).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveAllocationPlanningEngine.allocationColor, lineHeight: 1.45 }}>Memo: {financialPredictiveAllocationPlanningEngine.allocationMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Allocation lock: {financialPredictiveAllocationPlanningEngine.allocationLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>


                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveAllocationGuardrailEngine.guardrailBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveAllocationGuardrailEngine.guardrailColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Allocation Guardrail 7.2.1</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveAllocationGuardrailEngine.guardrailNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveAllocationGuardrailEngine.guardrailColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveAllocationGuardrailEngine.guardrailScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveAllocationGuardrailEngine.guardrailRows.slice(0, 5).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveAllocationGuardrailEngine.guardrailColor, lineHeight: 1.45 }}>Memo: {financialPredictiveAllocationGuardrailEngine.guardrailMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Guardrail lock: {financialPredictiveAllocationGuardrailEngine.guardrailLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>

                <div style={{ marginTop: "9px", padding: "10px", borderRadius: "14px", background: financialPredictiveAllocationExecutionEngine.executionBg, border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.6px", color: financialPredictiveAllocationExecutionEngine.executionColor, fontWeight: 900, textTransform: "uppercase" }}>Predictive Allocation Execution 7.2.2</div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.45 }}>{financialPredictiveAllocationExecutionEngine.executionNotice}</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: "rgba(15,23,42,0.42)", color: financialPredictiveAllocationExecutionEngine.executionColor, fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{financialPredictiveAllocationExecutionEngine.executionScore}/100</div>
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                    {financialPredictiveAllocationExecutionEngine.executionRows.slice(0, 5).map(row => (
                      <div key={row.key} style={{ padding: "8px", borderRadius: "11px", background: "rgba(15,23,42,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "10px", color: row.color, fontWeight: 900 }}>{row.label}</div>
                            <div style={{ marginTop: "2px", fontSize: "9px", color: "#94a3b8", lineHeight: 1.35 }}>{row.action}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: "9px", color: row.color, fontWeight: 900 }}>{row.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "8px", display: "grid", gap: "5px" }}>
                    <div style={{ fontSize: "10px", color: financialPredictiveAllocationExecutionEngine.executionColor, lineHeight: 1.45 }}>Memo: {financialPredictiveAllocationExecutionEngine.executionMemo}</div>
                    <div style={{ fontSize: "10px", color: "#c7d2fe", lineHeight: 1.45 }}>Execution lock: {financialPredictiveAllocationExecutionEngine.executionLocks.slice(0, 2).join(" · ")}</div>
                  </div>
                </div>


                {financialWalletTotal < 0 && <div style={{ marginTop: "9px", fontSize: "11px", color: "#fecaca", lineHeight: 1.45 }}>⚠️ Wallet negatif. Total Wallet adalah saldo kumulatif semua wallet aktif, bukan saldo periode {rangeLabel}. Cek wallet penyebab minus di audit bawah.</div>}
                {financialGoalBreakdown.duplicateGuardRows.length > 0 && <div style={{ marginTop: "9px", fontSize: "11px", color: "#fde68a", lineHeight: 1.45 }}>Anti double count aktif: {formatFull(financialGoalBreakdown.duplicateGuardTotal)} aset Goal tidak dihitung ulang karena masih terdeteksi di Investasi.</div>}
                {financialLedgerValidation.issueCount > 0 && <div style={{ marginTop: "9px", fontSize: "11px", color: "#fde68a", lineHeight: 1.45 }}>Validation Layer aktif: {financialLedgerValidation.issueCount} isu ledger terdeteksi. Cek ledger tanpa wallet, wallet hilang, atau transfer internal yang belum balance.</div>}
                {financialAuditTrailGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: "#fcd34d", lineHeight: 1.45 }}>Audit Trail Guard aktif: {financialAuditTrailGuard.issueCount} isu trace engine. Cek metadata ledger, internal cashflow leak, wallet nonaktif, atau ref dangling.</div>}
                {financialStressGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: "#fbbf24", lineHeight: 1.45 }}>Stress Guard aktif: {financialStressGuard.issueCount} tekanan finansial terdeteksi. Cek wallet kritis, debt pressure, liquidity stress, konsentrasi wallet, atau goal funding pressure.</div>}
                {financialRecoveryGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialRecoveryGuard.critical ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Recovery Guard aktif: {financialRecoveryGuard.issueCount} area pemulihan. Prioritas: {financialRecoveryGuard.primaryAction}</div>}
                {financialResilienceGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialResilienceGuard.critical ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Resilience Guard aktif: {financialResilienceGuard.issueCount} area ketahanan. Prioritas: {financialResilienceGuard.primaryAction}</div>}
                {financialFinalSafetyGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialFinalSafetyGuard.hardStop ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Final Integrity Guard aktif: {financialFinalSafetyGuard.issueCount} safety lock. Prioritas: {financialFinalSafetyGuard.primaryAction}</div>}
                {financialFinalIntegrityGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialFinalIntegrityGuard.critical ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Final Integrity Guard aktif: {financialFinalIntegrityGuard.issueCount} integrity lock. Prioritas: {financialFinalIntegrityGuard.primaryAction}</div>}
                {financialFinalLockGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialFinalLockGuard.hardLock ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Final Lock Guard aktif: {financialFinalLockGuard.issueCount} final lock. Prioritas: {financialFinalLockGuard.primaryAction}</div>}
                {financialClosureGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialClosureGuard.hardClosure ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Closure Guard aktif: {financialClosureGuard.issueCount} closure lock. Prioritas: {financialClosureGuard.primaryAction}</div>}
                {financialSealGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialSealGuard.hardSeal ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Seal Guard aktif: {financialSealGuard.issueCount} seal lock. Prioritas: {financialSealGuard.primaryAction}</div>}
                {financialReleaseReadinessGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialReleaseReadinessGuard.releaseBlocked ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Release Readiness baseline aktif: {financialReleaseReadinessGuard.issueCount} readiness lock. Status: {financialReleaseReadinessGuard.readinessLabel}. Prioritas: {financialReleaseReadinessGuard.primaryAction}</div>}
                {financialConsolidationGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialConsolidationGuard.consolidationBlocked ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Consolidation baseline aktif: {financialConsolidationGuard.issueCount} consolidation lock. Status: {financialConsolidationGuard.consolidationLabel}. Prioritas: {financialConsolidationGuard.primaryAction}</div>}
                {financialProgressMonitorGuard.issueCount > 0 && <div style={{ marginTop: "7px", fontSize: "11px", color: financialProgressMonitorGuard.monitorBlocked ? "#fecaca" : "#fde68a", lineHeight: 1.45 }}>Progress Monitor 7.1.5 aktif: {financialProgressMonitorGuard.issueCount} progress lock · {financialProgressMonitorGuard.activeLockCount} guard aktif. Prioritas: {financialProgressMonitorGuard.primaryAction}</div>}
                {financialScopeUser && <div style={{ marginTop: "9px", fontSize: "11px", color: "#94a3b8", lineHeight: 1.45 }}>Catatan: Goal adalah data keluarga. Nilai Goal penuh ditampilkan saat filter “Semua”.</div>}
              </div>

              {earlyIsOwnerForScope && financialWalletBreakdown.length > 0 && (
                <div style={{ marginTop: "10px", padding: "13px", borderRadius: "16px", background: negativeWalletBreakdown.length > 0 ? "rgba(239,68,68,0.09)" : "rgba(16,185,129,0.08)", border: negativeWalletBreakdown.length > 0 ? "1px solid rgba(239,68,68,0.20)" : "1px solid rgba(16,185,129,0.18)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "10px", letterSpacing: "1.6px", color: negativeWalletBreakdown.length > 0 ? "#fecaca" : "#86efac", fontWeight: 900, textTransform: "uppercase" }}>Wallet Balance Audit · Owner</div>
                      <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px", lineHeight: 1.45 }}>Total Wallet = saldo awal + semua ledger sepanjang waktu. Tidak mengikuti filter periode.</div>
                    </div>
                    <div style={{ padding: "6px 8px", borderRadius: "999px", background: negativeWalletBreakdown.length > 0 ? "rgba(239,68,68,0.16)" : "rgba(16,185,129,0.14)", color: negativeWalletBreakdown.length > 0 ? "#fecaca" : "#86efac", fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>{walletAuditLabel}</div>
                  </div>

                  <div style={{ display: "grid", gap: "7px" }}>
                    {(negativeWalletBreakdown.length > 0 ? negativeWalletBreakdown : financialWalletBreakdown).slice(0, 4).map(sd => (
                      <button key={sd.id} onClick={() => openSumberDanaEditor(sd)} style={{ width: "100%", textAlign: "left", padding: "10px", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(15,23,42,0.58)", color: "#fff", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sd.icon || "💵"} {sd.name || "Wallet"}</div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{sd.user || "Family"} · {sd.walletLedgerCount || 0} ledger · {sd.walletTransactionCount || 0} transaksi</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "12px", fontWeight: 900, color: Number(sd.walletBalance || 0) < 0 ? "#fca5a5" : "#86efac" }}>{formatFull(sd.walletBalance || 0)}</div>
                            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>klik cek/koreksi</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {mostNegativeWallet && (
                    <div style={{ marginTop: "9px", fontSize: "11px", color: "#fecaca", lineHeight: 1.5 }}>
                      Penyebab terbesar sementara: <b>{mostNegativeWallet.name}</b> {formatFull(mostNegativeWallet.walletBalance || 0)}. Buka wallet untuk lihat Log Wallet atau Penyesuaian Saldo.
                    </div>
                  )}
                  {negativeWalletBreakdown.length > 0 && (
                    <div style={{ marginTop: "9px", padding: "10px", borderRadius: "13px", background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.18)", fontSize: "11px", color: "#bae6fd", lineHeight: 1.5 }}>
                      <b>Baseline Assistant:</b> jika Log Audit Center sudah aman tetapi wallet real masih negatif, masukkan saldo real terakhir lewat Penyesuaian Saldo. Ini membuat ledger baseline tanpa menghapus histori lama.
                    </div>
                  )}
                  {negativeWalletBreakdown.length === 0 && positiveWalletBreakdown.length > 0 && (
                    <div style={{ marginTop: "9px", fontSize: "11px", color: "#86efac", lineHeight: 1.5 }}>Semua wallet aktif bernilai positif. Audit ini tetap bisa dipakai untuk cek saldo kumulatif.</div>
                  )}
                </div>
              )}
            </div>
            ) : (
              <div style={{ marginTop: "12px", padding: "16px", borderRadius: "20px", background: "rgba(15,23,42,0.72)", border: "1px solid rgba(245,158,11,0.24)" }}>
                <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#fbbf24", fontWeight: 900, textTransform: "uppercase" }}>Sensitive Data Hidden</div>
                <div style={{ fontSize: "17px", fontWeight: 900, color: "#fff", marginTop: "5px" }}>Financial Summary disembunyikan</div>
                <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "8px", lineHeight: 1.55 }}>
                  Role {currentRole} hanya melihat data sesuai izin. Net worth, investasi, pinjaman, dan wallet utama keluarga hanya untuk Owner/Admin dengan permission khusus.
                </div>
              </div>
            )}
          </div>
        )}



        {/* TRANSAKSI */}
        {activeTab === "history" && (
          <div style={{ padding: "0 20px 96px" }}>
            <div style={{ padding: "13px", marginBottom: "10px", borderRadius: "18px", background: "rgba(15,23,42,0.66)", border: "1px solid rgba(99,102,241,0.16)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Transaksi</div>
                  <div style={{ fontSize: "17px", color: "#fff", fontWeight: 900, marginTop: "3px" }}>Ringkas & Riwayat</div>
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "right", lineHeight: 1.45, flexShrink: 0 }}>{rangeLabel}<br />{displayTxns.length}/{filteredPeriodTxns.length} tampil</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px" }}>
                <div style={{ padding: "9px", borderRadius: "13px", background: "rgba(16,185,129,0.10)", minWidth: 0 }}><div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 800 }}>Income</div><div style={{ fontSize: "13px", fontWeight: 900, color: "#86efac", overflowWrap: "anywhere" }}>{formatRupiah(totalIncome)}</div></div>
                <div style={{ padding: "9px", borderRadius: "13px", background: "rgba(239,68,68,0.10)", minWidth: 0 }}><div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 800 }}>Expense</div><div style={{ fontSize: "13px", fontWeight: 900, color: "#fca5a5", overflowWrap: "anywhere" }}>{formatRupiah(totalExpense)}</div></div>
                <div style={{ padding: "9px", borderRadius: "13px", background: "rgba(99,102,241,0.10)", minWidth: 0 }}><div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 800 }}>Net</div><div style={{ fontSize: "13px", fontWeight: 900, color: balance >= 0 ? "#86efac" : "#fca5a5", overflowWrap: "anywhere" }}>{balance >= 0 ? "+" : "-"}{formatRupiah(Math.abs(balance))}</div></div>
              </div>
            </div>

            <div style={{ padding: "11px", marginBottom: "10px", borderRadius: "18px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                {[{ id: "day", label: "Hari ini" }, { id: "week", label: "7 hari" }, { id: "month", label: "Bulan ini" }].map(opt => {
                  const active = dateRangeMode === opt.id;
                  return <button key={opt.id} onClick={() => setTransactionQuickPeriod(opt.id)} style={{ flex: 1, padding: "8px 6px", borderRadius: "999px", border: "1px solid " + (active ? "rgba(99,102,241,0.42)" : "rgba(255,255,255,0.08)"), background: active ? "rgba(99,102,241,0.20)" : "rgba(255,255,255,0.045)", color: active ? "#c7d2fe" : "#cbd5e1", fontSize: "11px", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>{opt.label}</button>;
                })}
              </div>
              <input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="Cari transaksi..." style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: "8px", minHeight: "42px", fontSize: "13px" }} />
              <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                <button onClick={() => setShowAdvancedTxFilters(v => !v)} style={{ flex: 1, padding: "10px", borderRadius: "13px", border: "1px solid rgba(99,102,241,0.22)", background: showAdvancedTxFilters ? "rgba(99,102,241,0.16)" : "rgba(15,23,42,0.55)", color: "#c7d2fe", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>{showAdvancedTxFilters ? "Tutup filter" : hasTransactionFilters ? "Filter aktif" : "Filter"}</button>
                <select value={txSortMode} onChange={(e) => setTxSortMode(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0, boxSizing: "border-box", padding: "10px", fontSize: "12px" }}>
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="biggest">Terbesar</option>
                  <option value="smallest">Terkecil</option>
                </select>
              </div>
              {showAdvancedTxFilters && (
                <div style={{ marginTop: "8px", display: "grid", gap: "7px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
                    <select value={txTypeFilter} onChange={(e) => { setTxTypeFilter(e.target.value); setTxCategoryFilter("all"); }} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", padding: "10px", fontSize: "12px" }}>
                      <option value="all">Semua tipe</option>
                      <option value="income">Pemasukan</option>
                      <option value="expense">Pengeluaran</option>
                    </select>
                    <select value={txCategoryFilter} onChange={(e) => setTxCategoryFilter(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", padding: "10px", fontSize: "12px" }}>
                      <option value="all">Semua kategori</option>
                      {txCategoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>)}
                    </select>
                  </div>
                  <div style={{ padding: "8px 10px", borderRadius: "12px", background: "rgba(15,23,42,0.42)", border: "1px solid rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: "10px", lineHeight: 1.45 }}>{transactionScopeNote}</div>
                  {hasTransactionFilters && (
                    <button onClick={resetTransactionFilters} style={{ width: "100%", padding: "9px", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>Reset Filter</button>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "12px", marginBottom: "10px", borderRadius: "18px", background: "rgba(15,23,42,0.52)", border: "1px solid rgba(99,102,241,0.12)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "9px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "10px", letterSpacing: "1.8px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Insight</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px", lineHeight: 1.4 }}>{txIntelligenceCompact ? transactionCompactText : transactionInsightText}</div>
                </div>
                <button onClick={() => setTxIntelligenceCompact(v => !v)} style={{ padding: "7px 10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: txIntelligenceCompact ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.05)", color: txIntelligenceCompact ? "#c7d2fe" : "#cbd5e1", fontSize: "10px", fontWeight: 900, cursor: "pointer", flexShrink: 0 }}>
                  {txIntelligenceCompact ? "Detail" : "Ringkas"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px" }}>
                <div><div style={{ fontSize: "9px", color: "#64748b", fontWeight: 800 }}>Tampil</div><div style={{ fontSize: "12px", color: "#fff", fontWeight: 900 }}>{displayTxns.length} tx</div></div>
                <div><div style={{ fontSize: "9px", color: "#64748b", fontWeight: 800 }}>Net Filter</div><div style={{ fontSize: "12px", color: visibleNetFlow >= 0 ? "#86efac" : "#fca5a5", fontWeight: 900 }}>{visibleNetFlow >= 0 ? "+" : "-"}{formatRupiah(Math.abs(visibleNetFlow))}</div></div>
                <div><div style={{ fontSize: "9px", color: "#64748b", fontWeight: 800 }}>Quality</div><div style={{ fontSize: "12px", color: transactionQualityTone, fontWeight: 900 }}>{transactionQualityScore}/100</div></div>
              </div>

              {!txIntelligenceCompact && (
                <>
                  <div style={{ marginTop: "10px", padding: "11px", borderRadius: "14px", background: "rgba(15,23,42,0.48)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "10px", letterSpacing: "1.8px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Quality Review</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.45, marginTop: "4px" }}>{transactionQualityText}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: "20px", color: transactionQualityTone, fontWeight: 900 }}>{transactionQualityScore}</div><div style={{ fontSize: "9px", color: "#64748b", fontWeight: 900, textTransform: "uppercase" }}>score</div></div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "9px" }}>
                      {(transactionReviewSignals.length ? transactionReviewSignals : [{ label: "tidak ada signal besar", tone: "green" }]).map(signal => {
                        const toneMap = {
                          green: { color: "#86efac", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)" },
                          amber: { color: "#fbbf24", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)" },
                          red: { color: "#fca5a5", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.20)" },
                          muted: { color: "#cbd5e1", background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.14)" },
                        };
                        const tone = toneMap[signal.tone] || toneMap.muted;
                        return <span key={signal.label} style={{ padding: "6px 8px", borderRadius: "999px", fontSize: "10px", fontWeight: 900, ...tone }}>{signal.label}</span>;
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: "10px", padding: "11px", borderRadius: "14px", background: "rgba(15,23,42,0.42)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "10px", letterSpacing: "1.8px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Review Queue</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.45, marginTop: "3px" }}>Transaksi prioritas untuk dicek.</div>
                      </div>
                      <div style={{ fontSize: "18px", color: transactionQualityTone, fontWeight: 900, flexShrink: 0 }}>{transactionReviewQueue.length}</div>
                    </div>
                    {transactionReviewQueue.length === 0 ? (
                      <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.14)", color: "#86efac", fontSize: "11px", fontWeight: 800 }}>Tidak ada transaksi prioritas review.</div>
                    ) : (
                      <div style={{ display: "grid", gap: "7px" }}>
                        {transactionReviewQueue.map(({ tx, reasons }) => {
                          const cat = getCategoryInfo(tx.category, tx);
                          const txDate = tx.date || String(tx.createdAt || "").slice(0,10) || "Tanpa Tanggal";
                          const txUser = tx.user || tx.userName || "Tanpa User";
                          const queueKey = tx.id || `${txDate}-${txUser}-${tx.amount}-${reasons.join("-")}`;
                          return (
                            <button key={queueKey} onClick={() => setSelectedTransaction(tx)} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", alignItems: "center", padding: "9px 10px", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900, overflowWrap: "anywhere" }}>{cat?.icon || "🧾"} {cat?.label || "Tanpa Kategori"}</div>
                                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", overflowWrap: "anywhere" }}>{txUser} · {txDate}</div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: "11px", color: tx.type === "income" ? "#86efac" : "#fca5a5", fontWeight: 900 }}>{tx.type === "income" ? "+" : "-"}{formatRupiah(tx.amount || 0)}</div><div style={{ fontSize: "9px", color: "#64748b", marginTop: "3px" }}>Detail →</div></div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {isOwner && goalLinkReviewTotal > 0 && (
                    <div style={{ marginTop: "10px", padding: "11px", borderRadius: "14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "10px", letterSpacing: "1.8px", color: "#fbbf24", fontWeight: 900, textTransform: "uppercase" }}>Goal Link Review · Owner</div>
                          <div style={{ fontSize: "11px", color: "#fde68a", lineHeight: 1.45, marginTop: "3px" }}>Expense yang kemungkinan bagian dari Goal, tapi belum terhubung.</div>
                        </div>
                        <div style={{ fontSize: "18px", color: "#fbbf24", fontWeight: 900, flexShrink: 0 }}>{goalLinkReviewTotal}</div>
                      </div>
                      <div style={{ display: "grid", gap: "7px" }}>
                        {goalLinkReviewCandidates.map(({ tx, topGoal, score }) => {
                          const cat = getCategoryInfo(tx.category, tx);
                          const txDate = tx.date || String(tx.createdAt || "").slice(0,10) || "Tanpa Tanggal";
                          const txUser = tx.user || tx.userName || "Tanpa User";
                          const candidateKey = tx.id || `${txDate}-${txUser}-${tx.amount}-${topGoal?.id || "goal"}`;
                          return (
                            <button key={candidateKey} onClick={() => { setSelectedTransaction(tx); setTransactionEditMode(false); setTransactionGoalLinkForm({ goalId: topGoal.id, status: "Saran otomatis dari Goal Link Review. Cek ulang sebelum hubungkan." }); }} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", alignItems: "center", padding: "9px 10px", borderRadius: "13px", border: "1px solid rgba(245,158,11,0.16)", background: "rgba(15,23,42,0.42)", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900, overflowWrap: "anywhere" }}>{cat?.icon || "🧾"} {cat?.label || "Tanpa Kategori"} · {txUser}</div>
                                <div style={{ fontSize: "10px", color: "#fcd34d", marginTop: "2px", overflowWrap: "anywhere" }}>Saran: {topGoal?.label || topGoal?.id} · skor {score}</div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: "11px", color: "#fca5a5", fontWeight: 900 }}>-{formatRupiah(tx.amount || 0)}</div><div style={{ fontSize: "9px", color: "#fbbf24", marginTop: "3px" }}>Review →</div></div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isOwner && goalLinkedVisibleCount > 0 && (
                    <div style={{ marginTop: "10px", padding: "11px", borderRadius: "14px", background: goalLinkAuditTotal > 0 ? "rgba(251,191,36,0.08)" : "rgba(16,185,129,0.08)", border: goalLinkAuditTotal > 0 ? "1px solid rgba(251,191,36,0.18)" : "1px solid rgba(16,185,129,0.16)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "10px", letterSpacing: "1.8px", color: goalLinkAuditTotal > 0 ? "#fbbf24" : "#86efac", fontWeight: 900, textTransform: "uppercase" }}>Goal Link Audit · Owner</div>
                          <div style={{ fontSize: "11px", color: goalLinkAuditTotal > 0 ? "#fde68a" : "#bbf7d0", lineHeight: 1.45, marginTop: "3px" }}>{goalLinkAuditTotal > 0 ? "Transaksi Goal-linked yang perlu dicek sebelum laporan/engine dibaca." : "Semua transaksi Goal-linked yang tampil sudah tersinkron."}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "18px", color: goalLinkAuditTotal > 0 ? "#fbbf24" : "#86efac", fontWeight: 900 }}>{goalLinkAuditTotal}</div>
                          <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 800 }}>{goalLinkedSyncedVisibleCount} aman</div>
                        </div>
                      </div>
                      {goalLinkAuditTotal === 0 ? (
                        <div style={{ padding: "9px", borderRadius: "12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.14)", color: "#86efac", fontSize: "11px", fontWeight: 800 }}>Goal-linked transaction aman pada hasil filter ini.</div>
                      ) : (
                        <div style={{ display: "grid", gap: "7px" }}>
                          {goalLinkAuditQueue.map(item => {
                            const tx = item.tx;
                            const cat = getCategoryInfo(tx.category, tx);
                            const txDate = tx.date || String(tx.createdAt || "").slice(0,10) || "Tanpa Tanggal";
                            const txUser = tx.user || tx.userName || "Tanpa User";
                            const auditKey = tx.id || `${txDate}-${txUser}-${item.linkedAmount}-${item.pendingAmount}`;
                            const issueText = item.issues.slice(0, 3).join(" · ");
                            return (
                              <button key={auditKey} onClick={() => { setSelectedTransaction(tx); setTransactionEditMode(false); setTransactionGoalLinkForm({ goalId: tx.goalId || "", status: "Audit Goal Link: cek nominal, pending settlement, dan usage log sebelum koreksi." }); }} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", alignItems: "center", padding: "9px 10px", borderRadius: "13px", border: "1px solid rgba(251,191,36,0.16)", background: "rgba(15,23,42,0.42)", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: "12px", color: "#fff", fontWeight: 900, overflowWrap: "anywhere" }}>{cat?.icon || "🎯"} {item.goal?.label || tx.goalLabel || tx.goalId || "Goal"}</div>
                                  <div style={{ fontSize: "10px", color: "#fcd34d", marginTop: "2px", overflowWrap: "anywhere" }}>{issueText}</div>
                                  <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px", overflowWrap: "anywhere" }}>{txUser} · {txDate}</div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: "11px", color: "#fca5a5", fontWeight: 900 }}>-{formatRupiah(tx.amount || 0)}</div><div style={{ fontSize: "9px", color: "#fbbf24", marginTop: "3px" }}>Audit →</div></div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {periodCategoryDrilldown.length > 0 && (
                    <div style={{ marginTop: "10px", padding: "11px", borderRadius: "14px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <div><div style={{ fontSize: "10px", letterSpacing: "1.8px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Category Drilldown</div><div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Klik kategori untuk filter cepat.</div></div>
                        <button onClick={() => { setTxSearch(""); setTxTypeFilter("all"); setTxCategoryFilter("all"); setTxSortMode("newest"); }} style={{ padding: "7px 9px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: "10px", fontWeight: 900, cursor: "pointer", flexShrink: 0 }}>Clear</button>
                      </div>
                      <div style={{ display: "grid", gap: "7px" }}>
                        {periodCategoryDrilldown.slice(0, 6).map(stat => {
                          const isActive = txCategoryFilter === stat.id;
                          const value = stat.expense > 0 ? stat.expense : stat.income;
                          const labelTone = stat.expense > 0 ? "#fca5a5" : "#86efac";
                          return (
                            <button key={stat.id} onClick={() => { setTxSearch(""); setTxTypeFilter(stat.expense > 0 ? "expense" : "income"); setTxCategoryFilter(stat.id); setTxSortMode("biggest"); }} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", alignItems: "center", padding: "9px 10px", borderRadius: "13px", border: "1px solid " + (isActive ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)"), background: isActive ? "rgba(99,102,241,0.16)" : "rgba(15,23,42,0.42)", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                              <div style={{ minWidth: 0 }}><div style={{ fontSize: "12px", color: "#fff", fontWeight: 900, overflowWrap: "anywhere" }}>{stat.icon} {stat.label}</div><div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{stat.count} transaksi</div></div>
                              <div style={{ textAlign: "right", color: labelTone, fontSize: "11px", fontWeight: 900, overflowWrap: "anywhere" }}>{stat.expense > 0 ? "-" : "+"}{formatRupiah(value)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {canViewAllTransactions && (
              <div style={{ padding: "14px", marginBottom: "12px", borderRadius: "18px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Family Log</div>
                    <div style={{ fontSize: "14px", color: "#fff", fontWeight: 900, marginTop: "3px" }}>Log Transaksi per User</div>
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "right" }}>{rangeLabel}</div>
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {activeFamilyMembers.map(member => {
                    const txns = familyLogPeriodTxns.filter(t => (t.user || t.userName || "Tanpa User") === member.name);
                    const income = txns.filter(t => t.type === "income").reduce((s,t) => s + Number(t.amount || 0), 0);
                    const expense = txns.filter(t => t.type === "expense").reduce((s,t) => s + Number(t.amount || 0), 0);
                    const netFlow = income - expense;
                    return (
                      <button key={member.id || member.name} onClick={() => setSelectedFamilyLogUser(member.name)} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px", alignItems: "center", padding: "10px", borderRadius: "14px", background: "rgba(15,23,42,0.46)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "left", boxSizing: "border-box" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", overflowWrap: "anywhere" }}>{member.avatar || "👤"} {member.name || "Tanpa User"}</div>
                          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{txns.length} transaksi periode ini · klik untuk detail</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "11px", color: "#86efac", fontWeight: 900 }}>+{formatRupiah(income)}</div>
                          <div style={{ fontSize: "11px", color: "#fca5a5", fontWeight: 900 }}>-{formatRupiah(expense)}</div>
                          <div style={{ fontSize: "10px", color: netFlow >= 0 ? "#86efac" : "#fca5a5", marginTop: "3px", fontWeight: 900 }}>Net {netFlow >= 0 ? "+" : "-"}{formatRupiah(Math.abs(netFlow))} →</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {Object.keys(expenseByCategory).length > 0 && (
              <div style={{ padding: "12px", marginBottom: "10px", borderRadius: "18px", background: "rgba(15,23,42,0.48)", border: "1px solid rgba(99,102,241,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "10px", letterSpacing: "1.8px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Snapshot Kategori</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>Ringkasan top expense, bukan menu utama.</div>
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 900 }}>Top 3</div>
                </div>
                {Object.entries(expenseByCategory).sort((a,b) => b[1] - a[1]).slice(0,3).map(([catId, spent]) => {
                  const cat = getCategoryInfo(catId);
                  return (
                    <button key={catId} onClick={() => setSelectedCategory(catId)} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "8px", alignItems: "center", marginBottom: "7px", padding: "9px 10px", borderRadius: "13px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ minWidth: 0 }}><div style={{ fontSize: "12px", color: "#e5e7eb", fontWeight: 900, overflowWrap: "anywhere" }}>{cat.icon} {cat.label}</div><div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginTop: "6px" }}><div style={{ height: "100%", borderRadius: "10px", width: (Number(spent || 0) / barMax * 100) + "%", background: "linear-gradient(90deg,#6366f1,#10b981)" }} /></div></div>
                      <div style={{ fontSize: "12px", fontWeight: 900, color: "#fff", whiteSpace: "nowrap" }}>{formatRupiah(spent)}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {(loading && transactions.length === 0) ? <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Memuat data...</div>
            : displayTxns.length === 0 ? <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8", borderRadius: "18px", background: "rgba(255,255,255,0.035)", border: "1px dashed rgba(255,255,255,0.12)" }}><div style={{ fontSize: "40px", marginBottom: "12px" }}>🧾</div><div style={{ fontSize: "14px", color: "#cbd5e1", fontWeight: 800 }}>{dataError || (transactions.length === 0 ? "Data Firestore belum terbaca" : "Tidak ada transaksi untuk filter ini")}</div><div style={{ fontSize: "11px", marginTop: "8px", color: "#64748b" }}>Coba ubah periode, user, search, tipe, atau kategori. Data dari periode lain tidak ditampilkan agar riwayat tetap akurat.</div></div>
            : displayTxns.map(t => {
              const cat = getCategoryInfo(t.category, t);
              const txDate = t.date || String(t.createdAt || "").slice(0,10) || "Tanpa Tanggal";
              const txUser = t.user || t.userName || "Tanpa User";
              const txSource = t.sumberDanaName || t.sumberDanaId || t.sourceFund || "Tanpa Sumber Dana";
              const txNote = t.note || t.notes || "Tidak ada catatan";
              return (
                <div key={t.id || `${txDate}-${txUser}-${t.amount}-${txNote}`} onClick={() => setSelectedTransaction(t)} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "10px", alignItems: "center", padding: "13px 14px", marginBottom: "8px", borderRadius: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "all 0.15s", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", minWidth: 0 }}>
                    <div style={{ fontSize: "22px", flexShrink: 0 }}>{cat?.icon || "🧾"}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff", overflowWrap: "anywhere" }}>{cat?.label || "Tanpa Kategori"}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px", overflowWrap: "anywhere" }}>{txUser} · {txDate}</div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px", overflowWrap: "anywhere" }}>{txSource} · {txNote}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "88px", flexShrink: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 900, color: t.type === "income" ? "#34d399" : "#f87171" }}>{t.type === "income" ? "+" : "-"}{formatRupiah(t.amount || 0)}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px" }}>Detail →</div>
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
                        const info = getCategoryInfo(tx.category, tx);
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
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff", marginBottom: "8px" }}>🛡️ Permission Manager</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px", lineHeight: 1.5 }}>Pilih role untuk mengelola permission. Detail permission dibuka dalam popup agar halaman tidak terlalu panjang.</div>
              <div style={{ display: "grid", gap: "9px" }}>
                {rolePermissionSummary.map(role => {
                  const isOwnerRole = role.label === "Owner";
                  return (
                    <button key={role.id} onClick={() => setSelectedPermissionRole(role.label)} style={{ width: "100%", padding: "14px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: 900, color: role.color }}>{role.icon} {role.label}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{role.desc}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "12px", fontWeight: 900, color: isOwnerRole ? "#fbbf24" : "#c7d2fe" }}>{isOwnerRole ? "Full / Locked" : role.visibleCount + "/" + visiblePermissions.length}</div>
                          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px" }}>Kelola →</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedPermissionRole && (() => {
                const role = rolePermissionSummary.find(r => r.label === selectedPermissionRole);
                if (!role) return null;
                return (
                  <div onClick={() => setSelectedPermissionRole(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 100000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "16px", boxSizing: "border-box" }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "430px", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,#181827,#0f1020)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px 24px 18px 18px", padding: "18px", boxSizing: "border-box", color: "#e8e8f0", boxShadow: "0 -20px 70px rgba(0,0,0,0.55)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
                        <div>
                          <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Permission Detail</div>
                          <div style={{ fontSize: "22px", color: role.color, fontWeight: 900, marginTop: "4px" }}>{role.icon} {role.label}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "5px" }}>{role.visibleCount}/{visiblePermissions.length} permission aktif terlihat</div>
                        </div>
                        <button onClick={() => setSelectedPermissionRole(null)} style={{ width: "40px", height: "40px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "20px", fontWeight: 800, cursor: "pointer" }}>×</button>
                      </div>

                      {role.label !== "Owner" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                          <button onClick={() => applyRolePreset(role.label, "basic")} style={{ padding: "10px", borderRadius: "13px", border: "1px solid rgba(16,185,129,0.22)", background: "rgba(16,185,129,0.10)", color: "#86efac", fontSize: "11px", fontWeight: 900 }}>Basic</button>
                          <button onClick={() => applyRolePreset(role.label, role.label === "Admin" ? "trusted_admin" : "default")} style={{ padding: "10px", borderRadius: "13px", border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.10)", color: "#c7d2fe", fontSize: "11px", fontWeight: 900 }}>Preset Awal</button>
                        </div>
                      )}

                      {role.label === "Owner" && (
                        <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.22)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.55, fontWeight: 800, marginBottom: "12px" }}>
                          Owner memakai full access dan beberapa permission dikunci agar tidak terjadi lockout.
                        </div>
                      )}

                      <div style={{ display: "grid", gap: "9px" }}>
                        {permissionGroups.map(groupName => {
                          const groupItems = visiblePermissions.filter(permission => permission.group === groupName);
                          const allowedCount = groupItems.filter(permission => role.permissions.includes(permission.id)).length;
                          const expanded = Boolean(expandedPermissionGroups[role.label + "::" + groupName]);
                          return (
                            <div key={groupName} style={{ borderRadius: "15px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                              <button onClick={() => togglePermissionGroup(role.label, groupName)} style={{ width: "100%", padding: "12px", border: "none", background: "transparent", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                                <span style={{ fontSize: "12px", fontWeight: 900, color: "#c7d2fe" }}>{groupName}</span>
                                <span style={{ fontSize: "11px", fontWeight: 900, color: "#94a3b8" }}>{allowedCount}/{groupItems.length} {expanded ? "⌃" : "⌄"}</span>
                              </button>
                              {expanded && (
                                <div style={{ display: "grid", gap: "6px", padding: "0 10px 10px" }}>
                                  {groupItems.map(permission => {
                                    const allowed = role.permissions.includes(permission.id);
                                    const locked = role.label === "Owner" && OWNER_LOCKED_PERMISSIONS_V110.includes(permission.id);
                                    return <button key={permission.id} onClick={() => toggleRolePermission(role.label, permission.id)} disabled={locked || !canManagePermissions} style={{ padding: "9px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 900, textAlign: "left", cursor: locked || !canManagePermissions ? "not-allowed" : "pointer", background: allowed ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.04)", color: allowed ? "#86efac" : "#64748b", border: "1px solid " + (allowed ? "rgba(16,185,129,0.22)" : "rgba(255,255,255,0.05)"), opacity: locked ? 0.82 : 1 }}>{allowed ? "☑" : "☐"} {permission.icon} {permission.label}{locked ? " · locked" : ""}</button>;
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ padding: "12px", borderRadius: "14px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", color: "#a5b4fc", fontSize: "12px", lineHeight: 1.5, marginTop: "10px" }}>
                Permission tersimpan di Firebase. Sensitive data hidden by default. Role dibuka satu per satu agar pengaturan tetap ringkas.
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
                  <div style={{ fontSize: "13px", fontWeight: 900, color: "#c7d2fe" }}>{totalSavingsTarget > 0 ? ((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(2) : "0.00"}%</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>dari {formatRupiah(totalSavingsTarget)}</div>
                </div>
              </div>
              <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginTop: "10px" }}>
                <div style={{ height: "100%", borderRadius: "10px", width: (totalSavingsTarget > 0 ? Math.min((totalSavingsCurrent / totalSavingsTarget) * 100, 100) : 0) + "%", background: "linear-gradient(90deg,#6366f1,#10b981)", transition: "width 0.8s ease" }} />
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
                  const goals = savingsGoals.filter(g => g.category === child.id);
                  const target = goals.reduce((s,g) => s + g.targetAmount, 0);
                  const current = goals.reduce((s,g) => s + calcGoalValue(g.id), 0);
                  const active = selectedEducationChild === child.id;
                  const childColor = child.color || getGoalCategoryColor(child.id);
                  return <button key={child.id} onClick={() => setSelectedEducationChild(child.id)} style={{ padding: "12px 8px", borderRadius: "14px", border: "1px solid " + (active ? childColor + "99" : childColor + "33"), background: active ? childColor + "22" : "rgba(255,255,255,0.04)", color: active ? "#fff" : "#cbd5e1", textAlign: "left", cursor: "pointer", borderLeft: "4px solid " + childColor }}>
                    <div style={{ fontSize: "12px", fontWeight: 900 }}>{child.label}</div>
                    <div style={{ fontSize: "10px", color: active ? "#c7d2fe" : "#64748b", marginTop: "3px" }}>{formatRupiah(current)}</div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginTop: "7px" }}>
                      <div style={{ height: "100%", width: Math.min((current / Math.max(target, 1)) * 100, 100) + "%", background: childColor }} />
                    </div>
                  </button>;
                })}
              </div>
            )}

            {(() => {
              const goalsToShow = savingsTab === "education"
                ? savingsGoals.filter(g => g.category === selectedEducationChild)
                : savingsGoals.filter(g => g.category === savingsTab);
              const groupTarget = goalsToShow.reduce((s,g) => s + g.targetAmount, 0);
              const groupCurrent = goalsToShow.reduce((s,g) => s + calcGoalValue(g.id), 0);
              const groupRemaining = Math.max(groupTarget - groupCurrent, 0);
              const groupTitle = savingsTab === "education"
                ? (EDUCATION_CHILDREN.find(c => c.id === selectedEducationChild)?.label || "Pendidikan")
                : (CATEGORY_GROUPS.find(g => g.id === savingsTab)?.label || "Goals");
              const groupColor = savingsTab === "education" ? getGoalCategoryColor(selectedEducationChild) : getGoalCategoryColor(savingsTab);

              return <>
                <div style={{ padding: "13px 14px", marginBottom: "12px", borderRadius: "16px", background: "linear-gradient(135deg," + groupColor + "14,rgba(255,255,255,0.035))", border: "1px solid " + groupColor + "44", borderLeft: "4px solid " + groupColor }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{groupTitle}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>{goalsToShow.length} goal aktif · sisa target {formatRupiah(groupRemaining)}</div>
                      {canManageGoalFunds() && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "9px" }}>
                          <button onClick={() => openGoalBuilder(null, savingsTab === "education" ? selectedEducationChild : savingsTab)} style={{ padding: "8px 10px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff", fontSize: "10px", fontWeight: 900, cursor: "pointer" }}>+ Goal {savingsTab === "custom" ? "Custom" : ""}</button>
                          {savingsTab === "custom" && <button onClick={() => setShowGoalTemplateManager(true)} style={{ padding: "8px 10px", borderRadius: "12px", border: "1px solid rgba(168,85,247,0.28)", background: "rgba(168,85,247,0.10)", color: "#d8b4fe", fontSize: "10px", fontWeight: 900, cursor: "pointer" }}>Template</button>}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#34d399" }}>{formatRupiah(groupCurrent)}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>/ {formatRupiah(groupTarget)}</div>
                    </div>
                  </div>
                </div>

                {goalsToShow.length === 0 && (
                  <div style={{ padding: "18px", marginBottom: "12px", borderRadius: "18px", background: "rgba(168,85,247,0.08)", border: "1px dashed rgba(168,85,247,0.28)", textAlign: "center" }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>✨</div>
                    <div style={{ fontSize: "16px", fontWeight: 900, color: "#fff" }}>Belum ada goal di kategori ini</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px", lineHeight: 1.5 }}>Goal bawaan tetap template. Kamu bisa membuat goal custom sesuai kebutuhan hidup keluarga.</div>
                    {canManageGoalFunds() && <button onClick={() => openGoalBuilder(null, savingsTab === "education" ? selectedEducationChild : savingsTab)} style={{ marginTop: "12px", padding: "11px 14px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff", fontSize: "12px", fontWeight: 900, cursor: "pointer" }}>+ Buat Goal di sini</button>}
                  </div>
                )}

                {goalsToShow.map(goal => {
                  const currentVal = calcGoalValue(goal.id);
                  const idrCash = savingsData[goal.id] || 0;
                  const holdings = savingsHoldings[goal.id] || [];
                  const cashAllocations = sumberDanaLedger
                    .filter(l => l.refType === "goal_allocation" && String(l.refId) === String(goal.id) && Number(l.amount || 0) < 0 && !l.cancelled)
                    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
                  const goalUsages = goalUsagesFor(goal.id);
                  const totalGoalUsed = goalUsages.reduce((s, u) => s + Number(u.amount || 0), 0);
                  const pct = Math.min((currentVal / Math.max(goal.targetAmount, 1)) * 100, 100);
                  const remaining = Math.max(goal.targetAmount - currentVal, 0);
                  const monthlyNeeded = remaining > 0 ? Math.ceil(remaining / Math.max(goal.yearsLeft * 12, 1)) : 0;
                  const priority = getGoalPriorityLabel(goal);
                  const priorityMeta = getGoalPriorityMeta(priority);
                  const goalAccent = getGoalCategoryColor(goal.category || savingsTab || "custom");
                  const stage = getGoalStageLabel(goal);

                  return (
                    <div key={goal.id} style={{ padding: "14px", marginBottom: "10px", borderRadius: "16px", background: "linear-gradient(135deg," + goalAccent + "12,rgba(255,255,255,0.045))", border: "1px solid " + goalAccent + "44", borderLeft: "4px solid " + goalAccent }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                            <div style={{ fontSize: "14px", fontWeight: 900, color: "#fff" }}>{goal.icon} {stage}</div>
                            <span style={{ padding: "3px 7px", borderRadius: "999px", background: priorityMeta.bg, border: "1px solid " + priorityMeta.border, color: priorityMeta.color, fontSize: "10px", fontWeight: 900 }}>{priority}</span>
                            <span style={{ padding: "3px 7px", borderRadius: "999px", background: goal.sourceType === "custom" ? "rgba(168,85,247,0.14)" : "rgba(255,255,255,0.06)", color: goal.sourceType === "custom" ? "#d8b4fe" : "#94a3b8", fontSize: "10px", fontWeight: 900 }}>{goal.sourceType === "custom" ? "Custom" : "Template"}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", lineHeight: 1.45 }}>{goal.desc} · {goal.yearsLeft} thn lagi</div>
                          {(goal.program || goal.provider || goal.beneficiary) && <div style={{ fontSize: "10px", color: "#c7d2fe", marginTop: "4px", lineHeight: 1.4 }}>{[goal.program, goal.provider, goal.beneficiary].filter(Boolean).join(" · ")}</div>}
                        </div>
                        {canContributeGoal() && (
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "140px", flexShrink: 0 }}>
                            {canManageGoalFunds() && <button onClick={() => openGoalBuilder(goal)} style={{ background: "rgba(168,85,247,0.16)", border: "1px solid rgba(168,85,247,0.35)", color: "#d8b4fe", borderRadius: "9px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 800 }}>✏️ Edit</button>}
                            <button onClick={() => { setShowSavingsForm(goal.id); setSavingsInput(""); setSavingsInputDisplay(""); }} style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.35)", color: "#a5b4fc", borderRadius: "9px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 800 }}>+ Tunai</button>
                            <button onClick={() => { setShowAssetConvert(goal.id); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" }); }} style={{ background: "rgba(16,185,129,0.16)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399", borderRadius: "9px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 800 }}>+ Aset</button>
                            {canManageGoalFunds() && currentVal > 0 && <button onClick={() => openGoalUsageModal(goal.id)} style={{ background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.35)", color: "#fbbf24", borderRadius: "9px", padding: "5px 8px", fontSize: "10px", cursor: "pointer", fontWeight: 800 }}>🧾 Pakai</button>}
                          </div>
                        )}
                      </div>

                      <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", marginBottom: "7px" }}>
                        <div style={{ height: "100%", borderRadius: "10px", width: pct + "%", background: "linear-gradient(90deg," + goalAccent + "," + goalAccent + "99)", transition: "width 0.8s ease" }} />
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

                      {goalUsages.length > 0 && (
                        <div style={{ marginBottom: "8px", padding: "8px 10px", borderRadius: "12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.16)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", marginBottom: "5px" }}>
                            <div style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 900 }}>🧾 Log penggunaan goal</div>
                            <div style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 900 }}>Total {formatRupiah(totalGoalUsed)}</div>
                          </div>
                          <div style={{ display: "grid", gap: "5px" }}>
                            {goalUsages.slice(0, 2).map(u => (
                              <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", color: "#cbd5e1", fontSize: "10px", lineHeight: 1.35 }}>
                                <span>{u.mode === "asset" ? "🏦" : "💵"} {u.usedFor || u.category || "Penggunaan goal"}</span>
                                <b style={{ color: "#fbbf24", whiteSpace: "nowrap" }}>{formatRupiah(u.amount || 0)}</b>
                              </div>
                            ))}
                            {goalUsages.length > 2 && <div style={{ fontSize: "10px", color: "#94a3b8" }}>+{goalUsages.length - 2} log lain</div>}
                          </div>
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
            <div style={{ padding: "12px 14px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "10px", letterSpacing: "1px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase" }}>Market Price</div>
                  <div style={{ fontSize: "12px", color: "#e5e7eb", marginTop: "5px", fontWeight: 800 }}>
                    {marketPrices ? "USD/IDR " + formatFull(marketPrices.usdIdr) + " · Emas " + formatRupiah(marketPrices.goldPerGram) + "/gr" : "Harga belum dimuat"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "5px", lineHeight: 1.45 }}>
                    Status: <b style={{ color: marketPrices?.status === "estimate" ? "#fbbf24" : "#86efac" }}>{marketPrices?.status === "estimate" ? "Estimasi/manual" : marketPrices ? "Ter-refresh" : "Belum dimuat"}</b>
                    {marketPrices?.lastUpdated ? " · Update: " + marketPrices.lastUpdated : ""}
                    {marketPrices?.source ? " · Source: " + marketPrices.source : ""}
                  </div>
                </div>
                <button onClick={loadPrices} disabled={loadingPrices} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", borderRadius: "10px", padding: "8px 10px", fontSize: "11px", cursor: "pointer", fontWeight: 900 }}>{loadingPrices ? "⏳" : "🔄"}</button>
              </div>
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
                <div key={inv.id} onClick={() => openInvestmentDetail(inv)} style={{ padding: "14px", marginBottom: "10px", borderRadius: "16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700 }}>{at.icon} {inv.ticker || at.label}</div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{inv.qty || inv.amount} {at.unit} • modal {formatRupiah(inv.costBasis ?? ((inv.qty || inv.amount || 0) * (inv.buyPrice || 0)))} - {inv.buyDate || "-"}</div>
                      <div style={{ fontSize: "10px", color: inv.sourceMode === "existing" ? "#fbbf24" : "#86efac", marginTop: "3px", fontWeight: 800 }}>{inv.sourceMode === "existing" ? "📦 Aset sudah dimiliki · wallet tidak berubah" : "💳 Dibeli dari wallet"}</div>
                      {inv.note && <div style={{ fontSize: "11px", color: "#666" }}>{inv.note}</div>}
                    </div>
                    {canManageInvestments && (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button onClick={(e) => { e.stopPropagation(); openMoveAssetToGoal(inv); }} style={{ background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.28)", cursor: "pointer", color: "#c7d2fe", fontSize: "10px", borderRadius: "10px", padding: "7px 9px", fontWeight: 900 }}>🎯 Goal</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteInvestment(inv.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: "18px" }}>x</button>
                      </div>
                    )}
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
            {canManageInvestments && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => { setShowAssetConvert("invest_asset"); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" }); setAssetSDId(""); }} style={{ padding: "14px", borderRadius: "14px", border: "2px dashed rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.1)", color: "#34d399", fontSize: "13px", cursor: "pointer", fontWeight: 800 }}>💳 Beli dari Wallet</button>
                <button onClick={() => { setShowAssetConvert("invest_existing"); setAssetForm({ assetType: "lm", qty: "", buyPrice: "", valueMode: "total", note: "", ticker: "", manualPrice: "" }); setAssetSDId(""); }} style={{ padding: "14px", borderRadius: "14px", border: "2px dashed rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontSize: "13px", cursor: "pointer", fontWeight: 800 }}>📦 Aset Sudah Dimiliki</button>
              </div>
            )}
          </div>
        )}

        {/* PINJAMAN / LOAN · GADAI SUBMODULE */}
        {activeTab === "gadai" && (
          <div style={{ padding: "0 20px" }}>
            <div style={{ padding: "18px", marginBottom: "16px", borderRadius: "18px", background: "linear-gradient(135deg,rgba(99,102,241,0.14),rgba(15,23,42,0.55))", border: "1px solid rgba(99,102,241,0.28)" }}>
              <button onClick={() => setActiveTab("dompet")} style={{ marginBottom: "12px", padding: "8px 10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#c7d2fe", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>← Wallet / Finance</button>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", marginBottom: "6px" }}>Wallet / Finance · Loan Engine</div>
              <div style={{ fontSize: "22px", color: "#fff", fontWeight: 900, marginBottom: "8px" }}>Pinjaman / Loan</div>
              <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.65 }}>
                Gadai menjadi submodul Pinjaman. Wallet, Goal, Investasi, Pinjaman, dan Net Position mulai diringkas dalam Financial Engine agar saldo kas tidak disalahartikan sebagai kekayaan bersih.
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
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Sisa Pokok Aktif</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff" }}>{formatRupiah(gadaiList.filter(g => g.status === "aktif").reduce((s, g) => s + Number(g.outstandingPrincipal ?? g.uangPinjaman ?? 0), 0))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Estimasi Tebus</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#f87171" }}>{formatRupiah(gadaiList.filter(g => g.status === "aktif").reduce((s, g) => s + g.totalLunas, 0))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>Item Aktif</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#fbbf24" }}>{gadaiList.filter(g => g.status === "aktif").length} item</div>
                  </div>
                </div>
              </div>
            )}

            {/* Submodule Loan Type */}
            <div style={{ padding: "14px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Tipe Loan</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ padding: "10px", borderRadius: "13px", background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.30)", color: "#fbbf24", fontSize: "12px", fontWeight: 900 }}>🏦 Gadai</div>
                <div style={{ padding: "10px", borderRadius: "13px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", color: "#64748b", fontSize: "12px", fontWeight: 900 }}>➕ Loan lain nanti</div>
              </div>
            </div>

            {/* Gadai Submodule */}
            <div style={{ padding: "14px", marginBottom: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.055)", border: "1px solid rgba(245,158,11,0.16)" }}>
              <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Submodul Gadai</div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.55 }}>Kalkulator dan daftar di bawah ini khusus untuk tipe Loan Gadai. Nanti tipe pinjaman lain masuk di submodul loan masing-masing.</div>
            </div>

            {/* Kalkulator Gadai */}
            <div style={{ padding: "16px", marginBottom: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showGadaiCalc ? "14px" : "0" }}>
                <div style={{ fontSize: "14px", fontWeight: 800 }}>🏦 Gadai Emas · Kalkulator</div>
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

            {/* Daftar Loan · Gadai */}
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#666", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Daftar Loan · Gadai</div>

            {gadaiList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🧾</div>
                <div style={{ fontSize: "14px" }}>Belum ada loan gadai tercatat</div>
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

            {/* Tombol Tambah Loan */}
            {currentUser === ADMIN_USER && (
              <button onClick={() => setShowGadaiForm(true)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Tambah Loan <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 800 }}>· Tipe: Gadai</span></button>
            )}
          </div>
        )}

        {/* DOMPET / SUMBER DANA */}
        {activeTab === "dompet" && (
          <div style={{ padding: "0 20px" }}>
            <div style={{ padding: "16px", marginBottom: "14px", borderRadius: "18px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a5b4fc", fontWeight: 900, textTransform: "uppercase", marginBottom: "6px" }}>Wallet / Finance</div>
              <div style={{ fontSize: "20px", color: "#fff", fontWeight: 900, marginBottom: "8px" }}>Sumber Dana & Pinjaman</div>
              <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
                1. Tambahkan sumber dana sesuai kebutuhan: Cash, BCA, Mandiri, DANA, Owner Draw, atau lainnya.<br />
                2. Setiap transaksi wajib memilih sumber dana aktif agar saldo dompet akurat.<br />
                3. Jika salah ketik, gunakan Rename atau Merge agar data transaksi lama tidak hilang.<br />4. Pinjaman/Loan berada di area Finance. Gadai adalah salah satu jenis pinjaman.
              </div>
            </div>
            {/* Finance user scope */}
            <div style={{ padding: "12px", marginBottom: "12px", borderRadius: "16px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "9px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "1px", fontWeight: 900, textTransform: "uppercase" }}>Kelola Finance Untuk</div>
                  <div style={{ fontSize: "13px", color: "#fff", fontWeight: 900, marginTop: "2px" }}>{walletFilterUser || currentUser}</div>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 800 }}>Scope</div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", overflowX: "hidden" }}>
                {activeFamilyMembers.filter(member => canAccessSelectedWalletUser(member.name)).map(member => { const u = member.name; return (
                  <button key={u} onClick={() => setWalletFilterUser(u)} style={{
                    padding: "7px 11px", borderRadius: "14px", border: "1px solid " + (walletFilterUser === u ? "rgba(99,102,241,0.36)" : "rgba(255,255,255,0.06)"), cursor: "pointer",
                    whiteSpace: "nowrap", fontSize: "11px", fontWeight: 900, flexShrink: 0,
                    background: walletFilterUser === u ? "rgba(99,102,241,0.95)" : "rgba(255,255,255,0.06)",
                    color: walletFilterUser === u ? "#fff" : "#94a3b8",
                  }}>{member.avatar || "👤"} {u === currentUser ? u + " (saya)" : u}</button>
                );})}
              </div>
            </div>
            {!canViewAllWallets && (
              <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.22)", color: "#fbbf24", fontSize: "12px", lineHeight: 1.5, fontWeight: 800, marginBottom: "14px" }}>
                🔒 Mode own-wallet aktif. Role {currentRole} hanya melihat wallet dan transaksi milik sendiri.
              </div>
            )}

            {/* Total saldo + net position */}
            {(() => {
              const effectiveWalletUser = canViewAllWallets ? walletFilterUser : currentUser;
              const userSDs = sumberDanaList.filter(sd => sd.user === effectiveWalletUser && (showArchivedWallets || getSumberDanaStatus(sd) !== "archived"));
              const totalBalance = userSDs.reduce((s, sd) => s + calcSumberDanaBalance(sd.id), 0);
              const outstandingLoan = canViewLoans ? calcOutstandingLoanForUser(effectiveWalletUser) : 0;
              const netPosition = totalBalance - outstandingLoan;
              return (
                <div style={{ padding: "18px", marginBottom: "16px", borderRadius: "18px", background: "linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed)", boxShadow: "0 20px 60px rgba(99,102,241,0.3)" }}>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Financial Position · {effectiveWalletUser}</div>
                  <div style={{ fontSize: "26px", fontWeight: 900, color: "#fff" }}>{formatFull(totalBalance)}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.68)", marginTop: "4px" }}>Total Wallet / kas · {userSDs.length} sumber dana</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                    <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(15,23,42,0.28)" }}>
                      <div style={{ fontSize: "10px", color: "#c7d2fe", fontWeight: 800 }}>Pinjaman Aktif</div>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: outstandingLoan > 0 ? "#fca5a5" : "#86efac" }}>{formatFull(outstandingLoan)}</div>
                    </div>
                    <div style={{ padding: "10px", borderRadius: "14px", background: "rgba(15,23,42,0.28)" }}>
                      <div style={{ fontSize: "10px", color: "#c7d2fe", fontWeight: 800 }}>Net Position</div>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: netPosition >= 0 ? "#86efac" : "#fca5a5" }}>{formatFull(netPosition)}</div>
                    </div>
                  </div>
                  {totalBalance < 0 && <div style={{ marginTop: "10px", padding: "9px", borderRadius: "12px", background: "rgba(239,68,68,0.14)", color: "#fecaca", fontSize: "11px", fontWeight: 800 }}>⚠️ Total wallet negatif. Cek Log Wallet dan lakukan penyesuaian jika saldo real berbeda.</div>}
                </div>
              );
            })()}

            <div style={{ display: "grid", gridTemplateColumns: canManageAllWallets && canViewLoans ? "1fr 1fr" : "1fr", gap: "8px", marginBottom: "10px" }}>
              {canManageAllWallets && (
                <button onClick={() => { resetWalletTransferForm(); setShowWalletTransfer(true); }} style={{ width: "100%", padding: "13px", borderRadius: "16px", border: "1px solid rgba(16,185,129,0.26)", background: "rgba(16,185,129,0.11)", color: "#86efac", fontSize: "12px", fontWeight: 900, cursor: "pointer", textAlign: "left" }}>
                  💸 Uang Saku<br /><span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 700 }}>Transfer Wallet</span>
                </button>
              )}
              {canViewLoans && (
                <button onClick={() => setActiveTab("gadai")} style={{ width: "100%", padding: "13px", borderRadius: "16px", border: "1px solid rgba(245,158,11,0.28)", background: "rgba(245,158,11,0.10)", color: "#fbbf24", fontSize: "12px", fontWeight: 900, cursor: "pointer", textAlign: "left" }}>
                  🏦 Pinjaman / Loan<br /><span style={{ color: "#94a3b8", fontSize: "10px", fontWeight: 700 }}>Gadai dan tipe loan lain</span>
                </button>
              )}
            </div>

            <button onClick={() => setShowArchivedWallets(prev => !prev)} style={{ width: "100%", padding: "10px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", background: showArchivedWallets ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)", color: showArchivedWallets ? "#fbbf24" : "#94a3b8", fontSize: "12px", fontWeight: 900, marginBottom: "12px" }}>
              {showArchivedWallets ? "📦 Menampilkan arsip/nonaktif" : "✅ Hanya sumber dana aktif"}
            </button>

            {/* Daftar sumber dana */}
            {sumberDanaList.filter(sd => sd.user === (canViewAllWallets ? walletFilterUser : currentUser) && (showArchivedWallets || getSumberDanaStatus(sd) !== "archived")).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>💰</div>
                <div style={{ fontSize: "14px" }}>Belum ada sumber dana</div>
              </div>
            ) : sumberDanaList.filter(sd => sd.user === (canViewAllWallets ? walletFilterUser : currentUser) && (showArchivedWallets || getSumberDanaStatus(sd) !== "archived")).map(sd => {
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
            {(() => {
              const targetWalletUser = canViewAllWallets ? walletFilterUser : currentUser;
              const canCreateForTarget = canCreateWalletForUser(targetWalletUser);
              return canCreateForTarget ? (
                <button onClick={() => { setShowSDForm(true); setSdForm({ name: "", icon: "💵", initialBalance: "", color: "#6366f1", status: "active" }); }} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "2px dashed rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)", color: "#a5b4fc", fontSize: "14px", cursor: "pointer", fontWeight: 700, marginTop: "8px" }}>+ Tambah Wallet untuk {targetWalletUser}</button>
              ) : null;
            })()}
          </div>
        )}

        {hasPermission("transaction_add") && (activeTab === "dashboard" || activeTab === "history") && (
          <button aria-label="Tambah transaksi" onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: showMainNav ? "88px" : "28px", right: "max(18px, calc(50% - 194px))", width: "54px", height: "54px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.16)", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#7c3aed)", color: "#fff", fontSize: "26px", boxShadow: "0 12px 36px rgba(99,102,241,0.44)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99960 }}>+</button>
        )}



        {AddTransactionModal()}
        {SumberDanaModal()}
        {WalletTransferModal()}
        {SumberDanaDetailModal()}
        {RecycleBinModal()}
        {GoalCashFundingModal()}
        {GoalTemplateManagerModal()}
        {GoalBuilderModal()}
        {GoalUsageModal()}
        {AssetToGoalModal()}
        {InvestmentAssetModal()}
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
