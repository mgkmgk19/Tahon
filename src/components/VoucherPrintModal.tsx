import React from 'react';
import { Printer, X, CheckCircle, Calendar, Hash, User, FileText } from 'lucide-react';
import { PurchaseOrder, MillingOrder, WithdrawalOrder } from '../types';

interface VoucherPrintModalProps {
  type: 'PO' | 'MO' | 'WO';
  order: PurchaseOrder | MillingOrder | WithdrawalOrder | null;
  onClose: () => void;
}

export const VoucherPrintModal: React.FC<VoucherPrintModalProps> = ({ type, order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const getTitle = () => {
    switch (type) {
      case 'PO':
        return 'سند استلام وتوريد حبوب';
      case 'MO':
        return 'إذن تشغيل وتحويل طحين';
      case 'WO':
        return 'سند صرف وتسليم مطحون';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4 text-slate-800">
        {/* Top Controls (hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-base">معاينة وطباعة السند الرسمي</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-8 bg-white border border-slate-100 min-h-[550px] flex flex-col justify-between" id="printable-voucher">
          <div>
            {/* Mill Header */}
            <div className="flex justify-between items-start border-b-2 border-amber-800 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-amber-900 tracking-tight">طاحونة الحبوب والمخزون الآلي</h1>
                <p className="text-xs text-slate-500 mt-1">نظام إدارة الطاحونة المعتمد - عمليات التوريد والطحن والتوزيع</p>
                <p className="text-xs text-slate-500">هاتف الإدارة: 0551234567 | السجل التجاري: 101089201</p>
              </div>
              <div className="text-left">
                <div className="inline-block bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-center">
                  <span className="text-xs text-amber-900 font-semibold block">{getTitle()}</span>
                  <span className="font-mono text-sm font-bold text-amber-800">{order.order_number}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 justify-end">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>التاريخ: {order.date}</span>
                </div>
              </div>
            </div>

            {/* Document Specific Header Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl mb-6 text-sm border border-slate-200">
              {type === 'PO' && (
                <>
                  <div>
                    <span className="text-slate-500 text-xs block">اسم التاجر المورّد:</span>
                    <strong className="text-slate-900 text-base font-bold">{(order as PurchaseOrder).supplier_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">أمين الاستقبال:</span>
                    <span className="text-slate-700 font-medium">{(order as PurchaseOrder).created_by || 'موظف الاستقبال'}</span>
                  </div>
                </>
              )}

              {type === 'MO' && (
                <>
                  <div>
                    <span className="text-slate-500 text-xs block">نوع السند:</span>
                    <strong className="text-slate-900 text-base font-bold">أمر تحويل وطحن حبوب</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">المسؤول عن التشغيل:</span>
                    <span className="text-slate-700 font-medium">{(order as MillingOrder).created_by || 'مدير التشغيل'}</span>
                  </div>
                </>
              )}

              {type === 'WO' && (
                <>
                  <div>
                    <span className="text-slate-500 text-xs block">التاجر صاحب الحساب:</span>
                    <strong className="text-slate-900 text-base font-bold">{(order as WithdrawalOrder).supplier_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">رقم فاتورة التاجر (المرجع):</span>
                    <strong className="text-amber-800 font-mono text-base font-bold">{(order as WithdrawalOrder).invoice_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">اسم مستلم الصنف الفعلي:</span>
                    <span className="text-slate-800 font-semibold">{(order as WithdrawalOrder).receiver_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">الموظف المنشئ:</span>
                    <span className="text-slate-700 font-medium">{(order as WithdrawalOrder).created_by || 'موظف الاستقبال'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Items Table */}
            <div className="overflow-hidden border border-slate-300 rounded-xl mb-6">
              {type === 'PO' && (
                <table className="w-full text-right text-sm">
                  <thead className="bg-amber-100 text-amber-950 font-bold border-b border-amber-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">صنف الحبوب المورّدة</th>
                      <th className="p-3 text-center">الوحدة</th>
                      <th className="p-3 text-center">الكمية المستلمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {((order as PurchaseOrder).items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-800">{item.product_name}</td>
                        <td className="p-3 text-center text-slate-600">{item.unit || 'كيس'}</td>
                        <td className="p-3 text-center font-bold text-amber-800 font-mono text-base">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right">إجمالي عدد الأكياس المورّدة:</td>
                      <td className="p-3 text-center text-lg text-amber-900 font-mono">
                        {((order as PurchaseOrder).items || []).reduce((s, i) => s + i.quantity, 0)} كيس
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {type === 'MO' && (
                <table className="w-full text-right text-sm">
                  <thead className="bg-amber-100 text-amber-950 font-bold border-b border-amber-200">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">التاجر</th>
                      <th className="p-2.5">صنف الحبوب</th>
                      <th className="p-2.5 text-center">كمية الحبوب</th>
                      <th className="p-2.5">صنف المطحون الناتج</th>
                      <th className="p-2.5 text-center">كمية المطحون</th>
                      <th className="p-2.5 text-center">نسبة الاستخراج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {((order as MillingOrder).items || []).map((item, idx) => {
                      const yieldPercent = item.grain_quantity > 0 ? Math.round((item.flour_quantity / item.grain_quantity) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{item.supplier_name}</td>
                          <td className="p-2.5 text-slate-700">{item.grain_product_name}</td>
                          <td className="p-2.5 text-center font-bold text-slate-900 font-mono">{item.grain_quantity} كيس</td>
                          <td className="p-2.5 text-emerald-800 font-semibold">{item.flour_product_name}</td>
                          <td className="p-2.5 text-center font-bold text-emerald-700 font-mono">{item.flour_quantity} كيس</td>
                          <td className="p-2.5 text-center font-bold text-slate-600 font-mono">{yieldPercent}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right">الإجماليات:</td>
                      <td className="p-2.5 text-center font-mono text-slate-900">
                        {((order as MillingOrder).items || []).reduce((s, i) => s + i.grain_quantity, 0)} كيس حبوب
                      </td>
                      <td></td>
                      <td className="p-2.5 text-center font-mono text-emerald-800">
                        {((order as MillingOrder).items || []).reduce((s, i) => s + i.flour_quantity, 0)} كيس مطحون
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {type === 'WO' && (
                <table className="w-full text-right text-sm">
                  <thead className="bg-amber-100 text-amber-950 font-bold border-b border-amber-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">صنف المطحون المصروف</th>
                      <th className="p-3 text-center">الوحدة</th>
                      <th className="p-3 text-center">الكمية المصروفة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {((order as WithdrawalOrder).items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-800">{item.product_name}</td>
                        <td className="p-3 text-center text-slate-600">{item.unit || 'كيس'}</td>
                        <td className="p-3 text-center font-bold text-amber-800 font-mono text-base">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right">إجمالي الكمية المصروفة:</td>
                      <td className="p-3 text-center text-lg text-amber-900 font-mono">
                        {((order as WithdrawalOrder).items || []).reduce((s, i) => s + i.quantity, 0)} كيس
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block mb-1">
                  {type === 'MO' ? 'توضيحات ومبررات أمر الطحن (مديونية أصناف / ملاحظات):' : 'ملاحظات:'}
                </span>
                <p className="text-slate-700 font-medium whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Official Signatures Section */}
          <div className="border-t-2 border-dashed border-slate-300 pt-6 mt-6">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="border border-slate-200 rounded-lg p-3">
                <span className="font-bold text-slate-700 block mb-8">
                  {type === 'WO' ? 'توقيع المستلم (أقر باستلام البضاعة)' : 'توقيع العميل / المورد'}
                </span>
                <span className="block border-t border-slate-300 pt-1 text-slate-400">الاسم والتوقيع</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <span className="font-bold text-slate-700 block mb-8">مسؤول المستودع والطاحونة</span>
                <span className="block border-t border-slate-300 pt-1 text-slate-400">التوقيع والختم</span>
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <span className="font-bold text-slate-700 block mb-8">اعتماد الإدارة العامة</span>
                <span className="block border-t border-slate-300 pt-1 text-slate-400">التاريخ والختم الرسمي</span>
              </div>
            </div>
            <div className="text-center text-[10px] text-slate-400 mt-4">
              تم إنشاء هذا المستند آلياً عبر نظام إدارة الطاحونة والمخزون المحلي (Offline-First) - {order.created_at}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
