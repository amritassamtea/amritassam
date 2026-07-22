import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";

// Load environment variables from .env
dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json());

// --- RAZORPAY API ROUTES ---

// 1. Create Order
app.post("/api/create-order", async (req, res) => {
  const { amount, currency, receipt } = req.body;
  if (!amount || amount < 100) {
    return res.status(400).json({ error: "Amount must be at least 100 paise" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_TG8tR9LgCQuTng";
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.warn("Razorpay credentials not found in env. Falling back to simulated/mock order.");
    return res.json({
      order_id: `mock_order_${Date.now()}`,
      amount: Math.round(amount),
      currency: currency || "INR",
      key_id: keyId,
      is_mock: true,
    });
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount), // ensure integer amount in paise
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      is_mock: false,
    });
  } catch (error: any) {
    console.warn("Error calling Razorpay API (e.g. invalid credentials). Falling back to simulated/mock order:", error.message || error);
    res.json({
      order_id: `mock_order_${Date.now()}`,
      amount: Math.round(amount),
      currency: currency || "INR",
      key_id: keyId || "mock_key_id",
      is_mock: true,
      reason: error.message || "Authentication failed"
    });
  }
});

// 2. Verify Payment Signature
app.post("/api/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required verification fields" });
  }

  // Graceful fallback for mock orders
  if (razorpay_order_id.startsWith("mock_") || razorpay_signature === "mock_signature") {
    return res.json({ status: "success", message: "Mock payment verified successfully" });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Razorpay secret key not configured on backend" });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ status: "success", message: "Payment verified successfully" });
  } else {
    res.status(400).json({ error: "Signature verification failed" });
  }
});

// 3. Process Refund
app.post("/api/refund-payment", async (req, res) => {
  const { payment_id, amount } = req.body;
  if (!payment_id) {
    return res.status(400).json({ error: "Payment ID is required for refund" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || payment_id.startsWith("pay_mock_")) {
    console.warn("Razorpay credentials not found or mock payment ID. Returning simulated refund response.");
    return res.json({
      status: "success",
      refund_id: `rfnd_mock_${Date.now()}`,
      amount: amount || 0,
      message: "Refund process initiated successfully (Simulated mode)."
    });
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const refund = await razorpay.payments.refund(payment_id, {
      amount: amount ? Math.round(amount) : undefined, // amount in paise
    });

    res.json({
      status: "success",
      refund_id: refund.id,
      amount: refund.amount,
      message: "Refund processed successfully with Razorpay to customer's account."
    });
  } catch (error: any) {
    console.error("Error processing Razorpay refund:", error);
    res.status(500).json({
      error: error.message || "Failed to process refund with Razorpay"
    });
  }
});

// --- VITE DEV / PRODUCTION HANDLERS ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
