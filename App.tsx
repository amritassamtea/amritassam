import React, { useState } from 'react';
import { StoreProvider, useStore } from './services/store';
import { Header, Footer, WhatsAppFloat } from './components/Layout';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { ReviewModal } from './components/ReviewModal';
import { ShoppingCart, Trash2, MessageSquare, Star } from 'lucide-react';
import { Product } from './types';

// --- SUB-PAGES (Inline to fit file structure) ---

// 1. LOGIN / REGISTER PAGE
const AuthPage = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const { login, register, users } = useStore();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ mobile: '', password: '', name: '', territory: '', role: 'CUSTOMER' });

  const resetForm = () => {
    setFormData({ mobile: '', password: '', name: '', territory: '', role: 'CUSTOMER' });
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mobile || formData.mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!formData.password) {
      alert("Please enter a password");
      return;
    }

    if (isRegister) {
      // REGISTER FLOW
      const userExists = users.some(u => u.mobile === formData.mobile);
      if (userExists) {
        alert("User already exists. Please Login.");
        return;
      }

      // Special Logic: If mobile is 8898750419, force role to ADMIN
      let roleToRegister = formData.role;
      if (formData.mobile === '8898750419') {
          roleToRegister = 'ADMIN';
      }

      register(formData.name, formData.mobile, formData.password, roleToRegister as any, formData.territory);
      
      if (formData.role === 'DISTRIBUTOR' && roleToRegister !== 'ADMIN') {
        setIsRegister(false);
        resetForm();
      } else {
        onLoginSuccess();
      }

    } else {
      // LOGIN FLOW
      // Updated to single call - Store handles role checking
      login(formData.mobile, formData.password).then(success => {
          if(success) onLoginSuccess();
      });
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-tea-dark mb-6">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <>
              <input 
                required 
                type="text" 
                placeholder="Full Name" 
                className="w-full p-3 border rounded focus:ring-2 focus:ring-tea-green outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <select 
                className="w-full p-3 border rounded bg-white"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="CUSTOMER">I am a Customer</option>
                <option value="DISTRIBUTOR">I am a Distributor (Wholesale)</option>
              </select>
              {formData.role === 'DISTRIBUTOR' && (
                  <input 
                  type="text" 
                  placeholder="Territory / City" 
                  className="w-full p-3 border rounded focus:ring-2 focus:ring-tea-green outline-none"
                  value={formData.territory}
                  onChange={e => setFormData({...formData, territory: e.target.value})}
                />
              )}
            </>
          )}
          
          <input 
            required 
            type="tel"
            maxLength={10} 
            placeholder="Mobile Number" 
            className="w-full p-3 border rounded focus:ring-2 focus:ring-tea-green outline-none"
            value={formData.mobile}
            onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g,'')})}
          />
          
          <input 
            required 
            type="password"
            placeholder="Password" 
            className="w-full p-3 border rounded focus:ring-2 focus:ring-tea-green outline-none"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
          
          <button type="submit" className="w-full bg-tea-dark text-white font-bold py-3 rounded hover:bg-green-900 transition">
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>
        
        <p className="text-center mt-4 text-sm text-gray-600">
          {isRegister ? "Already have an account?" : "New to Amrit Assam?"} 
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              resetForm();
            }} 
            className="ml-2 text-tea-gold font-bold underline"
          >
            {isRegister ? "Login" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
};

