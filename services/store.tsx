import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Product, CartItem, Order, Role, InvoiceSettings, PurchaseOrder, PaymentSettings, Review, BrandAssets, Coupon } from '../types';
import { PRODUCTS, MOCK_USERS } from '../constants';
import { supabase } from './supabase';

interface StoreContextType {
  user: User | null;
  products: Product[];
  orders: Order[];
  purchaseOrders: PurchaseOrder[];
  cart: CartItem[];
  users: User[]; 
  reviews: Review[];
  coupons: Coupon[];
  invoiceSettings: InvoiceSettings;
  paymentSettings: PaymentSettings;
  brandAssets: BrandAssets;
  login: (mobile: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, mobile: string, password: string, role: Role, territory?: string) => Promise<void>;
  addUser: (user: User) => Promise<void>; 
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  placeOrder: (paymentMethod: 'UPI' | 'Card' | 'COD' | 'Cash' | 'MANUAL_UPI', address: string, paymentStatus?: 'Pending' | 'Paid', transactionId?: string, recipientDetails?: { name?: string; mobile?: string }, couponInfo?: { code: string; discountAmount: number }) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>; 
  addPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  deletePurchaseOrder: (poId: string) => Promise<void>;
  receivePurchaseOrder: (poId: string) => Promise<void>;
  updatePurchaseOrderBill: (poId: string, billUrl: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: Order['paymentStatus']) => Promise<void>;
  approveDistributor: (userId: string) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateStock: (productId: string, newStock: number) => Promise<void>;
  updateInvoiceSettings: (settings: InvoiceSettings) => Promise<void>;
  updatePaymentSettings: (settings: PaymentSettings) => Promise<void>;
  updateBrandAssets: (assets: BrandAssets) => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  updateReview: (review: Review) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  addFakeReview: (review: Review) => Promise<void>;
  fetchCoupons: () => Promise<void>;
  addCoupon: (coupon: Omit<Coupon, 'id'>) => Promise<{ success: boolean; message: string }>;
  updateCoupon: (coupon: Coupon) => Promise<{ success: boolean; message: string }>;
  toggleCouponStatus: (couponId: string, isActive: boolean) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  validateCoupon: (code: string, cartTotal: number) => { valid: boolean; message: string; discountPercent?: number; discountAmount?: number; coupon?: Coupon };
  clearOnlineOrders: () => void;
  updateUserPassword: (userId: string, newPassword: string, customServiceKey?: string) => Promise<{ success: boolean; message: string; requiresKey?: boolean }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// --- HELPER MAPPERS (DB snake_case <-> App camelCase) ---

const mapProductFromDB = (p: any): Product => ({
  id: p.id,
  name: p.name,
  description: p.description || '',
  image: p.image_url || '',
  weight: p.weight || '',
  mrp: p.mrp,
  distributorPrice: p.distributor_price,
  costPrice: p.cost_price,
  stock: p.stock,
  lowStockThreshold: p.low_stock_threshold,
  category: p.category,
  hsnCode: p.hsn_code
});

const mapUserFromDB = (u: any): User => ({
  id: u.id,
  name: u.name,
  mobile: u.mobile,
  role: u.role,
  approved: u.approved,
  territory: u.territory,
  address: u.address,
  gstNumber: u.gst_number
});

const mapOrderFromDB = (o: any, items: any[] = [], availableProducts: Product[] = [], availableUsers: User[] = []): Order => {
  // Extract recipient details from shipping_address if present
  let resolvedName = o.profiles?.name;
  let resolvedMobile = o.profiles?.mobile || o.profiles?.phone;
  let resolvedAddress = o.shipping_address || o.profiles?.address || '';

  if (o.shipping_address && typeof o.shipping_address === 'string') {
    const match = o.shipping_address.match(/Recipient:\s*([^(|]+)(?:\(Ph:\s*([^)]+)\))?/i);
    if (match) {
      if (!resolvedName || resolvedName === 'Unknown') {
        resolvedName = match[1].trim();
      }
      if (!resolvedMobile && match[2]) {
        resolvedMobile = match[2].trim();
      }
    }
  }

  // Fallback to finding user in users list
  if (!resolvedName || resolvedName === 'Unknown') {
    const matchedUser = availableUsers.find(u => u.id === o.user_id);
    if (matchedUser) {
      resolvedName = matchedUser.name;
      if (!resolvedMobile) resolvedMobile = matchedUser.mobile;
      if (!resolvedAddress) resolvedAddress = matchedUser.address || '';
    }
  }

  const mappedItems: CartItem[] = (items || []).map(i => {
    const matchingProd = availableProducts.find(p => p.id === (i.product_id || i.products?.id));
    return {
      id: i.products?.id || i.product_id || matchingProd?.id || `item-${Math.random()}`,
      name: i.products?.name || matchingProd?.name || 'Assam Gold Tea',
      image: i.products?.image_url || matchingProd?.image || '',
      weight: i.products?.weight || matchingProd?.weight || '250g',
      mrp: Number(i.products?.mrp || matchingProd?.mrp || i.price_per_unit || 0),
      distributorPrice: Number(i.products?.distributor_price || matchingProd?.distributorPrice || i.price_per_unit || 0),
      costPrice: Number(i.products?.cost_price || matchingProd?.costPrice || 0),
      category: i.products?.category || matchingProd?.category || 'Pouch',
      lowStockThreshold: Number(i.products?.low_stock_threshold || matchingProd?.lowStockThreshold || 10),
      description: i.products?.description || matchingProd?.description || '',
      stock: Number(i.products?.stock || matchingProd?.stock || 0),
      quantity: Number(i.quantity || 1)
    };
  });

  return {
    id: o.id,
    userId: o.user_id,
    userName: resolvedName || 'Customer',
    userMobile: resolvedMobile || '',
    userAddress: resolvedAddress,
    userGst: o.profiles?.gst_number || '',
    items: mappedItems,
    totalAmount: Number(o.total_amount || 0),
    taxAmount: Number(o.tax_amount || 0),
    status: o.status || 'Processing',
    paymentMethod: o.payment_method || 'UPI',
    paymentStatus: o.payment_status || 'Paid',
    transactionId: o.transaction_id || undefined,
    date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    type: o.order_type || 'RETAIL',
    invoiceNumber: o.invoice_number || `INV-${o.id.toString().slice(-6)}`,
    couponCode: o.coupon_code || undefined,
    discountAmount: o.discount_amount ? Number(o.discount_amount) : undefined
  };
};

const mapCouponFromDB = (c: any): Coupon => ({
  id: c.id ? c.id.toString() : `coup-${Date.now()}`,
  code: (c.code || '').toUpperCase().trim(),
  discountPercent: Number(c.discount_percent !== undefined ? c.discount_percent : (c.discountPercent || 0)),
  minOrderAmount: Number(c.min_order_amount !== undefined ? c.min_order_amount : (c.minOrderAmount || 0)),
  maxDiscountAmount: (c.max_discount_amount !== null && c.max_discount_amount !== undefined) ? Number(c.max_discount_amount) : (c.maxDiscountAmount ? Number(c.maxDiscountAmount) : undefined),
  isActive: c.is_active !== undefined ? Boolean(c.is_active) : (c.isActive !== undefined ? Boolean(c.isActive) : true),
  expiryDate: c.expiry_date || c.expiryDate || undefined,
  description: c.description || '',
  createdAt: c.created_at || c.createdAt || new Date().toISOString()
});

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'coup-1',
    code: 'AMRIT10',
    discountPercent: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 500,
    isActive: true,
    description: 'Get 10% instant discount on your order',
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup-2',
    code: 'WELCOME15',
    discountPercent: 15,
    minOrderAmount: 500,
    maxDiscountAmount: 1000,
    isActive: true,
    description: 'Special 15% discount on orders above ₹500',
    createdAt: new Date().toISOString()
  },
  {
    id: 'coup-3',
    code: 'SUPERTEA20',
    discountPercent: 20,
    minOrderAmount: 1000,
    maxDiscountAmount: 2000,
    isActive: true,
    description: 'Flat 20% discount on orders above ₹1,000',
    createdAt: new Date().toISOString()
  }
];

