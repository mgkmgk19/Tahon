import React, { useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  Trash2,
  Printer,
  Search,
  Calendar,
  PackageCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { Supplier, Product, WithdrawalOrder, UserRole, FlourStock } from '../types';
import { millDb } from '../db/millDatabase';

interface WithdrawalOrdersViewProps {
  orders: WithdrawalOrder[];
  suppliers: Supplier[];
  products: Product[];
  flourStocks: FlourStock[];
  currentRole: UserRole;
  currentUserName: string;
  onViewVoucher: (order: WithdrawalOrder) => void;
  isOpenNewModal: boolean;
  onCloseNewModal: () => void;
  onOpenNewModal: () => void;
}

export const WithdrawalOrdersView: React.FC<WithdrawalOrdersViewProps> = ({
  orders,
  suppliers,
  products,
  flourStocks,
  currentRole,
  currentUserName,
  onViewVoucher,
  isOpenNewModal,
  onCloseNewModal,
  onOpenNewModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const flourProducts = products.filter((p) => p.category === 'مطحون');

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(suppliers[0]?.id || 1);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ product_id: number; quantity: number }[]>([
    { product_id: flourProducts[0]?.id || 5, quantity: 15 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canCreate = currentRole === 'مدير' || currentRole === 'موظف';

  // Helper to get available flour for current selected supplier
  const getAvailableFlour = (productId: number): number => {
    const item = flourStocks.find(
      (s) => s.supplier_id === selectedSupplierId && s.product_id === productId
    );
    return item ? item.quantity : 0;
  };

  const handleAddItem = () => {
    const defaultProd = flourProducts[0]?.id || 5;
    setItems([...items, { product_id: defaultProd, quantity: 5 }]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedSupplierId) {
      setErrorMessage('يجب اختيار التاجر أولاً');
      return;
    }

    if (!invoiceNumber.trim()) {
      setErrorMessage('رقم فاتورة التاجر المرجعية إلزامي');
      return;
    }

    if (!receiverName.trim()) {
      setErrorMessage('اسم مستلم الصنف الفعلي إلزامي');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('يجب إضافة صنف مطحون واحد على الأقل');
      return;
    }

    // Validate available flour balance
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.quantity <= 0) {
        setErrorMessage(`البند ${i + 1}: الكمية المصروفة يجب أن تكون أكبر من الصفر`);
        return;
      }

      const available = getAvailableFlour(item.product_id);
      if (available < item.quantity) {
        const prodName = flourProducts.find((p) => p.id === item.product_id)?.name;
        setErrorMessage(
          `رصيد المطحون غير كافٍ للصنف "${prodName}"! الرصيد المتاح للتاجر حالياً (${available} كيس) والمطلوب صرفه (${item.quantity} كيس).`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const created = await millDb.createWithdrawalOrder(
        {
          supplier_id: Number(selectedSupplierId),
          invoice_number: invoiceNumber,
          receiver_name: receiverName,
          date: orderDate,
          notes,
          items,
        },
        currentUserName
      );

      setSuccessMessage(`تم تسجيل أمر الصرف بنجاح برقم: ${created.order_number}`);
      setTimeout(() => {
        onCloseNewModal();
        setSuccessMessage('');
        onViewVoucher(created);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ أمر الصرف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.supplier_name && o.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDate = !selectedDate || o.date === selectedDate;
    return matchesSearch && matchesDate;
  });

  const totalBagsForm = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">مستندات صرف وتسليم المطحون (Withdrawal Orders)</h2>
              <p className="text-xs text-slate-500">صرف المطحون للتجار (أصناف متعددة) مع التحقق من الفاتورة واسم المستلم والرصيد المتاح</p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onOpenNewModal}
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل أمر صرف جديد</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم السند (WO-...) أو رقم الفاتورة أو المستلم أو التاجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-700"
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
                <th className="p-3.5">التاجر</th>
                <th className="p-3.5">رقم الفاتورة المرجعية</th>
                <th className="p-3.5">مستلم الصنف</th>
                <th className="p-3.5">الأصناف المصروفة</th>
                <th className="p-3.5 text-center">إجمالي الأكياس</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-bold text-emerald-900">{order.order_number}</td>
                    <td className="p-3.5 text-slate-600 font-mono text-xs">{order.date}</td>
                    <td className="p-3.5 font-bold text-slate-900">{order.supplier_name}</td>
                    <td className="p-3.5 font-mono text-xs text-amber-900 bg-amber-50/50 px-2 rounded font-semibold">
                      {order.invoice_number}
                    </td>
                    <td className="p-3.5 text-slate-800 font-semibold">{order.receiver_name}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {order.items?.map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-emerald-50 text-emerald-900 border border-emerald-200/60 px-2 py-0.5 rounded text-xs"
                          >
                            {item.product_name} ({item.quantity} كيس)
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-base text-emerald-900">
                      {order.total_quantity}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onViewVoucher(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 font-semibold text-xs transition"
                        title="عرض وطباعة سند الصرف"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة السند</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    لا توجد أوامر صرف مطابقة لخيارات البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Withdrawal Order Modal */}
      {isOpenNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-900 text-white">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">تسجيل سند صرف وتسليم مطحون (متعدد الأصناف)</h3>
              </div>
              <button
                type="button"
                onClick={onCloseNewModal}
                className="p-1 text-emerald-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              {/* Top Row: Supplier & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التاجر صاحب الحساب <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الصرف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              {/* Second Row: Mandatory Invoice Number & Receiver Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-amber-700" />
                    <span>رقم الفاتورة المرجعية (فاتورة التاجر)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="مثال: INV-2026-904"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>اسم مستلم الصنف (الشخص المستلم)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="اسم السائق أو مندوب التاجر"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              {/* Items Section: Multi-item Flour with Automatic Available Quantity */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-700" />
                    <span>أصناف المطحون المصروفة (تظهر الكمية المتاحة تلقائياً)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف مطحون آخر</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => {
                    const available = getAvailableFlour(item.product_id);
                    const isOver = item.quantity > available;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border transition ${
                          isOver ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Product selection */}
                          <div className="flex-1">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleItemChange(idx, 'product_id', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
                            >
                              {flourProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Available badge */}
                          <div className="text-center min-w-[90px]">
                            <span className="text-[10px] text-slate-400 block">الرصيد المتاح</span>
                            <span
                              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                available > 0
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {available} كيس
                            </span>
                          </div>

                          {/* Requested quantity */}
                          <div className="w-28">
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 0))
                                }
                                placeholder="الكمية"
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold text-left focus:outline-none ${
                                  isOver ? 'border-rose-400 text-rose-800 bg-rose-50' : 'border-slate-200'
                                }`}
                                required
                              />
                              <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">كيس</span>
                            </div>
                          </div>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="حذف الصنف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {isOver && (
                          <div className="mt-1.5 text-[11px] text-rose-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>الكمية المطلوبة ({item.quantity} كيس) تتجاوز الرصيد المتاح ({available} كيس) للتاجر!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-bold text-slate-700">
                  <span>إجمالي الكمية المصروفة:</span>
                  <span className="font-mono text-base text-emerald-900">{totalBagsForm} كيس</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية (اختياري)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="رقم لوحة الشاحنة، مستند التسليم الورقي..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الصرف...' : 'صرف وخصم من المخزون'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
