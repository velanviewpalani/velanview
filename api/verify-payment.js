const crypto = require("crypto");

const allowedOrigins = new Set([
  "https://velanview.in",
  "https://www.velanview.in",
  "https://velanview.vercel.app",
]);

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, error: "Razorpay server configuration is missing" });
  }

  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: "Missing payment verification fields",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signature, "utf8");

    const valid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!valid) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: "Payment signature mismatch",
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      payment_id: paymentId,
      order_id: orderId,
    });
  } catch (error) {
    console.error("Razorpay verify-payment error:", error);
    return res.status(500).json({
      success: false,
      verified: false,
      error: "Unable to verify payment",
    });
  }
};
