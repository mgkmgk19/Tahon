import React, { useState } from 'react';
import {
  Users,
  Wheat,
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';
import { Supplier, Product, StockSummaryRow, UserRole } from '../types';
import { millDb } from '../db/millDatabase';

interface StockSuppliersViewProps {
  summary: StockSummaryRow[];
  suppliers: Supplier[];
  products: Product[];
  currentRole: UserRole;
  currentUserName: string;
  onViewSupplierLedger?: (supplierId: number) => void;
}

export const StockSuppliersView: React.FC<StockSuppliersViewProps> = ({
  summary,
  suppliers,
  products,
  currentRole,
  currentUserName,
  onViewSupplierLedger,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'suppliers' | 'products'>('stock');
  const [searchTerm, setSearchTerm] = useState('');

  // Supplier modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  // Product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productUnit, setProductUnit] = useState('كيس');
  const [productCategory, setProductCategory] = useState<'حبوب' | 'مطحون'>('حبوب');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManage = currentRole === 'مدير';

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Supplier Form Handlers
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierAddress('');
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierName(s.name);
    setSupplierPhone(s.phone || '');
    setSupplierAddress(s.address || '');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showNotice('error', 'اسم التاجر إلزامي');
      return;
    }

    try {
      await millDb.saveSupplier(
        {
          id: editingSupplier?.id,
          name: supplierName,
          phone: supplierPhone,
          address: supplierAddress,
        },
        currentUserName
      );

      setIsSupplierModalOpen(false);
      showNotice('success', editingSupplier ? 'تم تحديث بيانات التاجر بنجاح' : 'تمت إضافة التاجر بنجاح');
    } catch (err: any) {
      showNotice('error', err.message || 'فشل حفظ بيانات التاجر');
    }
  };

  const handleDeleteSupplier = async (s: Supplier) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف التاجر (${s.name})؟`)) return;
    try {
      await millDb.deleteSupplier(s.id, currentUserName);
      showNotice('success', `تم حذف التاجر ${s.name} بنجاح`);
    } catch (err: any) {
      showNotice('error', err.message || 'لا يمكن حذف التاجر');
    }
  };

  // Product Form Handlers
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductUnit('كيس');
    setProductCategory('حبوب');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductName(p.name);
    setProductUnit(p.unit);
    setProductCategory(p.category);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      showNotice('error', 'اسم الصنف إلزامي');
      return;
    }

    try {
      await millDb.saveProduct(
        {
          id: editingProduct?.id,
          name: productName,
          unit: productUnit,
          category: productCategory,
        },
        currentUserName
      );

      setIsProductModalOpen(false);
      showNotice('success', editingProduct ? 'تم تعديل بيانات الصنف' : 'تمت إضافة الصنف بنجاح');
    } catch (err: any) {
      showNotice('error', err.message || 'فشل حفظ الصنف');
    }
  };

  // Search Filter
  const filteredSummary = summary.filter((s) => s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs for Stock / Suppliers / Products */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'stock'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🌾 أرصدة المخزون الفعلي
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'suppliers'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            👥 سجل التجار ({suppliers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeSubTab === 'products'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📦 دليل الأصناف ({products.length})
          </button>
        </div>

        {/* Global Action Add Buttons */}
        {canManage && activeSubTab === 'suppliers' && (
          <button
            type="button"
            onClick={handleOpenAddSupplier}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تاجر جديد</span>
          </button>
        )}

        {canManage && activeSubTab === 'products' && (
          <button
            type="button"
            onClick={handleOpenAddProduct}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
        <input
          type="text"
          placeholder={
            activeSubTab === 'stock'
              ? 'بحث في أرصدة التاجر...'
              : activeSubTab === 'suppliers'
              ? 'بحث في أسماء التجار أو الهاتف أو العنوان...'
              : 'بحث في الأصناف أو تصنيفها...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
        />
      </div>

      {/* SUB-TAB 1: LIVE STOCK BREAKDOWN */}
      {activeSubTab === 'stock' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSummary.length > 0 ? (
            filteredSummary.map((supplier) => (
              <div
                key={supplier.supplier_id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{supplier.supplier_name}</h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{supplier.phone || 'بدون هاتف'}</span>
                    </span>
                  </div>
                  <div className="text-left space-y-1">
                    {supplier.totalGrain < 0 ? (
                      <span className="text-xs font-mono font-bold bg-rose-100 text-rose-900 px-2.5 py-1 rounded-lg block border border-rose-300">
                        مديونية حبوب: {Math.abs(supplier.totalGrain)} كيس
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg block">
                        إجمالي الحبوب: {supplier.totalGrain} كيس
                      </span>
                    )}
                    {supplier.totalFlour < 0 ? (
                      <span className="text-xs font-mono font-bold bg-rose-100 text-rose-900 px-2.5 py-1 rounded-lg block border border-rose-300">
                        مديونية مطحون: {Math.abs(supplier.totalFlour)} كيس
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg block">
                        إجمالي المطحون: {supplier.totalFlour} كيس
                      </span>
                    )}
                  </div>
                </div>

                {/* Grain stock list */}
                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Wheat className="w-3.5 h-3.5" />
                      <span>مخزون الحبوب الحالي:</span>
                    </span>
                    {supplier.grainStocks.some((g) => g.quantity < 0) && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                        يوجد مديونية أصناف
                      </span>
                    )}
                  </div>
                  {supplier.grainStocks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {supplier.grainStocks.map((g) => {
                        const isDebt = g.quantity < 0;
                        return (
                          <div
                            key={g.product_id}
                            className={`p-2 rounded-lg border flex items-center justify-between text-xs transition ${
                              isDebt
                                ? 'bg-rose-50/80 border-rose-300 text-rose-900'
                                : 'bg-white border-amber-200/60'
                            }`}
                          >
                            <div>
                              <span className="font-medium block">{g.product_name}</span>
                              {isDebt && (
                                <span className="text-[10px] text-rose-700 font-bold block">
                                  مديونية أصناف على التاجر
                                </span>
                              )}
                            </div>
                            <strong className={`font-mono font-bold ${isDebt ? 'text-rose-800' : 'text-amber-900'}`}>
                              {g.quantity} كيس
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">لا يوجد رصيد حبوب لهذا التاجر حالياً</p>
                  )}
                </div>

                {/* Flour stock list */}
                <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200/50 space-y-2">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>مخزون المطحون الجاهز للصرف:</span>
                  </span>
                  {supplier.flourStocks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {supplier.flourStocks.map((f) => {
                        const isDebt = f.quantity < 0;
                        return (
                          <div
                            key={f.product_id}
                            className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                              isDebt
                                ? 'bg-rose-50/80 border-rose-300 text-rose-900'
                                : 'bg-white border-emerald-200/60'
                            }`}
                          >
                            <div>
                              <span className="font-medium block">{f.product_name}</span>
                              {isDebt && (
                                <span className="text-[10px] text-rose-700 font-bold block">
                                  مديونية مطحون
                                </span>
                              )}
                            </div>
                            <strong className={`font-mono font-bold ${isDebt ? 'text-rose-800' : 'text-emerald-800'}`}>
                              {f.quantity} كيس
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">لا يوجد مطحون جاهز لهذا التاجر حالياً</p>
                  )}
                </div>

                {/* Direct Ledger Button */}
                {onViewSupplierLedger && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">حسابات الوارد والمنصرف:</span>
                    <button
                      type="button"
                      onClick={() => onViewSupplierLedger(supplier.supplier_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-800 text-amber-900 hover:text-white text-xs font-bold transition border border-amber-200 hover:border-amber-800 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>كشف حركة التاجر (وارد / منصرف / رصيد)</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-2 p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              لا توجد أرصدة مطابقة للبحث
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SUPPLIERS DIRECTORY */}
      {activeSubTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">اسم التاجر</th>
                <th className="p-3.5">رقم الهاتف</th>
                <th className="p-3.5">العنوان / المنطقة</th>
                <th className="p-3.5">تاريخ التسجيل</th>
                {canManage && <th className="p-3.5 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 font-mono text-slate-400 text-xs">{s.id}</td>
                  <td className="p-3.5 font-bold text-slate-900">{s.name}</td>
                  <td className="p-3.5 font-mono text-xs text-slate-600">{s.phone || '-'}</td>
                  <td className="p-3.5 text-slate-600 text-xs">{s.address || '-'}</td>
                  <td className="p-3.5 font-mono text-xs text-slate-400">{s.created_at.split(' ')[0]}</td>
                  {canManage && (
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {onViewSupplierLedger && (
                          <button
                            type="button"
                            onClick={() => onViewSupplierLedger(s.id)}
                            className="p-1.5 text-amber-800 hover:text-amber-900 rounded-lg hover:bg-amber-100 transition"
                            title="عرض كشف حساب وحركة التاجر"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditSupplier(s)}
                          className="p-1.5 text-slate-500 hover:text-amber-800 rounded-lg hover:bg-amber-50 transition"
                          title="تعديل بيانات التاجر"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="حذف التاجر (يشترط رصيد صفر)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 3: PRODUCTS DIRECTORY */}
      {activeSubTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">اسم الصنف</th>
                <th className="p-3.5">تصنيف الصنف</th>
                <th className="p-3.5">وحدة القياس</th>
                <th className="p-3.5">تاريخ الإضافة</th>
                {canManage && <th className="p-3.5 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5 font-mono text-slate-400 text-xs">{p.id}</td>
                  <td className="p-3.5 font-bold text-slate-900">{p.name}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                        p.category === 'حبوب'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-700">{p.unit}</td>
                  <td className="p-3.5 font-mono text-xs text-slate-400">{p.created_at.split(' ')[0]}</td>
                  {canManage && (
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditProduct(p)}
                        className="p-1.5 text-slate-500 hover:text-amber-800 rounded-lg hover:bg-amber-50 transition"
                        title="تعديل بيانات الصنف"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSupplierModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingSupplier ? 'تعديل بيانات التاجر' : 'إضافة تاجر جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم التاجر <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="مثال: صالح عبدالله العتيبي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان أو المزرعة (اختياري)</label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="المنطقة الزراعية، الخرج..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs sm:text-sm font-bold shadow-sm transition"
                >
                  حفظ التاجر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProductModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الصنف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="مثال: قمح كندي نخب أول"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع الصنف <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProductCategory('حبوب')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      productCategory === 'حبوب'
                        ? 'bg-amber-100 border-amber-600 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    حبوب (مواد خام)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductCategory('مطحون')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      productCategory === 'مطحون'
                        ? 'bg-emerald-100 border-emerald-600 text-emerald-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    مطحون (دقيق / نخالة)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وحدة القياس</label>
                <input
                  type="text"
                  value={productUnit}
                  onChange={(e) => setProductUnit(e.target.value)}
                  placeholder="افتراضي: كيس"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs sm:text-sm font-bold shadow-sm transition"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
