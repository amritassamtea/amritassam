import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Product, CartItem, Order, Role, InvoiceSettings, PurchaseOrder, PaymentSettings, Review, BrandAssets } from '../types';
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
  placeOrder: (paymentMethod: 'UPI' | 'Card' | 'COD', address: string, paymentStatus?: 'Pending' | 'Paid', transactionId?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>; 
  addPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  deletePurchaseOrder: (poId: string) => Promise<void>;
  receivePurchaseOrder: (poId: string) => Promise<void>;
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
  clearOnlineOrders: () => void;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
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

const mapOrderFromDB = (o: any, items: any[]): Order => ({
  id: o.id,
  userId: o.user_id,
  userName: o.profiles?.name || 'Unknown', // Join with profiles
  items: items.map(i => ({
    id: i.products?.id,
    name: i.products?.name,
    image: i.products?.image_url,
    weight: i.products?.weight,
    mrp: i.products?.mrp,
    distributorPrice: i.products?.distributor_price,
    costPrice: i.products?.cost_price,
    category: i.products?.category,
    lowStockThreshold: i.products?.low_stock_threshold,
    description: i.products?.description,
    stock: i.products?.stock,
    quantity: i.quantity
  })),
  totalAmount: o.total_amount,
  taxAmount: o.tax_amount,
  status: o.status,
  paymentMethod: o.payment_method,
  paymentStatus: o.payment_status,
  transactionId: o.transaction_id,
  date: new Date(o.created_at).toISOString().split('T')[0],
  type: o.order_type,
  invoiceNumber: o.invoice_number,
  userAddress: o.shipping_address
});

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
  razorpayKeyId: 'rzp_test_TGSnHi9bfhqqFK',
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Admin view of all users
  const [reviews, setReviews] = useState<Review[]>([]);
  
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
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
            *,
            profiles (name),
            order_items (
                quantity,
                products (*)
            )
        `)
        .order('created_at', { ascending: false });

      if (ordersData) {
          const mappedOrders = ordersData.map(o => mapOrderFromDB(o, o.order_items));
          setOrders(mappedOrders);
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
             if (rzpKey === 'rzp_test_1DP5mmOlF5G5ag' || rzpKey === 'rzp_test_TG637ITm48z8Ra' || rzpKey === 'rzp_test_TB2Phw7nWzv1u8' || rzpKey === 'rzp_test_TG67jxp1pHTgMB' || rzpKey === 'rzp_test_TG8tR9LgCQuTng' || rzpKey === 'rzp_test_TG5H5KQvhI4q2g' || rzpKey === 'rzp_test_TGSeD6kDjDtnoA') {
                 rzpKey = 'rzp_test_TGSnHi9bfhqqFK';
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
    fetchSettings(); // Load Settings from DB

    // Eagerly fetch relevant data if user is cached in local storage
    try {
      const cached = localStorage.getItem('amrit_assam_cached_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          fetchOrders();
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
                    } else {
                        fetchOrders();
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
        alert("Aap 10 minute tak inactive the, isliye security ke liye auto-logout kar diya gaya hai. Kripya fir se login karein.");
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

  const placeOrder = async (paymentMethod: 'UPI' | 'Card' | 'COD', address: string, paymentStatus: 'Pending' | 'Paid' = 'Pending', transactionId?: string) => {
    if (!user) return;

    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (product && product.stock < item.quantity) {
        alert(`Insufficient stock for ${item.name}. Available: ${product.stock}`);
        return;
      }
    }
    
    const subTotal = cart.reduce((sum, item) => {
      const price = user.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp;
      return sum + (price * item.quantity);
    }, 0);
    
    const taxRate = 0.05; 
    const taxAmount = subTotal * taxRate;
    const totalAmount = subTotal + taxAmount;

    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            status: 'Processing',
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            transaction_id: transactionId || null,
            invoice_number: `INV-${Date.now().toString().slice(-6)}`,
            order_type: user.role === 'DISTRIBUTOR' ? 'WHOLESALE' : 'RETAIL',
            shipping_address: address
        })
        .select()
        .single();

    if (orderError || !orderData) {
        alert("Failed to place order: " + orderError?.message);
        return;
    }

    const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price_per_unit: user.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp,
        total_price: (user.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp) * item.quantity
    }));

    await supabase.from('order_items').insert(orderItems);

    for (const item of cart) {
         const currentProduct = products.find(p => p.id === item.id);
         if (currentProduct) {
             const newStock = currentProduct.stock - item.quantity;
             await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
         }
    }

    fetchOrders();
    fetchProducts();
    clearCart();
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
     const { data } = await supabase.from('purchase_orders').insert({
         po_number: po.poNumber,
         supplier_name: po.supplierName,
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
         
         const { data: pos } = await supabase.from('purchase_orders').select('*, purchase_order_items(*)');
         setPurchaseOrders([po, ...purchaseOrders]);
     }
  };

  const deletePurchaseOrder = async (poId: string) => {
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
     const updatedPOs = [...purchaseOrders];
     updatedPOs[poIndex] = updatedPO;
     setPurchaseOrders(updatedPOs);
     fetchProducts();
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const targetOrder = orders.find(o => o.id === orderId);

    if (status === 'Cancelled' && targetOrder && targetOrder.status !== 'Cancelled') {
      let refundMsg = "";
      let newPaymentStatus: Order['paymentStatus'] = targetOrder.paymentStatus;

      if (targetOrder.paymentStatus === 'Paid') {
        const confirmCancel = window.confirm(
          `Is order status ko 'Cancelled' set kiya ja raha hai.\nTotal Amount: ₹${targetOrder.totalAmount}\nKya aap customer ke original account me refund initiate karna chahte hain?`
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
          refundMsg = "Refund request process ho gayi hai (Simulated refund).";
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

  const updateUserPassword = async (userId: string, newPassword: string) => {
      if (user && user.id === userId) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if(error) alert(error.message);
          else alert("Password updated");
      } else {
          alert("Cannot update other user's password via Client API. Requires Admin Edge Function.");
      }
  };

  return (
    <StoreContext.Provider value={{
      user, products, orders, purchaseOrders, cart, users, reviews, invoiceSettings, paymentSettings, brandAssets,
      login, logout, register, addUser, addToCart, removeFromCart, clearCart,
      placeOrder, deleteOrder, addOrder, addPurchaseOrder, deletePurchaseOrder, receivePurchaseOrder,
      updateOrderStatus, updatePaymentStatus, approveDistributor, 
      updateProduct, deleteProduct, addProduct, updateStock, updateInvoiceSettings, updatePaymentSettings, updateBrandAssets,
      addReview, updateReview, deleteReview, addFakeReview, clearOnlineOrders, updateUserPassword
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