// protocol-extraction-frontend/api/protocol/upload.js
// Plain Vercel Serverless Function (for CRA or static site)
module.exports = async (req, res) => {
  if (req.method === "POST") {
    try {
      // Expect JSON body from the frontend
      const data = req.body;

      if (!data || typeof data !== "object") {
        return res.status(400).json({ success: false, error: "Invalid or missing JSON body" });
      }

      // Keep upload in a global store for quick testing (not persistent across all invocations)
      global.__protocol_store = global.__protocol_store || {};
      global.__protocol_store.data = data;

      return res.status(200).json({
        success: true,
        message: "Protocol JSON uploaded successfully",
        // return small summary to help debugging
        meta: { keys: Object.keys(data).length },
      });
    } catch (err) {
      console.error("upload error:", err);
      return res.status(500).json({ success: false, error: err.message || "Upload failed" });
    }
  }

  // If not POST, return allowed methods
  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
};
