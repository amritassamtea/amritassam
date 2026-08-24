import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env
dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json());

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://neajcfjhpkyqccntahha.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_fIiGnPcEg9YlgV59t-xiyg_CBt2J0gx";

// Helper to get active Razorpay Credentials safely
function getRazorpayCredentials() {
  let keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || keySecret.trim() === "" || keySecret.trim() === "mDRwyfjMwJTmcepn8OfHn260" || keySecret.trim() === "BFvu3Tx4WfSneO8vZnCE5KlP" || keySecret.trim() === "Pzk9HfiHvu894ySK0XrdSS4N" || keySecret.trim() === "FVf7UMGYYhmggGAWyYeCArkN") {
    keySecret = "ztXAfY430eKJPyYJk99YK6Wh";
  }

  let keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId || keyId.trim() === "" || keyId === "rzp_test_TGSXaCkUr8lyVc" || keyId === "rzp_test_TGSeD6kDjDtnoA" || keyId === "rzp_test_TGSnHi9bfhqqFK" || keyId === "rzp_test_TNAR6TMBbK2pv3") {
    keyId = "rzp_live_TNAiAT6hLmRWuI";
  }

  return { keyId, keySecret };
}

// --- RAZORPAY API ROUTES ---

// 1. Create Order
app.post("/api/create-order", async (req, res) => {
  const { amount, currency, receipt } = req.body;
  if (!amount || amount < 100) {
    return res.status(400).json({ error: "Amount must be at least 100 paise" });
  }

  const { keyId, keySecret } = getRazorpayCredentials();

  try {
    const RazorpayClass = (Razorpay as any).default || Razorpay;
    const razorpay = new RazorpayClass({
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
    });
  } catch (error: any) {
    const errDesc = error?.error?.description || error?.description || error?.message || "Failed to create Razorpay order";
    console.error("Razorpay order creation error:", errDesc);
    res.status(500).json({ error: errDesc });
  }
});

// 2. Verify Payment Signature
app.post("/api/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required verification fields" });
  }

  const { keySecret } = getRazorpayCredentials();

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
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

  const { keyId, keySecret } = getRazorpayCredentials();

  try {
    const RazorpayClass = (Razorpay as any).default || Razorpay;
    const razorpay = new RazorpayClass({
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
      message: "Refund processed successfully with Razorpay."
    });
  } catch (error: any) {
    const errDesc = error?.error?.description || error?.description || error?.message || "Failed to process refund";
    console.error("Razorpay refund error:", errDesc);
    res.status(500).json({ error: errDesc });
  }
});

// --- ADMIN & AUTH API ROUTES ---

// 4. Admin Update User Password directly via Supabase Service Role
app.post("/api/admin/update-user-password", async (req, res) => {
  const { userId, newPassword, serviceRoleKey } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ error: "User ID and new password are required." });
  }

  const activeServiceKey = (serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "").trim();

  if (!activeServiceKey) {
    return res.status(400).json({ 
      error: "Supabase Service Role Key is required to directly change another user's password without email confirmation. Please provide your Supabase Service Role Key in Admin Settings or SUPABASE_SERVICE_ROLE_KEY env variable.",
      requiresKey: true 
    });
  }

  try {
    const adminSupabase = createClient(SUPABASE_URL, activeServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      console.error("Supabase Admin password update error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.json({ 
      status: "success", 
      message: "User password has been successfully updated in Supabase Auth." 
    });
  } catch (err: any) {
    console.error("Server admin password update exception:", err);
    return res.status(500).json({ error: err.message || "Failed to update password" });
  }
});

// 5. Send Password Reset Email / Magic Link
app.post("/api/auth/send-reset-email", async (req, res) => {
  const { email, mobile } = req.body;
  const targetEmail = email || (mobile ? `${mobile}@amritassam.com` : null);

  if (!targetEmail) {
    return res.status(400).json({ error: "Email or mobile number is required." });
  }

  try {
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(targetEmail);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ status: "success", message: `Password reset instructions sent to ${targetEmail}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to send reset email" });
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
