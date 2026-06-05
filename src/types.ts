/**
 * Core application types for the POS E-Commerce Integrator.
 */

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'customer';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  costPrice?: number;
  category: string;
  imageUrl?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL' | string;
  color: string;
  stock: number;
  priceAdjustment: number; // added to basePrice
}

export interface OrderItem {
  sku: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  syncedWithNimbus: boolean;
  nimbusSyncError?: string;
}

export interface IntegrationSettings {
  nimbusApiUrl: string;
  nimbusApiKey: string;
  nimbusSecretKey: string;
  realTimeSync: boolean;
  simulateFailure: boolean; // toggle to let user experience the fallback resilient logic!
  adminPassword?: string;
}

// Fallback Cache entry
export interface FallbackStockCache {
  sku: string;
  lastKnownStock: number;
  updatedAt: string;
}
