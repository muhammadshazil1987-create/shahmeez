import React, { useState, useEffect } from 'react';
import { ProductVariant, Product } from '../types';
import { RefreshCw, Database as DbIcon, ShieldAlert, Cpu, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface InventoryProps {
  token: string;
}

export default function AdminInventory({ token }: InventoryProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [posStocks, setPosStocks] = useState<Record<string, { stock: number; isFallback: boolean; warning?: string }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resProd, resVar] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/variants')
      ]);

      if (resProd.ok && resVar.ok) {
        const prodData = await resProd.json();
        const varData = await resVar.json();
        setProducts(prodData);
        setVariants(varData);

        // Fetch realtime Nimbus stock for all variants to prove synched dashboard state
        await pullLiveStocks(varData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pullLiveStocks = async (varList: ProductVariant[]) => {
    const stockMap: Record<string, any> = {};
    for (const v of varList) {
      try {
        const res = await fetch(`/api/variants/stock?sku=${v.sku}`);
        if (res.ok) {
          const detail = await res.json();
          stockMap[v.sku] = {
            stock: detail.stock,
            isFallback: detail.isFallback,
            warning: detail.warning
          };
        }
      } catch (e) {
        stockMap[v.sku] = {
          stock: v.stock,
          isFallback: true,
          warning: 'Fetch connection timeout.'
        };
      }
    }
    setPosStocks(stockMap);
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await pullLiveStocks(variants);
    setSyncingAll(false);
  };

  const getProductName = (prodId: string) => {
    const p = products.find(prod => prod.id === prodId);
    return p ? p.name : 'Unknown Product';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-display font-medium text-zinc-900">Inventory Status Matrix</h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">CENTRAL NIMBUS STOCK MATCHING GATEWAY</p>
        </div>

        <button
          onClick={handleSyncAll}
          disabled={syncingAll}
          className="bg-zinc-950 hover:bg-zinc-850 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-all flex items-center justify-center gap-1.5 self-start shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
          {syncingAll ? 'Synchronizing POS stocks...' : 'Sync All Live POS Stocks'}
        </button>
      </div>

      {/* Info Warning Bar if Offline / Fallback is active */}
      {Object.values(posStocks).some((s: any) => s.isFallback) && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider">RESILIENT CACHE FALLBACKS ENGAGED</h4>
            <p className="text-sm">
              Some central stock readings could not be resolved in real-time. Store is displaying cached inventories. Enable local sync options or restore connection in integration settings.
            </p>
          </div>
        </div>
      )}

      {/* Inventory Grid Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-neutral-200 text-[10px] font-bold text-zinc-650 uppercase tracking-wider font-mono">
                <th className="py-3 px-4">SKU / Model</th>
                <th className="py-3 px-4">Parent Product</th>
                <th className="py-3 px-4">Properties</th>
                <th className="py-3 px-4 text-center">Local Sync Replica</th>
                <th className="py-3 px-4 text-center">Nimbus Live POS</th>
                <th className="py-3 px-4 text-right">Synchronization Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-150 font-sans text-xs">
              {variants.map((v) => {
                const live = posStocks[v.sku];
                const isOutOfSync = live && live.stock !== v.stock;
                
                return (
                  <tr key={v.id} className="hover:bg-zinc-50/50 transition-colors" id={`inventory-row-${v.sku}`}>
                    {/* SKU */}
                    <td className="py-4 px-4 font-mono font-bold text-zinc-900">{v.sku}</td>
                    {/* Product */}
                    <td className="py-4 px-4 text-zinc-700 font-medium">{getProductName(v.productId)}</td>
                    {/* Size and Color */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-zinc-105 border border-zinc-200 text-zinc-800 text-[10px] px-1.5 py-0.5 rounded-sm font-mono font-medium">#{v.size}</span>
                        <span className="text-zinc-500 font-medium">{v.color}</span>
                      </div>
                    </td>
                    {/* Local Inventory */}
                    <td className="py-4 px-4 text-center font-mono font-semibold text-zinc-650">
                      {v.stock > 0 ? (
                        <span>{v.stock} units</span>
                      ) : (
                        <span className="text-rose-600 font-bold">SOLD OUT</span>
                      )}
                    </td>
                    {/* Live POS Inventory */}
                    <td className="py-4 px-4 text-center font-mono font-semibold">
                      {live ? (
                        live.isFallback ? (
                          <span className="text-amber-600 flex items-center justify-center gap-1 hover:underline cursor-help" title={live.warning}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {live.stock} (cached)
                          </span>
                        ) : (
                          <span className="text-emerald-700 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            {live.stock} units
                          </span>
                        )
                      ) : (
                        <span className="text-zinc-400 animate-pulse">Checking...</span>
                      )}
                    </td>
                    {/* Integration matching indicator */}
                    <td className="py-4 px-4 text-right">
                      {live ? (
                        live.isFallback ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-mono">
                            OFFLINE CACHE
                          </span>
                        ) : isOutOfSync ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-mono">
                            SYNC LAG
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                            MATCHED
                          </span>
                        )
                      ) : (
                        <span className="inline-block h-3 w-16 bg-zinc-200 rounded animate-pulse" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helpful spec */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-100 p-3 rounded-lg border border-neutral-200 font-sans">
        <Info className="w-4 h-4 text-zinc-400 shrink-0" />
        <span>To manually adjust stock counts on the mock central machine, checkout stock via Storefront. Local caches update immediately.</span>
      </div>
    </div>
  );
}
