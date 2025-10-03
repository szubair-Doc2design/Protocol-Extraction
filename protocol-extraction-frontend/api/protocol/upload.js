// protocol-extraction-frontend/api/protocol/upload.js

let storedProtocol = {}; // shared with index.js after first upload (in-memory)

export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;

      if (!data || typeof data !== "object") {
        return res.status(400).json({ success: false, error: "Invalid JSON" });
      }

      // Save in-memory (will reset if serverless function restarts)
      storedProtocol = data;

      return res.status(200).json({
        success: true,
        message: "Upload successful",
        data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message || "Server error while uploading",
      });
    }
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
