import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { RefreshCw, Download, HelpCircle, CheckCircle, Ban, Clock, ShoppingBag, XCircle, AlertCircle } from 'lucide-react';

interface OrdersProps {
  token: string;
}

export default function AdminOrders({ token }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display font-medium text-zinc-900">Checkout Orders Registry</h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">TRANSACT DATA & SYNCHRONIZATION STATS</p>
        </div>

        <button
          onClick={fetchOrders}
          className="text-xs font-semibold px-3 py-1.5 border border-zinc-200 bg-white hover:bg-zinc-50 rounded shadow-sm text-zinc-700 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center text-xs text-zinc-500 font-sans shadow-xs">
          <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <span>No store checkouts processed through storefront yet. Execute checkouts in the Storefront section.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-lg border border-neutral-200 shadow-xs overflow-hidden" id={`admin-order-${o.id}`}>
              {/* Card top */}
              <div className="bg-zinc-50 border-b border-neutral-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold text-zinc-900">ORDER: #{o.id}</span>
                  <span className="text-zinc-400">•</span>
                  <span className="text-zinc-500">{new Date(o.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {o.syncedWithNimbus ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 font-sans">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> NIMBUS POS SYNCED
                    </span>
                  ) : (
                    <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 font-sans cursor-help" title={o.nimbusSyncError}>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> NIMBUS FAIL (OFFLINE FALLBACK CACHED)
                    </span>
                  )}
                </div>
              </div>

              {/* Card Main Body */}
              <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs font-sans">
                {/* Left: customer info */}
                <div className="lg:col-span-4 space-y-3 border-b lg:border-b-0 lg:border-r border-neutral-200 pb-4 lg:pb-0 lg:pr-6">
                  <h4 className="font-semibold text-zinc-900 uppercase tracking-wide">Customer Details</h4>
                  
                  <div className="space-y-1 text-zinc-650">
                    <div>
                      <span className="text-zinc-400">Name:</span> <strong className="text-zinc-800">{o.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400">Email:</span> <span className="font-mono">{o.customerEmail}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Phone:</span> <span className="font-mono">{o.customerPhone}</span>
                    </div>
                    <div className="pt-1.5">
                      <span className="text-zinc-400 block mb-0.5">Shipping Address:</span>
                      <p className="bg-zinc-50 p-2 rounded border border-zinc-100 italic leading-relaxed text-zinc-600 font-mono text-[11px]">{o.shippingAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Items bought */}
                <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="font-semibold text-zinc-900 uppercase tracking-wide mb-3">Purchased Items</h4>
                    
                    <div className="divide-y divide-neutral-100">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="font-bold text-zinc-900">{it.productName}</span>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              SKU: <strong className="text-zinc-700">{it.sku}</strong> • Style: {it.color} • Size: #{it.size}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold text-zinc-700">{it.quantity}x • ₨ {it.price.toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">Total: ₨ {(it.price * it.quantity).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sync Failure Error Message Pane */}
                  {!o.syncedWithNimbus && o.nimbusSyncError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-900 rounded font-mono text-[10px] leading-relaxed flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase text-[9px] text-rose-800">CENTRAL POS ERROR REASON:</span>
                        <p className="text-zinc-700 mt-0.5">{o.nimbusSyncError}</p>
                        <span className="text-rose-600 font-semibold block mt-1">✓ Order is captured safe in E-Commerce fallbacks. Full stock local decs preserved.</span>
                      </div>
                    </div>
                  )}

                  {/* Pricing Total block */}
                  <div className="border-t border-neutral-150 pt-3 flex justify-between items-center shrink-0">
                    <div className="flex gap-2">
                      {!o.syncedWithNimbus && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/admin/orders/${o.id}/sync`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              const data = await res.json();
                              if (res.ok) {
                                fetchOrders();
                              } else {
                                alert(data.error || 'Failed to sync with POS.');
                              }
                            } catch (err) {
                              console.error('Error syncing order:', err);
                            }
                          }}
                          className="bg-[#1e40af] hover:bg-blue-800 text-white font-semibold text-[10px] px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Process in Nimbus POS
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-zinc-500 text-[10px] font-mono tracking-wider uppercase block">Grand Checkout Total</span>
                      <strong className="text-base text-zinc-900 font-display font-bold">₨ {o.total.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
