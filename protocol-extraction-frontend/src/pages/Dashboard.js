// src/pages/Dashboard.js
import React, { useState, useRef, useEffect } from "react";
import Panel from "../components/Panel";
import TablePanel from "../components/TablePanel";
import KeyValuePanel from "../components/KeyValuePanel";
import StatsBar from "../components/StatsBar";
import { deepClone, countFields } from "../utils";
import { useNavigate } from "react-router-dom";
import "../styles.css";

const SESSION_KEY = "protocolDataSession";
// Point this to your backend
const API_BASE = "https://protocol-extraction.onrender.com";

/** More robust JSON extractor:
 *  - strips triple-backtick fences
 *  - strips leading "json", "json:" etc.
 *  - attempts full-string parse first, then tries to extract {...} or [...]
 */
function tryParseJsonString(val) {
  if (typeof val !== "string") return null;
  let s = val.trim();
  if (!s) return null;

  // strip triple-backtick fenced blocks (``` or ```json)
  if (/^```/.test(s)) {
    s = s.replace(/^```[\s\S]*?\n?/, ""); // remove opening fence + optional language
    s = s.replace(/\n?```$/, ""); // remove trailing fence
    s = s.trim();
  }

  // strip leading "json", "json:" or "JSON -"
  s = s.replace(/^\s*(?:json|JSON)\s*[:\-]?\s*/i, "").trim();

  // try full parse
  try {
    return JSON.parse(s);
  } catch (e) {
    // fallback: find first { or [ and last matching } or ] and try that substring
    const startIdx = s.search(/[\{\[]/);
    if (startIdx !== -1) {
      const lastCurly = s.lastIndexOf("}");
      const lastSquare = s.lastIndexOf("]");
      const endIdx = Math.max(lastCurly, lastSquare);
      if (endIdx > startIdx) {
        const candidate = s.slice(startIdx, endIdx + 1);
        try {
          return JSON.parse(candidate);
        } catch (err) {
          return null;
        }
      }
    }
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

/** Replace placeholder values (including "?") with TBC-Client for display */
function normalizeUnknownForDisplay(val) {
  if (val === null || val === undefined) return "TBC-Client";
  if (typeof val === "string" && val.trim() === "") return "TBC-Client";
  if (typeof val === "string" && val.trim() === "?") return "TBC-Client";
  // preserve existing booleans and numbers and arrays/objects
  return val;
}

/** Transform object for display:
 *  - replace unknowns with TBC-Client
 *  - apply desired key ordering for General section
 */
function transformObjectForDisplay(obj, sectionKey) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  // requested ordering for General:
  const generalOrder = [
    "Client Name",
    "Protocol",
    "Protocol Description",
    "Study Blind Type",
    "Most Recent Protocol Version Utilized to Generate Requirements",
    "Is this an Extension Study",
    "Is this a Rollover Study",
    "Open Label",
  ];

  // create map of keys -> values (with nested normalization)
  const normalizedMap = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (typeof v === "string") {
      const parsed = tryParseJsonString(v);
      normalizedMap[k] = parsed !== null ? normalizeProtocolData(parsed) : v;
    } else {
      normalizedMap[k] = v;
    }
  });

  // If General, add keys in requested order first (if present)
  if (sectionKey === "General") {
    for (const key of generalOrder) {
      if (Object.prototype.hasOwnProperty.call(normalizedMap, key)) {
        // apply unknown replacement for primitives
        const val = normalizedMap[key];
        out[key] = typeof val === "object" && val !== null ? val : normalizeUnknownForDisplay(val);
      }
    }
  }

  // then append remaining keys alphabetically
  const remainingKeys = Object.keys(normalizedMap).filter((k) => !(sectionKey === "General" && generalOrder.includes(k)));
  remainingKeys.sort((a, b) => a.localeCompare(b));
  for (const key of remainingKeys) {
    const val = normalizedMap[key];
    out[key] = typeof val === "object" && val !== null ? val : normalizeUnknownForDisplay(val);
  }

  return out;
}

/**
 * Inline editor used for section-level editing.
 * - Shows editable key/value rows for top-level objects
 * - boolean / Yes/No appear as toggles
 * - nested objects/arrays show a small preview and an "Edit JSON" button that opens an inline textarea for that field
 * - arrays of objects can be edited via per-item edit or as full-array JSON
 */
function InlineEditSection({ value, onSave, onCancel, sectionKey }) {
  // Parse possible JSON-like string values so we edit actual objects where possible
  const initialParsed = tryParseJsonString(value);
  const initial = initialParsed !== null ? deepClone(initialParsed) : (typeof value === "object" && value !== null ? deepClone(value) : value);

  const [data, setData] = useState(initial);
  const [editingNested, setEditingNested] = useState(null); // either { key } or { index } for array items
  const [nestedText, setNestedText] = useState("");

  // Helpers
  function updateField(key, val) {
    setData((prev) => ({ ...prev, [key]: val }));
  }
  function toggleBoolField(key) {
    const cur = data[key];
    if (typeof cur === "boolean") {
      updateField(key, !cur);
    } else if (typeof cur === "string" && /^(yes|no)$/i.test(cur)) {
      updateField(key, /^yes$/i.test(cur) ? "No" : "Yes");
    } else {
      updateField(key, !cur);
    }
  }

  /* Nested editing functions */
  function openNestedEditorForKey(key) {
    setEditingNested({ type: "key", key });
    const payload = data[key];
    setNestedText(JSON.stringify(payload, null, 2));
  }

  function openNestedEditorForArrayIndex(index) {
    setEditingNested({ type: "index", index });
    const payload = data[index];
    setNestedText(JSON.stringify(payload, null, 2));
  }

  function openNestedEditorForWholeArray() {
    setEditingNested({ type: "array" });
    setNestedText(JSON.stringify(data, null, 2));
  }

  function saveNestedEditor() {
    try {
      const parsed = tryParseJsonString(nestedText) ?? JSON.parse(nestedText);
      if (editingNested?.type === "key") {
        setData((prev) => ({ ...prev, [editingNested.key]: parsed }));
      } else if (editingNested?.type === "index") {
        setData((prev) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          copy[editingNested.index] = parsed;
          return copy;
        });
      } else if (editingNested?.type === "array") {
        setData(parsed);
      }
      setEditingNested(null);
      setNestedText("");
    } catch (err) {
      alert("Invalid JSON: " + (err?.message || err));
    }
  }

  function cancelNestedEditor() {
    setEditingNested(null);
    setNestedText("");
  }

  function handleTopSave() {
    onSave(data);
  }

  // If the entire section is an array
  if (Array.isArray(data)) {
    // show per-item summaries, edit buttons, and also "Edit JSON" for full array
    return (
      <div style={{ padding: 12, background: "#fafafa", borderRadius: 6 }}>
        <div style={{ marginBottom: 10 }}>
          <strong>Array editor ({data.length} items)</strong>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {data.map((item, idx) => (
            <div key={idx} style={{ padding: 8, border: "1px solid #eee", borderRadius: 6, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>Item {idx + 1}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn small" onClick={() => openNestedEditorForArrayIndex(idx)}>Edit</button>
                  <button
                    className="btn small danger"
                    onClick={() =>
                      setData((prev) => {
                        const copy = [...prev];
                        copy.splice(idx, 1);
                        return copy;
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                {typeof item === "object" && item !== null ? (
                  // show a KeyValuePanel preview — transform unknowns for display
                  <KeyValuePanel obj={transformObjectForDisplay(item, sectionKey)} />
                ) : (
                  <div>{String(normalizeUnknownForDisplay(item))}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() =>
              setData((prev) => {
                const copy = Array.isArray(prev) ? [...prev] : [];
                copy.push({});
                return copy;
              })
            }
          >
            Add item
          </button>

          <button className="btn" onClick={openNestedEditorForWholeArray}>Edit JSON</button>
        </div>

        {editingNested && (
          <div style={{ marginTop: 12 }}>
            <textarea
              rows={12}
              value={nestedText}
              onChange={(e) => setNestedText(e.target.value)}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 13, padding: 8 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn" onClick={cancelNestedEditor}>Cancel</button>
              <button className="btn primary" onClick={saveNestedEditor}>Save</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={handleTopSave}>Save</button>
        </div>
      </div>
    );
  }

  // If primitive string / number
  if (typeof data !== "object" || data === null) {
    const textVal = data == null ? "" : String(data);
    return (
      <div style={{ padding: 12, background: "#fafafa", borderRadius: 6 }}>
        <textarea
          rows={8}
          value={textVal}
          onChange={(e) => setData(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 13, padding: 8 }}
        />
        <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" onClick={() => onSave(data)}>Save</button>
        </div>
      </div>
    );
  }

  // Object: show key/value editor with toggles for yes/no/boolean and nested edit for complex
  const entries = Object.entries(data);

  return (
    <div style={{ padding: "12px", background: "#fafafa", borderRadius: 6 }}>
      {entries.map(([key, val]) => {
        const isBool = typeof val === "boolean" || (typeof val === "string" && /^(yes|no)$/i.test(val));
        const isComplex = typeof val === "object" && val !== null;
        // For primitive display we keep raw (but convert unknown placeholders to TBC-Client)
        const displayValue = isComplex ? (Array.isArray(val) ? `${val.length} item(s)` : "Object") : String(normalizeUnknownForDisplay(val));

        return (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ width: "40%", fontWeight: 600 }}>{key}</div>

            <div style={{ width: "58%", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              {editingNested && editingNested.type === "key" && editingNested.key === key ? (
                <div style={{ width: "100%" }}>
                  <textarea
                    rows={8}
                    value={nestedText}
                    onChange={(e) => setNestedText(e.target.value)}
                    style={{ width: "100%", fontFamily: "monospace", fontSize: 13, padding: 8 }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                    <button className="btn" onClick={cancelNestedEditor}>Cancel</button>
                    <button className="btn primary" onClick={saveNestedEditor}>Save</button>
                  </div>
                </div>
              ) : isBool ? (
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={typeof val === "boolean" ? val : /^yes$/i.test(String(val))}
                    onChange={() => toggleBoolField(key)}
                  />
                  <span style={{ minWidth: 120, textAlign: "left" }}>{typeof val === "boolean" ? (val ? "On" : "Off") : String(val)}</span>
                </label>
              ) : isComplex ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 13, color: "#444", padding: "6px 8px", background: "#fff", border: "1px solid #e6e6e6", borderRadius: 4, minWidth: 180, textAlign: "right" }}>
                    {displayValue}
                  </div>
                  <button className="btn" onClick={() => openNestedEditorForKey(key)}>Edit JSON</button>
                </div>
              ) : (
                <input
                  type="text"
                  value={displayValue}
                  onChange={(e) => updateField(key, e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #ccc" }}
                />
              )}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={handleTopSave}>Save</button>
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
    // clear the input so same file can be reselected later
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
    // Reset to upload step
    setProtocol(null);
    setPanelsOpen({});
    setEditingKey(null);
    setEditingInitial(null);
    setSuccessMsg("");
    setBuiltOn("");
    sessionStorage.removeItem(SESSION_KEY);
    // Post an empty payload to backend to clear server copy (keeps behavior)
    fetch(`${API_BASE}/api/protocol`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      mode: "cors",
    }).catch(() => {
      // ignore
    });
  }

  function handleEditSection(sectionKey, value) {
    if (sectionKey === "Schema") return;
    // Try to parse if the value is a JSON-like string so we present a structured editor
    const parsed = tryParseJsonString(value);
    const initial = parsed !== null ? deepClone(parsed) : deepClone(value);
    setEditingKey(sectionKey);
    setEditingInitial(initial);
  }

  function handleSaveEditing(sectionKey, updated) {
    const next = deepClone(protocol || {});
    // Ensure we do not lose data for other sections
    next[sectionKey] = updated;
    persistProtocol(next);
    setEditingKey(null);
    setEditingInitial(null);
  }

  // Render helpers
  function renderArrayOfObjects(arr, keyName) {
    // Render list of KeyValuePanel items for readability
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {arr.map((item, i) => (
          <div key={i} style={{ padding: 8, border: "1px solid #f0f0f0", background: "#fff", borderRadius: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>Item {i + 1}</div>
              <div>
                {/* inline edit triggers will open the section-level editor which replaces section content */}
                <button className="btn small" onClick={() => handleEditSection(`${keyName}::${i}`, item)}>Edit</button>
              </div>
            </div>
            <KeyValuePanel obj={transformObjectForDisplay(item, keyName)} />
          </div>
        ))}
      </div>
    );
  }

  function renderSection(value, keyName) {
    // if a string contains JSON, render the parsed object for display
    if (typeof value === "string") {
      const parsed = tryParseJsonString(value);
      if (parsed !== null) return renderSection(parsed, keyName);
    }

    // If editing a specially-addressed array item (keyName::index), handle it as full object editor
    if (editingKey && editingKey.startsWith(`${keyName}::`)) {
      // we opened edit for an array item — editingInitial holds the item
      return (
        <InlineEditSection
          value={editingInitial}
          onSave={(updated) => {
            // update the parent array in protocol
            const next = deepClone(protocol || {});
            const [parentKey, idxStr] = editingKey.split("::");
            const idx = Number(idxStr);
            if (!Array.isArray(next[parentKey])) next[parentKey] = [];
            next[parentKey][idx] = updated;
            persistProtocol(next);
            setEditingKey(null);
            setEditingInitial(null);
          }}
          onCancel={() => {
            setEditingKey(null);
            setEditingInitial(null);
          }}
          sectionKey={keyName}
        />
      );
    }

    if (editingKey === keyName) {
      // show inline editor inside the same section
      return (
        <InlineEditSection
          value={editingInitial}
          onSave={(updated) => handleSaveEditing(keyName, updated)}
          onCancel={() => {
            setEditingKey(null);
            setEditingInitial(null);
          }}
          sectionKey={keyName}
        />
      );
    }

    if (Array.isArray(value)) {
      // If array of objects, render per-item KeyValuePanel for readability
      if (value.length > 0 && value.every((el) => typeof el === "object" && el !== null)) {
        return renderArrayOfObjects(value, keyName);
      }
      // otherwise show a readable inline list for primitives
      return <div>{value.map((v, i) => <span key={i} style={{ marginRight: 8 }}>{String(normalizeUnknownForDisplay(v))}</span>)}</div>;
    }

    if (value && typeof value === "object") {
      // transform for display: replace ? with TBC-Client, and apply ordering for General
      const displayObj = transformObjectForDisplay(value, keyName);
      return <KeyValuePanel obj={displayObj} />;
    }

    return <div>{String(normalizeUnknownForDisplay(value))}</div>;
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