// 2. SHOP PAGE
const ShopPage = () => {
  const { products, user, addToCart, reviews } = useStore();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const getProductStats = (id: string) => {
      const prodReviews = reviews.filter(r => r.productId === id);
      const count = prodReviews.length;
      const avg = count > 0 ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1) : '0';
      return { count, avg };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-tea-dark mb-2">Our Products</h2>
      <p className="text-gray-600 mb-8">Premium Assam CTC Tea available in various packs.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => {
          const price = user?.role === 'DISTRIBUTOR' ? product.distributorPrice : product.mrp;
          const isDiscounted = user?.role === 'DISTRIBUTOR';
          const { count, avg } = getProductStats(product.id);

          return (
            <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition group">
              <div className="h-48 overflow-hidden bg-white relative p-4 flex items-center justify-center">
                 <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition duration-500" />
                 <span className="absolute top-2 right-2 bg-tea-gold text-tea-dark text-xs font-bold px-2 py-1 rounded">
                   {product.weight}
                 </span>
              </div>
              <div className="p-4 bg-gray-50/50">
                <div className="mb-2">
                    <h3 className="font-bold text-lg text-gray-800 leading-tight">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center bg-green-100 px-1.5 py-0.5 rounded text-xs font-bold text-green-800">
                             {avg} <Star size={10} className="fill-green-800 text-green-800 ml-0.5" />
                        </div>
                        <span className="text-xs text-gray-500">({count} reviews)</span>
                    </div>
                </div>
                
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-2xl font-bold text-tea-dark">₹{price}</span>
                  {isDiscounted && (
                    <span className="text-sm text-gray-400 line-through">₹{product.mrp}</span>
                  )}
                  <span className="text-xs text-gray-500 mb-1">/ pack</span>
                </div>

                <div className="flex gap-2">
                    <button 
                    onClick={() => addToCart(product, 1)}
                    className="flex-1 bg-tea-green text-white font-medium py-2 rounded hover:bg-tea-dark transition flex items-center justify-center gap-2"
                    >
                    <ShoppingCart size={18} /> Add
                    </button>
                    <button 
                        onClick={() => setSelectedProduct(product)}
                        className="px-3 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                        title="Read Reviews"
                    >
                        <MessageSquare size={18} />
                    </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Review Modal */}
      {selectedProduct && (
          <ReviewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
};

// 3. CART DRAWER
const CartDrawer = ({ isOpen, onClose, onCheckout }: { isOpen: boolean, onClose: () => void, onCheckout: () => void }) => {
  const { cart, removeFromCart, user } = useStore();
  
  if (!isOpen) return null;

  const total = cart.reduce((acc, item) => {
    const price = user?.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp;
    return acc + (price * item.quantity);
  }, 0);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-in">
        <div className="p-4 border-b flex justify-between items-center bg-tea-dark text-white">
          <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart size={20}/> Your Cart</h2>
          <button onClick={onClose} className="hover:text-tea-gold">Close</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">Your cart is empty.</div>
          ) : (
            cart.map(item => {
               const price = user?.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp;
               return (
                <div key={item.id} className="flex gap-4 border-b pb-4">
                  <img src={item.image} className="w-16 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.weight}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-tea-dark">₹{price} x {item.quantity}</span>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
               );
            })
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-2xl text-tea-dark">₹{total}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => { onClose(); onCheckout(); }}
            className="w-full bg-tea-red text-white font-bold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. CHECKOUT PAGE
const CheckoutPage = ({ onOrderPlaced }: { onOrderPlaced: () => void }) => {
  const { cart, user, placeOrder, paymentSettings } = useStore();
  const [step, setStep] = useState(1);
  const [street, setStreet] = useState(user?.address || '');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Assam');
  const [zip, setZip] = useState('');
  const [payment, setPayment] = useState<'UPI' | 'Card' | 'COD' | 'MANUAL_UPI'>('UPI');
  const [customerUpi, setCustomerUpi] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [upiMethod, setUpiMethod] = useState<'qr' | 'direct'>('qr');

  const address = street ? `${street.trim()}, ${city.trim()}, ${stateName.trim()} - ${zip.trim()}` : '';

  const total = cart.reduce((acc, item) => {
    const price = user?.role === 'DISTRIBUTOR' ? item.distributorPrice : item.mrp;
    return acc + (price * item.quantity);
  }, 0);

  const handlePlaceOrder = async () => {
    if(!street.trim()) {
      alert("Please enter street address / house number.");
      return;
    }
    if(!city.trim()) {
      alert("Please enter city / town.");
      return;
    }
    if(!stateName.trim()) {
      alert("Please select state.");
      return;
    }
    if(!zip.trim() || zip.trim().length !== 6 || !/^\d{6}$/.test(zip.trim())) {
      alert("Please enter a valid 6-digit PIN Code.");
      return;
    }

    if (payment === 'COD') {
      try {
        await placeOrder(payment, address, 'Pending');
        alert(`Order Placed Successfully! Payment to be collected on delivery.`);
        onOrderPlaced();
      } catch (err: any) {
        alert("Failed to place order: " + (err.message || err));
      }
    } else if (payment === 'MANUAL_UPI') {
      if (!customerUpi.trim()) {
        alert("Please enter your UPI ID or Mobile Number used for payment.");
        return;
      }
      if (!utrNumber.trim()) {
        alert("Please enter the 12-digit UPI Ref No. (UTR) / Transaction ID.");
        return;
      }
      if (utrNumber.trim().length < 6) {
        alert("Please enter a valid Transaction ID / UTR.");
        return;
      }
      try {
        const transId = `Manual UPI - UTR: ${utrNumber.trim()} (Paid from: ${customerUpi.trim()})`;
        await placeOrder('UPI', address, 'Pending', transId);
        alert(`Order Placed Successfully! Your transaction ID is saved. Admin will verify the payment and process your order.`);
        onOrderPlaced();
      } catch (err: any) {
        alert("Failed to place order: " + (err.message || err));
      }
    } else {
      // Check if Razorpay is loaded
      if (!(window as any).Razorpay) {
        alert("Razorpay checkout SDK is not loaded. Please verify your internet connection.");
        return;
      }

      try {
        let order_id: string | null = null;
        let useKey = paymentSettings.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TGSnHi9bfhqqFK";
        if (useKey === "rzp_test_TGSXaCkUr8lyVc" || useKey === "rzp_test_TGSeD6kDjDtnoA") {
          useKey = "rzp_test_TGSnHi9bfhqqFK";
        }

        // Step 1: Attempt to create Order on Backend API
        try {
          const res = await fetch("/api/create-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              amount: Math.round(total * 100), // Amount in paise
              currency: "INR",
              receipt: `rcpt_${Date.now()}`
            })
          });

          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const orderData = await res.json();
            if (orderData.order_id) {
              order_id = orderData.order_id;
            }
            if (orderData.key_id && orderData.key_id !== "rzp_test_TGSXaCkUr8lyVc") {
              useKey = orderData.key_id;
            }
          } else {
            console.warn("Backend order creation API returned static page or non-JSON. Falling back to direct Razorpay client checkout.");
          }
        } catch (apiErr) {
          console.warn("Server API not reachable directly. Falling back to direct Razorpay client checkout:", apiErr);
        }

        // Step 2: Configure Razorpay Payment Modal Options
        const options: any = {
          key: useKey,
          amount: Math.round(total * 100),
          currency: "INR",
          name: "Amrit Assam Tea",
          description: "Fresh Assam Tea Order",
          image: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
          prefill: {
            name: user?.name || "Customer",
            contact: user?.mobile || "",
            email: "customer@amritassam.com"
          },
          theme: {
            color: "#1a4d2e"
          },
          handler: async function (response: any) {
            const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;

            // If we have a server order_id, verify payment signature with backend
            if (order_id && response.razorpay_signature) {
              try {
                const verifyRes = await fetch("/api/verify-payment", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id || order_id,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: response.razorpay_signature
                  })
                });

                if (verifyRes.ok) {
                  const verifyContentType = verifyRes.headers.get("content-type") || "";
                  if (verifyContentType.includes("application/json")) {
                    const verifyData = await verifyRes.json();
                    if (verifyData.status === "success") {
                      await placeOrder(payment, address, 'Paid', paymentId);
                      alert(`Payment Successful! Payment ID: ${paymentId}`);
                      onOrderPlaced();
                      return;
                    }
                  }
                }
              } catch (verifyError: any) {
                console.warn("Signature verification endpoint notice:", verifyError);
              }
            }

            // Direct client payment completion
            await placeOrder(payment, address, 'Paid', paymentId);
            alert(`Payment Successful! Payment ID: ${paymentId}`);
            onOrderPlaced();
          },
          modal: {
            ondismiss: function () {
              alert("Payment window closed. Order was not placed.");
            }
          }
        };

        if (order_id) {
          options.order_id = order_id;
        }

        const rzp1 = new (window as any).Razorpay(options);
        rzp1.on('payment.failed', function (response: any){
          const errorDesc = response?.error?.description || "Transaction failed";
          alert(`Payment Failed: ${errorDesc}`);
        });

        rzp1.open();

      } catch (err: any) {
        alert("Error initializing payment: " + (err.message || err));
        console.error(err);
      }
    }
  };

  if (cart.length === 0) return <div className="p-8 text-center">Cart is empty</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="flex gap-4 mb-8">
        <div className={`flex-1 p-4 border-b-4 ${step === 1 ? 'border-tea-green text-tea-dark' : 'border-gray-200 text-gray-400'}`}>1. Address</div>
        <div className={`flex-1 p-4 border-b-4 ${step === 2 ? 'border-tea-green text-tea-dark' : 'border-gray-200 text-gray-400'}`}>2. Payment</div>
      </div>

      <div className="bg-white p-6 rounded shadow-lg">
        {step === 1 ? (
          <div>
            <h3 className="font-bold mb-4 text-tea-dark text-lg border-b pb-2">Shipping Address</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Street Address / House No. / Landmark</label>
                <input 
                  type="text" 
                  className="w-full border rounded p-3 text-sm focus:ring-2 focus:ring-tea-green outline-none" 
                  placeholder="e.g. Ward No. 5, Near Tea Garden Road"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">City / Town</label>
                  <input 
                    type="text" 
                    className="w-full border rounded p-3 text-sm focus:ring-2 focus:ring-tea-green outline-none" 
                    placeholder="e.g. Dibrugarh"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">State</label>
                  <select 
                    className="w-full border rounded p-3 text-sm focus:ring-2 focus:ring-tea-green bg-white outline-none" 
                    value={stateName}
                    onChange={e => setStateName(e.target.value)}
                  >
                    <option value="">Select State</option>
                    {[
                      "Assam", "West Bengal", "Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", 
                      "Uttar Pradesh", "Bihar", "Rajasthan", "Madhya Pradesh", "Gujarat", "Haryana", 
                      "Punjab", "Kerala", "Andhra Pradesh", "Telangana", "Odisha", "Jharkhand", 
                      "Chhattisgarh", "Uttarakhand", "Himachal Pradesh", "Jammu & Kashmir", "Goa", 
                      "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Sikkim", "Tripura", "Arunachal Pradesh"
                    ].map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">PIN Code (ZIP Code)</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    className="w-full border rounded p-3 text-sm font-mono focus:ring-2 focus:ring-tea-green outline-none" 
                    placeholder="e.g. 786001"
                    value={zip}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setZip(val);
                    }}
                  />
                </div>
              </div>
            </div>
             <button 
              onClick={() => {
                if(!street.trim()) {
                  alert("Please enter street address / house number.");
                  return;
                }
                if(!city.trim()) {
                  alert("Please enter city / town.");
                  return;
                }
                if(!stateName.trim()) {
                  alert("Please select your state.");
                  return;
                }
                if(!zip.trim() || zip.trim().length !== 6 || !/^\d{6}$/.test(zip.trim())) {
                  alert("Please enter a valid 6-digit PIN Code (ZIP).");
                  return;
                }
                setStep(2);
              }}
              className="w-full bg-tea-dark text-white font-bold py-3 rounded hover:bg-opacity-90 transition shadow"
            >
              Continue to Payment
            </button>
          </div>
        ) : (
          <div>
             <h3 className="font-bold mb-4">Payment Method</h3>
             <div className="space-y-3 mb-6">
               {['UPI', 'Card', 'MANUAL_UPI', 'COD'].map((method) => (
                 <label key={method} className="flex flex-col p-4 border rounded cursor-pointer hover:bg-gray-50 transition">
                   <div className="flex items-center">
                     <input 
                      type="radio" 
                      name="payment" 
                      checked={payment === method} 
                      onChange={() => setPayment(method as any)}
                      className="mr-3"
                     />
                     <span className="font-medium text-sm md:text-base">
                       {method === 'UPI' ? 'UPI (GPay/PhonePe/Paytm - Auto)' : method === 'Card' ? 'Credit/Debit Card / NetBanking' : method === 'MANUAL_UPI' ? 'Direct UPI Transfer / Scan QR (Manual/Zero-Fee)' : 'Cash on Delivery'}
                     </span>
                   </div>

                   {method === 'MANUAL_UPI' && payment === 'MANUAL_UPI' && (
                     <div className="mt-4 border-t pt-4 space-y-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-md">
                       
                       {/* Choice Tab between QR Code and Direct UPI payment */}
                       <div className="flex gap-2 p-1 bg-gray-200/60 rounded-lg">
                         <button
                           type="button"
                           onClick={(e) => { e.preventDefault(); setUpiMethod('qr'); }}
                           className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${upiMethod === 'qr' ? 'bg-white shadow-sm text-tea-dark' : 'text-gray-500 hover:text-gray-800'}`}
                         >
                           📷 Scan QR Code
                         </button>
                         <button
                           type="button"
                           onClick={(e) => { e.preventDefault(); setUpiMethod('direct'); }}
                           className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${upiMethod === 'direct' ? 'bg-white shadow-sm text-tea-dark' : 'text-gray-500 hover:text-gray-800'}`}
                         >
                           ⚡ Direct UPI / Click to Pay
                         </button>
                       </div>

                       {upiMethod === 'qr' ? (
                         <div className="space-y-3">
                           <p className="font-bold text-tea-dark flex items-center gap-1">
                             <span>1. Scan QR Code to Pay</span>
                           </p>
                           <div className="flex flex-col items-center justify-center p-3 bg-white rounded border shadow-sm">
                             <img 
                               src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${paymentSettings.merchantUpiId || 'amritassamtea@okaxis'}&pn=Amrit Assam Tea&am=${total}&cu=INR&tn=AmritAssamOrder`)}`}
                               alt="Payment QR" 
                               referrerPolicy="no-referrer"
                               className="w-44 h-44 border p-1 rounded bg-white shadow-sm"
                             />
                             <span className="text-[10px] text-gray-400 mt-2 font-medium">Scan using GPay, PhonePe, Paytm, BHIM or any UPI app</span>
                           </div>
                         </div>
                       ) : (
                         <div className="space-y-3">
                           <p className="font-bold text-tea-dark flex items-center gap-1">
                             <span>1. Copy Merchant UPI ID & Pay</span>
                           </p>
                           
                           <div className="flex justify-between items-center bg-white p-3 rounded-md border shadow-sm">
                             <div>
                               <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Merchant UPI ID</span>
                               <span className="font-mono font-bold text-tea-dark select-all text-sm">{paymentSettings.merchantUpiId || 'amritassamtea@okaxis'}</span>
                             </div>
                             <button 
                               type="button"
                               onClick={(e) => {
                                 e.preventDefault();
                                 navigator.clipboard.writeText(paymentSettings.merchantUpiId || 'amritassamtea@okaxis');
                                 alert("UPI ID copied!");
                               }}
                               className="text-xs bg-tea-green text-white font-bold px-3 py-1.5 rounded shadow-sm hover:bg-tea-dark transition"
                             >
                               Copy ID
                             </button>
                           </div>

                           <div className="pt-2">
                             <a 
                               href={`upi://pay?pa=${paymentSettings.merchantUpiId || 'amritassamtea@okaxis'}&pn=Amrit%20Assam%20Tea&am=${total}&cu=INR&tn=AmritAssamOrder`}
                               className="flex items-center justify-center gap-2 w-full bg-tea-dark hover:bg-opacity-95 text-white font-bold py-3 px-4 rounded shadow-md transition text-xs md:text-sm text-center"
                             >
                               🚀 Open UPI App / Click to Pay (₹{total})
                             </a>
                             <p className="text-[10px] text-center text-gray-400 mt-1">Directly opens your installed payment apps on mobile devices.</p>
                           </div>
                         </div>
                       )}

                       <p className="font-bold text-tea-dark border-t pt-3 flex items-center gap-1">
                         <span>2. Enter Payment Details (Mandatory)</span>
                       </p>
                       <div className="space-y-3">
                         <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1">Your UPI ID or Paid Mobile Number</label>
                           <input 
                             type="text"
                             className="w-full border rounded p-2.5 text-sm focus:ring-2 focus:ring-tea-green outline-none"
                             placeholder="e.g. yourname@okaxis or mobile number"
                             value={customerUpi}
                             onChange={e => setCustomerUpi(e.target.value)}
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-gray-600 mb-1">12-Digit UPI Ref No. / Transaction ID / UTR</label>
                           <input 
                             type="text"
                             maxLength={24}
                             className="w-full border rounded p-2.5 text-sm font-mono focus:ring-2 focus:ring-tea-green outline-none"
                             placeholder="e.g. 612345678901"
                             value={utrNumber}
                             onChange={e => setUtrNumber(e.target.value)}
                           />
                         </div>
                       </div>
                     </div>
                   )}
                 </label>
               ))}
             </div>
             
             <div className="border-t pt-4 mb-4">
               <div className="flex justify-between text-xl font-bold">
                 <span>Total Payable</span>
                 <span>₹{total}</span>
               </div>
               {payment !== 'COD' && payment !== 'MANUAL_UPI' && (
                 <div className="text-xs text-gray-500 mt-2">
                   * Secure payment via Razorpay
                 </div>
               )}
               {payment === 'MANUAL_UPI' && (
                 <div className="text-xs text-amber-600 font-semibold mt-2">
                   * Direct transfer. Your order is placed with "Pending" payment status and verified manually.
                 </div>
               )}
             </div>

             <button 
              onClick={handlePlaceOrder}
              className="w-full bg-tea-red text-white font-bold py-3 rounded hover:bg-red-700 transition"
             >
              {payment === 'COD' ? 'Place Order' : payment === 'MANUAL_UPI' ? 'Confirm & Place Order' : 'Pay & Order'}
             </button>
             <button 
              onClick={() => setStep(1)}
              className="w-full mt-2 text-gray-500 py-2"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 5. DISTRIBUTOR INFO PAGE WITH FORM
