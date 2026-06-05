import React, { useState } from 'react';
import AdminSettings from './AdminSettings';
import AdminProducts from './AdminProducts';
import AdminInventory from './AdminInventory';
import AdminOrders from './AdminOrders';
import AdminSecurity from './AdminSecurity';
import { LayoutDashboard, ShoppingCart, Settings, Sliders, Database, ClipboardList, HelpCircle, KeyRound } from 'lucide-react';

interface AdminDashboardProps {
  onBackToShop: () => void;
  token: string;
}

export default function AdminDashboard({ onBackToShop, token }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'inventory' | 'orders' | 'settings' | 'security'>('settings');

  // If NOT authorized, show modern login card
  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 selection:bg-zinc-950 selection:text-white" id="admin-login-screen">
          <div className="text-center text-zinc-900">
            <h1 className="text-2xl font-bold">Unauthorized Access</h1>
            <p className="text-sm">Please return to the main shop to log in.</p>
            <button
               type="button"
               onClick={onBackToShop}
               className="mt-4 text-sm text-zinc-400 hover:text-zinc-900 underline font-semibold transition-colors cursor-pointer"
             >
               ← Back to Shop Interface
             </button>
          </div>
      </div>
    );
  }

  // Admin active workspaces
  return (
    <div className="min-h-screen bg-zinc-50 flex" id="admin-workspace-layout">
      {/* Sidebar navigation panel */}
      <aside className="w-64 bg-zinc-950 shrink-0 flex flex-col justify-between text-zinc-300 font-sans shadow-lg select-none">
        <div className="p-6 space-y-6">
          {/* Headline branding */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold font-display text-white flex items-center gap-1.5 pt-1">
              <span className="text-[#3b82f6] text-2xl font-bold font-sans">شاہ میز</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Admin Terminal</p>
          </div>

          {/* Navigation Links hierarchy */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-xs font-semibold px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors text-left cursor-pointer ${activeTab === 'settings' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              POS Settings
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full text-xs font-semibold px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors text-left cursor-pointer ${activeTab === 'products' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              Product Manager
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full text-xs font-semibold px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors text-left cursor-pointer ${activeTab === 'inventory' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
            >
              <Database className="w-4 h-4 shrink-0" />
              Inventory Matrix
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full text-xs font-semibold px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors text-left cursor-pointer ${activeTab === 'orders' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              Checkout Orders
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-xs font-semibold px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors text-left cursor-pointer ${activeTab === 'security' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
            >
              <KeyRound className="w-4 h-4 shrink-0 text-[#3b82f6]" />
              Security Settings
            </button>
          </nav>
        </div>

        {/* Sidebar Footer context controls */}
        <div className="p-6 border-t border-zinc-900 space-y-3">
          <button
            onClick={onBackToShop}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold py-2 rounded-md transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Stop / Return to Shop
          </button>
          <button
            onClick={onBackToShop}
            className="w-full border border-neutral-800 text-zinc-400 hover:text-white hover:border-neutral-500 text-xs font-semibold py-2 rounded-md transition-colors text-center cursor-pointer"
          >
            Terminate JWT Session
          </button>
        </div>
      </aside>

      {/* Main administration scrollable workspace panel */}
      <main className="flex-1 overflow-y-auto p-10 max-w-7xl mx-auto w-full">
        {activeTab === 'settings' && <AdminSettings token={token} />}
        {activeTab === 'products' && <AdminProducts token={token} />}
        {activeTab === 'inventory' && <AdminInventory token={token} />}
        {activeTab === 'orders' && <AdminOrders token={token} />}
        {activeTab === 'security' && <AdminSecurity token={token} />}
      </main>
    </div>
  );
}
