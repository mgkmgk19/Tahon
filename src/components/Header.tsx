import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { UserRole } from '../types';
import { Smartphone, Monitor, ShieldCheck, UserCheck, Layers } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  isPhoneFrame,
  onTogglePhoneFrame,
}) => {
  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 flex items-center justify-center shadow-md shadow-amber-900/10">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">نظام إدارة محل الطاحونة</h1>
              <span className="hidden sm:inline-block bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                قاعدة بيانات SQLite
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">إدارة التوريد والطحن ومخزون التجار محلياً (Offline-First)</p>
          </div>
        </div>

        {/* Status, Roles & View Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Offline local indicator */}
          <OfflineIndicator />

          {/* User Role Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-slate-500 mr-1" />
            <span className="text-slate-500 font-medium ml-1 hidden md:inline">الصلاحية:</span>
            {(['مدير', 'موظف', 'محاسب'] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onRoleChange(role)}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  currentRole === role
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Frame View Toggle (Phone vs Desktop/Tablet) */}
          <button
            type="button"
            onClick={onTogglePhoneFrame}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition shadow-xs"
            title={isPhoneFrame ? 'التبديل إلى العرض الكامل' : 'التبديل إلى مظهر هاتف أندرويد'}
          >
            {isPhoneFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">عرض كامل (لوحي/مكتبي)</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">شاشة أندرويد</span>
              </>
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton variant="compact" />
        </div>
      </div>
    </header>
  );
};
