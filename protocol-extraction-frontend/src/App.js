import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import Dashboard from "./pages/Dashboard";
import RtsmInfo from "./pages/RtsmInfo";
import RolesAndAccess from "./pages/RolesAndAccess";
import InventoryDefaults from "./pages/InventoryDefaults";
import DrugOrderingResupply from "./pages/DrugOrderingResupply";
import SummaryDashboard from "./pages/SummaryDashboard";

const theme = createTheme();

function StubPage({ name }) {
  return (
    <div style={{ padding: 50, textAlign: "center", fontSize: 30, color: "gray" }}>
      {name} Page Stub - Loaded Successfully.
    </div>
  );
}

export default function App() {
  const [useStubs, setUseStubs] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <div style={{ padding: 10, textAlign: "center" }}>
          <button onClick={() => setUseStubs(!useStubs)}>
            Toggle Stubs {useStubs ? "ON" : "OFF"}
          </button>
        </div>
        <Routes>
          <Route path="/" element={useStubs ? <StubPage name="Dashboard" /> : <Dashboard />} />
          <Route path="/rtsm-info" element={useStubs ? <StubPage name="RTSM Info" /> : <RtsmInfo />} />
          <Route path="/RolesAndAccess" element={useStubs ? <StubPage name="Roles And Access" /> : <RolesAndAccess />} />
          <Route path="/inventory-defaults" element={useStubs ? <StubPage name="Inventory Defaults" /> : <InventoryDefaults />} />
          <Route path="/drug-ordering-resupply" element={useStubs ? <StubPage name="Drug Ordering Resupply" /> : <DrugOrderingResupply />} />
          <Route path="/summary-dashboard" element={useStubs ? <StubPage name="Summary Dashboard" /> : <SummaryDashboard />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
