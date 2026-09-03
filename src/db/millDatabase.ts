/**
 * محرك قاعدة بيانات SQLite المحلية للطاحونة (Offline-First SQLite Database Engine)
 * يعمل بتقنية SQLite WASM الحقيقية مع حفظ تلقائي دائم وتوافق 100% مع بيئة الأندرويد وبدون إنترنت
 */

import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  Supplier,
  Product,
  GrainStock,
  FlourStock,
  PurchaseOrder,
  PurchaseOrderItem,
  MillingOrder,
  MillingOrderItem,
  WithdrawalOrder,
  WithdrawalOrderItem,
  AuditLog,
  StockSummaryRow,
} from '../types';

async function fetchVerifiedWasmBinary(): Promise<ArrayBuffer | null> {
  const candidates = [sqlWasmUrl, '/sql-wasm.wasm'];
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const cType = response.headers.get('content-type') || '';
      if (cType.includes('text/html')) continue;
      const buf = await response.arrayBuffer();
      const header = new Uint8Array(buf, 0, 4);
      // Valid WebAssembly binary MUST start with: 0x00, 0x61, 0x73, 0x6d ("\0asm")
      if (header.length >= 4 && header[0] === 0x00 && header[1] === 0x61 && header[2] === 0x73 && header[3] === 0x6d) {
        return buf;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

const STORAGE_KEY_BIN = 'mill_sqlite_db_bin_v2';
const STORAGE_KEY_SNAPSHOT = 'mill_sqlite_snapshot_v2';

interface DBSchema {
  suppliers: Supplier[];
  products: Product[];
  grain_stock: GrainStock[];
  flour_stock: FlourStock[];
  purchase_orders: PurchaseOrder[];
  purchase_order_items: PurchaseOrderItem[];
  milling_orders: MillingOrder[];
  milling_order_items: MillingOrderItem[];
  withdrawal_orders: WithdrawalOrder[];
  withdrawal_order_items: WithdrawalOrderItem[];
  audit_logs: AuditLog[];
}

const SEED_SUPPLIERS: Supplier[] = [
  { id: 1, name: 'أحمد محمد الحصيني', phone: '0551234567', address: 'مزارع الخرج - الرياض', created_at: '2026-09-01 08:00:00' },
  { id: 2, name: 'خليل إبراهيم الصالح', phone: '0509876543', address: 'منطقة القصيم - بريدة', created_at: '2026-09-01 08:30:00' },
  { id: 3, name: 'شركة البركة لتجارة الحبوب', phone: '0542345678', address: 'المنطقة الصناعية الثانية', created_at: '2026-09-01 09:00:00' },
  { id: 4, name: 'مؤسسة الروابي الزراعية', phone: '0567891234', address: 'منطقة حائل الزراعية', created_at: '2026-09-01 09:30:00' },
];

const SEED_PRODUCTS: Product[] = [
  { id: 1, name: 'قمح بلدي صلب', unit: 'كيس', category: 'حبوب', created_at: '2026-09-01 08:00:00' },
  { id: 2, name: 'قمح مستورد نخب أول', unit: 'كيس', category: 'حبوب', created_at: '2026-09-01 08:00:00' },
  { id: 3, name: 'شعير بلدي معقم', unit: 'كيس', category: 'حبوب', created_at: '2026-09-01 08:00:00' },
  { id: 4, name: 'ذرة صفراء مجففة', unit: 'كيس', category: 'حبوب', created_at: '2026-09-01 08:00:00' },
  { id: 5, name: 'دقيق أبيض نمرة 1 فاخر', unit: 'كيس', category: 'مطحون', created_at: '2026-09-01 08:00:00' },
  { id: 6, name: 'دقيق بر أسمر كامل النخالة', unit: 'كيس', category: 'مطحون', created_at: '2026-09-01 08:00:00' },
  { id: 7, name: 'نخالة خشنة (ردة)', unit: 'كيس', category: 'مطحون', created_at: '2026-09-01 08:00:00' },
  { id: 8, name: 'سميد ناعم ممتاز', unit: 'كيس', category: 'مطحون', created_at: '2026-09-01 08:00:00' },
];

const SEED_GRAIN_STOCK: GrainStock[] = [
  { id: 1, supplier_id: 1, product_id: 1, quantity: 120 },
  { id: 2, supplier_id: 1, product_id: 3, quantity: 45 },
  { id: 3, supplier_id: 2, product_id: 2, quantity: 85 },
  { id: 4, supplier_id: 2, product_id: 4, quantity: 30 },
  { id: 5, supplier_id: 3, product_id: 1, quantity: 240 },
  { id: 6, supplier_id: 3, product_id: 3, quantity: 90 },
  { id: 7, supplier_id: 4, product_id: 1, quantity: 160 },
];

const SEED_FLOUR_STOCK: FlourStock[] = [
  { id: 1, supplier_id: 1, product_id: 5, quantity: 50 },
  { id: 2, supplier_id: 1, product_id: 7, quantity: 25 },
  { id: 3, supplier_id: 2, product_id: 6, quantity: 35 },
  { id: 4, supplier_id: 2, product_id: 8, quantity: 15 },
  { id: 5, supplier_id: 3, product_id: 5, quantity: 80 },
  { id: 6, supplier_id: 3, product_id: 7, quantity: 40 },
  { id: 7, supplier_id: 4, product_id: 5, quantity: 60 },
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    action: 'تهيئة نظام SQLite',
    details: 'تم تجهيز قاعدة بيانات SQLite المحلية الفورية وإنشاء الجداول وتعيين الأرصدة الافتتاحية بنجاح.',
    user_name: 'مدير النظام',
    created_at: '2026-09-01 08:00:00',
  },
];

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const SQL_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'كيس',
  category TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grain_stock (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flour_stock (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS milling_orders (
  id INTEGER PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS milling_order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  grain_product_id INTEGER NOT NULL,
  flour_product_id INTEGER NOT NULL,
  grain_quantity REAL NOT NULL,
  flour_quantity REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawal_orders (
  id INTEGER PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER NOT NULL,
  invoice_number TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawal_order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  available_at_time REAL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

class MillDatabase {
  private SQL: SqlJsStatic | null = null;
  private sqliteDb: Database | null = null;
  private memoryCache: DBSchema;
  private listeners: Set<() => void> = new Set();
  private isSqlReady = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // 1. Immediately hydrate from local snapshot or default seed
    this.memoryCache = this.loadInitialMemoryData();

    // 2. Asynchronously initialize SQLite engine with immediate readiness
    this.initSqlite();
  }

  private getDefaultData(): DBSchema {
    return {
      suppliers: [...SEED_SUPPLIERS],
      products: [...SEED_PRODUCTS],
      grain_stock: [...SEED_GRAIN_STOCK],
      flour_stock: [...SEED_FLOUR_STOCK],
      purchase_orders: [
        {
          id: 1,
          order_number: 'PO-20260901-001',
          supplier_id: 1,
          date: '2026-09-01',
          notes: 'شحنة قمح نخب أول معبأة بأكياس خيش',
          created_by: 'موظف الاستقبال',
          created_at: '2026-09-01 09:15:00',
        },
      ],
      purchase_order_items: [{ id: 1, order_id: 1, product_id: 1, quantity: 120 }],
      milling_orders: [
        {
          id: 1,
          order_number: 'MO-20260901-001',
          date: '2026-09-01',
          notes: 'طحن دفعة الصباح مع فصل الدقيق عن الردة',
          created_by: 'مدير التشغيل',
          created_at: '2026-09-01 11:30:00',
        },
      ],
      milling_order_items: [
        {
          id: 1,
          order_id: 1,
          supplier_id: 1,
          grain_product_id: 1,
          flour_product_id: 5,
          grain_quantity: 60,
          flour_quantity: 50,
        },
      ],
      withdrawal_orders: [
        {
          id: 1,
          order_number: 'WO-20260901-001',
          supplier_id: 1,
          invoice_number: 'INV-8841',
          receiver_name: 'سالم الدوسري (السائق)',
          date: '2026-09-01',
          notes: 'استلام دفعة الدقيق الفاخر الأولى',
          created_by: 'موظف الاستقبال',
          created_at: '2026-09-01 14:20:00',
        },
      ],
      withdrawal_order_items: [{ id: 1, order_id: 1, product_id: 5, quantity: 10, available_at_time: 50 }],
      audit_logs: [...SEED_AUDIT_LOGS],
    };
  }

  private loadInitialMemoryData(): DBSchema {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_KEY_SNAPSHOT);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.suppliers && parsed.products) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read snapshot from localStorage', e);
    }
    return this.getDefaultData();
  }

  private saveMemorySnapshot(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_SNAPSHOT, JSON.stringify(this.memoryCache));
      }
    } catch (e) {
      console.warn('Could not save snapshot to localStorage', e);
    }
  }

  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initSqlite();
    return this.initPromise;
  }

  private async initSqlite(): Promise<void> {
    if (this.isSqlReady && this.sqliteDb) return;

    try {
      const wasmBinary = await fetchVerifiedWasmBinary();
      if (!wasmBinary) {
        console.warn('SQLite wasm binary unavailable; operating on active local relational memory store.');
        this.isSqlReady = true;
        return;
      }

      const sqlPromise = initSqlJs({
        wasmBinary,
      });

      // Guard against hanging in sandboxed environments with an 800ms race
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 800));
      const loadedSQL = await Promise.race([sqlPromise, timeoutPromise]);

      if (!loadedSQL) {
        console.warn('SQLite wasm initialization timed out; operating on active local relational memory store.');
        this.isSqlReady = true;
        return;
      }

      this.SQL = loadedSQL;

      // Check if a saved binary SQLite exists in localStorage
      let loadedDb: Database | null = null;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const savedB64 = localStorage.getItem(STORAGE_KEY_BIN);
          if (savedB64) {
            const bytes = base64ToUint8Array(savedB64);
            loadedDb = new this.SQL.Database(bytes);
          }
        }
      } catch (err) {
        console.warn('Could not load saved SQLite binary, initializing new SQLite db', err);
      }

      if (!loadedDb) {
        loadedDb = new this.SQL.Database();
        // Initialize DDL
        loadedDb.run(SQL_SCHEMA_DDL);
        // Seed from memory cache
        this.seedSqliteFromMemory(loadedDb, this.memoryCache);
      } else {
        // Ensure schema is up to date
        loadedDb.run(SQL_SCHEMA_DDL);
      }

      this.sqliteDb = loadedDb;
      this.isSqlReady = true;

      // Sync memory cache from SQLite
      this.syncMemoryFromSqlite();
      this.persistSqlite();
      this.notify();
    } catch (err) {
      console.warn('SQLite init warning (fallback enabled):', err);
      this.isSqlReady = true;
    }
  }

  private seedSqliteFromMemory(db: Database, data: DBSchema) {
    db.run('BEGIN TRANSACTION;');
    try {
      for (const s of data.suppliers) {
        db.run('INSERT OR REPLACE INTO suppliers VALUES (?, ?, ?, ?, ?)', [s.id, s.name, s.phone || '', s.address || '', s.created_at]);
      }
      for (const p of data.products) {
        db.run('INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?)', [p.id, p.name, p.unit, p.category, p.created_at]);
      }
      for (const gs of data.grain_stock) {
        db.run('INSERT OR REPLACE INTO grain_stock VALUES (?, ?, ?, ?)', [gs.id, gs.supplier_id, gs.product_id, gs.quantity]);
      }
      for (const fs of data.flour_stock) {
        db.run('INSERT OR REPLACE INTO flour_stock VALUES (?, ?, ?, ?)', [fs.id, fs.supplier_id, fs.product_id, fs.quantity]);
      }
      for (const po of data.purchase_orders) {
        db.run('INSERT OR REPLACE INTO purchase_orders VALUES (?, ?, ?, ?, ?, ?, ?)', [
          po.id,
          po.order_number,
          po.supplier_id,
          po.date,
          po.notes || '',
          po.created_by,
          po.created_at,
        ]);
      }
      for (const poi of data.purchase_order_items) {
        db.run('INSERT OR REPLACE INTO purchase_order_items VALUES (?, ?, ?, ?)', [poi.id, poi.order_id, poi.product_id, poi.quantity]);
      }
      for (const mo of data.milling_orders) {
        db.run('INSERT OR REPLACE INTO milling_orders VALUES (?, ?, ?, ?, ?, ?)', [
          mo.id,
          mo.order_number,
          mo.date,
          mo.notes || '',
          mo.created_by,
          mo.created_at,
        ]);
      }
      for (const moi of data.milling_order_items) {
        db.run('INSERT OR REPLACE INTO milling_order_items VALUES (?, ?, ?, ?, ?, ?, ?)', [
          moi.id,
          moi.order_id,
          moi.supplier_id,
          moi.grain_product_id,
          moi.flour_product_id,
          moi.grain_quantity,
          moi.flour_quantity,
        ]);
      }
      for (const wo of data.withdrawal_orders) {
        db.run('INSERT OR REPLACE INTO withdrawal_orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
          wo.id,
          wo.order_number,
          wo.supplier_id,
          wo.invoice_number,
          wo.receiver_name,
          wo.date,
          wo.notes || '',
          wo.created_by,
          wo.created_at,
        ]);
      }
      for (const woi of data.withdrawal_order_items) {
        db.run('INSERT OR REPLACE INTO withdrawal_order_items VALUES (?, ?, ?, ?, ?)', [
          woi.id,
          woi.order_id,
          woi.product_id,
          woi.quantity,
          woi.available_at_time || 0,
        ]);
      }
      for (const al of data.audit_logs) {
        db.run('INSERT OR REPLACE INTO audit_logs VALUES (?, ?, ?, ?, ?)', [al.id, al.action, al.details, al.user_name, al.created_at]);
      }
      db.run('COMMIT;');
    } catch (err) {
      db.run('ROLLBACK;');
      console.error('Error seeding SQLite tables:', err);
    }
  }

  private syncMemoryFromSqlite() {
    if (!this.sqliteDb) return;
    try {
      this.memoryCache.suppliers = this.queryAllFromDb<Supplier>('SELECT * FROM suppliers ORDER BY name ASC');
      this.memoryCache.products = this.queryAllFromDb<Product>('SELECT * FROM products ORDER BY name ASC');
      this.memoryCache.grain_stock = this.queryAllFromDb<GrainStock>('SELECT * FROM grain_stock');
      this.memoryCache.flour_stock = this.queryAllFromDb<FlourStock>('SELECT * FROM flour_stock');
      this.memoryCache.purchase_orders = this.queryAllFromDb<PurchaseOrder>('SELECT * FROM purchase_orders ORDER BY id DESC');
      this.memoryCache.purchase_order_items = this.queryAllFromDb<PurchaseOrderItem>('SELECT * FROM purchase_order_items');
      this.memoryCache.milling_orders = this.queryAllFromDb<MillingOrder>('SELECT * FROM milling_orders ORDER BY id DESC');
      this.memoryCache.milling_order_items = this.queryAllFromDb<MillingOrderItem>('SELECT * FROM milling_order_items');
      this.memoryCache.withdrawal_orders = this.queryAllFromDb<WithdrawalOrder>('SELECT * FROM withdrawal_orders ORDER BY id DESC');
      this.memoryCache.withdrawal_order_items = this.queryAllFromDb<WithdrawalOrderItem>('SELECT * FROM withdrawal_order_items');
      this.memoryCache.audit_logs = this.queryAllFromDb<AuditLog>('SELECT * FROM audit_logs ORDER BY id DESC');
      this.saveMemorySnapshot();
    } catch (err) {
      console.error('Error syncing memory from SQLite:', err);
    }
  }

  private queryAllFromDb<T>(sql: string, params: any[] = []): T[] {
    if (!this.sqliteDb) return [];
    try {
      const stmt = this.sqliteDb.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return rows;
    } catch (err) {
      console.error('queryAllFromDb error:', sql, err);
      return [];
    }
  }

  private persistSqlite(): void {
    this.saveMemorySnapshot();
    if (!this.sqliteDb) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const bin = this.sqliteDb.export();
        const b64 = uint8ArrayToBase64(bin);
        localStorage.setItem(STORAGE_KEY_BIN, b64);
      }
    } catch (err) {
      console.warn('Could not persist SQLite to localStorage', err);
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Listener callback error', err);
      }
    });
  }

  // --- Suppliers DAO ---

  public async getSuppliers(): Promise<Supplier[]> {
    if (this.sqliteDb) {
      return this.queryAllFromDb<Supplier>('SELECT * FROM suppliers ORDER BY name COLLATE NOCASE ASC');
    }
    return [...this.memoryCache.suppliers].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  public async getSupplierById(id: number): Promise<Supplier | undefined> {
    if (this.sqliteDb) {
      const list = this.queryAllFromDb<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id]);
      return list[0];
    }
    return this.memoryCache.suppliers.find((s) => s.id === id);
  }

  public async saveSupplier(
    supplier: Omit<Supplier, 'id' | 'created_at'> & { id?: number },
    currentUser: string
  ): Promise<Supplier> {
    let finalSupplier: Supplier;

    if (supplier.id) {
      const existing = await this.getSupplierById(supplier.id);
      if (!existing) throw new Error('التاجر غير موجود');
      finalSupplier = {
        ...existing,
        name: supplier.name.trim(),
        phone: supplier.phone?.trim() || '',
        address: supplier.address?.trim() || '',
      };

      if (this.sqliteDb) {
        this.sqliteDb.run('UPDATE suppliers SET name = ?, phone = ?, address = ? WHERE id = ?', [
          finalSupplier.name,
          finalSupplier.phone,
          finalSupplier.address,
          finalSupplier.id,
        ]);
      }
      const idx = this.memoryCache.suppliers.findIndex((s) => s.id === finalSupplier.id);
      if (idx >= 0) this.memoryCache.suppliers[idx] = finalSupplier;

      await this.logAudit('تعديل تاجر', `تم تحديث بيانات التاجر: ${finalSupplier.name}`, currentUser);
    } else {
      const maxId = this.memoryCache.suppliers.reduce((max, s) => Math.max(max, s.id), 0);
      finalSupplier = {
        id: maxId + 1,
        name: supplier.name.trim(),
        phone: supplier.phone?.trim() || '',
        address: supplier.address?.trim() || '',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      if (this.sqliteDb) {
        this.sqliteDb.run('INSERT INTO suppliers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)', [
          finalSupplier.id,
          finalSupplier.name,
          finalSupplier.phone,
          finalSupplier.address,
          finalSupplier.created_at,
        ]);
      }
      this.memoryCache.suppliers.push(finalSupplier);

      await this.logAudit('إضافة تاجر', `تم تسجيل تاجر جديد: ${finalSupplier.name}`, currentUser);
    }

    this.persistSqlite();
    this.notify();
    return finalSupplier;
  }

  public async deleteSupplier(id: number, currentUser: string): Promise<void> {
    const supplier = await this.getSupplierById(id);
    if (!supplier) return;

    const grain = await this.getGrainStockBySupplier(id);
    const flour = await this.getFlourStockBySupplier(id);
    const hasGrain = grain.some((g) => g.quantity > 0);
    const hasFlour = flour.some((f) => f.quantity > 0);

    if (hasGrain || hasFlour) {
      throw new Error(`لا يمكن حذف التاجر (${supplier.name}) لوجود رصيد حبوب أو مطحون في حسابه.`);
    }

    if (this.sqliteDb) {
      this.sqliteDb.run('DELETE FROM suppliers WHERE id = ?', [id]);
    }
    this.memoryCache.suppliers = this.memoryCache.suppliers.filter((s) => s.id !== id);

    await this.logAudit('حذف تاجر', `تم حذف التاجر: ${supplier.name} (رقم ${id})`, currentUser);
    this.persistSqlite();
    this.notify();
  }

  // --- Products DAO ---

  public async getProducts(): Promise<Product[]> {
    if (this.sqliteDb) {
      return this.queryAllFromDb<Product>('SELECT * FROM products ORDER BY name COLLATE NOCASE ASC');
    }
    return [...this.memoryCache.products].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  public async getProductById(id: number): Promise<Product | undefined> {
    if (this.sqliteDb) {
      const list = this.queryAllFromDb<Product>('SELECT * FROM products WHERE id = ?', [id]);
      return list[0];
    }
    return this.memoryCache.products.find((p) => p.id === id);
  }

  public async saveProduct(
    product: Omit<Product, 'id' | 'created_at'> & { id?: number },
    currentUser: string
  ): Promise<Product> {
    let finalProduct: Product;

    if (product.id) {
      const existing = await this.getProductById(product.id);
      if (!existing) throw new Error('الصنف غير موجود');
      finalProduct = {
        ...existing,
        name: product.name.trim(),
        unit: product.unit?.trim() || 'كيس',
        category: product.category,
      };

      if (this.sqliteDb) {
        this.sqliteDb.run('UPDATE products SET name = ?, unit = ?, category = ? WHERE id = ?', [
          finalProduct.name,
          finalProduct.unit,
          finalProduct.category,
          finalProduct.id,
        ]);
      }
      const idx = this.memoryCache.products.findIndex((p) => p.id === finalProduct.id);
      if (idx >= 0) this.memoryCache.products[idx] = finalProduct;

      await this.logAudit('تعديل صنف', `تم تعديل بيانات الصنف: ${finalProduct.name}`, currentUser);
    } else {
      const maxId = this.memoryCache.products.reduce((max, p) => Math.max(max, p.id), 0);
      finalProduct = {
        id: maxId + 1,
        name: product.name.trim(),
        unit: product.unit?.trim() || 'كيس',
        category: product.category,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      if (this.sqliteDb) {
        this.sqliteDb.run('INSERT INTO products (id, name, unit, category, created_at) VALUES (?, ?, ?, ?, ?)', [
          finalProduct.id,
          finalProduct.name,
          finalProduct.unit,
          finalProduct.category,
          finalProduct.created_at,
        ]);
      }
      this.memoryCache.products.push(finalProduct);

      await this.logAudit('إضافة صنف', `تمت إضافة صنف جديد: ${finalProduct.name} (${finalProduct.category})`, currentUser);
    }

    this.persistSqlite();
    this.notify();
    return finalProduct;
  }

  // --- Stocks DAO ---

  public async getGrainStock(): Promise<GrainStock[]> {
    if (this.sqliteDb) {
      return this.queryAllFromDb<GrainStock>('SELECT * FROM grain_stock');
    }
    return [...this.memoryCache.grain_stock];
  }

  public async getFlourStock(): Promise<FlourStock[]> {
    if (this.sqliteDb) {
      return this.queryAllFromDb<FlourStock>('SELECT * FROM flour_stock');
    }
    return [...this.memoryCache.flour_stock];
  }

  public async getGrainStockBySupplier(supplierId: number): Promise<GrainStock[]> {
    const list = await this.getGrainStock();
    return list.filter((s) => s.supplier_id === supplierId);
  }

  public async getFlourStockBySupplier(supplierId: number): Promise<FlourStock[]> {
    const list = await this.getFlourStock();
    return list.filter((s) => s.supplier_id === supplierId);
  }

  public async getGrainQuantity(supplierId: number, productId: number): Promise<number> {
    const list = await this.getGrainStock();
    const item = list.find((s) => s.supplier_id === supplierId && s.product_id === productId);
    return item ? item.quantity : 0;
  }

  public async getFlourQuantity(supplierId: number, productId: number): Promise<number> {
    const list = await this.getFlourStock();
    const item = list.find((s) => s.supplier_id === supplierId && s.product_id === productId);
    return item ? item.quantity : 0;
  }

  private async adjustGrainStock(supplierId: number, productId: number, delta: number): Promise<number> {
    const list = await this.getGrainStock();
    const existing = list.find((s) => s.supplier_id === supplierId && s.product_id === productId);
    let finalQty = 0;

    if (existing) {
      finalQty = existing.quantity + delta;
      if (this.sqliteDb) {
        this.sqliteDb.run('UPDATE grain_stock SET quantity = ? WHERE id = ?', [finalQty, existing.id]);
      }
      const idx = this.memoryCache.grain_stock.findIndex((x) => x.id === existing.id);
      if (idx >= 0) this.memoryCache.grain_stock[idx].quantity = finalQty;
    } else {
      const maxId = this.memoryCache.grain_stock.reduce((m, x) => Math.max(m, x.id), 0);
      finalQty = delta;
      const newStock: GrainStock = {
        id: maxId + 1,
        supplier_id: supplierId,
        product_id: productId,
        quantity: finalQty,
      };
      if (this.sqliteDb) {
        this.sqliteDb.run('INSERT INTO grain_stock (id, supplier_id, product_id, quantity) VALUES (?, ?, ?, ?)', [
          newStock.id,
          newStock.supplier_id,
          newStock.product_id,
          newStock.quantity,
        ]);
      }
      this.memoryCache.grain_stock.push(newStock);
    }

    return finalQty;
  }

  private async adjustFlourStock(supplierId: number, productId: number, delta: number): Promise<number> {
    const list = await this.getFlourStock();
    const existing = list.find((s) => s.supplier_id === supplierId && s.product_id === productId);
    let finalQty = 0;

    if (existing) {
      finalQty = existing.quantity + delta;
      if (this.sqliteDb) {
        this.sqliteDb.run('UPDATE flour_stock SET quantity = ? WHERE id = ?', [finalQty, existing.id]);
      }
      const idx = this.memoryCache.flour_stock.findIndex((x) => x.id === existing.id);
      if (idx >= 0) this.memoryCache.flour_stock[idx].quantity = finalQty;
    } else {
      const maxId = this.memoryCache.flour_stock.reduce((m, x) => Math.max(m, x.id), 0);
      finalQty = delta;
      const newStock: FlourStock = {
        id: maxId + 1,
        supplier_id: supplierId,
        product_id: productId,
        quantity: finalQty,
      };
      if (this.sqliteDb) {
        this.sqliteDb.run('INSERT INTO flour_stock (id, supplier_id, product_id, quantity) VALUES (?, ?, ?, ?)', [
          newStock.id,
          newStock.supplier_id,
          newStock.product_id,
          newStock.quantity,
        ]);
      }
      this.memoryCache.flour_stock.push(newStock);
    }

    return finalQty;
  }

  // --- Document Number Generator ---

  private async generateOrderNumber(prefix: 'PO' | 'MO' | 'WO', dateStr: string): Promise<string> {
    const cleanDate = dateStr.replace(/-/g, '');
    let existingOrders: string[] = [];

    if (prefix === 'PO') {
      existingOrders = this.memoryCache.purchase_orders.map((o) => o.order_number);
    } else if (prefix === 'MO') {
      existingOrders = this.memoryCache.milling_orders.map((o) => o.order_number);
    } else {
      existingOrders = this.memoryCache.withdrawal_orders.map((o) => o.order_number);
    }

    const pattern = new RegExp(`^${prefix}-${cleanDate}-(\\d{3,})$`);
    let maxSeq = 0;

    for (const num of existingOrders) {
      const match = num.match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `${prefix}-${cleanDate}-${nextSeq}`;
  }

  // --- Purchase Orders (التوريد) ---

  public async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const orders = this.memoryCache.purchase_orders;
    const items = this.memoryCache.purchase_order_items;
    const suppliers = await this.getSuppliers();
    const products = await this.getProducts();

    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    return orders
      .map((order) => {
        const orderItems = items
          .filter((i) => i.order_id === order.id)
          .map((i) => ({
            ...i,
            product_name: productMap.get(i.product_id)?.name || `صنف #${i.product_id}`,
            unit: productMap.get(i.product_id)?.unit || 'كيس',
          }));

        const total_quantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

        return {
          ...order,
          supplier_name: supplierMap.get(order.supplier_id) || `تاجر #${order.supplier_id}`,
          items: orderItems,
          total_quantity,
        };
      })
      .sort((a, b) => b.id - a.id);
  }

  public async createPurchaseOrder(
    data: {
      supplier_id: number;
      date: string;
      notes?: string;
      items: { product_id: number; quantity: number }[];
    },
    currentUser: string
  ): Promise<PurchaseOrder> {
    if (!data.supplier_id) throw new Error('يجب اختيار التاجر أولاً');
    if (!data.items || data.items.length === 0) throw new Error('يجب إضافة صنف واحد على الأقل في أمر التوريد');

    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('الكمية الموردة يجب أن تكون أكبر من الصفر');
    }

    const maxOrderId = this.memoryCache.purchase_orders.reduce((m, o) => Math.max(m, o.id), 0);
    const orderId = maxOrderId + 1;
    const orderNumber = await this.generateOrderNumber('PO', data.date);
    const products = await this.getProducts();

    const newOrder: PurchaseOrder = {
      id: orderId,
      order_number: orderNumber,
      supplier_id: data.supplier_id,
      date: data.date,
      notes: data.notes?.trim() || '',
      created_by: currentUser,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (this.sqliteDb) {
      this.sqliteDb.run('INSERT INTO purchase_orders (id, order_number, supplier_id, date, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        newOrder.id,
        newOrder.order_number,
        newOrder.supplier_id,
        newOrder.date,
        newOrder.notes,
        newOrder.created_by,
        newOrder.created_at,
      ]);
    }
    this.memoryCache.purchase_orders.unshift(newOrder);

    let maxItemId = this.memoryCache.purchase_order_items.reduce((m, i) => Math.max(m, i.id), 0);
    const createdItems: PurchaseOrderItem[] = [];

    for (const item of data.items) {
      maxItemId++;
      const newItem: PurchaseOrderItem = {
        id: maxItemId,
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
      };

      if (this.sqliteDb) {
        this.sqliteDb.run('INSERT INTO purchase_order_items (id, order_id, product_id, quantity) VALUES (?, ?, ?, ?)', [
          newItem.id,
          newItem.order_id,
          newItem.product_id,
          newItem.quantity,
        ]);
      }
      this.memoryCache.purchase_order_items.push(newItem);
      const prod = products.find((p) => p.id === item.product_id);
      createdItems.push({
        ...newItem,
        product_name: prod?.name || `صنف #${item.product_id}`,
        unit: prod?.unit || 'كيس',
      });

      await this.adjustGrainStock(data.supplier_id, item.product_id, item.quantity);
    }

    const supplier = await this.getSupplierById(data.supplier_id);
    const totalBags = data.items.reduce((s, x) => s + x.quantity, 0);
    await this.logAudit(
      'توريد حبوب (SQLite)',
      `تم استلام وتوريد ${totalBags} كيس حبوب للتاجر: ${supplier?.name || ''} بموجب السند ${orderNumber}`,
      currentUser
    );

    this.persistSqlite();
    this.notify();
    return {
      ...newOrder,
      items: createdItems,
      supplier_name: supplier?.name,
      total_quantity: totalBags,
    };
  }

  public async updatePurchaseOrder(
    orderId: number,
    data: {
      supplier_id: number;
      date: string;
      notes?: string;
      items: { product_id: number; quantity: number }[];
    },
    currentUser: string
  ): Promise<PurchaseOrder> {
    const existingOrder = this.memoryCache.purchase_orders.find((o) => o.id === orderId);
    if (!existingOrder) throw new Error('أمر التوريد غير موجود');
    if (!data.supplier_id) throw new Error('يجب اختيار التاجر');
    if (!data.items || data.items.length === 0) throw new Error('يجب إضافة صنف واحد على الأقل');

    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('الكمية الموردة يجب أن تكون أكبر من الصفر');
    }

    // Rollback previous stock additions
    const oldItems = this.memoryCache.purchase_order_items.filter((i) => i.order_id === orderId);
    for (const oldItem of oldItems) {
      await this.adjustGrainStock(existingOrder.supplier_id, oldItem.product_id, -oldItem.quantity);
    }

    // Update order header in DB & memory
    existingOrder.supplier_id = data.supplier_id;
    existingOrder.date = data.date;
    existingOrder.notes = data.notes?.trim() || '';

    if (this.sqliteDb) {
      this.sqliteDb.run('UPDATE purchase_orders SET supplier_id = ?, date = ?, notes = ? WHERE id = ?', [
        existingOrder.supplier_id,
        existingOrder.date,
        existingOrder.notes,
        orderId,
      ]);
      this.sqliteDb.run('DELETE FROM purchase_order_items WHERE order_id = ?', [orderId]);
    }

    // Remove old items from memory
    this.memoryCache.purchase_order_items = this.memoryCache.purchase_order_items.filter(
      (i) => i.order_id !== orderId
    );

    // Re-insert new items
    const products = await this.getProducts();
    const productMap = new Map(products.map((p) => [p.id, p]));
    let maxItemId = this.memoryCache.purchase_order_items.reduce((m, i) => Math.max(m, i.id), 0);
    const newCreatedItems: PurchaseOrderItem[] = [];

    for (const item of data.items) {
      maxItemId++;
      const newItem: PurchaseOrderItem = {
        id: maxItemId,
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
      };

      if (this.sqliteDb) {
        this.sqliteDb.run('INSERT INTO purchase_order_items (id, order_id, product_id, quantity) VALUES (?, ?, ?, ?)', [
          newItem.id,
          newItem.order_id,
          newItem.product_id,
          newItem.quantity,
        ]);
      }
      this.memoryCache.purchase_order_items.push(newItem);
      const p = productMap.get(item.product_id);
      newCreatedItems.push({
        ...newItem,
        product_name: p?.name || `صنف #${item.product_id}`,
        unit: p?.unit || 'كيس',
      });

      // Apply new stock
      await this.adjustGrainStock(data.supplier_id, item.product_id, item.quantity);
    }

    const supplier = await this.getSupplierById(data.supplier_id);
    const totalBags = data.items.reduce((s, x) => s + x.quantity, 0);

    await this.logAudit(
      'تعديل أمر توريد',
      `تم تعديل سند التوريد ${existingOrder.order_number} للتاجر: ${supplier?.name || ''} بإجمالي ${totalBags} كيس مع تحديث حركات المخزون`,
      currentUser
    );

    this.persistSqlite();
    this.notify();

    return {
      ...existingOrder,
      items: newCreatedItems,
      supplier_name: supplier?.name,
      total_quantity: totalBags,
    };
  }

  public async deletePurchaseOrder(orderId: number, currentUser: string): Promise<void> {
    const order = this.memoryCache.purchase_orders.find((o) => o.id === orderId);
    if (!order) throw new Error('أمر التوريد غير موجود');

    const items = this.memoryCache.purchase_order_items.filter((i) => i.order_id === orderId);

    // Rollback stock changes made by this order
    for (const item of items) {
      await this.adjustGrainStock(order.supplier_id, item.product_id, -item.quantity);
    }

    if (this.sqliteDb) {
      this.sqliteDb.run('DELETE FROM purchase_order_items WHERE order_id = ?', [orderId]);
      this.sqliteDb.run('DELETE FROM purchase_orders WHERE id = ?', [orderId]);
    }

    this.memoryCache.purchase_order_items = this.memoryCache.purchase_order_items.filter(
      (i) => i.order_id !== orderId
    );
    this.memoryCache.purchase_orders = this.memoryCache.purchase_orders.filter((o) => o.id !== orderId);

    await this.logAudit(
      'حذف أمر توريد',
      `تم حذف سند التوريد ${order.order_number} وعكس جميع حركات المخزون ذات الصلة`,
      currentUser
    );

    this.persistSqlite();
    this.notify();
  }

  // --- Milling Orders (الطحن والتحويل) ---

  public async getMillingOrders(): Promise<MillingOrder[]> {
    const orders = this.memoryCache.milling_orders;
    const items = this.memoryCache.milling_order_items;
    const suppliers = await this.getSuppliers();
    const products = await this.getProducts();

    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return orders
      .map((order) => {
        const orderItems = items
          .filter((i) => i.order_id === order.id)
          .map((i) => ({
            ...i,
            supplier_name: supplierMap.get(i.supplier_id) || `تاجر #${i.supplier_id}`,
            grain_product_name: productMap.get(i.grain_product_id) || `حبوب #${i.grain_product_id}`,
            flour_product_name: productMap.get(i.flour_product_id) || `مطحون #${i.flour_product_id}`,
          }));

        const total_grain = orderItems.reduce((sum, item) => sum + item.grain_quantity, 0);
        const total_flour = orderItems.reduce((sum, item) => sum + item.flour_quantity, 0);

        return {
          ...order,
          items: orderItems,
          total_grain,
          total_flour,
        };
      })
      .sort((a, b) => b.id - a.id);
  }

  public async createMillingOrder(
    data: {
      date: string;
      notes?: string;
      items: {
        supplier_id: number;
        grain_product_id: number;
        flour_product_id: number;
        grain_quantity: number;
        flour_quantity: number;
      }[];
    },
    currentUser: string
  ): Promise<MillingOrder> {
    if (!data.items || data.items.length === 0) {
      throw new Error('يجب إضافة عملية طحن واحدة على الأقل في السند');
    }

    const suppliers = await this.getSuppliers();
    const products = await this.getProducts();
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    // Validation: Check grain stock for each row and detect negative overdraft
    let hasNegativeGrain = false;
    const debtDetails: string[] = [];

    for (const item of data.items) {
      if (item.grain_quantity <= 0) throw new Error('كمية الحبوب المراد طحنها يجب أن تكون أكبر من الصفر');
      if (item.flour_quantity <= 0) throw new Error('كمية المطحون الناتجة يجب أن تكون أكبر من الصفر');

      const currentAvailable = await this.getGrainQuantity(item.supplier_id, item.grain_product_id);
      if (currentAvailable < item.grain_quantity) {
        hasNegativeGrain = true;
        const deficit = item.grain_quantity - Math.max(0, currentAvailable);
        const sName = supplierMap.get(item.supplier_id) || `التاجر #${item.supplier_id}`;
        const pName = productMap.get(item.grain_product_id) || `الصنف #${item.grain_product_id}`;
        debtDetails.push(`${sName} (عجز: ${deficit} كيس من "${pName}")`);
      }
    }

    // When milling results in negative grain stock (overdraft), an explanation is mandatory
    if (hasNegativeGrain && (!data.notes || !data.notes.trim())) {
      throw new Error(
        'يجب كتابة توضيح يبيّن سبب الطحن بالكمية السالبة واعتماد مديونية الأصناف على التاجر (كتابة التوضيح إلزامية للسحب بالسالب).'
      );
    }

    const maxOrderId = this.memoryCache.milling_orders.reduce((m, o) => Math.max(m, o.id), 0);
    const orderId = maxOrderId + 1;
    const orderNumber = await this.generateOrderNumber('MO', data.date);

    const newOrder: MillingOrder = {
      id: orderId,
      order_number: orderNumber,
      date: data.date,
      notes: data.notes?.trim() || '',
      created_by: currentUser,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (this.sqliteDb) {
      this.sqliteDb.run('INSERT INTO milling_orders (id, order_number, date, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        newOrder.id,
        newOrder.order_number,
        newOrder.date,
        newOrder.notes,
        newOrder.created_by,
        newOrder.created_at,
      ]);
    }
    this.memoryCache.milling_orders.unshift(newOrder);

    let maxItemId = this.memoryCache.milling_order_items.reduce((m, i) => Math.max(m, i.id), 0);
    const createdItems: MillingOrderItem[] = [];

    for (const item of data.items) {
      maxItemId++;
      const newItem: MillingOrderItem = {
        id: maxItemId,
        order_id: orderId,
        supplier_id: item.supplier_id,
        grain_product_id: item.grain_product_id,
        flour_product_id: item.flour_product_id,
        grain_quantity: item.grain_quantity,
        flour_quantity: item.flour_quantity,
      };

      if (this.sqliteDb) {
        this.sqliteDb.run(
          'INSERT INTO milling_order_items (id, order_id, supplier_id, grain_product_id, flour_product_id, grain_quantity, flour_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            newItem.id,
            newItem.order_id,
            newItem.supplier_id,
            newItem.grain_product_id,
            newItem.flour_product_id,
            newItem.grain_quantity,
            newItem.flour_quantity,
          ]
        );
      }
      this.memoryCache.milling_order_items.push(newItem);
      createdItems.push({
        ...newItem,
        supplier_name: supplierMap.get(item.supplier_id) || `تاجر #${item.supplier_id}`,
        grain_product_name: productMap.get(item.grain_product_id) || `حبوب #${item.grain_product_id}`,
        flour_product_name: productMap.get(item.flour_product_id) || `مطحون #${item.flour_product_id}`,
      });

      // Deduct grain stock
      await this.adjustGrainStock(item.supplier_id, item.grain_product_id, -item.grain_quantity);
      // Add flour stock
      await this.adjustFlourStock(item.supplier_id, item.flour_product_id, item.flour_quantity);
    }

    const totalGrain = data.items.reduce((s, x) => s + x.grain_quantity, 0);
    const totalFlour = data.items.reduce((s, x) => s + x.flour_quantity, 0);
    if (hasNegativeGrain) {
      await this.logAudit(
        'طحن بمديونية أصناف (عجز حبوب)',
        `تم تنفيذ أمر طحن حبوب ${orderNumber} مع تسجيل مديونية أصناف: [${debtDetails.join(' | ')}]. التوضيح المعتمد: ${newOrder.notes}`,
        currentUser
      );
    } else {
      await this.logAudit(
        'تحويل وطحن (SQLite)',
        `تم تنفيذ أمر طحن حبوب ${orderNumber} بإجمالي ${totalGrain} كيس حبوب ونتج عنه ${totalFlour} كيس مطحون`,
        currentUser
      );
    }

    this.persistSqlite();
    this.notify();
    return {
      ...newOrder,
      items: createdItems,
      total_grain: totalGrain,
      total_flour: totalFlour,
    };
  }

  public async updateMillingOrder(
    orderId: number,
    data: {
      date: string;
      notes?: string;
      items: {
        supplier_id: number;
        grain_product_id: number;
        flour_product_id: number;
        grain_quantity: number;
        flour_quantity: number;
      }[];
    },
    currentUser: string
  ): Promise<MillingOrder> {
    const existingOrder = this.memoryCache.milling_orders.find((o) => o.id === orderId);
    if (!existingOrder) throw new Error('أمر الطحن غير موجود');
    if (!data.items || data.items.length === 0) throw new Error('يجب إضافة عملية طحن واحدة على الأقل');

    for (const item of data.items) {
      if (item.grain_quantity <= 0) throw new Error('كمية الحبوب يجب أن تكون أكبر من الصفر');
      if (item.flour_quantity <= 0) throw new Error('كمية المطحون يجب أن تكون أكبر من الصفر');
    }

    // 1. Rollback previous stock changes (restore grain, reverse flour)
    const oldItems = this.memoryCache.milling_order_items.filter((i) => i.order_id === orderId);
    for (const oldItem of oldItems) {
      await this.adjustGrainStock(oldItem.supplier_id, oldItem.grain_product_id, oldItem.grain_quantity);
      await this.adjustFlourStock(oldItem.supplier_id, oldItem.flour_product_id, -oldItem.flour_quantity);
    }

    // 2. Update order header
    existingOrder.date = data.date;
    existingOrder.notes = data.notes?.trim() || '';

    if (this.sqliteDb) {
      this.sqliteDb.run('UPDATE milling_orders SET date = ?, notes = ? WHERE id = ?', [
        existingOrder.date,
        existingOrder.notes,
        orderId,
      ]);
      this.sqliteDb.run('DELETE FROM milling_order_items WHERE order_id = ?', [orderId]);
    }

    // Remove old items from memory cache
    this.memoryCache.milling_order_items = this.memoryCache.milling_order_items.filter(
      (i) => i.order_id !== orderId
    );

    // 3. Re-insert new items and apply new stock adjustments
    const suppliers = await this.getSuppliers();
    const products = await this.getProducts();
    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    let maxItemId = this.memoryCache.milling_order_items.reduce((m, i) => Math.max(m, i.id), 0);
    const newCreatedItems: MillingOrderItem[] = [];

    for (const item of data.items) {
      maxItemId++;
      const newItem: MillingOrderItem = {
        id: maxItemId,
        order_id: orderId,
        supplier_id: item.supplier_id,
        grain_product_id: item.grain_product_id,
        flour_product_id: item.flour_product_id,
        grain_quantity: item.grain_quantity,
        flour_quantity: item.flour_quantity,
      };

      if (this.sqliteDb) {
        this.sqliteDb.run(
          'INSERT INTO milling_order_items (id, order_id, supplier_id, grain_product_id, flour_product_id, grain_quantity, flour_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            newItem.id,
            newItem.order_id,
            newItem.supplier_id,
            newItem.grain_product_id,
            newItem.flour_product_id,
            newItem.grain_quantity,
            newItem.flour_quantity,
          ]
        );
      }
      this.memoryCache.milling_order_items.push(newItem);
      newCreatedItems.push({
        ...newItem,
        supplier_name: supplierMap.get(item.supplier_id) || `تاجر #${item.supplier_id}`,
        grain_product_name: productMap.get(item.grain_product_id) || `حبوب #${item.grain_product_id}`,
        flour_product_name: productMap.get(item.flour_product_id) || `مطحون #${item.flour_product_id}`,
      });

      // Deduct grain stock & add flour stock
      await this.adjustGrainStock(item.supplier_id, item.grain_product_id, -item.grain_quantity);
      await this.adjustFlourStock(item.supplier_id, item.flour_product_id, item.flour_quantity);
    }

    const totalGrain = data.items.reduce((s, x) => s + x.grain_quantity, 0);
    const totalFlour = data.items.reduce((s, x) => s + x.flour_quantity, 0);

    await this.logAudit(
      'تعديل أمر طحن',
      `تم تعديل إذن الطحن ${existingOrder.order_number} بإجمالي ${totalGrain} كيس حبوب و${totalFlour} كيس مطحون مع تحديث حركات المخزون`,
      currentUser
    );

    this.persistSqlite();
    this.notify();

    return {
      ...existingOrder,
      items: newCreatedItems,
      total_grain: totalGrain,
      total_flour: totalFlour,
    };
  }

  public async deleteMillingOrder(orderId: number, currentUser: string): Promise<void> {
    const order = this.memoryCache.milling_orders.find((o) => o.id === orderId);
    if (!order) throw new Error('أمر الطحن غير موجود');

    const items = this.memoryCache.milling_order_items.filter((i) => i.order_id === orderId);

    // Rollback stock changes: add back grain, deduct flour
    for (const item of items) {
      await this.adjustGrainStock(item.supplier_id, item.grain_product_id, item.grain_quantity);
      await this.adjustFlourStock(item.supplier_id, item.flour_product_id, -item.flour_quantity);
    }

    if (this.sqliteDb) {
      this.sqliteDb.run('DELETE FROM milling_order_items WHERE order_id = ?', [orderId]);
      this.sqliteDb.run('DELETE FROM milling_orders WHERE id = ?', [orderId]);
    }

    this.memoryCache.milling_order_items = this.memoryCache.milling_order_items.filter(
      (i) => i.order_id !== orderId
    );
    this.memoryCache.milling_orders = this.memoryCache.milling_orders.filter((o) => o.id !== orderId);

    await this.logAudit(
      'حذف أمر طحن',
      `تم حذف إذن الطحن ${order.order_number} والتراجع عن جميع حركات الحبوب والمطحون المتعلقة به`,
      currentUser
    );

    this.persistSqlite();
    this.notify();
  }

  // --- Withdrawal Orders (أوامر الصرف والتسليم) ---

  public async getWithdrawalOrders(): Promise<WithdrawalOrder[]> {
    const orders = this.memoryCache.withdrawal_orders;
    const items = this.memoryCache.withdrawal_order_items;
    const suppliers = await this.getSuppliers();
    const products = await this.getProducts();

    const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    return orders
      .map((order) => {
        const orderItems = items
          .filter((i) => i.order_id === order.id)
          .map((i) => ({
            ...i,
            product_name: productMap.get(i.product_id)?.name || `صنف #${i.product_id}`,
            unit: productMap.get(i.product_id)?.unit || 'كيس',
          }));

        const total_quantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

        return {
          ...order,
          supplier_name: supplierMap.get(order.supplier_id) || `تاجر #${order.supplier_id}`,
          items: orderItems,
          total_quantity,
        };
      })
      .sort((a, b) => b.id - a.id);
  }

  public async createWithdrawalOrder(
    data: {
      supplier_id: number;
      invoice_number: string;
      receiver_name: string;
      date: string;
      notes?: string;
      items: { product_id: number; quantity: number }[];
    },
    currentUser: string
  ): Promise<WithdrawalOrder> {
    if (!data.supplier_id) throw new Error('يجب اختيار التاجر أولاً');
    if (!data.invoice_number || !data.invoice_number.trim()) throw new Error('رقم الفاتورة المرجعية للتاجر إلزامي');
    if (!data.receiver_name || !data.receiver_name.trim()) throw new Error('اسم مستلم الصنف إلزامي');
    if (!data.items || data.items.length === 0) throw new Error('يجب إضافة صنف واحد على الأقل للصرف');

    const products = await this.getProducts();
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    const supplier = await this.getSupplierById(data.supplier_id);

    // Business Rule Check: Verify available flour stock for each item
    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('الكمية المصروفة يجب أن تكون أكبر من الصفر');

      const available = await this.getFlourQuantity(data.supplier_id, item.product_id);
      if (available < item.quantity) {
        const pName = productMap.get(item.product_id) || `الصنف #${item.product_id}`;
        throw new Error(
          `رصيد المطحون غير كافٍ للصرف! التاجر يملك (${available} كيس) فقط من "${pName}"، والكمية المطلوب صرفها (${item.quantity} كيس).`
        );
      }
    }

    const maxOrderId = this.memoryCache.withdrawal_orders.reduce((m, o) => Math.max(m, o.id), 0);
    const orderId = maxOrderId + 1;
    const orderNumber = await this.generateOrderNumber('WO', data.date);

    const newOrder: WithdrawalOrder = {
      id: orderId,
      order_number: orderNumber,
      supplier_id: data.supplier_id,
      invoice_number: data.invoice_number.trim(),
      receiver_name: data.receiver_name.trim(),
      date: data.date,
      notes: data.notes?.trim() || '',
      created_by: currentUser,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (this.sqliteDb) {
      this.sqliteDb.run(
        'INSERT INTO withdrawal_orders (id, order_number, supplier_id, invoice_number, receiver_name, date, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newOrder.id,
          newOrder.order_number,
          newOrder.supplier_id,
          newOrder.invoice_number,
          newOrder.receiver_name,
          newOrder.date,
          newOrder.notes,
          newOrder.created_by,
          newOrder.created_at,
        ]
      );
    }
    this.memoryCache.withdrawal_orders.unshift(newOrder);

    let maxItemId = this.memoryCache.withdrawal_order_items.reduce((m, i) => Math.max(m, i.id), 0);
    const createdItems: WithdrawalOrderItem[] = [];

    for (const item of data.items) {
      maxItemId++;
      const availableAtTime = await this.getFlourQuantity(data.supplier_id, item.product_id);
      const newItem: WithdrawalOrderItem = {
        id: maxItemId,
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        available_at_time: availableAtTime,
      };

      if (this.sqliteDb) {
        this.sqliteDb.run(
          'INSERT INTO withdrawal_order_items (id, order_id, product_id, quantity, available_at_time) VALUES (?, ?, ?, ?, ?)',
          [newItem.id, newItem.order_id, newItem.product_id, newItem.quantity, newItem.available_at_time]
        );
      }
      this.memoryCache.withdrawal_order_items.push(newItem);
      const prod = products.find((p) => p.id === item.product_id);
      createdItems.push({
        ...newItem,
        product_name: prod?.name || `صنف #${item.product_id}`,
        unit: prod?.unit || 'كيس',
      });

      await this.adjustFlourStock(data.supplier_id, item.product_id, -item.quantity);
    }

    const totalQty = data.items.reduce((s, x) => s + x.quantity, 0);
    await this.logAudit(
      'صرف مطحون (SQLite)',
      `تم صرف ${totalQty} كيس مطحون للتاجر: ${supplier?.name}، المستلم: ${data.receiver_name}، فاتورة #${data.invoice_number}`,
      currentUser
    );

    this.persistSqlite();
    this.notify();
    return {
      ...newOrder,
      items: createdItems,
      supplier_name: supplier?.name,
      total_quantity: totalQty,
    };
  }

  public async updateWithdrawalOrder(
    orderId: number,
    data: {
      supplier_id: number;
      invoice_number: string;
      receiver_name: string;
      date: string;
      notes?: string;
      items: { product_id: number; quantity: number }[];
    },
    currentUser: string
  ): Promise<WithdrawalOrder> {
    const existingOrder = this.memoryCache.withdrawal_orders.find((o) => o.id === orderId);
    if (!existingOrder) throw new Error('أمر الصرف غير موجود');
    if (!data.supplier_id) throw new Error('يجب اختيار التاجر أولاً');
    if (!data.invoice_number || !data.invoice_number.trim()) throw new Error('رقم الفاتورة المرجعية للتاجر إلزامي');
    if (!data.receiver_name || !data.receiver_name.trim()) throw new Error('اسم مستلم الصنف إلزامي');
    if (!data.items || data.items.length === 0) throw new Error('يجب إضافة صنف واحد على الأقل للصرف');

    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('الكمية المصروفة يجب أن تكون أكبر من الصفر');
    }

    // 1. Rollback previous stock deductions (add back the flour)
    const oldItems = this.memoryCache.withdrawal_order_items.filter((i) => i.order_id === orderId);
    for (const oldItem of oldItems) {
      await this.adjustFlourStock(existingOrder.supplier_id, oldItem.product_id, oldItem.quantity);
    }

    // 2. Validate availability with the rolled back stock
    const products = await this.getProducts();
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of data.items) {
      const available = await this.getFlourQuantity(data.supplier_id, item.product_id);
      if (available < item.quantity) {
        // Rollback the rollbacks so we don't leave corrupted stock in case of validation failure
        for (const oldItem of oldItems) {
          await this.adjustFlourStock(existingOrder.supplier_id, oldItem.product_id, -oldItem.quantity);
        }
        const pName = productMap.get(item.product_id)?.name || `الصنف #${item.product_id}`;
        throw new Error(
          `رصيد المطحون غير كافٍ للصرف بعد التعديل! التاجر يملك (${available} كيس) فقط من "${pName}"، والمطلوب (${item.quantity} كيس).`
        );
      }
    }

    // 3. Update order header in DB & memory
    existingOrder.supplier_id = data.supplier_id;
    existingOrder.invoice_number = data.invoice_number.trim();
    existingOrder.receiver_name = data.receiver_name.trim();
    existingOrder.date = data.date;
    existingOrder.notes = data.notes?.trim() || '';

    if (this.sqliteDb) {
      this.sqliteDb.run(
        'UPDATE withdrawal_orders SET supplier_id = ?, invoice_number = ?, receiver_name = ?, date = ?, notes = ? WHERE id = ?',
        [
          existingOrder.supplier_id,
          existingOrder.invoice_number,
          existingOrder.receiver_name,
          existingOrder.date,
          existingOrder.notes,
          orderId,
        ]
      );
      this.sqliteDb.run('DELETE FROM withdrawal_order_items WHERE order_id = ?', [orderId]);
    }

    // Remove old items from memory
    this.memoryCache.withdrawal_order_items = this.memoryCache.withdrawal_order_items.filter(
      (i) => i.order_id !== orderId
    );

    // 4. Re-insert new items & deduct new stock
    let maxItemId = this.memoryCache.withdrawal_order_items.reduce((m, i) => Math.max(m, i.id), 0);
    const newCreatedItems: WithdrawalOrderItem[] = [];

    for (const item of data.items) {
      maxItemId++;
      const availableAtTime = await this.getFlourQuantity(data.supplier_id, item.product_id);
      const newItem: WithdrawalOrderItem = {
        id: maxItemId,
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        available_at_time: availableAtTime,
      };

      if (this.sqliteDb) {
        this.sqliteDb.run(
          'INSERT INTO withdrawal_order_items (id, order_id, product_id, quantity, available_at_time) VALUES (?, ?, ?, ?, ?)',
          [newItem.id, newItem.order_id, newItem.product_id, newItem.quantity, newItem.available_at_time]
        );
      }
      this.memoryCache.withdrawal_order_items.push(newItem);
      const prod = productMap.get(item.product_id);
      newCreatedItems.push({
        ...newItem,
        product_name: prod?.name || `صنف #${item.product_id}`,
        unit: prod?.unit || 'كيس',
      });

      await this.adjustFlourStock(data.supplier_id, item.product_id, -item.quantity);
    }

    const supplier = await this.getSupplierById(data.supplier_id);
    const totalQty = data.items.reduce((s, x) => s + x.quantity, 0);

    await this.logAudit(
      'تعديل أمر صرف',
      `تم تعديل سند الصرف ${existingOrder.order_number} للتاجر: ${supplier?.name} بإجمالي ${totalQty} كيس مطحون مع تحديث حركات المخزون`,
      currentUser
    );

    this.persistSqlite();
    this.notify();

    return {
      ...existingOrder,
      items: newCreatedItems,
      supplier_name: supplier?.name,
      total_quantity: totalQty,
    };
  }

  public async deleteWithdrawalOrder(orderId: number, currentUser: string): Promise<void> {
    const order = this.memoryCache.withdrawal_orders.find((o) => o.id === orderId);
    if (!order) throw new Error('أمر الصرف غير موجود');

    const items = this.memoryCache.withdrawal_order_items.filter((i) => i.order_id === orderId);

    // Rollback stock changes: refund/return flour back into stock
    for (const item of items) {
      await this.adjustFlourStock(order.supplier_id, item.product_id, item.quantity);
    }

    if (this.sqliteDb) {
      this.sqliteDb.run('DELETE FROM withdrawal_order_items WHERE order_id = ?', [orderId]);
      this.sqliteDb.run('DELETE FROM withdrawal_orders WHERE id = ?', [orderId]);
    }

    this.memoryCache.withdrawal_order_items = this.memoryCache.withdrawal_order_items.filter(
      (i) => i.order_id !== orderId
    );
    this.memoryCache.withdrawal_orders = this.memoryCache.withdrawal_orders.filter((o) => o.id !== orderId);

    await this.logAudit(
      'حذف أمر صرف',
      `تم حذف سند الصرف ${order.order_number} وإعادة ${items.reduce((s, x) => s + x.quantity, 0)} كيس إلى رصيد مطحون التاجر`,
      currentUser
    );

    this.persistSqlite();
    this.notify();
  }

  // --- Live Inventory & Reports Aggregator ---

  public async getStockSummary(): Promise<StockSummaryRow[]> {
    const suppliers = await this.getSuppliers();
    const products = await this.getProducts();
    const grainStock = await this.getGrainStock();
    const flourStock = await this.getFlourStock();

    const productMap = new Map(products.map((p) => [p.id, p]));

    return suppliers.map((supplier) => {
      const gStock = grainStock
        .filter((g) => g.supplier_id === supplier.id && g.quantity > 0)
        .map((g) => ({
          product_id: g.product_id,
          product_name: productMap.get(g.product_id)?.name || `حبوب #${g.product_id}`,
          quantity: g.quantity,
        }));

      const fStock = flourStock
        .filter((f) => f.supplier_id === supplier.id && f.quantity > 0)
        .map((f) => ({
          product_id: f.product_id,
          product_name: productMap.get(f.product_id)?.name || `مطحون #${f.product_id}`,
          quantity: f.quantity,
        }));

      const totalGrain = gStock.reduce((sum, item) => sum + item.quantity, 0);
      const totalFlour = fStock.reduce((sum, item) => sum + item.quantity, 0);

      return {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        phone: supplier.phone,
        grainStocks: gStock,
        flourStocks: fStock,
        totalGrain,
        totalFlour,
      };
    });
  }

  // --- Audit Logs ---

  public async getAuditLogs(): Promise<AuditLog[]> {
    if (this.sqliteDb) {
      return this.queryAllFromDb<AuditLog>('SELECT * FROM audit_logs ORDER BY id DESC');
    }
    return [...this.memoryCache.audit_logs].sort((a, b) => b.id - a.id);
  }

  public async logAudit(action: string, details: string, userName: string): Promise<void> {
    const maxId = this.memoryCache.audit_logs.reduce((m, l) => Math.max(m, l.id), 0);
    const newLog: AuditLog = {
      id: maxId + 1,
      action,
      details,
      user_name: userName || 'مستخدم النظام',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    if (this.sqliteDb) {
      this.sqliteDb.run('INSERT INTO audit_logs (id, action, details, user_name, created_at) VALUES (?, ?, ?, ?, ?)', [
        newLog.id,
        newLog.action,
        newLog.details,
        newLog.user_name,
        newLog.created_at,
      ]);
    }
    this.memoryCache.audit_logs.unshift(newLog);
  }

  // --- Raw SQLite Query Execution Console ---

  public executeRawSql(sqlQuery: string): { columns: string[]; values: any[][] }[] {
    if (!this.sqliteDb) {
      if (this.SQL) {
        this.sqliteDb = new this.SQL.Database();
        this.sqliteDb.run(SQL_SCHEMA_DDL);
        this.seedSqliteFromMemory(this.sqliteDb, this.memoryCache);
      } else {
        throw new Error('محرك SQLite قيد التهيئة، يرجى إعادة المحاولة.');
      }
    }
    const results = this.sqliteDb.exec(sqlQuery);
    // If it was a modifying statement (INSERT/UPDATE/DELETE), re-sync memory
    const trimmed = sqlQuery.trim().toUpperCase();
    if (
      trimmed.startsWith('INSERT') ||
      trimmed.startsWith('UPDATE') ||
      trimmed.startsWith('DELETE') ||
      trimmed.startsWith('DROP') ||
      trimmed.startsWith('CREATE') ||
      trimmed.startsWith('REPLACE')
    ) {
      this.syncMemoryFromSqlite();
      this.persistSqlite();
      this.notify();
    }
    return results;
  }

  // --- Binary SQLite Export & Import ---

  public exportSqliteBinary(): Uint8Array {
    if (this.sqliteDb) {
      return this.sqliteDb.export();
    }
    // If not yet available in wasm, create a temporary sqlite db
    if (this.SQL) {
      const tempDb = new this.SQL.Database();
      tempDb.run(SQL_SCHEMA_DDL);
      this.seedSqliteFromMemory(tempDb, this.memoryCache);
      return tempDb.export();
    }
    throw new Error('محرك SQLite غير متاح للتصدير الثنائي حالياً.');
  }

  public async importSqliteBinary(buffer: Uint8Array, currentUser: string): Promise<void> {
    await this.init();
    if (!this.SQL) {
      throw new Error('محرك SQLite غير مهيأ.');
    }
    const newDb = new this.SQL.Database(buffer);
    // Validate schema
    const checkTables = newDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='suppliers';");
    if (!checkTables || checkTables.length === 0 || checkTables[0].values.length === 0) {
      throw new Error('ملف SQLite المحدد غير صالح: لا يحتوي على جداول الطاحونة.');
    }

    this.sqliteDb = newDb;
    this.syncMemoryFromSqlite();
    this.persistSqlite();
    await this.logAudit('استيراد قاعدة SQLite', 'تمت استعادة قاعدة بيانات SQLite بنجاح من ملف ثنائي خارجي', currentUser);
    this.notify();
  }

  // --- JSON Database Backup & Restore ---

  public async exportFullDatabase(): Promise<string> {
    return JSON.stringify(this.memoryCache, null, 2);
  }

  public async importDatabase(jsonString: string, currentUser: string): Promise<void> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('ملف النسخة الاحتياطية غير صالح (صيغة JSON غير صحيحة)');
    }

    if (!parsed.suppliers || !parsed.products || !parsed.grain_stock || !parsed.flour_stock) {
      throw new Error('الملف لا يحتوي على جداول قاعدة بيانات الطاحونة المطلوبة.');
    }

    this.memoryCache = {
      suppliers: parsed.suppliers || [],
      products: parsed.products || [],
      grain_stock: parsed.grain_stock || [],
      flour_stock: parsed.flour_stock || [],
      purchase_orders: parsed.purchase_orders || [],
      purchase_order_items: parsed.purchase_order_items || [],
      milling_orders: parsed.milling_orders || [],
      milling_order_items: parsed.milling_order_items || [],
      withdrawal_orders: parsed.withdrawal_orders || [],
      withdrawal_order_items: parsed.withdrawal_order_items || [],
      audit_logs: parsed.audit_logs || [],
    };

    if (this.sqliteDb) {
      this.sqliteDb.run('BEGIN TRANSACTION;');
      this.sqliteDb.run('DELETE FROM suppliers;');
      this.sqliteDb.run('DELETE FROM products;');
      this.sqliteDb.run('DELETE FROM grain_stock;');
      this.sqliteDb.run('DELETE FROM flour_stock;');
      this.sqliteDb.run('DELETE FROM purchase_orders;');
      this.sqliteDb.run('DELETE FROM purchase_order_items;');
      this.sqliteDb.run('DELETE FROM milling_orders;');
      this.sqliteDb.run('DELETE FROM milling_order_items;');
      this.sqliteDb.run('DELETE FROM withdrawal_orders;');
      this.sqliteDb.run('DELETE FROM withdrawal_order_items;');
      this.sqliteDb.run('DELETE FROM audit_logs;');
      this.seedSqliteFromMemory(this.sqliteDb, this.memoryCache);
      this.sqliteDb.run('COMMIT;');
    }

    await this.logAudit('استعادة نسخة احتياطية', 'تمت استعادة قاعدة بيانات SQLite بالكامل من ملف خارجي', currentUser);
    this.persistSqlite();
    this.notify();
  }

  public async resetToDefaults(currentUser: string): Promise<void> {
    this.memoryCache = this.getDefaultData();
    if (this.sqliteDb) {
      this.sqliteDb.run('BEGIN TRANSACTION;');
      this.sqliteDb.run('DELETE FROM suppliers;');
      this.sqliteDb.run('DELETE FROM products;');
      this.sqliteDb.run('DELETE FROM grain_stock;');
      this.sqliteDb.run('DELETE FROM flour_stock;');
      this.sqliteDb.run('DELETE FROM purchase_orders;');
      this.sqliteDb.run('DELETE FROM purchase_order_items;');
      this.sqliteDb.run('DELETE FROM milling_orders;');
      this.sqliteDb.run('DELETE FROM milling_order_items;');
      this.sqliteDb.run('DELETE FROM withdrawal_orders;');
      this.sqliteDb.run('DELETE FROM withdrawal_order_items;');
      this.sqliteDb.run('DELETE FROM audit_logs;');
      this.seedSqliteFromMemory(this.sqliteDb, this.memoryCache);
      this.sqliteDb.run('COMMIT;');
    }
    await this.logAudit('إعادة تعيين SQLite', 'تمت إعادة تعيين قاعدة البيانات SQLite إلى الحالة الافتراضية', currentUser);
    this.persistSqlite();
    this.notify();
  }
}

export const millDb = new MillDatabase();
