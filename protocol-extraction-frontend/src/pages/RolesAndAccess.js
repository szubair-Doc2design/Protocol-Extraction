import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../rtsm.css";

const initialSystemRoles = [
  { roleType: "Clinical Supplies Manager", permissionLevel: "Study-Wide Role Type (SW)", blindedStatus: "Unblinded", prmRole: "Clinical Supplies Manager" },
  { roleType: "Site User", permissionLevel: "Multi-Site Role Type (MS)", blindedStatus: "Unblinded", prmRole: "Site User Role" },
  { roleType: "CRO Manager", permissionLevel: "Clinical Study-Wide Role Type (CW)", blindedStatus: "Unblinded", prmRole: "Study Manager Role" },
  { roleType: "Depot Inventory Manager", permissionLevel: "Multi-Depot Role Type (DS)", blindedStatus: "Unblinded", prmRole: "Depot Role" },
  { roleType: "Medical Monitor", permissionLevel: "Clinical Study-Wide Role Type (CW)", blindedStatus: "Unblinded", prmRole: "N/A" },
  { roleType: "Monitor/CRA", permissionLevel: "Multi-Site Role Type (MS)", blindedStatus: "Unblinded", prmRole: "Monitor Role" },
  { roleType: "Pharmacist", permissionLevel: "Multi-Site Role Type (MS)", blindedStatus: "Unblinded", prmRole: "Site User Role" },
  { roleType: "QA", permissionLevel: "Clinical Study-Wide Role Type (CW)", blindedStatus: "Unblinded", prmRole: "N/A" },
  { roleType: "Report User", permissionLevel: "Clinical Study-Wide Role Type (CW)", blindedStatus: "Unblinded", prmRole: "N/A" },
  { roleType: "Study Manager", permissionLevel: "Clinical Study-Wide Role Type (CW)", blindedStatus: "Unblinded", prmRole: "Study Manager Role" }
];

const roleMatrixSource = [
  ["Study Manager (All Sites)", ["Site User", "Pharmacist", "Study Manager", "CRO Manager", "Monitor/CRA", "QA", "Medical Monitor", "Report User"]],
  ["CRO Manager (All Sites)", ["Site User", "Pharmacist", "CRO Manager", "Monitor/CRA", "Medical Monitor", "Report User"]],
  ["Monitor/CRA (At the sites they are associated with)", ["Site User", "Pharmacist"]],
  ["Clinical Supplies Manager (All sites)", [
    "Clinical Supplies Manager", "Depot Inventory Manager", "Site User", "Pharmacist", "Study Manager",
    "CRO Manager", "Monitor/CRA", "QA", "Medical Monitor", "Report User"
  ]]
];

