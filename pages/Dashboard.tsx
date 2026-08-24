import React, { useState } from 'react';
import { useStore } from '../services/store';
import { ReviewModal } from '../components/ReviewModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Package, DollarSign, Users, CheckCircle, XCircle, Printer, AlertTriangle, FileText, PlusCircle, Trash2, Settings, Save, TrendingUp, ClipboardList, CreditCard, Download, UploadCloud, Image as ImageIcon, RotateCcw, KeyRound, Star, MessageSquare, Edit, Phone, MapPin, User as UserIcon, Mail, Paperclip, Eye, ExternalLink, FileCheck, Search, Filter, Calendar, FileSpreadsheet, X } from 'lucide-react';
import { Product, Order, User, PurchaseItem, PurchaseOrder, InvoiceSettings, PaymentSettings, BrandAssets, Role, Review } from '../types';

// --- UTILS ---
const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) {
      alert("No data to export");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        const value = row[fieldName];
        // Handle strings that might contain commas
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : JSON.stringify(value, (key, value) => value === null ? '' : value);
      }).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
};

const getOrderCustomerDetails = (order: Order, usersList: User[]) => {
  const matchingUser = usersList.find(u => u.id === order.userId);
  const name = order.userName || matchingUser?.name || 'Customer';
  const mobile = order.userMobile || matchingUser?.mobile || 'N/A';
  
  let city = 'N/A';
  if (order.userAddress) {
    const cleanAddr = order.userAddress.replace(/^Recipient:.*?\|\s*/i, '');
    const parts = cleanAddr.split(',');
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2]?.trim();
      if (candidate && candidate.length > 1) {
        city = candidate;
      }
    } else if (parts.length === 1) {
      city = parts[0].trim();
    }
  }
  return { name, mobile, city, fullAddress: order.userAddress || 'N/A' };
};

// --- INVOICE COMPONENT ---
const InvoiceTemplate = ({ order, onClose }: { order: Order; onClose: () => void }) => {
  const { invoiceSettings } = useStore();
  
  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React app state
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl my-8">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Tax Invoice</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">
              Close
            </button>
          </div>
        </div>
        
        <div id="invoice-content" className="p-8 bg-white text-black">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-tea-dark pb-4">
            <div>
               <h1 className="text-3xl font-bold text-tea-dark uppercase">{invoiceSettings.companyName}</h1>
               <p className="text-sm">{invoiceSettings.addressLine1}</p>
               <p className="text-sm">{invoiceSettings.addressLine2}</p>
               <p className="text-sm">GSTIN: {invoiceSettings.gstin}</p>
               {invoiceSettings.email && <p className="text-sm">Email: {invoiceSettings.email}</p>}
               {invoiceSettings.phone && <p className="text-sm">Phone: {invoiceSettings.phone}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-600">INVOICE</h2>
              <p className="font-bold">#{order.invoiceNumber || order.id}</p>
              <p>Date: {order.date}</p>
              <div className={`mt-2 border-2 px-2 py-1 inline-block font-bold rounded ${order.paymentStatus === 'Paid' ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                {order.paymentStatus.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-600 border-b mb-2">BILL TO</h3>
            <p className="font-bold text-lg">{order.userName}</p>
            {(order.userMobile || users?.find(u => u.id === order.userId)?.mobile) && (
              <p className="text-gray-700 font-medium">Mobile: {order.userMobile || users?.find(u => u.id === order.userId)?.mobile}</p>
            )}
            <p className="text-gray-700 w-1/2">{order.userAddress || 'Address not provided'}</p>
            <p className="text-gray-700">Role: {order.type}</p>
            {order.userGst && <p className="text-gray-700">GST: {order.userGst}</p>}
          </div>

          {/* Table */}
          <table className="w-full mb-8 text-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="text-left p-2">Item Details</th>
                <th className="text-center p-2">HSN</th>
                <th className="text-center p-2">Qty</th>
                <th className="text-right p-2">MRP / Rate (₹)<br/><span className="text-[10px] font-normal text-gray-500">(Incl. 5% GST)</span></th>
                <th className="text-right p-2">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => {
                const price = order.type === 'WHOLESALE' ? item.distributorPrice : item.mrp;
                return (
                  <tr key={index} className="border-b">
                    <td className="p-2">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.weight}</div>
                    </td>
                    <td className="text-center p-2 font-mono">0902</td>
                    <td className="text-center p-2 font-medium">{item.quantity}</td>
                    <td className="text-right p-2">₹{price}</td>
                    <td className="text-right p-2 font-medium">₹{(price * item.quantity).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals & Tax Breakdown (GST Included in MRP) */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div className="text-xs text-gray-500 max-w-xs border rounded p-3 bg-gray-50">
              <p className="font-bold text-gray-700 mb-1">Tax Summary (HSN 0902 - Tea):</p>
              <p>• CGST @ 2.5%: ₹{((order.totalAmount - (order.totalAmount / 1.05)) / 2).toFixed(2)}</p>
              <p>• SGST @ 2.5%: ₹{((order.totalAmount - (order.totalAmount / 1.05)) / 2).toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-gray-600 italic">* All item prices are inclusive of 5% Goods and Services Tax (GST).</p>
            </div>
            
            <div className="w-full sm:w-1/2">
              <div className="flex justify-between py-1.5 border-b text-sm">
                <span className="text-gray-600">Taxable Value (Excl. GST):</span>
                <span className="font-medium">₹{(order.totalAmount / 1.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b text-sm">
                <span className="text-gray-600">CGST (2.5%):</span>
                <span>₹{((order.totalAmount - (order.totalAmount / 1.05)) / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b text-sm">
                <span className="text-gray-600">SGST (2.5%):</span>
                <span>₹{((order.totalAmount - (order.totalAmount / 1.05)) / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b text-sm text-tea-dark font-medium bg-tea-light/10 px-2 rounded">
                <span>Total GST Amount (5% Included):</span>
                <span>₹{(order.totalAmount - (order.totalAmount / 1.05)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-black font-bold text-lg mt-2 text-tea-dark">
                <span>Grand Total (MRP Incl. GST):</span>
                <span>₹{order.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-xs text-gray-500">
            <p>This is a computer generated invoice.</p>
            <p>{invoiceSettings.footerNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddUserForm = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (user: User) => void }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '', mobile: '', role: 'CUSTOMER', password: '', territory: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return;
    
    onSubmit({
      id: Date.now().toString(),
      name: formData.name,
      mobile: formData.mobile,
      role: formData.role as Role,
      password: formData.password || '123456',
      approved: true,
      territory: formData.territory,
      address: '',
      gstNumber: ''
    } as User);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="font-bold text-xl mb-4">Add New User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full border p-2 rounded" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input className="w-full border p-2 rounded" placeholder="Mobile" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} required />
          <input className="w-full border p-2 rounded" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <select className="w-full border p-2 rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
            <option value="CUSTOMER">Customer</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="ADMIN">Admin</option>
          </select>
          {formData.role === 'DISTRIBUTOR' && (
             <input className="w-full border p-2 rounded" placeholder="Territory" value={formData.territory} onChange={e => setFormData({...formData, territory: e.target.value})} />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-tea-dark text-white rounded">Add User</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChangePasswordModal = ({ 
    targetUser, 
    onClose, 
    onSuccess 
}: { 
    targetUser: {id: string, name: string}, 
    onClose: () => void, 
    onSuccess: (msg: string) => void 
}) => {
    const { updateUserPassword } = useStore();
    const [pass, setPass] = useState('');
    const [serviceKey, setServiceKey] = useState(() => localStorage.getItem('amrit_assam_supabase_service_key') || '');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleUpdate = async () => {
        if (!pass.trim()) {
            setErrorMsg("Password cannot be empty");
            return;
        }
        if (pass.trim().length < 6) {
            setErrorMsg("Password should be at least 6 characters long.");
            return;
        }

        setErrorMsg('');
        setLoading(true);

        try {
            if (serviceKey.trim()) {
                localStorage.setItem('amrit_assam_supabase_service_key', serviceKey.trim());
            }

            const result = await updateUserPassword(targetUser.id, pass.trim(), serviceKey.trim());
            if (result.success) {
                onSuccess(result.message || `Password for ${targetUser.name} updated successfully!`);
                onClose();
            } else {
                setErrorMsg(result.message);
                if (result.requiresKey) {
                    setShowKeyInput(true);
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-lg text-tea-dark flex items-center gap-2">
                        <Lock size={18} /> Reset Password
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                    Setting new login password for: <span className="font-bold text-gray-900">{targetUser.name}</span>
                </p>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded leading-relaxed">
                        {errorMsg}
                    </div>
                )}

                <div className="space-y-4 mb-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                            New Password
                        </label>
                        <input 
                            type="text"
                            className="w-full border p-3 rounded text-sm outline-none focus:ring-2 focus:ring-tea-green font-mono"
                            placeholder="Enter at least 6 characters"
                            value={pass}
                            disabled={loading}
                            onChange={e => setPass(e.target.value)}
                        />
                    </div>

                    {(showKeyInput || !localStorage.getItem('amrit_assam_supabase_service_key')) && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-amber-900">
                                    Supabase Service Role Key (Admin Reset)
                                </label>
                            </div>
                            <input 
                                type="password"
                                className="w-full border border-amber-300 p-2 rounded text-xs font-mono bg-white"
                                placeholder="Paste service_role secret key from Supabase Dashboard"
                                value={serviceKey}
                                disabled={loading}
                                onChange={e => setServiceKey(e.target.value)}
                            />
                            <p className="text-[11px] text-amber-800 leading-tight">
                                Required by Supabase to update another user's authentication credentials. Found in Supabase &gt; Project Settings &gt; API &gt; service_role (secret).
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleUpdate}
                        disabled={loading}
                        className="bg-tea-dark text-white px-5 py-2 rounded text-sm font-bold hover:bg-black flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Set Password'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReviewManagerForm = ({ products, review, onClose, onSubmit }: { products: Product[], review?: Review | null, onClose: () => void, onSubmit: (r: Review) => void }) => {
    const [formData, setFormData] = useState<Partial<Review>>({
        productId: review?.productId || products[0]?.id,
        userName: review?.userName || '',
        rating: review?.rating || 5,
        comment: review?.comment || '',
        date: review?.date || new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.userName || !formData.comment) return;

        onSubmit({
            ...review,
            id: review?.id || '',
            productId: formData.productId!,
            userId: review?.userId || '', // For fake reviews this will be ignored/empty
            userName: formData.userName!,
            rating: Number(formData.rating),
            comment: formData.comment!,
            date: formData.date!
        });
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-md animate-fade-in">
                <h3 className="font-bold text-lg mb-4 text-tea-dark">{review ? 'Edit Review' : 'Add Manual Review'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Product</label>
                        <select 
                            className="w-full border p-2 rounded" 
                            value={formData.productId} 
                            onChange={e => setFormData({...formData, productId: e.target.value})}
                            disabled={!!review} // Disable product change on edit
                        >
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">Reviewer Name</label>
                         <input 
                            className="w-full border p-2 rounded" 
                            value={formData.userName} 
                            onChange={e => setFormData({...formData, userName: e.target.value})} 
                            required
                         />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Rating</label>
                            <select 
                                className="w-full border p-2 rounded" 
                                value={formData.rating} 
                                onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
                            >
                                <option value="5">5 Stars</option>
                                <option value="4">4 Stars</option>
                                <option value="3">3 Stars</option>
                                <option value="2">2 Stars</option>
                                <option value="1">1 Star</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                             <input 
                                type="date"
                                className="w-full border p-2 rounded" 
                                value={formData.date} 
                                onChange={e => setFormData({...formData, date: e.target.value})} 
                             />
                        </div>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">Comment</label>
                         <textarea 
                            className="w-full border p-2 rounded" 
                            rows={3}
                            value={formData.comment} 
                            onChange={e => setFormData({...formData, comment: e.target.value})} 
                            required
                         />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
                        <button type="submit" className="bg-tea-dark text-white px-4 py-2 rounded font-bold">Save Review</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InventoryManager = ({ products, onUpdateStock }: { products: Product[], onUpdateStock: (id: string, qty: number) => void }) => {
  const [editId, setEditId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden animate-fade-in">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4 font-bold text-gray-600">Product Name</th>
            <th className="p-4 font-bold text-gray-600">Category</th>
            <th className="p-4 font-bold text-gray-600 text-right">Current Stock</th>
            <th className="p-4 font-bold text-gray-600 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map(p => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="p-4">
                <div className="font-bold text-tea-dark">{p.name}</div>
                <div className="text-xs text-gray-500">{p.weight}</div>
              </td>
              <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{p.category}</span></td>
              <td className={`p-4 text-right font-mono font-bold ${p.stock <= p.lowStockThreshold ? 'text-red-600' : 'text-green-600'}`}>
                {editId === p.id ? (
                  <input 
                    type="number" 
                    className="w-20 border rounded p-1 text-right"
                    value={tempStock}
                    autoFocus
                    onChange={e => setTempStock(parseInt(e.target.value) || 0)}
                  />
                ) : p.stock}
              </td>
              <td className="p-4 text-right">
                {editId === p.id ? (
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { onUpdateStock(p.id, tempStock); setEditId(null); }} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckCircle size={18} /></button>
                    <button onClick={() => setEditId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><XCircle size={18} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditId(p.id); setTempStock(p.stock); }} className="text-blue-600 hover:text-blue-800 text-sm font-bold">Update</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ManualOrderForm = ({ products, users, onClose, onSubmit }: { products: Product[], users: User[], onClose: () => void, onSubmit: (order: Order) => void }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [currentProd, setCurrentProd] = useState<string>('');
  const [qty, setQty] = useState(1);

  const handleAddItem = () => {
    if(!currentProd) return;
    const prod = products.find(p => p.id === currentProd);
    if(prod) {
      setCart([...cart, { product: prod, quantity: qty }]);
      setCurrentProd('');
      setQty(1);
    }
  };

  const calculateTotal = () => {
    const user = users.find(u => u.id === selectedUser);
    const isDist = user?.role === 'DISTRIBUTOR';
    return cart.reduce((acc, item) => acc + ((isDist ? item.product.distributorPrice : item.product.mrp) * item.quantity), 0);
  };

  const handleSubmit = () => {
    const user = users.find(u => u.id === selectedUser);
    if (!user || cart.length === 0) return;

    const total = calculateTotal();
    const taxableBase = total / 1.05;
    const tax = total - taxableBase;

    const order: Order = {
      id: `ORD-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userMobile: user.mobile,
      userAddress: user.address || 'Counter Sale',
      items: cart.map(c => ({...c.product, quantity: c.quantity})),
      totalAmount: Math.round(total),
      taxAmount: Math.round(tax * 100) / 100,
      status: 'Delivered',
      paymentMethod: 'Cash',
      paymentStatus: 'Paid',
      date: new Date().toISOString().split('T')[0],
      type: user.role === 'DISTRIBUTOR' ? 'WHOLESALE' : 'RETAIL',
      invoiceNumber: `INV-${Date.now()}`
    };
    onSubmit(order);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-xl">Create Manual Order</h3>
          <button onClick={onClose}><XCircle /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Select Customer</label>
            <select className="w-full border p-2 rounded" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">-- Select User --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded border">
            <h4 className="font-bold text-sm mb-2">Add Items</h4>
            <div className="flex gap-2">
              <select className="flex-1 border p-2 rounded" value={currentProd} onChange={e => setCurrentProd(e.target.value)}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stk: {p.stock})</option>)}
              </select>
              <input type="number" className="w-20 border p-2 rounded" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value))} />
              <button onClick={handleAddItem} className="bg-tea-dark text-white px-4 rounded">Add</button>
            </div>
          </div>

          <div>
             <table className="w-full text-sm">
               <thead><tr className="border-b"><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th></tr></thead>
               <tbody>
                 {cart.map((item, idx) => {
                   const user = users.find(u => u.id === selectedUser);
                   const price = user?.role === 'DISTRIBUTOR' ? item.product.distributorPrice : item.product.mrp;
                   return (
                    <tr key={idx} className="border-b">
                      <td>{item.product.name}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">₹{price * item.quantity}</td>
                    </tr>
                   );
                 })}
               </tbody>
             </table>
             <div className="text-right font-bold text-base mt-2 text-tea-dark">
               Total (MRP Incl. 5% GST): ₹{calculateTotal().toLocaleString()}
             </div>
          </div>

          <button onClick={handleSubmit} className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700">
            Create Order & Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

