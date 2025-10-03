// pages/api/protocol/upload.js

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Expecting JSON in request body
      const data = req.body;

      // ✅ You can connect to MongoDB here later if needed
      // For now, just return the uploaded JSON back
      return res.status(200).json({
        success: true,
        message: "Upload successful",
        data,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  } else if (req.method === "GET") {
    // Example GET handler (return empty object or saved data)
    return res.status(200).json({ protocol: {} });
  } else {
    // ❌ Method not allowed
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
