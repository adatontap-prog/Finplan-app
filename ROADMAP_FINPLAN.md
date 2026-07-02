# FinPlan Roadmap — Locked Core Flow

**Project:** FinPlan ADP  
**Roadmap status:** Locked core structure  
**Current stable production baseline:** FinPlan v1.0.4 Dashboard Clean  
**Active development branch:** `family-v1.1.0`  
**Owner direction:** Future additions should refine, extend, or strengthen this roadmap. They should not restructure the core flow unless explicitly approved.

---

## 1. Product Vision

FinPlan is evolving from a transaction tracker into an **ADP Family Financial OS**.

Long-term direction:

```text
FinPlan → Family Financial OS
ADP KAI → Life & Business OS
Kai → AI Personal CFO / Jarvis Operating Partner
```

FinPlan should help answer every day:

```text
1. Is my family financial condition healthy today?
2. Which mandatory goals are safe or behind?
3. What income target must I reach this month and today?
4. Is a new goal realistic?
5. Which spending, saving, investing, or loan decision is safe?
```

---

## 2. Locked Core Principles

These principles are locked and should guide all future development.

### 2.1 Sumber Dana / Wallet

**Sumber Dana / Wallet = where money sits and moves.**

Examples:

```text
Cash
BCA
Mandiri
GoPay
DANA
TapCash
```

Wallets are the source of all cash movement.

Wallet features:

```text
Rename
Archive / Restore
Merge
Initial balance
Active / inactive status
Activity log
Permission-based access
```

### 2.2 Goals / Tabungan

**Goals = allocated purpose or future target.**

Important rule:

```text
Target goal is not an asset.
Only actual allocated funds/assets count as funded progress.
```

A goal should separate:

```text
Target amount
Current allocated / reserved amount
Shortfall
Ready-to-use amount
Status
Priority
Deadline
```

Goal status options:

```text
Wishlist / Idea
Planned
Active Saving
Funded / Ready
Paused
Completed
Cancelled
```

Goal priority:

```text
Priority 1 — Mandatory
Priority 2 — Important
Priority 3 — Lifestyle
Priority 4 — Wishlist
```

Goals may include multiple asset types:

```text
IDR cash
Gold
USD / forex
Mutual funds
Stocks
Crypto
Other instruments
```

Goal progress should be calculated from current market value converted to IDR, while still tracking cost basis and unrealized gain/loss.

### 2.3 Investment

**Investment = asset holdings purchased from wallet or allocated inside goals.**

Investments are not ordinary expenses.

Example:

```text
BCA - Rp 5.000.000
Gold holding + Rp 5.000.000
```

The family is not poorer merely because cash changed form into an asset.

### 2.4 Pinjaman / Loan & Liability

**Gadai should move under Pinjaman / Loan.**

Gadai is a secured loan with collateral, not income.

Final structure:

```text
Pinjaman / Loan
├─ Gadai
├─ Cicilan
├─ Pinjaman pribadi
├─ Kartu kredit
├─ PayLater
└─ Hutang usaha / keluarga
```

Gadai flow:

```text
When pawned:
Wallet increases
Loan/liability increases
Collateral asset status becomes pledged

When redeemed:
Wallet decreases
Loan/liability decreases
Interest/fees are recorded as expenses
Collateral asset becomes free again
```

### 2.5 No Double Counting

FinPlan must distinguish:

```text
Cashflow
Asset movement
Goal allocation
Investment purchase/sale
Loan/liability movement
```

Examples:

```text
Wallet → Goal = allocation, not consumption expense
Wallet → Investment = asset conversion, not consumption expense
Gadai cash received = loan proceeds, not income
Loan repayment = liability reduction + interest/fee expense
```

---

## 3. Locked Navigation Philosophy

### 3.1 Main Navigation = daily features

Primary navigation should contain user-facing daily modules:

```text
Ringkasan
Riwayat
Keluarga
Tabungan / Goals
Investasi
Pinjaman
Sumber Dana
```

### 3.2 Settings = configuration and system controls

Settings should focus on:

```text
Akun & Login
Family Admin
Permission Manager
Kelola Sumber Dana
Backup & Sinkronisasi
Security / System
Activity Log
Recycle Bin / Undo Delete
```

Important locked decision:

```text
Tabungan / Goals must not be a main feature entry inside Settings.
Investasi must not be a main feature entry inside Settings.
Activity Log and Recycle Bin should follow permission, not hardcoded Owner only.
```

---

## 4. Current Milestone History

### v1.0.4 — Dashboard Clean

Stable production baseline.

Completed:

```text
Password/session more stable
Settings Center active
Lock / Logout fixed
Dashboard cleaned
Backup, Sync, Email, JSON moved to Settings
Production Ready on main
```

### v1.1.0 Family Edition — Development branch: family-v1.1.0

Completed / ongoing phases:

```text
Phase 1 — Family foundation
Phase 2 — Family Management
Phase 2.1 — Access Control + UI cleanup
Phase 3 — Permission Manager
Phase 3.1 — Security Fix
Phase 3.2 — UI + Permission Cleanup
Phase 4 — Wallet / Sumber Dana v2
Phase 5 — Activity Log + Recycle Bin / Undo Delete
Phase 5.1 — Flow + UI Cleanup
Phase 5.2 — Goal UI + Permission Cleanup
```

---

## 5. Locked Roadmap Forward

### Phase 5.2 — Goal UI + Permission Cleanup

Target:

