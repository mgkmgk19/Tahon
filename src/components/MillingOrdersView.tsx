import React, { useState } from 'react';
import {
  RefreshCw,
  Plus,
  Trash2,
  Printer,
  Search,
  Calendar,
  Wheat,
  Factory,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Supplier, Product, MillingOrder, UserRole, GrainStock } from '../types';
import { millDb } from '../db/millDatabase';

interface MillingOrdersViewProps {
  orders: MillingOrder[];
  suppliers: Supplier[];
  products: Product[];
  grainStocks: GrainStock[];
  currentRole: UserRole;
  currentUserName: string;
  onViewVoucher: (order: MillingOrder) => void;
  isOpenNewModal: boolean;
  onCloseNewModal: () => void;
  onOpenNewModal: () => void;
}

interface FormMillingRow {
  supplier_id: number;
  grain_product_id: number;
  flour_product_id: number;
  grain_quantity: string;
  flour_quantity: string;
}

export const MillingOrdersView: React.FC<MillingOrdersViewProps> = ({
  orders,
  suppliers,
  products,
  grainStocks,
  currentRole,
  currentUserName,
  onViewVoucher,
  isOpenNewModal,
  onCloseNewModal,
  onOpenNewModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Form State
  const grainProducts = products.filter((p) => p.category === 'حبوب');
  const flourProducts = products.filter((p) => p.category === 'مطحون');

  const defaultRow: FormMillingRow = {
    supplier_id: suppliers[0]?.id || 1,
    grain_product_id: grainProducts[0]?.id || 1,
    flour_product_id: flourProducts[0]?.id || 5,
    grain_quantity: '40',
    flour_quantity: '32',
  };

  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<FormMillingRow[]>([defaultRow]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canCreate = currentRole === 'مدير' || currentRole === 'موظف';

  // Helper to find available grain stock for a supplier and product
  const getAvailableGrain = (supplierId: number, productId: number): number => {
    const item = grainStocks.find((s) => s.supplier_id === supplierId && s.product_id === productId);
    return item ? item.quantity : 0;
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        supplier_id: suppliers[0]?.id || 1,
        grain_product_id: grainProducts[0]?.id || 1,
        flour_product_id: flourProducts[0]?.id || 5,
        grain_quantity: '20',
        flour_quantity: '16',
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: keyof FormMillingRow, val: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: val };
    setRows(updated);
  };

  // Helper to check if row creates a grain deficit (negative overdraft)
  const getRowDeficit = (row: FormMillingRow) => {
    const gQty = parseFloat(row.grain_quantity) || 0;
    const available = getAvailableGrain(row.supplier_id, row.grain_product_id);
    const isExceeding = gQty > available;
    const deficit = isExceeding ? gQty - Math.max(0, available) : 0;
    const balanceAfter = available - gQty;
    return { gQty, available, isExceeding, deficit, balanceAfter };
  };

  const hasAnyDeficit = rows.some((r) => getRowDeficit(r).isExceeding);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (rows.length === 0) {
      setErrorMessage('يجب إضافة عملية طحن واحدة على الأقل');
      return;
    }

    const parsedItems: {
      supplier_id: number;
      grain_product_id: number;
      flour_product_id: number;
      grain_quantity: number;
      flour_quantity: number;
    }[] = [];

    let hasDeficit = false;

    // Validate quantities for each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const gQty = parseFloat(row.grain_quantity);
      const fQty = parseFloat(row.flour_quantity);

      if (isNaN(gQty) || gQty <= 0) {
        setErrorMessage(`الصف رقم ${i + 1}: كمية الحبوب يجب أن تكون رقماً أكبر من الصفر`);
        return;
      }
      if (isNaN(fQty) || fQty <= 0) {
        setErrorMessage(`الصف رقم ${i + 1}: كمية المطحون يجب أن تكون رقماً أكبر من الصفر`);
        return;
      }

      const available = getAvailableGrain(row.supplier_id, row.grain_product_id);
      if (gQty > available) {
        hasDeficit = true;
      }

      parsedItems.push({
        supplier_id: row.supplier_id,
        grain_product_id: row.grain_product_id,
        flour_product_id: row.flour_product_id,
        grain_quantity: gQty,
        flour_quantity: fQty,
      });
    }

    // Mandatory explanation if milling results in negative grain stock / merchant item debt
    if (hasDeficit && !notes.trim()) {
      setErrorMessage(
        'يجب كتابة توضيح رسمي لسبب الطحن بالكمية السالبة وتسجيل مديونية الأصناف على التاجر قبل الاعتماد.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await millDb.createMillingOrder(
        {
          date: orderDate,
          notes: notes.trim(),
          items: parsedItems,
        },
        currentUserName
      );

      setSuccessMessage(`تم تنفيذ أمر الطحن بنجاح برقم: ${created.order_number}`);
      setTimeout(() => {
        onCloseNewModal();
        setSuccessMessage('');
        onViewVoucher(created);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ أمر الطحن');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.items?.some((i) => i.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDate = !selectedDate || o.date === selectedDate;
    return matchesSearch && matchesDate;
  });

  const totalGrainForm = rows.reduce((s, r) => s + (Number(r.grain_quantity) || 0), 0);
  const totalFlourForm = rows.reduce((s, r) => s + (Number(r.flour_quantity) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">مستندات تحويل وطحن الحبوب (Milling Orders)</h2>
              <p className="text-xs text-slate-500">تحويل كميات محددة من الحبوب إلى مطحون مع خصم الحبوب وإضافة المطحون للتاجر</p>
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
            <span>تسجيل إذن طحن جديد</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم إذن الطحن (MO-...) أو اسم التاجر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700"
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
                <th className="p-3.5">عمليات الطحن والتجار</th>
                <th className="p-3.5 text-center">حبوب مستهلكة</th>
                <th className="p-3.5 text-center">مطحون ناتج</th>
                <th className="p-3.5 text-center">نسبة الاستخراج</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const yieldRate =
                    order.total_grain && order.total_grain > 0
                      ? Math.round(((order.total_flour || 0) / order.total_grain) * 100)
                      : 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-blue-900">{order.order_number}</td>
                      <td className="p-3.5 text-slate-600 font-mono text-xs">{order.date}</td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="text-xs text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{item.supplier_name}:</span>
                              <span className="text-amber-800">{item.grain_product_name} ({item.grain_quantity} كيس)</span>
                              <ArrowRight className="w-3 h-3 text-slate-400 rotate-180" />
                              <span className="text-emerald-800 font-semibold">{item.flour_product_name} ({item.flour_quantity} كيس)</span>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <div
                            className="mt-1 text-[11px] text-amber-950 bg-amber-50/80 px-2.5 py-0.5 rounded-md border border-amber-200/80 inline-flex items-center gap-1.5 max-w-md"
                            title={order.notes}
                          >
                            <span className="font-bold text-amber-900 shrink-0">التوضيح/الملاحظات:</span>
                            <span className="truncate">{order.notes}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-900">
                        {order.total_grain} كيس
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-800">
                        {order.total_flour} كيس
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {yieldRate}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onViewVoucher(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 font-semibold text-xs transition"
                          title="عرض وطباعة إذن الطحن"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة الإذن</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    لا توجد أوامر طحن مطابقة لخيارات البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Milling Order Modal (Multi-Row Support) */}
      {isOpenNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base">تسجيل إذن تحويل وطحن حبوب (متعدد الصفوف)</h3>
              </div>
              <button
                type="button"
                onClick={onCloseNewModal}
                className="p-1 text-blue-200 hover:text-white rounded-lg transition"
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

              {/* Date Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ أمر الطحن <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    required
                  />
                </div>
                <div className="sm:col-span-2 flex items-center">
                  <div className="bg-blue-50 text-blue-900 text-xs p-3 rounded-xl border border-blue-200/70 w-full flex items-center gap-2">
                    <Factory className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      يمكنك تحديد كمية الحبوب المستهلكة وكمية المطحون الناتجة بحرية. السحب بالسالب مسموح مع قيد مديونية أصناف على التاجر وتوضيح السبب.
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Row Milling Rows */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Factory className="w-4 h-4 text-blue-700" />
                    <span>عمليات الطحن (كل صف يمثل صنفاً أو تاجراً بعملية مستقلة)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-xs text-blue-800 hover:text-blue-950 font-bold flex items-center gap-1 bg-blue-100/70 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صف طحن آخر</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {rows.map((row, idx) => {
                    const deficitInfo = getRowDeficit(row);
                    const isExceeding = deficitInfo.isExceeding;
                    const deficit = deficitInfo.deficit;
                    const available = deficitInfo.available;
                    const balanceAfter = deficitInfo.balanceAfter;
                    const gNum = deficitInfo.gQty;
                    const fNum = parseFloat(row.flour_quantity) || 0;
                    const rowYield = gNum > 0 ? Math.round((fNum / gNum) * 100) : 0;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition space-y-2.5 ${
                          isExceeding ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">عملية طحن #{idx + 1}</span>
                            {isExceeding && (
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>مديونية أصناف (سحب بالسالب)</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-500">
                              نسبة الطحن (الاستخراج): <strong className="font-mono text-slate-700">{rowYield}%</strong>
                            </span>
                            {rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                title="حذف هذا الصف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
                          {/* 1. Supplier */}
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">التاجر صاحب الحبوب</label>
                            <select
                              value={row.supplier_id}
                              onChange={(e) => handleRowChange(idx, 'supplier_id', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-600"
                            >
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Grain Product & Available */}
                          <div className="sm:col-span-1">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[11px] font-bold text-slate-600">صنف الحبوب</label>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                  available > 0
                                    ? 'bg-amber-100 text-amber-900 font-bold'
                                    : available < 0
                                    ? 'bg-rose-100 text-rose-800 font-bold'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                المتاح: {available}
                              </span>
                            </div>
                            <select
                              value={row.grain_product_id}
                              onChange={(e) => handleRowChange(idx, 'grain_product_id', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-600"
                            >
                              {grainProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 3. Grain Quantity to mill (Allows custom typing) */}
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              كمية الحبوب (طحن)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={row.grain_quantity}
                                onChange={(e) => handleRowChange(idx, 'grain_quantity', e.target.value)}
                                placeholder="0"
                                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold text-left focus:outline-none ${
                                  isExceeding
                                    ? 'border-amber-400 bg-amber-50/60 text-rose-900 focus:border-amber-500'
                                    : 'border-slate-200 focus:border-blue-600'
                                }`}
                                required
                              />
                              <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400">كيس</span>
                            </div>
                          </div>

                          {/* 4. Resulting Flour Product */}
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">المطحون الناتج</label>
                            <select
                              value={row.flour_product_id}
                              onChange={(e) => handleRowChange(idx, 'flour_product_id', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-blue-600"
                            >
                              {flourProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 5. Resulting Flour Quantity (Allows custom typing) */}
                          <div className="sm:col-span-1">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">كمية المطحون</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={row.flour_quantity}
                                onChange={(e) => handleRowChange(idx, 'flour_quantity', e.target.value)}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-left focus:outline-none focus:border-blue-600 text-emerald-800"
                                required
                              />
                              <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400">كيس</span>
                            </div>
                          </div>
                        </div>

                        {/* Deficit Badge & Feedback */}
                        {isExceeding && (
                          <div className="text-xs bg-amber-100/90 text-amber-950 p-2.5 rounded-lg border border-amber-300 font-medium space-y-1 mt-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>مديونية أصناف على التاجر:</span>
                              </span>
                              <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                                عجز حبوب: {deficit} كيس
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 flex items-center justify-between pt-0.5 border-t border-amber-200/60">
                              <span>الرصيد المتاح للتاجر: <strong className="font-mono text-slate-800">{available} كيس</strong></span>
                              <span>الرصيد المسجل بعد الطحن: <strong className="font-mono text-rose-700 font-bold">{balanceAfter} كيس (سالب)</strong></span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Form Totals */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-4">
                    <span>
                      إجمالي الحبوب المطحونة: <strong className="font-mono text-amber-900">{totalGrainForm} كيس</strong>
                    </span>
                    <span>
                      إجمالي المطحون الناتج: <strong className="font-mono text-emerald-900">{totalFlourForm} كيس</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Mandatory Explanation / Notes Section */}
              <div className={`p-4 rounded-xl border transition ${
                hasAnyDeficit
                  ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                  : 'bg-slate-50/70 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold">
                    {hasAnyDeficit ? (
                      <span className="text-rose-800 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>توضيح ومبرر مديونية الأصناف (إلزامي بسبب السحب بالسالب)</span>
                        <span className="text-rose-600 text-sm">*</span>
                      </span>
                    ) : (
                      <span className="text-slate-700">ملاحظات التشغيل وتوضيحات الأمر (اختياري)</span>
                    )}
                  </label>
                  {hasAnyDeficit && (
                    <span className="text-[10px] text-rose-700 bg-rose-100 font-bold px-2 py-0.5 rounded-md border border-rose-200">
                      مطلوب نظاماً
                    </span>
                  )}
                </div>

                {hasAnyDeficit && (
                  <p className="text-[11px] text-amber-900 mb-2 leading-relaxed">
                    نظراً لوجود عجز حبوب سيتم تسجيله كمديونية أصناف على التاجر، يجب كتابة توضيح رسمي ومبرر السحب بالسالب أدناه قبل حفظ السند.
                  </p>
                )}

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={hasAnyDeficit ? 3 : 2}
                  placeholder={
                    hasAnyDeficit
                      ? "اكتب التوضيح الإلزامي هنا: سبب السحب بالسالب واعتماد مديونية الأصناف على التاجر (مثال: تعهد التاجر بالتوريد غداً، موافقة الإدارة برقم...)"
                      : "وردية الطحن، نوع المنخل، تعليمات خاصة..."
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 transition ${
                    hasAnyDeficit && !notes.trim()
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20 focus:border-rose-500 placeholder-rose-400'
                      : 'border-slate-200 bg-white focus:ring-blue-500/20 focus:border-blue-600'
                  }`}
                  required={hasAnyDeficit}
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري التنفيذ...' : 'تنفيذ أمر الطحن وتحديث المخزون'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
