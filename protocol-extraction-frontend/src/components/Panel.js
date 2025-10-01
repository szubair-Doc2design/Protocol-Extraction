import React from "react";

export default function Panel({ title, children, open, onToggle, onEdit, hideEdit }) {
  return (
    <div
      className="panel"
      style={{
        marginBottom: 16,
        border: "1px solid #d0e3f0",
        borderRadius: 6,
        background: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="panel-header"
        onClick={onToggle}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "linear-gradient(90deg, #1976d2, #42a5f5)",
          color: "#fff",
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>
            {open ? "−" : "+"}
          </span>
          <span>{title}</span>
        </div>

        {/* Hide edit button if hideEdit = true */}
        {!hideEdit && (
          <button
            className="btn small"
            style={{
              background: "#fff",
              color: "#1976d2",
              fontWeight: 600,
              fontSize: 13,
              padding: "4px 8px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit && onEdit();
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Body */}
      {open && (
        <div
          className="panel-body"
          style={{ padding: 14, background: "#f9fbfd" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
