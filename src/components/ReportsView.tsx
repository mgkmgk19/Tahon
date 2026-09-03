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
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Scale,
  Search,
  Layers,
  Share2,
  Send,
} from 'lucide-react';
import {
  PurchaseOrder,
  MillingOrder,
  WithdrawalOrder,
  Supplier,
  Product,
  StockSummaryRow,
} from '../types';
import {
  exportToXLS,
  printOrSavePDF,
  shareReportData,
  numberToArabicWords,
} from '../utils/exportUtils';

interface ReportsViewProps {
  purchaseOrders: PurchaseOrder[];
  millingOrders: MillingOrder[];
  withdrawalOrders: WithdrawalOrder[];
  suppliers: Supplier[];
  products: Product[];
  summary: StockSummaryRow[];
  initialSupplierId?: number;
}

type ReportType =
  | 'daily_inward' // 5.1 تقرير الواردات (دخول الحبوب)
  | 'milling_operations' // 5.2 تقرير عمليات التحويل (الطحن)
  | 'daily_withdrawals' // 5.3 تقرير الصادرات (خروج المطحون)
  | 'current_stock' // 5.4 تقرير المخزون الحالي
  | 'supplier_ledger' // 5.5 كشف حساب وحركة تاجر محدد
  | 'stock_movement_ledger'; // 5.6 ميزان حركة المخزون الشامل (وارد / منصرف / رصيد)

type LedgerFilterMode = 'all' | 'grain_only' | 'flour_only';

