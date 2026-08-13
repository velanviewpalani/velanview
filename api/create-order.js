const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ success: false, error: "Razorpay server configuration is missing" });
  }

  try {
    const { amount, currency = "INR", receipt } = req.body || {};
    const amountPaise = Number(amount);

    if (!Number.isInteger(amountPaise) || amountPaise < 100) {
      return res.status(400).json({
        success: false,
        error: "Amount must be an integer of at least 100 paise",
      });
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt: receipt || `VVH_${Date.now()}`,
    });

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create-order error:", error);

    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, error: "Razorpay authentication failed" });
    }

    return res.status(500).json({
      success: false,
      error: "Unable to create Razorpay order",
    });
  }
};