const DistributorPage = () => {
  const [form, setForm] = useState({ name: '', mobile: '', firmName: '', city: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct Mailto Link
    const subject = encodeURIComponent("Distributor Enquiry from " + form.name);
    const body = encodeURIComponent(
      `Name: ${form.name}\n` +
      `Mobile: ${form.mobile}\n` +
      `Firm Name: ${form.firmName}\n` +
      `City/Area: ${form.city}\n` +
      `Description: ${form.description}`
    );
    
    // Try to open email client
    window.location.href = `mailto:support@amritassam.com?subject=${subject}&body=${body}`;
    
    alert("Thank you! Your default email client should open now. Please hit send to forward your enquiry to support@amritassam.com.");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-tea-dark text-white rounded-2xl p-8 md:p-12 text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold mb-4 text-tea-gold">Become a Distributor</h1>
        <p className="text-xl opacity-90 max-w-2xl mx-auto">Join the Amrit Assam family and earn high margins with premium quality tea.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-bold text-tea-dark mb-4">Why Partner with Us?</h2>
          <ul className="space-y-4 mb-8">
            <li className="flex items-start gap-3">
               <div className="w-8 h-8 bg-tea-green rounded-full flex items-center justify-center text-white shrink-0">1</div>
               <div>
                 <h4 className="font-bold">Direct from Garden</h4>
                 <p className="text-sm text-gray-600">No middlemen. Best wholesale rates for you.</p>
               </div>
            </li>
            <li className="flex items-start gap-3">
               <div className="w-8 h-8 bg-tea-green rounded-full flex items-center justify-center text-white shrink-0">2</div>
               <div>
                 <h4 className="font-bold">Marketing Support</h4>
                 <p className="text-sm text-gray-600">We provide banners, danglers, and digital assets.</p>
               </div>
            </li>
            <li className="flex items-start gap-3">
               <div className="w-8 h-8 bg-tea-green rounded-full flex items-center justify-center text-white shrink-0">3</div>
               <div>
                 <h4 className="font-bold">Territory Protection</h4>
                 <p className="text-sm text-gray-600">Exclusive distribution rights for your area.</p>
               </div>
            </li>
          </ul>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
             <h3 className="font-bold text-xl mb-2">Direct Contact</h3>
             <p className="text-gray-600 mb-4">Prefer to email directly?</p>
             <div className="flex items-center gap-3">
               <span className="font-bold text-tea-dark">Email:</span>
               <span>support@amritassam.com</span>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
          <h3 className="font-bold text-xl mb-6 text-tea-dark border-b pb-2">Enquiry Form</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Your Name</label>
                  <input 
                    required type="text" className="w-full border p-2 rounded" placeholder="Enter full name" 
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Mobile Number</label>
                  <input 
                    required type="tel" className="w-full border p-2 rounded" placeholder="10-digit mobile" 
                    value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})}
                  />
                </div>
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Firm/Shop Name</label>
                <input 
                    required type="text" className="w-full border p-2 rounded" placeholder="Enter business name" 
                    value={form.firmName} onChange={e => setForm({...form, firmName: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">City / Area</label>
                <input 
                    required type="text" className="w-full border p-2 rounded" placeholder="Where do you want to distribute?" 
                    value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-600 mb-1">Current Business (If any)</label>
                <textarea 
                    className="w-full border p-2 rounded" rows={2} placeholder="Briefly describe your current business..."
                    value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                ></textarea>
             </div>
             <button type="submit" className="w-full bg-tea-gold text-tea-dark font-bold py-3 rounded hover:bg-yellow-400 transition">
               Submit Enquiry via Email
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// 6. PRIVACY POLICY PAGE
const PrivacyPage = () => (
  <div className="container mx-auto px-4 py-8 max-w-4xl">
    <h1 className="text-3xl font-bold mb-6 text-tea-dark">Privacy Policy</h1>
    <div className="bg-white p-8 rounded-lg shadow-sm space-y-6 text-gray-700">
       <p className="text-sm text-gray-500">Last Updated: October 2023</p>
       
       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">1. Information We Collect</h2>
         <p>We collect personal information such as your name, phone number, shipping address, and billing information when you place an order or register on our platform. For distributors, we may collect GST details and business information.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">2. How We Use Your Information</h2>
         <p>We use your information to:</p>
         <ul className="list-disc pl-5 mt-2 space-y-1">
           <li>Process and deliver your orders.</li>
           <li>Communicate with you regarding order status and updates.</li>
           <li>Improve our product offerings and website functionality.</li>
           <li>Comply with legal obligations and invoicing requirements.</li>
         </ul>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">3. Data Security</h2>
         <p>We implement appropriate security measures to protect your personal data from unauthorized access, alteration, or disclosure. We do not sell your data to third parties.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">4. Cookies</h2>
         <p>Our website uses local storage to enhance your shopping experience, such as remembering items in your cart and your login session.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">5. Contact Us</h2>
         <p>If you have any questions about this Privacy Policy, please contact us at support@amritassam.com.</p>
       </section>
    </div>
  </div>
);

// 7. TERMS & CONDITIONS PAGE
const TermsPage = () => (
  <div className="container mx-auto px-4 py-8 max-w-4xl">
    <h1 className="text-3xl font-bold mb-6 text-tea-dark">Terms & Conditions</h1>
    <div className="bg-white p-8 rounded-lg shadow-sm space-y-6 text-gray-700">
       
       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">1. Introduction</h2>
         <p>Welcome to Amrit Assam Gold Tea. By accessing this website and purchasing our products, you agree to be bound by these terms and conditions.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">2. Product & Pricing</h2>
         <p>All prices listed are in Indian Rupees (INR) and are subject to change without notice. We strive to ensure accuracy in product descriptions and images, but actual packaging may vary.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">3. Orders & Acceptance</h2>
         <p>Your receipt of an electronic order confirmation does not signify our acceptance of your order. We reserve the right to accept or decline your order at any time after receipt for any reason.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">4. Returns & Refunds</h2>
         <p className="font-bold text-red-600">Goods once sold will not be taken back.</p>
         <p>In case of damaged or defective products received, please notify us within 24 hours of delivery with photographic evidence for a replacement or store credit.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">5. Distributor Policy</h2>
         <p>Distributors must adhere to the territorial limits assigned to them. Reselling outside the assigned territory without permission may lead to termination of the distributorship.</p>
       </section>

       <section>
         <h2 className="text-xl font-bold text-gray-900 mb-2">6. Jurisdiction</h2>
         <p>All disputes are subject to the exclusive jurisdiction of the courts in Navi Mumbai, Maharashtra.</p>
       </section>
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

const MainContent = () => {
  const [currentView, setCurrentView] = useState('HOME');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useStore();

  const renderView = () => {
    switch (currentView) {
      case 'HOME': return <Home onNavigate={setCurrentView} />;
      case 'SHOP': return <ShopPage />;
      case 'LOGIN': return <AuthPage onLoginSuccess={() => setCurrentView('HOME')} />;
      case 'DASHBOARD': return <Dashboard />;
      case 'CHECKOUT': return <CheckoutPage onOrderPlaced={() => setCurrentView('DASHBOARD')} />;
      case 'DISTRIBUTOR_INFO': return <DistributorPage />;
      case 'PRIVACY': return <PrivacyPage />;
      case 'TERMS': return <TermsPage />;
      default: return <Home onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header onNavigate={setCurrentView} onOpenCart={() => setIsCartOpen(true)} />
      
      <main className="flex-grow">
        {renderView()}
      </main>
      
      <Footer onNavigate={setCurrentView} />
      <WhatsAppFloat />
      
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        onCheckout={() => {
          setIsCartOpen(false);
          if (user) setCurrentView('CHECKOUT');
          else setCurrentView('LOGIN');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}