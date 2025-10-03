// protocol-extraction-frontend/api/protocol/index.js
// GET returns the last uploaded JSON (from global store) for quick testing.
// POST also allowed (to save via POST /api/protocol)
module.exports = (req, res) => {
  if (req.method === "GET") {
    const data = (global.__protocol_store && global.__protocol_store.data) || {};
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ success: false, error: "Invalid JSON" });
      }
      global.__protocol_store = global.__protocol_store || {};
      global.__protocol_store.data = body;
      return res.status(200).json({ success: true, message: "Protocol saved" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};
