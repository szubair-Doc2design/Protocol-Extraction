import React, { useState, useRef, useEffect } from "react";
import Panel from "../components/Panel";
import TablePanel from "../components/TablePanel";
import KeyValuePanel from "../components/KeyValuePanel";
import StatsBar from "../components/StatsBar";
import { deepClone, countFields } from "../utils";
import { useNavigate } from "react-router-dom";
import "../styles.css";

const SESSION_KEY = "protocolDataSession";

/** Safely parse JSON strings (also strips ``` fences if present) */
function tryParseJsonString(val) {
  if (typeof val !== "string") return null;
  let s = val.trim();
  if (!s) return null;
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-zA-Z0-9_-]*\n?/, "");
    s = s.replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Recursively normalize embedded JSON strings */
function normalizeProtocolData(obj) {
  if (Array.isArray(obj)) return obj.map(normalizeProtocolData);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") {
        const parsed = tryParseJsonString(v);
        out[k] = parsed !== null ? normalizeProtocolData(parsed) : v;
      } else {
        out[k] = normalizeProtocolData(v);
      }
    }
    return out;
  }
  return obj;
}

/** Force columns for Visit Schedule–like keys */
function columnsForKey(key) {
  const k = (key || "").toLowerCase().replace(/\s+/g, "");
  if (
    (k.includes("visit") && k.includes("schedule")) ||
    ["visitschedule", "visitschedules", "visit_schedule"].includes(k)
  ) {
    return ["Visit", "VisitWeek", "VisitType", "VisitCalculatedFrom", "KitType"];
  }
  return null;
}

