/**
 * مواصفات نظام إدارة محل الطاحونة - SRS v1.0
 * نماذج البيانات وقواعد العمل
 */

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export type ProductCategory = 'حبوب' | 'مطحون';

export interface Product {
  id: number;
  name: string;
  unit: string; // افتراضي: "كيس"
  category: ProductCategory;
  created_at: string;
}

export interface GrainStock {
  id: number;
  supplier_id: number;
  product_id: number;
  quantity: number; // عدد الأكياس
}

export interface FlourStock {
  id: number;
  supplier_id: number;
  product_id: number;
  quantity: number; // عدد الأكياس
}

export interface PurchaseOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  // Denormalized for display/printing convenience
  product_name?: string;
  unit?: string;
}

export interface PurchaseOrder {
  id: number;
  order_number: string; // PO-YYYYMMDD-XXX
  supplier_id: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: PurchaseOrderItem[];
  supplier_name?: string;
  total_quantity?: number;
}

export interface MillingOrderItem {
  id: number;
  order_id: number;
  supplier_id: number;
  grain_product_id: number;
  flour_product_id: number;
  grain_quantity: number;
  flour_quantity: number;
  // Denormalized helpers
  supplier_name?: string;
  grain_product_name?: string;
  flour_product_name?: string;
}

export interface MillingOrder {
  id: number;
  order_number: string; // MO-YYYYMMDD-XXX
  date: string; // YYYY-MM-DD
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: MillingOrderItem[];
  total_grain?: number;
  total_flour?: number;
}

export interface WithdrawalOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  available_at_time?: number;
  product_name?: string;
  unit?: string;
}

export interface WithdrawalOrder {
  id: number;
  order_number: string; // WO-YYYYMMDD-XXX
  supplier_id: number;
  invoice_number: string; // رقم فاتورة التاجر المرجعية (إلزامي)
  receiver_name: string; // اسم مستلم الصنف (إلزامي)
  date: string; // YYYY-MM-DD
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: WithdrawalOrderItem[];
  supplier_name?: string;
  total_quantity?: number;
}

export interface AuditLog {
  id: number;
  action: string;
  details: string;
  user_name: string;
  created_at: string;
}

export type UserRole = 'مدير' | 'موظف' | 'محاسب';

export interface UserSession {
  name: string;
  role: UserRole;
}

export interface StockSummaryRow {
  supplier_id: number;
  supplier_name: string;
  phone?: string;
  grainStocks: { product_id: number; product_name: string; quantity: number }[];
  flourStocks: { product_id: number; product_name: string; quantity: number }[];
  totalGrain: number;
  totalFlour: number;
}
