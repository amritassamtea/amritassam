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

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userAddress?: string;
  userGst?: string;
  items: CartItem[];
  totalAmount: number;
  taxAmount: number; // GST
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'UPI' | 'Card' | 'COD' | 'Cash';
  paymentStatus: 'Pending' | 'Paid';
  transactionId?: string; // Added for Razorpay Payment ID
  date: string;
  type: 'RETAIL' | 'WHOLESALE';
  invoiceNumber?: string;
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