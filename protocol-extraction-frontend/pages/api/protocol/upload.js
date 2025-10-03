// pages/api/protocol/upload.js
export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body; // JSON sent from frontend

      // You can store this in memory, DB, etc.
      // For now, just return success
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: "Invalid JSON" });
    }
  }

  // For any other HTTP method, return 405
  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