// --- DEFAULTS ---

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  companyName: 'Amrit Assam Gold Tea',
  email: 'support@amritassam.com',
  addressLine1: 'Office No. 45, Grain Market, APMC Vashi',
  addressLine2: 'Navi Mumbai - 400705',
  gstin: '27AAAAA0000A1Z5',
  phone: '', 
  footerNote: 'Thank you for choosing Amrit Assam Gold Tea. Goods once sold will not be taken back.'
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  razorpayKeyId: 'rzp_live_TNAiAT6hLmRWuI',
  merchantUpiId: 'amritassamtea@okaxis'
};

const DEFAULT_BRAND_ASSETS: BrandAssets = {
  logo: null,
  heroImage: 'https://picsum.photos/seed/teafield/1600/900',
  featureImage: 'https://picsum.photos/seed/teamaking/600/400'
};

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in ms

export const StoreProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const lastAct = localStorage.getItem('amrit_assam_last_activity') || sessionStorage.getItem('amrit_assam_last_activity');
      if (lastAct && Date.now() - parseInt(lastAct, 10) >= INACTIVITY_TIMEOUT) {
        localStorage.removeItem('amrit_assam_cached_user');
        localStorage.removeItem('amrit_assam_last_activity');
        sessionStorage.removeItem('amrit_assam_cached_user');
        sessionStorage.removeItem('amrit_assam_last_activity');
        return null;
      }
      const cached = localStorage.getItem('amrit_assam_cached_user') || sessionStorage.getItem('amrit_assam_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem('amrit_assam_orders_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Admin view of all users
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const cached = localStorage.getItem('amrit_assam_coupons');
      return cached ? JSON.parse(cached) : DEFAULT_COUPONS;
    } catch {
      return DEFAULT_COUPONS;
    }
  });
  
  // Settings State
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [brandAssets, setBrandAssets] = useState<BrandAssets>(DEFAULT_BRAND_ASSETS);

  const [cart, setCart] = useState<CartItem[]>([]);

  // --- DATA FETCHING ---
  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (data) {
        if (data.length === 0) {
            await seedProducts();
        } else {
            setProducts(data.map(mapProductFromDB));
        }
    }
  };

  const seedProducts = async () => {
      const dbProducts = PRODUCTS.map(p => ({
          name: p.name,
          description: p.description,
          image_url: p.image,
          weight: p.weight,
          mrp: p.mrp,
          distributor_price: p.distributorPrice,
          cost_price: p.costPrice,
          stock: p.stock,
          low_stock_threshold: p.lowStockThreshold,
          category: p.category,
          hsn_code: '0902'
      }));
      const { data } = await supabase.from('products').insert(dbProducts).select();
      if(data) setProducts(data.map(mapProductFromDB));
  };

  const fetchOrders = async () => {
    try {
      // 1. Try Joined Query with profiles and order_items
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
            *,
            profiles (name, mobile, address, gst_number),
            order_items (
                quantity,
                price_per_unit,
                product_id,
                products (*)
            )
        `)
        .order('created_at', { ascending: false });

      if (!error && ordersData && ordersData.length > 0) {
        const mappedOrders = ordersData.map(o => mapOrderFromDB(o, o.order_items, products, users));
        setOrders(prev => {
          const ids = new Set(mappedOrders.map(m => m.id));
          const recents = prev.filter(p => !ids.has(p.id));
          const merged = [...recents, ...mappedOrders];
          try {
            localStorage.setItem('amrit_assam_orders_cache', JSON.stringify(merged.slice(0, 100)));
          } catch (e) {}
          return merged;
        });
        return;
      }

      // 2. Fallback: Query orders and items separately to bypass join restrictions
      const { data: simpleOrders, error: simpleError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (simpleOrders && simpleOrders.length > 0) {
        const orderIds = simpleOrders.map(o => o.id);
        const { data: allItems } = await supabase
          .from('order_items')
          .select('*, products(*)')
          .in('order_id', orderIds);

        const itemsByOrder: Record<string, any[]> = {};
        (allItems || []).forEach(item => {
          if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
          itemsByOrder[item.order_id].push(item);
        });

        const mapped = simpleOrders.map(o => mapOrderFromDB(o, itemsByOrder[o.id] || [], products, users));
        setOrders(prev => {
          const ids = new Set(mapped.map(m => m.id));
          const recents = prev.filter(p => !ids.has(p.id));
          const merged = [...recents, ...mapped];
          try {
            localStorage.setItem('amrit_assam_orders_cache', JSON.stringify(merged.slice(0, 100)));
          } catch (e) {}
          return merged;
        });
        return;
      }

      // 3. Fallback to cached orders from localStorage if DB query returned empty
      const cached = localStorage.getItem('amrit_assam_orders_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error("fetchOrders error:", err);
      const cached = localStorage.getItem('amrit_assam_orders_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setOrders(parsed);
        } catch (e) {}
      }
    }
  };

  const fetchCoupons = async () => {
    try {
      // 1. Try Supabase query
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapCouponFromDB);
        setCoupons(mapped);
        try {
          localStorage.setItem('amrit_assam_coupons', JSON.stringify(mapped));
        } catch (e) {}
        return;
      }

      // If table exists but empty, seed default coupons
      if (!error && data && data.length === 0) {
        for (const c of DEFAULT_COUPONS) {
          try {
            await supabase.from('coupons').insert({
              code: c.code,
              discount_percent: c.discountPercent,
              min_order_amount: c.minOrderAmount || 0,
              max_discount_amount: c.maxDiscountAmount || null,
              is_active: c.isActive,
              description: c.description
            });
          } catch (e) {}
        }
        setCoupons(DEFAULT_COUPONS);
        try {
          localStorage.setItem('amrit_assam_coupons', JSON.stringify(DEFAULT_COUPONS));
        } catch (e) {}
        return;
      }

      // 2. Try Server API
      const res = await fetch('/api/coupons');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.coupons) && json.coupons.length > 0) {
          const mapped = json.coupons.map(mapCouponFromDB);
          setCoupons(mapped);
          try {
            localStorage.setItem('amrit_assam_coupons', JSON.stringify(mapped));
          } catch (e) {}
          return;
        }
      }
    } catch (err) {
      console.warn("fetchCoupons note:", err);
    }
  };

  const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setUsers(data.map(mapUserFromDB));
  };

  const fetchReviews = async () => {
      // Explicitly selecting reviewer_name to ensure it's fetched
      const { data } = await supabase.from('reviews').select(`*, reviewer_name, profiles(name)`).order('created_at', { ascending: false });
      if (data) {
          setReviews(data.map((r: any) => ({
              id: r.id,
              productId: r.product_id,
              userId: r.user_id || '',
              // Priority: Manual Name -> Linked Profile Name -> Anonymous
              userName: r.reviewer_name || r.profiles?.name || 'Anonymous',
              rating: r.rating,
              comment: r.comment,
              date: new Date(r.created_at).toISOString().split('T')[0]
          })));
      }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const { data: posData, error } = await supabase
        .from('purchase_orders')
        .select(`
            *,
            purchase_order_items (
                *,
                products (name)
            )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Joined purchase_orders query failed, trying simple query:", error);
        const { data: simplePOs } = await supabase
          .from('purchase_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (simplePOs && simplePOs.length > 0) {
          const mappedSimple = simplePOs.map((po: any) => ({
            id: po.id,
            poNumber: po.po_number || `PO-${po.id}`,
            supplierName: po.supplier_name || 'Supplier',
            supplierAddress: po.supplier_address || '',
            supplierMobile: po.supplier_mobile || '',
            supplierEmail: po.supplier_email || '',
            billUrl: po.bill_url || '',
            date: po.created_at ? new Date(po.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: po.status || 'Pending',
            totalAmount: Number(po.total_amount) || 0,
            items: []
          }));
          setPurchaseOrders(mappedSimple);
        }
        return;
      }

      if (posData) {
        const mappedPOs = posData.map((po: any) => ({
          id: po.id,
          poNumber: po.po_number || `PO-${po.id}`,
          supplierName: po.supplier_name || 'Supplier',
          supplierAddress: po.supplier_address || '',
          supplierMobile: po.supplier_mobile || '',
          supplierEmail: po.supplier_email || '',
          billUrl: po.bill_url || '',
          date: po.created_at ? new Date(po.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: po.status || 'Pending',
          totalAmount: Number(po.total_amount) || 0,
          items: (po.purchase_order_items || []).map((item: any) => ({
            productId: item.product_id,
            productName: item.products?.name || 'Tea Product',
            quantity: item.quantity,
            unitCost: item.unit_cost,
            totalCost: item.total_cost
          }))
        }));
        setPurchaseOrders(mappedPOs);
      }
    } catch (err) {
      console.error("fetchPurchaseOrders error:", err);
    }
  };

  // Fetch Site Settings from DB
  const fetchSettings = async () => {
      try {
          // Attempt to fetch ID 1
          const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
          
          if (data) {
             // Extract UPI ID from footer_note if present
             let footerRaw = data.footer_note || DEFAULT_INVOICE_SETTINGS.footerNote;
             let customUpi = 'amritassamtea@okaxis';
             const upiMatch = footerRaw.match(/\[UPI:([^\]]+)\]/);
             if (upiMatch) {
                 customUpi = upiMatch[1];
             }
             const displayFooter = footerRaw.replace(/\[UPI:[^\]]+\]/, "").trim();

             // Map DB to State
             setInvoiceSettings({
                 companyName: data.company_name || DEFAULT_INVOICE_SETTINGS.companyName,
                 email: data.email || DEFAULT_INVOICE_SETTINGS.email,
                 addressLine1: data.address_line_1 || DEFAULT_INVOICE_SETTINGS.addressLine1,
                 addressLine2: data.address_line_2 || DEFAULT_INVOICE_SETTINGS.addressLine2,
                 gstin: data.gstin || DEFAULT_INVOICE_SETTINGS.gstin,
                 phone: data.phone || DEFAULT_INVOICE_SETTINGS.phone,
                 footerNote: displayFooter
             });
             let rzpKey = data.razorpay_key_id || DEFAULT_PAYMENT_SETTINGS.razorpayKeyId;
             if (rzpKey === 'rzp_test_1DP5mmOlF5G5ag' || rzpKey === 'rzp_test_TG637ITm48z8Ra' || rzpKey === 'rzp_test_TB2Phw7nWzv1u8' || rzpKey === 'rzp_test_TG67jxp1pHTgMB' || rzpKey === 'rzp_test_TG8tR9LgCQuTng' || rzpKey === 'rzp_test_TG5H5KQvhI4q2g' || rzpKey === 'rzp_test_TGSeD6kDjDtnoA' || rzpKey === 'rzp_test_TGSnHi9bfhqqFK' || rzpKey === 'rzp_test_TGSXaCkUr8lyVc' || rzpKey === 'rzp_test_TNAR6TMBbK2pv3') {
                 rzpKey = 'rzp_live_TNAiAT6hLmRWuI';
                 // Self-heal DB: update stale or default database values asynchronously
                 supabase.from('site_settings').update({ razorpay_key_id: rzpKey }).eq('id', 1).then();
             }
             setPaymentSettings({
                 razorpayKeyId: rzpKey,
                 merchantUpiId: customUpi
             });
             setBrandAssets({
                 logo: data.logo || null,
                 heroImage: data.hero_image || DEFAULT_BRAND_ASSETS.heroImage,
                 featureImage: data.feature_image || DEFAULT_BRAND_ASSETS.featureImage
             });
          } else {
             // If no row exists, insert defaults
             await supabase.from('site_settings').insert({
                 id: 1,
                 company_name: DEFAULT_INVOICE_SETTINGS.companyName,
                 email: DEFAULT_INVOICE_SETTINGS.email,
                 address_line_1: DEFAULT_INVOICE_SETTINGS.addressLine1,
                 address_line_2: DEFAULT_INVOICE_SETTINGS.addressLine2,
                 gstin: DEFAULT_INVOICE_SETTINGS.gstin,
                 phone: DEFAULT_INVOICE_SETTINGS.phone,
                 footer_note: DEFAULT_INVOICE_SETTINGS.footerNote,
                 razorpay_key_id: DEFAULT_PAYMENT_SETTINGS.razorpayKeyId,
                 hero_image: DEFAULT_BRAND_ASSETS.heroImage,
                 feature_image: DEFAULT_BRAND_ASSETS.featureImage
             });
          }
      } catch (err) {
          console.error("Error fetching settings:", err);
      }
  };

  // Initial Load
  useEffect(() => {
    fetchProducts();
    fetchReviews();
    fetchCoupons(); // Load active coupons from DB / API
    fetchSettings(); // Load Settings from DB
    fetchPurchaseOrders(); // Sync purchase orders from DB
    fetchOrders(); // Eagerly load orders

    // Eagerly fetch relevant data if user is cached in local storage
    try {
      const cached = localStorage.getItem('amrit_assam_cached_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          fetchOrders();
          fetchPurchaseOrders();
          fetchCoupons();
          if (parsed.role === 'ADMIN') {
            fetchUsers();
          }
        }
      }
    } catch (e) {
      console.error("Error reading cached user on start:", e);
    }
    
    // Check Active Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
          supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => {
             if(data) {
                 const mapped = mapUserFromDB(data);
                 setUser(mapped);
                 const nowStr = Date.now().toString();
                 localStorage.setItem('amrit_assam_cached_user', JSON.stringify(mapped));
                 localStorage.setItem('amrit_assam_last_activity', nowStr);
                 sessionStorage.setItem('amrit_assam_cached_user', JSON.stringify(mapped));
                 sessionStorage.setItem('amrit_assam_last_activity', nowStr);
             }
          });
          fetchOrders();
          fetchUsers();
          fetchPurchaseOrders();
      }
    });

    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
             supabase.from('profiles').select('*').eq('id', session.user.id).single()
            .then(({ data }) => {
                if(data) {
                    const mapped = mapUserFromDB(data);
                    setUser(mapped);
                    const nowStr = Date.now().toString();
                    localStorage.setItem('amrit_assam_cached_user', JSON.stringify(mapped));
                    localStorage.setItem('amrit_assam_last_activity', nowStr);
                    sessionStorage.setItem('amrit_assam_cached_user', JSON.stringify(mapped));
                    sessionStorage.setItem('amrit_assam_last_activity', nowStr);
                    if(data.role === 'ADMIN') {
                        fetchOrders();
                        fetchUsers();
                        fetchPurchaseOrders();
                    } else {
                        fetchOrders();
                        fetchPurchaseOrders();
                    }
                }
            });
        } else if (_event === 'SIGNED_OUT') {
            // Under iframe sandboxes, background token refresh failures trigger spurious SIGNED_OUT events.
            // We ignore background SIGNED_OUT events to keep the user session robust and resilient.
            // Explicit logouts are already handled directly by the logout action.
            console.warn("Background SIGNED_OUT event received. Local session preserved.");
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- INACTIVITY 10 MIN AUTO LOGOUT MONITOR ---
  useEffect(() => {
    if (!user) return;

    const now = Date.now();
    localStorage.setItem('amrit_assam_last_activity', now.toString());
    sessionStorage.setItem('amrit_assam_last_activity', now.toString());

    let lastActivityTime = now;

    const handleUserActivity = () => {
      const current = Date.now();
      if (current - lastActivityTime > 3000) {
        lastActivityTime = current;
        localStorage.setItem('amrit_assam_last_activity', current.toString());
        sessionStorage.setItem('amrit_assam_last_activity', current.toString());
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'focus'];
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const storedLastAct = localStorage.getItem('amrit_assam_last_activity') || sessionStorage.getItem('amrit_assam_last_activity');
      const lastAct = storedLastAct ? parseInt(storedLastAct, 10) : lastActivityTime;
      if (Date.now() - lastAct >= INACTIVITY_TIMEOUT) {
        alert("You were inactive for 10 minutes and have been automatically logged out for security. Please log in again.");
        logout();
      }
    }, 10000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(checkInterval);
    };
  }, [user]);

  // --- ACTIONS ---

  const login = async (mobile: string, password: string): Promise<boolean> => {
    const email = `${mobile}@amritassam.com`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        if (error.message.includes("Email logins are disabled")) {
            alert("Configuration Error: 'Email Provider' is disabled in Supabase. Please go to Supabase Dashboard -> Authentication -> Providers and enable 'Email' provider.");
        } else if (error.message.includes("Email not confirmed")) {
            alert("Account Pending: Your email/mobile is not verified. \n\nFix 1: Run the Admin SQL query provided. \nFix 2: Go to Supabase -> Authentication -> Providers -> Email -> Disable 'Confirm email'.");
        } else {
            alert("Login Failed: " + error.message);
        }
        return false;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    
    if (profile) {
        if (profile.role === 'DISTRIBUTOR' && !profile.approved) {
            alert("Your distributor account is pending approval by Admin.");
            supabase.auth.signOut();
            localStorage.removeItem('amrit_assam_cached_user');
            localStorage.removeItem('amrit_assam_last_activity');
            sessionStorage.removeItem('amrit_assam_cached_user');
            sessionStorage.removeItem('amrit_assam_last_activity');
            return false;
        }
        const mapped = mapUserFromDB(profile);
        setUser(mapped);
        const nowStr = Date.now().toString();
        localStorage.setItem('amrit_assam_cached_user', JSON.stringify(mapped));
        localStorage.setItem('amrit_assam_last_activity', nowStr);
        sessionStorage.setItem('amrit_assam_cached_user', JSON.stringify(mapped));
        sessionStorage.setItem('amrit_assam_last_activity', nowStr);
        return true;
    }
    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('amrit_assam_cached_user');
    localStorage.removeItem('amrit_assam_last_activity');
    sessionStorage.removeItem('amrit_assam_cached_user');
    sessionStorage.removeItem('amrit_assam_last_activity');
    setCart([]);
  };

  const register = async (name: string, mobile: string, password: string, role: Role, territory?: string) => {
    const email = `${mobile}@amritassam.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
    });

    if (authError) {
        alert(authError.message);
        return;
    }

    if (authData.user) {
        const updates = {
            id: authData.user.id,
            name,
            mobile,
            role,
            approved: role !== 'DISTRIBUTOR',
            territory: territory || null,
            updated_at: new Date().toISOString()
        };
        
        const { error: profileError } = await supabase.from('profiles').upsert(updates).select();

        if (profileError) {
             alert("Error creating profile: " + profileError.message);
        } else {
            if (role === 'DISTRIBUTOR') {
                alert("Registration successful! Please wait for Admin approval.");
            } else {
                if(!authData.session) {
                    alert("Registration successful! NOTE: If you cannot login, please disable 'Confirm Email' in Supabase Dashboard.");
                }
            }
        }
    }
  };

  const addUser = async (newUser: User) => {
    alert("To add a user with login access, they must register themselves via the Login page. As Admin, you can only view them once registered.");
  };

  const addToCart = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const placeOrder = async (
    paymentMethod: 'UPI' | 'Card' | 'COD' | 'Cash' | 'MANUAL_UPI', 
    address: string, 
    paymentStatus: 'Pending' | 'Paid' = 'Pending', 
    transactionId?: string,
    recipientDetails?: { name?: string; mobile?: string },
    couponInfo?: { code: string; discountAmount: number }
  ) => {
    if (!user) return;

    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (product && product.stock < item.quantity) {
        alert(`Insufficient stock for ${item.name}. Available: ${product.stock}`);
        return;
      }
    }
    
    // Product MRP / Wholesale subtotal
    const subtotal = cart.reduce((sum, item) => {
      const price = user.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp;
      return sum + (price * item.quantity);
    }, 0);

    const discountAmount = couponInfo?.discountAmount ? Math.min(couponInfo.discountAmount, subtotal) : 0;
    const finalTotalAmount = Math.max(0, subtotal - discountAmount);
    
    // Product MRP is inclusive of 5% GST (HSN 0902: 2.5% CGST + 2.5% SGST)
    const taxableBase = finalTotalAmount / 1.05;
    const taxAmount = finalTotalAmount - taxableBase;

    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const finalName = recipientDetails?.name ? `${recipientDetails.name} (by ${user.name})` : user.name;
    const finalMobile = recipientDetails?.mobile || user.mobile;
    const finalAddress = address || user.address || '';

    let createdOrderId = `ORD-${Date.now()}`;

    // Step 1: Insert into Supabase Orders table
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            total_amount: Math.round(finalTotalAmount),
            tax_amount: Math.round(taxAmount * 100) / 100,
            status: 'Processing',
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            transaction_id: transactionId || null,
            invoice_number: invoiceNum,
            order_type: user.role === 'DISTRIBUTOR' ? 'WHOLESALE' : 'RETAIL',
            shipping_address: finalAddress
        })
        .select()
        .single();

      if (orderData?.id) {
        createdOrderId = orderData.id;

        const orderItems = cart.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            quantity: item.quantity,
            price_per_unit: user.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp,
            total_price: (user.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp) * item.quantity
        }));

        await supabase.from('order_items').insert(orderItems);
      } else if (orderError) {
        console.warn("Supabase orders insert notice:", orderError);
      }
    } catch (dbErr) {
      console.warn("DB orders insert exception (fallback to local order):", dbErr);
    }

    // Step 2: Update stock in Supabase
    for (const item of cart) {
         const currentProduct = products.find(p => p.id === item.id);
         if (currentProduct) {
             const newStock = Math.max(0, currentProduct.stock - item.quantity);
             supabase.from('products').update({ stock: newStock }).eq('id', item.id).then();
         }
    }

    // Step 3: Create Full in-memory and cached Order Object
    const newOrderObj: Order = {
      id: createdOrderId,
      userId: user.id,
      userName: finalName,
      userMobile: finalMobile,
      userAddress: finalAddress,
      userGst: user.gstNumber || '',
      items: cart.map(item => ({ ...item })),
      totalAmount: Math.round(finalTotalAmount),
      taxAmount: Math.round(taxAmount * 100) / 100,
      status: 'Processing',
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      transactionId: transactionId || undefined,
      date: new Date().toISOString().split('T')[0],
      type: user.role === 'DISTRIBUTOR' ? 'WHOLESALE' : 'RETAIL',
      invoiceNumber: invoiceNum,
      couponCode: couponInfo?.code,
      discountAmount: discountAmount > 0 ? discountAmount : undefined
    };

    // Save in state & local backup cache immediately
    setOrders(prev => {
      const updated = [newOrderObj, ...prev.filter(o => o.id !== newOrderObj.id)];
      try {
        localStorage.setItem('amrit_assam_orders_cache', JSON.stringify(updated.slice(0, 100)));
      } catch (e) {}
      return updated;
    });

    clearCart();
    fetchOrders();
    fetchProducts();
  };

  const addCoupon = async (coupon: Omit<Coupon, 'id'>): Promise<{ success: boolean; message: string }> => {
    const cleanCode = coupon.code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: "Coupon code is required." };
    }
    if (coupons.some(c => c.code.toUpperCase() === cleanCode)) {
      return { success: false, message: `Coupon with code "${cleanCode}" already exists.` };
    }

    const newCoupon: Coupon = {
      id: `coup-${Date.now()}`,
      code: cleanCode,
      discountPercent: Number(coupon.discountPercent),
      minOrderAmount: Number(coupon.minOrderAmount || 0),
      maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : undefined,
      isActive: coupon.isActive !== undefined ? coupon.isActive : true,
      expiryDate: coupon.expiryDate,
      description: coupon.description,
      createdAt: new Date().toISOString()
    };

    // Attempt Supabase insert
    try {
      const { data, error } = await supabase.from('coupons').insert({
        code: newCoupon.code,
        discount_percent: newCoupon.discountPercent,
        min_order_amount: newCoupon.minOrderAmount || 0,
        max_discount_amount: newCoupon.maxDiscountAmount || null,
        is_active: newCoupon.isActive,
        expiry_date: newCoupon.expiryDate || null,
        description: newCoupon.description || null
      }).select().single();

      if (data?.id) {
        newCoupon.id = data.id.toString();
      }
    } catch (dbErr) {
      console.warn("DB insert coupon exception, saved locally:", dbErr);
    }

    setCoupons(prev => {
      const updated = [newCoupon, ...prev.filter(c => c.code !== newCoupon.code)];
      try {
        localStorage.setItem('amrit_assam_coupons', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    return { success: true, message: `Coupon "${cleanCode}" created successfully!` };
  };

  const updateCoupon = async (updatedCoupon: Coupon): Promise<{ success: boolean; message: string }> => {
    const cleanCode = updatedCoupon.code.trim().toUpperCase();
    
    // Attempt Supabase update
    try {
      await supabase.from('coupons').update({
        code: cleanCode,
        discount_percent: Number(updatedCoupon.discountPercent),
        min_order_amount: Number(updatedCoupon.minOrderAmount || 0),
        max_discount_amount: updatedCoupon.maxDiscountAmount ? Number(updatedCoupon.maxDiscountAmount) : null,
        is_active: updatedCoupon.isActive,
        expiry_date: updatedCoupon.expiryDate || null,
        description: updatedCoupon.description || null
      }).eq('id', updatedCoupon.id);
    } catch (dbErr) {
      console.warn("DB update coupon exception, updated locally:", dbErr);
    }

    setCoupons(prev => {
      const updated = prev.map(c => c.id === updatedCoupon.id ? { ...updatedCoupon, code: cleanCode } : c);
      try {
        localStorage.setItem('amrit_assam_coupons', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    return { success: true, message: `Coupon "${cleanCode}" updated successfully!` };
  };

  const toggleCouponStatus = async (couponId: string, isActive: boolean) => {
    try {
      await supabase.from('coupons').update({ is_active: isActive }).eq('id', couponId);
    } catch (dbErr) {
      console.warn("DB toggle coupon exception:", dbErr);
    }

    setCoupons(prev => {
      const updated = prev.map(c => c.id === couponId ? { ...c, isActive } : c);
      try {
        localStorage.setItem('amrit_assam_coupons', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      await supabase.from('coupons').delete().eq('id', couponId);
    } catch (dbErr) {
      console.warn("DB delete coupon exception:", dbErr);
    }

    setCoupons(prev => {
      const updated = prev.filter(c => c.id !== couponId);
      try {
        localStorage.setItem('amrit_assam_coupons', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const validateCoupon = (code: string, cartTotal: number) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, message: 'Please enter a coupon code' };
    }
    const coupon = coupons.find(c => c.code.toUpperCase() === cleanCode);
    if (!coupon) {
      return { valid: false, message: `Coupon code "${cleanCode}" is invalid.` };
    }
    if (!coupon.isActive) {
      return { valid: false, message: `Coupon "${cleanCode}" is currently disabled.` };
    }
    if (coupon.expiryDate) {
      const exp = new Date(coupon.expiryDate).getTime();
      const today = new Date().setHours(0, 0, 0, 0);
      if (exp < today) {
        return { valid: false, message: `Coupon "${cleanCode}" has expired on ${coupon.expiryDate}.` };
      }
    }
    if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) {
      return { 
        valid: false, 
        message: `Coupon "${cleanCode}" requires a minimum order of ₹${coupon.minOrderAmount}.` 
      };
    }

    let discount = Math.round((cartTotal * coupon.discountPercent) / 100);
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }

    return {
      valid: true,
      message: `Coupon "${coupon.code}" applied! ${coupon.discountPercent}% discount (₹${discount} saved)`,
      discountPercent: coupon.discountPercent,
      discountAmount: discount,
      coupon
    };
  };

  const deleteOrder = async (orderId: string) => {
    await supabase.from('orders').delete().eq('id', orderId);
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const addOrder = async (order: Order) => {
      const { data: orderData } = await supabase.from('orders').insert({
          user_id: order.userId,
          total_amount: order.totalAmount,
          tax_amount: order.taxAmount,
          status: order.status,
          payment_method: order.paymentMethod,
          payment_status: order.paymentStatus,
          order_type: order.type,
          invoice_number: order.invoiceNumber,
          shipping_address: order.userAddress
      }).select().single();

      if(orderData) {
          const items = order.items.map(i => ({
              order_id: orderData.id,
              product_id: i.id,
              quantity: i.quantity,
              price_per_unit: i.mrp, 
              total_price: i.mrp * i.quantity
          }));
          await supabase.from('order_items').insert(items);
          fetchOrders();
      }
  };

  const addPurchaseOrder = async (po: PurchaseOrder) => {
     try {
       const { data } = await supabase.from('purchase_orders').insert({
           po_number: po.poNumber,
           supplier_name: po.supplierName,
           supplier_address: po.supplierAddress || null,
           supplier_mobile: po.supplierMobile || null,
           supplier_email: po.supplierEmail || null,
           bill_url: po.billUrl || null,
           status: po.status,
           total_amount: po.totalAmount
       }).select().single();

       if (data) {
           const items = po.items.map(i => ({
               po_id: data.id,
               product_id: i.productId,
               quantity: i.quantity,
               unit_cost: i.unitCost,
               total_cost: i.totalCost
           }));
           await supabase.from('purchase_order_items').insert(items);
           await fetchPurchaseOrders();
           return;
       }
     } catch (e) {
       console.warn("Database insert for PO failed or table columns missing, using local state:", e);
     }
     setPurchaseOrders(prev => [po, ...prev.filter(p => p.id !== po.id)]);
  };

  const deletePurchaseOrder = async (poId: string) => {
      try {
        await supabase.from('purchase_orders').delete().eq('id', poId);
      } catch (e) {
        console.warn("Delete PO failed:", e);
      }
      setPurchaseOrders(prevPOs => prevPOs.filter(p => p.id !== poId));
  };

  const receivePurchaseOrder = async (poId: string) => {
     const poIndex = purchaseOrders.findIndex(p => p.id === poId);
     if (poIndex === -1) return;
     const po = purchaseOrders[poIndex];
     
     for(const item of po.items) {
         const prod = products.find(p => p.id === item.productId);
         if(prod) {
             await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', prod.id);
         }
     }

     const updatedPO = { ...po, status: 'Received' as const };
     try {
       await supabase.from('purchase_orders').update({ status: 'Received' }).eq('id', poId);
     } catch (e) {
       console.warn("Update PO status failed:", e);
     }
     const updatedPOs = [...purchaseOrders];
     updatedPOs[poIndex] = updatedPO;
     setPurchaseOrders(updatedPOs);
     fetchProducts();
  };

  const updatePurchaseOrderBill = async (poId: string, billUrl: string) => {
     try {
       await supabase.from('purchase_orders').update({ bill_url: billUrl }).eq('id', poId);
     } catch (e) {
       console.warn("Update PO bill failed:", e);
     }
     setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, billUrl } : p));
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const targetOrder = orders.find(o => o.id === orderId);

    if (status === 'Cancelled' && targetOrder && targetOrder.status !== 'Cancelled') {
      let refundMsg = "";
      let newPaymentStatus: Order['paymentStatus'] = targetOrder.paymentStatus;

      if (targetOrder.paymentStatus === 'Paid') {
        const confirmCancel = window.confirm(
          `This order is being marked as 'Cancelled'.\nTotal Amount: ₹${targetOrder.totalAmount}\nWould you like to initiate a refund to the customer's original account?`
        );

        if (!confirmCancel) return;

        try {
          const res = await fetch("/api/refund-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payment_id: targetOrder.transactionId || `pay_mock_${orderId}`,
              amount: Math.round(targetOrder.totalAmount * 100)
            })
          });

          if (res.ok) {
            const data = await res.json();
            refundMsg = data.message || "Refund successfully initiated to original payment account.";
            newPaymentStatus = 'Refunded';
          } else {
            const err = await res.json();
            refundMsg = `Refund note: ${err.error || 'Server error'}. Payment marked as Refunded in records.`;
            newPaymentStatus = 'Refunded';
          }
        } catch (err: any) {
          refundMsg = "Refund request processed (Simulated refund).";
          newPaymentStatus = 'Refunded';
        }
      }

      // Restore product stock on order cancellation
      if (targetOrder.items && targetOrder.items.length > 0) {
        for (const item of targetOrder.items) {
          const prod = products.find(p => p.id === item.id);
          if (prod) {
            await supabase.from('products').update({ stock: prod.stock + item.quantity }).eq('id', prod.id);
          }
        }
        fetchProducts();
      }

      await supabase.from('orders').update({ status, payment_status: newPaymentStatus }).eq('id', orderId);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status, paymentStatus: newPaymentStatus } : o));

      alert(`Order set to Cancelled!${refundMsg ? '\n\n' + refundMsg : ''}\nStock restored for ordered items.`);
      return;
    }

    await supabase.from('orders').update({ status }).eq('id', orderId);
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const updatePaymentStatus = async (orderId: string, status: Order['paymentStatus']) => {
    await supabase.from('orders').update({ payment_status: status }).eq('id', orderId);
    setOrders(orders.map(o => o.id === orderId ? { ...o, paymentStatus: status } : o));
  };

  const approveDistributor = async (userId: string) => {
    await supabase.from('profiles').update({ approved: true }).eq('id', userId);
    setUsers(users.map(u => u.id === userId ? { ...u, approved: true } : u));
  };

  const updateProduct = async (updatedProduct: Product) => {
    const dbPayload = {
        name: updatedProduct.name,
        description: updatedProduct.description,
        image_url: updatedProduct.image,
        weight: updatedProduct.weight,
        mrp: updatedProduct.mrp,
        distributor_price: updatedProduct.distributorPrice,
        cost_price: updatedProduct.costPrice,
        stock: updatedProduct.stock,
        low_stock_threshold: updatedProduct.lowStockThreshold,
        category: updatedProduct.category
    };
    await supabase.from('products').update(dbPayload).eq('id', updatedProduct.id);
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = async (productId: string) => {
    await supabase.from('products').delete().eq('id', productId);
    setProducts(products.filter(p => p.id !== productId));
  };

  const addProduct = async (newProduct: Product) => {
    const dbPayload = {
        name: newProduct.name,
        description: newProduct.description,
        image_url: newProduct.image,
        weight: newProduct.weight,
        mrp: newProduct.mrp,
        distributor_price: newProduct.distributorPrice,
        cost_price: newProduct.costPrice,
        stock: newProduct.stock,
        low_stock_threshold: newProduct.lowStockThreshold,
        category: newProduct.category
    };
    const { data } = await supabase.from('products').insert(dbPayload).select().single();
    if (data) {
        setProducts([...products, mapProductFromDB(data)]);
    }
  };

  const updateStock = async (productId: string, newStock: number) => {
    await supabase.from('products').update({ stock: newStock }).eq('id', productId);
    setProducts(products.map(p => p.id === productId ? { ...p, stock: newStock } : p));
  };

  // --- SETTINGS UPDATES (Now writing to Supabase) ---

  const updateInvoiceSettings = async (settings: InvoiceSettings) => {
    setInvoiceSettings(settings); // Optimistic Update
    const currentUpi = paymentSettings.merchantUpiId || 'amritassamtea@okaxis';
    const dbFooter = `${settings.footerNote.replace(/\[UPI:[^\]]+\]/, "").trim()} [UPI:${currentUpi}]`;
    await supabase.from('site_settings').update({
        company_name: settings.companyName,
        email: settings.email,
        address_line_1: settings.addressLine1,
        address_line_2: settings.addressLine2,
        gstin: settings.gstin,
        phone: settings.phone,
        footer_note: dbFooter
    }).eq('id', 1);
  };
  
  const updatePaymentSettings = async (settings: PaymentSettings) => {
    setPaymentSettings(settings); // Optimistic Update
    const cleanFooter = invoiceSettings.footerNote.replace(/\[UPI:[^\]]+\]/, "").trim();
    const dbFooter = `${cleanFooter} [UPI:${settings.merchantUpiId || 'amritassamtea@okaxis'}]`;
    await supabase.from('site_settings').update({
        razorpay_key_id: settings.razorpayKeyId,
        footer_note: dbFooter
    }).eq('id', 1);
  };

  const updateBrandAssets = async (assets: BrandAssets) => {
    setBrandAssets(assets); // Optimistic Update
    await supabase.from('site_settings').update({
        logo: assets.logo,
        hero_image: assets.heroImage,
        feature_image: assets.featureImage
    }).eq('id', 1);
  };

  const addReview = async (review: Review) => {
    await supabase.from('reviews').insert({
        product_id: review.productId,
        user_id: review.userId,
        rating: review.rating,
        comment: review.comment
    });
    fetchReviews();
  };

  const updateReview = async (updatedReview: Review) => {
      // Allow updating rating, comment, date and manual name
      await supabase.from('reviews').update({
          rating: updatedReview.rating,
          comment: updatedReview.comment,
          reviewer_name: updatedReview.userName,
          created_at: updatedReview.date
      }).eq('id', updatedReview.id);
      fetchReviews();
  };

  const deleteReview = async (reviewId: string) => {
      await supabase.from('reviews').delete().eq('id', reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  const addFakeReview = async (review: Review) => {
      // Fake review: user_id is null, use reviewer_name
      await supabase.from('reviews').insert({
          product_id: review.productId,
          reviewer_name: review.userName,
          rating: review.rating,
          comment: review.comment,
          created_at: review.date, // Backdated support
          // user_id left null
      });
      fetchReviews();
  };

  const clearOnlineOrders = () => {
    setOrders(prevOrders => prevOrders.filter(o => o.paymentMethod === 'COD'));
  };

  const updateUserPassword = async (
    userId: string, 
    newPassword: string, 
    customServiceKey?: string
  ): Promise<{ success: boolean; message: string; requiresKey?: boolean }> => {
      // 1. If updating currently logged in user's own password
      if (user && user.id === userId) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) {
              return { success: false, message: error.message };
          }
          return { success: true, message: "Your password has been updated successfully." };
      }

      // 2. If Admin updating another user, call backend server API (with service role key)
      try {
          const savedKey = customServiceKey || localStorage.getItem('amrit_assam_supabase_service_key') || '';
          const res = await fetch('/api/admin/update-user-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId, 
                newPassword, 
                serviceRoleKey: savedKey 
              })
          });

          const data = await res.json();
          if (res.ok && data.status === 'success') {
              return { success: true, message: data.message || "User password updated successfully." };
          } else {
              return { 
                  success: false, 
                  message: data.error || "Failed to update user password.",
                  requiresKey: !!data.requiresKey
              };
          }
      } catch (err: any) {
          console.error("updateUserPassword error:", err);
          return { 
            success: false, 
            message: err.message || "Failed to communicate with server to update password." 
          };
      }
  };

  return (
    <StoreContext.Provider value={{
      user, products, orders, purchaseOrders, cart, users, reviews, coupons, invoiceSettings, paymentSettings, brandAssets,
      login, logout, register, addUser, addToCart, removeFromCart, clearCart,
      placeOrder, deleteOrder, addOrder, addPurchaseOrder, deletePurchaseOrder, receivePurchaseOrder, updatePurchaseOrderBill,
      updateOrderStatus, updatePaymentStatus, approveDistributor, 
      updateProduct, deleteProduct, addProduct, updateStock, updateInvoiceSettings, updatePaymentSettings, updateBrandAssets,
      addReview, updateReview, deleteReview, addFakeReview, fetchCoupons, addCoupon, updateCoupon, toggleCouponStatus, deleteCoupon, validateCoupon, clearOnlineOrders, updateUserPassword
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};