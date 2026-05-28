import { useState, useEffect } from "react";

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

function formatRupiah(num) {
  if (!num && num !== 0) return "Rp 0";
  return "Rp " + Number(num).toLocaleString("id-ID");
}

function parseAmount(str) {
  return parseInt(str.replace(/\D/g, "")) || 0;
}

const INITIAL_DATA = {
  transactions: [],
  budgets: {},
};

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "expense", category: "makan", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
  const [amountDisplay, setAmountDisplay] = useState("");
  const [budgetEdit, setBudgetEdit] = useState({});
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear] = useState(new Date().getFullYear());
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("finplan_data");
      if (saved) setData(JSON.parse(saved));
    } catch {}
    setTimeout(() => setAnimIn(true), 50);
  }, []);

  function save(newData) {
    setData(newData);
    try { localStorage.setItem("finplan_data", JSON.stringify(newData)); } catch {}
  }

  const monthTxns = data.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const totalIncome = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const expenseByCategory = {};
  monthTxns.filter(t => t.type === "expense").forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
  });

  function addTransaction() {
    if (!form.amount || !form.date) return;
    const amt = parseAmount(form.amount);
    if (!amt) return;
    const newTxn = { id: Date.now(), ...form, amount: amt };
    save({ ...data, transactions: [newTxn, ...data.transactions] });
    setShowForm(false);
    setForm({ type: "expense", category: "makan", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
    setAmountDisplay("");
  }

  function deleteTransaction(id) {
    save({ ...data, transactions: data.transactions.filter(t => t.id !== id) });
  }

  function saveBudget(catId, val) {
    const amt = parseAmount(val);
    const newBudgets = { ...data.budgets, [catId]: amt };
    save({ ...data, budgets: newBudgets });
  }

  const EXPENSE_CATS = CATEGORIES.filter(c => c.type === "expense");
  const INCOME_CATS = CATEGORIES.filter(c => c.type === "income");

  const barMax = Math.max(...Object.values(expenseByCategory), 1);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #12121f 50%, #0a0f1a 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e8e8f0",
      padding: "0",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background orbs */}
      <div style={{ position:"fixed", top:"-80px", left:"-80px", width:"320px", height:"320px", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:"-100px", right:"-60px", width:"280px", height:"280px", borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      <div style={{ maxWidth:"430px", margin:"0 auto", minHeight:"100vh", position:"relative", zIndex:1 }}>

        {/* Header */}
        <div style={{
          padding:"28px 20px 16px",
          opacity: animIn ? 1 : 0,
          transform: animIn ? "translateY(0)" : "translateY(-16px)",
          transition: "all 0.5s ease",
        }}>
          <div style={{ fontSize:"11px", letterSpacing:"3px", color:"#6366f1", fontWeight:700, textTransform:"uppercase", marginBottom:"4px" }}>
            💰 FinPlan
          </div>
          <div style={{ fontSize:"22px", fontWeight:800, color:"#fff", letterSpacing:"-0.5px" }}>
            Rencana Keuangan
          </div>
        </div>

        {/* Month Selector */}
        <div style={{ padding:"0 20px 16px", display:"flex", gap:"6px", overflowX:"auto", scrollbarWidth:"none" }}>
          {MONTHS.map((m, i) => (
            <button key={i} onClick={() => setFilterMonth(i)} style={{
              padding:"6px 14px", borderRadius:"20px", border:"none", cursor:"pointer", whiteSpace:"nowrap", fontSize:"12px", fontWeight:600,
              background: filterMonth === i ? "#6366f1" : "rgba(255,255,255,0.07)",
              color: filterMonth === i ? "#fff" : "#888",
              transition:"all 0.2s",
              flexShrink:0,
            }}>{m}</button>
          ))}
        </div>

        {/* Balance Card */}
        <div style={{ padding:"0 20px 20px", opacity: animIn?1:0, transform:animIn?"translateY(0)":"translateY(20px)", transition:"all 0.6s ease 0.1s" }}>
          <div style={{
            background:"linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #7c3aed 100%)",
            borderRadius:"20px",
            padding:"22px",
            boxShadow:"0 20px 60px rgba(99,102,241,0.3)",
            position:"relative",
            overflow:"hidden",
          }}>
            <div style={{ position:"absolute", top:"-20px", right:"-20px", width:"100px", height:"100px", borderRadius:"50%", background:"rgba(255,255,255,0.08)" }} />
            <div style={{ fontSize:"11px", letterSpacing:"2px", color:"rgba(255,255,255,0.7)", marginBottom:"6px", textTransform:"uppercase" }}>Saldo Bulan Ini</div>
            <div style={{ fontSize:"32px", fontWeight:900, color:"#fff", letterSpacing:"-1px", marginBottom:"18px" }}>
              {balance < 0 ? "-" : ""}{formatRupiah(Math.abs(balance))}
            </div>
            <div style={{ display:"flex", gap:"24px" }}>
              <div>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.6)", marginBottom:"2px" }}>↑ Pemasukan</div>
                <div style={{ fontSize:"15px", fontWeight:700, color:"#a5f3c4" }}>{formatRupiah(totalIncome)}</div>
              </div>
              <div>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.6)", marginBottom:"2px" }}>↓ Pengeluaran</div>
                <div style={{ fontSize:"15px", fontWeight:700, color:"#fca5a5" }}>{formatRupiah(totalExpense)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding:"0 20px 16px", display:"flex", gap:"4px", background:"rgba(255,255,255,0.04)", margin:"0 20px 16px", borderRadius:"14px", padding:"4px" }}>
          {[["dashboard","📊 Ringkasan"],["history","📋 Riwayat"],["budget","🎯 Anggaran"]].map(([key,label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex:1, padding:"9px 4px", border:"none", cursor:"pointer", borderRadius:"10px", fontSize:"11px", fontWeight:700,
              background: activeTab===key ? "#6366f1" : "transparent",
              color: activeTab===key ? "#fff" : "#666",
              transition:"all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div style={{ padding:"0 20px", opacity:animIn?1:0, transition:"opacity 0.5s ease 0.2s" }}>
            {Object.keys(expenseByCategory).length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
                <div style={{ fontSize:"40px", marginBottom:"12px" }}>📂</div>
                <div style={{ fontSize:"14px" }}>Belum ada transaksi bulan ini</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:"12px", fontWeight:700, color:"#666", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"12px" }}>Pengeluaran per Kategori</div>
                {EXPENSE_CATS.filter(c => expenseByCategory[c.id]).map(cat => {
                  const spent = expenseByCategory[cat.id] || 0;
                  const budget = data.budgets[cat.id] || 0;
                  const pct = budget ? Math.min(spent / budget * 100, 100) : (spent / barMax * 100);
                  const over = budget && spent > budget;
                  return (
                    <div key={cat.id} style={{ marginBottom:"14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                        <span style={{ fontSize:"13px" }}>{cat.icon} {cat.label}</span>
                        <span style={{ fontSize:"13px", fontWeight:700, color: over ? "#f87171" : "#e8e8f0" }}>
                          {formatRupiah(spent)} {budget ? `/ ${formatRupiah(budget)}` : ""}
                        </span>
                      </div>
                      <div style={{ height:"6px", background:"rgba(255,255,255,0.08)", borderRadius:"10px", overflow:"hidden" }}>
                        <div style={{
                          height:"100%", borderRadius:"10px", width:`${pct}%`,
                          background: over ? "linear-gradient(90deg,#f87171,#ef4444)" : "linear-gradient(90deg,#6366f1,#10b981)",
                          transition:"width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div style={{ padding:"0 20px" }}>
            {monthTxns.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
                <div style={{ fontSize:"40px", marginBottom:"12px" }}>🗒️</div>
                <div style={{ fontSize:"14px" }}>Belum ada transaksi</div>
              </div>
            ) : (
              monthTxns.map(t => {
                const cat = CATEGORIES.find(c => c.id === t.category);
                return (
                  <div key={t.id} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"13px 14px", marginBottom:"8px", borderRadius:"14px",
                    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.06)",
                    transition:"all 0.2s",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                      <div style={{ fontSize:"24px" }}>{cat?.icon}</div>
                      <div>
                        <div style={{ fontSize:"13px", fontWeight:600 }}>{cat?.label}</div>
                        <div style={{ fontSize:"11px", color:"#555" }}>{t.note || t.date}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ fontSize:"13px", fontWeight:700, color: t.type==="income" ? "#34d399" : "#f87171" }}>
                        {t.type==="income" ? "+" : "-"}{formatRupiah(t.amount)}
                      </div>
                      <button onClick={() => deleteTransaction(t.id)} style={{
                        background:"none", border:"none", cursor:"pointer", color:"#444", fontSize:"16px", lineHeight:1,
                        padding:"2px 4px", borderRadius:"6px",
                      }}>×</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === "budget" && (
          <div style={{ padding:"0 20px" }}>
            <div style={{ fontSize:"12px", color:"#555", marginBottom:"16px" }}>Atur batas anggaran per kategori pengeluaran</div>
            {EXPENSE_CATS.map(cat => {
              const spent = expenseByCategory[cat.id] || 0;
              const budget = data.budgets[cat.id] || 0;
              const editing = budgetEdit[cat.id] !== undefined;
              return (
                <div key={cat.id} style={{
                  padding:"14px", marginBottom:"8px", borderRadius:"14px",
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:editing?"10px":"0" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <span style={{ fontSize:"20px" }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontSize:"13px", fontWeight:600 }}>{cat.label}</div>
                        <div style={{ fontSize:"11px", color:"#555" }}>Terpakai: {formatRupiah(spent)}</div>
                      </div>
                    </div>
                    <button onClick={() => setBudgetEdit(prev => editing ? (({[cat.id]:_, ...rest}) => rest)(prev) : {...prev, [cat.id]: budget||""})} style={{
                      background:"rgba(99,102,241,0.2)", border:"1px solid rgba(99,102,241,0.3)", color:"#a5b4fc",
                      borderRadius:"8px", padding:"5px 10px", fontSize:"11px", cursor:"pointer", fontWeight:600,
                    }}>{editing ? "Batal" : budget ? "Ubah" : "Atur"}</button>
                  </div>
                  {!editing && budget > 0 && (
                    <div style={{ marginTop:"8px", fontSize:"12px", color: spent>budget?"#f87171":"#34d399", fontWeight:600 }}>
                      Anggaran: {formatRupiah(budget)} {spent>budget ? "⚠️ Melebihi!" : "✓"}
                    </div>
                  )}
                  {editing && (
                    <div style={{ display:"flex", gap:"8px" }}>
                      <input
                        placeholder="Masukkan anggaran..."
                        value={budgetEdit[cat.id]}
                        onChange={e => setBudgetEdit(prev => ({...prev, [cat.id]: e.target.value}))}
                        style={{
                          flex:1, background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.1)",
                          borderRadius:"8px", padding:"8px 10px", color:"#fff", fontSize:"13px", outline:"none",
                        }}
                      />
                      <button onClick={() => { saveBudget(cat.id, budgetEdit[cat.id]); setBudgetEdit(prev => (({[cat.id]:_, ...rest}) => rest)(prev)); }} style={{
                        background:"#6366f1", border:"none", color:"#fff", borderRadius:"8px",
                        padding:"8px 14px", fontSize:"12px", cursor:"pointer", fontWeight:700,
                      }}>Simpan</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Spacer for FAB */}
        <div style={{ height:"100px" }} />

        {/* FAB */}
        <button onClick={() => setShowForm(true)} style={{
          position:"fixed", bottom:"28px", left:"50%", transform:"translateX(-50%) translateX(calc(215px - 32px))",
          width:"56px", height:"56px", borderRadius:"50%", border:"none", cursor:"pointer",
          background:"linear-gradient(135deg, #6366f1, #7c3aed)",
          color:"#fff", fontSize:"28px", fontWeight:300,
          boxShadow:"0 8px 32px rgba(99,102,241,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:100, transition:"transform 0.2s, box-shadow 0.2s",
        }}>+</button>

        {/* Modal Form */}
        {showForm && (
          <div onClick={e => { if(e.target===e.currentTarget) setShowForm(false); }} style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200,
            display:"flex", alignItems:"flex-end", justifyContent:"center",
            backdropFilter:"blur(4px)",
          }}>
            <div style={{
              width:"100%", maxWidth:"430px", background:"#14141f",
              borderRadius:"24px 24px 0 0", padding:"24px 20px 40px",
              border:"1px solid rgba(255,255,255,0.08)",
              boxShadow:"0 -20px 60px rgba(0,0,0,0.5)",
              animation:"slideUp 0.3s ease",
            }}>
              <div style={{ textAlign:"center", marginBottom:"20px" }}>
                <div style={{ width:"36px", height:"4px", background:"rgba(255,255,255,0.15)", borderRadius:"2px", margin:"0 auto 16px" }} />
                <div style={{ fontSize:"16px", fontWeight:800 }}>Tambah Transaksi</div>
              </div>

              {/* Type Toggle */}
              <div style={{ display:"flex", gap:"4px", background:"rgba(255,255,255,0.05)", borderRadius:"12px", padding:"4px", marginBottom:"16px" }}>
                {[["expense","Pengeluaran"],["income","Pemasukan"]].map(([val,label]) => (
                  <button key={val} onClick={() => { setForm(f => ({...f, type:val, category: val==="expense"?"makan":"gaji"})); }} style={{
                    flex:1, padding:"10px", border:"none", cursor:"pointer", borderRadius:"9px", fontSize:"13px", fontWeight:700,
                    background: form.type===val ? (val==="expense" ? "#ef4444" : "#10b981") : "transparent",
                    color: form.type===val ? "#fff" : "#555",
                    transition:"all 0.2s",
                  }}>{label}</button>
                ))}
              </div>

              {/* Category */}
              <div style={{ marginBottom:"14px" }}>
                <div style={{ fontSize:"11px", color:"#555", marginBottom:"6px", letterSpacing:"1px", textTransform:"uppercase" }}>Kategori</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                  {(form.type==="expense" ? EXPENSE_CATS : INCOME_CATS).map(cat => (
                    <button key={cat.id} onClick={() => setForm(f => ({...f, category:cat.id}))} style={{
                      padding:"6px 12px", borderRadius:"20px", border:"1px solid",
                      borderColor: form.category===cat.id ? "#6366f1" : "rgba(255,255,255,0.08)",
                      background: form.category===cat.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                      color: form.category===cat.id ? "#a5b4fc" : "#666",
                      fontSize:"12px", cursor:"pointer", fontWeight:600, transition:"all 0.15s",
                    }}>{cat.icon} {cat.label}</button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div style={{ marginBottom:"12px" }}>
                <div style={{ fontSize:"11px", color:"#555", marginBottom:"6px", letterSpacing:"1px", textTransform:"uppercase" }}>Jumlah</div>
                <input
                  placeholder="Rp 0"
                  value={amountDisplay}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g,"");
                    setAmountDisplay(raw ? "Rp " + parseInt(raw).toLocaleString("id-ID") : "");
                    setForm(f => ({...f, amount: raw}));
                  }}
                  inputMode="numeric"
                  style={{
                    width:"100%", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:"12px", padding:"12px 14px", color:"#fff", fontSize:"18px",
                    fontWeight:700, outline:"none", boxSizing:"border-box",
                  }}
                />
              </div>

              {/* Note & Date */}
              <div style={{ display:"flex", gap:"10px", marginBottom:"20px" }}>
                <input
                  placeholder="Catatan (opsional)"
                  value={form.note}
                  onChange={e => setForm(f => ({...f, note:e.target.value}))}
                  style={{
                    flex:2, background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:"12px", padding:"11px 12px", color:"#fff", fontSize:"13px", outline:"none",
                  }}
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({...f, date:e.target.value}))}
                  style={{
                    flex:1, background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:"12px", padding:"11px 10px", color:"#888", fontSize:"12px", outline:"none",
                    colorScheme:"dark",
                  }}
                />
              </div>

              <button onClick={addTransaction} disabled={!form.amount} style={{
                width:"100%", padding:"15px", borderRadius:"14px", border:"none", cursor:"pointer",
                background: form.amount ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "rgba(255,255,255,0.07)",
                color: form.amount ? "#fff" : "#444", fontSize:"15px", fontWeight:800,
                boxShadow: form.amount ? "0 8px 24px rgba(99,102,241,0.35)" : "none",
                transition:"all 0.2s",
              }}>Simpan Transaksi</button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        ::-webkit-scrollbar { display:none; }
        @keyframes slideUp {
          from { transform:translateY(100%); }
          to { transform:translateY(0); }
        }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.3); }
      `}</style>
    </div>
  );
}
