// protocol-extraction-frontend/api/protocol/index.js

let storedProtocol = {}; // simple in-memory storage

export default function handler(req, res) {
  if (req.method === "GET") {
    // Return whatever is currently stored
    return res.status(200).json(storedProtocol || {});
  }

  if (req.method === "POST") {
    try {
      const body = req.body;

      if (!body || typeof body !== "object") {
        return res.status(400).json({ success: false, error: "Invalid JSON" });
      }

      // Save in memory
      storedProtocol = body;

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to save protocol",
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
