import { Product, ProductVariant, Order, IntegrationSettings } from '../types';

export class NimbusApiClient {
  /**
   * Fetch all products from the storefront API.
   * If token is provided, fetches with admin permissions (includes costPrice records securely).
   */
  public static async fetchProducts(token?: string): Promise<Product[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch('/api/products', { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetch variants for a product or the entire catalog.
   */
  public static async fetchVariants(productId?: string): Promise<ProductVariant[]> {
    const url = productId ? `/api/variants?productId=${encodeURIComponent(productId)}` : '/api/variants';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch variants: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Fetch live stock for a given SKU (handles dual-system or cache fallback).
   */
  public static async fetchStock(sku: string): Promise<{ sku: string; stock: number; isFallback: boolean; warning?: string }> {
    const res = await fetch(`/api/variants/stock?sku=${encodeURIComponent(sku)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch SKU stock spec: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Submit storefront checkout order.
   */
  public static async submitOrder(orderPayload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    items: Array<{
      sku: string;
      productName: string;
      size: string;
      color: string;
      quantity: number;
      price: number;
    }>;
    recaptchaToken: string;
  }): Promise<{ success: boolean; order: Order; isFallback: boolean; warning?: string }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Checkout failed: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Perform professional Nimbus POS remote connectivity test.
   */
  public static async testConnection(
    url: string,
    key: string,
    secret: string,
    token: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url, key, secret })
    });
    if (!res.ok) {
      throw new Error(`Test connection returned terminal status: ${res.status}`);
    }
    return res.json();
  }

  /**
   * Securely update integrated POS setups.
   */
  public static async saveSettings(settings: Partial<IntegrationSettings>, token: string): Promise<{ success: boolean; settings: IntegrationSettings }> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      throw new Error(`Settings save failed: ${res.status}`);
    }
    return res.json();
  }

  /**
   * Admin Password Modification security Settings.
   */
  public static async changePassword(oldPassword: string, newPassword: string, token: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Password update failed.');
    }
    return res.json();
  }
}