export default function RolesAndAccess() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({ systemRoles: true, userManagement: true });
  const [editing, setEditing] = useState(false);
  const [systemRoles, setSystemRoles] = useState(initialSystemRoles);
  const [roleMatrix, setRoleMatrix] = useState(
    roleMatrixSource.map(r => ({
      addingUser: r[0],
      allowedRoles: r[1]
    }))
  );

  // Scroll to top on mount to fix initial scroll position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Dynamically compute all possible roles from systemRoles state
  const allPossibleRoles = React.useMemo(() => {
    const roles = systemRoles
      .map(r => r.roleType)
      .filter(Boolean);
    return Array.from(new Set(roles));
  }, [systemRoles]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/inventory-defaults");
        if (response.ok) {
          const data = await response.json();
          setSystemRoles(data.systemRoles || initialSystemRoles);
          setRoleMatrix(data.roleMatrix || roleMatrixSource.map(r => ({
            addingUser: r[0],
            allowedRoles: r[1]
          })));
        } else {
          setSystemRoles(initialSystemRoles);
          setRoleMatrix(roleMatrixSource.map(r => ({
            addingUser: r[0],
            allowedRoles: r[1]
          })));
        }
      } catch (error) {
        console.error("Failed to load roles/access data", error);
      }
    }
    fetchData();
  }, []);

  const handleSystemInput = (idx, field, val) => {
    const updated = [...systemRoles];
    updated[idx][field] = val;
    setSystemRoles(updated);
  };

  const addNewRole = () => {
    setSystemRoles([...systemRoles, { roleType: "", permissionLevel: "", blindedStatus: "Unblinded", prmRole: "" }]);
    setEditing(true);
  };

  const handleRoleDelete = (rowIdx, delRole) => {
    const updated = [...roleMatrix];
    updated[rowIdx].allowedRoles = updated[rowIdx].allowedRoles.filter(r => r !== delRole);
    setRoleMatrix(updated);
  };

  const handleRoleAdd = (rowIdx, addRole) => {
    if (!addRole) return;
    const updated = [...roleMatrix];
    if (!updated[rowIdx].allowedRoles.includes(addRole)) {
      updated[rowIdx].allowedRoles.push(addRole);
      setRoleMatrix(updated);
    }
  };

  const saveAllChanges = async () => {
    try {
      const res = await fetch("/api/inventory-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemRoles, roleMatrix }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Saved Roles and Access:", data);
        setEditing(false);
      } else {
        console.error("Save failed");
      }
    } catch (err) {
      console.error("Error saving Roles and Access", err);
    }
  };

  return (
    <div className="rtsm-page">
      <div className="rtsm-header-bar">
        <div className="rtsm-header-left">
          <img src="logo.png" alt="Logo" className="rtsm-logo" onClick={() => navigate("/rtsm-info")} />
          <h2 className="rtsm-header-title">Roles and Access</h2>
        </div>
        <div>
          <button className="rtsm-btn small" onClick={() => setExpanded(exp => ({ ...exp, systemRoles: true }))}>Expand All</button>
          <button className="rtsm-btn small" onClick={() => setExpanded(exp => ({ ...exp, systemRoles: false }))}>Collapse All</button>
          {editing
            ? <button className="rtsm-btn small" onClick={saveAllChanges}>Save</button>
            : <button className="rtsm-btn small" onClick={() => setEditing(true)}>Edit</button>
          }
        </div>
      </div>
      <div className="rtsm-section">
        <div className="rtsm-section-header blue-header"
          onClick={() => setExpanded(prev => ({ ...prev, systemRoles: !prev.systemRoles }))}>
          <h3 className="section-title">System Roles</h3>
        </div>
        {expanded.systemRoles && (
          <>
            <table className="rtsm-table">
              <thead>
                <tr>
                  <th>Role Type</th>
                  <th>Permission Level</th>
                  <th>Blinded Status</th>
                  <th>PRM Role</th>
                </tr>
              </thead>
              <tbody>
                {systemRoles.map((role, idx) => (
                  <tr key={idx}>
                    <td>
                      {editing
                        ? <input type="text" value={role.roleType} onChange={e => handleSystemInput(idx, "roleType", e.target.value)} />
                        : role.roleType
                      }
                    </td>
                    <td>
                      {editing
                        ? <input type="text" value={role.permissionLevel} onChange={e => handleSystemInput(idx, "permissionLevel", e.target.value)} />
                        : role.permissionLevel
                      }
                    </td>
                    <td>
                      {editing
                        ? (
                          <select value={role.blindedStatus} onChange={e => handleSystemInput(idx, "blindedStatus", e.target.value)}>
                            <option value="Blinded">Blinded</option>
                            <option value="Unblinded">Unblinded</option>
                          </select>
                        )
                        : role.blindedStatus
                      }
                    </td>
                    <td>
                      {editing
                        ? <input type="text" value={role.prmRole} onChange={e => handleSystemInput(idx, "prmRole", e.target.value)} />
                        : role.prmRole
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button className="rtsm-btn" onClick={addNewRole}>Add New Role</button>
            </div>
          </>
        )}

        <div className="rtsm-section-header blue-header" style={{ marginTop: 40 }}
          onClick={() => setExpanded(prev => ({ ...prev, userManagement: !prev.userManagement }))}>
          <h3 className="section-title">User Management – Add/Edit User</h3>
        </div>
        {expanded.userManagement && (
          <table className="rtsm-table">
            <thead>
              <tr>
                <th>Role Type Adding User</th>
                <th>Allowable Role Types to Add/Edit</th>
              </tr>
            </thead>
            <tbody>
              {roleMatrix.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td>{row.addingUser}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}>
                      {row.allowedRoles.map(role => (
                        <span key={role} style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 2, background: "#e4e4ee", borderRadius: 4, padding: "2px 8px" }}>
                          {role}
                          <button
                            className="rtsm-btn extra-small"
                            style={{ marginLeft: 6, padding: "0 5px" }}
                            onClick={() => handleRoleDelete(rowIdx, role)}
                          >Delete</button>
                        </span>
                      ))}
                      <select
                        defaultValue=""
                        style={{ minWidth: 120 }}
                        onChange={e => {
                          handleRoleAdd(rowIdx, e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="" disabled>Add new role...</option>
                        {allPossibleRoles.filter(r => !row.allowedRoles.includes(r)).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button className="rtsm-btn" onClick={() => navigate("/rtsm-info")}>Back to RTSM Info</button>
        </div>
        <button
          className="rtsm-btn"
          onClick={() => navigate("/inventory-defaults")}
          style={{ marginTop: 20 }}
        >
          Next Page
        </button>
      </div>
    </div>
  );
}
