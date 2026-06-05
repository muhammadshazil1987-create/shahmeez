import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types';
import { Plus, Check, RefreshCw, FolderPlus, Eye, ListFilter, Sliders } from 'lucide-react';

interface ProductsProps {
  token: string;
}

export default function AdminProducts({ token }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState('Apparel');
  const [imageUrl, setImageUrl] = useState('');
  
  // Variant parameters
  const [colors, setColors] = useState<string[]>(['Slate', 'Olive']);
  const [colorInput, setColorInput] = useState('');
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL']);

  // Preview variant list prior to generation
  const [variantsPreview, setVariantsPreview] = useState<{ sku: string; size: string; color: string; price: number }[]>([]);
  const [categories, setCategories] = useState<string[]>(['Outerwear', 'Denim', 'Knitwear', 'Apparel']);
  const [newCatInput, setNewCatInput] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !data.includes(category)) {
          setCategory(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    generatePreview();
  }, [name, basePrice, colors, sizes]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    if (!name) {
      setVariantsPreview([]);
      return;
    }
    const price = parseFloat(basePrice) || 0;
    const prefix = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 4);

    const list: any[] = [];
    colors.forEach(col => {
      sizes.forEach(sz => {
        const adjustment = sz === 'XXL' ? 10.00 : sz === 'XL' ? 5.00 : 0.00;
        list.push({
          sku: `${prefix}-${col.slice(0, 3).toUpperCase()}-${sz}`,
          size: sz,
          color: col,
          price: price + adjustment
        });
      });
    });
    setVariantsPreview(list);
  };

  const handleAddColor = () => {
    if (colorInput.trim() && !colors.includes(colorInput.trim())) {
      setColors([...colors, colorInput.trim()]);
      setColorInput('');
    }
  };

  const handleRemoveColor = (col: string) => {
    setColors(colors.filter(c => c !== col));
  };

  const toggleSize = (sz: string) => {
    if (sizes.includes(sz)) {
      if (sizes.length > 1) {
        setSizes(sizes.filter(s => s !== sz));
      }
    } else {
      setSizes([...sizes, sz]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          basePrice,
          costPrice,
          category,
          imageUrl,
          colors,
          sizes
        })
      });

      if (res.ok) {
        setSuccessMsg(`Successfully generated product and ${variantsPreview.length} variants! Seeded onto central POS.`);
        setName('');
        setDescription('');
        setBasePrice('');
        setCostPrice('');
        setImageUrl('');
        fetchProducts();
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="border-b border-neutral-200 pb-4">
        <h2 className="text-xl font-display font-medium text-zinc-900">Product Manager & SKU Generator</h2>
        <p className="text-xs text-zinc-500 font-mono mt-0.5">AUTO GENERATOR & STOCK INITIATOR</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-neutral-200 shadow-xs p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-zinc-500" />
              Configure New Catalog Item
            </h3>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-medium">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vintage Suede Overshirt"
                  className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md px-3.5 py-2 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide retail copy regarding material, cut, sewing, etc."
                  className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md px-3.5 py-2 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                  Base Retail Price (₨)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="12000"
                  className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md px-3.5 py-2 outline-none font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-[#1e40af] font-semibold uppercase tracking-wider mb-1">
                  Cost Price (₨)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="4500"
                  className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-[#1e40af] rounded-md px-3.5 py-2 outline-none font-mono transition-all text-[#1e40af] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md px-3.5 py-2 outline-none transition-all"
                >
                  {categories.map((catOpt) => (
                    <option key={catOpt} value={catOpt}>
                      {catOpt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Category Management Panel */}
              <div className="md:col-span-3 bg-slate-50 border border-neutral-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Dynamic Category Manager</span>
                  <span className="text-[9px] text-[#1e40af] font-mono">Real-time DB Sync</span>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Traditional Wear"
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="flex-1 text-xs bg-white border border-neutral-300 rounded px-2.5 py-1.5 outline-none font-sans"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (newCatInput.trim()) {
                        try {
                          const res = await fetch('/api/categories', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ name: newCatInput.trim() })
                          });
                          if (res.ok) {
                            setNewCatInput('');
                            await fetchCategories();
                          }
                        } catch (err) {
                          console.error('Error adding category:', err);
                        }
                      }
                    }}
                    className="bg-[#1e40af] text-white hover:bg-blue-800 text-xs px-3.5 py-1.5 rounded font-semibold cursor-pointer"
                  >
                    Add Category
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map(catItem => (
                    <span
                      key={catItem}
                      className="inline-flex items-center gap-1.5 bg-white border border-zinc-205 text-zinc-700 text-[11px] font-medium px-2 py-0.5 rounded shadow-3xs"
                    >
                      {catItem}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/categories?name=${encodeURIComponent(catItem)}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            if (res.ok) {
                              await fetchCategories();
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="text-zinc-400 hover:text-rose-600 font-bold text-xs cursor-pointer px-1"
                        title="Delete category"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                  Product Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... (optional)"
                  className="w-full text-sm bg-zinc-50 border border-neutral-350 focus:border-neutral-900 rounded-md px-3 py-2 outline-none font-mono transition-all"
                />
              </div>
            </div>

            {/* Sizes & Colors Variant Setup Matrix */}
            <div className="pt-4 border-t border-neutral-100 space-y-4">
              <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" /> Auto-Variant SKUs Rule Matrix
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Colors list builder */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Select Product Colors
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      placeholder="e.g. Oatmeal"
                      className="text-xs w-full bg-zinc-50 border border-neutral-300 rounded px-2.5 py-1.5 outline-none focus:border-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddColor}
                      className="bg-zinc-150 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 px-3 py-1.5 rounded text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {colors.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 text-[11px] bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded font-medium border border-neutral-200">
                        {c}
                        <button type="button" onClick={() => handleRemoveColor(c)} className="text-zinc-600 hover:text-rose-600 font-bold ml-1">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Standard Sizes */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Generate Sizes (SKUs Adjust)
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
                      const isSel = sizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => toggleSize(sz)}
                          className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border cursor-pointer select-none transition-all ${isSel ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-zinc-400 block pt-1 leading-normal">
                    * XL (+$5.00), XXL (+$10.00) adjusted automatically.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!name || !basePrice}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs py-2.5 rounded-md transition-colors cursor-pointer shadow-sm disabled:opacity-50 mt-4 flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Generate Product & Variants
            </button>
          </form>
        </div>

        {/* Variants Preview Layout */}
        <div className="lg:col-span-5 bg-zinc-50 rounded-lg border border-neutral-200 p-6 flex flex-col h-[520px]">
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5 mb-2 shrink-0">
            <Eye className="w-4 h-4 text-zinc-500" />
            Variants Auto-Gen Preview ({variantsPreview.length})
          </h3>
          <p className="text-[11px] text-zinc-400 mb-4 shrink-0">
            Preview of dynamic matching database SKUs compiled in realtime:
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 border border-neutral-200 rounded-md bg-white p-3">
            {variantsPreview.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-xs text-center py-6">
                <span>Enter product details to simulate SKU matrix compiler.</span>
              </div>
            ) : (
              variantsPreview.map((v) => (
                <div key={v.sku} className="p-2 bg-neutral-50/55 rounded border border-neutral-100 flex items-center justify-between font-mono text-[11px]" id={`variant-preview-${v.sku}`}>
                  <div>
                    <span className="font-semibold text-zinc-800">{v.sku}</span>
                    <div className="text-[10px] text-zinc-400">
                      Size: {v.size} • Color: {v.color}
                    </div>
                  </div>
                  <span className="font-semibold text-emerald-700">₨ {v.price.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Catalog Registry list */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
          <ListFilter className="w-4 h-4" /> Active Catalog Registry
        </h3>

        {loading ? (
          <div className="py-20 flex justify-center"><RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="text-xs text-zinc-400 py-10 text-center">No products found in database.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="p-3 border border-neutral-200 rounded-md flex gap-4 bg-zinc-50/50" id={`catalog-item-${p.id}`}>
                <img
                  src={p.imageUrl || '/placeholder.png'}
                  alt={p.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded-md border border-neutral-200 shrink-0"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-zinc-800 font-display line-clamp-1">{p.name}</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-semibold text-emerald-700 font-mono">Retail: ₨ {p.basePrice.toFixed(2)}</div>
                      {p.costPrice !== undefined ? (
                        <div className="text-[10px] font-semibold text-[#1e40af] font-mono">Cost: ₨ {Number(p.costPrice).toFixed(2)}</div>
                      ) : (
                        <div className="text-[10px] font-semibold text-neutral-400 font-mono">Cost: N/A</div>
                      )}
                    </div>
                    <span className="text-[9px] bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded uppercase font-mono font-medium">{p.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
