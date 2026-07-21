import React, { useState } from 'react';
import { useStore } from '../services/store';
import { ReviewModal } from '../components/ReviewModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Package, DollarSign, Users, CheckCircle, XCircle, Printer, AlertTriangle, FileText, PlusCircle, Trash2, Settings, Save, TrendingUp, ClipboardList, CreditCard, Download, UploadCloud, Image as ImageIcon, RotateCcw, KeyRound, Star, MessageSquare, Edit } from 'lucide-react';
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
            <p className="text-gray-700 w-1/2">{order.userAddress || 'Address not provided'}</p>
            <p className="text-gray-700">Role: {order.type}</p>
            {order.userGst && <p className="text-gray-700">GST: {order.userGst}</p>}
          </div>

          {/* Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-black">
                <th className="text-left p-2">Item</th>
                <th className="text-center p-2">HSN</th>
                <th className="text-center p-2">Qty</th>
                <th className="text-right p-2">Price</th>
                <th className="text-right p-2">Total</th>
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
                    <td className="text-center p-2">0902</td>
                    <td className="text-center p-2">{item.quantity}</td>
                    <td className="text-right p-2">₹{price}</td>
                    <td className="text-right p-2">₹{price * item.quantity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-1/2">
              <div className="flex justify-between py-1 border-b">
                <span>Subtotal:</span>
                <span>₹{(order.totalAmount - order.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>CGST (2.5%):</span>
                <span>₹{(order.taxAmount / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>SGST (2.5%):</span>
                <span>₹{(order.taxAmount / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-black font-bold text-xl mt-2">
                <span>Grand Total:</span>
                <span>₹{order.totalAmount}</span>
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

const ChangePasswordModal = ({ targetUser, onClose, onUpdate }: { targetUser: {id: string, name: string}, onClose: () => void, onUpdate: (id: string, pass: string) => void }) => {
    const [pass, setPass] = useState('');
    return (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-sm animate-fade-in">
                <h3 className="font-bold text-lg mb-4 text-tea-dark">Change Password for {targetUser.name}</h3>
                <input 
                    type="text"
                    className="w-full border p-3 rounded mb-4 outline-none focus:ring-2 focus:ring-tea-green"
                    placeholder="Enter new password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={() => {
                        if(pass) {
                            onUpdate(targetUser.id, pass);
                        } else {
                            alert("Password cannot be empty");
                        }
                    }} className="bg-tea-dark text-white px-4 py-2 rounded font-bold hover:bg-black">Update</button>
                </div>
            </div>
        </div>
    )
}

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
    const tax = total * 0.05;

    const order: Order = {
      id: `ORD-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userAddress: user.address || 'Counter Sale',
      items: cart.map(c => ({...c.product, quantity: c.quantity})),
      totalAmount: Math.round(total + tax),
      taxAmount: Math.round(tax),
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
             <div className="text-right font-bold text-lg mt-2">Total: ₹{Math.round(calculateTotal() * 1.05)}</div>
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
  const [poNumber, setPoNumber] = useState(`PO-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  
  const [selProd, setSelProd] = useState('');
  const [qty, setQty] = useState(100);
  const [cost, setCost] = useState(0);

  const addItem = () => {
    const p = products.find(x => x.id === selProd);
    if(p) {
      setItems([...items, { productId: p.id, productName: p.name, quantity: qty, unitCost: cost, totalCost: qty * cost }]);
      setSelProd('');
    }
  };

  const handleSubmit = () => {
    if(!supplier || items.length === 0) return;
    const po: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierName: supplier,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      items,
      totalAmount: items.reduce((sum, i) => sum + i.totalCost, 0)
    };
    onSubmit(po);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-xl">New Purchase Order</h3>
          <button onClick={onClose}><XCircle /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
           <input className="border p-2 rounded" placeholder="Supplier Name" value={supplier} onChange={e => setSupplier(e.target.value)} />
           <input className="border p-2 rounded" placeholder="PO Number" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
        </div>
        
        <div className="bg-gray-50 p-4 rounded mb-4 flex gap-2 items-end">
           <div className="flex-1">
             <label className="text-xs font-bold">Product</label>
             <select className="w-full border p-2 rounded" value={selProd} onChange={e => {
               setSelProd(e.target.value);
               const p = products.find(x => x.id === e.target.value);
               if(p) setCost(p.costPrice);
             }}>
               <option value="">Select</option>
               {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
           </div>
           <div className="w-24">
             <label className="text-xs font-bold">Qty</label>
             <input type="number" className="w-full border p-2 rounded" value={qty} onChange={e => setQty(Number(e.target.value))} />
           </div>
           <div className="w-24">
             <label className="text-xs font-bold">Unit Cost</label>
             <input type="number" className="w-full border p-2 rounded" value={cost} onChange={e => setCost(Number(e.target.value))} />
           </div>
           <button onClick={addItem} className="bg-tea-dark text-white px-4 py-2 rounded mb-[1px]">Add</button>
        </div>

        <div className="max-h-40 overflow-y-auto mb-4">
          <table className="w-full text-sm">
             <thead><tr className="bg-gray-100"><th className="p-2 text-left">Product</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead>
             <tbody>
               {items.map((i, idx) => (
                 <tr key={idx} className="border-b">
                   <td className="p-2">{i.productName}</td>
                   <td className="text-center">{i.quantity}</td>
                   <td className="text-right">₹{i.unitCost}</td>
                   <td className="text-right">₹{i.totalCost}</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
        
        <div className="flex justify-between items-center border-t pt-4">
           <div className="font-bold text-xl">Total: ₹{items.reduce((sum, i) => sum + i.totalCost, 0)}</div>
           <button onClick={handleSubmit} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Generate PO</button>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { 
    user, orders, products, users, invoiceSettings, purchaseOrders, paymentSettings, brandAssets, reviews,
    updateInvoiceSettings, addUser, addOrder, addPurchaseOrder, receivePurchaseOrder,
    updatePaymentStatus, approveDistributor, updateOrderStatus, deleteOrder, deletePurchaseOrder,
    addProduct, deleteProduct, updateProduct, updateStock, updatePaymentSettings, updateBrandAssets,
    clearOnlineOrders, updateUserPassword, updateReview, deleteReview, addFakeReview
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Order | null>(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<{id: string, name: string} | null>(null);
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showAddReview, setShowAddReview] = useState(false);

  // Settings state
  const [settingsForm, setSettingsForm] = useState<InvoiceSettings>(invoiceSettings);
  const [paymentForm, setPaymentForm] = useState<PaymentSettings>(paymentSettings);
  const [brandForm, setBrandForm] = useState<BrandAssets>(brandAssets);

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

    // RAZORPAY / PAYMENT STATS
    const onlineOrders = orders.filter(o => o.paymentMethod !== 'COD' && o.paymentStatus === 'Paid');
    const totalOnlineRevenue = onlineOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalCOD = orders.filter(o => o.paymentMethod === 'COD').reduce((acc, curr) => acc + curr.totalAmount, 0);
    const paymentVolumeData = [
       { name: 'Razorpay (Online)', value: totalOnlineRevenue, color: '#0052cc' },
       { name: 'Cash on Delivery', value: totalCOD, color: '#eab308' }
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
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <CreditCard className="text-blue-600" /> Razorpay Payment Dashboard
                 </h3>
                 <div className="flex gap-2">
                     <button 
                        onClick={() => {
                            if(window.confirm('Are you sure you want to clear all online transaction history? This cannot be undone.')) {
                                clearOnlineOrders();
                            }
                        }}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-red-700"
                     >
                        <RotateCcw size={14} /> Reset Data
                     </button>
                     <button 
                        onClick={() => {
                            const data = onlineOrders.map(o => ({
                                Date: o.date,
                                PaymentID: o.transactionId || 'N/A',
                                OrderID: o.id,
                                Method: o.paymentMethod,
                                Amount: o.totalAmount,
                                Status: 'Captured'
                            }));
                            exportToCSV(data, 'payments_export.csv');
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-green-700"
                     >
                        <Download size={14} /> Export Excel
                     </button>
                     <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                        Live Mode (Mock)
                     </span>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div onClick={() => setActiveTab('ORDERS')} className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-600 cursor-pointer hover:shadow-lg transition">
                      <p className="text-gray-500 text-sm font-bold uppercase">Total Captured</p>
                      <h2 className="text-3xl font-bold text-blue-700 mt-2">₹{totalOnlineRevenue.toLocaleString()}</h2>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-t-4 border-yellow-500 cursor-pointer hover:shadow-lg transition">
                      <p className="text-gray-500 text-sm font-bold uppercase">Pending Settlement</p>
                      <h2 className="text-3xl font-bold text-gray-800 mt-2">₹{(totalOnlineRevenue * 0.98).toLocaleString()}</h2>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border-t-4 border-green-600 cursor-pointer hover:shadow-lg transition">
                      <p className="text-gray-500 text-sm font-bold uppercase">Success Rate</p>
                      <h2 className="text-3xl font-bold text-green-700 mt-2">98.5%</h2>
                  </div>
              </div>
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
             <div className="animate-fade-in">
                 <div className="flex justify-end mb-4 gap-2">
                    <button onClick={() => setShowManualOrder(true)} className="bg-tea-dark text-white px-4 py-2 rounded font-bold shadow flex items-center gap-2 hover:bg-black">
                         <PlusCircle size={20} /> Create New Order
                    </button>
                 </div>
                 <div className="bg-white shadow rounded-lg p-4">
                    {orders.map(order => (
                        <div key={order.id} className="border-b py-4 last:border-b-0 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold">{order.userName}</h4>
                                <span className="text-xs text-gray-500">{order.id} | {order.date}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold">₹{order.totalAmount}</span>
                                <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                                    <option value="Processing">Processing</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                                <button onClick={() => deleteOrder(order.id)} className="text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                 </div>
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
                     <CreditCard size={20} /> Payment Gateway Settings
                   </h4>
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
                </div>

                <div className="pt-4 flex justify-end">
                   <button 
                    onClick={() => {
                       updateInvoiceSettings(settingsForm);
                       updatePaymentSettings(paymentForm);
                       updateBrandAssets(brandForm);
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
                onUpdate={(id, pass) => {
                    updateUserPassword(id, pass);
                    alert(`Password for ${passwordModalUser.name} updated successfully`);
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
                onUpdate={(id, pass) => {
                    updateUserPassword(id, pass);
                    alert(`Password updated successfully`);
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
    </div>
  );
};