import React from 'react';
import {
  Wheat,
  Factory,
  PackageCheck,
  Users,
  ArrowDownLeft,
  RefreshCw,
  ArrowUpRight,
  AlertCircle,
  TrendingUp,
  Clock,
  Printer,
  ChevronLeft,
} from 'lucide-react';
import {
  Supplier,
  Product,
  StockSummaryRow,
  PurchaseOrder,
  MillingOrder,
  WithdrawalOrder,
  UserRole,
} from '../types';

interface DashboardViewProps {
  summary?: StockSummaryRow[];
  suppliers?: Supplier[];
  products?: Product[];
  purchaseOrders?: PurchaseOrder[];
  millingOrders?: MillingOrder[];
  withdrawalOrders?: WithdrawalOrder[];
  currentRole?: UserRole;
  onNavigate?: (tab: 'purchase' | 'milling' | 'withdrawal' | 'stock' | 'reports' | 'android') => void;
  onOpenNewPO?: () => void;
  onOpenNewMO?: () => void;
  onOpenNewWO?: () => void;
  onViewVoucher?: (type: 'PO' | 'MO' | 'WO', order: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary = [],
  suppliers = [],
  products = [],
  purchaseOrders = [],
  millingOrders = [],
  withdrawalOrders = [],
  currentRole = 'مدير',
  onNavigate = (_tab: 'purchase' | 'milling' | 'withdrawal' | 'stock' | 'reports' | 'android') => {},
  onOpenNewPO = () => {},
  onOpenNewMO = () => {},
  onOpenNewWO = () => {},
  onViewVoucher = (_type: 'PO' | 'MO' | 'WO', _order: any) => {},
}) => {
  const safeSummary = Array.isArray(summary) ? summary : [];
  const totalGrainBags = safeSummary.reduce((sum, row) => sum + (row?.totalGrain || 0), 0);
  const totalFlourBags = safeSummary.reduce((sum, row) => sum + (row?.totalFlour || 0), 0);
  const totalOps = (purchaseOrders?.length || 0) + (millingOrders?.length || 0) + (withdrawalOrders?.length || 0);

  const canCreate = currentRole === 'مدير' || currentRole === 'موظف';

  // Combine recent operations for an activity timeline
  const recentTimeline = [
    ...(purchaseOrders || []).slice(0, 5).map((po) => ({
      id: `po-${po.id}`,
      type: 'PO' as const,
      title: `توريد حبوب (${po.total_quantity || 0} كيس)`,
      sub: `التاجر: ${po.supplier_name || ''}`,
      date: po.date,
      time: po.created_at?.split(' ')[1] || '',
      num: po.order_number,
      order: po,
    })),
    ...(millingOrders || []).slice(0, 5).map((mo) => ({
      id: `mo-${mo.id}`,
      type: 'MO' as const,
      title: `طحن وتحويل (${mo.total_grain || 0} كيس حبوب ➔ ${mo.total_flour || 0} كيس مطحون)`,
      sub: `${mo.items?.length || 1} عمليات طحن مجمعة`,
      date: mo.date,
      time: mo.created_at?.split(' ')[1] || '',
      num: mo.order_number,
      order: mo,
    })),
    ...(withdrawalOrders || []).slice(0, 5).map((wo) => ({
      id: `wo-${wo.id}`,
      type: 'WO' as const,
      title: `صرف مطحون (${wo.total_quantity || 0} كيس)`,
      sub: `التاجر: ${wo.supplier_name || ''} | المستلم: ${wo.receiver_name || ''}`,
      date: wo.date,
      time: wo.created_at?.split(' ')[1] || '',
      num: wo.order_number,
      order: wo,
    })),
  ]
    .sort((a, b) => b.order.id - a.order.id)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 text-white rounded-2xl p-5 sm:p-6 shadow-md shadow-amber-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">لوحة القيادة المباشرة</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">مرحباً بك في نظام إدارة الطاحونة</h2>
            <p className="text-xs sm:text-sm text-amber-200/90 mt-1 max-w-xl">
              النظام يعمل محلياً بالكامل بصلاحية ({currentRole}). يمكنك استلام وتوريد الحبوب، تحويلها إلى مطحون، وصرفها للتجار مع تحديث المخزون لحظياً.
            </p>
          </div>

          {/* Action buttons */}
          {canCreate && (
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                type="button"
                onClick={onOpenNewPO}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ توريد حبوب</span>
              </button>
              <button
                type="button"
                onClick={onOpenNewMO}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-amber-50 text-amber-900 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>+ طحن وتحويل</span>
              </button>
              <button
                type="button"
                onClick={onOpenNewWO}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-amber-600/60 shadow-md transition active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ صرف مطحون</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Grain Stock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">رصيد الحبوب المتاح</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Wheat className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalGrainBags}</span>
            <span className="text-xs font-semibold text-slate-500">كيس حبوب</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-800 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>موزعة على {suppliers.length} تجار</span>
          </div>
        </div>

        {/* Flour Stock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">رصيد المطحون الجاهز</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalFlourBags}</span>
            <span className="text-xs font-semibold text-slate-500">كيس مطحون</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-800 font-medium flex items-center gap-1">
            <Factory className="w-3.5 h-3.5" />
            <span>جاهز للصرف والتسليم</span>
          </div>
        </div>

        {/* Suppliers Count */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">التجار المسجلون</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{suppliers.length}</span>
            <span className="text-xs font-semibold text-slate-500">تاجر نشط</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('stock')}
            className="mt-2 text-[11px] text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 text-right"
          >
            <span>استعراض حسابات التجار</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>

        {/* Total Orders Logged */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">سجل العمليات الإجمالي</span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalOps}</span>
            <span className="text-xs font-semibold text-slate-500">مستند مسجل</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="mt-2 text-[11px] text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1 text-right"
          >
            <span>الاطلاع على تقارير الطاحونة</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Content Split: Live Stock by Supplier & Recent Operations Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Stock Overview by Supplier */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">المخزون الفعلي للتجار (حبوب ومطحون)</h3>
              <p className="text-xs text-slate-500 mt-0.5">متابعة فورية لأرصدة الحبوب المدخلة والمطحون المتاح لكل تاجر</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('stock')}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/60 transition"
            >
              <span>إدارة المخزون والتجار</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {summary.map((supplierRow) => (
              <div
                key={supplierRow.supplier_id}
                className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-200/60 text-amber-900 font-bold text-xs flex items-center justify-center">
                      {supplierRow.supplier_name.substring(0, 1)}
                    </div>
                    <div>
                      <strong className="text-sm text-slate-900 block">{supplierRow.supplier_name}</strong>
                      <span className="text-[11px] text-slate-500">{supplierRow.phone || 'بدون هاتف'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md font-bold">
                      🌾 حبوب: {supplierRow.totalGrain} كيس
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-md font-bold">
                      📦 مطحون: {supplierRow.totalFlour} كيس
                    </span>
                  </div>
                </div>

                {/* Detailed Pills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold mb-1">تفاصيل الحبوب:</span>
                    {supplierRow.grainStocks.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {supplierRow.grainStocks.map((g) => (
                          <span
                            key={g.product_id}
                            className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 text-[11px]"
                          >
                            {g.product_name}: <strong className="font-mono text-amber-900">{g.quantity}</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">لا يوجد رصيد حبوب</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold mb-1">تفاصيل المطحون:</span>
                    {supplierRow.flourStocks.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {supplierRow.flourStocks.map((f) => (
                          <span
                            key={f.product_id}
                            className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 text-[11px]"
                          >
                            {f.product_name}: <strong className="font-mono text-emerald-900">{f.quantity}</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">لا يوجد مطحون جاهز</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Recent Operations Timeline */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">سجل أحدث العمليات</h3>
              <span className="text-xs text-slate-400 font-mono">آخر 6 سندات</span>
            </div>

            <div className="space-y-3">
              {recentTimeline.length > 0 ? (
                recentTimeline.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex items-start justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            item.type === 'PO'
                              ? 'bg-amber-100 text-amber-900'
                              : item.type === 'MO'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {item.num}
                        </span>
                        <span className="text-xs text-slate-400">{item.date}</span>
                      </div>
                      <strong className="text-xs text-slate-800 block">{item.title}</strong>
                      <p className="text-[11px] text-slate-500">{item.sub}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewVoucher(item.type, item.order)}
                      className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                      title="معاينة وطباعة السند"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">لا توجد عمليات مسجلة حتى الآن</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/70 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>حماية البيانات:</strong> جميع البيانات مخزنة محلياً في جهازك داخل قاعدة بيانات Room/IndexedDB، ولا يتم إرسال أي معلومة إلى خوادم خارجية.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
