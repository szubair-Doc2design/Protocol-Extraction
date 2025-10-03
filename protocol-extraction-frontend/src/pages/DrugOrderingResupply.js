import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";

const Matrix = ({ rows, form, set }) => (
  <table className="rtsm-table">
    <thead>
      <tr>
        <th></th><th>On</th><th>Off</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(({ label, path }, i) => {
        const val = path.split(".").reduce((o, k) => o[k], form) === true;
        return (
          <tr key={i}>
            <td>{label}</td>
            <td><input type="radio" name={path} checked={val} onChange={() => set(path, true)} /></td>
            <td><input type="radio" name={path} checked={!val} onChange={() => set(path, false)} /></td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const Section = ({ title, children, note }) => (
  <div className="rtsm-section">
    <div className="rtsm-section-header blue-header"><h3 className="section-title">{title}</h3></div>
    {note && <div className="rtsm-note" style={{ whiteSpace: "pre-wrap" }}>{note}</div>}
    <div className="section-body">{children}</div>
  </div>
);

export default function DrugOrderingResupply() {
  const navigate = useNavigate();

  const defaultPredictiveRules = [
    { schedule: "Scheduled visits", visitType: "Non-Repriming", projections: "project kit qty based on the dose needs for the upcoming Cycle visits (refer to EP-VISIT-002)" },
    { schedule: "Repriming visits", visitType: "Repriming", projections: "project kit qty based on the dose needs for the upcoming repriming visits (refer to EP-VISIT-002.Repriming visits)" },
    { schedule: "Repriming.R6 completed", visitType: "Repriming", projections: "project kit qty based on the dose needs for the upcoming Cycle visits starting from the next Cycle Day 1 onwards (refer to EP-VISIT-002)" }
  ];

  const initialData = {
    shipmentNumberText: "[Depot Number] + 0001 – [Depot Number] + 9999\nReturn Shipments: R20000 – R39999",
    shipmentTypes: { initial: true, threshold: true, predictive: true, bundling: true, manual: true },
    defaultInitialTrigger: "firstScreened",
    thresholdResupply: "onlyKit",
    predictiveTrigger: "siteFirstVisit",
    defaultSupplyStrategy: "Low",
    bundlingAllowed: { initial: false, threshold: true, predictive: true, manual: false },
    shipmentBundlingText: "Daily, starting at 11:30pm PST",
    partialShipments: { initial: true, threshold: true, predictive: true, bundled: true },
    specialConditions: { allowOneKit: true, ruleA: false, ruleB: false },
    predictiveRules: defaultPredictiveRules,
    manualLotsToDisplay: "100",
    supplyCouriers: { fedex: true, ups: true, dhl: false, usps: true, world: true, tnt: true, speed: false, marken: false, other: true, otherText: "" },
    returnCouriers: { fedex: true, ups: true, dhl: false, usps: true, world: true, tnt: true, speed: false, marken: false, other: true, otherText: "" },
    largeShipmentQty: "100",
    largeShipmentNote: "During drug shipment receipt, when the shipment kit quantity is >= the large shipment quantity the display and status collection for kit numbers will not occur. This is intended to alleviate the loading times for large shipments, such as depot to depot transfers.",
    unackShipmentAlert: "3 days after requested",
    unackReturnAlert: "5 days after shipped",
    expiryAlertSite: "Site: 90, 60, 30, 5 days",
    expiryAlertDepot: "Depot: 90, 60, 30, 5 days",
    kitStatusInExpiry: { available: true, dnd: true, dns: true, qTransit: true, qOnSite: true },
    siteInventoryAlert: "Kit Type: GEN3018, 20 mg/ml, 5ml 100 mg vial; Quantity: 6",
    depotInventoryAlert: "Kit Type: GEN3018, 20 mg/ml, 5ml 100 mg vial; Quantity: 500",
    depotAlertFootnote: "Depot must have at least one shipment received in order to qualify for depot low inventory alert (note: for depots which are only supplying/release depots, the initial release of medication at that depot counts as one shipment)."
  };

  const [form, setForm] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/drug-ordering-resupply");
        if (res.ok) {
          const data = await res.json();
          if (!Array.isArray(data.predictiveRules)) data.predictiveRules = defaultPredictiveRules;
          setForm(data);
        } else {
          setForm(initialData);
        }
      } catch (e) {
        alert("Error loading form data");
        setForm(initialData);
      }
    }
    fetchData();
  }, []);

  // Return loading indicator if data not loaded yet
  if (!form) return <div>Loading...</div>;

  const set = (path, value) => {
    const keys = path.split(".");
    if (keys[0] === "predictiveRules" && keys.length === 3) {
      const index = parseInt(keys[1], 10);
      const prop = keys[2];
      setForm(prev => {
        const updatedRules = [...prev.predictiveRules];
        updatedRules[index] = { ...updatedRules[index], [prop]: value };
        return { ...prev, predictiveRules: updatedRules };
      });
    } else {
      setForm(prev => {
        let newState = { ...prev };
        let cur = newState;
        for (let i = 0; i < keys.length - 1; i++) {
          cur[keys[i]] = { ...cur[keys[i]] };
          cur = cur[keys[i]];
        }
        cur[keys[keys.length - 1]] = value;
        return newState;
      });
    }
  };

  const save = async () => {
    try {
      const res = await fetch("/api/drug-ordering-resupply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) alert("Drug Ordering & Automated Resupply saved.");
      else alert("Save failed: " + (await res.text()));
    } catch (err) {
      alert("Save error: " + err.message);
    }
  };

  const chk = (label, path) => {
    const val = path.split(".").reduce((o, k) => o[k], form);
    return (
      <label className="rtsm-checkbox">
        <input type="checkbox" checked={val} onChange={e => set(path, e.target.checked)} /> {label}
      </label>
    );
  };

  const courier = (label, path) => {
    const val = path.split(".").reduce((o, k) => o[k], form);
    return (
      <label className="rtsm-checkbox" style={{ minWidth: 180 }}>
        <input type="checkbox" checked={val} onChange={e => set(path, e.target.checked)} /> {label}
      </label>
    );
  };

  const radio = (groupPath, value, label) => {
    const current = form[groupPath];
    return (
      <label className="rtsm-checkbox">
        <input type="radio" name={groupPath} checked={current === value} onChange={() => set(groupPath, value)} /> {label}
      </label>
    );
  };

  return (
    <div className="rtsm-page" style={{ paddingBottom: 80 }}>
      <div className="rtsm-header-bar">
        <div className="rtsm-header-left">
          <img src="/logo.png" alt="Endpoint" className="rtsm-logo" onClick={() => navigate("/inventory-default")} />
          <h2 className="rtsm-header-title">Drug Ordering & Automated Resupply</h2>
        </div>
        <div className="rtsm-header-right">
          <button className="rtsm-btn" onClick={() => navigate("/inventory-default")}>← Inventory & Default Parameters</button>
        </div>
      </div>

      <Section title="Shipment Numbers / Return Shipment Numbers">
        <textarea rows={3} className="address-box" value={form.shipmentNumberText} onChange={e => set("shipmentNumberText", e.target.value)} />
      </Section>

      <Section title="Shipment Types">
        {chk("Initial Shipment", "shipmentTypes.initial")}
        {chk("Threshold Shipment", "shipmentTypes.threshold")}
        {chk("Predictive Shipment", "shipmentTypes.predictive")}
        {chk("Bundling Shipment", "shipmentTypes.bundling")}
        {chk("Manual Shipment", "shipmentTypes.manual")}
      </Section>

      <Section title="Default Initial Shipment Trigger" note={`This can be edited on a per site basis through add / edit site functionality. This will be the default value for a site during add site and import site.\nNote: Default will be set to ‘First Subject screened’ for all sites. Study Team will manually change the default setting to ‘Site Activation’ for the first few sites.`}>
        {radio("defaultInitialTrigger", "siteActivation", "Site Activation")}
        {radio("defaultInitialTrigger", "firstScreened", "First Subject Screened")}
        {radio("defaultInitialTrigger", "na", "N/A")}
      </Section>

      <Section title="Threshold Resupply">
        {radio("thresholdResupply", "allKits", "If one kit type is below threshold minimum; the system will resupply all kit types within the same packaging/shipping group to the defined resupply maximum threshold level")}
        {radio("thresholdResupply", "onlyKit", "If one kit type is below threshold minimum; the system will resupply only that kit type to the defined resupply maximum threshold level")}
      </Section>

      <Section title="Predictive Resupply Trigger">
        {radio("predictiveTrigger", "siteFirstVisit", "Site’s first Enrollment/Randomization Visit")}
        {radio("predictiveTrigger", "customization", "Customization")}
        {radio("predictiveTrigger", "na", "N/A")}
      </Section>

      <Section title="Default Supply Strategy">
        <input value={form.defaultSupplyStrategy} onChange={e => set("defaultSupplyStrategy", e.target.value)} />
      </Section>

      <Section title="Bundling Shipment">
        <Matrix rows={[
          { label: "Initial Shipment", path: "bundlingAllowed.initial" },
          { label: "Threshold Shipment", path: "bundlingAllowed.threshold" },
          { label: "Predictive Shipment", path: "bundlingAllowed.predictive" },
          { label: "Manual Shipment", path: "bundlingAllowed.manual" }
        ]}
          form={form}
          set={set}
        />
      </Section>

      <Section title="Shipment Bundling">
        <input value={form.shipmentBundlingText} onChange={e => set("shipmentBundlingText", e.target.value)} />
      </Section>

      <Section title="Partial Shipments">
        <Matrix rows={[
          { label: "Initial Shipment", path: "partialShipments.initial" },
          { label: "Threshold Shipment", path: "partialShipments.threshold" },
          { label: "Predictive Shipment", path: "partialShipments.predictive" },
          { label: "Bundled Shipment", path: "partialShipments.bundled" }
        ]}
          form={form}
          set={set}
        />
      </Section>

      <Section title="Special Conditions">
        {chk("Allow 1 (one) kit shipment", "specialConditions.allowOneKit")}
        {chk("When an automatic shipment is found to contain a quantity of 1 (one) blinded kit type, as determined by the associated Blinding Group value, the system shall automatically include an additional kit from the same Blinding Group to be included in the respective shipment. This automatically included kit shall not be the same kit type. In the event the blind cannot be preserved on a shipment, the shipment shall not generate a partial order and will fail.", "specialConditions.ruleA")}
        {chk("When an automatic shipment is found to contain a quantity of 1 (one) blinded kit type, as determined by the associated Blinding Group value, the system shall automatically include 1 (one) of each kit type from the same Blinding Group to be included in the respective shipment. In the event the blind cannot be preserved on a shipment, the shipment shall not generate a partial order and will fail.", "specialConditions.ruleB")}
      </Section>

      <Section title="Predictive shipment Rules: Genmab Std Logic">
        <table className="rtsm-table wide-table">
          <thead><tr><th>Subject Schedule</th><th>Visit Type</th><th>Projections</th></tr></thead>
          <tbody>{form.predictiveRules.map((r, i) => (
            <tr key={i}>
              <td><input key={"schedule-" + i} value={r.schedule} onChange={e => set(`predictiveRules.${i}.schedule`, e.target.value)} /></td>
              <td><input key={"visitType-" + i} value={r.visitType} onChange={e => set(`predictiveRules.${i}.visitType`, e.target.value)} /></td>
              <td><input key={"projections-" + i} value={r.projections} onChange={e => set(`predictiveRules.${i}.projections`, e.target.value)} /></td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ marginTop: 10 }}>
          <button className="rtsm-btn small" onClick={() => setForm(prev => ({
            ...prev,
            predictiveRules: [...prev.predictiveRules, { schedule: "", visitType: "", projections: "" }]
          }))}>+ Add Row</button>
        </div>
      </Section>

      <Section title="Manual Drug Order – Number of Lot Numbers to Display">
        <input value={form.manualLotsToDisplay} onChange={e => set("manualLotsToDisplay", e.target.value)} style={{ width: 120 }} />
      </Section>

      <Section title="Supply Depot Couriers">
        <div className="flex-wrap">
          {courier("FED-EX", "supplyCouriers.fedex")}
          {courier("UPS", "supplyCouriers.ups")}
          {courier("DHL", "supplyCouriers.dhl")}
          {courier("USPS", "supplyCouriers.usps")}
          {courier("World Courier", "supplyCouriers.world")}
          {courier("TNT", "supplyCouriers.tnt")}
          {courier("Speed Post", "supplyCouriers.speed")}
          {courier("Marken", "supplyCouriers.marken")}
          {courier("Other", "supplyCouriers.other")}
        </div>
        {form.supplyCouriers.other && (
          <div style={{ marginTop: 8 }}>
            <input style={{ width: "50%" }} placeholder="Enter other courier(s)…" value={form.supplyCouriers.otherText} onChange={e => set("supplyCouriers.otherText", e.target.value)} />
          </div>
        )}
      </Section>

      <Section title="Return Depot (PRM) Couriers">
        <div className="flex-wrap">
          {courier("FED-EX", "returnCouriers.fedex")}
          {courier("UPS", "returnCouriers.ups")}
          {courier("DHL", "returnCouriers.dhl")}
          {courier("USPS", "returnCouriers.usps")}
          {courier("World Courier", "returnCouriers.world")}
          {courier("TNT", "returnCouriers.tnt")}
          {courier("Speed Post", "returnCouriers.speed")}
          {courier("Marken", "returnCouriers.marken")}
          {courier("Other", "returnCouriers.other")}
        </div>
        {form.returnCouriers.other && (
          <div style={{ marginTop: 8 }}>
            <input style={{ width: "50%" }} placeholder="Enter other courier(s)…" value={form.returnCouriers.otherText} onChange={e => set("returnCouriers.otherText", e.target.value)} />
          </div>
        )}
      </Section>

      <Section title="Large Shipment Routing (Drug Shipment Receipt)">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input style={{ width: 120 }} value={form.largeShipmentQty} onChange={e => set("largeShipmentQty", e.target.value)} />
          <span className="muted">{form.largeShipmentNote}</span>
        </div>
      </Section>

      <Section title="Unacknowledged Shipment Alert / Unacknowledged Return Shipment Alert (PRM)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="muted">Unacknowledged Shipment Alert</label>
            <input value={form.unackShipmentAlert} onChange={e => set("unackShipmentAlert", e.target.value)} />
          </div>
          <div>
            <label className="muted">Unacknowledged Return Shipment Alert (PRM)</label>
            <input value={form.unackReturnAlert} onChange={e => set("unackReturnAlert", e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title="Expiry Alert">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="muted">Site</label>
            <input value={form.expiryAlertSite} onChange={e => set("expiryAlertSite", e.target.value)} />
          </div>
          <div>
            <label className="muted">Depot</label>
            <input value={form.expiryAlertDepot} onChange={e => set("expiryAlertDepot", e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="muted">Kit Status to be included in Expiry Alert</div>
          {chk("Available", "kitStatusInExpiry.available")}
          {chk("DND", "kitStatusInExpiry.dnd")}
          {chk("DNS", "kitStatusInExpiry.dns")}
          {chk("Quarantined – In Transit", "kitStatusInExpiry.qTransit")}
          {chk("Quarantined – On Site", "kitStatusInExpiry.qOnSite")}
        </div>
      </Section>

      <Section title="Site / Depot Inventory Alert">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="muted">Site Inventory Alert</label>
            <input value={form.siteInventoryAlert} onChange={e => set("siteInventoryAlert", e.target.value)} />
            <div className="muted" style={{ marginTop: 6 }}>Triggered when the above quantities are met</div>
          </div>
          <div>
            <label className="muted">Depot Inventory Alert</label>
            <input value={form.depotInventoryAlert} onChange={e => set("depotInventoryAlert", e.target.value)} />
            <div className="muted" style={{ marginTop: 6 }}>Triggered when the above quantities are met</div>
          </div>
        </div>
        <div className="rtsm-note" style={{ marginTop: 8 }}>{form.depotAlertFootnote}</div>
      </Section>

      <div style={{ position: "fixed", left: 0, bottom: 0, width: "100%", backgroundColor: "#f5f5f5", borderTop: "1px solid #ddd", padding: "10px 20px", display: "flex", justifyContent: "center", gap: "15px", zIndex: 1000, boxShadow: "0 -2px 5px rgba(0,0,0,0.1)" }}>
        <button className="rtsm-btn" onClick={() => navigate("/inventory-default")}>← Inventory & Default Parameters</button>
        <button className="rtsm-btn primary" onClick={save}>Save</button>
        <button className="rtsm-btn" onClick={() => navigate("/summary-dashboard")}>Next Page →</button>
      </div>
    </div>
  );
}
