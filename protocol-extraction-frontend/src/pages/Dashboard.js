import React, { useState, useRef, useEffect } from "react";
import Panel from "../components/Panel";
import TablePanel from "../components/TablePanel";
import KeyValuePanel from "../components/KeyValuePanel";
import StatsBar from "../components/StatsBar";
import { deepClone, countFields } from "../utils";
import { useNavigate } from "react-router-dom";
import "../styles.css";

const SESSION_KEY = "protocolDataSession";
const API_BASE = "https://protocol-extraction.onrender.com";

function tryParseJsonString(val) {
  if (typeof val !== "string") return null;
  let s = val.trim();
  if (!s) return null;
  if (s.startsWith("```")) {
    s = s.replace(/^```[\s\S]*?\n?/, "");
    s = s.replace(/\n?```$/, "");
    s = s.trim();
  }
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

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

// Inline editable section
function InlineEditSection({ value, onSave, onCancel }) {
  const [data, setData] = useState(() =>
    typeof value === "string" ? value : deepClone(value)
  );

  const handleInputChange = (key, val) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  const handleBoolToggle = (key) => {
    setData((prev) => ({
      ...prev,
      [key]:
        typeof prev[key] === "boolean"
          ? !prev[key]
          : /^yes$/i.test(String(prev[key]))
          ? "No"
          : "Yes",
    }));
  };

  const handleSave = () => {
    onSave(data);
  };

  // Render nicely formatted object
  if (typeof data === "object" && !Array.isArray(data)) {
    return (
      <div style={{ padding: "12px", background: "#fafafa", borderRadius: 6 }}>
        {Object.entries(data).map(([key, val]) => {
          const isBool =
            typeof val === "boolean" || /^(yes|no)$/i.test(String(val));
          return (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <div style={{ fontWeight: 500 }}>{key}</div>
              {isBool ? (
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={
                      typeof val === "boolean"
                        ? val
                        : /^yes$/i.test(String(val))
                    }
                    onChange={() => handleBoolToggle(key)}
                  />
                  <span className="slider round"></span>
                </label>
              ) : (
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  style={{
                    width: "50%",
                    padding: "4px 6px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />
              )}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 6 }}>
      <textarea
        value={data}
        onChange={(e) => setData(e.target.value)}
        rows={8}
        style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
      />
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
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
    fetch(`${API_BASE}/api/protocol`, { mode: "cors" })
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

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  function persistProtocol(newProtocol) {
    setProtocol(newProtocol);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newProtocol));
    } catch {}
    fetch(`${API_BASE}/api/protocol`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProtocol),
      mode: "cors",
    }).then((res) => {
      if (res.ok) setSuccessMsg("✅ Protocol data saved to backend");
    });
  }

  function handleFileLoad(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    fetch(`${API_BASE}/api/protocol/upload`, {
      method: "POST",
      body: formData,
      mode: "cors",
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Upload failed");
        }
        return res.json();
      })
      .then((result) => {
        if (result.success || /success/i.test(result.message || "")) {
          return fetch(`${API_BASE}/api/protocol`, { mode: "cors" })
            .then((r) => r.json())
            .then((data) => {
              const cleaned = normalizeProtocolData(data);
              persistProtocol(cleaned);
              const openObj = {};
              Object.keys(cleaned).forEach((k) => (openObj[k] = true));
              setPanelsOpen(openObj);
              setSuccessMsg("✅ JSON uploaded successfully");
            });
        }
        throw new Error(result.message || "Upload failed");
      })
      .catch((err) => {
        console.error("Upload error:", err);
        alert("Failed to upload JSON: " + (err?.message || err));
      });
  }

  function handleFileSelect(e) {
    handleFileLoad(e.target.files?.[0]);
    e.target.value = "";
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
    fetch(`${API_BASE}/api/protocol`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      mode: "cors",
    }).catch(() => {});
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
    if (editingKey === keyName) {
      return (
        <InlineEditSection
          value={editingInitial}
          onSave={(updated) => handleSaveEditing(keyName, updated)}
          onCancel={() => {
            setEditingKey(null);
            setEditingInitial(null);
          }}
        />
      );
    }

    if (Array.isArray(value)) {
      return <TablePanel rows={value} columns={columnsForKey(keyName)} />;
    }
    if (value && typeof value === "object") {
      return <KeyValuePanel obj={value} />;
    }
    return <div>{String(value)}</div>;
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
          <button className="btn accent" onClick={() => fileInputRef.current?.click()}>
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
              onEdit={k === "Schema" ? undefined : () => handleEditSection(k, protocol[k])}
              hideEdit={k === "Schema"}
            >
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
                type="radio"
                name="builtOn"
                checked={builtOn === "Pulse"}
                onChange={() => setBuiltOn("Pulse")}
              />
              Pulse
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="radio"
                name="builtOn"
                checked={builtOn === "Elosity"}
                onChange={() => setBuiltOn("Elosity")}
              />
              Elosity
            </label>
          </div>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button className="btn primary" onClick={goToRtsm} disabled={!builtOn}>
              Required RTSM Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
