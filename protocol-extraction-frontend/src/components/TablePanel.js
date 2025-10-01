import React from "react";

function isObject(v) { return v && typeof v === "object" && !Array.isArray(v); }

function renderValue(val) {
  if (val === null || val === undefined) return <span className="small-muted">?</span>;
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="small-muted">[]</span>;
    if (val.every((x) => !isObject(x))) return <div>{val.join(", ")}</div>;
    return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{val.map((item, i) => <div key={i} style={{ border: "1px solid #eef2ff", padding: 8, borderRadius: 6 }}>{isObject(item) ? renderObjectAsTable(item) : String(item)}</div>)}</div>;
  }
  if (isObject(val)) return renderObjectAsTable(val);
  return <span>{String(val)}</span>;
}

function renderObjectAsTable(obj = {}) {
  if (!isObject(obj)) return <span>{String(obj)}</span>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return <div className="nested-table small-muted">?</div>;
  return (
    <table className="nested-table" style={{ width: "100%" }}>
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <td style={{ width: "35%", fontWeight: 700, padding: "6px 8px", background: "#fff" }}>{k}</td>
            <td style={{ padding: "6px 8px" }}>{renderValue(obj[k])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * TablePanel
 * props:
 *  - rows: array
 *  - columns: optional array of column names to force header/order
 */
export default function TablePanel({ rows, columns = null }) {
  if (!rows) return <div style={{ padding: 12 }}><div className="small-muted">No table rows available.</div></div>;
  if (!Array.isArray(rows)) {
    if (isObject(rows)) return <div style={{ padding: 12 }}>{renderObjectAsTable(rows)}</div>;
    return <div style={{ padding: 12 }}><div className="small-muted">Unsupported data format for TablePanel.</div></div>;
  }
  if (rows.length === 0) return <div style={{ padding: 12 }}><div className="small-muted">Empty table (no rows).</div></div>;

  // if columns provided, use them
  let cols = [];
  if (Array.isArray(columns) && columns.length > 0) {
    cols = columns;
  } else {
    const colsSet = new Set();
    rows.forEach((r) => { if (isObject(r)) Object.keys(r).forEach((k) => colsSet.add(k)); });
    cols = Array.from(colsSet);
    const hasAlpha = cols.some((c) => /\D/.test(c));
    if (!hasAlpha) {
      const alt = new Set();
      rows.forEach((r) => { if (isObject(r)) Object.keys(r).forEach((k) => { if (/\D/.test(k)) alt.add(k); }); });
      if (alt.size > 0) cols = Array.from(alt);
    }
  }

  // fallback when no columns
  if (cols.length === 0) {
    const allPrimitives = rows.every((r) => !isObject(r));
    if (allPrimitives) {
      return (
        <div style={{ padding: 12 }}>
          <table className="table">
            <thead><tr><th>Value</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i}><td>{renderValue(r)}</td></tr>)}</tbody>
          </table>
        </div>
      );
    }
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r, i) => <div key={i} style={{ border: "1px solid #eef2ff", padding: 10, borderRadius: 6 }}>{isObject(r) ? renderObjectAsTable(r) : renderValue(r)}</div>)}
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {cols.map((col) => {
                  const cell = isObject(row) && Object.prototype.hasOwnProperty.call(row, col) ? row[col] : null;
                  return <td key={col}>{renderValue(cell)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
