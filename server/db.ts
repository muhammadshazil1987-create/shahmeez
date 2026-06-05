import fs from 'fs';
import path from 'path';
import { User, Product, ProductVariant, Order, IntegrationSettings, FallbackStockCache } from '../src/types';

interface Schema {
  users: User[];
  products: Product[];
  variants: ProductVariant[];
  orders: Order[];
  settings: IntegrationSettings;
  fallbackCache: Record<string, FallbackStockCache>;
  categories: string[];
}

interface NimbusSchema {
  inventory: Record<string, number>; // SKU -> stock levels
  categories?: string[];
}

const DB_FILE = path.join(process.cwd(), 'db.json');
const NIMBUS_DB_FILE = path.join(process.cwd(), 'nimbus_db.json');

// Default initial data
const defaultSchema = (): Schema => {
  const products: Product[] = [
    {
      id: 'p1',
      name: 'Premium Canvas Overcoat',
      description: 'Double-breasted canvas overcoat constructed from dry-waxed 12oz cotton duck. Tailored fit, corduroy collar, and metal hardware accents. A timeless cold-weather silhouette.',
      basePrice: 185.00,
      costPrice: 65.00,
      category: 'Outerwear',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'p2',
      name: 'Merino Wool Fisherman Sweater',
      description: 'Traditional heavy-gauge cable knit sweater woven from 100% fine Merino wool. Excellent heat retention and naturally water-repellent properties.',
      basePrice: 120.00,
      costPrice: 42.00,
      category: 'Knitwear',
      imageUrl: 'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'p3',
      name: 'Minimalist Raw Denim Jeans',
      description: '14oz Japanese selvedge denim, raw and unwashed. Slim straight cut with custom branded copper rivets. Will break in uniquely according to your wear pattern.',
      basePrice: 145.00,
      costPrice: 50.00,
      category: 'Denim',
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=600'
    }
  ];

  const variants: ProductVariant[] = [];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const colors = ['Charcoal', 'Oatmeal', 'Indigo'];

  // Helper to generate SKU
  const getPrefix = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase();
  };

  products.forEach((p, idx) => {
    const prefix = getPrefix(p.name);
    // Let's create variants
    colors.forEach(color => {
      sizes.forEach((size, sIdx) => {
        // Price adjustment based on size (e.g., XXL is slightly extra)
        const priceAdjustment = size === 'XXL' ? 10.00 : size === 'XL' ? 5.00 : 0.00;
        const sku = `${prefix}-${color.slice(0, 3).toUpperCase()}-${size}`;
        
        // Some initial stock to seed
        const stock = Math.floor(Math.random() * 15) + (sIdx === 3 ? 0 : 3); // some out of stocks (XL default to 0 on randomized conditions for visual test)

        variants.push({
          id: `v_${prefix}_${color.slice(0, 3).toUpperCase()}_${size}`,
          productId: p.id,
          sku,
          size,
          color,
          stock,
          priceAdjustment
        });
      });
    });
  });

  return {
    users: [
      {
        id: 'u1',
        username: 'admin',
        role: 'admin'
      },
      {
        id: 'u2',
        username: 'customer',
        role: 'customer'
      }
    ],
    products,
    variants,
    orders: [
      {
        id: 'ord_1',
        customerName: 'Sarah Jenkins',
        customerEmail: 'sarah@example.com',
        customerPhone: '+1-555-0199',
        shippingAddress: '452 Linden Boulevard, Brooklyn NY 11203',
        items: [
          {
            sku: 'PCO-CHA-M',
            productName: 'Premium Canvas Overcoat',
            size: 'M',
            color: 'Charcoal',
            quantity: 1,
            price: 185.00
          }
        ],
        total: 185.00,
        status: 'success',
        createdAt: new Date().toISOString(),
        syncedWithNimbus: true
      }
    ],
    settings: {
      nimbusApiUrl: 'http://localhost:3000/api/nimbus-mock',
      nimbusApiKey: 'nimbus_key_prod_abc123',
      nimbusSecretKey: 'nimbus_sec_shh_456',
      realTimeSync: true,
      simulateFailure: false,
      adminPassword: 'admin123'
    },
    fallbackCache: {},
    categories: ['Outerwear', 'Denim', 'Knitwear', 'Accessories']
  };
};

// Seed Nimbus POS with matching records but slightly different stocks to simulate dual-system queries
const defaultNimbusSchema = (variants: ProductVariant[]): NimbusSchema => {
  const inventory: Record<string, number> = {};
  variants.forEach(v => {
    // Nimbus stock can be slightly different or aligned. Let's align it initially.
    inventory[v.sku] = v.stock;
  });
  return { inventory };
};

