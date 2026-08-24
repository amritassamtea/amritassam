import Razorpay from "razorpay";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, currency, receipt } = req.body || {};
  if (!amount || amount < 100) {
    return res.status(400).json({ error: "Amount must be at least 100 paise" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_live_TNAiAT6hLmRWuI";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "ztXAfY430eKJPyYJk99YK6Wh";

  try {
    const RazorpayClass = Razorpay.default || Razorpay;
    const razorpay = new RazorpayClass({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId
    });
  } catch (error) {
    const errDesc = error?.error?.description || error?.description || error?.message || "Failed to create Razorpay order";
    return res.status(500).json({ error: errDesc });
  }
}
