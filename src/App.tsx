import React, { useState, useEffect } from 'react';
import {
  Wheat,
  LayoutDashboard,
  ArrowDownLeft,
  RefreshCw,
  ArrowUpRight,
  Boxes,
  FileText,
  Settings,
  Plus,
} from 'lucide-react';
import {
  Supplier,
  Product,
  GrainStock,
  FlourStock,
  PurchaseOrder,
  MillingOrder,
  WithdrawalOrder,
  AuditLog,
  StockSummaryRow,
  UserRole,
} from './types';
import { millDb } from './db/millDatabase';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DashboardView } from './components/DashboardView';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { MillingOrdersView } from './components/MillingOrdersView';
import { WithdrawalOrdersView } from './components/WithdrawalOrdersView';
import { StockSuppliersView } from './components/StockSuppliersView';
import { ReportsView } from './components/ReportsView';
import { SettingsBackupView } from './components/SettingsBackupView';
import { VoucherPrintModal } from './components/VoucherPrintModal';

type ActiveTab =
  | 'dashboard'
  | 'purchase_orders'
  | 'milling_orders'
  | 'withdrawal_orders'
  | 'stock_suppliers'
  | 'reports'
  | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // User Authentication / Role
  const [currentRole, setCurrentRole] = useState<UserRole>('مدير');
  const [currentUserName, setCurrentUserName] = useState<string>('صالح المشرف (المدير)');

  // Domain Database States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [grainStocks, setGrainStocks] = useState<GrainStock[]>([]);
  const [flourStocks, setFlourStocks] = useState<FlourStock[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [millingOrders, setMillingOrders] = useState<MillingOrder[]>([]);
  const [withdrawalOrders, setWithdrawalOrders] = useState<WithdrawalOrder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals for creating new transactions
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [isNewMOModalOpen, setIsNewMOModalOpen] = useState(false);
  const [isNewWOModalOpen, setIsNewWOModalOpen] = useState(false);

  // Voucher print modal state
  const [activeVoucher, setActiveVoucher] = useState<{
    order: PurchaseOrder | MillingOrder | WithdrawalOrder;
    type: 'PO' | 'MO' | 'WO';
  } | null>(null);

  // Load and subscribe to local SQLite database
  const refreshAllData = async () => {
    try {
      const [sups, prods, gStocks, fStocks, pos, mos, wos, logs] = await Promise.all([
        millDb.getSuppliers(),
        millDb.getProducts(),
        millDb.getGrainStock(),
        millDb.getFlourStock(),
        millDb.getPurchaseOrders(),
        millDb.getMillingOrders(),
        millDb.getWithdrawalOrders(),
        millDb.getAuditLogs(),
      ]);

      setSuppliers(sups);
      setProducts(prods);
      setGrainStocks(gStocks);
      setFlourStocks(fStocks);
      setPurchaseOrders(pos);
      setMillingOrders(mos);
      setWithdrawalOrders(wos);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error refreshing SQLite database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();

    // Safety fallback: Ensure loading screen dismisses promptly under any sandbox condition
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    const unsubscribe = millDb.subscribe(() => {
      refreshAllData();
    });
    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // Compute live Stock Summary per Supplier
  const stockSummary: StockSummaryRow[] = (suppliers || []).map((sup) => {
    const sGrains = (grainStocks || []).filter((g) => g && g.supplier_id === sup.id);
    const sFlours = (flourStocks || []).filter((f) => f && f.supplier_id === sup.id);
    const totalGrain = sGrains.reduce((sum, g) => sum + (Number(g.quantity) || 0), 0);
    const totalFlour = sFlours.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0);

    return {
      supplier_id: sup.id,
      supplier_name: sup.name,
      phone: sup.phone,
      grainStocks: sGrains,
      flourStocks: sFlours,
      totalGrain,
      totalFlour,
    };
  });

  const handleRoleChange = (newRole: UserRole, newName: string) => {
    setCurrentRole(newRole);
    setCurrentUserName(newName);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-800 text-white flex items-center justify-center shadow-lg mb-4 animate-pulse">
          <Wheat className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-black text-stone-900 mb-1">طاحونة الحبوب والمخزون الآلي</h2>
        <p className="text-xs text-stone-500 font-mono">جاري تشغيل محرك قاعدة بيانات SQLite المحلية الفورية...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-slate-800 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Main Top Header */}
      <Header
        currentRole={currentRole}
        currentUserName={currentUserName}
        onOpenNewPO={() => {
          setActiveTab('purchase_orders');
          setIsNewPOModalOpen(true);
        }}
        onOpenNewMO={() => {
          setActiveTab('milling_orders');
          setIsNewMOModalOpen(true);
        }}
        onOpenNewWO={() => {
          setActiveTab('withdrawal_orders');
          setIsNewWOModalOpen(true);
        }}
      />

      {/* Navigation Sub-Header Bar (Desktop & Mobile Friendly) */}
      <nav aria-label="شريط التنقل الرئيسي" className="no-print bg-white border-b border-stone-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'dashboard'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>لوحة التحكم والمؤشرات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('purchase_orders')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'purchase_orders'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-amber-600" />
              <span>أوامر التوريد ({purchaseOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('milling_orders')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'milling_orders'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span>أوامر الطحن ({millingOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('withdrawal_orders')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'withdrawal_orders'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>أوامر الصرف ({withdrawalOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stock_suppliers')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'stock_suppliers'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>المخزون والتجار والأصناف</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'reports'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>التقارير الشاملة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'settings'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>النسخ الاحتياطي (TAHON) والصلاحيات</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={stockSummary}
            suppliers={suppliers}
            products={products}
            purchaseOrders={purchaseOrders}
            millingOrders={millingOrders}
            withdrawalOrders={withdrawalOrders}
            currentRole={currentRole}
            onNavigate={(tab) => {
              if (tab === 'purchase') setActiveTab('purchase_orders');
              else if (tab === 'milling') setActiveTab('milling_orders');
              else if (tab === 'withdrawal') setActiveTab('withdrawal_orders');
              else if (tab === 'stock') setActiveTab('stock_suppliers');
              else if (tab === 'reports') setActiveTab('reports');
              else if (tab === 'android') setActiveTab('settings');
            }}
            onOpenNewPO={() => {
              setActiveTab('purchase_orders');
              setIsNewPOModalOpen(true);
            }}
            onOpenNewMO={() => {
              setActiveTab('milling_orders');
              setIsNewMOModalOpen(true);
            }}
            onOpenNewWO={() => {
              setActiveTab('withdrawal_orders');
              setIsNewWOModalOpen(true);
            }}
            onViewVoucher={(type, order) => setActiveVoucher({ order, type })}
          />
        )}

        {activeTab === 'purchase_orders' && (
          <PurchaseOrdersView
            orders={purchaseOrders}
            suppliers={suppliers}
            products={products}
            currentRole={currentRole}
            currentUserName={currentUserName}
            isOpenNewModal={isNewPOModalOpen}
            onOpenNewModal={() => setIsNewPOModalOpen(true)}
            onCloseNewModal={() => setIsNewPOModalOpen(false)}
            onViewVoucher={(order) => setActiveVoucher({ order, type: 'PO' })}
          />
        )}

        {activeTab === 'milling_orders' && (
          <MillingOrdersView
            orders={millingOrders}
            suppliers={suppliers}
            products={products}
            grainStocks={grainStocks}
            currentRole={currentRole}
            currentUserName={currentUserName}
            isOpenNewModal={isNewMOModalOpen}
            onOpenNewModal={() => setIsNewMOModalOpen(true)}
            onCloseNewModal={() => setIsNewMOModalOpen(false)}
            onViewVoucher={(order) => setActiveVoucher({ order, type: 'MO' })}
          />
        )}

        {activeTab === 'withdrawal_orders' && (
          <WithdrawalOrdersView
            orders={withdrawalOrders}
            suppliers={suppliers}
            products={products}
            flourStocks={flourStocks}
            currentRole={currentRole}
            currentUserName={currentUserName}
            isOpenNewModal={isNewWOModalOpen}
            onOpenNewModal={() => setIsNewWOModalOpen(true)}
            onCloseNewModal={() => setIsNewWOModalOpen(false)}
            onViewVoucher={(order) => setActiveVoucher({ order, type: 'WO' })}
          />
        )}

        {activeTab === 'stock_suppliers' && (
          <StockSuppliersView
            summary={stockSummary}
            suppliers={suppliers}
            products={products}
            currentRole={currentRole}
            currentUserName={currentUserName}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            purchaseOrders={purchaseOrders}
            millingOrders={millingOrders}
            withdrawalOrders={withdrawalOrders}
            suppliers={suppliers}
            products={products}
            summary={stockSummary}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsBackupView
            currentRole={currentRole}
            currentUserName={currentUserName}
            onChangeRole={handleRoleChange}
            auditLogs={auditLogs}
          />
        )}
      </main>

      {/* Printable Voucher Modal */}
      {activeVoucher && (
        <VoucherPrintModal
          isOpen={true}
          onClose={() => setActiveVoucher(null)}
          voucherType={activeVoucher.type}
          order={activeVoucher.order}
        />
      )}

      {/* Footer */}
      <footer className="no-print bg-white border-t border-stone-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>نظام إدارة محل وطاحونة الحبوب الآلية • Offline-First PWA (IndexedDB / Room DAO Architecture)</span>
          <span className="font-mono text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            🔒 محلي بالكامل دون اتصال بالإنترنت
          </span>
        </div>
      </footer>
    </div>
  );
}
