import React from 'react';

export default function StubPage({ pageName }) {
  return (
    <div style={{ padding: 30, textAlign: 'center', fontSize: 24 }}>
      {pageName} Page Stub - Loaded Successfully.
      <br />
      This is a placeholder for debugging.
    </div>
  );
}