export default function Dashboard() {
  const [protocol, setProtocol] = useState(null);
  const [panelsOpen, setPanelsOpen] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [editingInitial, setEditingInitial] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [builtOn, setBuiltOn] = useState("");
  const fileInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/protocol")
      .then((res) => {
        if (!res.ok) throw new Error("No protocol data");
        return res.json();
      })
      .then((data) => {
        const cleaned = normalizeProtocolData(data);
        setProtocol(cleaned);
        const openObj = {};
        Object.keys(cleaned).forEach((k) => (openObj[k] = true));
        setPanelsOpen(openObj);
      })
      .catch(() => {
        try {
          const saved = sessionStorage.getItem(SESSION_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setProtocol(parsed);
            const openObj = {};
            Object.keys(parsed).forEach((k) => (openObj[k] = true));
            setPanelsOpen(openObj);
          }
        } catch {}
      });
  }, []);

  function persistProtocol(newProtocol) {
    setProtocol(newProtocol);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newProtocol));
    } catch {}
    fetch("/api/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProtocol),
    }).then((res) => {
      if (res.ok) setSuccessMsg("✅ Protocol data saved to backend");
    });
  }

  // ✅ FIXED: Upload JSON file as raw JSON, not FormData
  function handleFileLoad(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const jsonData = JSON.parse(text);

        const res = await fetch("/api/protocol/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jsonData),
        });

        if (!res.ok) throw new Error("Upload failed");
        const result = await res.json();

        if (result.success) {
          persistProtocol(jsonData);
          const openObj = {};
          Object.keys(jsonData).forEach((k) => (openObj[k] = true));
          setPanelsOpen(openObj);
          setSuccessMsg("✅ JSON uploaded successfully");
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (err) {
        console.error("Upload error:", err);
        alert("Failed to upload JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e) {
    handleFileLoad(e.target.files?.[0]);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFileLoad(f);
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function togglePanel(key) {
    setPanelsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function expandAll() {
    if (!protocol) return;
    const openObj = {};
    Object.keys(protocol).forEach((k) => (openObj[k] = true));
    setPanelsOpen(openObj);
  }

  function collapseAll() {
    if (!protocol) return;
    const openObj = {};
    Object.keys(protocol).forEach((k) => (openObj[k] = false));
    setPanelsOpen(openObj);
  }

  function clearJson() {
    setProtocol(null);
    setPanelsOpen({});
    setEditingKey(null);
    setEditingInitial(null);
    setSuccessMsg("");
    setBuiltOn("");
    sessionStorage.removeItem(SESSION_KEY);
    fetch("/api/protocol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  function handleEditSection(sectionKey, value) {
    if (sectionKey === "Schema") return;
    setEditingKey(sectionKey);
    setEditingInitial(deepClone(value));
  }

  function handleSaveEditing(sectionKey, updated) {
    const next = deepClone(protocol || {});
    next[sectionKey] = updated;
    persistProtocol(next);
    setEditingKey(null);
    setEditingInitial(null);
  }

  function renderSection(value, keyName) {
    if (Array.isArray(value)) {
      return <TablePanel rows={value} columns={columnsForKey(keyName)} />;
    }
    if (value && typeof value === "object") {
      return <KeyValuePanel obj={value} />;
    }
    return <div>{value}</div>;
  }

  const stats = protocol ? countFields(protocol) : { total: 0, filled: 0 };

  function goToRtsm() {
    if (!builtOn) {
      alert("Please select whether this study is built on Pulse or Elosity.");
      return;
    }
    const protocolNumber =
      protocol?.["Protocol"] ||
      protocol?.["Protocol Number"] ||
      protocol?.ProtocolNumber ||
      "";
    const protocolDescription =
      protocol?.["Protocol Description"] ||
      protocol?.ProtocolDescription ||
      protocol?.description ||
      "";
    navigate("/rtsm-info", {
      state: { protocolNumber, protocolDescription, builtOn },
    });
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(to right, #1a3c6e, #2196f3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              height: 40,
              cursor: "pointer",
              background: "#fff",
              borderRadius: 4,
              padding: 4,
            }}
            onClick={clearJson}
          />
          <h2 style={{ margin: 0, color: "white" }}>
            Protocol Extraction Dashboard
          </h2>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn accent"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
          <button className="btn" onClick={expandAll} disabled={!protocol}>
            Expand All
          </button>
          <button className="btn" onClick={collapseAll} disabled={!protocol}>
            Collapse All
          </button>
          <button className="btn danger" onClick={clearJson} disabled={!protocol}>
            Clear JSON
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ textAlign: "center", color: "green", marginTop: 10 }}>
          {successMsg}
        </div>
      )}

      {!protocol && (
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <h3>Please upload a JSON file to view protocol details.</h3>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #2196f3",
              borderRadius: "6px",
              padding: "40px",
              margin: "20px auto",
              width: "50%",
              background: "#f9f9f9",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Drag & drop a JSON file here or click to choose
            </div>
            <div className="small-muted">
              Drop a file or click to upload your protocol JSON
            </div>
          </div>
        </div>
      )}

      {protocol && (
        <div className="container">
          {Object.keys(protocol).map((k) => (
            <Panel
              key={k}
              title={k}
              open={!!panelsOpen[k]}
              onToggle={() => togglePanel(k)}
              onEdit={
                k === "Schema" ? undefined : () => handleEditSection(k, protocol[k])
              }
              hideEdit={k === "Schema"}
            >
              {editingKey === k ? (
                <div style={{ marginBottom: 12 }}>
                  <InlineEditor
                    sectionKey={k}
                    initialData={editingInitial}
                    onSave={(val) => handleSaveEditing(k, val)}
                    onCancel={() => {
                      setEditingKey(null);
                      setEditingInitial(null);
                    }}
                  />
                </div>
              ) : null}
              {renderSection(protocol[k], k)}
            </Panel>
          ))}

          <div style={{ marginTop: 18 }}>
            <StatsBar total={stats.total} filled={stats.filled} />
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontWeight: 600 }}>
              Is this study going to be built on Pulse or Elosity?
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={builtOn === "Pulse"}
                onChange={() => setBuiltOn("Pulse")}
              />
              Pulse
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={builtOn === "Elosity"}
                onChange={() => setBuiltOn("Elosity")}
              />
              Elosity
            </label>
          </div>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button
              className="btn primary"
              onClick={goToRtsm}
              disabled={!builtOn}
            >
              Required RTSM Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Recursive Inline Editor with Safe Path Update and Add Row */
function InlineEditor({ sectionKey, initialData, onSave, onCancel }) {
  const [data, setData] = React.useState(() => deepClone(initialData));

  function updateAtPath(copy, path, newValue) {
    let target = copy;
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    target[path[path.length - 1]] = newValue;
  }

  function renderField(value, path) {
    if (Array.isArray(value)) {
      const cols = Array.from(
        new Set(
          value.flatMap((r) =>
            typeof r === "object" ? Object.keys(r) : []
          )
        )
      );
      return (
        <div style={{ marginLeft: 12 }}>
          <table className="table">
            <thead>
              <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {value.map((row, ri) => (
                <tr key={ri}>
                  {cols.map((c) => (
                    <td key={c}>
                      {typeof row[c] === "object" ? (
                        renderField(row[c], [...path, ri, c])
                      ) : (
                        <input
                          value={row[c] ?? ""}
                          onChange={(e) => {
                            const copy = deepClone(data);
                            updateAtPath(copy, [...path, ri, c], e.target.value);
                            setData(copy);
                          }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="btn small"
            onClick={() => {
              const copy = deepClone(data);
              const target = path.reduce((acc, key) => acc[key], copy);
              target.push({});
              setData(copy);
            }}
          >
            + Add Row
          </button>
        </div>
      );
    }

    if (typeof value === "object" && value !== null) {
      return (
        <div style={{ marginLeft: 12 }}>
          {Object.entries(value).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 6 }}>
              <label style={{ fontWeight: "bold", marginRight: 6 }}>{k}:</label>
              {renderField(v, [...path, k])}
            </div>
          ))}
        </div>
      );
    }

    return (
      <input
        value={value ?? ""}
        onChange={(e) => {
          const copy = deepClone(data);
          updateAtPath(copy, path, e.target.value);
          setData(copy);
        }}
        style={{ padding: 4, width: "60%" }}
      />
    );
  }

  return (
    <div style={{ padding: 12, background: "#fff", border: "1px solid #ddd" }}>
      <h3>{sectionKey} - Edit</h3>
      {renderField(data, [])}
      <div style={{ marginTop: 10 }}>
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" onClick={() => onSave(data)}>
          Save
        </button>
      </div>
    </div>
  );
}
