import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

// Simple switch component that looks like a slider toggle
function Switch({ checked, onChange }) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="slider"></span>
    </label>
  );
}

export default function InventoryAndDefaults() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goBack = () => navigate("/roles-access");
  const goNext = () => navigate("/drug-ordering-resupply");

  const updateRow = (rows, setRows, idx, field, value) => {
    const copy = [...rows];
    copy[idx][field] = value;
    setRows(copy);
  };
  const deleteRow = (rows, setRows, idx) => {
    const copy = [...rows];
    copy.splice(idx, 1);
    setRows(copy);
  };

  const [studyRows, setStudyRows] = useState([]);
  const [siteRows, setSiteRows] = useState([]);
  const [invRows, setInvRows] = useState([]);
  const [supplyRows, setSupplyRows] = useState([]);
  const [returnRows, setReturnRows] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // <-- FIXED: use relative path so it works on Vercel and locally
        const res = await fetch("/api/inventory-defaults");
        if (res.ok) {
          const data = await res.json();
          setStudyRows(data.studyRows ?? []);
          setSiteRows(data.siteRows ?? []);
          setInvRows(data.invRows ?? []);
          setSupplyRows(data.supplyRows ?? []);
          setReturnRows(data.returnRows ?? []);
        } else {
          // fall back to local defaults if API response not ok
          setStudyRows([
            { data: "Study-Wide Drug Receipt", default: "On", limit: "N/A" },
            { data: "Study-Wide Subject Kit Replacement", default: "On", limit: "N/A" },
            { data: "Study-Wide Screening", default: "On", limit: "N/A" },
            { data: "Study-Wide Rescreening", default: "On", limit: "N/A" },
            { data: "Study-Wide Enrollment", default: "On", limit: "N/A" },
            { data: "Study-Wide Randomization", default: "On", limit: "N/A" },
            { data: "Study-Wide Subject Visit", default: "On", limit: "N/A" },
            { data: "Study-Wide Repriming Visit", default: "On", limit: "N/A" },
            { data: "Study-Wide Screen Fail", default: "On", limit: "N/A" },
            { data: "Study-Wide Treatment Discontinuation", default: "On", limit: "N/A" },
            { data: "Screening Limit - Study Wide", default: "999", limit: "Yes" },
            { data: "Enrollment Limit - Study Wide", default: "999", limit: "Yes" },
            { data: "Randomization Limit - Study Wide", default: "999", limit: "Yes" },
            { data: "Lookout Days", default: "21", limit: "N/A" },
            { data: "Additional Lookout Days", default: "42", limit: "N/A" },
          ]);
          setSiteRows([
            { data: "Screening Limit – Site", default: "100", limit: "Yes" },
            { data: "Enrollment Limit – Site", default: "100", limit: "Yes" },
            { data: "Randomization Limit – Site", default: "100", limit: "Yes" },
          ]);
          setInvRows([
            { data: "Lookout Days", default: "21" },
            { data: "Additional Lookout Days", default: "42" },
            { data: "Predictive Resupply Drug Ordering Interval", default: "Daily" },
            { data: "Predictive Resupply Drug Ordering Time of Day", default: "10:30 PM PST" },
            { data: "Do Not Ship", default: "See req. ‘EP-INVTRY-001: Drug Types’" },
            { data: "Do Not Include", default: "See req. ‘EP-INVTRY-001: Drug Types’" },
            { data: "Do Not Dispense", default: "See req. ‘EP-INVTRY-001: Drug Types’" },
            { data: "Threshold Parameters", default: "See req. ‘EP-INVTRY-003: Drug Ordering and Automated Resupply’" },
          ]);
          setSupplyRows([
            {
              depotId: "01",
              location: "Almac UK",
              shipsCountries: "Spain, Denmark, France, Germany",
              shipsDepots: "All",
              drugRelease: "Web Function or Manual Shipment",
              integration: "Almac",
              address: `Almac Clinical Services
9 Chalrestown Road
Seagoes Industrial Estate
Craigavon
Northern Ireland
BT63 5PW
United Kingdom
T +44 (0) 2838 365201
uklogistics.clinicalservices@almacgroup.com`,
            },
            {
              depotId: "02",
              location: "Almac US",
              shipsCountries: "United States",
              shipsDepots: "All",
              drugRelease: "Web Function or Manual Shipment",
              integration: "Almac",
              address: `Almac Clinical Services
25 Fretz Road
Souderton
Pennsylvania 18964
USA
T +1 (267) 382 9403
palogistics.clinicalservices@almacgroup.com`,
            },
          ]);
          setReturnRows([
            {
              depotId: "98",
              location: "Almac US Returns",
              shipsCountries: "United States",
              address: `Almac Clinical Services
4204 Technology Drive
Durham, NC 27704
Tel: +1 919 479 8850`,
            },
            {
              depotId: "99",
              location: "Almac UK Returns",
              shipsCountries: "Spain, Denmark, France, Germany",
              address: `Almac Clinical Services
9 Chalrestown Road
Seagoes Industrial Estate
Craigavon
Northern Ireland
BT63 5PW`,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load inventory defaults", err);
      }
    }
    fetchData();
  }, []);

  const saveAll = async () => {
    try {
      const data = { studyRows, siteRows, invRows, supplyRows, returnRows };

      // <-- FIXED: use relative path to work on Vercel deploys
      const res = await fetch("/api/inventory-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        alert("Inventory & Default Parameters saved!");
      } else {
        const errText = await res.text();
        alert("Save failed: " + errText);
      }
    } catch (err) {
      alert("Save error: " + err.message);
    }
  };

  return (
    <div className="rtsm-page" style={{ paddingBottom: 80 }}>
      <div className="rtsm-header-bar">
        <div className="rtsm-header-left">
          <img src="/logo.png" alt="Logo" className="rtsm-logo" onClick={goBack} />
          <h2 className="rtsm-header-title">Inventory & Default Parameters</h2>
        </div>
      </div>

      <SectionTable
        title="Study Level Parameters Summary"
        note="These values are considering the default values at system go-live."
        columns={["Data", "Default Value", "Milestone Limit Alert", "Editable via UI (Select one)"]}
        rows={studyRows}
        setRows={setStudyRows}
        hasLimit
        editableUI
      />

      <SectionTable
        title="Site Level Parameters Summary"
        note="These values are considering the default values at system go-live."
        columns={["Data", "Default Value", "Milestone Limit Alert", "Editable via UI"]}
        rows={siteRows}
        setRows={setSiteRows}
        hasLimit
        editableUI
      />

      <SectionTable
        title="Inventory Parameters Summary"
        note="These values are considering the default values at system go-live."
        columns={["Data", "Default Value", "Editable via UI"]}
        rows={invRows}
        setRows={setInvRows}
        editableUI
      />

      <div className="rtsm-section">
        <div className="rtsm-section-header blue-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="section-title">Supply Depot Information</h3>
          <button className="rtsm-btn small" onClick={() => setSupplyRows([...supplyRows, { depotId: "", location: "", shipsCountries: "", shipsDepots: "", drugRelease: "", integration: "", address: "" }])}>+ Add Row</button>
        </div>
        <div className="table-wrapper">
          <table className="rtsm-table wide-table">
            <thead>
              <tr>
                <th>Depot ID</th>
                <th>Depot Location & Displayed Name</th>
                <th>Ships to the following Sites (Country)</th>
                <th>Ships to the following Depots (Depot Number)</th>
                <th>Drug Release Method</th>
                <th>Integration Information</th>
                <th>Depot Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {supplyRows.map((r, i) => (
                <tr key={i}>
                  <td><input value={r.depotId} onChange={(e) => updateRow(supplyRows, setSupplyRows, i, "depotId", e.target.value)} /></td>
                  <td><input value={r.location} onChange={(e) => updateRow(supplyRows, setSupplyRows, i, "location", e.target.value)} /></td>
                  <td><input value={r.shipsCountries} onChange={(e) => updateRow(supplyRows, setSupplyRows, i, "shipsCountries", e.target.value)} /></td>
                  <td><input value={r.shipsDepots} onChange={(e) => updateRow(supplyRows, setSupplyRows, i, "shipsDepots", e.target.value)} /></td>
                  <td><input value={r.drugRelease} onChange={(e) => updateRow(supplyRows, setSupplyRows, i, "drugRelease", e.target.value)} /></td>
                  <td><input value={r.integration} onChange={(e) => updateRow(supplyRows, setSupplyRows, i, "integration", e.target.value)} /></td>
                  <td><textarea className="address-box" rows={6} value={r.address} onChange={(e) => updateRow(supplyRows, setSupplyRows, i, "address", e.target.value)} /></td>
                  <td><button className="rtsm-btn danger small" onClick={() => deleteRow(supplyRows, setSupplyRows, i)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rtsm-section">
        <div className="rtsm-section-header blue-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 30 }}>
          <h3 className="section-title">Return Depot Information (Drug Destruction Facility – DDF)</h3>
          <button className="rtsm-btn small" onClick={() => setReturnRows([...returnRows, { depotId: "", location: "", shipsCountries: "", address: "" }])}>+ Add Row</button>
        </div>
        <div className="table-wrapper">
          <table className="rtsm-table wide-table">
            <thead>
              <tr>
                <th>Return Depot ID</th>
                <th>Return Depot Location & Displayed Name</th>
                <th>Receives Return Shipments from Sites in the following Countries</th>
                <th>Depot Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {returnRows.map((r, i) => (
                <tr key={i}>
                  <td><input value={r.depotId} onChange={(e) => updateRow(returnRows, setReturnRows, i, "depotId", e.target.value)} /></td>
                  <td><input value={r.location} onChange={(e) => updateRow(returnRows, setReturnRows, i, "location", e.target.value)} /></td>
                  <td><input value={r.shipsCountries} onChange={(e) => updateRow(returnRows, setReturnRows, i, "shipsCountries", e.target.value)} /></td>
                  <td><textarea className="address-box" rows={6} value={r.address} onChange={(e) => updateRow(returnRows, setReturnRows, i, "address", e.target.value)} /></td>
                  <td><button className="rtsm-btn danger small" onClick={() => deleteRow(returnRows, setReturnRows, i)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          bottom: 0,
          width: "100%",
          backgroundColor: "#f5f5f5",
          borderTop: "1px solid #ddd",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          zIndex: 1000,
          boxShadow: "0 -2px 5px rgba(0,0,0,0.1)"
        }}
      >
        <button className="rtsm-btn" onClick={goBack}>← Back</button>
        <button className="rtsm-btn primary" onClick={saveAll}>Save</button>
        <button className="rtsm-btn" onClick={goNext}>Next Page →</button>
      </div>
      {/* Add switch component styles: */}
      <style>
        {`
          .switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 22px;
          }
          .switch input { display:none; }
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #ccc;
            border-radius: 22px;
            transition: .4s;
          }
          .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 2px;
            bottom: 2px;
            border-radius: 100%;
            background-color: white;
            transition: .4s;
          }
          input:checked + .slider {
            background-color: #2196F3;
          }
          input:checked + .slider:before {
            transform: translateX(18px);
          }
        `}
      </style>
    </div>
  );
}

function SectionTable({ title, note, columns, rows, setRows, hasLimit = false, editableUI = false }) {
  const updateRow = (idx, field, value) => {
    const copy = [...rows];
    copy[idx][field] = value;
    setRows(copy);
  };

  return (
    <section className="rtsm-section">
      <div className="rtsm-section-header blue-header">
        <h3 className="section-title">{title}</h3>
      </div>
      {note && <div className="rtsm-note">{note}</div>}
      <table className="rtsm-table wide-table">
        <thead>
          <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.data}</td>
              <td>
                {r.default === "On" || r.default === "Off" ? (
                  <Switch
                    checked={r.default === "On"}
                    onChange={checked =>
                      updateRow(i, "default", checked ? "On" : "Off")
                    }
                  />
                ) : (
                  <input
                    value={r.default}
                    onChange={e => updateRow(i, "default", e.target.value)}
                  />
                )}
              </td>
              {hasLimit && (
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={r.limit === "Yes"}
                      onChange={() => updateRow(i, "limit", "Yes")}
                    />{" "}
                    Yes
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={r.limit === "No"}
                      onChange={() => updateRow(i, "limit", "No")}
                    />{" "}
                    No
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={r.limit === "N/A"}
                      onChange={() => updateRow(i, "limit", "N/A")}
                    />{" "}
                    N/A
                  </label>
                </td>
              )}
              {editableUI && (
                <td>
                  <label>
                    <input type="checkbox" /> Manage Study Parameters
                  </label>
                  <label>
                    <input type="checkbox" /> Site Management
                  </label>
                  <label>
                    <input type="checkbox" /> Manage DNX Parameters
                  </label>
                  <label>
                    <input type="checkbox" /> Manage DND Parameters
                  </label>
                  <label>
                    <input type="checkbox" /> Manage Threshold Parameters
                  </label>
                  <label>
                    <input type="checkbox" /> Not Editable
                  </label>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
