import React from "react";

export default function StatsBar({ total, filled }) {
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <div
      className="stats-card"
      style={{
        marginTop: 12,
        padding: 16,
        border: "1px solid #d0e3f0",
        borderRadius: 8,
        background: "#fff",
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          marginBottom: 8,
          fontWeight: 600,
          fontSize: 15,
          color: "#1976d2",
        }}
      >
        Extraction Completeness
      </div>

      <div
        style={{
          width: "100%",
          height: 20,
          background: "#e3f2fd",
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "linear-gradient(90deg, #1976d2, #42a5f5)",
            transition: "width 0.6s ease-in-out",
          }}
        />
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "#374151",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{filled} fields extracted</span>
        <span>{percent}% complete</span>
      </div>
    </div>
  );
}
