// src/pages/RtsmInfo.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import countries from "../data/countries.json";
import "../rtsm.css";

const RTSM_KEY = "rtsmData";
const PROTOCOL_KEY = "protocolData";

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Check({ label, checked, onChange, disabled }) {
  return (
    <label className="rtsm-checkbox">
      <input type="checkbox" disabled={disabled} checked={!!checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Section({ id, title, children }) {
  return (
    <div className="rtsm-section" id={id}>
      <div className="rtsm-section-header blue-header">
        <h3 className="section-title">{title}</h3>
      </div>
      <table className="rtsm-table">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Universal Other input component to avoid repeating code
function OtherInput({ section, field, textField, label, isChecked, setChecked, form, setField, disabled }) {
  return (
    <span className="rtsm-checkbox" style={{ marginLeft: 12 }}>
      <label>
        <input
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          onChange={() => setChecked(section, field)}
        />
        {label}
      </label>
      {isChecked && (
        <input
          type="text"
          placeholder="Specify…"
          value={form[section]?.[textField] || ""}
          onChange={(e) => setField(section, textField, e.target.value)}
          style={{ marginLeft: 8 }}
        />
      )}
    </span>
  );
}

export default function RtsmInfo() {
  const navigate = useNavigate();
  const location = useLocation();

  const [editingSection, setEditingSection] = useState("*");
  const isSectionEditable = (id) => editingSection === "*" || editingSection === id;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const [protocolNumber, setProtocolNumber] = useState(location.state?.protocolNumber || "");
  const [protocolDescription, setProtocolDescription] = useState(location.state?.protocolDescription || "");
  const builtOn = location.state?.builtOn || "";

  const initProt = useRef(false);
  useEffect(() => {
    if (initProt.current) return;
    initProt.current = true;
    if (!protocolNumber || !protocolDescription) {
      const p = loadJSON(PROTOCOL_KEY);
      if (p) {
        const num =
          p["Protocol"] ||
          p["Protocol Number"] ||
          p.protocolNumber ||
          p.protocol ||
          "";
        const desc =
          p["Protocol Description"] ||
          p.ProtocolDescription ||
          p.description ||
          "";
        setProtocolNumber(protocolNumber || num);
        setProtocolDescription(protocolDescription || desc);
      }
    }
  }, [protocolNumber, protocolDescription]);

  const [form, setForm] = useState(() => loadJSON(RTSM_KEY) || {});

  const setField = (sec, field, val) =>
    setForm((pr) => ({ ...pr, [sec]: { ...(pr[sec] || {}), [field]: val } }));

  const toggle = (sec, field) =>
    setForm((pr) => ({
      ...pr,
      [sec]: { ...(pr[sec] || {}), [field]: !pr[sec]?.[field] },
    }));

  const toggleField = toggle;

  const unblindedRows = form.unblindedRows || [{ data: "n/a", max: "n/a" }];
  const updateUnblind = (i, k, v) => {
    const r = unblindedRows.map((row, idx) => (idx === i ? { ...row, [k]: v } : row));
    setForm((p) => ({ ...p, unblindedRows: r }));
  };
  const addUnblindRow = () =>
    setForm((p) => ({ ...p, unblindedRows: [...unblindedRows, { data: "", max: "" }] }));

  const worldNames = countries.map((c) => c.name.common).sort();
  const countryRows = form.countryRows || [
    { name: "Spain", dob: true, gender: true, yyyy: true },
    { name: "United States", dob: true, gender: true, yyyy: true },
    { name: "Germany", dob: true, gender: true, yyyy: true },
    { name: "Denmark", dob: true, gender: true, yyyy: true },
    { name: "France", dob: true, gender: true, yyyy: true },
  ];
  const updateCountry = (i, k, v) => {
    const r = countryRows.map((row, idx) => (idx === i ? { ...row, [k]: v } : row));
    setForm((p) => ({ ...p, countryRows: r }));
  };
  const addCountryRow = () =>
    setForm((p) => ({ ...p, countryRows: [...countryRows, { name: "", dob: false, gender: false }] }));

  // ✅ Updated saveAll: now saves to localStorage AND backend
  const saveAll = async () => {
    try {
      // keep localStorage save
      localStorage.setItem(RTSM_KEY, JSON.stringify(form));

      // new backend POST
      await fetch("/api/inventory-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolNumber,
          protocolDescription,
          formData: form,
        }),
      });

      alert("✅ RTSM info saved (local & backend).");
    } catch (err) {
      console.error("Save failed:", err);
      alert("❌ Failed to save to backend. Check console.");
    }
  };

  // Helper for Other checkbox toggle callback
  const setOtherChecked = (section, field) => toggleField(section, field);

  return (
    <div className="rtsm-page">
      <div className="rtsm-header-bar">
        <div className="rtsm-header-left">
          <img src="/logo.png" alt="Logo" className="rtsm-logo" onClick={() => navigate("/")} />
          <h2 className="rtsm-header-title">RTSM Required Info</h2>
        </div>
      </div>

      {/* Study Overview */}
      <Section title="Study Overview">
        <tr>
          <td>Protocol</td>
          <td>
            <input value={protocolNumber} onChange={(e) => setProtocolNumber(e.target.value)} />
          </td>
        </tr>
        <tr>
          <td>Protocol Description</td>
          <td>
            <input value={protocolDescription} onChange={(e) => setProtocolDescription(e.target.value)} />
          </td>
        </tr>
        <tr>
          <td>Most Recent Protocol Version Utilized to Generate Requirements</td>
          <td>
            <input value={form.overview?.protocolVersion || ""} onChange={(e) => setField("overview", "protocolVersion", e.target.value)} />
          </td>
        </tr>
        <tr>
          <td>Study Blind Type</td>
          <td>
            <Check label="Open-Label" checked={form.overview?.openLabel} onChange={() => toggle("overview", "openLabel")} />
            <Check label="Double Blind" checked={form.overview?.doubleBlind} onChange={() => toggle("overview", "doubleBlind")} />
            <span className="rtsm-checkbox">
              <input type="checkbox" checked={!!form.overview?.customBlind} onChange={() => toggle("overview", "customBlind")} />
              Custom:
              {form.overview?.customBlind && (
                <input
                  value={form.overview?.customBlindText || ""}
                  onChange={(e) => setField("overview", "customBlindText", e.target.value)}
                  placeholder="Describe…"
                />
              )}
            </span>
          </td>
        </tr>
        <tr>
          <td>PULSE Version</td>
          <td>
            <input value={form.overview?.pulseVersion || ""} onChange={(e) => setField("overview", "pulseVersion", e.target.value)} />
          </td>
        </tr>
        <tr>
          <td>PULSE / Elosity Build</td>
          <td>
            <input value={builtOn} readOnly />
          </td>
        </tr>
      </Section>

      {/* Study Design Overview */}
      <Section id="design" title="Study Design Overview">
        <tr>
          <td>System Access</td>
          <td>
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.iwr} onChange={() => toggleField("design", "iwr")} label="IWR (Interactive Web Response)" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.imr} onChange={() => toggleField("design", "imr")} label="IMR (Interactive Mobile Response)" />
          </td>
        </tr>
        <tr>
          <td>Product Returns Management</td>
          <td>
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.returnsOn} onChange={() => toggleField("design", "returnsOn")} label="On" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.returnsOff} onChange={() => toggleField("design", "returnsOff")} label="Off" />
          </td>
        </tr>
        <tr>
          <td>Study Administration</td>
          <td>
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.siteMgmt} onChange={() => toggleField("design", "siteMgmt")} label="Site Management (Add Site, Edit Site, Activate/Deactivate Site, Site Import)" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.userMgmt} onChange={() => toggleField("design", "userMgmt")} label="User Management (Add User, Edit User, Activate/Deactivate User, User Import)" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.manageParams} onChange={() => toggleField("design", "manageParams")} label="Manage Study Parameters" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.visitNotifs} onChange={() => toggleField("design", "visitNotifs")} label="Subject Visit Notifications" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.edcMgmt} onChange={() => toggleField("design", "edcMgmt")} label="EDC Management" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.cohortMgmt} onChange={() => toggleField("design", "cohortMgmt")} label="Cohort Management" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.screenFailReason} onChange={() => toggleField("design", "screenFailReason")} label="Screen Fail Reason Code Management" />
            <OtherInput
              section="design"
              field="otherAdmin"
              textField="otherAdminText"
              label="Other"
              isChecked={!!form.design?.otherAdmin}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={!isSectionEditable("design")}
            />
          </td>
        </tr>
        <tr>
          <td>Integrations - Clinical Supplies</td>
          <td>
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.almac} onChange={() => toggleField("design", "almac")} label="Almac Webservices" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.catalent} onChange={() => toggleField("design", "catalent")} label="Catalent" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.fisher} onChange={() => toggleField("design", "fisher")} label="Fisher" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.pci} onChange={() => toggleField("design", "pci")} label="PCI" />
            <OtherInput
              section="design"
              field="otherSupply"
              textField="otherSupplyText"
              label="Other"
              isChecked={!!form.design?.otherSupply}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={!isSectionEditable("design")}
            />
          </td>
        </tr>
        <tr>
          <td>Integrations - Subject Management</td>
          <td>
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.rave} onChange={() => toggleField("design", "rave")} label="EDC: RAVE (Outbound)" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.ctms} onChange={() => toggleField("design", "ctms")} label="CTMS" />
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.lab} onChange={() => toggleField("design", "lab")} label="Lab Integration" />
            <OtherInput
              section="design"
              field="otherSubj"
              textField="otherSubjText"
              label="Other"
              isChecked={!!form.design?.otherSubj}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={!isSectionEditable("design")}
            />
          </td>
        </tr>
        <tr>
          <td>Site Number Range</td>
          <td>Range/Alphanumeric — 2 letter ISO code + 3 digits (e.g., ES001)</td>
        </tr>
        <tr>
          <td>Country Table</td>
          <td>
            Spain — ES001, ES002…ES999<br />
            United States — US001, US002…US999<br />
            Germany — DE001…<br />
            Denmark — DK001…<br />
            France — FR001…
          </td>
        </tr>
        <tr>
          <td>Integration Site Number</td>
          <td>
            <Check disabled={!isSectionEditable("design")} checked={!!form.design?.integrationOff} onChange={() => toggleField("design", "integrationOff")} label="Off" />
            <span className="rtsm-checkbox">
              <label>
                <input type="checkbox" disabled={!isSectionEditable("design")} checked={!!form.design?.integrationOn} onChange={() => toggleField("design", "integrationOn")} />
                On; Range
              </label>
              {form.design?.integrationOn && (
                <input
                  type="text"
                  placeholder="Enter range…"
                  value={form.design?.integrationRange || ""}
                  onChange={(e) => setField("design", "integrationRange", e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              )}
            </span>
          </td>
        </tr>
      </Section>

      {/* Subject Design Overview */}
      <Section id="subject-design" title="Subject Design Overview">
        <tr>
          <td>Subject Management</td>
          <td>
            <Check label="Screening" checked={form.subjectDesign?.screening} onChange={() => toggleField("subjectDesign", "screening")} />
            <Check label="Screen Failure" checked={form.subjectDesign?.screenFail} onChange={() => toggleField("subjectDesign", "screenFail")} />
            <Check label="Rescreening" checked={form.subjectDesign?.rescreening} onChange={() => toggleField("subjectDesign", "rescreening")} />
            <Check label="Enrollment" checked={form.subjectDesign?.enrollment} onChange={() => toggleField("subjectDesign", "enrollment")} />
            <Check label="Randomization (Place Holder ONLY during Initial GOLIVE)" checked={form.subjectDesign?.randomization} onChange={() => toggleField("subjectDesign", "randomization")} />
            <Check label="Subject Visit" checked={form.subjectDesign?.subjectVisit} onChange={() => toggleField("subjectDesign", "subjectVisit")} />
            <Check label="Unscheduled Visit" checked={form.subjectDesign?.unscheduledVisit} onChange={() => toggleField("subjectDesign", "unscheduledVisit")} />
            <Check label="Completion" checked={form.subjectDesign?.completion} onChange={() => toggleField("subjectDesign", "completion")} />
            <Check label="Treatment Discontinuation" checked={form.subjectDesign?.treatmentDiscontinuation} onChange={() => toggleField("subjectDesign", "treatmentDiscontinuation")} />
            <Check label="Unblinding" checked={form.subjectDesign?.unblinding} onChange={() => toggleField("subjectDesign", "unblinding")} />
            <OtherInput
              section="subjectDesign"
              field="otherSubjectMgmt"
              textField=""
              label="Other: Repriming"
              isChecked={!!form.subjectDesign?.otherSubjectMgmt}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>
        <tr>
          <td>Subject Number Format</td>
          <td>
            <Check label="4 digit - study wide numbering" checked={form.subjectDesign?.subjectNumber4Digit} onChange={() => toggleField("subjectDesign", "subjectNumber4Digit")} />
            <br />
            <span style={{ fontStyle: "italic", marginLeft: 24 }}>
              range will be 0001 – 0999
            </span>
          </td>
        </tr>
        <tr>
          <td>Subject Rescreening Number</td>
          <td>
            <Check label="For each rescreening transaction, the system will increase the Subject Number screening/rescreening count one (1)" checked={form.subjectDesign?.rescreenInc} onChange={() => toggleField("subjectDesign", "rescreenInc")} />
            <Check label="Next Subject Number in defined range Subject Number range" checked={form.subjectDesign?.nextSubNumRange} onChange={() => toggleField("subjectDesign", "nextSubNumRange")} />
            <Check label="Subject Number + 1 incremental digit" checked={form.subjectDesign?.subNumIncrement} onChange={() => toggleField("subjectDesign", "subNumIncrement")} />
            <Check label="Subject Number remains the same" checked={form.subjectDesign?.subNumSame} onChange={() => toggleField("subjectDesign", "subNumSame")} />
          </td>
        </tr>
        <tr>
          <td>Gender Options</td>
          <td>
            <Check label="Male" checked={form.subjectDesign?.genderMale} onChange={() => toggleField("subjectDesign", "genderMale")} />
            <Check label="Female" checked={form.subjectDesign?.genderFemale} onChange={() => toggleField("subjectDesign", "genderFemale")} />
            <Check label="Undifferentiated" checked={form.subjectDesign?.genderUndiff} onChange={() => toggleField("subjectDesign", "genderUndiff")} />
            <Check label="Unknown" checked={form.subjectDesign?.genderUnknown} onChange={() => toggleField("subjectDesign", "genderUnknown")} />
            <Check label="N/A" checked={form.subjectDesign?.genderNA} onChange={() => toggleField("subjectDesign", "genderNA")} />
          </td>
        </tr>
      </Section>

      {/* Inventory Design Overview */}
      <Section id="inventory-design" title="Inventory Design Overview">
        <tr>
          <td>Inventory Administration Management</td>
          <td>
            {[
              "Drug Receipt",
              "Subject Kit Replacement",
              "Depot Management (Add Depot, Edit Depot, Manage Depot Country Association)",
              "Drug Release and Approval",
              "Country Release and Approval",
              "Expiry Management (Lot Expiry Update)",
              "Manage DNX Parameters",
              "Manage DND Parameters",
              "Shipment Management (Shipment Dispatch, Manage Pending Shipments, Manage Shipment Temperature Excursion, Manage Threshold Parameters)",
              "Shipment Integration Management",
              "Manage Inventory (At Depot and Site)",
              "Predictive Calculator",
            ].map((lbl) => (
              <Check
                key={lbl}
                label={lbl}
                checked={form.inventoryDesign?.[lbl]}
                onChange={() => toggleField("inventoryDesign", lbl)}
              />
            ))}
          </td>
        </tr>
        <tr>
          <td>IMP</td>
          <td>
            <Check
              label="Serialization / Numbered"
              checked={form.inventoryDesign?.serial}
              onChange={() => toggleField("inventoryDesign", "serial")}
            />
            <Check
              label="Quantity Based / Bulk Supply"
              checked={form.inventoryDesign?.bulk}
              onChange={() => toggleField("inventoryDesign", "bulk")}
            />
          </td>
        </tr>
      </Section>

      {/* Terminology Overview with unified OtherInput */}
      <Section id="terminology" title="Terminology Overview">

        <tr>
          <td>Subject</td>
          <td>
            <Check label="Subject" checked={form.term?.subject} onChange={() => toggle("term", "subject")} />
            <Check label="Patient" checked={form.term?.patient} onChange={() => toggle("term", "patient")} />
            <Check label="N/A" checked={form.term?.termNA} onChange={() => toggle("term", "termNA")} />
            <OtherInput
              section="term"
              field="termOther"
              textField="termOtherText"
              label="Other"
              isChecked={!!form.term?.termOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Subject Identifier</td>
          <td>
            <Check label="Subject Number" checked={form.term?.subNum} onChange={() => toggle("term", "subNum")} />
            <Check label="Patient Number" checked={form.term?.patNum} onChange={() => toggle("term", "patNum")} />
            <Check label="Screening Number" checked={form.term?.screenNum} onChange={() => toggle("term", "screenNum")} />
            <Check label="N/A" checked={form.term?.idNA} onChange={() => toggle("term", "idNA")} />
            <OtherInput
              section="term"
              field="idOther"
              textField="idOtherText"
              label="Other"
              isChecked={!!form.term?.idOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Randomizati/Enrollment</td>
          <td>
            <Check label="Randomization" checked={form.term?.randomization} onChange={() => toggle("term", "randomization")} />
            <Check label="Enrollment" checked={form.term?.enrollment} onChange={() => toggle("term", "enrollment")} />
            <Check label="N/A" checked={form.term?.randEnrollNA} onChange={() => toggle("term", "randEnrollNA")} />
            <OtherInput
              section="term"
              field="randEnrollOther"
              textField="randEnrollOtherText"
              label="Other"
              isChecked={!!form.term?.randEnrollOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Screen Fail</td>
          <td>
            <Check label="Screen Fail" checked={form.term?.screenFail} onChange={() => toggle("term", "screenFail")} />
            <Check label="Enrollment Fail" checked={form.term?.enrollFail} onChange={() => toggle("term", "enrollFail")} />
            <Check label="N/A" checked={form.term?.screenFailNA} onChange={() => toggle("term", "screenFailNA")} />
            <OtherInput
              section="term"
              field="screenFailOther"
              textField="screenFailOtherText"
              label="Other"
              isChecked={!!form.term?.screenFailOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Subject Visit</td>
          <td>
            <Check label="Subject Visit" checked={form.term?.subjectVisit} onChange={() => toggle("term", "subjectVisit")} />
            <Check label="Cycle Visit" checked={form.term?.cycleVisit} onChange={() => toggle("term", "cycleVisit")} />
            <Check label="Scheduled Visit" checked={form.term?.scheduledVisit} onChange={() => toggle("term", "scheduledVisit")} />
            <Check label="N/A" checked={form.term?.visitNA} onChange={() => toggle("term", "visitNA")} />
            <OtherInput
              section="term"
              field="visitOther"
              textField="visitOtherText"
              label="Other"
              isChecked={!!form.term?.visitOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Treatment Discontinuation</td>
          <td>
            <Check label="Treatment Discontinuation" checked={form.term?.treatmentDiscontinuation} onChange={() => toggle("term", "treatmentDiscontinuation")} />
            <Check label="Early Termination" checked={form.term?.earlyTermination} onChange={() => toggle("term", "earlyTermination")} />
            <Check label="Discontinuation" checked={form.term?.discontinuation} onChange={() => toggle("term", "discontinuation")} />
            <Check label="N/A" checked={form.term?.treatmentNA} onChange={() => toggle("term", "treatmentNA")} />
            <OtherInput
              section="term"
              field="treatmentOther"
              textField="treatmentOtherText"
              label="Other"
              isChecked={!!form.term?.treatmentOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Completion</td>
          <td>
            <Check label="Treatment Completion" checked={form.term?.treatmentCompletion} onChange={() => toggle("term", "treatmentCompletion")} />
            <Check label="Completion" checked={form.term?.completion} onChange={() => toggle("term", "completion")} />
            <Check label="N/A" checked={form.term?.completionNA} onChange={() => toggle("term", "completionNA")} />
            <OtherInput
              section="term"
              field="completionOther"
              textField="completionOtherText"
              label="Other"
              isChecked={!!form.term?.completionOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Unscheduled Visit</td>
          <td>
            <Check label="Unscheduled Visit" checked={form.term?.unscheduledVisit} onChange={() => toggle("term", "unscheduledVisit")} />
            <Check label="Unscheduled Cycle Visit" checked={form.term?.unscheduledCycleVisit} onChange={() => toggle("term", "unscheduledCycleVisit")} />
            <Check label="N/A" checked={form.term?.unscheduledNA} onChange={() => toggle("term", "unscheduledNA")} />
            <OtherInput
              section="term"
              field="unscheduledOther"
              textField="unscheduledOtherText"
              label="Other"
              isChecked={!!form.term?.unscheduledOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>Site</td>
          <td>
            <Check label="Site" checked={form.term?.site} onChange={() => toggle("term", "site")} />
            <Check label="Location" checked={form.term?.location} onChange={() => toggle("term", "location")} />
            <Check label="N/A" checked={form.term?.siteNA} onChange={() => toggle("term", "siteNA")} />
            <OtherInput
              section="term"
              field="siteOther"
              textField="siteOtherText"
              label="Other"
              isChecked={!!form.term?.siteOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

        <tr>
          <td>IMP</td>
          <td>
            <Check label="Kit" checked={form.term?.kit} onChange={() => toggle("term", "kit")} />
            <Check label="Med ID" checked={form.term?.medId} onChange={() => toggle("term", "medId")} />
            <Check label="Vial" checked={form.term?.vial} onChange={() => toggle("term", "vial")} />
            <Check label="N/A" checked={form.term?.impNA} onChange={() => toggle("term", "impNA")} />
            <OtherInput
              section="term"
              field="impOther"
              textField="impOtherText"
              label="Other"
              isChecked={!!form.term?.impOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
            <br />
            <Check label="Kit Number" checked={form.term?.kitNumber} onChange={() => toggle("term", "kitNumber")} />
            <Check label="Med ID" checked={form.term?.medId2} onChange={() => toggle("term", "medId2")} />
            <Check label="N/A" checked={form.term?.impNA2} onChange={() => toggle("term", "impNA2")} />
            <OtherInput
              section="term"
              field="impOther2"
              textField="impOtherText2"
              label="Other"
              isChecked={!!form.term?.impOther2}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
            <br />
            <Check label="Lot Number" checked={form.term?.lotNumber} onChange={() => toggle("term", "lotNumber")} />
            <Check label="N/A" checked={form.term?.lotNA} onChange={() => toggle("term", "lotNA")} />
            <OtherInput
              section="term"
              field="lotOther"
              textField="lotOtherText"
              label="Other"
              isChecked={!!form.term?.lotOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
            <br />
            <Check label="Batch Number" checked={form.term?.batchNumber} onChange={() => toggle("term", "batchNumber")} />
            <Check label="Unblinded Batch Number" checked={form.term?.unblindedBatchNumber} onChange={() => toggle("term", "unblindedBatchNumber")} />
            <Check label="N/A" checked={form.term?.batchNA} onChange={() => toggle("term", "batchNA")} />
            <OtherInput
              section="term"
              field="batchOther"
              textField="batchOtherText"
              label="Other"
              isChecked={!!form.term?.batchOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
            <br />
            <Check label="Randomization Number" checked={form.term?.randomizationNumber} onChange={() => toggle("term", "randomizationNumber")} />
            <Check label="Enrollment Number" checked={form.term?.enrollmentNumber} onChange={() => toggle("term", "enrollmentNumber")} />
            <Check label="N/A*" checked={form.term?.randEnrollNumberNA} onChange={() => toggle("term", "randEnrollNumberNA")} />
            <OtherInput
              section="term"
              field="randEnrollNumberOther"
              textField="randEnrollNumberOtherText"
              label="Other"
              isChecked={!!form.term?.randEnrollNumberOther}
              setChecked={setOtherChecked}
              form={form}
              setField={setField}
              disabled={false}
            />
          </td>
        </tr>

      </Section>

      {/* UNBLINDED Data Overview */}
      <Section title="UNBLINDED Data Overview – Open Label Study">
        <tr>
          <th>Data</th>
          <th>Max Characters Allowed</th>
        </tr>
        {unblindedRows.map((r, i) => (
          <tr key={i}>
            <td>
              <input value={r.data} onChange={(e) => updateUnblind(i, "data", e.target.value)} />
            </td>
            <td>
              <input value={r.max} onChange={(e) => updateUnblind(i, "max", e.target.value)} />
            </td>
          </tr>
        ))}
        <tr>
          <td colSpan={2}>
            <button className="rtsm-btn small" onClick={addUnblindRow}>
              + Add Row
            </button>
          </td>
        </tr>
      </Section>

      {/* Country List Overview */}
      <Section title="Country List Overview">
        <tr>
          <th>Country</th>
          <th>Demographics & DOB Format</th>
        </tr>
        {countryRows.map((c, i) => (
          <tr key={i}>
            <td>
              <select value={c.name} onChange={(e) => updateCountry(i, "name", e.target.value)}>
                <option value="">Select Country</option>
                {worldNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <Check label="Date of Birth" checked={c.dob} onChange={() => updateCountry(i, "dob", !c.dob)} />
              <Check label="Gender" checked={c.gender} onChange={() => updateCountry(i, "gender", !c.gender)} />
              <Check label="Initials" checked={c.initials} onChange={() => updateCountry(i, "initials", !c.initials)} />
              <Check label="Other" checked={c.other} onChange={() => updateCountry(i, "other", !c.other)} />
              <br />
              <Check label="DD Mmm YYYY" checked={c.ddmmm} onChange={() => updateCountry(i, "ddmmm", !c.ddmmm)} />
              <Check label="Mmm YYYY" checked={c.mmm} onChange={() => updateCountry(i, "mmm", !c.mmm)} />
              <Check label="YYYY" checked={c.yyyy} onChange={() => updateCountry(i, "yyyy", !c.yyyy)} />
            </td>
          </tr>
        ))}
        <tr>
          <td colSpan={2}>
            <button className="rtsm-btn small" onClick={addCountryRow}>
              + Add Country
            </button>
          </td>
        </tr>
      </Section>

      {/* Footer buttons */}
      <div style={{ textAlign: "center", margin: 20 }}>
        <button className="rtsm-btn primary" onClick={saveAll}>
          💾 Save All
        </button>
        <button className="rtsm-btn" onClick={() => navigate("/RolesAndAccess")}>
          → Next Page
        </button>
        <button className="rtsm-btn" onClick={() => navigate("/")}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
