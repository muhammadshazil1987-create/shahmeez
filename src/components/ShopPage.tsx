import React, { useState, useEffect } from 'react';
import { useReCaptcha } from './ReCaptchaBadge';
import { Product, ProductVariant, OrderItem } from '../types';
import { ShoppingCart, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle, RefreshCw, AlertTriangle, AlertCircle, X, Check, Phone } from 'lucide-react';

interface ShopPageProps {
  onGoToAdmin: () => void;
}

interface ToastMessage {
  id: string;
  type: 'warning' | 'success' | 'info';
  message: string;
}

export default function ShopPage({ onGoToAdmin }: ShopPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  // Selected parameters per product ID
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { size: string; color: string }>>({});
  // Dynamic queried stock states from POS: SKU -> { stock: number; isFallback: boolean; loading: boolean; warning?: string }
  const [skuStockStates, setSkuStockStates] = useState<Record<string, { stock: number; isFallback: boolean; loading: boolean; warning?: string }>>({});

  // Shopping Cart state
  const [cart, setCart] = useState<{ variant: ProductVariant; product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Order submission modal & processing
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('John Doe');
  const [customerEmail, setCustomerEmail] = useState('john@example.com');
  const [customerPhone, setCustomerPhone] = useState('+1-555-0144');
  const [shippingAddress, setShippingAddress] = useState('742 Custom Road, Portland OR 97201');
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderCompleteResult, setOrderCompleteResult] = useState<any | null>(null);

  // Dynamic alerts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const { recaptchaToken, refreshRecaptchaToken } = useReCaptcha();

  const addToast = (type: 'warning' | 'success' | 'info', message: string) => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const [resProd, resVar] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/variants')
      ]);

      if (resProd.ok && resVar.ok) {
        const prodData: Product[] = await resProd.json();
        const varData: ProductVariant[] = await resVar.json();
        
        setProducts(prodData);
        setVariants(varData);

        // Pre-select default options (first color and first size of each product)
        const initialSelections: Record<string, { size: string; color: string }> = {};
        for (const p of prodData) {
          const matchedVars = varData.filter(v => v.productId === p.id);
          if (matchedVars.length > 0) {
            // Find distinct values
            const distinctColors = Array.from(new Set(matchedVars.map(v => v.color)));
            const distinctSizes = Array.from(new Set(matchedVars.map(v => v.size)));
            
            initialSelections[p.id] = {
              color: distinctColors[0] || '',
              size: distinctSizes[0] || ''
            };
          }
        }
        setSelectedVariants(initialSelections);

        // Trigger stock polling for initial selections
        Object.entries(initialSelections).forEach(([pId, sel]) => {
          const matchingV = varData.find(v => v.productId === pId && v.color === sel.color && v.size === sel.size);
          if (matchingV) {
            fetchSkuStock(matchingV.sku);
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Queries live stock and manages warnings elegantly
  const fetchSkuStock = async (sku: string) => {
    setSkuStockStates(prev => ({
      ...prev,
      [sku]: { ...(prev[sku] || { stock: 0, isFallback: false }), loading: true }
    }));

    try {
      const res = await fetch(`/api/variants/stock?sku=${sku}`);
      if (res.ok) {
        const data = await res.json();
        setSkuStockStates(prev => ({
          ...prev,
          [sku]: { stock: data.stock, isFallback: data.isFallback, loading: false, warning: data.warning }
        }));

        if (data.isFallback) {
          addToast('warning', `Resilience triggered for SKU ${sku}: ${data.warning}`);
        }
      }
    } catch (e: any) {
      setSkuStockStates(prev => ({
        ...prev,
        [sku]: { stock: 0, isFallback: true, loading: false, warning: 'Failed to request POS status' }
      }));
    }
  };

  // Triggered on selection modifications
  const handleSelectOption = (productId: string, type: 'size' | 'color', value: string) => {
    const updated = {
      ...selectedVariants[productId],
      [type]: value
    };
    
    setSelectedVariants(prev => ({
      ...prev,
      [productId]: updated
    }));

    // Find the new SKU code and check stock
    const matchingV = variants.find(v => v.productId === productId && v.color === updated.color && v.size === updated.size);
    if (matchingV) {
      fetchSkuStock(matchingV.sku);
    }
  };

  const handleAddToCart = (product: Product) => {
    const selection = selectedVariants[product.id];
    if (!selection) return;

    const matchingV = variants.find(v => v.productId === product.id && v.color === selection.color && v.size === selection.size);
    if (!matchingV) return;

    // Check stock limitation first
    const stockState = skuStockStates[matchingV.sku];
    const currentQtyInCart = cart.find(c => c.variant.sku === matchingV.sku)?.quantity || 0;

    if (stockState && stockState.stock <= currentQtyInCart) {
      addToast('warning', `Insufficient stock for ${product.name} (${selection.color} / sSize ${selection.size}).`);
      return;
    }

    // Add to cart state
    setCart(prev => {
      const existsIdx = prev.findIndex(item => item.variant.id === matchingV.id);
      if (existsIdx > -1) {
        const updated = [...prev];
        updated[existsIdx].quantity += 1;
        return updated;
      }
      return [...prev, { variant: matchingV, product, quantity: 1 }];
    });

    addToast('success', `Added ${product.name} (${selection.size} / ${selection.color}) to checkout bag.`);
  };

  const updateCartQty = (sku: string, adj: number) => {
    const current = cart.find(c => c.variant.sku === sku);
    if (!current) return;

    const targetQty = current.quantity + adj;
    if (targetQty <= 0) {
      setCart(prev => prev.filter(c => c.variant.sku !== sku));
      return;
    }

    // Check POS stock cap
    const liveStock = skuStockStates[sku]?.stock || 0;
    if (adj > 0 && targetQty > liveStock) {
      addToast('warning', `Cannot exceed available physical central POS SKU stocks (${liveStock} units).`);
      return;
    }

    setCart(prev => prev.map(c => c.variant.sku === sku ? { ...c, quantity: targetQty } : c));
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + ((item.product.basePrice + item.variant.priceAdjustment) * item.quantity), 0);
  };

  const handleWhatsAppOrderSingle = (p: Product, v: ProductVariant) => {
    const storePhone = '923340973561'; // Shah Mez store owners phone number
    const itemTitle = p.name;
    const itemColor = v.color;
    const itemSize = v.size;
    const itemSku = v.sku;
    const itemPrice = (p.basePrice + v.priceAdjustment).toFixed(2);
    
    const text = `Assalam-o-Alaikum Shah Mez (شاہ میز)!\nI would like to order this item:\n\n*Product*: ${itemTitle}\n*Variant*: ${itemColor} / Size ${itemSize}\n*SKU*: ${itemSku}\n*Price*: Rs. ${itemPrice}\n\nCan you please confirm availability? Thank you!`;
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${storePhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingOut(true);

    const activeSecToken = recaptchaToken || refreshRecaptchaToken();

    const itemsPayload: OrderItem[] = cart.map(c => ({
      sku: c.variant.sku,
      productName: c.product.name,
      size: c.variant.size,
      color: c.variant.color,
      quantity: c.quantity,
      price: c.product.basePrice + c.variant.priceAdjustment
    }));

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          items: itemsPayload,
          recaptchaToken: activeSecToken
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOrderCompleteResult(data);
        setCart([]); // Reset Cart
        
        // Construct custom styled WhatsApp inquiry text to let users send order info directly
        const storePhone = '923340973561';
        const orderId = data.order?.id || 'N/A';
        const totalAmount = data.order?.total?.toFixed(2) || '0.00';
        
        let itemsDesc = '';
        itemsPayload.forEach((item, idx) => {
          itemsDesc += `${idx + 1}. *${item.productName}* [${item.color} / Size ${item.size}]\n   SKU: ${item.sku}\n   Quantity: ${item.quantity}x\n   Price: Rs. ${item.price.toFixed(2)}\n\n`;
        });
        
        const message = `Assalam-o-Alaikum Shah Mez (شاہ میز)!\nI would like to place an order with reference ID: *#${orderId}*\n\n*Customer Details*:\n- *Name*: ${customerName}\n- *Phone*: ${customerPhone}\n- *Address*: ${shippingAddress}\n\n*Items Ordered*:\n${itemsDesc}*Grand Total*: Rs. ${totalAmount}\n\nThank you! Please confirm my delivery details.`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${storePhone}?text=${encodedMessage}`;
        
        // Open WhatsApp in a safe manner
        window.open(whatsappUrl, '_blank');

        if (data.isFallback) {
          addToast('warning', `Resilience check triggered: POS was offline. Local cache decrements saved & inquiry sent to WhatsApp!`);
        } else {
          addToast('success', `Successfully processed checkouts, synched POS, and opened WhatsApp!`);
        }
      } else {
        addToast('warning', data.error || 'Validation mismatch.');
      }
    } catch (err: any) {
      addToast('warning', 'Network gateway failure.');
    } finally {
      setCheckingOut(false);
      refreshRecaptchaToken();
    }
  };

  const renderProductDetailPage = () => {
    const product = products.find(p => p.id === activeProductId);
    if (!product) return null;

    const selection = selectedVariants[product.id];
    const matchingVars = variants.filter(v => v.productId === product.id);
    const distinctColors = Array.from(new Set(matchingVars.map(v => v.color))) as string[];
    const distinctSizes = Array.from(new Set(matchingVars.map(v => v.size))) as string[];
    const currentV = matchingVars.find(v => v.color === selection?.color && v.size === selection?.size);
    const calculatedPrice = product.basePrice + (currentV ? currentV.priceAdjustment : 0);
    const liveStockState = currentV ? skuStockStates[currentV.sku] : null;
    const hasStock = liveStockState && liveStockState.stock > 0;

    // Filter catalog for related items excluding the active one
    const relatedProducts = products.filter(p => p.id !== product.id).slice(0, 4);

    return (
      <div className="space-y-12 animate-fade-in" id={`pdp-${product.id}`}>
        {/* Back navigation */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
          <button
            onClick={() => {
              setActiveProductId(null);
              // scroll to top
              const container = document.getElementById('shop-landing-page');
              if (container) container.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#484b96] hover:text-[#393b77] transition-all cursor-pointer font-sans"
            id="back-to-catalog-btn"
          >
            ← Back to Atelier Catalog
          </button>
          <span className="text-[10px] text-zinc-400 font-mono">WORKSPACE_SECURE_POS</span>
        </div>

        {/* Master PDP Columns layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Image Gallery showcase */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-square bg-white border border-neutral-200 rounded-xl overflow-hidden relative shadow-xs flex items-center justify-center p-2">
              <img
                src={product.imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600'}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-lg"
              />
              <span className="absolute bottom-3 left-3 bg-brand-secondary/85 text-[#484b96] text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-[#484b96]/25 shadow-xs">
                Authentic Tailored apparel
              </span>
            </div>

            {/* Gallery Miniatures simulation */}
            <div className="grid grid-cols-4 gap-3">
              <button className="aspect-square bg-zinc-50 border-2 border-[#484b96] rounded-lg overflow-hidden p-0.5 cursor-pointer">
                <img src={product.imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600'} className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
              </button>
              <button className="aspect-square bg-zinc-50 border border-neutral-200 rounded-lg overflow-hidden p-0.5 opacity-65 hover:opacity-100 transition-opacity cursor-pointer">
                <img src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=150" className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
              </button>
              <button className="aspect-square bg-zinc-50 border border-neutral-200 rounded-lg overflow-hidden p-0.5 opacity-65 hover:opacity-100 transition-opacity cursor-pointer">
                <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=150" className="w-full h-full object-cover rounded" referrerPolicy="no-referrer" />
              </button>
              <button className="aspect-square bg-zinc-100 border border-neutral-100 rounded-lg flex flex-col items-center justify-center text-zinc-400 p-1 select-none">
                <span className="text-[10px] font-bold font-mono">+16</span>
                <span className="text-[8px] uppercase tracking-wider font-semibold">SKU Specs</span>
              </button>
            </div>
          </div>

          {/* Right Column: Information, variant configs, action bags */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#484b96] uppercase tracking-wider font-mono">{product.category}</span>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950 font-display">{product.name}</h2>
              
              <div className="flex items-center gap-4 pt-1">
                <div className="text-2.5xl font-bold font-display text-[#484b96]">
                  ₨ {calculatedPrice.toFixed(2)}
                </div>
                {/* Live Stock Indicators */}
                {currentV && (
                  <div className="font-mono text-[10px] uppercase font-bold py-1 px-3 rounded-full bg-zinc-100 border border-neutral-200 shadow-3xs">
                    {liveStockState?.loading ? (
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#484b96]" /> POS POLLING
                      </span>
                    ) : liveStockState?.isFallback ? (
                      <span className="text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" /> {liveStockState?.stock} IN BACKUP
                      </span>
                    ) : hasStock ? (
                      <span className="text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 font-bold" /> {liveStockState?.stock} UNITS RESIDENT IN POS
                      </span>
                    ) : (
                      <span className="text-rose-800 font-bold flex items-center gap-1">
                        <X className="w-3 h-3 text-rose-500 font-bold" /> OUT OF STOCK
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Description Copy */}
            <p className="text-sm text-zinc-650 leading-relaxed font-sans">{product.description}</p>

            {/* Option pickers inside PDP */}
            {matchingVars.length > 0 && selection && (
              <div className="space-y-5 pt-5 pb-5 border-y border-neutral-150">
                {/* Colors Choice segment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Style Variant Choice</span>
                    <span className="text-xs font-mono text-zinc-450 capitalize">{selection.color} Style</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {distinctColors.map(c => (
                      <button
                        key={c}
                        onClick={() => handleSelectOption(product.id, 'color', c)}
                        className={`text-xs font-semibold px-4 py-2.5 rounded-lg transition-all border cursor-pointer ${
                          selection.color === c
                            ? 'bg-[#484b96] border-[#484b96] text-white shadow-sm'
                            : 'bg-zinc-50 hover:bg-zinc-100 border-neutral-250 text-zinc-700'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sizes Choice segment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Size Choice Specs</span>
                    <span className="text-xs font-mono text-zinc-450 uppercase">Size {selection.size} Variant</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {distinctSizes.map(sz => (
                      <button
                        key={sz}
                        onClick={() => handleSelectOption(product.id, 'size', sz)}
                        className={`text-xs font-mono font-bold px-4 py-2.5 rounded-lg transition-all border cursor-pointer ${
                          selection.size === sz
                            ? 'bg-[#484b96] border-[#484b96] text-white shadow-sm'
                            : 'bg-white hover:bg-zinc-50 border-neutral-250 text-zinc-700'
                        }`}
                      >
                        #{sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Price tag adjustments display details */}
            {currentV && (
              <div className="p-3 bg-zinc-50 border border-neutral-150 rounded-lg flex items-center justify-between text-xs font-mono shrink-0">
                <div>
                  <span className="text-zinc-400">POS SKU IDENTIFIER:</span>{' '}
                  <strong className="text-zinc-800 uppercase font-bold">{currentV.sku}</strong>
                </div>
                {currentV.priceAdjustment > 0 && (
                  <div className="text-[#484b96] font-semibold">
                    Size premium: +₨ {currentV.priceAdjustment.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* Checkout Action submit buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  if (currentV) {
                    handleWhatsAppOrderSingle(product, currentV);
                  }
                }}
                disabled={!hasStock || (liveStockState?.loading)}
                className={`w-full py-4 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all shadow select-none flex items-center justify-center gap-2 cursor-pointer ${
                  hasStock
                    ? 'bg-[#484b96] text-white hover:bg-[#393b76] border border-[#484b96]'
                    : 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                }`}
                id="add-to-bag-pdp"
              >
                <ShoppingCart className="w-4 h-4" />
                {hasStock ? 'WhatsApp Order' : 'Out of Stock on central matching POS'}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 font-mono text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-650" /> ISO_POS INTEGRATED VIA NIMBUS ENCRYPTED GATEWAY
              </div>
            </div>

            {/* Core tailors credentials / details */}
            <div className="pt-6 border-t border-neutral-150 grid grid-cols-2 gap-4 text-[11px] text-zinc-500 font-sans leading-relaxed">
              <div>
                <strong className="text-[10px] font-mono uppercase tracking-wider text-zinc-450 block mb-1">Tailor composition:</strong>
                Cotton Weave Duck fabric, hand finished detailing, rustproof zinc studs.
              </div>
              <div>
                <strong className="text-[10px] font-mono uppercase tracking-wider text-zinc-450 block mb-1">Maintenance guidelines:</strong>
                Drywax canvas finish. Spot clean only or cold-water wash sparingly to build authentic patterns.
              </div>
            </div>
          </div>
        </div>

        {/* Carousel: Related Products section */}
        <div className="pt-10 border-t border-neutral-200 space-y-6">
          <div className="flex items-baseline justify-between select-none">
            <h3 className="text-lg font-bold font-display tracking-tight text-zinc-950">شاہ میز Related Specialties</h3>
            <span className="text-[10px] font-mono text-zinc-455 uppercase">Complementary Selections</span>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 snap-x select-none no-scrollbar">
            {relatedProducts.map(p => {
              const relSelection = selectedVariants[p.id];
              const relMatchingVars = variants.filter(v => v.productId === p.id);
              const relCurrentV = relMatchingVars.find(v => v.color === relSelection?.color && v.size === relSelection?.size);
              const relPrice = p.basePrice + (relCurrentV ? relCurrentV.priceAdjustment : 0);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setActiveProductId(p.id);
                    // scroll to top of pdp page
                    const container = document.getElementById('shop-landing-page');
                    if (container) container.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-72 shrink-0 snap-start bg-white rounded-xl border border-neutral-200 overflow-hidden hover:border-[#484b96] p-3.5 space-y-3 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between"
                  id={`related-item-${p.id}`}
                >
                  <div className="aspect-square bg-zinc-100 rounded-lg overflow-hidden">
                    <img src={p.imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=400'} alt={p.name} className="w-full h-full object-cover hover:scale-[1.03] transition-all" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-[#484b96] font-bold uppercase tracking-wider mt-1 block">{p.category}</span>
                    <h4 className="text-xs font-bold text-zinc-800 line-clamp-1 font-display mt-0.5">{p.name}</h4>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
                      <span className="text-xs font-bold text-zinc-900">₨ {relPrice.toFixed(2)}</span>
                      <span className="text-[9px] text-[#484b96] uppercase tracking-wider font-bold">Configure →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans" id="shop-landing-page">
      {/* Header bar */}
      <header className="bg-white border-b border-neutral-200 py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#484b96]" />
            <h1 className="text-2xl font-bold tracking-wide text-[#484b96] select-none font-sans">شاہ میز</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md px-3.5 py-2 flex items-center gap-1 text-xs font-semibold transition-all shadow-sm select-none relative cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Checkout Bag</span>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-[10px] text-white font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Real-time sync fallbacks alerts */}
      {Object.values(skuStockStates).some((s: any) => s.isFallback) && (
        <div className="bg-amber-600 text-white py-2 px-6 flex items-center justify-center gap-2.5 font-mono text-[11px] font-medium border-b border-amber-700">
          <AlertTriangle className="w-4 h-4 animate-pulse" />
          <span>RESILIENT STATE ACTIVE: CENTRAL POS SYSTEM IS OFFLINE. BROWSING BACKUP CACHED STOCK MATRIX.</span>
        </div>
      )}

      {/* Toast alert system wrapper */}
      <div className="fixed top-18 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-lg border shadow-lg text-xs flex items-start gap-2.5 font-sans animate-slide-in ${
              t.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-zinc-900 border-zinc-850 text-zinc-200'
            }`}
          >
            {t.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-[11px] leading-relaxed">
              {t.message}
            </div>
            <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Hero storefront display section */}
      <section className="bg-[#f9f9f9] py-16 px-8 md:px-16 shrink-0 rounded-2xl max-w-7xl mx-auto mt-6 border border-neutral-200/60 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12" id="hero-storefront-wrapper">
        {/* Left text layout of Shah Mez brand */}
        <div className="flex-1 space-y-6 text-left max-w-xl">
          <span className="inline-block text-[10px] uppercase font-mono font-bold tracking-widest text-[#484b96] bg-[#484b96]/10 px-3.5 py-1.5 rounded border border-[#484b96]/20">
            Exclusive Eastern Bespoke Couture • شاہ میز
          </span>
          <h2 className="text-4xl lg:text-5xl font-extrabold font-display tracking-tight leading-tight text-[#484b96]">
            شاہ میز - Crafting Tradition & Elegance
          </h2>
          <p className="text-xs lg:text-sm text-[#484b96] opacity-90 leading-relaxed font-sans font-normal">
            Shah Meez (شاہ میز) takes luxury Eastern couture to its absolute pinnacle. We design bespoke sherwanis, premium waistcoats, traditional kurtas, and ready-to-wear pret collections. Crafted from hand-selected authentic fabrics, impeccable tailoring, and rich heritage detailing.
          </p>
          
          {/* Two action Buttons crafted carefully in brand blue color (#484b96) */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button 
              onClick={() => {
                const el = document.getElementById('product-catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#484b96] hover:bg-[#393b76] text-white text-xs font-semibold uppercase tracking-wider py-3.5 px-6 rounded-lg shadow-sm transition-all duration-200 cursor-pointer"
            >
              View Collection
            </button>
            <button 
              onClick={() => {
                const storePhone = '923340973561';
                const url = `https://wa.me/${storePhone}?text=${encodeURIComponent('Hello Shah Mez! I am interested in viewing your latest bespoke wardrobe collections.')}`;
                window.open(url, '_blank');
              }}
              className="border border-[#484b96] text-[#484b96] hover:bg-[#484b96]/5 text-xs font-semibold uppercase tracking-wider py-3.5 px-6 rounded-lg transition-all duration-200 cursor-pointer"
            >
              Contact Us
            </button>
          </div>

          <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono text-[#484b96]/80">
            <span className="bg-[#484b96]/5 px-2.5 py-1 rounded border border-[#484b96]/10">₨ System Currency: PKR</span>
            <span className="bg-[#484b96]/5 px-2.5 py-1 rounded border border-[#484b96]/10">⚡ Automated POS Stock Matching Active</span>
          </div>
        </div>

        {/* Right Apparel/Clothing Image layout inspired by premium boutique displays */}
        <div className="flex-1 w-full max-w-md h-80 md:h-112 rounded-xl overflow-hidden shadow-md relative group border border-neutral-200 bg-white">
          <img
            src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=1200"
            alt="Shah Mez Traditional Boutique Clothing Couture"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#484b96]/20 via-transparent to-transparent mix-blend-multiply"></div>
        </div>
      </section>

      {/* Product Catalog list */}
      <main className="flex-1 max-w-7xl mx-auto py-10 px-6 w-full">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <RefreshCw className="w-8 h-8 text-[#484b96] animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-xs text-zinc-400">
            No products found in catalog registry. Configure items inside the admin settings terminal.
          </div>
        ) : activeProductId ? (
          renderProductDetailPage()
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="product-catalog-section">
            {products.map((p) => {
              const selection = selectedVariants[p.id];
              const matchingVars = variants.filter(v => v.productId === p.id);
              
              // Distinct variants properties list
              const distinctColors: string[] = Array.from(new Set(matchingVars.map(v => v.color))) as string[];
              const distinctSizes: string[] = Array.from(new Set(matchingVars.map(v => v.size))) as string[];

              // Display price taking price adjustments into account
              const currentV = matchingVars.find(v => v.color === selection?.color && v.size === selection?.size);
              const calculatedPrice = p.basePrice + (currentV ? currentV.priceAdjustment : 0);

              const liveStockState = currentV ? skuStockStates[currentV.sku] : null;
              const hasStock = liveStockState && liveStockState.stock > 0;

              return (
                <div key={p.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs hover:border-neutral-350 transition-all flex flex-col justify-between" id={`shop-product-${p.id}`}>
                  {/* Image wrapper with details link clicker */}
                  <div
                    onClick={() => {
                      setActiveProductId(p.id);
                      const container = document.getElementById('shop-landing-page');
                      if (container) container.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="h-64 bg-zinc-50 overflow-hidden relative cursor-pointer group"
                  >
                    <img
                      src={p.imageUrl || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600'}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />

                    {/* Stock live badge overlay */}
                    {currentV && (
                      <div className="absolute top-3 right-3 font-mono text-[10px] uppercase font-bold py-1 px-2.5 rounded-full shadow-sm z-10 select-none bg-white border border-neutral-100">
                        {liveStockState?.loading ? (
                          <span className="text-zinc-500 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" /> POS POLLING
                          </span>
                        ) : liveStockState?.isFallback ? (
                          <span className="text-amber-800 flex items-center gap-1" title={liveStockState?.warning}>
                            <AlertTriangle className="w-3 h-3 text-amber-500" /> {liveStockState?.stock} IN BACKUP
                          </span>
                        ) : hasStock ? (
                          <span className="text-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-500" /> {liveStockState?.stock} IN STOCK
                          </span>
                        ) : (
                          <span className="text-rose-800 font-bold flex items-center gap-1">
                            <X className="w-3 h-3 text-rose-500" /> OUT OF STOCK
                          </span>
                        )}
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-white text-xs font-semibold">
                      <span>Explore specs & Related Atelier Items</span>
                      <span>Configure →</span>
                    </div>
                  </div>

                  {/* Body Content information */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{p.category}</span>
                        {currentV && (
                          <span className="text-[10px] font-mono text-zinc-400">SKU: {currentV.sku}</span>
                        )}
                      </div>
                      <h3
                        onClick={() => {
                          setActiveProductId(p.id);
                          const container = document.getElementById('shop-landing-page');
                          if (container) container.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-base font-bold font-display tracking-tight text-zinc-950 line-clamp-1 hover:text-[#484b96] transition-colors cursor-pointer"
                      >
                        {p.name}
                      </h3>
                      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{p.description}</p>
                    </div>

                    {/* Option Selections */}
                    {matchingVars.length > 0 && selection && (
                      <div className="space-y-3.5 pt-2 border-t border-neutral-100">
                        {/* Colors */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Style Option</span>
                          <div className="flex flex-wrap gap-1">
                            {distinctColors.map(c => (
                              <button
                                key={c}
                                onClick={() => handleSelectOption(p.id, 'color', c)}
                                className={`text-[11px] font-medium px-2.5 py-1 rounded transition-all cursor-pointer ${selection.color === c ? 'bg-[#484b96] border border-[#484b96] text-white' : 'bg-neutral-100 border border-neutral-200 text-zinc-700 hover:bg-neutral-200'}`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sizes */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Size Choice</span>
                          <div className="flex flex-wrap gap-1">
                            {distinctSizes.map(sz => (
                              <button
                                key={sz}
                                onClick={() => handleSelectOption(p.id, 'size', sz)}
                                className={`text-[11px] font-mono font-bold px-2 py-1 rounded transition-all cursor-pointer ${selection.size === sz ? 'bg-[#484b96] border border-[#484b96] text-white' : 'bg-white border border-neutral-200 text-zinc-700 hover:bg-neutral-50'}`}
                              >
                                #{sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cashier price action */}
                    <div className="pt-4 border-t border-neutral-150 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Customer Price</span>
                        <strong className="text-lg font-bold font-display text-zinc-950 hover:text-[#484b96] cursor-pointer" onClick={() => setActiveProductId(p.id)}>₨ {calculatedPrice.toFixed(2)}</strong>
                      </div>

                      <button
                        onClick={() => handleAddToCart(p)}
                        disabled={!hasStock || (liveStockState?.loading)}
                        className={`text-xs font-semibold px-4 py-2.5 rounded-lg border cursor-pointer select-none transition-all shadow-sm flex items-center gap-1.5 ${hasStock ? 'bg-[#484b96] text-white hover:bg-[#393b76] border-[#484b96]' : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'}`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {hasStock ? 'Add to Bag' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Shopping Cart Sidebar Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex justify-end" id="shopping-bag-drawer">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between font-sans relative animate-slide-left">
            {/* Drawer Top */}
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold font-display text-zinc-950 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Your Checkout Bag
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List items inside Bag */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-xs text-zinc-400 space-y-2">
                  <ShoppingBag className="w-8 h-8 text-zinc-300" />
                  <span>Your checkout bag is currently empty. Explore products to construct an order.</span>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.variant.id} className="p-3 bg-zinc-50 rounded-lg border border-neutral-200 flex gap-4 text-xs">
                    <img
                      src={item.product.imageUrl || '/placeholder.png'}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded-md border border-neutral-200 shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between space-y-1">
                      <div>
                        <h4 className="font-semibold text-zinc-950">{item.product.name}</h4>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          SKU: {item.variant.sku} • Size: {item.variant.size} • Style: {item.variant.color}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Adjust qty buttons */}
                        <div className="flex items-center border border-neutral-350 rounded overflow-hidden bg-white shrink-0">
                          <button onClick={() => updateCartQty(item.variant.sku, -1)} className="px-2.5 py-0.5 text-zinc-650 font-bold hover:bg-zinc-100 cursor-pointer">-</button>
                          <span className="px-2 font-mono text-[11px] text-zinc-800 font-bold">{item.quantity}</span>
                          <button onClick={() => updateCartQty(item.variant.sku, 1)} className="px-2.5 py-0.5 text-zinc-650 font-bold hover:bg-zinc-100 cursor-pointer">+</button>
                        </div>
                        {/* Price */}
                        <strong className="text-zinc-900 font-mono">₨ {((item.product.basePrice + item.variant.priceAdjustment) * item.quantity).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total and Checkout submission trigger */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-neutral-200 bg-zinc-50 shrink-0 space-y-4">
                <div className="flex items-center justify-between text-xs tracking-wide uppercase text-zinc-455">
                  <span>Bag Total Amount</span>
                  <strong className="text-lg font-bold text-zinc-900 font-display">₨ {calculateCartTotal().toFixed(2)}</strong>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full bg-[#484b96] text-white hover:bg-[#393b76] py-3 rounded-lg text-xs font-semibold shadow-sm transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* checkout details model overlay */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="checkout-modal">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xl w-full max-w-lg p-8 space-y-5 relative overflow-hidden">
            <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1 rounded-full hover:bg-zinc-50">
              <X className="w-5 h-5" />
            </button>

            {!orderCompleteResult ? (
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 font-sans text-xs">
                <h3 className="text-base font-bold font-display text-zinc-950 mb-1">Shipping & Checkout Information</h3>
                <p className="text-xs text-zinc-500 pb-2 border-b border-neutral-100">
                  Submit customer billing detail parameters. reCAPTCHA protects checkout endpoints natively.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1 font-mono">Full Contact Name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full font-sans text-xs border border-neutral-300 rounded px-3 py-2 bg-zinc-50 outline-none focus:border-zinc-950"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1 font-mono">Customer Email</label>
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full font-sans text-xs border border-neutral-300 rounded px-3 py-2 bg-zinc-50 outline-none focus:border-zinc-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1 font-mono">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full font-sans text-xs border border-neutral-300 rounded px-3 py-2 bg-zinc-50 outline-none focus:border-zinc-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1 font-mono">Shipping Address Destination</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full font-sans text-xs border border-neutral-300 rounded px-3 py-2 bg-zinc-50 outline-none focus:border-zinc-950"
                    />
                  </div>
                </div>

                {/* Google recaptcha simulated checkbox validation */}
                <div className="bg-zinc-50 p-3 rounded.md border border-neutral-200 text-[10px] text-zinc-500 leading-normal flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span>This transactional frame is evaluated and token-stamped under Google <strong className="text-zinc-700">reCAPTCHA v3</strong> to prevent automated cart spoofing.</span>
                    <span className="block font-mono text-[9px] text-[#166534] mt-1 select-all truncate">crypto_hex: {recaptchaToken}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checkingOut}
                  className="w-full bg-[#484b96] text-white hover:bg-[#393b76] font-semibold py-3 rounded-md transition-colors shadow-sm cursor-pointer disabled:opacity-50 text-xs text-center flex items-center justify-center gap-1.5 pt-2"
                >
                  {checkingOut ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {checkingOut ? 'Transacting POS Synchronization...' : 'Submit Checkout & Order on WhatsApp'}
                </button>
              </form>
            ) : (
              /* Success results */
              <div className="space-y-5 text-center py-4 font-sans text-xs">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle className="w-8 h-8" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold font-display text-zinc-950">E-Commerce Checkout Captured!</h3>
                  <p className="text-xs text-zinc-500">Order reference hash: <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono font-bold text-zinc-700">#{orderCompleteResult.order.id}</code></p>
                </div>

                {/* Detail synchronization reports */}
                <div className={`p-4 rounded-lg border text-left font-sans text-xs space-y-2 mt-4 ${orderCompleteResult.isFallback ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                  <h4 className="font-bold flex items-center gap-1.5">
                    {orderCompleteResult.isFallback ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                    POS Synchronization Diagnostics: {orderCompleteResult.isFallback ? 'OFFLINE FALLBACK' : 'SYNCHRONIZED'}
                  </h4>

                  {orderCompleteResult.isFallback ? (
                    <div className="space-y-1">
                      <p className="text-[11px] leading-relaxed text-amber-700">
                        The live central Nimbus POS machine is currently unreachable. E-Commerce resilience fallback cached the orders to local database schemas and recorded matching stock decrements. Catalog lists will reload with backup caches properly!
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-emerald-800">
                      Central matching registers synched successfully. Outbound stock decrement executed on Nimbus server endpoints.
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setOrderCompleteResult(null);
                    // Reload stock counts dynamically for updated selections
                    fetchCatalog();
                  }}
                  className="w-full bg-[#484b96] text-white font-semibold py-2.5 rounded-md text-xs cursor-pointer select-none border border-[#484b96] hover:bg-[#393b76] transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Social Connection Footer Panel */}
      <footer className="bg-white border-t border-neutral-250 py-10 px-6 shrink-0 mt-20" id="storefront-footer">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#484b96]" />
              <span className="text-[#484b96] text-xl font-bold font-sans tracking-wide">شاہ میز</span>
            </div>
            <p className="text-[11px] text-zinc-650 mt-2 font-sans leading-relaxed">
              Real-time symmetrical e-commerce synchronizer and stock compliance system. reCAPTCHA v3 certified secure pipeline.
            </p>
            <button 
              onClick={onGoToAdmin}
              className="text-[10px] text-zinc-500 hover:text-[#484b96] hover:underline font-mono transition-colors cursor-pointer inline-block mt-3"
            >
              Access Admin Terminal
            </button>
          </div>

          {/* Dynamic Social Connector Links */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#484b96] font-bold">شاہ میز Social Contacts</span>
            <div className="flex items-center gap-4">
              <a
                href="https://wa.me/923340973561"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#484b96] text-white p-2.5 rounded-full hover:scale-105 transition-transform flex items-center justify-center shadow"
                title="Speak with our team via WhatsApp"
                id="social-whatsapp-link"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/shah_mez"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#484b96] text-white p-2.5 rounded-full hover:scale-105 transition-transform flex items-center justify-center shadow"
                title="Visit our page on Facebook"
                id="social-facebook-link"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com/shah_mez"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#484b96] text-white p-2.5 rounded-full hover:scale-105 transition-transform flex items-center justify-center shadow"
                title="Follow us on Instagram"
                id="social-instagram-link"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Operating hours */}
          <div className="text-center md:text-right text-[11px] text-zinc-550 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#484b96] font-bold block">शाह میز Operating Hours</span>
            <div>Monday - Friday: 09:00 - 18:00</div>
            <div>Saturday: 10:00 - 15:00</div>
            <div className="text-zinc-450 font-mono text-[9px] mt-2">v2.5 • شاه میز CONTIGUOUS SYNC SECURED</div>
          </div>
        </div>
      </footer>

      {/* Floating social media quick contact triggers */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 shrink-0 select-none hidden sm:flex">
        <a
          href="https://wa.me/923340973561"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#484b96] text-white rounded-full px-4 py-2.5 shadow-lg hover:scale-103 transition-all flex items-center justify-center text-xs gap-1.5 font-semibold font-sans border border-white/20 hover:shadow-xl"
          title="WhatsApp Chat Support"
        >
          <Phone className="w-4 h-4" /> شاہ میز on WhatsApp
        </a>
      </div>
    </div>
  );
}
