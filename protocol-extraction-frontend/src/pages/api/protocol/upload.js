export default async function handler(req, res) {
  if (req.method !== "POST") {
    // Reject anything that's not POST
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Body is already parsed by Next.js if Content-Type is application/json
    const data = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({ success: false, error: "Invalid JSON data" });
    }

    // TODO: If you want to connect to MongoDB, you can insert here
    // Example:
    // await db.collection("protocols").insertOne(data);

    return res.status(200).json({
      success: true,
      message: "Protocol JSON uploaded successfully",
      data,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({ success: false, error: "Upload failed" });
  }
}