```text
Simplify Tabungan / Goals UI
Separate target vs real allocated funds
Support category hierarchy
Support priority and status
Keep Activity Log permission-based
Keep Recycle Bin permission-based
```

Goal hierarchy example:

```text
Pendidikan
├─ Aroon
│  ├─ SD
│  ├─ SMP
│  ├─ SMA
│  └─ Kuliah
├─ Arunika
└─ Arkaja

Masa Depan
Pensiun
Kesehatan
Lifestyle
Wishlist
```

### Phase 6 — Financial Engine Cleanup

Target:

```text
Connect Wallet, Goals, Investment, and Loan correctly
Avoid double counting
Convert Gadai into Pinjaman / Loan module
Separate allocation, spending, investing, and liability movement
Create correct financial transaction types
```

Required transaction movement types:

```text
Income
Expense
Transfer
Goal allocation
Goal withdrawal
Investment buy
Investment sell
Loan disbursement
Loan repayment
Fee / interest expense
Wallet adjustment
```

### Phase 7 — Financial Health Engine

Target:

```text
Daily financial health score
Daily financial status: Healthy / Safe / Warning / Danger
Income target this month
Income target per remaining day
Safe spending limit
Mandatory goal progress
Lifestyle goal capacity
Loan/liability warning
Goal simulation before activation
```

When a new goal is added, FinPlan should calculate:

```text
Required monthly contribution
Required daily contribution
Impact on financial health
Income shortfall or surplus
Whether mandatory goals remain safe
Recommendation: activate, delay, reduce target, or extend deadline
```

### Phase 8 — Kai Personal CFO inside FinPlan

Target:

```text
Kai appears inside FinPlan as AI Personal CFO
Daily financial summary
Goal simulation
Cashflow warning
Income recommendation
Spending recommendation
Priority guidance
Business income target insight
```

Kai should not be added as the main decision layer until the data model and financial engine are reliable.

Principle:

```text
Data correct first
Engine correct second
Dashboard correct third
Kai AI layer fourth
```

### Long-Term — ADP KAI / Jarvis Life & Business OS

Target:

```text
Personal Life OS
Family Financial OS
Business OS
Project OS
AI Operating Partner / Jarvis Layer
```

Kai should eventually support:

```text
Daily planning
Business strategy
Financial health
Project management
Reminders
Execution guidance
Decision support
Real-life opportunity suggestions
```

---

## 6. Permission Philosophy

Permissions should be dynamic and database-driven, not hardcoded.

Permission examples:

```text
dashboard_view
transaction_add
transaction_edit
transaction_delete
goal_view
goal_manage
wallet_view
wallet_manage
wallet_merge
investment_view
investment_manage
loan_view
loan_manage
family_manage
permission_manage
activity_log
recycle_bin
backup_sync
json_export
settings_access
```

Owner should have safe default permissions, but the system should be designed so permissions can be managed from the Permission Manager.

---

## 7. Merge Wallet Locked Behavior

Merge Wallet / Merge Sumber Dana is used when two wallets are actually the same but were created separately by mistake.

Example:

```text
BCAA → BCA
```

Correct merge behavior:

```text
Move all transactions from source wallet to target wallet
Move all ledger entries from source wallet to target wallet
Add source initial balance to target initial balance
Archive source wallet automatically
Hide archived source from transaction input
Record activity log
Do not create a new wallet
Do not create a new transaction
Do not simply rename unless it is only a naming typo on the same wallet
```

Safe rules:

```text
Only users with wallet_merge permission can merge
Source and target must be different
Cannot merge into archived/inactive wallet
Show confirmation before merge
```

---

## 8. Goal Safety Rule

Goals must not create false confidence.

For any optional goal such as:

```text
Liburan Keluarga
Renovasi Rumah
Mobil Baru
Upacara Keluarga
```

FinPlan must show:

```text
Target
Allocated / funded amount
Shortfall
Required monthly contribution
Priority
Status
```

Unfunded goals must appear as planned/wishlist, not as available capital.

---

## 9. Daily Financial Health Rule

FinPlan should become a daily health monitor.

Every day it should show:

```text
Financial health score
Income progress
Remaining income target
Safe spending limit
Mandatory goal status
Loan/liability status
Recommended action today
```

Mandatory goals and obligations should always be prioritized before lifestyle and wishlist goals.

---

## 10. Development Workflow

Locked workflow:

```text
main = production stable
Kai-dev = baseline development stable
family-v1.1.0 = active Family Edition development branch
```

Rules:

```text
Do not touch main directly for experimental work
Test new phases on family-v1.1.0
Only merge upward after testing and approval
Use small phase-based commits
Keep stable production baseline safe
```

Suggested commit message for this roadmap:

```text
Add locked FinPlan roadmap
```

---

## 11. Change Control

Future additions from the user should be treated as:

```text
Refinement
Subfeature
UI improvement
Logic improvement
Security improvement
Data safety improvement
```

They should not change the core roadmap structure unless the user explicitly says:

```text
Change the roadmap structure
Rebuild the architecture
Replace the locked flow
```

---

## 12. Current Next Steps

Immediate next logical steps:

```text
1. Complete Phase 5.2 testing
2. Start Phase 6 Financial Engine Cleanup
3. Convert Gadai into Pinjaman / Loan
4. Improve Goal Engine data structure
5. Add daily Financial Health Engine
6. Prepare Kai Personal CFO integration
```

---

**Roadmap locked by user direction.**  
All future work should preserve this structure and only improve it unless explicitly instructed otherwise.
