import React, { useState } from "react";

/**
 * EditModal
 * props:
 *  - title
 *  - initialData
 *  - sectionKey (string)
 *  - onSave(updatedData)
 *  - onClose()
 *
 * Renders friendly editing UI:
 *  - object -> key/value inputs (recurses one level for nested objects)
 *  - array of objects -> editable table, add/remove rows
 */

function deepClone(v) { return JSON.parse(JSON.stringify(v)); }

function defaultVisitColumns() {
  return ["Visit", "VisitWeek", "VisitType", "VisitCalculatedFrom", "KitType"];
}

function columnsForSection(sectionKey) {
  const k = (sectionKey || "").toLowerCase().replace(/\s+/g, "");
  if (k.includes("visit") && k.includes("schedule")) return defaultVisitColumns();
  return null;
}

function isObject(v) { return v && typeof v === "object" && !Array.isArray(v); }

export default function EditModal({ title, initialData, sectionKey, onSave, onClose }) {
  const [data, setData] = useState(deepClone(initialData));

  // Helpers for object editing
  function setObjValue(path, value) {
    setData((prev) => {
      const copy = deepClone(prev);
      const parts = path.split(".");
      let cur = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return copy;
    });
  }

  // Array editing helpers (array of objects)
  function addRow() {
    setData((prev) => {
      const copy = deepClone(prev);
      if (!Array.isArray(copy)) return copy;
      // create empty object with same keys if possible
      const first = copy.find((r) => isObject(r));
      const newRow = first ? Object.fromEntries(Object.keys(first).map(k => [k, ""])) : {};
      copy.push(newRow);
      return copy;
    });
  }
  function deleteRow(idx) {
    setData((prev) => {
      const copy = deepClone(prev);
      if (!Array.isArray(copy)) return copy;
      copy.splice(idx, 1);
      return copy;
    });
  }
  function setCell(idx, key, value) {
    setData((prev) => {
      const copy = deepClone(prev);
      if (!Array.isArray(copy)) return copy;
      if (!isObject(copy[idx])) copy[idx] = {};
      copy[idx][key] = value;
      return copy;
    });
  }

  // Save
  function handleSave() {
    onSave && onSave(data);
  }

  // Renderers
  if (Array.isArray(initialData) && initialData.length > 0 && initialData.every((it) => isObject(it))) {
    const forcedCols = columnsForSection(sectionKey) || Array.from(new Set(initialData.flatMap((r) => Object.keys(r))));
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="modal-header">
            <h3>Edit: {title}</h3>
            <button className="btn small" onClick={onClose}>Close</button>
          </div>
          <div className="modal-body">
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>{forcedCols.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {data.map((row, ri) => (
                    <tr key={ri}>
                      {forcedCols.map((col) => (
                        <td key={col}>
                          <input value={row && row[col] != null ? String(row[col]) : ""} onChange={(e) => setCell(ri, col, e.target.value)} />
                        </td>
                      ))}
                      <td>
                        <button className="btn small" onClick={() => deleteRow(ri)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={addRow}>Add row</button>
            </div>
          </div>

          <div className="modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  if (isObject(initialData)) {
    const keys = Object.keys(initialData);
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="modal-header">
            <h3>Edit: {title}</h3>
            <button className="btn small" onClick={onClose}>Close</button>
          </div>

          <div className="modal-body">
            {keys.map((k) => {
              const val = data[k];
              if (Array.isArray(val)) {
                // arrays: primitives or objects
                if (val.length === 0 || val.every((x) => typeof x !== "object")) {
                  return (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 700 }}>{k}</label>
                      <input value={Array.isArray(val) ? val.join(", ") : ""} onChange={(e) => setObjValue(k, e.target.value.split(",").map(s => s.trim()))} />
                    </div>
                  );
                }
                // array of objects -> show table editor
                const cols = Array.from(new Set(val.flatMap((r) => isObject(r) ? Object.keys(r) : [])));
                return (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <label style={{ fontWeight: 700 }}>{k}</label>
                    <div style={{ overflowX: "auto" }}>
                      <table className="table">
                        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}<th>Action</th></tr></thead>
                        <tbody>
                          {(data[k] || []).map((row, ri) => (
                            <tr key={ri}>
                              {cols.map((col) => (
                                <td key={col}><input value={row && row[col] != null ? String(row[col]) : ""} onChange={(e) => {
                                  setData(prev => { const copy = deepClone(prev); copy[k][ri][col] = e.target.value; return copy; });
                                }} /></td>
                              ))}
                              <td><button className="btn small" onClick={() => setData(prev => { const copy = deepClone(prev); copy[k].splice(ri,1); return copy; })}>Delete</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ marginTop: 8 }}><button className="btn" onClick={() => setData(prev => { const copy = deepClone(prev); const first = copy[k][0] || {}; const newRow = Object.fromEntries(Object.keys(first).map(p => [p, ""])); copy[k].push(newRow); return copy; })}>Add row</button></div>
                    </div>
                  </div>
                );
              }

              if (isObject(val)) {
                // nested object: show nested key/value inputs (one level)
                const nestedKeys = Object.keys(val);
                return (
                  <div key={k} style={{ marginBottom: 8 }}>
                    <label style={{ fontWeight: 700 }}>{k}</label>
                    <div style={{ paddingLeft: 8 }}>
                      {nestedKeys.map((nk) => (
                        <div key={nk} style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>{nk}</div>
                          <input value={data[k][nk] != null ? String(data[k][nk]) : ""} onChange={(e) => setObjValue(`${k}.${nk}`, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // primitive
              return (
                <div key={k} style={{ marginBottom: 8 }}>
                  <label style={{ fontWeight: 700 }}>{k}</label>
                  <input value={data[k] == null ? "" : String(data[k])} onChange={(e) => setObjValue(k, e.target.value)} />
                </div>
              );
            })}
          </div>

          <div className="modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  // fallback: primitive editor
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>Edit: {title}</h3>
        </div>
        <div className="modal-body">
          <input value={String(data || "")} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
