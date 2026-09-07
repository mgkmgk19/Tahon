import React, { useState, useEffect } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { UserRole } from '../types';
import { UserCheck, Sun, Moon, ShieldCheck, Clock, ShieldAlert, Mic, MicOff } from 'lucide-react';
import { LicenseInfo } from '../services/licenseService';
import { MicrophonePermissionModal } from './MicrophonePermissionModal';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  licenseInfo?: LicenseInfo;
  onOpenLicenseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  theme,
  onToggleTheme,
  licenseInfo,
  onOpenLicenseModal,
}) => {
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');

  // Check microphone permission status
  useEffect(() => {
    let permStatus: PermissionStatus | null = null;
    const checkPerm = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          permStatus = await navigator.permissions.query({ name: 'microphone' as any });
          setMicStatus(permStatus.state);
          permStatus.onchange = () => {
            if (permStatus) setMicStatus(permStatus.state);
          };
        }
      } catch {
        setMicStatus('unknown');
      }
    };
    checkPerm();
    return () => {
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

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

          {/* License Status Badge Button */}
          {licenseInfo && onOpenLicenseModal && (
            <button
              type="button"
              onClick={onOpenLicenseModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                licenseInfo.isLicensed
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900'
                  : licenseInfo.isExpired
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 hover:bg-rose-200 dark:hover:bg-rose-900 animate-pulse'
                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900'
              }`}
              title="معلومات وتفعيل الترخيص"
            >
              {licenseInfo.isLicensed ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>مرخص</span>
                </>
              ) : licenseInfo.isExpired ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>انتهت التجربة (تفعيل)</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>تجريبي ({licenseInfo.trialDaysLeft}د {licenseInfo.trialHoursLeft}س)</span>
                </>
              )}
            </button>
          )}

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

          {/* Microphone Permission / Status Button */}
          <button
            type="button"
            onClick={() => setIsMicModalOpen(true)}
            className={`relative flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer ${
              micStatus === 'denied'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                : micStatus === 'granted'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
            }`}
            title="فحص وإعدادات إذن الميكروفون الصوتي"
            id="btn-header-mic-settings"
          >
            {micStatus === 'denied' ? (
              <>
                <MicOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="hidden md:inline">فك حظر الميكروفون</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5 md:static md:animate-none"></span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden md:inline">إذن الميكروفون</span>
              </>
            )}
          </button>

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

      {/* Microphone Permission Modal */}
      <MicrophonePermissionModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        onPermissionGranted={() => setMicStatus('granted')}
      />
    </header>
  );
};
