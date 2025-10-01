import React from "react";
import TablePanel from "./TablePanel";

/**
 * KeyValuePanel
 * - Renders object key/value pairs in a clean table
 * - If a value is an array of objects, renders TablePanel(rows)
 */

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function renderValue(val) {
  if (val === null || val === undefined) return <span className="small-muted">?</span>;
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="small-muted">[]</span>;
    if (val.every((x) => !isObject(x))) {
      return <div>{val.join(", ")}</div>;
    }
    // array of objects -> use TablePanel
    return <TablePanel rows={val} />;
  }
  if (isObject(val)) {
    // nested object -> recursive simple table
    const keys = Object.keys(val);
    if (keys.length === 0) return <span className="small-muted">?</span>;
    return (
      <table className="nested-table" style={{ width: "100%" }}>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td style={{ width: "34%", fontWeight: 700, padding: "6px 8px" }}>{k}</td>
              <td style={{ padding: "6px 8px" }}>{renderValue(val[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <span>{String(val)}</span>;
}

export default function KeyValuePanel({ obj }) {
  if (!obj) {
    return (
      <div style={{ padding: 12 }}>
        <div className="small-muted">No data</div>
      </div>
    );
  }

  if (!isObject(obj)) {
    return (
      <div style={{ padding: 12 }}>
        <div>{String(obj)}</div>
      </div>
    );
  }

  const keys = Object.keys(obj);
  return (
    <div style={{ padding: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {keys.map((k) => (
            <tr key={k} style={{ borderBottom: "1px solid #eef2ff" }}>
              <td style={{ width: "34%", padding: "10px 8px", background: "#f8fafc", fontWeight: 700, color: "var(--primary)" }}>{k}</td>
              <td style={{ padding: "10px 8px" }}>{renderValue(obj[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
