import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { UserRole } from '../types';
import { UserCheck, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 flex items-center justify-center shadow-md shadow-amber-900/10 shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                نظام إدارة محل الطاحونة
              </h1>
              <span className="hidden sm:inline-block bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                SQLite
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              إدارة التوريد والطحن ومخزون التجار محلياً (Offline-First)
            </p>
          </div>
        </div>

        {/* Status, Roles, Theme & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Offline local indicator */}
          <OfflineIndicator />

          {/* User Role Switcher */}
          {onRoleChange && (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline" />
              {(['مدير', 'موظف', 'محاسب'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onRoleChange(role)}
                  className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                    currentRole === role
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-150 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 transition-all shadow-xs active:scale-95"
            title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
            aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in fade-in duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton variant="compact" />
        </div>
      </div>
    </header>
  );
};
