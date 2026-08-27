import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Order, formatOrderId } from '../types';
import { Truck, Search, Package, CheckCircle2, Clock, MapPin, Phone, ExternalLink, Copy, Check, AlertCircle, ArrowRight, ShieldCheck, MessageSquare } from 'lucide-react';

const COURIER_LINKS: Record<string, (awb: string) => string> = {
  'Delhivery': (awb: string) => `https://www.delhivery.com/track/package/${awb}`,
  'Blue Dart': (awb: string) => `https://www.bluedart.com/tracking?trackFor=0&trackNo=${awb}`,
  'DTDC': (awb: string) => `https://www.dtdc.in/tracking/shipment-tracking.asp?trkType=AWB&strCnno=${awb}`,
  'India Post': (awb: string) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignment=${awb}`,
  'Shiprocket': (awb: string) => `https://shiprocket.co/tracking/${awb}`,
  'Ekart Logistics': (awb: string) => `https://ekartlogistics.com/shipmenttrack/${awb}`,
  'Trackon': (awb: string) => `https://trackon.in/Tracking/MultipleTracking?awb=${awb}`,
  'Xpressbees': (awb: string) => `https://www.xpressbees.com/track?isawb=Yes&trackid=${awb}`,
  'Shadowfax': (awb: string) => `https://tracker.shadowfax.in/track?orderId=${awb}`,
  'Ecom Express': (awb: string) => `https://ecomexpress.in/tracking/?awb_field=${awb}`
};