const PurchaseOrderForm = ({ products, onClose, onSubmit }: { products: Product[], onClose: () => void, onSubmit: (po: PurchaseOrder) => void }) => {
  const [supplier, setSupplier] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierMobile, setSupplierMobile] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [billUrl, setBillUrl] = useState('');
  const [billFileName, setBillFileName] = useState('');
  const [poNumber, setPoNumber] = useState(`PO-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  
  const [selProd, setSelProd] = useState('');
  const [qty, setQty] = useState(100);
  const [cost, setCost] = useState(0);

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit. Please upload a smaller image or document.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillUrl(reader.result as string);
        setBillFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    const p = products.find(x => x.id === selProd);
    if(p) {
      setItems([...items, { productId: p.id, productName: p.name, quantity: qty, unitCost: cost, totalCost: qty * cost }]);
      setSelProd('');
    }
  };

  const handleSubmit = () => {
    if(!supplier || items.length === 0) {
      alert("Please provide Supplier Name and add at least one product item.");
      return;
    }
    const po: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierName: supplier,
      supplierAddress,
      supplierMobile,
      supplierEmail,
      billUrl,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      items,
      totalAmount: items.reduce((sum, i) => sum + i.totalCost, 0)
    };
    onSubmit(po);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-5 border-b pb-3">
          <h3 className="font-extrabold text-xl text-tea-dark flex items-center gap-2">
            <ClipboardList className="text-tea-green" /> New Purchase Order
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition"><XCircle size={22} /></button>
        </div>

        {/* Supplier & PO Details Form */}
        <div className="space-y-3 mb-5">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Supplier / Vendor Name *</label>
               <input className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-tea-green outline-none" placeholder="e.g. Assam Tea Estates Ltd." value={supplier} onChange={e => setSupplier(e.target.value)} required />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">PO Number</label>
               <input className="w-full border p-2.5 rounded-lg text-sm bg-gray-50 font-mono font-bold" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Supplier Mobile No.</label>
               <input className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-tea-green outline-none" placeholder="e.g. 9876543210" value={supplierMobile} onChange={e => setSupplierMobile(e.target.value)} />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1">Supplier Email ID</label>
               <input type="email" className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-tea-green outline-none" placeholder="e.g. supplier@assamtea.com" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} />
             </div>
           </div>

           <div>
             <label className="block text-xs font-bold text-gray-700 mb-1">Supplier Address</label>
             <input className="w-full border p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-tea-green outline-none" placeholder="e.g. Dibrugarh, Tea Garden Estate, Assam - 786001" value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)} />
           </div>

           {/* Supplier Bill / Invoice File Upload */}
           <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition">
             <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
               <span className="flex items-center gap-1.5"><UploadCloud size={16} className="text-tea-dark" /> Upload Supplier Bill / Invoice Document</span>
               <span className="text-[11px] text-gray-400 font-normal">Formats: JPG, PNG, PDF (Max 5MB)</span>
             </label>
             <input type="file" accept="image/*,.pdf" onChange={handleBillUpload} className="block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-tea-dark file:text-white hover:file:bg-black cursor-pointer" />
             {billUrl && (
               <div className="mt-2 flex items-center justify-between text-xs bg-green-50 border border-green-200 text-green-800 p-2 rounded">
                 <span className="font-medium truncate flex items-center gap-1"><FileCheck size={14} className="text-green-600" /> Attached: {billFileName || 'Supplier_Bill.pdf'}</span>
                 <button type="button" onClick={() => { setBillUrl(''); setBillFileName(''); }} className="text-red-600 hover:underline text-[11px] font-bold">Remove</button>
               </div>
             )}
           </div>
        </div>

        {/* Product Items Adding */}
        <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-lg mb-4 flex flex-wrap gap-2 items-end">
           <div className="flex-1 min-w-[180px]">
             <label className="text-xs font-bold text-amber-900 block mb-1">Select Tea Product</label>
             <select className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-tea-green" value={selProd} onChange={e => {
               setSelProd(e.target.value);
               const p = products.find(x => x.id === e.target.value);
               if(p) setCost(p.costPrice);
             }}>
               <option value="">-- Choose Product --</option>
               {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.weight})</option>)}
             </select>
           </div>
           <div className="w-24">
             <label className="text-xs font-bold text-amber-900 block mb-1">Qty (Kg/Pcs)</label>
             <input type="number" min="1" className="w-full border p-2 rounded-lg text-sm" value={qty} onChange={e => setQty(Number(e.target.value))} />
           </div>
           <div className="w-28">
             <label className="text-xs font-bold text-amber-900 block mb-1">Unit Cost (₹)</label>
             <input type="number" min="0" className="w-full border p-2 rounded-lg text-sm" value={cost} onChange={e => setCost(Number(e.target.value))} />
           </div>
           <button onClick={addItem} className="bg-tea-dark hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition">Add Item</button>
        </div>

        {/* Items Table */}
        <div className="max-h-48 overflow-y-auto mb-4 border rounded-lg">
          <table className="w-full text-sm">
             <thead className="bg-gray-100 text-xs font-bold text-gray-700 uppercase">
               <tr>
                 <th className="p-2.5 text-left">Product</th>
                 <th className="p-2.5 text-center">Qty</th>
                 <th className="p-2.5 text-right">Unit Cost</th>
                 <th className="p-2.5 text-right">Total</th>
                 <th className="p-2.5 text-center"></th>
               </tr>
             </thead>
             <tbody className="divide-y text-xs">
               {items.length === 0 ? (
                 <tr><td colSpan={5} className="p-4 text-center text-gray-400">No items added to PO yet. Select product above.</td></tr>
               ) : (
                 items.map((i, idx) => (
                   <tr key={idx} className="hover:bg-gray-50">
                     <td className="p-2.5 font-semibold text-gray-800">{i.productName}</td>
                     <td className="p-2.5 text-center font-bold">{i.quantity}</td>
                     <td className="p-2.5 text-right text-gray-600">₹{i.unitCost}</td>
                     <td className="p-2.5 text-right font-bold text-tea-dark">₹{i.totalCost}</td>
                     <td className="p-2.5 text-center">
                        <button onClick={() => setItems(items.filter((_, index) => index !== idx))} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
          </table>
        </div>
        
        <div className="flex justify-between items-center border-t pt-4">
           <div>
             <span className="text-xs text-gray-500 block">Total PO Amount</span>
             <span className="font-black text-2xl text-tea-dark">₹{items.reduce((sum, i) => sum + i.totalCost, 0).toLocaleString()}</span>
           </div>
           <div className="flex gap-2">
             <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
             <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow transition flex items-center gap-1.5">
               <CheckCircle size={16} /> Generate PO
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { 
    user, orders, products, users, invoiceSettings, purchaseOrders, paymentSettings, brandAssets, reviews,
    updateInvoiceSettings, addUser, addOrder, addPurchaseOrder, receivePurchaseOrder, updatePurchaseOrderBill,
    updatePaymentStatus, approveDistributor, updateOrderStatus, deleteOrder, deletePurchaseOrder,
    addProduct, deleteProduct, updateProduct, updateStock, updatePaymentSettings, updateBrandAssets,
    clearOnlineOrders, updateUserPassword, updateReview, deleteReview, addFakeReview
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [paymentSubTab, setPaymentSubTab] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Order | null>(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<{id: string, name: string} | null>(null);
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showAddReview, setShowAddReview] = useState(false);
  const [viewingBillUrl, setViewingBillUrl] = useState<{ url: string; poNumber: string; supplierName: string } | null>(null);

  // Purchase Order Filtering & Export State
  const [poSupplierFilter, setPoSupplierFilter] = useState('');
  const [poFromDate, setPoFromDate] = useState('');
  const [poToDate, setPoToDate] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('ALL');

  const filteredPurchaseOrders = React.useMemo(() => {
    return purchaseOrders.filter(po => {
      if (poSupplierFilter.trim()) {
        const query = poSupplierFilter.toLowerCase().trim();
        const matchName = po.supplierName?.toLowerCase().includes(query);
        const matchPoNo = po.poNumber?.toLowerCase().includes(query);
        const matchMobile = po.supplierMobile?.toLowerCase().includes(query);
        if (!matchName && !matchPoNo && !matchMobile) return false;
      }
      if (poStatusFilter !== 'ALL' && po.status !== poStatusFilter) {
        return false;
      }
      if (poFromDate && po.date < poFromDate) {
        return false;
      }
      if (poToDate && po.date > poToDate) {
        return false;
      }
      return true;
    });
  }, [purchaseOrders, poSupplierFilter, poStatusFilter, poFromDate, poToDate]);

  const exportPOsToCSV = () => {
    if (filteredPurchaseOrders.length === 0) {
      alert("No purchase orders found to export based on current filters.");
      return;
    }
    const headers = [
      "PO Number",
      "Supplier Name",
      "Supplier Mobile",
      "Supplier Email",
      "Supplier Address",
      "Date",
      "Status",
      "Items Details",
      "Total Amount (INR)",
      "Bill Attached"
    ];

    const rows = filteredPurchaseOrders.map(po => {
      const itemsStr = po.items ? po.items.map(i => `${i.productName} (Qty: ${i.quantity}, Unit Cost: ₹${i.unitCost}, Total: ₹${i.totalCost})`).join(" | ") : "";
      return [
        `"${po.poNumber || ''}"`,
        `"${(po.supplierName || '').replace(/"/g, '""')}"`,
        `"${po.supplierMobile || ''}"`,
        `"${po.supplierEmail || ''}"`,
        `"${(po.supplierAddress || '').replace(/"/g, '""')}"`,
        `"${po.date || ''}"`,
        `"${po.status || ''}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        `"${po.totalAmount || 0}"`,
        `"${po.billUrl ? 'Yes' : 'No'}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Purchase_Orders_Report_${poSupplierFilter ? poSupplierFilter + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Settings state
  const [settingsForm, setSettingsForm] = useState<InvoiceSettings>(invoiceSettings);
  const [paymentForm, setPaymentForm] = useState<PaymentSettings>(paymentSettings);
  const [brandForm, setBrandForm] = useState<BrandAssets>(brandAssets);
  const [supabaseServiceKeyInput, setSupabaseServiceKeyInput] = useState(() => localStorage.getItem('amrit_assam_supabase_service_key') || '');

  React.useEffect(() => {
    setSettingsForm(invoiceSettings);
  }, [invoiceSettings]);

  React.useEffect(() => {
    setPaymentForm(paymentSettings);
  }, [paymentSettings]);

  React.useEffect(() => {
    setBrandForm(brandAssets);
  }, [brandAssets]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({ ...editingProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandAssetUpload = (field: keyof BrandAssets, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
           setBrandForm(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
  };

  const handleExportPnL = () => {
      const deliveredOrders = orders.filter(o => o.status === 'Delivered');
      const data: any[] = [];
      
      deliveredOrders.forEach(order => {
          order.items.forEach(item => {
             const product = products.find(p => p.id === item.id);
             const cost = product ? product.costPrice : 0;
             const sellingPrice = order.type === 'WHOLESALE' ? item.distributorPrice : item.mrp;
             const revenue = sellingPrice * item.quantity;
             const totalCost = cost * item.quantity;
             
             data.push({
                 Date: order.date,
                 OrderId: order.id,
                 Product: item.name,
                 Quantity: item.quantity,
                 Revenue: revenue,
                 COGS: totalCost,
                 Profit: revenue - totalCost
             });
          });
      });
      
      exportToCSV(data, 'Profit_Loss_Statement.csv');
  };

  if (!user) return <div className="p-8 text-center text-red-600">Please login to view dashboard</div>;

  // --- ADMIN VIEW ---
  if (user.role === 'ADMIN') {
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const orderCount = orders.length;
    const chartData = products.map(p => ({
      name: p.name.split('-')[1]?.trim() || p.name,
      sales: orders.flatMap(o => o.items).filter(i => i.id === p.id).reduce((sum, i) => sum + (i.quantity * i.mrp), 0)
    }));

    // PROFIT & LOSS CALCULATIONS
    const deliveredOrders = orders.filter(o => o.status === 'Delivered');
    
    let totalRevenue = 0;
    let totalCOGS = 0;

    deliveredOrders.forEach(order => {
        order.items.forEach(item => {
           const product = products.find(p => p.id === item.id);
           const cost = product ? product.costPrice : 0;
           const sellingPrice = order.type === 'WHOLESALE' ? item.distributorPrice : item.mrp;
           
           totalRevenue += (sellingPrice * item.quantity);
           totalCOGS += (cost * item.quantity);
        });
    });

    const grossProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

    // RAZORPAY / ONLINE PAYMENT STATS WITH DATE RANGE FILTER
    const filteredOrdersForPayments = orders.filter(o => {
      if (paymentStartDate && o.date < paymentStartDate) return false;
      if (paymentEndDate && o.date > paymentEndDate) return false;
      return true;
    });

    const onlineOrders = filteredOrdersForPayments.filter(o => o.paymentMethod !== 'COD' && o.paymentStatus === 'Paid');
    const allOnlineOrders = filteredOrdersForPayments.filter(o => o.paymentMethod !== 'COD');
    
    // Product MRP Sum for online orders (Incl. 5% GST)
    const razorpayMrpTotal = Math.round(onlineOrders.reduce((sum, order) => {
      const itemMrpSum = order.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || order.totalAmount;
      return sum + itemMrpSum;
    }, 0));

    // Base Product MRP (Excl. 5% GST) & GST 5% Amount
    const razorpayBaseMrpTotal = Math.round(razorpayMrpTotal / 1.05);
    const razorpayGstTotal = razorpayMrpTotal - razorpayBaseMrpTotal;

    // Razorpay Gateway Fee (5%)
    const razorpayFeeTotal = Math.round(onlineOrders.reduce((sum, o) => sum + (o.totalAmount * 0.05), 0));

    // Total Captured = Product MRP + Razorpay Fee (5%)
    const razorpayTotalCaptured = razorpayMrpTotal + razorpayFeeTotal;

    // Pending Settlement = ONLY Product MRP (incl. GST)
    const razorpayPendingSettlement = razorpayMrpTotal;

    // CASH ON DELIVERY (COD) STATS
    const codOrders = filteredOrdersForPayments.filter(o => o.paymentMethod === 'COD');
    
    // Product MRP Sum for COD orders (Incl. 5% GST)
    const codMrpTotal = Math.round(codOrders.reduce((sum, order) => {
      const itemMrpSum = order.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || order.totalAmount;
      return sum + itemMrpSum;
    }, 0));

    // Base Product MRP (Excl. 5% GST) & GST 5% Amount for COD
    const codBaseMrpTotal = Math.round(codMrpTotal / 1.05);
    const codGstTotal = codMrpTotal - codBaseMrpTotal;

    // Shipping & Handling charges for COD (₹50 per COD order)
    const codShippingTotal = codOrders.length * 50;

    // Total Captured for COD = Product MRP + Shipping Charges
    const codTotalCaptured = codMrpTotal + codShippingTotal;

    // COD Breakdown (Delivered vs Pending Collection)
    const codDeliveredMrp = Math.round(codOrders.filter(o => o.status === 'Delivered').reduce((sum, o) => {
      return sum + (o.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || o.totalAmount);
    }, 0));

    const codPendingMrp = Math.round(codOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').reduce((sum, o) => {
      return sum + (o.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || o.totalAmount);
    }, 0));

    const paymentVolumeData = [
       { name: 'Razorpay (Online)', value: razorpayTotalCaptured, color: '#0052cc' },
       { name: 'Cash on Delivery', value: codTotalCaptured, color: '#eab308' }
    ];

    const TABS = ['OVERVIEW', 'REPORTS', 'PAYMENTS', 'ORDERS', 'PURCHASE', 'INVENTORY', 'PRODUCTS', 'USERS', 'REVIEWS', 'SETTINGS'];

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-tea-dark mb-8 flex items-center justify-between">
          <span>Admin Dashboard</span>
          <span className="text-sm font-normal text-gray-500 hidden md:block">Manage your business</span>
        </h1>
        
        {/* Mobile Tabs */}
        <div className="flex overflow-x-auto pb-4 gap-2 md:hidden mb-4 no-scrollbar">
          {TABS.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition ${activeTab === tab ? 'bg-tea-green text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex space-x-4 border-b border-gray-200 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`pb-2 px-4 transition whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-tea-green font-bold text-tea-green' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div onClick={() => setActiveTab('ORDERS')} className="bg-white p-6 rounded-lg shadow border-l-4 border-tea-green cursor-pointer hover:shadow-lg transition">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-500 text-sm">Total Revenue</p>
                    <h3 className="text-2xl font-bold">₹{totalSales.toLocaleString()}</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <DollarSign className="text-tea-green" />
                  </div>
                </div>
              </div>
              <div onClick={() => setActiveTab('ORDERS')} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-500 text-sm">Total Orders</p>
                    <h3 className="text-2xl font-bold">{orderCount}</h3>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Package className="text-blue-500" />
                  </div>
                </div>
              </div>
              <div onClick={() => setActiveTab('INVENTORY')} className="bg-white p-6 rounded-lg shadow border-l-4 border-tea-gold cursor-pointer hover:shadow-lg transition">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-500 text-sm">Low Stock Items</p>
                    <h3 className="text-2xl font-bold text-red-600">
                      {products.filter(p => p.stock <= p.lowStockThreshold).length}
                    </h3>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <AlertTriangle className="text-tea-gold" />
                  </div>
                </div>
              </div>
              <div onClick={() => setActiveTab('USERS')} className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500 cursor-pointer hover:shadow-lg transition">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-500 text-sm">Distributors</p>
                    <h3 className="text-2xl font-bold">{users.filter(u => u.role === 'DISTRIBUTOR').length}</h3>
                  </div>
                   <div className="bg-purple-100 p-3 rounded-full">
                    <Users className="text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Sales Trends</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#1a4d2e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PAYMENTS' && (
           <div className="animate-fade-in space-y-6">
              {/* Date Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                       📅 Export & Filter Date Range:
                    </span>
                    <div className="flex items-center gap-2">
                       <label className="text-[11px] font-semibold text-gray-500">From:</label>
                       <input 
                          type="date" 
                          value={paymentStartDate} 
                          onChange={e => setPaymentStartDate(e.target.value)}
                          className="border rounded px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-tea-green font-medium"
                       />
                    </div>
                    <div className="flex items-center gap-2">
                       <label className="text-[11px] font-semibold text-gray-500">To:</label>
                       <input 
                          type="date" 
                          value={paymentEndDate} 
                          onChange={e => setPaymentEndDate(e.target.value)}
                          className="border rounded px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-tea-green font-medium"
                       />
                    </div>
                    {(paymentStartDate || paymentEndDate) && (
                       <button 
                          onClick={() => { setPaymentStartDate(''); setPaymentEndDate(''); }}
                          className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 bg-red-50 rounded border border-red-200"
                       >
                          Clear Filter
                       </button>
                    )}
                    <button 
                       onClick={() => {
                          const now = new Date();
                          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                          const today = now.toISOString().split('T')[0];
                          setPaymentStartDate(firstDay);
                          setPaymentEndDate(today);
                       }}
                       className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-2.5 py-1 rounded border"
                    >
                       This Month
                    </button>
                 </div>

                 <div className="text-xs text-gray-500 font-medium">
                    Filtered Orders: <strong className="text-tea-dark">{filteredOrdersForPayments.length}</strong>
                 </div>
              </div>

              {/* Payment Type Sub-Navigation */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                 <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                    <button
                       onClick={() => setPaymentSubTab('RAZORPAY')}
                       className={`px-4 py-2 rounded-md font-bold text-sm transition flex items-center gap-2 ${
                          paymentSubTab === 'RAZORPAY' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                       }`}
                    >
                       <CreditCard size={18} /> Razorpay (Online)
                    </button>
                    <button
                       onClick={() => setPaymentSubTab('COD')}
                       className={`px-4 py-2 rounded-md font-bold text-sm transition flex items-center gap-2 ${
                          paymentSubTab === 'COD' ? 'bg-amber-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                       }`}
                    >
                       <DollarSign size={18} /> Cash on Delivery (COD)
                    </button>
                 </div>

                 <div className="flex items-center gap-2 flex-wrap">
                    {paymentSubTab === 'RAZORPAY' && (
                      <button 
                         onClick={() => {
                             if(window.confirm('Are you sure you want to clear all online transaction history? This cannot be undone.')) {
                                 clearOnlineOrders();
                             }
                         }}
                         className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-red-700 transition shadow-sm"
                      >
                         <RotateCcw size={14} /> Reset Data
                      </button>
                    )}

                    <button 
                       onClick={() => {
                           if (paymentSubTab === 'RAZORPAY') {
                              const data = onlineOrders.map(o => {
                                  const customer = getOrderCustomerDetails(o, users);
                                  const itemMrpSum = o.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || o.totalAmount;
                                  const baseMrp = Math.round(itemMrpSum / 1.05);
                                  const gst = itemMrpSum - baseMrp;
                                  const fee = Math.round(o.totalAmount * 0.05);
                                  const totalCap = itemMrpSum + fee;
                                  const txn = o.transactionId || `pay_${o.id.replace('ORD-', '')}`;

                                  return {
                                      "Date": o.date,
                                      "Payment ID": txn,
                                      "Order ID": o.id,
                                      "Customer Name": customer.name,
                                      "Mobile No.": customer.mobile,
                                      "City": customer.city,
                                      "Full Address": customer.fullAddress,
                                      "Payment Method": o.paymentMethod,
                                      "Base Goods MRP (Excl. GST)": baseMrp,
                                      "GST (5%)": gst,
                                      "Total MRP (Incl. 5% GST)": itemMrpSum,
                                      "Razorpay Gateway Fee (5%)": fee,
                                      "Total Captured Amount": totalCap,
                                      "Net Bank Settlement Amount": itemMrpSum,
                                      "Payment Status": "Captured / Paid"
                                  };
                              });
                              exportToCSV(data, `Razorpay_Payments_${paymentStartDate || 'All'}_to_${paymentEndDate || 'All'}.csv`);
                           } else {
                              const data = codOrders.map(o => {
                                  const customer = getOrderCustomerDetails(o, users);
                                  const itemMrpSum = o.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || o.totalAmount;
                                  const baseMrp = Math.round(itemMrpSum / 1.05);
                                  const gst = itemMrpSum - baseMrp;
                                  const shippingFee = 50;
                                  const totalCap = itemMrpSum + shippingFee;

                                  return {
                                      "Date": o.date,
                                      "Order ID": o.id,
                                      "Customer Name": customer.name,
                                      "Mobile No.": customer.mobile,
                                      "City": customer.city,
                                      "Full Address": customer.fullAddress,
                                      "Payment Method": "COD",
                                      "Base Goods MRP (Excl. GST)": baseMrp,
                                      "GST (5%)": gst,
                                      "Total MRP (Incl. 5% GST)": itemMrpSum,
                                      "Shipping Fee": shippingFee,
                                      "Total Collectable Amount": totalCap,
                                      "Order Status": o.status
                                  };
                              });
                              exportToCSV(data, `COD_Payments_${paymentStartDate || 'All'}_to_${paymentEndDate || 'All'}.csv`);
                           }
                       }}
                       className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-700 transition shadow-sm"
                    >
                       <Download size={14} /> Export Excel
                    </button>

                    <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-extrabold border border-blue-200">
                       Live Payments
                    </span>
                 </div>
              </div>

              {/* RAZORPAY VIEW */}
              {paymentSubTab === 'RAZORPAY' && (
                <div className="space-y-6">
                   <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                           <CreditCard className="text-blue-600" /> Razorpay Payment Overview (5% Gateway Charges)
                        </h4>
                        <p className="text-xs text-blue-700 mt-0.5">
                           Total Captured includes <strong>Product MRP (with 5% GST) + Razorpay Gateway Charges (5%)</strong>. Pending settlement shows net <strong>Product MRP</strong> transferred to your bank.
                        </p>
                      </div>
                   </div>

                   {/* Razorpay KPI Cards */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       <div onClick={() => setActiveTab('ORDERS')} className="bg-white p-5 rounded-xl shadow-sm border border-blue-200 border-t-4 border-t-blue-600 cursor-pointer hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Total Captured</span>
                           <h2 className="text-2xl font-black text-blue-700 mt-1">₹{razorpayTotalCaptured.toLocaleString()}</h2>
                           <p className="text-[11px] text-gray-500 mt-1 font-medium">Product MRP + 5% Razorpay Fees</p>
                       </div>

                       <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 border-t-4 border-t-emerald-600 hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Product MRP (Incl. 5% GST)</span>
                           <h2 className="text-2xl font-black text-emerald-700 mt-1">₹{razorpayMrpTotal.toLocaleString()}</h2>
                           <p className="text-[11px] text-emerald-800 mt-1 font-semibold">
                             Base: ₹{razorpayBaseMrpTotal.toLocaleString()} | GST 5%: ₹{razorpayGstTotal.toLocaleString()}
                           </p>
                       </div>

                       <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-200 border-t-4 border-t-purple-600 hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Razorpay Gateway Fee (5%)</span>
                           <h2 className="text-2xl font-black text-purple-700 mt-1">₹{razorpayFeeTotal.toLocaleString()}</h2>
                           <p className="text-[11px] text-purple-700 mt-1 font-medium">Flat 5% Gateway Charge</p>
                       </div>

                       <div className="bg-white p-5 rounded-xl shadow-sm border border-yellow-200 border-t-4 border-t-yellow-500 hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Net Bank Settlement</span>
                           <h2 className="text-2xl font-black text-gray-800 mt-1">₹{razorpayPendingSettlement.toLocaleString()}</h2>
                           <p className="text-[11px] text-emerald-600 mt-1 font-bold">Pure Product MRP Transferred</p>
                       </div>
                   </div>

                   {/* Razorpay Online Orders Table */}
                   <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                         <h4 className="font-bold text-gray-800 text-sm">Online Transactions History ({onlineOrders.length})</h4>
                         <span className="text-xs text-gray-500">Sorted by newest first</span>
                      </div>

                      {onlineOrders.length === 0 ? (
                         <div className="p-8 text-center text-gray-500 text-sm">No online Razorpay transactions found in selected date range.</div>
                      ) : (
                         <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                               <thead>
                                  <tr className="bg-gray-100 text-gray-600 uppercase font-bold border-b text-[10px]">
                                     <th className="p-3">Date</th>
                                     <th className="p-3">Payment ID</th>
                                     <th className="p-3">Order ID</th>
                                     <th className="p-3">Customer Name</th>
                                     <th className="p-3">Mobile No.</th>
                                     <th className="p-3">City</th>
                                     <th className="p-3">Base Goods MRP</th>
                                     <th className="p-3">GST (5%)</th>
                                     <th className="p-3">Total MRP (Incl. GST)</th>
                                     <th className="p-3">Razorpay Fee (5%)</th>
                                     <th className="p-3">Total Captured</th>
                                     <th className="p-3">Status</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-200">
                                  {onlineOrders.map(order => {
                                     const customer = getOrderCustomerDetails(order, users);
                                     const itemMrpSum = order.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || order.totalAmount;
                                     const baseMrp = Math.round(itemMrpSum / 1.05);
                                     const gst = itemMrpSum - baseMrp;
                                     const fee = Math.round(order.totalAmount * 0.05);
                                     const totalCap = itemMrpSum + fee;
                                     const txn = order.transactionId || `pay_${order.id.replace('ORD-', '')}`;

                                     return (
                                        <tr key={order.id} className="hover:bg-blue-50/50 transition">
                                           <td className="p-3 font-medium text-gray-700 whitespace-nowrap">{order.date}</td>
                                           <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">{txn}</td>
                                           <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{order.id}</td>
                                           <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">{customer.name}</td>
                                           <td className="p-3 font-mono text-gray-700 whitespace-nowrap">{customer.mobile}</td>
                                           <td className="p-3 text-gray-700 whitespace-nowrap">{customer.city}</td>
                                           <td className="p-3 font-medium text-gray-700 whitespace-nowrap">₹{baseMrp}</td>
                                           <td className="p-3 font-medium text-amber-700 whitespace-nowrap">₹{gst}</td>
                                           <td className="p-3 font-bold text-gray-800 whitespace-nowrap">₹{itemMrpSum}</td>
                                           <td className="p-3 font-medium text-purple-700 whitespace-nowrap">+₹{fee}</td>
                                           <td className="p-3 font-black text-blue-800 whitespace-nowrap">₹{totalCap}</td>
                                           <td className="p-3 whitespace-nowrap">
                                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-green-200">
                                                 Captured
                                              </span>
                                           </td>
                                        </tr>
                                     );
                                  })}
                               </tbody>
                            </table>
                         </div>
                      )}
                   </div>
                </div>
              )}

              {/* COD VIEW */}
              {paymentSubTab === 'COD' && (
                <div className="space-y-6">
                   <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-amber-900 text-lg flex items-center gap-2">
                           <DollarSign className="text-amber-600" /> Cash on Delivery (COD) Dashboard
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                           Total Captured includes <strong>Product MRP (with 5% GST) + Shipping Charges (₹50)</strong>.
                        </p>
                      </div>
                   </div>

                   {/* COD KPI Cards */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                       <div onClick={() => setActiveTab('ORDERS')} className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 border-t-4 border-t-amber-500 cursor-pointer hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Total Captured</span>
                           <h2 className="text-2xl font-black text-amber-700 mt-1">₹{codTotalCaptured.toLocaleString()}</h2>
                           <p className="text-[11px] text-gray-500 mt-1 font-medium">Product MRP + Shipping Cost</p>
                       </div>

                       <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 border-t-4 border-t-emerald-600 hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Product MRP (Incl. 5% GST)</span>
                           <h2 className="text-2xl font-black text-emerald-700 mt-1">₹{codMrpTotal.toLocaleString()}</h2>
                           <p className="text-[11px] text-emerald-800 mt-1 font-semibold">
                             Base: ₹{codBaseMrpTotal.toLocaleString()} | GST 5%: ₹{codGstTotal.toLocaleString()}
                           </p>
                       </div>

                       <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200 border-t-4 border-t-blue-600 hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Shipping & Handling</span>
                           <h2 className="text-2xl font-black text-blue-700 mt-1">₹{codShippingTotal.toLocaleString()}</h2>
                           <p className="text-[11px] text-gray-500 mt-1 font-medium">₹50 Flat Charge per Order</p>
                       </div>

                       <div className="bg-white p-5 rounded-xl shadow-sm border border-purple-200 border-t-4 border-t-purple-600 hover:shadow-md transition">
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Pending Collection</span>
                           <h2 className="text-2xl font-black text-purple-700 mt-1">₹{codPendingMrp.toLocaleString()}</h2>
                           <p className="text-[11px] text-purple-600 mt-1 font-medium">Active Deliveries MRP</p>
                       </div>
                   </div>

                   {/* COD Orders Table */}
                   <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                         <h4 className="font-bold text-gray-800 text-sm">COD Orders List ({codOrders.length})</h4>
                         <span className="text-xs text-gray-500">Collect on delivery</span>
                      </div>

                      {codOrders.length === 0 ? (
                         <div className="p-8 text-center text-gray-500 text-sm">No Cash on Delivery orders found in selected date range.</div>
                      ) : (
                         <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                               <thead>
                                  <tr className="bg-gray-100 text-gray-600 uppercase font-bold border-b text-[10px]">
                                     <th className="p-3">Date</th>
                                     <th className="p-3">Order ID</th>
                                     <th className="p-3">Customer Name</th>
                                     <th className="p-3">Mobile No.</th>
                                     <th className="p-3">City</th>
                                     <th className="p-3">Base Goods MRP</th>
                                     <th className="p-3">GST (5%)</th>
                                     <th className="p-3">Total MRP (Incl. GST)</th>
                                     <th className="p-3">Shipping Charge</th>
                                     <th className="p-3">Total Collectable</th>
                                     <th className="p-3">Status</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-200">
                                  {codOrders.map(order => {
                                     const customer = getOrderCustomerDetails(order, users);
                                     const itemMrpSum = order.items?.reduce((iSum, i) => iSum + ((i.mrp || 0) * i.quantity), 0) || order.totalAmount;
                                     const baseMrp = Math.round(itemMrpSum / 1.05);
                                     const gst = itemMrpSum - baseMrp;
                                     const shippingCost = 50;
                                     const totalCollectable = itemMrpSum + shippingCost;

                                     return (
                                        <tr key={order.id} className="hover:bg-amber-50/50 transition">
                                           <td className="p-3 font-medium text-gray-700 whitespace-nowrap">{order.date}</td>
                                           <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">{order.id}</td>
                                           <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">{customer.name}</td>
                                           <td className="p-3 text-gray-700 font-mono whitespace-nowrap">{customer.mobile}</td>
                                           <td className="p-3 text-gray-700 whitespace-nowrap">{customer.city}</td>
                                           <td className="p-3 font-medium text-gray-700 whitespace-nowrap">₹{baseMrp}</td>
                                           <td className="p-3 font-medium text-amber-700 whitespace-nowrap">₹{gst}</td>
                                           <td className="p-3 font-bold text-emerald-700 whitespace-nowrap">₹{itemMrpSum}</td>
                                           <td className="p-3 font-medium text-blue-700 whitespace-nowrap">+₹{shippingCost}</td>
                                           <td className="p-3 font-black text-amber-800 whitespace-nowrap">₹{totalCollectable}</td>
                                           <td className="p-3 whitespace-nowrap">
                                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${
                                                 order.status === 'Delivered' ? 'bg-green-100 text-green-800 border-green-200' :
                                                 order.status === 'Cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                                                 'bg-amber-100 text-amber-800 border-amber-200'
                                              }`}>
                                                 {order.status}
                                              </span>
                                           </td>
                                        </tr>
                                     );
                                  })}
                               </tbody>
                            </table>
                         </div>
                      )}
                   </div>
                </div>
              )}
           </div>
        )}
        
        {activeTab === 'REPORTS' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-tea-dark"><TrendingUp /> Profit & Loss Statement</h3>
                        <button 
                            onClick={handleExportPnL}
                            className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-green-700 flex items-center gap-2"
                        >
                            <Download size={18} /> Export P&L to Excel
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div onClick={() => setActiveTab('ORDERS')} className="bg-green-50 p-6 rounded-xl border border-green-100 cursor-pointer hover:shadow-lg transition">
                            <p className="text-sm text-gray-500 font-bold uppercase">Total Sales Revenue</p>
                            <h2 className="text-3xl font-bold text-green-700">₹{totalRevenue.toLocaleString()}</h2>
                            <p className="text-xs text-gray-500 mt-1">Based on delivered orders</p>
                        </div>
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100 cursor-pointer hover:shadow-lg transition">
                            <p className="text-sm text-gray-500 font-bold uppercase">COGS</p>
                            <h2 className="text-3xl font-bold text-red-700">₹{totalCOGS.toLocaleString()}</h2>
                            <p className="text-xs text-gray-500 mt-1">Cost of Goods Sold</p>
                        </div>
                         <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 cursor-pointer hover:shadow-lg transition">
                            <p className="text-sm text-gray-500 font-bold uppercase">Gross Profit</p>
                            <h2 className="text-3xl font-bold text-blue-700">₹{grossProfit.toLocaleString()}</h2>
                            <p className="text-xs text-blue-600 font-bold mt-1">Margin: {profitMargin}%</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ... Rest of the tabs (Purchase, Orders, Inventory, Products, Users, Settings) remain the same ... */}
        {activeTab === 'PURCHASE' && (
            <div className="animate-fade-in">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-gray-700">Purchase Orders</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setShowPOForm(true)} className="bg-tea-dark text-white px-4 py-2 rounded font-bold shadow flex items-center gap-2 hover:bg-black">
                            <PlusCircle size={20} /> New PO
                        </button>
                    </div>
                 </div>
                 <div className="bg-white shadow rounded-lg p-4">
                    {purchaseOrders.map(po => (
                        <div key={po.id} className="border-b py-4 last:border-b-0 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold">{po.supplierName}</h4>
                                <span className="text-xs text-gray-500">{po.poNumber} | {po.date}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold">₹{po.totalAmount}</span>
                                <span className={`px-2 py-1 rounded text-xs ${po.status === 'Received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{po.status}</span>
                                {po.status === 'Pending' && <button onClick={() => receivePurchaseOrder(po.id)} className="text-blue-600 text-sm underline">Receive</button>}
                                <button onClick={() => deletePurchaseOrder(po.id)} className="text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {activeTab === 'ORDERS' && (
             <div className="animate-fade-in space-y-4">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Orders Management</h3>
                      <p className="text-xs text-gray-500">View customer details, shipping address, mobile number, and items to dispatch.</p>
                    </div>
                    <button onClick={() => setShowManualOrder(true)} className="bg-tea-dark text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2 hover:bg-black transition text-sm">
                         <PlusCircle size={18} /> Create New Order
                    </button>
                 </div>

                 {orders.length === 0 ? (
                   <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500">
                     <Package size={48} className="mx-auto mb-3 opacity-20" />
                     <p>No orders found.</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                     {orders.map(order => {
                       const customerMobile = order.userMobile || users.find(u => u.id === order.userId)?.mobile;
                       const customerAddress = order.userAddress || users.find(u => u.id === order.userId)?.address;

                       return (
                         <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition space-y-3">
                           {/* Main Order Header & Customer Info */}
                           <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b pb-4">
                             {/* Customer Details */}
                             <div className="space-y-2 flex-1">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                   <UserIcon size={20} className="text-tea-dark shrink-0" />
                                   {order.userName}
                                 </h4>
                                 <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full tracking-wider ${
                                   order.type === 'WHOLESALE' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                                 }`}>
                                   {order.type || 'RETAIL'}
                                 </span>
                                 <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full tracking-wider ${
                                   order.paymentStatus === 'Refunded' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                                   order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800 border border-green-300' :
                                   'bg-amber-100 text-amber-800 border border-amber-300'
                                 }`}>
                                   Payment: {order.paymentStatus}
                                 </span>
                               </div>

                               {/* Contact & Shipping Address Details */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 pt-1">
                                 <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                   <Phone size={16} className="text-tea-green shrink-0" />
                                   <div>
                                     <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Mobile / Contact</span>
                                     <a href={customerMobile ? `tel:${customerMobile}` : '#'} className="font-semibold text-gray-900 hover:text-tea-dark">
                                       {customerMobile || 'Not provided'}
                                     </a>
                                   </div>
                                 </div>

                                 <div className="flex items-start gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                   <MapPin size={16} className="text-tea-red shrink-0 mt-0.5" />
                                   <div>
                                     <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Delivery Address</span>
                                     <span className="font-medium text-gray-900 break-words">{customerAddress || 'Address not provided'}</span>
                                   </div>
                                 </div>
                               </div>
                             </div>

                             {/* Right Column: Amount, Status Dropdown & Action Buttons */}
                             <div className="flex flex-col sm:flex-row lg:flex-col lg:items-end justify-between gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                               <div className="lg:text-right">
                                 <span className="text-2xl font-black text-gray-900">₹{order.totalAmount}</span>
                                 <span className="text-xs font-semibold text-gray-600 block">Method: {order.paymentMethod}</span>
                                 <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1 inline-block">
                                    Txn/Pay ID: {order.paymentMethod === 'COD' ? 'COD' : (order.transactionId || `pay_${order.id.replace('ORD-', '')}`)}
                                 </span>
                               </div>

                               <div className="flex items-center gap-2 flex-wrap">
                                 <select 
                                   value={order.status} 
                                   onChange={e => updateOrderStatus(order.id, e.target.value as any)} 
                                   className={`border rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer shadow-sm ${
                                     order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-300' :
                                     order.status === 'Delivered' ? 'bg-green-50 text-green-700 border-green-300' :
                                     order.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                     'bg-amber-50 text-amber-800 border-amber-300'
                                   }`}
                                 >
                                     <option value="Processing">Processing</option>
                                     <option value="Shipped">Shipped</option>
                                     <option value="Delivered">Delivered</option>
                                     <option value="Cancelled">Cancelled (Auto Refund)</option>
                                 </select>

                                 <button 
                                   onClick={() => setViewInvoice(order)} 
                                   className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border"
                                   title="View & Print Invoice"
                                 >
                                   <FileText size={14} /> Invoice
                                 </button>

                                 <button 
                                   onClick={() => deleteOrder(order.id)} 
                                   className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition" 
                                   title="Delete Order"
                                 >
                                   <Trash2 size={16} />
                                 </button>
                               </div>
                             </div>
                           </div>

                           {/* Bottom Bar: Meta info & Items ordered */}
                           <div className="pt-1 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-gray-500">
                             <div className="flex items-center gap-2 flex-wrap">
                               <span className="font-mono bg-gray-100 px-2 py-0.5 rounded font-semibold text-gray-700">ID: {order.id}</span>
                               <span>•</span>
                               <span>Date: {order.date}</span>
                               {order.invoiceNumber && (
                                 <>
                                   <span>•</span>
                                   <span>Inv: {order.invoiceNumber}</span>
                                 </>
                               )}
                               {order.transactionId && (
                                 <>
                                   <span>•</span>
                                   <span className="font-mono text-gray-600">Txn: {order.transactionId}</span>
                                 </>
                               )}
                             </div>

                             {/* Items List Pill */}
                             {order.items && order.items.length > 0 && (
                               <div className="flex items-center gap-1.5 text-gray-700 font-medium bg-tea-green/5 px-3 py-1 rounded-md border border-tea-green/20">
                                 <Package size={14} className="text-tea-dark shrink-0" />
                                 <span className="truncate max-w-md">
                                   <strong className="text-tea-dark">Items:</strong> {order.items.map(i => `${i.quantity}x ${i.name || 'Tea'} (${i.weight || ''})`).join(', ')}
                                 </span>
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
             </div>
        )}

         {activeTab === 'PURCHASE' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <div>
                 <h2 className="text-2xl font-bold text-tea-dark flex items-center gap-2">
                   <ClipboardList className="text-tea-green" /> Purchase Orders & Supplier Bills
                 </h2>
                 <p className="text-sm text-gray-500 mt-1">Manage tea inventory purchases, supplier details, and uploaded bill documents.</p>
               </div>
               <button 
                 onClick={() => setShowPOForm(true)}
                 className="bg-tea-dark hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow transition flex items-center gap-2 shrink-0"
               >
                 <PlusCircle size={18} /> New Purchase Order
               </button>
             </div>

             {/* PO Summary Metrics */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Purchase Orders</p>
                   <p className="text-2xl font-black text-tea-dark mt-1">{purchaseOrders.length}</p>
                 </div>
                 <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                   <ClipboardList className="text-emerald-600" size={24} />
                 </div>
               </div>

               <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pending POs</p>
                   <p className="text-2xl font-black text-amber-600 mt-1">
                     {purchaseOrders.filter(p => p.status === 'Pending').length}
                   </p>
                 </div>
                 <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                   <AlertTriangle className="text-amber-600" size={24} />
                 </div>
               </div>

               <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total PO Cost</p>
                   <p className="text-2xl font-black text-tea-dark mt-1">
                     ₹{purchaseOrders.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString()}
                   </p>
                 </div>
                 <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                   <DollarSign className="text-blue-600" size={24} />
                 </div>
               </div>
             </div>

             {/* PO Filter Bar & Export */}
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
               <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                 {/* Search & Date Filters */}
                 <div className="flex flex-wrap items-center gap-3 flex-1">
                   {/* Supplier Name Search */}
                   <div className="relative flex-1 min-w-[200px]">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input 
                       type="text" 
                       placeholder="Filter by Supplier Name / PO No / Phone..." 
                       value={poSupplierFilter}
                       onChange={e => setPoSupplierFilter(e.target.value)}
                       className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-tea-green outline-none"
                     />
                     {poSupplierFilter && (
                       <button onClick={() => setPoSupplierFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                         <X size={14} />
                       </button>
                     )}
                   </div>

                   {/* Status Filter */}
                   <div className="w-36">
                     <select 
                       value={poStatusFilter}
                       onChange={e => setPoStatusFilter(e.target.value)}
                       className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-tea-green outline-none"
                     >
                       <option value="ALL">All Status</option>
                       <option value="Pending">Pending</option>
                       <option value="Received">Received</option>
                       <option value="Cancelled">Cancelled</option>
                     </select>
                   </div>

                   {/* From Date */}
                   <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
                     <span className="font-semibold text-gray-500 shrink-0">From:</span>
                     <input 
                       type="date" 
                       value={poFromDate}
                       onChange={e => setPoFromDate(e.target.value)}
                       className="bg-transparent text-xs font-medium outline-none cursor-pointer"
                     />
                   </div>

                   {/* To Date */}
                   <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
                     <span className="font-semibold text-gray-500 shrink-0">To:</span>
                     <input 
                       type="date" 
                       value={poToDate}
                       onChange={e => setPoToDate(e.target.value)}
                       className="bg-transparent text-xs font-medium outline-none cursor-pointer"
                     />
                   </div>

                   {(poSupplierFilter || poStatusFilter !== 'ALL' || poFromDate || poToDate) && (
                     <button 
                       onClick={() => {
                         setPoSupplierFilter('');
                         setPoStatusFilter('ALL');
                         setPoFromDate('');
                         setPoToDate('');
                       }}
                       className="text-xs text-red-600 font-bold hover:underline py-1 px-2"
                     >
                       Clear Filters
                     </button>
                   )}
                 </div>

                 {/* Buttons */}
                 <div className="flex items-center gap-2 shrink-0">
                   <button 
                     onClick={() => setShowPOForm(true)}
                     className="bg-tea-dark hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-xs shadow transition flex items-center justify-center gap-1.5 shrink-0"
                   >
                     <PlusCircle size={16} /> New Purchase Order
                   </button>

                   <button 
                     onClick={exportPOsToCSV}
                     className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold text-xs shadow transition flex items-center justify-center gap-1.5 shrink-0"
                   >
                     <FileSpreadsheet size={16} /> Export CSV Report
                   </button>
                 </div>
               </div>

               <div className="text-xs text-gray-500 flex flex-wrap justify-between items-center gap-2 pt-2 border-t">
                 <span>Showing <strong>{filteredPurchaseOrders.length}</strong> of <strong>{purchaseOrders.length}</strong> purchase orders</span>
                 {filteredPurchaseOrders.length > 0 && (
                   <span className="font-bold text-tea-dark">Filtered Total Cost: ₹{filteredPurchaseOrders.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString()}</span>
                 )}
               </div>
             </div>

             {/* Purchase Orders List */}
             {purchaseOrders.length === 0 ? (
               <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
                 <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
                 <h3 className="font-bold text-gray-700 text-lg">No Purchase Orders Created Yet</h3>
                 <p className="text-gray-500 text-sm mt-1 mb-4">Click below to create your first supplier purchase order with supplier contact details and bill upload.</p>
                 <button 
                   onClick={() => setShowPOForm(true)}
                   className="bg-tea-green text-white font-bold px-5 py-2.5 rounded-lg hover:bg-tea-dark transition inline-flex items-center gap-2"
                 >
                   <PlusCircle size={18} /> Create First Purchase Order
                 </button>
               </div>
             ) : filteredPurchaseOrders.length === 0 ? (
               <div className="bg-white rounded-xl p-10 text-center border border-gray-200 shadow-sm">
                 <Search size={40} className="mx-auto text-gray-300 mb-2" />
                 <h3 className="font-bold text-gray-700">No Purchase Orders Match Filters</h3>
                 <p className="text-gray-500 text-xs mt-1 mb-3">Try clearing supplier name or date filters to view all purchase orders.</p>
                 <button 
                   onClick={() => {
                     setPoSupplierFilter('');
                     setPoStatusFilter('ALL');
                     setPoFromDate('');
                     setPoToDate('');
                   }}
                   className="text-xs bg-gray-100 hover:bg-gray-200 font-bold px-4 py-2 rounded-lg text-gray-700 transition"
                 >
                   Reset Filters
                 </button>
               </div>
             ) : (
               <div className="space-y-4">
                 {filteredPurchaseOrders.map((po) => (
                   <div key={po.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
                     <div className="p-5">
                       {/* PO Top Row */}
                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b">
                         <div className="flex items-center gap-3">
                           <span className="font-mono font-bold text-lg text-tea-dark bg-gray-100 px-3 py-1 rounded-lg border">{po.poNumber}</span>
                           <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                             po.status === 'Received' ? 'bg-green-100 text-green-800 border border-green-200' :
                             po.status === 'Cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                             'bg-amber-100 text-amber-800 border border-amber-200'
                           }`}>
                             {po.status}
                           </span>
                         </div>
                         <div className="text-sm text-gray-500">
                           Created Date: <strong className="text-gray-800">{po.date}</strong>
                         </div>
                       </div>

                       {/* PO Body Grid */}
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4 border-b">
                         {/* Supplier Info Box */}
                         <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-1.5 text-xs">
                           <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b pb-1">
                             <UserIcon size={16} className="text-tea-dark shrink-0" />
                             {po.supplierName || 'Supplier'}
                           </p>
                           {po.supplierMobile && (
                             <p className="text-gray-700 flex items-center gap-1.5">
                               <Phone size={13} className="text-gray-400 shrink-0" />
                               <a href={`tel:${po.supplierMobile}`} className="hover:underline font-medium">{po.supplierMobile}</a>
                             </p>
                           )}
                           {po.supplierEmail && (
                             <p className="text-gray-700 flex items-center gap-1.5 truncate">
                               <Mail size={13} className="text-gray-400 shrink-0" />
                               <a href={`mailto:${po.supplierEmail}`} className="hover:underline font-medium truncate">{po.supplierEmail}</a>
                             </p>
                           )}
                           {po.supplierAddress && (
                             <p className="text-gray-600 flex items-start gap-1.5">
                               <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                               <span>{po.supplierAddress}</span>
                             </p>
                           )}
                         </div>

                         {/* Items List */}
                         <div className="lg:col-span-1 space-y-1">
                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Purchased Products</p>
                           <div className="bg-gray-50 rounded-lg p-2.5 max-h-32 overflow-y-auto divide-y text-xs">
                             {po.items?.map((item, idx) => (
                               <div key={idx} className="py-1 flex justify-between items-center">
                                 <div>
                                   <span className="font-semibold text-gray-800">{item.productName}</span>
                                   <span className="text-gray-500 ml-1">x{item.quantity}</span>
                                 </div>
                                 <span className="font-bold text-gray-900">₹{item.totalCost?.toLocaleString()}</span>
                               </div>
                             ))}
                           </div>
                         </div>

                         {/* Supplier Bill Document Box */}
                         <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-lg flex flex-col justify-between">
                           <div>
                             <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                               <Paperclip size={14} className="text-emerald-700" /> Supplier Bill / Invoice Document
                             </p>
                             {po.billUrl ? (
                               <div className="space-y-2">
                                 <div className="flex items-center gap-2 text-xs text-emerald-800 bg-white p-2 rounded border border-emerald-200">
                                   <FileCheck size={18} className="text-green-600 shrink-0" />
                                   <span className="font-medium truncate">Supplier Bill Attached</span>
                                 </div>
                                 <button
                                   onClick={() => setViewingBillUrl({ url: po.billUrl!, poNumber: po.poNumber, supplierName: po.supplierName })}
                                   className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 px-3 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                                 >
                                   <Eye size={14} /> View / Download Bill
                                 </button>
                               </div>
                             ) : (
                               <div className="text-xs text-gray-500 space-y-2">
                                 <p className="italic">No bill attached yet.</p>
                                 <label className="block bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold py-1.5 px-3 rounded text-center cursor-pointer transition text-xs">
                                   <span className="flex items-center justify-center gap-1">
                                     <UploadCloud size={14} /> Upload Bill Document
                                   </span>
                                   <input 
                                     type="file" 
                                     accept="image/*,.pdf" 
                                     className="hidden" 
                                     onChange={(e) => {
                                       const file = e.target.files?.[0];
                                       if (file) {
                                         const reader = new FileReader();
                                         reader.onloadend = () => {
                                           updatePurchaseOrderBill(po.id, reader.result as string);
                                         };
                                         reader.readAsDataURL(file);
                                       }
                                     }} 
                                   />
                                 </label>
                               </div>
                             )}
                           </div>
                           <div className="pt-2 mt-2 border-t border-emerald-200/60 flex justify-between items-center text-xs">
                             <span className="text-gray-500">Total PO Amount:</span>
                             <span className="font-black text-base text-tea-dark">₹{po.totalAmount?.toLocaleString()}</span>
                           </div>
                         </div>
                       </div>

                       {/* PO Actions Footer */}
                       <div className="pt-3 flex flex-wrap justify-between items-center gap-2">
                         <div className="text-xs text-gray-500">
                           {po.status === 'Pending' && (
                             <span className="text-amber-700 font-medium">Clicking 'Mark Received' will auto-add item quantities into Inventory Stock.</span>
                           )}
                         </div>
                         <div className="flex items-center gap-2">
                           {po.status === 'Pending' && (
                             <button
                               onClick={() => receivePurchaseOrder(po.id)}
                               className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow transition flex items-center gap-1"
                             >
                               <CheckCircle size={14} /> Mark Received (Add Stock)
                             </button>
                           )}
                           <button
                             onClick={() => {
                               if (confirm(`Are you sure you want to delete purchase order ${po.poNumber}?`)) {
                                 deletePurchaseOrder(po.id);
                               }
                             }}
                             className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                           >
                             <Trash2 size={14} /> Delete PO
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {activeTab === 'INVENTORY' && (
            <InventoryManager products={products} onUpdateStock={updateStock} />
        )}

        {activeTab === 'PRODUCTS' && (
             <div className="animate-fade-in">
                 <div className="flex justify-end mb-4">
                     <button onClick={() => setEditingProduct({ id: 'new', name: '', description: '', image: '', weight: '', mrp: 0, distributorPrice: 0, costPrice: 0, stock: 0, lowStockThreshold: 50, category: 'Pouch', hsnCode: '0902' })} className="bg-tea-gold text-tea-dark font-bold px-4 py-2 rounded shadow hover:bg-yellow-400 transition flex items-center gap-2">
                         <PlusCircle /> Add Product
                     </button>
                 </div>
                 {editingProduct && (
                     <div className="bg-gray-50 p-6 rounded-lg mb-6 border">
                         <div className="flex justify-between items-center mb-4">
                             <h4 className="font-bold text-lg">{editingProduct.id === 'new' ? 'Add New Product' : 'Edit Product'}</h4>
                             <button onClick={() => setEditingProduct(null)}><XCircle /></button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="border p-2 rounded" placeholder="Name" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                            <input className="border p-2 rounded" placeholder="Weight" value={editingProduct.weight} onChange={e => setEditingProduct({...editingProduct, weight: e.target.value})} />
                            <input type="number" className="border p-2 rounded" placeholder="MRP" value={editingProduct.mrp} onChange={e => setEditingProduct({...editingProduct, mrp: Number(e.target.value)})} />
                            <input type="number" className="border p-2 rounded" placeholder="Distributor Price" value={editingProduct.distributorPrice} onChange={e => setEditingProduct({...editingProduct, distributorPrice: Number(e.target.value)})} />
                            <input type="number" className="border p-2 rounded" placeholder="Cost Price" value={editingProduct.costPrice} onChange={e => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})} />
                            <input type="number" className="border p-2 rounded" placeholder="Stock" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} />
                            <select className="border p-2 rounded" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}>
                                <option value="Pouch">Pouch</option>
                                <option value="Sachet">Sachet</option>
                                <option value="Bulk">Bulk</option>
                            </select>
                            <input className="border p-2 rounded" placeholder="Image URL" value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} />
                            <div className="col-span-2">
                                <label className="block text-sm font-bold mb-1">Upload Image</label>
                                <input type="file" accept="image/*" onChange={handleImageUpload} />
                            </div>
                            <textarea className="border p-2 rounded col-span-2" placeholder="Description" rows={3} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
                         </div>
                         <button 
                            onClick={() => {
                                if (editingProduct.id === 'new') addProduct({ ...editingProduct, id: Date.now().toString() });
                                else updateProduct(editingProduct);
                                setEditingProduct(null);
                            }}
                            className="mt-4 bg-tea-dark text-white px-6 py-2 rounded font-bold"
                         >
                            Save Product
                         </button>
                     </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(p => (
                        <div key={p.id} className="bg-white border rounded-lg p-4 flex gap-4 shadow-sm hover:shadow-md transition relative">
                           <img src={p.image} className="w-24 h-24 object-cover rounded bg-gray-100" />
                           <div className="flex-1">
                                <h4 className="font-bold text-lg leading-tight mb-1">{p.name}</h4>
                                <div className="absolute top-2 right-2 flex flex-col gap-2">
                                   <button onClick={() => setEditingProduct(p)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><FileText size={16} /></button>
                                   <button onClick={() => deleteProduct(p.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle size={16} /></button>
                               </div>
                           </div>
                        </div>
                    ))}
                 </div>
             </div>
        )}

        {activeTab === 'USERS' && (
             <div className="animate-fade-in">
                 <div className="flex justify-end mb-4">
                     <button onClick={() => setShowAddUser(true)} className="bg-tea-dark text-white px-4 py-2 rounded font-bold shadow">Add User</button>
                 </div>
                 <div className="bg-white shadow rounded-lg p-4">
                     <table className="w-full text-left text-sm">
                         <thead>
                             <tr className="border-b"><th className="p-2">Name</th><th className="p-2">Role</th><th className="p-2">Mobile</th><th className="p-2">Action</th></tr>
                         </thead>
                         <tbody>
                             {users.map(u => (
                                 <tr key={u.id} className="border-b">
                                     <td className="p-2">{u.name}</td>
                                     <td className="p-2">{u.role}</td>
                                     <td className="p-2">{u.mobile}</td>
                                     <td className="p-2 flex gap-2">
                                         {u.role === 'DISTRIBUTOR' && !u.approved && <button onClick={() => approveDistributor(u.id)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Approve</button>}
                                         <button onClick={() => setPasswordModalUser({id: u.id, name: u.name})} className="text-gray-600 hover:text-tea-dark" title="Change Password"><KeyRound size={18} /></button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        )}

        {activeTab === 'REVIEWS' && (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-gray-700">Manage Reviews</h3>
                    <button 
                        onClick={() => { setEditingReview(null); setShowAddReview(true); }} 
                        className="bg-tea-dark text-white px-4 py-2 rounded font-bold shadow flex items-center gap-2 hover:bg-black"
                    >
                        <PlusCircle size={20} /> Add Manual Review
                    </button>
                </div>
                
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-bold text-gray-600">Product</th>
                                <th className="p-3 font-bold text-gray-600">Reviewer</th>
                                <th className="p-3 font-bold text-gray-600">Rating</th>
                                <th className="p-3 font-bold text-gray-600">Comment</th>
                                <th className="p-3 font-bold text-gray-600">Date</th>
                                <th className="p-3 font-bold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {reviews.map(r => {
                                const product = products.find(p => p.id === r.productId);
                                return (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{product?.name || 'Unknown Product'}</td>
                                        <td className="p-3">{r.userName}</td>
                                        <td className="p-3">
                                            <div className="flex text-tea-gold">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} className={i < r.rating ? "fill-tea-gold" : "text-gray-300"} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-3 max-w-xs truncate" title={r.comment}>{r.comment}</td>
                                        <td className="p-3 text-gray-500">{r.date}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => { setEditingReview(r); setShowAddReview(true); }}
                                                className="text-blue-600 hover:text-blue-800 p-1 mr-2"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm('Are you sure you want to delete this review?')) {
                                                        deleteReview(r.id);
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-800 p-1"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {reviews.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No reviews found. Add one manually!</div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'SETTINGS' && (
          <div className="bg-white p-6 rounded-lg shadow max-w-2xl animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-tea-dark">
                    <Settings size={24} /> Settings
                </h3>
                <button 
                    onClick={() => setPasswordModalUser({id: user.id, name: user.name})}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded flex items-center gap-2 border border-gray-300 transition"
                >
                    <KeyRound size={14} /> Change My Password
                </button>
             </div>
             
             <div className="space-y-4">
                {/* BRANDING ASSETS SECTION */}
                <h4 className="font-bold text-lg text-gray-600 border-b pb-2 flex items-center gap-2">
                    <ImageIcon size={20} /> Branding & Images
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* LOGO UPLOAD */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-600">Company Logo</label>
                        <div className="border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer relative">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => handleBrandAssetUpload('logo', e)}
                            />
                            {brandForm.logo ? (
                                <img src={brandForm.logo} alt="Logo Preview" className="h-16 object-contain mb-2" />
                            ) : (
                                <ImageIcon className="text-gray-400 mb-2" size={32} />
                            )}
                            <span className="text-xs text-gray-500">Click to upload Logo</span>
                        </div>
                    </div>

                    {/* HERO IMAGE UPLOAD */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-600">Homepage Hero Banner</label>
                        <div className="border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer relative">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => handleBrandAssetUpload('heroImage', e)}
                            />
                            {brandForm.heroImage ? (
                                <img src={brandForm.heroImage} alt="Hero Preview" className="h-16 w-full object-cover mb-2 rounded" />
                            ) : (
                                <ImageIcon className="text-gray-400 mb-2" size={32} />
                            )}
                            <span className="text-xs text-gray-500">Click to upload Banner</span>
                        </div>
                    </div>

                    {/* FEATURE IMAGE UPLOAD - NEW */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-bold text-gray-600">"Why Choose Us" Section Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center hover:bg-gray-50 cursor-pointer relative">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => handleBrandAssetUpload('featureImage', e)}
                            />
                            {brandForm.featureImage ? (
                                <img src={brandForm.featureImage} alt="Feature Preview" className="h-32 w-full object-cover mb-2 rounded" />
                            ) : (
                                <ImageIcon className="text-gray-400 mb-2" size={32} />
                            )}
                            <span className="text-xs text-gray-500">Click to upload Feature Image</span>
                        </div>
                    </div>
                </div>

                <h4 className="font-bold text-lg text-gray-600 border-b pb-2 mt-8">Invoice Details</h4>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Company Name</label>
                  <input 
                    className="w-full border p-3 rounded" 
                    value={settingsForm.companyName}
                    onChange={e => setSettingsForm({...settingsForm, companyName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Address Line 1</label>
                  <input 
                    className="w-full border p-3 rounded" 
                    value={settingsForm.addressLine1}
                    onChange={e => setSettingsForm({...settingsForm, addressLine1: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Address Line 2</label>
                  <input 
                    className="w-full border p-3 rounded" 
                    value={settingsForm.addressLine2}
                    onChange={e => setSettingsForm({...settingsForm, addressLine2: e.target.value})}
                  />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">GSTIN</label>
                      <input 
                        className="w-full border p-3 rounded" 
                        value={settingsForm.gstin}
                        onChange={e => setSettingsForm({...settingsForm, gstin: e.target.value})}
                      />
                    </div>
                     <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">Phone</label>
                      <input 
                        className="w-full border p-3 rounded" 
                        value={settingsForm.phone}
                        onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})}
                      />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Company Email</label>
                    <input 
                      className="w-full border p-3 rounded" 
                      value={settingsForm.email}
                      onChange={e => setSettingsForm({...settingsForm, email: e.target.value})}
                    />
                 </div>
                 <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">Footer Note</label>
                  <textarea 
                    className="w-full border p-3 rounded" 
                    rows={3}
                    value={settingsForm.footerNote}
                    onChange={e => setSettingsForm({...settingsForm, footerNote: e.target.value})}
                  />
                </div>
                
                {/* PAYMENT SETTINGS SECTION */}
                <div className="mt-8 border-t pt-6">
                   <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-600 border-b pb-2">
                     <CreditCard size={20} /> Payment Gateway & Manual Transfer Settings
                   </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-sm font-bold text-gray-600 mb-1">Razorpay Key ID (Public Key)</label>
                         <input 
                           className="w-full border p-3 rounded font-mono text-sm bg-gray-50" 
                           value={paymentForm.razorpayKeyId}
                           onChange={e => setPaymentForm({...paymentForm, razorpayKeyId: e.target.value})}
                           placeholder="rzp_test_..."
                         />
                         <p className="text-xs text-gray-500 mt-1">This key is used to initiate payments on the checkout page.</p>
                      </div>
                      <div>
                         <label className="block text-sm font-bold text-gray-600 mb-1">Manual Merchant UPI ID (For Direct Payments)</label>
                         <input 
                           className="w-full border p-3 rounded font-mono text-sm" 
                           value={paymentForm.merchantUpiId || ''}
                           onChange={e => setPaymentForm({...paymentForm, merchantUpiId: e.target.value})}
                           placeholder="merchant@okaxis"
                         />
                         <p className="text-xs text-gray-500 mt-1">Directly receive zero-fee payments via dynamic QR code and manual verification.</p>
                      </div>
                    </div>
                </div>

                {/* DATABASE & AUTH MANAGEMENT SETTINGS */}
                <div className="mt-8 border-t pt-6">
                   <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-600 border-b pb-2">
                     <Lock size={20} /> Supabase Auth & Password Management
                   </h4>
                   <div>
                     <label className="block text-sm font-bold text-gray-600 mb-1">Supabase Service Role Key (Admin Secret)</label>
                     <input 
                       type="password"
                       className="w-full border p-3 rounded font-mono text-sm bg-gray-50" 
                       value={supabaseServiceKeyInput}
                       onChange={e => setSupabaseServiceKeyInput(e.target.value)}
                       placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       Allows Administrator to directly reset/update any user's password. Found in Supabase &gt; Project Settings &gt; API &gt; <code>service_role</code> (secret).
                     </p>
                   </div>
                </div>

                <div className="pt-4 flex justify-end">
                   <button 
                    onClick={() => {
                       updateInvoiceSettings(settingsForm);
                       updatePaymentSettings(paymentForm);
                       updateBrandAssets(brandForm);
                       if (supabaseServiceKeyInput.trim()) {
                         localStorage.setItem('amrit_assam_supabase_service_key', supabaseServiceKeyInput.trim());
                       } else {
                         localStorage.removeItem('amrit_assam_supabase_service_key');
                       }
                       alert("Settings saved successfully!");
                    }}
                    className="bg-tea-green text-white font-bold py-3 px-8 rounded hover:bg-tea-dark flex items-center gap-2"
                   >
                     <Save size={20} /> Save All Settings
                   </button>
                </div>
             </div>
          </div>
        )}
        
        {/* Manual Order Modal */}
        {showManualOrder && (
          <ManualOrderForm 
            products={products} 
            users={users} 
            onClose={() => setShowManualOrder(false)} 
            onSubmit={(order) => {
              addOrder(order);
              setShowManualOrder(false);
              setViewInvoice(order); // Show invoice immediately after creation
            }} 
          />
        )}

        {/* Purchase Order Modal */}
        {showPOForm && (
          <PurchaseOrderForm 
            products={products}
            onClose={() => setShowPOForm(false)}
            onSubmit={(po) => {
              addPurchaseOrder(po);
              setShowPOForm(false);
            }}
          />
        )}

        {/* Review Form Modal - NEW */}
        {showAddReview && (
            <ReviewManagerForm
                products={products}
                review={editingReview}
                onClose={() => setShowAddReview(false)}
                onSubmit={(r) => {
                    if (editingReview) {
                        updateReview(r);
                    } else {
                        addFakeReview(r);
                    }
                    setShowAddReview(false);
                }}
            />
        )}

        {/* Add User Modal */}
        {showAddUser && (
          <AddUserForm 
            onClose={() => setShowAddUser(false)}
            onSubmit={(u) => {
              addUser(u);
              setShowAddUser(false);
            }}
          />
        )}
        
        {/* Password Modal - ADDED */}
        {passwordModalUser && (
            <ChangePasswordModal 
                targetUser={passwordModalUser} 
                onClose={() => setPasswordModalUser(null)} 
                onSuccess={(msg) => {
                    alert(msg);
                    setPasswordModalUser(null);
                }} 
            />
        )}

        {/* Invoice Modal - ADDED */}
        {viewInvoice && (
          <InvoiceTemplate order={viewInvoice} onClose={() => setViewInvoice(null)} />
        )}
      </div>
    );
  }

  // --- DISTRIBUTOR & CUSTOMER VIEW ---
  const myOrders = orders.filter(o => o.userId === user.id);
  const isDistributor = user.role === 'DISTRIBUTOR';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hello Header */}
      <div className="bg-gradient-to-r from-tea-dark to-tea-green text-white p-6 md:p-10 rounded-2xl shadow-lg mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Hello, {user.name}</h1>
          <p className="opacity-90">
             {isDistributor ? `Distributor Panel | Territory: ${user.territory || 'Unassigned'}` : 'Welcome to Amrit Assam Tea Store'}
          </p>
          {isDistributor && (
            <div className="mt-4 inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 text-sm font-bold text-tea-gold">
               Wholesale Pricing Enabled
            </div>
          )}
          
          <div className="absolute top-4 right-4">
            <button 
                onClick={() => setPasswordModalUser({id: user.id, name: user.name})}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm flex items-center gap-2 backdrop-blur-sm transition border border-white/10"
            >
                <KeyRound size={16} /> Change Password
            </button>
          </div>
        </div>
         <Package className="absolute right-[-20px] bottom-[-40px] text-white/10 w-64 h-64" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Orders */}
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4 text-tea-dark flex items-center gap-2">
            <FileText size={20} /> Order History
          </h2>
          
          {myOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border-2 border-dashed border-gray-300 text-center text-gray-500">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>You haven't placed any orders yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map(order => (
                <div key={order.id} className="bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-wrap justify-between items-start mb-4 border-b pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{order.id}</span>
                        {order.invoiceNumber && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">Inv: {order.invoiceNumber}</span>}
                      </div>
                      <span className="text-gray-500 text-xs">{order.date}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 
                        order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                      <span className={`text-xs font-bold ${order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-500'}`}>
                        Payment: {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm items-center">
                        <div className="flex items-center gap-2">
                           <div className="bg-gray-100 w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-gray-500">{item.quantity}x</div>
                           <span className="text-gray-700">{item.name} <span className="text-xs text-gray-400">({item.weight})</span></span>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="font-medium">₹{((isDistributor ? item.distributorPrice : item.mrp) * item.quantity).toFixed(0)}</span>
                           {/* REVIEW BUTTON - ONLY IF DELIVERED */}
                           {order.status === 'Delivered' && (
                               <button 
                                 onClick={() => setReviewProduct(item)}
                                 className="text-tea-gold hover:text-yellow-600 p-1"
                                 title="Rate & Review"
                               >
                                  <Star size={16} />
                               </button>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 -mx-5 -mb-5 p-4 rounded-b-lg flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
                    <div className="text-sm text-gray-500">
                       Method: <span className="font-bold text-gray-700">{order.paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="text-xl font-bold text-tea-dark">Total: ₹{order.totalAmount}</span>
                       <button 
                        onClick={() => setViewInvoice(order)}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 shadow-sm"
                       >
                         <Printer size={14} /> Invoice
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right: Info Panel (Desktop only usually, but stacked on mobile) */}
        {isDistributor && (
            <div className="lg:w-80 space-y-6">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded text-center">
                            <div className="text-2xl font-bold text-tea-green">{myOrders.length}</div>
                            <div className="text-xs text-gray-500">Total Orders</div>
                        </div>
                         <div className="bg-gray-50 p-3 rounded text-center">
                            <div className="text-2xl font-bold text-tea-green">₹{myOrders.reduce((a,b) => a + b.totalAmount, 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Total Spend</div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-tea-gold/10 p-6 rounded-lg border border-tea-gold/30">
                  <h3 className="font-bold text-tea-dark mb-2">Need Stock Urgently?</h3>
                  <p className="text-sm text-gray-600 mb-4">Email us at support@amritassam.com for bulk dispatch.</p>
                </div>
            </div>
        )}
      </div>

      {/* Password Modal - ADDED for Non-Admin view as well */}
      {passwordModalUser && (
            <ChangePasswordModal 
                targetUser={passwordModalUser} 
                onClose={() => setPasswordModalUser(null)} 
                onSuccess={(msg) => {
                    alert(msg);
                    setPasswordModalUser(null);
                }} 
            />
      )}

      {/* Invoice Modal */}
      {viewInvoice && (
        <InvoiceTemplate order={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {/* Review Modal - ADDED */}
      {reviewProduct && (
        <ReviewModal product={reviewProduct} onClose={() => setReviewProduct(null)} />
      )}

      {/* Supplier Bill Viewer Modal */}
      {viewingBillUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 bg-tea-dark text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FileCheck className="text-tea-gold" size={20} />
                  Supplier Bill - {viewingBillUrl.poNumber}
                </h3>
                <p className="text-xs text-gray-300">Supplier: {viewingBillUrl.supplierName}</p>
              </div>
              <button 
                onClick={() => setViewingBillUrl(null)} 
                className="text-gray-300 hover:text-white transition"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
              {viewingBillUrl.url.startsWith('data:image/') || viewingBillUrl.url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                <img 
                  src={viewingBillUrl.url} 
                  alt={`Supplier Bill ${viewingBillUrl.poNumber}`} 
                  className="max-w-full max-h-[70vh] object-contain rounded border shadow-sm"
                />
              ) : (
                <iframe 
                  src={viewingBillUrl.url} 
                  title={`Supplier Bill ${viewingBillUrl.poNumber}`}
                  className="w-full h-[65vh] rounded border"
                />
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <a 
                href={viewingBillUrl.url} 
                download={`Supplier_Bill_${viewingBillUrl.poNumber}`}
                target="_blank"
                rel="noreferrer"
                className="bg-tea-dark hover:bg-black text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
              >
                <Download size={14} /> Download Bill Document
              </a>
              <button 
                onClick={() => setViewingBillUrl(null)} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};