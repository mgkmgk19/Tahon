import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  Wheat,
  Factory,
  PackageCheck,
  TrendingUp,
  User,
  CheckCircle2,
} from 'lucide-react';
import {
  PurchaseOrder,
  MillingOrder,
  WithdrawalOrder,
  Supplier,
  Product,
  StockSummaryRow,
} from '../types';

interface ReportsViewProps {
  purchaseOrders: PurchaseOrder[];
  millingOrders: MillingOrder[];
  withdrawalOrders: WithdrawalOrder[];
  suppliers: Supplier[];
  products: Product[];
  summary: StockSummaryRow[];
}

type ReportType =
  | 'daily_inward' // 5.1 تقرير الواردات اليومية
  | 'milling_operations' // 5.2 تقرير عمليات التحويل (الطحن)
  | 'daily_withdrawals' // 5.3 تقرير الصادرات اليومية
  | 'current_stock' // 5.4 تقرير المخزون الحالي
  | 'supplier_ledger'; // 5.5 تقرير حركة تاجر محدد

export const ReportsView: React.FC<ReportsViewProps> = ({
  purchaseOrders = [],
  millingOrders = [],
  withdrawalOrders = [],
  suppliers = [],
  products = [],
  summary = [],
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('daily_inward');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(suppliers[0]?.id || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = (filename: string, rows: (string | number)[][], headers: string[]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper date filter
  const isWithinRange = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (startDate && !endDate) return dateStr >= startDate;
    if (!startDate && endDate) return dateStr <= endDate;
    return dateStr >= startDate && dateStr <= endDate;
  };

  return (
    <div className="space-y-6">
      {/* Report Selection Header */}
      <div className="no-print bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-800" />
              <span>تقارير الطاحونة الشاملة (SRS Section 5)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              استخراج تقارير الواردات، الطحن، الصرف، وأرصدة المخزون، وكشوفات حركة التجار
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير</span>
            </button>
          </div>
        </div>

        {/* Report Selector Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedReport('daily_inward')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'daily_inward'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            5.1 تقرير الواردات
          </button>

          <button
            type="button"
            onClick={() => setSelectedReport('milling_operations')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'milling_operations'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            5.2 تقرير التحويل (الطحن)
          </button>

          <button
            type="button"
            onClick={() => setSelectedReport('daily_withdrawals')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'daily_withdrawals'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            5.3 تقرير الصادرات
          </button>

          <button
            type="button"
            onClick={() => setSelectedReport('current_stock')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'current_stock'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            5.4 تقرير المخزون الحالي
          </button>

          <button
            type="button"
            onClick={() => setSelectedReport('supplier_ledger')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'supplier_ledger'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            5.5 كشف حركة تاجر
          </button>
        </div>

        {/* Filter Bar for Dates and Supplier */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">الفترة من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
            />
          </div>

          {/* Supplier dropdown for reports */}
          {(selectedReport === 'supplier_ledger' ||
            selectedReport === 'daily_inward' ||
            selectedReport === 'daily_withdrawals') && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">التاجر:</span>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
              >
                {selectedReport !== 'supplier_ledger' && <option value={0}>جميع التجار</option>}
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-amber-800 underline font-semibold mr-auto"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* REPORT CONTENT VIEWPORT (Printable Section) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Printable Header Banner */}
        <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-slate-900">طاحونة الحبوب والمخزون الآلي</h1>
            <h2 className="text-sm font-bold text-amber-900 mt-0.5">
              {selectedReport === 'daily_inward' && 'تقرير الواردات اليومية للحبوب'}
              {selectedReport === 'milling_operations' && 'تقرير عمليات التحويل والإنتاج (طحن الحبوب)'}
              {selectedReport === 'daily_withdrawals' && 'تقرير الصادرات اليومية للمطحون'}
              {selectedReport === 'current_stock' && 'تقرير المخزون الفعلي الحالي للتجار'}
              {selectedReport === 'supplier_ledger' &&
                `كشف حساب وحركة التاجر: ${suppliers.find((s) => s.id === selectedSupplierId)?.name || ''}`}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              الفترة:{' '}
              {startDate || endDate
                ? `${startDate || 'البداية'} حتى ${endDate || 'اليوم'}`
                : 'كامل السجلات التاريخية'}
            </p>
          </div>
          <div className="text-left text-xs text-slate-500">
            <div>تاريخ الاستخراج: {new Date().toISOString().split('T')[0]}</div>
            <div className="font-semibold text-emerald-800 mt-1">نظام أوفلاين محلي 100%</div>
          </div>
        </div>

        {/* 5.1 تقرير الواردات اليومية */}
        {selectedReport === 'daily_inward' && (() => {
          const filteredPOs = purchaseOrders.filter((po) => {
            const matchesDate = isWithinRange(po.date);
            const matchesSupplier = !selectedSupplierId || po.supplier_id === selectedSupplierId;
            return matchesDate && matchesSupplier;
          });

          const flatItems: {
            date: string;
            orderNumber: string;
            supplierName: string;
            productName: string;
            quantity: number;
          }[] = [];

          filteredPOs.forEach((po) => {
            po.items?.forEach((item) => {
              flatItems.push({
                date: po.date,
                orderNumber: po.order_number,
                supplierName: po.supplier_name || '',
                productName: item.product_name || '',
                quantity: item.quantity,
              });
            });
          });

          const totalQuantity = flatItems.reduce((s, x) => s + x.quantity, 0);

          return (
            <div className="space-y-4">
              <div className="no-print flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    handleExportCSV(
                      'تقرير-الواردات',
                      flatItems.map((r) => [r.date, r.orderNumber, r.supplierName, r.productName, r.quantity]),
                      ['التاريخ', 'رقم السند', 'اسم التاجر', 'صنف الحبوب', 'الكمية بالأكياس']
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5 text-amber-800" />
                  <span>تصدير Excel / CSV</span>
                </button>
              </div>

              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">اسم التاجر</th>
                    <th className="p-3">نوع الحبوب</th>
                    <th className="p-3 text-center">الكمية الواردة (أكياس)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {flatItems.length > 0 ? (
                    flatItems.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-amber-900">{row.orderNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{row.supplierName}</td>
                        <td className="p-3 text-slate-800">{row.productName}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-900">{row.quantity}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد واردات مسجلة تطابق محددات البحث
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">
                      إجمالي كمية الحبوب الواردة:
                    </td>
                    <td className="p-3 text-center text-base font-mono text-amber-950">{totalQuantity} كيس</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* 5.2 تقرير عمليات التحويل (الطحن) */}
        {selectedReport === 'milling_operations' && (() => {
          const filteredMOs = millingOrders.filter((mo) => isWithinRange(mo.date));

          const flatMillingRows: {
            date: string;
            orderNumber: string;
            supplierName: string;
            grainProduct: string;
            grainQty: number;
            flourProduct: string;
            flourQty: number;
            yieldPercent: number;
          }[] = [];

          filteredMOs.forEach((mo) => {
            mo.items?.forEach((item) => {
              const y =
                item.grain_quantity > 0 ? Math.round((item.flour_quantity / item.grain_quantity) * 100) : 0;
              flatMillingRows.push({
                date: mo.date,
                orderNumber: mo.order_number,
                supplierName: item.supplier_name || '',
                grainProduct: item.grain_product_name || '',
                grainQty: item.grain_quantity,
                flourProduct: item.flour_product_name || '',
                flourQty: item.flour_quantity,
                yieldPercent: y,
              });
            });
          });

          const totalGrain = flatMillingRows.reduce((s, x) => s + x.grainQty, 0);
          const totalFlour = flatMillingRows.reduce((s, x) => s + x.flourQty, 0);

          return (
            <div className="space-y-4">
              <div className="no-print flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    handleExportCSV(
                      'تقرير-الطحن-والتحويل',
                      flatMillingRows.map((r) => [
                        r.date,
                        r.orderNumber,
                        r.supplierName,
                        r.grainProduct,
                        r.grainQty,
                        r.flourProduct,
                        r.flourQty,
                        `${r.yieldPercent}%`,
                      ]),
                      [
                        'التاريخ',
                        'رقم السند',
                        'التاجر',
                        'صنف الحبوب',
                        'كمية الحبوب (كيس)',
                        'المطحون الناتج',
                        'كمية المطحون (كيس)',
                        'نسبة الاستخراج',
                      ]
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5 text-blue-800" />
                  <span>تصدير Excel / CSV</span>
                </button>
              </div>

              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">اسم التاجر</th>
                    <th className="p-3">حبوب مطحونة</th>
                    <th className="p-3 text-center">كمية الحبوب</th>
                    <th className="p-3">مطحون ناتج</th>
                    <th className="p-3 text-center">كمية المطحون</th>
                    <th className="p-3 text-center">نسبة الاستخراج</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {flatMillingRows.length > 0 ? (
                    flatMillingRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-blue-900">{row.orderNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{row.supplierName}</td>
                        <td className="p-3 text-slate-800">{row.grainProduct}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-900">{row.grainQty}</td>
                        <td className="p-3 text-emerald-800 font-semibold">{row.flourProduct}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-800">{row.flourQty}</td>
                        <td className="p-3 text-center font-mono text-slate-600 font-bold">{row.yieldPercent}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد عمليات طحن خلال الفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">
                      إجمالي الحبوب المستهلكة:
                    </td>
                    <td className="p-3 text-center font-mono text-amber-950 font-bold">{totalGrain} كيس</td>
                    <td className="p-3 text-right">إجمالي المطحون الناتج:</td>
                    <td className="p-3 text-center font-mono text-emerald-950 font-bold">{totalFlour} كيس</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* 5.3 تقرير الصادرات اليومية */}
        {selectedReport === 'daily_withdrawals' && (() => {
          const filteredWOs = withdrawalOrders.filter((wo) => {
            const matchesDate = isWithinRange(wo.date);
            const matchesSupplier = !selectedSupplierId || wo.supplier_id === selectedSupplierId;
            return matchesDate && matchesSupplier;
          });

          const flatWithdrawals: {
            date: string;
            orderNumber: string;
            supplierName: string;
            invoiceNumber: string;
            receiverName: string;
            productName: string;
            quantity: number;
          }[] = [];

          filteredWOs.forEach((wo) => {
            wo.items?.forEach((item) => {
              flatWithdrawals.push({
                date: wo.date,
                orderNumber: wo.order_number,
                supplierName: wo.supplier_name || '',
                invoiceNumber: wo.invoice_number,
                receiverName: wo.receiver_name,
                productName: item.product_name || '',
                quantity: item.quantity,
              });
            });
          });

          const totalQty = flatWithdrawals.reduce((s, x) => s + x.quantity, 0);

          return (
            <div className="space-y-4">
              <div className="no-print flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    handleExportCSV(
                      'تقرير-الصادرات-اليومية',
                      flatWithdrawals.map((r) => [
                        r.date,
                        r.orderNumber,
                        r.supplierName,
                        r.invoiceNumber,
                        r.receiverName,
                        r.productName,
                        r.quantity,
                      ]),
                      ['التاريخ', 'رقم السند', 'التاجر', 'رقم الفاتورة', 'المستلم', 'الصنف المصروف', 'الكمية']
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-800" />
                  <span>تصدير Excel / CSV</span>
                </button>
              </div>

              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">التاجر</th>
                    <th className="p-3">رقم فاتورة التاجر</th>
                    <th className="p-3">اسم المستلم</th>
                    <th className="p-3">الصنف المصروف</th>
                    <th className="p-3 text-center">الكمية المصروفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {flatWithdrawals.length > 0 ? (
                    flatWithdrawals.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-emerald-900">{row.orderNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{row.supplierName}</td>
                        <td className="p-3 font-mono text-slate-800">{row.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{row.receiverName}</td>
                        <td className="p-3 text-slate-700">{row.productName}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-900">{row.quantity} كيس</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد صادرات مسجلة تطابق محددات البحث
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={6} className="p-3 text-right">
                      إجمالي كميات المطحون المصروفة:
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-950 font-bold text-sm">
                      {totalQty} كيس
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* 5.4 تقرير المخزون الحالي */}
        {selectedReport === 'current_stock' && (
          <div className="space-y-4">
            <div className="no-print flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const exportRows: any[] = [];
                  summary.forEach((s) => {
                    const grains = s.grainStocks.map((g) => `${g.product_name}: ${g.quantity}`).join(' | ');
                    const flours = s.flourStocks.map((f) => `${f.product_name}: ${f.quantity}`).join(' | ');
                    exportRows.push([s.supplier_name, s.phone || '', grains, s.totalGrain, flours, s.totalFlour]);
                  });
                  handleExportCSV(
                    'تقرير-المخزون-الحالي',
                    exportRows,
                    ['التاجر', 'الهاتف', 'أصناف الحبوب', 'إجمالي الحبوب', 'أصناف المطحون', 'إجمالي المطحون']
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 text-amber-800" />
                <span>تصدير Excel / CSV</span>
              </button>
            </div>

            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-3">اسم التاجر</th>
                  <th className="p-3">أصناف الحبوب والكميات المتاحة</th>
                  <th className="p-3 text-center">إجمالي الحبوب</th>
                  <th className="p-3">أصناف المطحون والكميات المتاحة</th>
                  <th className="p-3 text-center">إجمالي المطحون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {summary.map((s) => (
                  <tr key={s.supplier_id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">
                      {s.supplier_name}
                      <span className="block text-[11px] text-slate-500 font-normal">{s.phone}</span>
                    </td>
                    <td className="p-3">
                      {s.grainStocks.length > 0 ? (
                        <div className="space-y-0.5">
                          {s.grainStocks.map((g, idx) => (
                            <div key={idx} className="text-slate-700">
                              • {g.product_name}:{' '}
                              <strong
                                className={`font-mono font-bold ${
                                  g.quantity < 0 ? 'text-rose-700 bg-rose-50 px-1 rounded' : 'text-amber-900'
                                }`}
                              >
                                {g.quantity} كيس
                                {g.quantity < 0 && ' (مديونية أصناف)'}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">لا يوجد حبوب</span>
                      )}
                    </td>
                    <td
                      className={`p-3 text-center font-mono font-bold ${
                        s.totalGrain < 0
                          ? 'text-rose-700 bg-rose-50/70 border-x border-rose-200'
                          : 'text-amber-900 bg-amber-50/40'
                      }`}
                    >
                      {s.totalGrain} كيس
                      {s.totalGrain < 0 && <span className="block text-[10px] text-rose-600">(مديونية على التاجر)</span>}
                    </td>
                    <td className="p-3">
                      {s.flourStocks.length > 0 ? (
                        <div className="space-y-0.5">
                          {s.flourStocks.map((f, idx) => (
                            <div key={idx} className="text-slate-700">
                              • {f.product_name}:{' '}
                              <strong
                                className={`font-mono font-bold ${
                                  f.quantity < 0 ? 'text-rose-700 bg-rose-50 px-1 rounded' : 'text-emerald-800'
                                }`}
                              >
                                {f.quantity} كيس
                                {f.quantity < 0 && ' (مديونية)'}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">لا يوجد مطحون</span>
                      )}
                    </td>
                    <td
                      className={`p-3 text-center font-mono font-bold ${
                        s.totalFlour < 0
                          ? 'text-rose-700 bg-rose-50/70 border-x border-rose-200'
                          : 'text-emerald-900 bg-emerald-50/40'
                      }`}
                    >
                      {s.totalFlour} كيس
                      {s.totalFlour < 0 && <span className="block text-[10px] text-rose-600">(مديونية)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                <tr>
                  <td colSpan={2} className="p-3 text-right">إجمالي أرصدة الحبوب بالطاحونة:</td>
                  <td className="p-3 text-center font-mono text-amber-950 font-bold text-sm">
                    {(summary || []).reduce((s, x) => s + (x?.totalGrain || 0), 0)} كيس
                  </td>
                  <td className="p-3 text-right">إجمالي أرصدة المطحون الجاهز:</td>
                  <td className="p-3 text-center font-mono text-emerald-950 font-bold text-sm">
                    {(summary || []).reduce((s, x) => s + (x?.totalFlour || 0), 0)} كيس
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 5.5 تقرير حركة تاجر محدد (Ledger Statement) */}
        {selectedReport === 'supplier_ledger' && (() => {
          const sup = suppliers.find((s) => s.id === selectedSupplierId);
          if (!sup) {
            return <div className="p-8 text-center text-slate-400">يرجى اختيار التاجر أولاً</div>;
          }

          // Gather all movements for this supplier
          const movements: {
            date: string;
            type: 'توريد حبوب' | 'طحن وتحويل' | 'صرف مطحون';
            orderNumber: string;
            details: string;
            grainChange: number;
            flourChange: number;
          }[] = [];

          // POs
          purchaseOrders
            .filter((p) => p.supplier_id === selectedSupplierId)
            .forEach((po) => {
              po.items?.forEach((i) => {
                movements.push({
                  date: po.date,
                  type: 'توريد حبوب',
                  orderNumber: po.order_number,
                  details: `استلام ${i.quantity} كيس من (${i.product_name})`,
                  grainChange: i.quantity,
                  flourChange: 0,
                });
              });
            });

          // MOs
          millingOrders.forEach((mo) => {
            mo.items
              ?.filter((i) => i.supplier_id === selectedSupplierId)
              .forEach((i) => {
                movements.push({
                  date: mo.date,
                  type: 'طحن وتحويل',
                  orderNumber: mo.order_number,
                  details: `طحن ${i.grain_quantity} كيس (${i.grain_product_name}) ➔ نتج ${i.flour_quantity} كيس (${i.flour_product_name})`,
                  grainChange: -i.grain_quantity,
                  flourChange: i.flour_quantity,
                });
              });
          });

          // WOs
          withdrawalOrders
            .filter((w) => w.supplier_id === selectedSupplierId)
            .forEach((wo) => {
              wo.items?.forEach((i) => {
                movements.push({
                  date: wo.date,
                  type: 'صرف مطحون',
                  orderNumber: wo.order_number,
                  details: `صرف ${i.quantity} كيس (${i.product_name}) - مستلم: ${wo.receiver_name}، فاتورة #${wo.invoice_number}`,
                  grainChange: 0,
                  flourChange: -i.quantity,
                });
              });
            });

          movements.sort((a, b) => a.date.localeCompare(b.date));

          const curSummary = summary.find((s) => s.supplier_id === selectedSupplierId);

          return (
            <div className="space-y-5">
              {/* Supplier Profile Badge */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">التاجر:</span>
                  <strong className="text-slate-900 text-sm">{sup.name}</strong>
                  <span className="text-slate-500 block mt-0.5">{sup.phone} | {sup.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg text-center">
                    <span className="block text-[10px] text-amber-800">الرصيد الحالي من الحبوب</span>
                    <strong className="font-mono text-sm">{curSummary?.totalGrain || 0} كيس</strong>
                  </div>
                  <div className="bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-lg text-center">
                    <span className="block text-[10px] text-emerald-800">الرصيد الحالي من المطحون</span>
                    <strong className="font-mono text-sm">{curSummary?.totalFlour || 0} كيس</strong>
                  </div>
                </div>
              </div>

              <table className="w-full text-right text-sm">
                <thead className="bg-slate-100 font-bold border-b border-slate-300 text-xs">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">نوع الحركة</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">بيان الحركة</th>
                    <th className="p-3 text-center">حركة الحبوب</th>
                    <th className="p-3 text-center">حركة المطحون</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {movements.length > 0 ? (
                    movements.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{m.date}</td>
                        <td className="p-3 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              m.type === 'توريد حبوب'
                                ? 'bg-amber-100 text-amber-900'
                                : m.type === 'طحن وتحويل'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-700">{m.orderNumber}</td>
                        <td className="p-3 text-slate-800">{m.details}</td>
                        <td
                          className={`p-3 text-center font-mono font-bold ${
                            m.grainChange > 0
                              ? 'text-emerald-700'
                              : m.grainChange < 0
                              ? 'text-rose-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {m.grainChange > 0 ? `+${m.grainChange}` : m.grainChange !== 0 ? m.grainChange : '-'}
                        </td>
                        <td
                          className={`p-3 text-center font-mono font-bold ${
                            m.flourChange > 0
                              ? 'text-emerald-700'
                              : m.flourChange < 0
                              ? 'text-rose-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {m.flourChange > 0 ? `+${m.flourChange}` : m.flourChange !== 0 ? m.flourChange : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد حركات مسجلة لهذا التاجر بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