export const TrackOrderPage = ({ onNavigate }: { onNavigate?: (page: string) => void }) => {
  const { orders, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [matchedOrders, setMatchedOrders] = useState<Order[]>([]);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    setSearched(true);
    const cleanDigits = query.replace(/\D/g, '');

    const results = orders.filter(o => {
      const displayId = (o.displayId || formatOrderId(o.id)).toLowerCase();
      const rawId = (o.id || '').toLowerCase();
      const invNum = (o.invoiceNumber || '').toLowerCase();
      const awb = (o.trackingNumber || '').toLowerCase();
      const mobile = (o.userMobile || '').replace(/\D/g, '');

      return (
        displayId.includes(query) ||
        rawId.includes(query) ||
        invNum.includes(query) ||
        awb.includes(query) ||
        (cleanDigits.length >= 4 && mobile.includes(cleanDigits))
      );
    });

    setMatchedOrders(results);
  };

  const handleCopy = (awb: string) => {
    navigator.clipboard.writeText(awb);
    setCopiedAwb(awb);
    setTimeout(() => setCopiedAwb(null), 2000);
  };

  const getTrackingUrl = (order: Order): string => {
    if (order.trackingUrl) return order.trackingUrl;
    if (!order.trackingNumber) return '';
    const courier = order.courierName || 'Delhivery';
    const generator = COURIER_LINKS[courier];
    if (generator) return generator(order.trackingNumber);
    return `https://www.google.com/search?q=${encodeURIComponent(`${courier} tracking ${order.trackingNumber}`)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-tea-dark via-tea-green to-tea-dark text-white rounded-3xl p-6 sm:p-10 shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-tea-gold mb-3 border border-white/20">
            <Truck size={15} /> Real-Time Courier Dispatch & Tracking
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Track Your Order & Courier
          </h1>
          <p className="text-sm sm:text-base text-gray-200 leading-relaxed mb-6">
            Enter your <strong>Readable Order ID</strong> (e.g., <span className="font-mono text-tea-gold">ORD-FA252361</span>) or <strong>Registered 10-Digit Mobile Number</strong> to see real-time courier shipment status and AWB details.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Enter Order ID (e.g. ORD-FA252361) or Mobile..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 bg-white shadow-lg text-sm sm:text-base font-semibold focus:outline-none focus:ring-4 focus:ring-tea-gold/40 border-0"
              />
            </div>
            <button
              type="submit"
              className="bg-tea-gold hover:bg-yellow-400 text-tea-dark font-extrabold px-6 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm sm:text-base shrink-0"
            >
              <Search size={18} /> Track Package
            </button>
          </form>
        </div>

        {/* Ambient Deco */}
        <Truck className="absolute -right-8 -bottom-8 text-white/5 w-64 h-64 pointer-events-none" />
      </div>

      {/* Search Results */}
      {searched && (
        <div className="space-y-6 mb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="text-tea-green" /> Search Results ({matchedOrders.length})
            </h2>
            {matchedOrders.length > 0 && (
              <span className="text-xs text-gray-500 font-medium">Showing matched shipments</span>
            )}
          </div>

          {matchedOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
              <AlertCircle size={48} className="mx-auto text-amber-500 mb-3 opacity-80" />
              <h3 className="font-bold text-lg text-gray-800 mb-1">No Orders Found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                We couldn't find any orders matching "<strong>{searchQuery}</strong>". Please double check your Order ID or registered mobile number.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-tea-green hover:underline"
              >
                Clear Search and Try Again
              </button>
            </div>
          ) : (
            matchedOrders.map(order => {
              const displayId = order.displayId || formatOrderId(order.id);
              const isShipped = order.status === 'Shipped';
              const isDelivered = order.status === 'Delivered';
              const isProcessing = order.status === 'Processing';
              const isCancelled = order.status === 'Cancelled';

              const trackingUrl = getTrackingUrl(order);
              const courierName = order.courierName || 'Delhivery Express';

              // Step logic
              const step = isDelivered ? 4 : (isShipped || order.trackingNumber) ? 3 : isProcessing ? 2 : 1;

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden hover:shadow-lg transition">
                  {/* Card Header */}
                  <div className="p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID:</span>
                        <span className="font-mono font-black text-lg text-tea-dark bg-tea-green/10 px-2.5 py-0.5 rounded-lg border border-tea-green/20">
                          {displayId}
                        </span>
                        {order.invoiceNumber && (
                          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {order.invoiceNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 mt-1 block">Placed on: {order.date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        isShipped ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse' :
                        isCancelled ? 'bg-red-100 text-red-800 border border-red-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Visual Stepper */}
                    {!isCancelled && (
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-4">
                          Shipment Journey Timeline
                        </h4>
                        <div className="relative flex items-center justify-between">
                          {/* Connector */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 w-full z-0" />
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-tea-green transition-all duration-500 z-0"
                            style={{ width: step === 4 ? '100%' : step === 3 ? '66%' : step === 2 ? '33%' : '0%' }}
                          />

                          {[
                            { s: 1, label: 'Order Confirmed', sub: order.date },
                            { s: 2, label: 'Packed at Hub', sub: 'Assam Hub' },
                            { s: 3, label: 'Shipped (Courier)', sub: isShipped ? courierName : 'In Transit' },
                            { s: 4, label: 'Delivered', sub: isDelivered ? 'Delivered' : 'Expected' }
                          ].map(item => {
                            const isDone = step >= item.s;
                            const isCurrent = step === item.s;
                            return (
                              <div key={item.s} className="flex flex-col items-center relative z-10 text-center">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition ${
                                  isDone ? 'bg-tea-dark border-tea-dark text-white shadow' : 'bg-white border-gray-300 text-gray-400'
                                } ${isCurrent ? 'ring-4 ring-tea-green/30 scale-110' : ''}`}>
                                  {isDone ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                </div>
                                <span className={`text-xs font-bold mt-2 ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {item.label}
                                </span>
                                <span className="text-[10px] text-gray-500 max-w-[80px] truncate">{item.sub}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* COURIER & DISPATCH BOX - PROMINENT WHEN SHIPPED */}
                    {(isShipped || isDelivered || order.trackingNumber) ? (
                      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-2 border-blue-300 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/80 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-600 text-white p-3 rounded-xl shadow-md">
                              <Truck size={24} />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 block">
                                Assigned Courier / Delivery Partner
                              </span>
                              <h3 className="text-lg font-black text-blue-950">{courierName}</h3>
                              <p className="text-xs text-blue-700 font-medium">
                                {isDelivered ? 'Parcel successfully delivered.' : 'Package is in transit with logistics carrier.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-900 font-extrabold px-3 py-1 rounded-full border border-blue-200">
                              🚚 Live In Transit
                            </span>
                          </div>
                        </div>

                        {/* AWB Code Box */}
                        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              Consignment Tracking Number (AWB)
                            </span>
                            <span className="font-mono font-black text-xl text-gray-900 tracking-wide select-all">
                              {order.trackingNumber || 'Consignment in process'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {order.trackingNumber && (
                              <button
                                onClick={() => handleCopy(order.trackingNumber!)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-gray-300 shadow-sm"
                              >
                                {copiedAwb === order.trackingNumber ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                {copiedAwb === order.trackingNumber ? 'Copied!' : 'Copy AWB'}
                              </button>
                            )}

                            {trackingUrl && (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 shadow-md hover:scale-[1.02]"
                              >
                                <ExternalLink size={14} /> Track on {courierName} Portal
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : isProcessing ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                        <Package className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div className="text-xs text-amber-900">
                          <p className="font-bold mb-0.5">Order is being processed & packed at Assam Tea Hub</p>
                          <p className="text-amber-800">
                            Your fresh CTC tea pack is being packaged. Once handed over to the courier partner, your AWB tracking code and direct live courier link will appear right here and will also be sent to your mobile via SMS.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* Order Details & Destination */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700 pt-2 border-t">
                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                          Delivery Destination
                        </span>
                        <p className="font-bold text-gray-900">{order.userName}</p>
                        {order.userMobile && <p className="font-mono text-gray-600">📞 {order.userMobile}</p>}
                        <p className="text-gray-600 mt-1">{order.userAddress || 'Address on Invoice'}</p>
                      </div>

                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                          Items & Payment
                        </span>
                        <div className="space-y-0.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-gray-800">
                              <span>{item.quantity}x {item.name} ({item.weight})</span>
                              <span className="font-semibold">₹{(item.mrp * item.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-1.5 mt-1.5 flex justify-between font-black text-sm text-tea-dark">
                          <span>Total Amount:</span>
                          <span>₹{order.totalAmount} ({order.paymentMethod})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Info & FAQ Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="w-10 h-10 bg-tea-green/10 text-tea-dark rounded-xl flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">Fast Courier Dispatch</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            All orders are processed and dispatched within 24 hours via premium partners like Delhivery, Blue Dart, DTDC, and India Post.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <ShieldCheck size={20} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">SMS Tracking Updates</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Automated SMS notifications with your consignment AWB number and tracking link are sent directly to your registered mobile.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-bold">
            <MessageSquare size={20} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">Need Delivery Help?</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Have questions regarding your tea package? Contact our dedicated support team via WhatsApp or email for instant help.
          </p>
        </div>
      </div>
    </div>
  );
};
