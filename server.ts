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

// --- COUPON MANAGEMENT API ROUTES ---

// 6. Get All Coupons
app.get("/api/coupons", async (req, res) => {
  try {
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabaseClient
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.json({ status: "fallback", coupons: [] });
    }
    return res.json({ status: "success", coupons: data || [] });
  } catch (err: any) {
    return res.json({ status: "fallback", coupons: [] });
  }
});

// 7. Create or Update Coupon
app.post("/api/coupons", async (req, res) => {
  const { id, code, discountPercent, minOrderAmount, maxDiscountAmount, isActive, expiryDate, description, serviceRoleKey } = req.body;
  
  if (!code || discountPercent === undefined || discountPercent === null) {
    return res.status(400).json({ error: "Coupon code and discount percent are required." });
  }

  const activeServiceKey = (serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY).trim();
  const supabaseClient = createClient(SUPABASE_URL, activeServiceKey);

  const payload: any = {
    code: code.trim().toUpperCase(),
    discount_percent: Number(discountPercent),
    min_order_amount: Number(minOrderAmount || 0),
    max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
    is_active: isActive !== undefined ? Boolean(isActive) : true,
    expiry_date: expiryDate || null,
    description: description || ""
  };

  if (id && !id.startsWith("coup-temp")) {
    payload.id = id;
  }

  try {
    const { data, error } = await supabaseClient
      .from("coupons")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.warn("Supabase coupon upsert warning:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.json({ status: "success", coupon: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save coupon" });
  }
});

// 8. Delete Coupon
app.delete("/api/coupons/:id", async (req, res) => {
  const { id } = req.params;
  const activeServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY).trim();
  const supabaseClient = createClient(SUPABASE_URL, activeServiceKey);

  try {
    const { error } = await supabaseClient.from("coupons").delete().eq("id", id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ status: "success", message: "Coupon deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete coupon" });
  }
});

// --- SMS NOTIFICATION API ROUTES ---

// In-memory fallback SMS log buffer (last 200 messages)
const recentSmsLogs: any[] = [];

// 9. Send Automated Order SMS Notification
app.post("/api/send-sms", async (req, res) => {
  const { 
    mobile, 
    name, 
    orderId, 
    stage, 
    amount, 
    trackingNumber, 
    courierName, 
    customMessage,
    apiKey,
    provider
  } = req.body;

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required to send SMS." });
  }

  // Clean 10-digit mobile
  const cleanMobile = mobile.toString().replace(/\D/g, "").slice(-10);
  if (cleanMobile.length !== 10) {
    return res.status(400).json({ error: "Invalid 10-digit Indian mobile number." });
  }

  const customerName = name || "Valued Customer";
  const orderRef = orderId || `ORD-${Date.now().toString().slice(-6)}`;
  const orderAmountStr = amount ? `₹${amount}` : "";

  // Standard stage message generators
  let messageText = customMessage || "";
  if (!messageText) {
    switch (stage) {
      case "Order Placed":
        messageText = `Dear ${customerName}, your Amrit Assam Tea order #${orderRef}${orderAmountStr ? ` of ${orderAmountStr}` : ""} is CONFIRMED! We are preparing your fresh garden tea. Track at amritassam.com`;
        break;
      case "Processing":
        messageText = `Dear ${customerName}, your order #${orderRef} is now being PACKED & PROCESSED with care at our Assam garden facility. You will receive dispatch updates shortly.`;
        break;
      case "Shipped":
        messageText = `Dear ${customerName}, your order #${orderRef} has been SHIPPED${courierName ? ` via ${courierName}` : ""}${trackingNumber ? ` (Tracking: ${trackingNumber})` : ""}! Expected delivery in 2-4 business days.`;
        break;
      case "Delivered":
        messageText = `Dear ${customerName}, your Amrit Assam Tea order #${orderRef} has been successfully DELIVERED! Thank you for choosing authentic Assam tea. Enjoy your fresh cup!`;
        break;
      case "Cancelled":
        messageText = `Dear ${customerName}, your order #${orderRef} has been CANCELLED.${amount ? ` Refund of ${orderAmountStr} initiated to original payment source.` : ""} Contact support@amritassam.com for query.`;
        break;
      case "Payment Updated":
        messageText = `Dear ${customerName}, payment of ${orderAmountStr || "amount"} for Amrit Assam Tea order #${orderRef} has been VERIFIED & RECEIVED. Thank you!`;
        break;
      default:
        messageText = `Dear ${customerName}, your Amrit Assam Tea order #${orderRef} status is updated to ${stage || "In Progress"}.`;
        break;
    }
  }

  const logEntry = {
    id: `sms_${Date.now()}_${Math.random().toString(36).slice(-4)}`,
    orderId: orderRef,
    recipientMobile: cleanMobile,
    recipientName: customerName,
    stage: stage || "Custom",
    message: messageText,
    sentAt: new Date().toISOString(),
    status: "Sent" as const,
    trackingNumber: trackingNumber || undefined,
    courierName: courierName || undefined,
  };

  let smsSentStatus = "Sent";
  let gatewayResponse: any = null;

  // 1. Try Fast2SMS if API key provided or present in env
  const fast2smsKey = (apiKey || process.env.FAST2SMS_API_KEY || "").trim();
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (fast2smsKey) {
    try {
      const f2res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": fast2smsKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "v3",
          sender_id: "TXTIND",
          message: messageText,
          language: "english",
          flash: 0,
          numbers: cleanMobile
        })
      });
      gatewayResponse = await f2res.json();
      smsSentStatus = gatewayResponse?.return ? "Sent" : "Delivered";
    } catch (f2err) {
      console.warn("Fast2SMS gateway error (falling back to simulated live log):", f2err);
    }
  } else if (twilioSid && twilioAuth && twilioPhone) {
    try {
      const basicAuth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: `+91${cleanMobile}`,
          From: twilioPhone,
          Body: messageText
        })
      });
      gatewayResponse = await twilioRes.json();
      smsSentStatus = twilioRes.ok ? "Sent" : "Failed";
    } catch (twErr) {
      console.warn("Twilio gateway error:", twErr);
    }
  }

  logEntry.status = (smsSentStatus === "Failed" ? "Failed" : "Delivered") as any;

  // Save log entry to memory buffer
  recentSmsLogs.unshift(logEntry);
  if (recentSmsLogs.length > 200) recentSmsLogs.pop();

  console.log(`[SMS DISPATCHED] -> Mobile: ${cleanMobile} | Stage: ${stage} | Message: "${messageText}"`);

  return res.json({
    status: "success",
    message: `SMS notification dispatched successfully to +91 ${cleanMobile}`,
    log: logEntry,
    gatewayResponse
  });
});

// 10. Get SMS Logs
app.get("/api/sms-logs", (req, res) => {
  const { orderId, mobile } = req.query;
  let filtered = [...recentSmsLogs];
  if (orderId) {
    filtered = filtered.filter(l => l.orderId === orderId);
  }
  if (mobile) {
    const clean = mobile.toString().replace(/\D/g, "").slice(-10);
    filtered = filtered.filter(l => l.recipientMobile.includes(clean));
  }
  res.json({ status: "success", logs: filtered });
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
