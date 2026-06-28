import React from "react";

export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0a0a0f,#12121f,#0a0f1a)",
      color: "#e8e8f0",
      fontFamily: "Arial, sans-serif",
      padding: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "430px",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "24px",
        padding: "24px",
        background: "rgba(255,255,255,0.05)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)"
      }}>
        <div style={{
          fontSize: "12px",
          letterSpacing: "3px",
          color: "#6366f1",
          fontWeight: 800,
          textTransform: "uppercase",
          marginBottom: "8px"
        }}>
          FinPlan ADP
        </div>

        <h1 style={{
          fontSize: "28px",
          margin: "0 0 12px",
          color: "#fff"
        }}>
          Recovery Mode Aktif
        </h1>

        <p style={{
          lineHeight: 1.6,
          color: "#cbd5e1",
          marginBottom: "20px"
        }}>
          Aplikasi berhasil dipulihkan sementara agar build Vercel bisa hijau dulu.
          Setelah ini kita akan mengembalikan fitur FinPlan satu per satu dengan aman.
        </p>

        <div style={{
          borderRadius: "16px",
          padding: "16px",
          background: "rgba(99,102,241,0.14)",
          border: "1px solid rgba(99,102,241,0.25)",
          marginBottom: "16px"
        }}>
          <strong>Status:</strong> siap deploy.
        </div>

        <div style={{
          display: "grid",
          gap: "10px"
        }}>
          <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)" }}>
            ✅ App.jsx valid
          </div>
          <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)" }}>
            ✅ Tidak ada modal rusak
          </div>
          <div style={{ padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.06)" }}>
            ✅ Siap untuk perbaikan bertahap
          </div>
        </div>
      </div>
    </div>
  );
}
