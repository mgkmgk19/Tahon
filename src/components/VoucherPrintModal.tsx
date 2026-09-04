import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Calendar,
  FileText,
  Download,
  Share2,
  Wheat,
  Factory,
  PackageCheck,
  Send,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { PurchaseOrder, MillingOrder, WithdrawalOrder, Supplier } from '../types';
import { millDb } from '../db/millDatabase';
import { exportToXLS, printOrSavePDF, shareReportData, numberToArabicWords } from '../utils/exportUtils';

interface VoucherPrintModalProps {
  type?: 'PO' | 'MO' | 'WO';
  voucherType?: 'PO' | 'MO' | 'WO';
  order: PurchaseOrder | MillingOrder | WithdrawalOrder | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const VoucherPrintModal: React.FC<VoucherPrintModalProps> = ({
  type,
  voucherType,
  order,
  isOpen = true,
  onClose,
}) => {
  const [enrichedOrder, setEnrichedOrder] = useState<any>(order);
  const [supplierInfo, setSupplierInfo] = useState<Supplier | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Detect effective document type safely
  const effectiveType: 'PO' | 'MO' | 'WO' =
    type ||
    voucherType ||
    (order?.order_number?.startsWith('PO')
      ? 'PO'
      : order?.order_number?.startsWith('MO')
      ? 'MO'
      : order?.order_number?.startsWith('WO')
      ? 'WO'
      : order && 'invoice_number' in order
      ? 'WO'
      : 'PO');

  // Ensure full items are loaded and enriched if order.items is missing or incomplete
  useEffect(() => {
    let isMounted = true;

    async function loadFullOrderDetails() {
      if (!order) return;

      try {
        let fullOrder = order;

        // If items are missing or empty, fetch from database
        if (!order.items || order.items.length === 0) {
          if (effectiveType === 'PO') {
            const allPOs = await millDb.getPurchaseOrders();
            const found = allPOs.find((p) => p.id === order.id || p.order_number === order.order_number);
            if (found) fullOrder = found;
          } else if (effectiveType === 'MO') {
            const allMOs = await millDb.getMillingOrders();
            const found = allMOs.find((m) => m.id === order.id || m.order_number === order.order_number);
            if (found) fullOrder = found;
          } else if (effectiveType === 'WO') {
            const allWOs = await millDb.getWithdrawalOrders();
            const found = allWOs.find((w) => w.id === order.id || w.order_number === order.order_number);
            if (found) fullOrder = found;
          }
        }

        if (isMounted) {
          setEnrichedOrder(fullOrder);

          // Also fetch supplier details if available
          const supplierId = (fullOrder as any).supplier_id;
          if (supplierId) {
            const sup = await millDb.getSupplierById(supplierId);
            if (sup && isMounted) {
              setSupplierInfo(sup);
            }
          }
        }
      } catch (err) {
        console.error('Error enriching voucher order details:', err);
        if (isMounted) setEnrichedOrder(order);
      }
    }

    loadFullOrderDetails();

    return () => {
      isMounted = false;
    };
  }, [order, effectiveType]);

  // Handle ESC key press to close modal cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order || isOpen === false) return null;

  const currentOrder = enrichedOrder || order;

  const getTitle = () => {
    switch (effectiveType) {
      case 'PO':
        return 'سند استلام وتوريد حبوب';
      case 'MO':
        return 'إذن تشغيل وتحويل طحن';
      case 'WO':
        return 'سند صرف وتسليم مطحون';
    }
  };

  const getDocumentDescription = () => {
    switch (effectiveType) {
      case 'PO':
        return 'وثيقة رسمية تفيد باستلام وتفريغ شحنة حبوب كأمانة لحساب التاجر المورد بمستودعات الطاحونة';
      case 'MO':
        return 'إذن تحويل خط الإنتاج لطحن حبوب خام وإنتاج أكياس دقيق ومطحون وفق المعايير المعتمدة';
      case 'WO':
        return 'وثيقة رسمية تفيد بصرف وخروج كميات مطحون معتمدة ومطابقة لفاتورة التاجر وإقرار الاستلام';
    }
  };

  // Compute items & totals
  const poItems = (effectiveType === 'PO' ? (currentOrder as PurchaseOrder).items : []) || [];
  const moItems = (effectiveType === 'MO' ? (currentOrder as MillingOrder).items : []) || [];
  const woItems = (effectiveType === 'WO' ? (currentOrder as WithdrawalOrder).items : []) || [];

  const totalPoQuantity = poItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const totalMoGrain = moItems.reduce((s, i) => s + (Number(i.grain_quantity) || 0), 0);
  const totalMoFlour = moItems.reduce((s, i) => s + (Number(i.flour_quantity) || 0), 0);
  const totalWoQuantity = woItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  // Export Voucher to .xls format
  const handleExportXls = () => {
    const filename = `${getTitle()}-${currentOrder.order_number}`;

    const metaInfo: { label: string; value: string | number }[] = [
      { label: 'رقم السند', value: currentOrder.order_number },
      { label: 'تاريخ السند', value: currentOrder.date },
      { label: 'وقت التوثيق', value: currentOrder.created_at || '-' },
      { label: 'الموظف المسؤول', value: currentOrder.created_by || 'موظف النظام' },
    ];

    if (effectiveType === 'PO' || effectiveType === 'WO') {
      metaInfo.push({
        label: 'اسم التاجر',
        value: (currentOrder as any).supplier_name || supplierInfo?.name || '-',
      });
      if (supplierInfo?.phone) {
        metaInfo.push({ label: 'هاتف التاجر', value: supplierInfo.phone });
      }
    }

    if (effectiveType === 'WO') {
      metaInfo.push({
        label: 'رقم فاتورة التاجر المرجعية',
        value: (currentOrder as WithdrawalOrder).invoice_number || '-',
      });
      metaInfo.push({
        label: 'اسم المستلم الفعلي',
        value: (currentOrder as WithdrawalOrder).receiver_name || '-',
      });
    }

    if (effectiveType === 'PO') {
      const headers = ['م', 'صنف الحبوب المورّدة', 'الوحدة', 'الكمية المستلمة (أكياس)'];
      const rows = poItems.map((item, idx) => [
        idx + 1,
        item.product_name || `صنف #${item.product_id}`,
        item.unit || 'كيس خيش',
        item.quantity,
      ]);
      const footerTotals = ['الإجمالي', '', '', `${totalPoQuantity} كيس`];

      exportToXLS({
        filename,
        sheetName: 'سند توريد',
        title: 'طاحونة الحبوب والمخزون الآلي - سند استلام وتوريد حبوب',
        subtitle: getDocumentDescription(),
        metaInfo,
        headers,
        rows,
        footerTotals,
      });
    } else if (effectiveType === 'MO') {
      const headers = [
        'م',
        'التاجر',
        'صنف الحبوب الخام',
        'كمية الحبوب (كيس)',
        'صنف المطحون الناتج',
        'كمية المطحون (كيس)',
        'نسبة الاستخراج',
      ];
      const rows = moItems.map((item, idx) => {
        const yieldPct =
          item.grain_quantity > 0 ? Math.round((item.flour_quantity / item.grain_quantity) * 100) : 0;
        return [
          idx + 1,
          item.supplier_name || '-',
          item.grain_product_name || '-',
          item.grain_quantity,
          item.flour_product_name || '-',
          item.flour_quantity,
          `${yieldPct}%`,
        ];
      });
      const avgYield =
        totalMoGrain > 0 ? Math.round((totalMoFlour / totalMoGrain) * 100) : 0;
      const footerTotals = [
        'الإجمالي',
        '',
        '',
        `${totalMoGrain} كيس حبوب`,
        '',
        `${totalMoFlour} كيس مطحون`,
        `متوسط الاستخراج: ${avgYield}%`,
      ];

      exportToXLS({
        filename,
        sheetName: 'أمر طحن',
        title: 'طاحونة الحبوب والمخزون الآلي - إذن تشغيل وتحويل طحن',
        subtitle: getDocumentDescription(),
        metaInfo,
        headers,
        rows,
        footerTotals,
      });
    } else if (effectiveType === 'WO') {
      const headers = ['م', 'صنف المطحون المصروف', 'الوحدة', 'الكمية المصروفة (أكياس)'];
      const rows = woItems.map((item, idx) => [
        idx + 1,
        item.product_name || `صنف #${item.product_id}`,
        item.unit || 'كيس مطحون',
        item.quantity,
      ]);
      const footerTotals = ['إجمالي الكمية المصروفة', '', '', `${totalWoQuantity} كيس`];

      exportToXLS({
        filename,
        sheetName: 'سند صرف',
        title: 'طاحونة الحبوب والمخزون الآلي - سند صرف وتسليم مطحون',
        subtitle: getDocumentDescription(),
        metaInfo,
        headers,
        rows,
        footerTotals,
      });
    }
  };

  // Share via WhatsApp / Native Share
  const handleShare = async () => {
    let summaryText = `*طاحونة الحبوب والمخزون الآلي*\n`;
    summaryText += `*${getTitle()}* - رقم: ${currentOrder.order_number}\n`;
    summaryText += `التاريخ: ${currentOrder.date}\n`;

    if (effectiveType === 'PO') {
      summaryText += `التاجر المورّد: ${(currentOrder as PurchaseOrder).supplier_name}\n`;
      summaryText += `الأصناف المورّدة:\n`;
      poItems.forEach((i, idx) => {
        summaryText += `  ${idx + 1}. ${i.product_name}: ${i.quantity} كيس\n`;
      });
      summaryText += `\nإجمالي التوريد: ${totalPoQuantity} كيس (${numberToArabicWords(totalPoQuantity)})\n`;
    } else if (effectiveType === 'MO') {
      summaryText += `إذن تشغيل طحن حبوب:\n`;
      moItems.forEach((i, idx) => {
        summaryText += `  ${idx + 1}. ${i.supplier_name}: طحن ${i.grain_quantity} كيس (${i.grain_product_name}) ➔ إنتاج ${i.flour_quantity} كيس (${i.flour_product_name})\n`;
      });
      summaryText += `\nإجمالي حبوب: ${totalMoGrain} كيس | إجمالي مطحون: ${totalMoFlour} كيس\n`;
    } else if (effectiveType === 'WO') {
      summaryText += `التاجر: ${(currentOrder as WithdrawalOrder).supplier_name}\n`;
      summaryText += `رقم الفاتورة: ${(currentOrder as WithdrawalOrder).invoice_number}\n`;
      summaryText += `المستلم الفعلي: ${(currentOrder as WithdrawalOrder).receiver_name}\n`;
      summaryText += `الأصناف المصروفة:\n`;
      woItems.forEach((i, idx) => {
        summaryText += `  ${idx + 1}. ${i.product_name}: ${i.quantity} كيس\n`;
      });
      summaryText += `\nإجمالي الكمية المصروفة: ${totalWoQuantity} كيس (${numberToArabicWords(totalWoQuantity)})\n`;
    }

    if (currentOrder.notes) {
      summaryText += `ملاحظات: ${currentOrder.notes}\n`;
    }
    summaryText += `\nتوثيق رسمي صادر عن نظام إدارة الطاحونة`;

    await shareReportData({
      title: `${getTitle()} - ${currentOrder.order_number}`,
      summaryText,
      whatsappPhone: supplierInfo?.phone,
    });

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const handlePrintPdf = () => {
    printOrSavePDF(`${getTitle()}-${currentOrder.order_number}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Controls Toolbar (Hidden when printing) */}
        <div className="no-print shrink-0 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 shadow-md">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              {effectiveType === 'PO' && <Wheat className="w-5 h-5" />}
              {effectiveType === 'MO' && <Factory className="w-5 h-5" />}
              {effectiveType === 'WO' && <PackageCheck className="w-5 h-5" />}
            </span>
            <div>
              <span className="font-bold text-sm block">{getTitle()}</span>
              <span className="text-[11px] font-mono text-amber-300/90">{currentOrder.order_number}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Print */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              title="طباعة السند على الورق"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>

            {/* Print / Save to PDF */}
            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition border border-slate-700 cursor-pointer"
              title="تصدير السند بصيغة PDF"
            >
              <Download className="w-4 h-4 text-rose-400" />
              <span>حفظ PDF</span>
            </button>

            {/* Export to Excel (.xls) */}
            <button
              type="button"
              onClick={handleExportXls}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
              title="تصدير السند بجدول الأصناف إلى Excel بصيغة xls"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>إكسل (.xls)</span>
            </button>

            {/* Share / WhatsApp */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
              title="إرسال بيانات السند إلى واتساب أو مشاركتها"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة واتساب</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition mr-1 cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Share notification toast */}
        {copiedNotification && (
          <div className="no-print bg-emerald-50 text-emerald-900 border-b border-emerald-200 px-4 py-2 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تم فتح خيارات المشاركة وتجهيز ملخص السند لإرساله بنجاح!</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* Printable Official Voucher Paper Content                      */}
        {/* ============================================================ */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white border border-slate-100 min-h-[500px] flex flex-col justify-between"
          id="printable-voucher"
        >
          <div>
            {/* Header: Mill Name & Document Metadata */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-amber-800 print:text-black" />
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">طاحونة الحبوب والمخزون الآلي</h1>
                </div>
                <p className="text-xs font-medium text-slate-600 mt-1">
                  إدارة المطاحن والصوامع الحديثة • أنظمة التوريد والطحن والتوزيع المعتمدة
                </p>
                <div className="text-[11px] text-slate-500 mt-0.5 space-x-3 space-x-reverse font-medium">
                  <span>هاتف الإدارة والمستودع: 0551234567</span>
                  <span>|</span>
                  <span>السجل التجاري: 101089201</span>
                </div>
              </div>

              <div className="text-left">
                <div className="inline-block bg-slate-50 border-2 border-slate-800 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                  <span className="text-xs text-amber-900 print:text-black font-extrabold block">{getTitle()}</span>
                  <span className="font-mono text-base font-black text-slate-900">{currentOrder.order_number}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-1 justify-end font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ السند: </span>
                  <strong className="font-mono text-slate-900">{currentOrder.date}</strong>
                </div>
                {currentOrder.created_at && (
                  <div className="text-[10px] text-slate-400 text-left font-mono mt-0.5">
                    وقت التوثيق: {currentOrder.created_at}
                  </div>
                )}
              </div>
            </div>

            {/* Document Statement Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 text-xs text-slate-700 flex items-start gap-2">
              <span className="font-bold text-slate-900 shrink-0">الغرض من المستند:</span>
              <span className="leading-relaxed">{getDocumentDescription()}</span>
            </div>

            {/* Document Specific Header Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 rounded-xl mb-5 text-xs border border-slate-200">
              {effectiveType === 'PO' && (
                <>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block">اسم التاجر المورّد:</span>
                    <strong className="text-slate-900 text-sm font-black block mt-0.5">
                      {(currentOrder as PurchaseOrder).supplier_name || supplierInfo?.name || 'غير محدد'}
                    </strong>
                    {supplierInfo?.phone && (
                      <span className="text-[11px] text-slate-500 font-mono block">هاتف: {supplierInfo.phone}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block">أمين الاستقبال:</span>
                    <span className="text-slate-800 font-bold block mt-0.5">
                      {(currentOrder as PurchaseOrder).created_by || 'أمين المستودع'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">حالة الشحنة:</span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      مستلمة ومطابقة
                    </span>
                  </div>
                </>
              )}

              {effectiveType === 'MO' && (
                <>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block">نوع العملية الصناعية:</span>
                    <strong className="text-slate-900 text-sm font-black block mt-0.5">
                      طحن حبوب خام وإنتاج دقيق
                    </strong>
                    <span className="text-[11px] text-slate-500 block">خط الطحن والغربلة الآلي</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">المسؤول عن التشغيل:</span>
                    <span className="text-slate-800 font-bold block mt-0.5">
                      {(currentOrder as MillingOrder).created_by || 'مدير التشغيل'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">حالة الأمر:</span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[11px]">
                      منفّذ بالكامل
                    </span>
                  </div>
                </>
              )}

              {effectiveType === 'WO' && (
                <>
                  <div>
                    <span className="text-slate-500 block">التاجر صاحب الحساب:</span>
                    <strong className="text-slate-900 text-sm font-black block mt-0.5">
                      {(currentOrder as WithdrawalOrder).supplier_name || supplierInfo?.name || 'غير محدد'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">رقم فاتورة التاجر (المرجع):</span>
                    <strong className="text-amber-800 print:text-black font-mono text-sm font-black block mt-0.5">
                      {(currentOrder as WithdrawalOrder).invoice_number || 'بدون فاتورة'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">اسم المستلم الفعلي:</span>
                    <strong className="text-slate-900 text-sm font-black block mt-0.5">
                      {(currentOrder as WithdrawalOrder).receiver_name || 'العميل شخصياً'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">أمين الصرف:</span>
                    <span className="text-slate-800 font-bold block mt-0.5">
                      {(currentOrder as WithdrawalOrder).created_by || 'موظف التسليم'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ============================================================ */}
            {/* FULL ITEMS TABLE (Never hidden, exact document breakdown)     */}
            {/* ============================================================ */}
            <div className="overflow-hidden border border-slate-300 rounded-xl mb-5 shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-300 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-800" />
                  <span>بيان وتفاصيل الأصناف المدرجة بالسند:</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {effectiveType === 'PO' && `${poItems.length} صنف مورد`}
                  {effectiveType === 'MO' && `${moItems.length} عملية تحويل`}
                  {effectiveType === 'WO' && `${woItems.length} صنف مصروف`}
                </span>
              </div>

              {/* TABLE FOR PO (توريد حبوب) */}
              {effectiveType === 'PO' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                    <tr>
                      <th className="p-3 w-12 text-center">م</th>
                      <th className="p-3">صنف الحبوب المورّدة</th>
                      <th className="p-3 text-center w-28">الوحدة</th>
                      <th className="p-3 text-center w-36">الكمية المستلمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {poItems.length > 0 ? (
                      poItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <strong className="text-slate-900 block text-sm">
                              {item.product_name || `صنف #${item.product_id}`}
                            </strong>
                            <span className="text-[10px] text-slate-400">حبوب خام معتمدة للتخزين والطحن</span>
                          </td>
                          <td className="p-3 text-center text-slate-600 font-semibold">{item.unit || 'كيس خيش'}</td>
                          <td className="p-3 text-center font-black text-amber-900 font-mono text-base">
                            {item.quantity}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                          لا توجد أصناف مسجلة في هذا السند
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right text-slate-900 font-black text-sm">
                        إجمالي عدد الأكياس المورّدة:
                      </td>
                      <td className="p-3 text-center text-lg text-amber-900 font-mono font-black bg-amber-100/60">
                        {totalPoQuantity} كيس
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-2.5 bg-amber-50/80 text-amber-950 text-[11px] text-right">
                        <strong>التفقيط المالي والمحاسبي: </strong>
                        <span className="font-semibold">{numberToArabicWords(totalPoQuantity)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* TABLE FOR MO (طحن وتحويل) */}
              {effectiveType === 'MO' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                    <tr>
                      <th className="p-2.5 w-10 text-center">م</th>
                      <th className="p-2.5">التاجر صاحب الأمانة</th>
                      <th className="p-2.5">صنف الحبوب الخام</th>
                      <th className="p-2.5 text-center">حبوب مستهلكة</th>
                      <th className="p-2.5">صنف المطحون الناتج</th>
                      <th className="p-2.5 text-center">مطحون ناتج</th>
                      <th className="p-2.5 text-center">نسبة الاستخراج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {moItems.length > 0 ? (
                      moItems.map((item, idx) => {
                        const yieldPercent =
                          item.grain_quantity > 0
                            ? Math.round((item.flour_quantity / item.grain_quantity) * 100)
                            : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{item.supplier_name}</td>
                            <td className="p-2.5 text-slate-700">{item.grain_product_name}</td>
                            <td className="p-2.5 text-center font-bold text-rose-800 font-mono">
                              {item.grain_quantity} كيس
                            </td>
                            <td className="p-2.5 text-emerald-900 font-bold">{item.flour_product_name}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-700 font-mono">
                              {item.flour_quantity} كيس
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  yieldPercent >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {yieldPercent}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                          لا توجد عمليات طحن مسجلة في هذا الإذن
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right font-black text-slate-900">
                        إجمالي كميات التحويل:
                      </td>
                      <td className="p-2.5 text-center font-mono text-rose-900 font-black bg-rose-50">
                        {totalMoGrain} كيس حبوب
                      </td>
                      <td></td>
                      <td className="p-2.5 text-center font-mono text-emerald-900 font-black bg-emerald-50">
                        {totalMoFlour} كيس مطحون
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-800 font-black">
                        {totalMoGrain > 0 ? `${Math.round((totalMoFlour / totalMoGrain) * 100)}%` : '0%'}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={7} className="p-2 bg-amber-50/70 text-amber-950 text-[11px] text-right">
                        <strong>التفقيط: </strong>
                        <span>
                          استهلاك {numberToArabicWords(totalMoGrain)} حبوب خام، نتج عنها{' '}
                          {numberToArabicWords(totalMoFlour)} دقيق مطحون.
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* TABLE FOR WO (صرف وتسليم مطحون) */}
              {effectiveType === 'WO' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                    <tr>
                      <th className="p-3 w-12 text-center">م</th>
                      <th className="p-3">صنف المطحون المصروف والمسلّم</th>
                      <th className="p-3 text-center w-28">الوحدة</th>
                      <th className="p-3 text-center w-36">الكمية المصروفة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {woItems.length > 0 ? (
                      woItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <strong className="text-slate-900 block text-sm">
                              {item.product_name || `صنف #${item.product_id}`}
                            </strong>
                            <span className="text-[10px] text-slate-400">
                              صنف مطحون جاهز للاستهلاك والتوزيع
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-600 font-semibold">{item.unit || 'كيس مطحون'}</td>
                          <td className="p-3 text-center font-black text-amber-900 font-mono text-base">
                            {item.quantity}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                          لا توجد أصناف مسجلة في هذا السند
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right text-slate-900 font-black text-sm">
                        إجمالي الكمية المصروفة:
                      </td>
                      <td className="p-3 text-center text-lg text-amber-900 font-mono font-black bg-amber-100/60">
                        {totalWoQuantity} كيس
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="p-2.5 bg-amber-50/80 text-amber-950 text-[11px] text-right">
                        <strong>التفقيط المالي والمحاسبي: </strong>
                        <span className="font-semibold">{numberToArabicWords(totalWoQuantity)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Notes Section */}
            {currentOrder.notes && (
              <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-black text-slate-900 block mb-1">
                  {effectiveType === 'MO' ? 'توجيهات ومبررات التشغيل:' : 'ملاحظات وتفاصيل إضافية:'}
                </span>
                <p className="text-slate-700 whitespace-pre-wrap font-medium">{currentOrder.notes}</p>
              </div>
            )}

            {/* Legal / Receipt Acknowledgment Statement */}
            <div className="p-2.5 bg-slate-50/60 border border-dashed border-slate-300 rounded-xl mb-6 text-[11px] text-slate-600 leading-relaxed">
              {effectiveType === 'WO' && (
                <span>
                  <strong>إقرار استلام البضاعة:</strong> أقر أنا المستلم الموضحة بياناتي أعلاه بأنني استلمت الأصناف والكميات المبينة في هذا السند كاملة وسليمة وبحالة ممتازة ومطابقة للمواصفات وفاتورة التاجر المعتمدة، وبذلك أبرأت ذمة إدارة الطاحونة من هذه الكميات.
                </span>
              )}
              {effectiveType === 'PO' && (
                <span>
                  <strong>إقرار استلام الأمانة:</strong> تقر إدارة المستودع والطاحونة باستلام كميات الحبوب المبينة أعلاه ووضعها كأمانة تحت تصرف التاجر المورد للتشغيل أو الصرف طبقاً لسجلات النظام المحاسبي.
                </span>
              )}
              {effectiveType === 'MO' && (
                <span>
                  <strong>محضر التشغيل:</strong> تم تنفيذ عملية الطحن وفقاً لطلب التاجر وتعليمات التشغيل الصناعي ونسب الاستخراج القياسية الموضحة أعلاه، وتم إيداع المطحون الناتج بحساب التاجر بالمستودع.
                </span>
              )}
            </div>
          </div>

          {/* Official Signatures Section */}
          <div className="border-t-2 border-slate-800 pt-5 mt-2">
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                <span className="font-black text-slate-800 block mb-10">
                  {effectiveType === 'WO'
                    ? 'توقيع المستلم الفعلي'
                    : effectiveType === 'PO'
                    ? 'توقيع السائق / المورد'
                    : 'فني خط الطحن'}
                </span>
                <span className="block border-t border-slate-300 pt-1 text-slate-400 text-[10px]">
                  الاسم والتوقيع: ............................
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                <span className="font-black text-slate-800 block mb-10">مسؤول المستودع والطاحونة</span>
                <span className="block border-t border-slate-300 pt-1 text-slate-400 text-[10px]">
                  التوقيع والختم: ............................
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
                <span className="font-black text-slate-800 block mb-10">اعتماد الإدارة العامة</span>
                <span className="block border-t border-slate-300 pt-1 text-slate-400 text-[10px]">
                  الختم الرسمي للطاحونة
                </span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 mt-3 font-mono">
              مستند معتمد صادر آلياً عبر نظام إدارة الطاحونة والمخزون المحلي (Offline-First) • {currentOrder.created_at || currentOrder.date}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Controls Bar (Hidden when printing) */}
        <div className="no-print shrink-0 sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-900 text-white border-t border-slate-800 shadow-lg">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs text-amber-300 font-bold">السند جاهز للطباعة والتصدير المباشر</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند</span>
            </button>

            <button
              type="button"
              onClick={handleExportXls}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>إكسل (.xls)</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>واتساب</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>إغلاق المعاينة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