export const ReportsView: React.FC<ReportsViewProps> = ({
  purchaseOrders = [],
  millingOrders = [],
  withdrawalOrders = [],
  suppliers = [],
  products = [],
  summary = [],
  initialSupplierId,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('supplier_ledger');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(
    initialSupplierId || suppliers[0]?.id || 1
  );
  const [ledgerMode, setLedgerMode] = useState<LedgerFilterMode>('all');
  const [movementCategoryFilter, setMovementCategoryFilter] = useState<'all' | 'حبوب' | 'مطحون'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
    showToast('تم تصدير ملف CSV بنجاح!');
  };

  // Helper date filter
  const isWithinRange = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (startDate && !endDate) return dateStr >= startDate;
    if (!startDate && endDate) return dateStr <= endDate;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const isBeforeStartDate = (dateStr: string) => {
    if (!startDate) return false;
    return dateStr < startDate;
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const getReportName = (type: ReportType) => {
    switch (type) {
      case 'supplier_ledger':
        return `كشف حساب وحركة التاجر - ${selectedSupplier?.name || ''}`;
      case 'stock_movement_ledger':
        return 'ميزان حركة المخزون الشامل (وارد / منصرف / رصيد)';
      case 'daily_inward':
        return 'تقرير الواردات (دخول الحبوب)';
      case 'milling_operations':
        return 'تقرير عمليات التحويل والطحن';
      case 'daily_withdrawals':
        return 'تقرير الصادرات (تسليم المطحون)';
      case 'current_stock':
        return 'تقرير المخزون الفعلي الحالي';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Report Selection Header */}
      <div className="no-print bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-800" />
              <span>تقارير وكشوفات الحسابات والمخزون الرسمية</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              فصل محاسبي دقيق لحركات الدخول (الوارد) والخروج (المنصرف) مع تصدير Excel بصيغة xls وطباعة PDF
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => printOrSavePDF(getReportName(selectedReport))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="طباعة التقرير أو حفظه بصيغة PDF"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF</span>
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedReport('supplier_ledger')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'supplier_ledger'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            📋 كشف حركة التاجر
          </button>

          <button
            type="button"
            onClick={() => setSelectedReport('stock_movement_ledger')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'stock_movement_ledger'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            ⚖️ ميزان حركة المخزون
          </button>

          <button
            type="button"
            onClick={() => setSelectedReport('daily_inward')}
            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition ${
              selectedReport === 'daily_inward'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            📥 واردات الحبوب (دخول)
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
            🔄 الطحن والتحويل
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
            📤 صادرات المطحون (خروج)
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
            🌾 أرصدة المخزون الحالي
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
            selectedReport === 'stock_movement_ledger' ||
            selectedReport === 'daily_inward' ||
            selectedReport === 'milling_operations' ||
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

          {/* Ledger view mode toggle */}
          {selectedReport === 'supplier_ledger' && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setLedgerMode('all')}
                className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                  ledgerMode === 'all' ? 'bg-amber-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                شامل (حبوب ومطحون)
              </button>
              <button
                type="button"
                onClick={() => setLedgerMode('grain_only')}
                className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                  ledgerMode === 'grain_only' ? 'bg-amber-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                حساب الحبوب فقط
              </button>
              <button
                type="button"
                onClick={() => setLedgerMode('flour_only')}
                className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] ${
                  ledgerMode === 'flour_only' ? 'bg-amber-800 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                حساب المطحون فقط
              </button>
            </div>
          )}

          {/* Stock Movement filter */}
          {selectedReport === 'stock_movement_ledger' && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">التصنيف:</span>
              <select
                value={movementCategoryFilter}
                onChange={(e) => setMovementCategoryFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
              >
                <option value="all">كافة الأصناف (حبوب + مطحون)</option>
                <option value="حبوب">حبوب فقط</option>
                <option value="مطحون">مطحون فقط</option>
              </select>
            </div>
          )}

          {(startDate || endDate || (selectedReport !== 'supplier_ledger' && selectedSupplierId !== 0)) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                if (selectedReport !== 'supplier_ledger') setSelectedSupplierId(0);
              }}
              className="text-amber-800 underline font-semibold mr-auto text-xs"
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
              {selectedReport === 'daily_inward' && 'تقرير الواردات اليومية للحبوب (حركات الدخول)'}
              {selectedReport === 'milling_operations' && 'تقرير عمليات التحويل والإنتاج (طحن الحبوب)'}
              {selectedReport === 'daily_withdrawals' && 'تقرير الصادرات اليومية للمطحون (حركات الخروج)'}
              {selectedReport === 'current_stock' && 'تقرير المخزون الفعلي الحالي للتجار'}
              {selectedReport === 'supplier_ledger' &&
                `كشف حساب وحركة التاجر: ${selectedSupplier?.name || 'التاجر المحدد'} (وارد / منصرف / رصيد)`}
              {selectedReport === 'stock_movement_ledger' &&
                'ميزان حركة المخزون الشامل (وارد ودخول / منصرف وخروج / الرصيد الفعلي)'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              الفترة:{' '}
              {startDate || endDate
                ? `${startDate || 'البداية'} حتى ${endDate || 'اليوم'}`
                : 'كامل السجلات التاريخية للعمليات'}
            </p>
          </div>
          <div className="text-left text-xs text-slate-500">
            <div>تاريخ الاستخراج: {new Date().toISOString().split('T')[0]}</div>
            <div className="font-semibold text-emerald-800 mt-1">نظام محاسبي محلي معتمد</div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* REPORT 5.5: كشف حساب وحركة التاجر المفصل مع فصل الدخول والخروج */}
        {/* ------------------------------------------------------------- */}
        {selectedReport === 'supplier_ledger' && (() => {
          if (!selectedSupplier) {
            return <div className="p-8 text-center text-slate-400">يرجى اختيار التاجر أولاً</div>;
          }

          // 1. تجميع كل حركات التاجر
          interface LedgerMovement {
            date: string;
            createdAt: string;
            orderNumber: string;
            docType: 'PO' | 'MO' | 'WO';
            docTypeName: string;
            productName: string;
            notes: string;
            grainIn: number;   // وارد حبوب (دخول)
            grainOut: number;  // منصرف حبوب للطحن (خروج)
            flourIn: number;   // وارد مطحون ناتج من الطحن (دخول)
            flourOut: number;  // منصرف مطحون بالصرف (خروج)
          }

          const rawMovements: LedgerMovement[] = [];

          // POs (توريد حبوب = دخول حبوب فقط)
          purchaseOrders
            .filter((p) => p.supplier_id === selectedSupplierId)
            .forEach((po) => {
              po.items?.forEach((i) => {
                rawMovements.push({
                  date: po.date,
                  createdAt: po.created_at,
                  orderNumber: po.order_number,
                  docType: 'PO',
                  docTypeName: 'توريد حبوب',
                  productName: i.product_name || `صنف #${i.product_id}`,
                  notes: po.notes || 'استلام وتوريد شحنة حبوب',
                  grainIn: i.quantity,
                  grainOut: 0,
                  flourIn: 0,
                  flourOut: 0,
                });
              });
            });

          // MOs (طحن وتحويل = خروج حبوب مستهلكة + دخول مطحون ناتج)
          millingOrders.forEach((mo) => {
            mo.items
              ?.filter((i) => i.supplier_id === selectedSupplierId)
              .forEach((i) => {
                const yieldPct =
                  i.grain_quantity > 0 ? Math.round((i.flour_quantity / i.grain_quantity) * 100) : 0;
                rawMovements.push({
                  date: mo.date,
                  createdAt: mo.created_at,
                  orderNumber: mo.order_number,
                  docType: 'MO',
                  docTypeName: 'طحن وتحويل',
                  productName: `${i.grain_product_name} ➔ ${i.flour_product_name}`,
                  notes: `استخراج ${yieldPct}% (${i.flour_quantity} كيس ناتج عن طحن ${i.grain_quantity} كيس)`,
                  grainIn: 0,
                  grainOut: i.grain_quantity,
                  flourIn: i.flour_quantity,
                  flourOut: 0,
                });
              });
          });

          // WOs (صرف مطحون = خروج مطحون فقط)
          withdrawalOrders
            .filter((w) => w.supplier_id === selectedSupplierId)
            .forEach((wo) => {
              wo.items?.forEach((i) => {
                rawMovements.push({
                  date: wo.date,
                  createdAt: wo.created_at,
                  orderNumber: wo.order_number,
                  docType: 'WO',
                  docTypeName: 'صرف مطحون',
                  productName: i.product_name || `صنف #${i.product_id}`,
                  notes: `مستلم: ${wo.receiver_name} | فاتورة #${wo.invoice_number}`,
                  grainIn: 0,
                  grainOut: 0,
                  flourIn: 0,
                  flourOut: i.quantity,
                });
              });
            });

          // ترتيب الحركات تصاعدياً حسب التاريخ ثم السند
          rawMovements.sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            if (cmp !== 0) return cmp;
            return a.createdAt.localeCompare(b.createdAt);
          });

          // 2. حساب الرصيد الافتتاحي (قبل startDate)
          let openingGrainBalance = 0;
          let openingFlourBalance = 0;

          if (startDate) {
            rawMovements.forEach((m) => {
              if (isBeforeStartDate(m.date)) {
                openingGrainBalance += m.grainIn - m.grainOut;
                openingFlourBalance += m.flourIn - m.flourOut;
              }
            });
          }

          // 3. فلترة حركات الفترة وحساب الأرصدة التراكمية الدقيقة بعد كل حركة
          let runningGrain = openingGrainBalance;
          let runningFlour = openingFlourBalance;

          let periodGrainIn = 0;
          let periodGrainOut = 0;
          let periodFlourIn = 0;
          let periodFlourOut = 0;

          const periodMovements: (LedgerMovement & {
            grainBalanceAfter: number;
            flourBalanceAfter: number;
          })[] = [];

          rawMovements.forEach((m) => {
            if (isWithinRange(m.date)) {
              runningGrain += m.grainIn - m.grainOut;
              runningFlour += m.flourIn - m.flourOut;

              periodGrainIn += m.grainIn;
              periodGrainOut += m.grainOut;
              periodFlourIn += m.flourIn;
              periodFlourOut += m.flourOut;

              periodMovements.push({
                ...m,
                grainBalanceAfter: runningGrain,
                flourBalanceAfter: runningFlour,
              });
            }
          });

          const finalGrainBalance = runningGrain;
          const finalFlourBalance = runningFlour;

          return (
            <div className="space-y-6">
              {/* Export Buttons */}
              <div className="no-print flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500 font-medium">
                  عدد حركات الفترة: <strong className="text-slate-900">{periodMovements.length}</strong> حركة مسجلة
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export XLS */}
                  <button
                    type="button"
                    onClick={() => {
                      const exportHeaders = [
                        'التاريخ',
                        'رقم السند',
                        'نوع السند',
                        'الصنف والبيان',
                        'وارد حبوب (+)',
                        'منصرف حبوب (-)',
                        'رصيد الحبوب التراكمي',
                        'وارد مطحون (+)',
                        'منصرف مطحون (-)',
                        'رصيد المطحون التراكمي',
                        'ملاحظات',
                      ];
                      const exportRows = periodMovements.map((r) => [
                        r.date,
                        r.orderNumber,
                        r.docTypeName,
                        r.productName,
                        r.grainIn || 0,
                        r.grainOut || 0,
                        r.grainBalanceAfter,
                        r.flourIn || 0,
                        r.flourOut || 0,
                        r.flourBalanceAfter,
                        r.notes,
                      ]);
                      const footerTotals = [
                        'الإجماليات',
                        '',
                        '',
                        'صافي الحركات',
                        periodGrainIn,
                        periodGrainOut,
                        `${finalGrainBalance} كيس حبوب متبقي`,
                        periodFlourIn,
                        periodFlourOut,
                        `${finalFlourBalance} كيس مطحون متبقي`,
                        '',
                      ];
                      const metaInfo = [
                        { label: 'التاجر', value: selectedSupplier.name },
                        { label: 'الهاتف', value: selectedSupplier.phone || 'غير مسجل' },
                        { label: 'الفترة', value: `${startDate || 'من البداية'} إلى ${endDate || 'تاريخ اليوم'}` },
                        { label: 'رصيد الحبوب المتبقي', value: `${finalGrainBalance} كيس` },
                        { label: 'رصيد المطحون المتبقي', value: `${finalFlourBalance} كيس` },
                      ];
                      exportToXLS({
                        filename: `كشف-حساب-التاجر-${selectedSupplier.name}`,
                        sheetName: 'كشف حركة التاجر',
                        title: `طاحونة الحبوب والمخزون الآلي - كشف حساب وحركة التاجر: ${selectedSupplier.name}`,
                        subtitle: `فصل محاسبي دقيق بين الوارد (دخول) والمنصرف (خروج) مع احتساب الأرصدة التراكمية`,
                        metaInfo,
                        headers: exportHeaders,
                        rows: exportRows,
                        footerTotals,
                      });
                      showToast('تم تصدير كشف الحساب بصيغة Excel (.xls) بنجاح!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    title="تصدير كشف الحساب إلى Excel بصيغة xls"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-200" />
                    <span>تصدير إكسل (.xls)</span>
                  </button>

                  {/* Print / PDF */}
                  <button
                    type="button"
                    onClick={() => printOrSavePDF(`كشف-حساب-${selectedSupplier.name}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                    title="طباعة أو حفظ بصيغة PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>PDF / طباعة</span>
                  </button>

                  {/* Send via WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      const summaryText =
                        `*كشف حساب وحركة الأمانات*\n` +
                        `👤 التاجر: ${selectedSupplier.name}\n` +
                        `📅 الفترة: ${startDate || 'البداية'} إلى ${endDate || 'الآن'}\n\n` +
                        `🌾 *حساب الحبوب الخام:*\n` +
                        `  • رصيد أول المدة: ${openingGrainBalance} كيس\n` +
                        `  • إجمالي الوارد (دخول): +${periodGrainIn} كيس\n` +
                        `  • إجمالي المستهلك بالطحن (خروج): -${periodGrainOut} كيس\n` +
                        `  • *الرصيد المتبقي الحالي: ${finalGrainBalance} كيس حبوب*\n\n` +
                        `✨ *حساب الدقيق والمطحون:*\n` +
                        `  • رصيد أول المدة: ${openingFlourBalance} كيس\n` +
                        `  • ناتج الطحن (دخول): +${periodFlourIn} كيس\n` +
                        `  • المنصرف والمسلّم (خروج): -${periodFlourOut} كيس\n` +
                        `  • *الرصيد المتبقي الحالي: ${finalFlourBalance} كيس مطحون*\n\n` +
                        `صادر عن نظام إدارة طاحونة الحبوب الآلية`;
                      shareReportData({
                        title: `كشف حساب - ${selectedSupplier.name}`,
                        summaryText,
                        whatsappPhone: selectedSupplier.phone,
                      });
                      showToast('تم فتح إرسال التقرير عبر واتساب!');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                    title="إرسال ملخص الكشف للتاجر عبر واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>إرسال واتساب</span>
                  </button>

                  {/* CSV Export */}
                  <button
                    type="button"
                    onClick={() => {
                      const exportHeaders = [
                        'التاريخ',
                        'رقم السند',
                        'نوع السند',
                        'الصنف والبيان',
                        'وارد حبوب (دخول)',
                        'منصرف حبوب (خروج)',
                        'رصيد الحبوب التراكمي',
                        'وارد مطحون (دخول)',
                        'منصرف مطحون (خروج)',
                        'رصيد المطحون التراكمي',
                        'ملاحظات',
                      ];
                      const exportRows = periodMovements.map((r) => [
                        r.date,
                        r.orderNumber,
                        r.docTypeName,
                        r.productName,
                        r.grainIn || 0,
                        r.grainOut || 0,
                        r.grainBalanceAfter,
                        r.flourIn || 0,
                        r.flourOut || 0,
                        r.flourBalanceAfter,
                        r.notes,
                      ]);
                      handleExportCSV(
                        `كشف-حساب-التاجر-${selectedSupplier.name}`,
                        exportRows,
                        exportHeaders
                      );
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
                    title="تصدير ملف بيانات CSV"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Top Financial & Physical Balance Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Grain Account Summary */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                      <Wheat className="w-4 h-4 text-amber-800" />
                      <span>حساب مدخرات الحبوب الخام (أمانات التاجر)</span>
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-bold">
                      أكياس خيش
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-slate-500 block">رصيد أول الفترة</span>
                      <strong className="font-mono text-sm text-slate-800 block mt-0.5">
                        {openingGrainBalance}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-emerald-700 block font-semibold">+ وارد (دخول)</span>
                      <strong className="font-mono text-sm text-emerald-800 block mt-0.5">
                        +{periodGrainIn}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-rose-700 block font-semibold">- منصرف (للطحن)</span>
                      <strong className="font-mono text-sm text-rose-800 block mt-0.5">
                        -{periodGrainOut}
                      </strong>
                    </div>
                    <div className="bg-amber-800 text-white p-2 rounded-xl shadow-xs">
                      <span className="text-[10px] text-amber-200 block font-bold">الرصيد النهائي</span>
                      <strong className="font-mono text-sm text-white block mt-0.5">
                        {finalGrainBalance} كيس
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Flour Account Summary */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                      <PackageCheck className="w-4 h-4 text-emerald-800" />
                      <span>حساب رصيد المطحون الجاهز للصرف (أمانات التاجر)</span>
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-bold">
                      أكياس مطحون
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-500 block">رصيد أول الفترة</span>
                      <strong className="font-mono text-sm text-slate-800 block mt-0.5">
                        {openingFlourBalance}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 block font-semibold">+ وارد (طحن)</span>
                      <strong className="font-mono text-sm text-emerald-800 block mt-0.5">
                        +{periodFlourIn}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-rose-700 block font-semibold">- منصرف (صرف)</span>
                      <strong className="font-mono text-sm text-rose-800 block mt-0.5">
                        -{periodFlourOut}
                      </strong>
                    </div>
                    <div className="bg-emerald-800 text-white p-2 rounded-xl shadow-xs">
                      <span className="text-[10px] text-emerald-200 block font-bold">الرصيد النهائي</span>
                      <strong className="font-mono text-sm text-white block mt-0.5">
                        {finalFlourBalance} كيس
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <tr>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">نوع العملية</th>
                      <th className="p-3">البيان / الصنف والملاحظات</th>

                      {/* Grain Columns */}
                      {(ledgerMode === 'all' || ledgerMode === 'grain_only') && (
                        <>
                          <th className="p-3 text-center bg-amber-50/80 text-emerald-900 border-x border-amber-200">
                            وارد حبوب (+)
                          </th>
                          <th className="p-3 text-center bg-amber-50/80 text-rose-900 border-x border-amber-200">
                            منصرف حبوب (-)
                          </th>
                          <th className="p-3 text-center bg-amber-100/90 text-amber-950 border-x border-amber-200">
                            رصيد الحبوب
                          </th>
                        </>
                      )}

                      {/* Flour Columns */}
                      {(ledgerMode === 'all' || ledgerMode === 'flour_only') && (
                        <>
                          <th className="p-3 text-center bg-emerald-50/80 text-emerald-900 border-x border-emerald-200">
                            وارد مطحون (+)
                          </th>
                          <th className="p-3 text-center bg-emerald-50/80 text-rose-900 border-x border-emerald-200">
                            منصرف مطحون (-)
                          </th>
                          <th className="p-3 text-center bg-emerald-100/90 text-emerald-950 border-x border-emerald-200">
                            رصيد المطحون
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {/* Opening Balance Row if Start Date specified */}
                    {startDate && (
                      <tr className="bg-slate-50/90 font-bold text-slate-600 italic">
                        <td className="p-3 font-mono">{startDate}</td>
                        <td className="p-3">-</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                            رصيد افتتاحي
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">رصيد ما قبل تاريخ البداية المختار ({startDate})</td>

                        {(ledgerMode === 'all' || ledgerMode === 'grain_only') && (
                          <>
                            <td className="p-3 text-center font-mono">-</td>
                            <td className="p-3 text-center font-mono">-</td>
                            <td className="p-3 text-center font-mono font-bold text-amber-950 bg-amber-50/40">
                              {openingGrainBalance} كيس
                            </td>
                          </>
                        )}

                        {(ledgerMode === 'all' || ledgerMode === 'flour_only') && (
                          <>
                            <td className="p-3 text-center font-mono">-</td>
                            <td className="p-3 text-center font-mono">-</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-950 bg-emerald-50/40">
                              {openingFlourBalance} كيس
                            </td>
                          </>
                        )}
                      </tr>
                    )}

                    {periodMovements.length > 0 ? (
                      periodMovements.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/90 transition">
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{row.date}</td>
                          <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {row.orderNumber}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                row.docType === 'PO'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : row.docType === 'MO'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {row.docTypeName}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{row.productName}</span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">{row.notes}</span>
                          </td>

                          {/* Grain Columns */}
                          {(ledgerMode === 'all' || ledgerMode === 'grain_only') && (
                            <>
                              <td className="p-3 text-center font-mono font-bold bg-amber-50/30">
                                {row.grainIn > 0 ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    +{row.grainIn}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold bg-amber-50/30">
                                {row.grainOut > 0 ? (
                                  <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                    -{row.grainOut}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td
                                className={`p-3 text-center font-mono font-bold bg-amber-100/50 ${
                                  row.grainBalanceAfter < 0 ? 'text-rose-700' : 'text-amber-950'
                                }`}
                              >
                                {row.grainBalanceAfter} كيس
                              </td>
                            </>
                          )}

                          {/* Flour Columns */}
                          {(ledgerMode === 'all' || ledgerMode === 'flour_only') && (
                            <>
                              <td className="p-3 text-center font-mono font-bold bg-emerald-50/30">
                                {row.flourIn > 0 ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    +{row.flourIn}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold bg-emerald-50/30">
                                {row.flourOut > 0 ? (
                                  <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                    -{row.flourOut}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td
                                className={`p-3 text-center font-mono font-bold bg-emerald-100/50 ${
                                  row.flourBalanceAfter < 0 ? 'text-rose-700' : 'text-emerald-950'
                                }`}
                              >
                                {row.flourBalanceAfter} كيس
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={ledgerMode === 'all' ? 10 : 7}
                          className="p-8 text-center text-slate-400 text-xs"
                        >
                          لا توجد حركات مسجلة لهذا التاجر خلال الفترة المحددة
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Summary Footer */}
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                    <tr>
                      <td colSpan={4} className="p-3 text-right text-slate-900 font-black">
                        إجمالي حركات الفترة والرصيد الختامي:
                      </td>

                      {(ledgerMode === 'all' || ledgerMode === 'grain_only') && (
                        <>
                          <td className="p-3 text-center font-mono text-emerald-800 bg-amber-50">
                            +{periodGrainIn} كيس
                          </td>
                          <td className="p-3 text-center font-mono text-rose-800 bg-amber-50">
                            -{periodGrainOut} كيس
                          </td>
                          <td className="p-3 text-center font-mono text-amber-950 font-black bg-amber-200">
                            {finalGrainBalance} كيس
                          </td>
                        </>
                      )}

                      {(ledgerMode === 'all' || ledgerMode === 'flour_only') && (
                        <>
                          <td className="p-3 text-center font-mono text-emerald-800 bg-emerald-50">
                            +{periodFlourIn} كيس
                          </td>
                          <td className="p-3 text-center font-mono text-rose-800 bg-emerald-50">
                            -{periodFlourOut} كيس
                          </td>
                          <td className="p-3 text-center font-mono text-emerald-950 font-black bg-emerald-200">
                            {finalFlourBalance} كيس
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Note about calculation logic */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>المعادلة المعتمدة:</strong> رصيد الحبوب الحالي = (رصيد أول المدة + وارد التوريد - منصرف الطحن). | رصيد المطحون الحالي = (رصيد أول المدة + وارد ناتج الطحن - منصرف الصادرات). لا يتم خلط أو جمع الدخول مع الخروج إطلاقاً.
                </span>
              </div>
            </div>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* REPORT 5.6: ميزان حركة المخزون الشامل (وارد / منصرف / رصيد) */}
        {/* ------------------------------------------------------------- */}
        {selectedReport === 'stock_movement_ledger' && (() => {
          // حساب حركة المخزون لكل تاجر ولكل صنف
          interface StockLedgerRow {
            supplierId: number;
            supplierName: string;
            productId: number;
            productName: string;
            category: 'حبوب' | 'مطحون';
            openingBalance: number;
            periodIn: number;
            periodOut: number;
            netChange: number;
            closingBalance: number;
          }

          const targetSuppliers = selectedSupplierId
            ? suppliers.filter((s) => s.id === selectedSupplierId)
            : suppliers;

          const rows: StockLedgerRow[] = [];

          targetSuppliers.forEach((sup) => {
            products.forEach((prod) => {
              if (movementCategoryFilter !== 'all' && prod.category !== movementCategoryFilter) {
                return;
              }

              let opening = 0;
              let inQty = 0;
              let outQty = 0;

              // 1. حساب حركات هذا الصنف لهذا التاجر
              if (prod.category === 'حبوب') {
                // POs (وارد)
                purchaseOrders
                  .filter((p) => p.supplier_id === sup.id)
                  .forEach((po) => {
                    po.items
                      ?.filter((i) => i.product_id === prod.id)
                      .forEach((i) => {
                        if (isBeforeStartDate(po.date)) {
                          opening += i.quantity;
                        } else if (isWithinRange(po.date)) {
                          inQty += i.quantity;
                        }
                      });
                  });

                // MOs (منصرف طحن)
                millingOrders.forEach((mo) => {
                  mo.items
                    ?.filter((i) => i.supplier_id === sup.id && i.grain_product_id === prod.id)
                    .forEach((i) => {
                      if (isBeforeStartDate(mo.date)) {
                        opening -= i.grain_quantity;
                      } else if (isWithinRange(mo.date)) {
                        outQty += i.grain_quantity;
                      }
                    });
                });
              } else {
                // مطحون
                // MOs (وارد ناتج طحن)
                millingOrders.forEach((mo) => {
                  mo.items
                    ?.filter((i) => i.supplier_id === sup.id && i.flour_product_id === prod.id)
                    .forEach((i) => {
                      if (isBeforeStartDate(mo.date)) {
                        opening += i.flour_quantity;
                      } else if (isWithinRange(mo.date)) {
                        inQty += i.flour_quantity;
                      }
                    });
                });

                // WOs (منصرف صرف وتسليم)
                withdrawalOrders
                  .filter((w) => w.supplier_id === sup.id)
                  .forEach((wo) => {
                    wo.items
                      ?.filter((i) => i.product_id === prod.id)
                      .forEach((i) => {
                        if (isBeforeStartDate(wo.date)) {
                          opening -= i.quantity;
                        } else if (isWithinRange(wo.date)) {
                          outQty += i.quantity;
                        }
                      });
                  });
              }

              const closing = opening + inQty - outQty;

              // نعرض الصنف فقط إذا كان له رصيد أو حركة
              if (opening !== 0 || inQty !== 0 || outQty !== 0 || closing !== 0) {
                rows.push({
                  supplierId: sup.id,
                  supplierName: sup.name,
                  productId: prod.id,
                  productName: prod.name,
                  category: prod.category,
                  openingBalance: opening,
                  periodIn: inQty,
                  periodOut: outQty,
                  netChange: inQty - outQty,
                  closingBalance: closing,
                });
              }
            });
          });

          const totalOpening = rows.reduce((s, x) => s + x.openingBalance, 0);
          const totalIn = rows.reduce((s, x) => s + x.periodIn, 0);
          const totalOut = rows.reduce((s, x) => s + x.periodOut, 0);
          const totalClosing = rows.reduce((s, x) => s + x.closingBalance, 0);

          return (
            <div className="space-y-4">
              <div className="no-print flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  إجمالي البنود النشطة بميزان المخزون: <strong>{rows.length}</strong> صنف
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export XLS */}
                  <button
                    type="button"
                    onClick={() => {
                      const exportHeaders = [
                        'التاجر',
                        'الصنف',
                        'التصنيف',
                        'رصيد أول المدة',
                        'وارد الفترة (+)',
                        'منصرف الفترة (-)',
                        'صافي الحركة',
                        'الرصيد النهائي المتبقي',
                      ];
                      const exportRows = rows.map((r) => [
                        r.supplierName,
                        r.productName,
                        r.category,
                        r.openingBalance,
                        r.periodIn,
                        r.periodOut,
                        r.netChange,
                        r.closingBalance,
                      ]);
                      const footerTotals = [
                        'الإجمالي العام',
                        '',
                        '',
                        totalOpening,
                        totalIn,
                        totalOut,
                        totalIn - totalOut,
                        `${totalClosing} كيس متبقي`,
                      ];
                      const metaInfo = [
                        { label: 'نوع التقرير', value: 'ميزان حركة المخزون الشامل (وارد / منصرف / رصيد)' },
                        { label: 'الفترة', value: `${startDate || 'من البداية'} إلى ${endDate || 'تاريخ اليوم'}` },
                        { label: 'إجمالي الوارد بالفترة', value: `+${totalIn} كيس` },
                        { label: 'إجمالي المنصرف بالفترة', value: `-${totalOut} كيس` },
                        { label: 'الرصيد الفعلي الحالي', value: `${totalClosing} كيس` },
                      ];
                      exportToXLS({
                        filename: 'ميزان-حركة-المخزون-الشامل',
                        sheetName: 'ميزان المخزون',
                        title: 'طاحونة الحبوب والمخزون الآلي - ميزان حركة المخزون الشامل',
                        subtitle: 'بيان حركة دخول الحبوب وخروج المطحون والأرصدة الختامية',
                        metaInfo,
                        headers: exportHeaders,
                        rows: exportRows,
                        footerTotals,
                      });
                      showToast('تم تصدير ميزان المخزون بصيغة Excel (.xls) بنجاح!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    title="تصدير ميزان المخزون إلى Excel بصيغة xls"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-200" />
                    <span>تصدير إكسل (.xls)</span>
                  </button>

                  {/* Print / PDF */}
                  <button
                    type="button"
                    onClick={() => printOrSavePDF('ميزان-حركة-المخزون-الشامل')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                    title="طباعة أو حفظ بصيغة PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>PDF / طباعة</span>
                  </button>

                  {/* Send via WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      const summaryText =
                        `*⚖️ ميزان حركة المخزون الشامل*\n` +
                        `📅 الفترة: ${startDate || 'البداية'} إلى ${endDate || 'الآن'}\n\n` +
                        `• إجمالي رصيد أول المدة: ${totalOpening} كيس\n` +
                        `• إجمالي الوارد بالفترة (دخول): +${totalIn} كيس\n` +
                        `• إجمالي المنصرف بالفترة (خروج): -${totalOut} كيس\n` +
                        `• صافي التغير: ${totalIn - totalOut >= 0 ? '+' : ''}${totalIn - totalOut} كيس\n` +
                        `• *الرصيد الفعلي الحالي بالمستودع: ${totalClosing} كيس*\n\n` +
                        `صادر عن نظام إدارة طاحونة الحبوب الآلية`;
                      shareReportData({
                        title: 'ميزان حركة المخزون الشامل',
                        summaryText,
                      });
                      showToast('تم فتح خيارات إرسال ميزان المخزون!');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                    title="إرسال ملخص الميزان عبر واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>إرسال واتساب</span>
                  </button>

                  {/* CSV Export */}
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV(
                        'ميزان-حركة-المخزون',
                        rows.map((r) => [
                          r.supplierName,
                          r.productName,
                          r.category,
                          r.openingBalance,
                          r.periodIn,
                          r.periodOut,
                          r.netChange,
                          r.closingBalance,
                        ]),
                        [
                          'التاجر',
                          'الصنف',
                          'التصنيف',
                          'رصيد أول المدة',
                          'وارد الفترة (دخول)',
                          'منصرف الفترة (خروج)',
                          'صافي الحركة',
                          'الرصيد النهائي المتبقي',
                        ]
                      );
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
                    title="تصدير ملف بيانات CSV"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <tr>
                      <th className="p-3">اسم التاجر</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3">التصنيف</th>
                      <th className="p-3 text-center bg-slate-200/60">رصيد أول المدة</th>
                      <th className="p-3 text-center bg-emerald-50 text-emerald-900 border-x border-emerald-200">
                        وارد الفترة (دخول +)
                      </th>
                      <th className="p-3 text-center bg-rose-50 text-rose-900 border-x border-rose-200">
                        منصرف الفترة (خروج -)
                      </th>
                      <th className="p-3 text-center bg-blue-50 text-blue-950 border-x border-blue-200">
                        صافي الحركة
                      </th>
                      <th className="p-3 text-center bg-amber-100 text-amber-950 font-black">
                        الرصيد النهائي المتبقي
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {rows.length > 0 ? (
                      rows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-900">{r.supplierName}</td>
                          <td className="p-3 font-semibold text-slate-800">{r.productName}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.category === 'حبوب'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {r.category}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700 bg-slate-50">
                            {r.openingBalance} كيس
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/30">
                            {r.periodIn > 0 ? `+${r.periodIn}` : '-'}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-rose-800 bg-rose-50/30">
                            {r.periodOut > 0 ? `-${r.periodOut}` : '-'}
                          </td>
                          <td
                            className={`p-3 text-center font-mono font-bold bg-blue-50/30 ${
                              r.netChange > 0
                                ? 'text-emerald-700'
                                : r.netChange < 0
                                ? 'text-rose-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {r.netChange > 0 ? `+${r.netChange}` : r.netChange !== 0 ? r.netChange : '0'}
                          </td>
                          <td
                            className={`p-3 text-center font-mono font-bold bg-amber-50 ${
                              r.closingBalance < 0
                                ? 'text-rose-800 bg-rose-100 font-black'
                                : 'text-amber-950'
                            }`}
                          >
                            {r.closingBalance} كيس
                            {r.closingBalance < 0 && <span className="block text-[9px] text-rose-600">(مديونية)</span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                          لا توجد أرصدة أو حركات تطابق محددات البحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                    <tr>
                      <td colSpan={3} className="p-3 text-right text-slate-900 font-black">
                        الإجماليات العامة للميزان:
                      </td>
                      <td className="p-3 text-center font-mono text-slate-800">{totalOpening} كيس</td>
                      <td className="p-3 text-center font-mono text-emerald-900 bg-emerald-100">
                        +{totalIn} كيس
                      </td>
                      <td className="p-3 text-center font-mono text-rose-900 bg-rose-100">
                        -{totalOut} كيس
                      </td>
                      <td className="p-3 text-center font-mono text-blue-900 bg-blue-100">
                        {totalIn - totalOut > 0 ? `+${totalIn - totalOut}` : totalIn - totalOut}
                      </td>
                      <td className="p-3 text-center font-mono text-amber-950 font-black bg-amber-200">
                        {totalClosing} كيس
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* REPORT 5.1: تقرير الواردات اليومية (دخول الحبوب) */}
        {/* ------------------------------------------------------------- */}
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
            notes: string;
          }[] = [];

          filteredPOs.forEach((po) => {
            po.items?.forEach((item) => {
              flatItems.push({
                date: po.date,
                orderNumber: po.order_number,
                supplierName: po.supplier_name || '',
                productName: item.product_name || '',
                quantity: item.quantity,
                notes: po.notes || '',
              });
            });
          });

          const totalQuantity = flatItems.reduce((s, x) => s + x.quantity, 0);

          return (
            <div className="space-y-4">
              <div className="no-print flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  حركات دخول الحبوب إلى مستودع الطاحونة (سندات توريد PO)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export XLS */}
                  <button
                    type="button"
                    onClick={() => {
                      const exportHeaders = ['التاريخ', 'رقم السند', 'اسم التاجر', 'صنف الحبوب', 'الكمية الواردة (أكياس)', 'الملاحظات'];
                      const exportRows = flatItems.map((r) => [r.date, r.orderNumber, r.supplierName, r.productName, r.quantity, r.notes]);
                      const footerTotals = ['الإجمالي', '', '', '', `${totalQuantity} كيس`, ''];
                      const metaInfo = [
                        { label: 'نوع التقرير', value: 'واردات الحبوب اليومية (سندات توريد PO)' },
                        { label: 'الفترة', value: `${startDate || 'من البداية'} إلى ${endDate || 'تاريخ اليوم'}` },
                        { label: 'إجمالي الكميات الواردة', value: `${totalQuantity} كيس حبوب` },
                      ];
                      exportToXLS({
                        filename: 'تقرير-الواردات-دخول-الحبوب',
                        sheetName: 'واردات الحبوب',
                        title: 'طاحونة الحبوب والمخزون الآلي - تقرير الواردات (دخول الحبوب)',
                        subtitle: 'سجل حركات توريد وإيداع الحبوب بمستودع الأمانات',
                        metaInfo,
                        headers: exportHeaders,
                        rows: exportRows,
                        footerTotals,
                      });
                      showToast('تم تصدير تقرير الواردات بصيغة Excel (.xls) بنجاح!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    title="تصدير إلى Excel بصيغة xls"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-200" />
                    <span>تصدير إكسل (.xls)</span>
                  </button>

                  {/* Print / PDF */}
                  <button
                    type="button"
                    onClick={() => printOrSavePDF('تقرير-الواردات-دخول-الحبوب')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                    title="طباعة أو حفظ بصيغة PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>PDF / طباعة</span>
                  </button>

                  {/* Send via WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      const summaryText =
                        `*🌾 تقرير واردات الحبوب (سندات توريد PO)*\n` +
                        `📅 الفترة: ${startDate || 'البداية'} إلى ${endDate || 'الآن'}\n` +
                        `• عدد سندات التوريد: ${filteredPOs.length}\n` +
                        `• إجمالي الأكياس الواردة: *+${totalQuantity} كيس حبوب*\n\n` +
                        `صادر عن نظام إدارة طاحونة الحبوب الآلية`;
                      shareReportData({
                        title: 'تقرير واردات الحبوب',
                        summaryText,
                      });
                      showToast('تم فتح خيارات إرسال تقرير الواردات!');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                    title="إرسال عبر واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>إرسال واتساب</span>
                  </button>

                  {/* CSV Export */}
                  <button
                    type="button"
                    onClick={() =>
                      handleExportCSV(
                        'تقرير-الواردات-دخول-الحبوب',
                        flatItems.map((r) => [r.date, r.orderNumber, r.supplierName, r.productName, r.quantity, r.notes]),
                        ['التاريخ', 'رقم السند', 'اسم التاجر', 'صنف الحبوب', 'الكمية الواردة (أكياس)', 'الملاحظات']
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
                    title="تصدير ملف بيانات CSV"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">اسم التاجر</th>
                    <th className="p-3">صنف الحبوب</th>
                    <th className="p-3">ملاحظات الشحنة</th>
                    <th className="p-3 text-center bg-emerald-50 text-emerald-900">الكمية الواردة (دخول +)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {flatItems.length > 0 ? (
                    flatItems.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-amber-900">{row.orderNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{row.supplierName}</td>
                        <td className="p-3 text-slate-800 font-semibold">{row.productName}</td>
                        <td className="p-3 text-slate-500 text-[11px]">{row.notes || '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          +{row.quantity} كيس
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد واردات مسجلة تطابق محددات البحث
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={5} className="p-3 text-right font-black text-slate-900">
                      إجمالي كميات الحبوب الواردة (دخول كلي للمستودع):
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-950 font-black bg-emerald-200 text-sm">
                      +{totalQuantity} كيس حبوب
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* REPORT 5.2: تقرير التحويل والطحن (خروج حبوب + دخول مطحون) */}
        {/* ------------------------------------------------------------- */}
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
            mo.items
              ?.filter((item) => !selectedSupplierId || item.supplier_id === selectedSupplierId)
              .forEach((item) => {
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

          const totalGrainConsumed = flatMillingRows.reduce((s, x) => s + x.grainQty, 0);
          const totalFlourProduced = flatMillingRows.reduce((s, x) => s + x.flourQty, 0);

          return (
            <div className="space-y-4">
              <div className="no-print flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  تتضمن عمليات التحويل: <strong>خروج الحبوب المستهلكة (🔴)</strong> و <strong>دخول المطحون الناتج (🟢)</strong>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export XLS */}
                  <button
                    type="button"
                    onClick={() => {
                      const exportHeaders = [
                        'التاريخ',
                        'رقم السند',
                        'التاجر',
                        'صنف الحبوب المستهلكة',
                        'حبوب مستهلكة (خروج -)',
                        'صنف المطحون الناتج',
                        'مطحون ناتج (دخول +)',
                        'نسبة الاستخراج',
                      ];
                      const exportRows = flatMillingRows.map((r) => [
                        r.date,
                        r.orderNumber,
                        r.supplierName,
                        r.grainProduct,
                        r.grainQty,
                        r.flourProduct,
                        r.flourQty,
                        `${r.yieldPercent}%`,
                      ]);
                      const footerTotals = [
                        'الإجمالي',
                        '',
                        '',
                        '',
                        `-${totalGrainConsumed} كيس`,
                        '',
                        `+${totalFlourProduced} كيس`,
                        totalGrainConsumed > 0 ? `${((totalFlourProduced / totalGrainConsumed) * 100).toFixed(1)}%` : '',
                      ];
                      const metaInfo = [
                        { label: 'نوع التقرير', value: 'تقرير عمليات الطحن والتحويل' },
                        { label: 'الفترة', value: `${startDate || 'من البداية'} إلى ${endDate || 'تاريخ اليوم'}` },
                        { label: 'إجمالي الحبوب المستهلكة', value: `${totalGrainConsumed} كيس حبوب` },
                        { label: 'إجمالي المطحون الناتج', value: `${totalFlourProduced} كيس دقيق/مطحون` },
                        {
                          label: 'متوسط نسبة الاستخراج',
                          value: totalGrainConsumed > 0 ? `${((totalFlourProduced / totalGrainConsumed) * 100).toFixed(1)}%` : '0%',
                        },
                      ];
                      exportToXLS({
                        filename: 'تقرير-عمليات-الطحن-والتحويل',
                        sheetName: 'عمليات الطحن',
                        title: 'طاحونة الحبوب والمخزون الآلي - تقرير عمليات التحويل والطحن',
                        subtitle: 'بيان خروج الحبوب الخام ودخول المطحون الناتج ونسب الاستخراج',
                        metaInfo,
                        headers: exportHeaders,
                        rows: exportRows,
                        footerTotals,
                      });
                      showToast('تم تصدير تقرير الطحن بصيغة Excel (.xls) بنجاح!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    title="تصدير إلى Excel بصيغة xls"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-200" />
                    <span>تصدير إكسل (.xls)</span>
                  </button>

                  {/* Print / PDF */}
                  <button
                    type="button"
                    onClick={() => printOrSavePDF('تقرير-عمليات-الطحن-والتحويل')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                    title="طباعة أو حفظ بصيغة PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>PDF / طباعة</span>
                  </button>

                  {/* Send via WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      const avgYield =
                        totalGrainConsumed > 0
                          ? ((totalFlourProduced / totalGrainConsumed) * 100).toFixed(1)
                          : '0';
                      const summaryText =
                        `*⚙️ تقرير عمليات الطحن والتحويل*\n` +
                        `📅 الفترة: ${startDate || 'البداية'} إلى ${endDate || 'الآن'}\n` +
                        `• إجمالي الحبوب المستهلكة (خروج): -${totalGrainConsumed} كيس\n` +
                        `• إجمالي المطحون الناتج (دخول): +${totalFlourProduced} كيس\n` +
                        `• متوسط نسبة الاستخراج: ${avgYield}%\n\n` +
                        `صادر عن نظام إدارة طاحونة الحبوب الآلية`;
                      shareReportData({
                        title: 'تقرير عمليات الطحن والتحويل',
                        summaryText,
                      });
                      showToast('تم فتح خيارات إرسال تقرير الطحن!');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                    title="إرسال عبر واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>إرسال واتساب</span>
                  </button>

                  {/* CSV Export */}
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
                          'صنف الحبوب المستهلكة',
                          'الحبوب المستهلكة (خروج)',
                          'صنف المطحون الناتج',
                          'المطحون الناتج (دخول)',
                          'نسبة الاستخراج',
                        ]
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
                    title="تصدير ملف بيانات CSV"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">اسم التاجر</th>
                    <th className="p-3">حبوب مطحونة</th>
                    <th className="p-3 text-center bg-rose-50 text-rose-900 border-x border-rose-200">
                      كمية الحبوب (خروج -)
                    </th>
                    <th className="p-3">مطحون ناتج</th>
                    <th className="p-3 text-center bg-emerald-50 text-emerald-900 border-x border-emerald-200">
                      كمية المطحون (دخول +)
                    </th>
                    <th className="p-3 text-center">نسبة الاستخراج</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {flatMillingRows.length > 0 ? (
                    flatMillingRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-blue-900">{row.orderNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{row.supplierName}</td>
                        <td className="p-3 text-slate-800">{row.grainProduct}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-800 bg-rose-50/40">
                          -{row.grainQty} كيس
                        </td>
                        <td className="p-3 text-emerald-800 font-semibold">{row.flourProduct}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          +{row.flourQty} كيس
                        </td>
                        <td className="p-3 text-center font-mono text-slate-700 font-bold">{row.yieldPercent}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        لا توجد عمليات طحن تطابق محددات البحث
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={4} className="p-3 text-right font-black">
                      إجمالي الحبوب المستهلكة (خروج الحبوب):
                    </td>
                    <td className="p-3 text-center font-mono text-rose-950 font-black bg-rose-200 text-sm">
                      -{totalGrainConsumed} كيس
                    </td>
                    <td className="p-3 text-right font-black">إجمالي المطحون الناتج (دخول المطحون):</td>
                    <td className="p-3 text-center font-mono text-emerald-950 font-black bg-emerald-200 text-sm">
                      +{totalFlourProduced} كيس
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* REPORT 5.3: تقرير الصادرات وصرف المطحون (خروج المطحون) */}
        {/* ------------------------------------------------------------- */}
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
              <div className="no-print flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  حركات خروج وتسليم المطحون من الطاحونة (سندات صرف WO)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Export XLS */}
                  <button
                    type="button"
                    onClick={() => {
                      const exportHeaders = [
                        'التاريخ',
                        'رقم السند',
                        'التاجر',
                        'رقم فاتورة التاجر',
                        'اسم المستلم',
                        'الصنف المصروف',
                        'الكمية المصروفة (خروج -)',
                      ];
                      const exportRows = flatWithdrawals.map((r) => [
                        r.date,
                        r.orderNumber,
                        r.supplierName,
                        r.invoiceNumber,
                        r.receiverName,
                        r.productName,
                        r.quantity,
                      ]);
                      const footerTotals = ['الإجمالي', '', '', '', '', '', `-${totalQty} كيس مطحون`];
                      const metaInfo = [
                        { label: 'نوع التقرير', value: 'تقرير الصادرات وتسليم المطحون (سندات صرف WO)' },
                        { label: 'الفترة', value: `${startDate || 'من البداية'} إلى ${endDate || 'تاريخ اليوم'}` },
                        { label: 'إجمالي الكميات المصروفة', value: `-${totalQty} كيس مطحون` },
                        { label: 'عدد سندات الصرف', value: `${filteredWOs.length}` },
                      ];
                      exportToXLS({
                        filename: 'تقرير-الصادرات-خروج-المطحون',
                        sheetName: 'صادرات المطحون',
                        title: 'طاحونة الحبوب والمخزون الآلي - تقرير الصادرات (تسليم المطحون)',
                        subtitle: 'سجل حركات صرف وتسليم الدقيق والمطحون للعملاء وسائقي الشاحنات',
                        metaInfo,
                        headers: exportHeaders,
                        rows: exportRows,
                        footerTotals,
                      });
                      showToast('تم تصدير تقرير الصادرات بصيغة Excel (.xls) بنجاح!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    title="تصدير إلى Excel بصيغة xls"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-200" />
                    <span>تصدير إكسل (.xls)</span>
                  </button>

                  {/* Print / PDF */}
                  <button
                    type="button"
                    onClick={() => printOrSavePDF('تقرير-الصادرات-خروج-المطحون')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                    title="طباعة أو حفظ بصيغة PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>PDF / طباعة</span>
                  </button>

                  {/* Send via WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      const summaryText =
                        `*🚚 تقرير صادرات وصرف المطحون (سندات صرف WO)*\n` +
                        `📅 الفترة: ${startDate || 'البداية'} إلى ${endDate || 'الآن'}\n` +
                        `• عدد سندات الصرف: ${filteredWOs.length}\n` +
                        `• إجمالي المطحون المنصرف (خروج): *-${totalQty} كيس مطحون*\n\n` +
                        `صادر عن نظام إدارة طاحونة الحبوب الآلية`;
                      shareReportData({
                        title: 'تقرير صادرات المطحون',
                        summaryText,
                      });
                      showToast('تم فتح خيارات إرسال تقرير الصادرات!');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                    title="إرسال عبر واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>إرسال واتساب</span>
                  </button>

                  {/* CSV Export */}
                  <button
                    type="button"
                    onClick={() =>
                      handleExportCSV(
                        'تقرير-الصادرات-خروج-المطحون',
                        flatWithdrawals.map((r) => [
                          r.date,
                          r.orderNumber,
                          r.supplierName,
                          r.invoiceNumber,
                          r.receiverName,
                          r.productName,
                          r.quantity,
                        ]),
                        ['التاريخ', 'رقم السند', 'التاجر', 'رقم الفاتورة', 'المستلم', 'الصنف المصروف', 'الكمية المنصرفة']
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
                    title="تصدير ملف بيانات CSV"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">التاجر</th>
                    <th className="p-3">رقم فاتورة التاجر</th>
                    <th className="p-3">اسم المستلم</th>
                    <th className="p-3">الصنف المصروف</th>
                    <th className="p-3 text-center bg-rose-50 text-rose-900">الكمية المصروفة (خروج -)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {flatWithdrawals.length > 0 ? (
                    flatWithdrawals.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{row.date}</td>
                        <td className="p-3 font-mono font-bold text-emerald-900">{row.orderNumber}</td>
                        <td className="p-3 font-bold text-slate-900">{row.supplierName}</td>
                        <td className="p-3 font-mono text-slate-800">{row.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{row.receiverName}</td>
                        <td className="p-3 text-slate-700">{row.productName}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-800 bg-rose-50/40">
                          -{row.quantity} كيس
                        </td>
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
                    <td colSpan={6} className="p-3 text-right font-black text-slate-900">
                      إجمالي كميات المطحون المصروفة (خروج كلي من المستودع):
                    </td>
                    <td className="p-3 text-center font-mono text-rose-950 font-black bg-rose-200 text-sm">
                      -{totalQty} كيس مطحون
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}

        {/* ------------------------------------------------------------- */}
        {/* REPORT 5.4: تقرير المخزون الحالي الفعلي */}
        {/* ------------------------------------------------------------- */}
        {selectedReport === 'current_stock' && (
          <div className="space-y-4">
            <div className="no-print flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                الرصيد الفعلي الحالي في المستودع = (إجمالي الوارد - إجمالي المنصرف)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {/* Export XLS */}
                <button
                  type="button"
                  onClick={() => {
                    const exportRows: any[] = [];
                    summary.forEach((s) => {
                      const grains = s.grainStocks.map((g) => `${g.product_name}: ${g.quantity}`).join(' | ');
                      const flours = s.flourStocks.map((f) => `${f.product_name}: ${f.quantity}`).join(' | ');
                      exportRows.push([s.supplier_name, s.phone || '', grains, s.totalGrain, flours, s.totalFlour]);
                    });
                    const totalGrainAll = summary.reduce((s, x) => s + (x?.totalGrain || 0), 0);
                    const totalFlourAll = summary.reduce((s, x) => s + (x?.totalFlour || 0), 0);
                    const footerTotals = [
                      'الإجمالي العام للمستودع',
                      '',
                      'إجمالي الحبوب الخام',
                      `${totalGrainAll} كيس`,
                      'إجمالي المطحون الجاهز',
                      `${totalFlourAll} كيس`,
                    ];
                    const metaInfo = [
                      { label: 'نوع التقرير', value: 'تقرير أرصدة المخزون الفعلي الحالي' },
                      { label: 'تاريخ التقرير', value: new Date().toLocaleDateString('ar-EG') },
                      { label: 'إجمالي الحبوب بالمستودع', value: `${totalGrainAll} كيس` },
                      { label: 'إجمالي المطحون بالمستودع', value: `${totalFlourAll} كيس` },
                    ];
                    exportToXLS({
                      filename: 'تقرير-المخزون-الفعلي-الحالي',
                      sheetName: 'المخزون الحالي',
                      title: 'طاحونة الحبوب والمخزون الآلي - تقرير المخزون الفعلي الحالي',
                      subtitle: 'الأرصدة الصافية المتوفرة بمستودعات الحبوب والمطحون لكل تاجر',
                      metaInfo,
                      headers: ['التاجر', 'الهاتف', 'أصناف الحبوب', 'إجمالي الحبوب', 'أصناف المطحون', 'إجمالي المطحون'],
                      rows: exportRows,
                      footerTotals,
                    });
                    showToast('تم تصدير تقرير المخزون بصيغة Excel (.xls) بنجاح!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  title="تصدير إلى Excel بصيغة xls"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-200" />
                  <span>تصدير إكسل (.xls)</span>
                </button>

                {/* Print / PDF */}
                <button
                  type="button"
                  onClick={() => printOrSavePDF('تقرير-المخزون-الفعلي-الحالي')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
                  title="طباعة أو حفظ بصيغة PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>PDF / طباعة</span>
                </button>

                {/* Send via WhatsApp */}
                <button
                  type="button"
                  onClick={() => {
                    const totalGrainAll = summary.reduce((s, x) => s + (x?.totalGrain || 0), 0);
                    const totalFlourAll = summary.reduce((s, x) => s + (x?.totalFlour || 0), 0);
                    const summaryText =
                      `*📦 تقرير المخزون الفعلي الحالي بالطاحونة*\n` +
                      `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n` +
                      `• عدد التجار أصحاب الأمانات: ${summary.length}\n` +
                      `• *إجمالي أرصدة الحبوب الخام: ${totalGrainAll} كيس*\n` +
                      `• *إجمالي أرصدة المطحون الجاهز: ${totalFlourAll} كيس*\n\n` +
                      `صادر عن نظام إدارة طاحونة الحبوب الآلية`;
                    shareReportData({
                      title: 'تقرير المخزون الفعلي الحالي',
                      summaryText,
                    });
                    showToast('تم فتح خيارات إرسال تقرير المخزون!');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                  title="إرسال عبر واتساب"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>إرسال واتساب</span>
                </button>

                {/* CSV Export */}
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-xs cursor-pointer"
                  title="تصدير ملف بيانات CSV"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-3">اسم التاجر</th>
                  <th className="p-3">أصناف الحبوب المتاحة</th>
                  <th className="p-3 text-center bg-amber-50">إجمالي الحبوب</th>
                  <th className="p-3">أصناف المطحون المتاحة</th>
                  <th className="p-3 text-center bg-emerald-50">إجمالي المطحون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {summary.map((s) => (
                  <tr key={s.supplier_id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">
                      {s.supplier_name}
                      <span className="block text-[10px] text-slate-500 font-normal">{s.phone}</span>
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
                                {g.quantity < 0 && ' (مديونية)'}
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
                          ? 'text-rose-700 bg-rose-50 border-x border-rose-200'
                          : 'text-amber-900 bg-amber-50/40'
                      }`}
                    >
                      {s.totalGrain} كيس
                      {s.totalGrain < 0 && <span className="block text-[9px] text-rose-600">(مديونية على التاجر)</span>}
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
                          ? 'text-rose-700 bg-rose-50 border-x border-rose-200'
                          : 'text-emerald-900 bg-emerald-50/40'
                      }`}
                    >
                      {s.totalFlour} كيس
                      {s.totalFlour < 0 && <span className="block text-[9px] text-rose-600">(مديونية)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                <tr>
                  <td colSpan={2} className="p-3 text-right font-black text-slate-900">
                    إجمالي أرصدة الحبوب الفعلية بالطاحونة:
                  </td>
                  <td className="p-3 text-center font-mono text-amber-950 font-black text-sm bg-amber-200">
                    {(summary || []).reduce((s, x) => s + (x?.totalGrain || 0), 0)} كيس
                  </td>
                  <td className="p-3 text-right font-black text-slate-900">
                    إجمالي أرصدة المطحون الفعلية الجاهزة:
                  </td>
                  <td className="p-3 text-center font-mono text-emerald-950 font-black text-sm bg-emerald-200">
                    {(summary || []).reduce((s, x) => s + (x?.totalFlour || 0), 0)} كيس
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