export class Database {
  private static load(): Schema {
    try {
      if (!fs.existsSync(DB_FILE)) {
        const initial = defaultSchema();
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Schema;
      if (!parsed.categories) {
        parsed.categories = ['Outerwear', 'Denim', 'Knitwear', 'Accessories'];
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return parsed;
    } catch (e) {
      console.error('Error loading DB, resetting to defaults', e);
      const initial = defaultSchema();
      return initial;
    }
  }

  private static save(data: Schema) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  private static loadNimbus(): NimbusSchema {
    try {
      if (!fs.existsSync(NIMBUS_DB_FILE)) {
        // Load main db first to align SKUs
        const mainDb = this.load();
        const initial = defaultNimbusSchema(mainDb.variants);
        fs.writeFileSync(NIMBUS_DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
        return initial;
      }
      const raw = fs.readFileSync(NIMBUS_DB_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading Nimbus DB, resetting', e);
      // fallback
      const initial = { inventory: {} };
      return initial;
    }
  }

  private static saveNimbus(data: NimbusSchema) {
    fs.writeFileSync(NIMBUS_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  // --- E-Commerce DB Operations ---
  public static getProducts(): Product[] {
    return this.load().products;
  }

  public static addProduct(product: Product, generatedVariants: ProductVariant[]) {
    const db = this.load();
    db.products.push(product);
    db.variants.push(...generatedVariants);
    this.save(db);

    // Also seed these in the Nimbus DB so they can sync up
    const nimbus = this.loadNimbus();
    generatedVariants.forEach(v => {
      nimbus.inventory[v.sku] = v.stock;
    });
    this.saveNimbus(nimbus);
  }

  public static getVariants(): ProductVariant[] {
    return this.load().variants;
  }

  public static updateVariantStock(sku: string, stock: number) {
    const db = this.load();
    const variant = db.variants.find(v => v.sku === sku);
    if (variant) {
      variant.stock = stock;
      this.save(db);
    }
  }

  public static getOrders(): Order[] {
    return this.load().orders;
  }

  public static addOrder(order: Order) {
    const db = this.load();
    db.orders.unshift(order); // highly visible new ones at top
    // Decrement local inventory
    order.items.forEach(item => {
      const v = db.variants.find(varItem => varItem.sku === item.sku);
      if (v) {
        v.stock = Math.max(0, v.stock - item.quantity);
      }
    });
    this.save(db);
  }

  public static updateOrder(updatedOrder: Order) {
    const db = this.load();
    const idx = db.orders.findIndex(o => o.id === updatedOrder.id);
    if (idx !== -1) {
      db.orders[idx] = updatedOrder;
      this.save(db);
    }
  }

  public static getSettings(): IntegrationSettings {
    const db = this.load();
    if (!db.settings) {
      db.settings = {
        nimbusApiUrl: 'http://localhost:3000/api/nimbus-mock',
        nimbusApiKey: 'nimbus_key_prod_abc123',
        nimbusSecretKey: 'nimbus_sec_shh_456',
        realTimeSync: true,
        simulateFailure: false,
        adminPassword: 'admin123'
      };
      this.save(db);
    } else if (!db.settings.adminPassword) {
      db.settings.adminPassword = 'admin123';
      this.save(db);
    }
    return db.settings;
  }

  public static updateSettings(settings: Partial<IntegrationSettings>) {
    const db = this.load();
    db.settings = { ...db.settings, ...settings };
    this.save(db);
    return db.settings;
  }

  public static getFallbackCache(): Record<string, FallbackStockCache> {
    return this.load().fallbackCache;
  }

  public static updateFallbackCache(sku: string, stock: number) {
    const db = this.load();
    db.fallbackCache[sku] = {
      sku,
      lastKnownStock: stock,
      updatedAt: new Date().toISOString()
    };
    this.save(db);
  }

  // --- Nimbus POS DB Operations (Simulated External System) ---
  public static getNimbusStock(sku: string): number {
    const nimbus = this.loadNimbus();
    return nimbus.inventory[sku] !== undefined ? nimbus.inventory[sku] : 0;
  }

  public static updateNimbusStock(sku: string, stock: number) {
    const nimbus = this.loadNimbus();
    nimbus.inventory[sku] = stock;
    this.saveNimbus(nimbus);
  }

  public static decrementNimbusStock(sku: string, quantity: number): { success: boolean, stock: number } {
    const nimbus = this.loadNimbus();
    const current = nimbus.inventory[sku] !== undefined ? nimbus.inventory[sku] : 0;
    const newStock = Math.max(0, current - quantity);
    nimbus.inventory[sku] = newStock;
    this.saveNimbus(nimbus);
    return { success: true, stock: newStock };
  }

  // --- Category Management Operations ---
  public static getCategories(): string[] {
    const db = this.load();
    if (!db.categories) {
      db.categories = ['Outerwear', 'Denim', 'Knitwear', 'Accessories'];
      this.save(db);
    }
    return db.categories;
  }

  public static updateCategories(categories: string[]) {
    const db = this.load();
    db.categories = categories;
    this.save(db);
  }

  public static addCategory(categoryName: string): string[] {
    const db = this.load();
    if (!db.categories) {
      db.categories = ['Outerwear', 'Denim', 'Knitwear', 'Accessories'];
    }
    const normalized = categoryName.trim();
    if (normalized && !db.categories.includes(normalized)) {
      db.categories.push(normalized);
      this.save(db);
    }
    return db.categories;
  }

  public static deleteCategory(categoryName: string): string[] {
    const db = this.load();
    if (!db.categories) {
      db.categories = ['Outerwear', 'Denim', 'Knitwear', 'Accessories'];
    }
    db.categories = db.categories.filter(c => c !== categoryName);
    this.save(db);
    return db.categories;
  }

  // --- Nimbus Mock Specific Category Operations ---
  public static getNimbusCategories(): string[] {
    const nimbus = this.loadNimbus();
    if (!nimbus.categories || nimbus.categories.length === 0) {
      nimbus.categories = ['Waistcoats', 'Kurtas & Shalwar Kameez', 'Sherwanis', 'Accessories', 'Unstitched Fabric'];
      this.saveNimbus(nimbus);
    }
    return nimbus.categories;
  }

  public static updateNimbusCategories(categories: string[]) {
    const nimbus = this.loadNimbus();
    nimbus.categories = categories;
    this.saveNimbus(nimbus);
  }
}
