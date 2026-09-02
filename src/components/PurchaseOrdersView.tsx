import React, { useState } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Trash2,
  Printer,
  Search,
  Calendar,
  User,
  Wheat,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Supplier, Product, PurchaseOrder, UserRole } from '../types';
import { millDb } from '../db/millDatabase';

interface PurchaseOrdersViewProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  currentRole: UserRole;
  currentUserName: string;
  onViewVoucher: (order: PurchaseOrder) => void;
  isOpenNewModal: boolean;
  onCloseNewModal: () => void;
  onOpenNewModal: () => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  orders,
  suppliers,
  products,
  currentRole,
  currentUserName,
  onViewVoucher,
  isOpenNewModal,
  onCloseNewModal,
  onOpenNewModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // New PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(suppliers[0]?.id || 0);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: number; quantity: number }[]>([
    { product_id: products.find((p) => p.category === 'حبوب')?.id || 1, quantity: 50 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const grainProducts = products.filter((p) => p.category === 'حبوب');
  const canCreate = currentRole === 'مدير' || currentRole === 'موظف';

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.supplier_name && o.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDate = !selectedDate || o.date === selectedDate;
    return matchesSearch && matchesDate;
  });

  const handleAddItem = () => {
    const defaultProd = grainProducts[0]?.id || 1;
    setItems([...items, { product_id: defaultProd, quantity: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: 'product_id' | 'quantity', val: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedSupplierId) {
      setErrorMessage('يجب اختيار التاجر أولاً');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('يجب إضافة صنف حبوب واحد على الأقل');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setErrorMessage('الكمية الموردة يجب أن تكون أكبر من الصفر');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const created = await millDb.createPurchaseOrder(
        {
          supplier_id: Number(selectedSupplierId),
          date: orderDate,
          notes,
          items,
        },
        currentUserName
      );

      setSuccessMessage(`تم تسجيل أمر التوريد بنجاح برقم: ${created.order_number}`);
      setTimeout(() => {
        onCloseNewModal();
        setSuccessMessage('');
        onViewVoucher(created);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ أمر التوريد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBagsInForm = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">مستندات توريد الحبوب (Purchase Orders)</h2>
              <p className="text-xs text-slate-500">تسجيل استلام وتوريد الحبوب من التجار وإضافتها مباشرة لمخزون الحبوب</p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onOpenNewModal}
            className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل أمر توريد جديد</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم السند (PO-...) أو اسم التاجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-700"
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              إلغاء الفلتر
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم السند</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">اسم التاجر</th>
                <th className="p-3.5">الأصناف الموردة</th>
                <th className="p-3.5 text-center">إجمالي الأكياس</th>
                <th className="p-3.5">الموظف المسؤول</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-bold text-amber-900">{order.order_number}</td>
                    <td className="p-3.5 text-slate-600 font-mono text-xs">{order.date}</td>
                    <td className="p-3.5 font-bold text-slate-900">{order.supplier_name}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {order.items?.map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-amber-50 text-amber-900 border border-amber-200/60 px-2 py-0.5 rounded text-xs"
                          >
                            {item.product_name} ({item.quantity} كيس)
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-base text-slate-800">
                      {order.total_quantity}
                    </td>
                    <td className="p-3.5 text-slate-500 text-xs">{order.created_by || 'موظف الاستقبال'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onViewVoucher(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-semibold text-xs transition"
                        title="عرض وطباعة سند التوريد"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة السند</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    لا توجد أوامر توريد مطابقة لخيارات البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Order Modal */}
      {isOpenNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-amber-900 text-white">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">تسجيل مستند توريد حبوب جديد</h3>
              </div>
              <button
                type="button"
                onClick={onCloseNewModal}
                className="p-1 text-amber-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Supplier */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم التاجر المورّد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ التوريد <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    required
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wheat className="w-4 h-4 text-amber-700" />
                    <span>بنود الحبوب الموردة (أصناف متعددة)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف آخر</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(idx, 'product_id', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-amber-600 bg-white"
                        >
                          {grainProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 0))}
                            placeholder="الكمية"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-left focus:outline-none focus:border-amber-600"
                            required
                          />
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 pointer-events-none">كيس</span>
                        </div>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-bold text-slate-700">
                  <span>إجمالي الكمية الموردة:</span>
                  <span className="font-mono text-base text-amber-900">{totalBagsInForm} كيس</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل عن حالة الحبوب أو وسيلة النقل..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseNewModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وإضافة للمخزون'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
