export type Role = 'ADMIN' | 'DISTRIBUTOR' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  mobile: string;
  password?: string; // Added password field
  role: Role;
  approved: boolean; // For distributors
  territory?: string;
  address?: string;
  gstNumber?: string; // Added for invoicing
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  weight: string;
  mrp: number; // Retail price
  distributorPrice: number; // Wholesale price
  costPrice: number; // Added for Profit Calculation
  stock: number;
  lowStockThreshold: number; // For inventory alerts
  category: 'Sachet' | 'Pouch' | 'Bulk';
  hsnCode?: string; // For GST Invoice
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SMSNotification {
  id: string;
  orderId: string;
  recipientMobile: string;
  recipientName: string;
  stage: 'Order Placed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Payment Updated' | 'Custom';
  message: string;
  sentAt: string;
  status: 'Sent' | 'Delivered' | 'Simulated' | 'Failed';
  trackingNumber?: string;
  courierName?: string;
}

export interface SMSProviderSettings {
  enabled: boolean;
  provider: 'FAST2SMS' | 'TWILIO' | 'SIMULATED';
  fast2smsApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  senderId?: string;
}

export interface Order {
  id: string;
  displayId?: string; // Human-readable unique format e.g. ORD-FA252361
  userId: string;
  userName: string;
  userMobile?: string;
  userAddress?: string;
  userGst?: string;
  items: CartItem[];
  totalAmount: number;
  taxAmount: number; // GST (5%)
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'UPI' | 'Card' | 'COD' | 'Cash' | 'Complimentary' | 'Waived';
  paymentStatus: 'Pending' | 'Paid' | 'Refunded';
  transactionId?: string; // Added for Razorpay Payment ID
  date: string;
  type: 'RETAIL' | 'WHOLESALE';
  invoiceNumber?: string;
  couponCode?: string;
  discountAmount?: number;
  trackingNumber?: string;
  courierName?: string;
  trackingUrl?: string;
  orderSource?: 'ONLINE' | 'MANUAL' | 'FRIEND_GIFT' | 'SAMPLE';
  notes?: string;
  smsNotifications?: SMSNotification[];
}

/**
 * Transforms raw UUIDs (e.g., 'fa252361-d557-4bae-9132-92f2c60e47bf')
 * or long numeric strings into a clean, human-readable, unique format like 'ORD-FA252361'.
 */
export const formatOrderId = (rawId?: string | null): string => {
  if (!rawId) return 'ORD-000000';
  const str = String(rawId).trim();
  if (/^ORD-[A-Z0-9]{4,12}$/i.test(str)) {
    return str.toUpperCase();
  }
  const clean = str.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length >= 8) {
    return `ORD-${clean.slice(0, 8).toUpperCase()}`;
  }
  return `ORD-${clean.toUpperCase()}`;
};

export type ExpenseCategory = 
  | 'Rent & Premises'
  | 'Electricity & Utilities'
  | 'Packaging & Materials'
  | 'Logistics & Freight'
  | 'Salaries & Wages'
  | 'Marketing & Ads'
  | 'Samples & Tea Tasting'
  | 'Printing & Stationery'
  | 'Maintenance & Repairs'
  | 'Tea Garden Sourcing'
  | 'Legal & Accounting'
  | 'Miscellaneous';

export interface ExpenseRecord {
  id: string;
  expenseNumber: string; // e.g. EXP-2026-001
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paidTo: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque';
  billRefNumber?: string;
  billUrl?: string; // Uploaded invoice / bill photo / PDF
  notes?: string;
  status: 'Paid' | 'Pending';
  createdBy?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierAddress?: string;
  supplierMobile?: string;
  supplierEmail?: string;
  billUrl?: string; // Uploaded supplier bill (base64 or URL)
  date: string;
  status: 'Pending' | 'Received' | 'Cancelled';
  items: PurchaseItem[];
  totalAmount: number;
}

export interface AnalyticsData {
  name: string;
  sales: number;
  orders: number;
}

export interface InvoiceSettings {
  companyName: string;
  email: string; // Added email field
  addressLine1: string;
  addressLine2: string;
  gstin: string;
  phone: string;
  footerNote: string;
}

export interface PaymentSettings {
  razorpayKeyId: string;
  merchantUpiId?: string;
}

export interface BrandAssets {
  logo: string | null; // Base64 string or URL
  heroImage: string; // Base64 string or URL
  featureImage: string; // Base64 string or URL for "Why Choose Us" section
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number; // e.g. 10 for 10%
  minOrderAmount?: number; // Minimum purchase required
  maxDiscountAmount?: number; // Maximum discount cap in INR
  isActive: boolean;
  expiryDate?: string;
  description?: string;
  createdAt?: string;
}
