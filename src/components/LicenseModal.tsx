import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Clock,
  Send,
  Lock,
  X,
  Sparkles,
} from 'lucide-react';
import { LicenseInfo, LicenseService } from '../services/licenseService';

interface LicenseModalProps {
  isOpen: boolean;
  onClose?: () => void;
  licenseInfo: LicenseInfo;
  onActivated: () => void;
  isBlocked?: boolean; // When trial expired, closing is blocked until licensed
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  isOpen,
  onClose,
  licenseInfo,
  onActivated,
  isBlocked = false,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [clientName, setClientName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(licenseInfo.deviceId).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  const handleSendToDevWhatsApp = () => {
    const text =
      `السلام عليكم ورحمة الله وبركاته،\n` +
      `أود تفعيل ترخيص (نظام إدارة محل وطاحونة الحبوب).\n\n` +
      `📱 معرف جهازي (Device ID) هو:\n` +
      `${licenseInfo.deviceId}\n\n` +
      (clientName ? `اسم المنشأة/العميل: ${clientName}\n\n` : '') +
      `يرجى تزويدي بمفتاح التفعيل والترخيص. شكراً لكم.`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!inputKey.trim()) {
      setErrorMsg('الرجاء إدخال كود الترخيص');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = LicenseService.activateLicense(inputKey, clientName);
      if (result.success) {
        setSuccessMsg(result.message);
        setInputKey('');
        setTimeout(() => {
          onActivated();
          if (onClose) onClose();
        }, 1500);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تفعيل الترخيص');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto"
      onClick={(e) => {
        if (!isBlocked && onClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div
          className={`p-6 text-white flex items-center justify-between ${
            licenseInfo.isLicensed
              ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
              : licenseInfo.isExpired
              ? 'bg-gradient-to-r from-rose-800 to-red-950'
              : 'bg-gradient-to-r from-amber-700 to-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 shadow-inner">
              {licenseInfo.isLicensed ? (
                <ShieldCheck className="w-7 h-7 text-emerald-300" />
              ) : licenseInfo.isExpired ? (
                <Lock className="w-7 h-7 text-rose-300 animate-pulse" />
              ) : (
                <Clock className="w-7 h-7 text-amber-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  {licenseInfo.isLicensed
                    ? 'الترخيص مفعل وموثق'
                    : licenseInfo.isExpired
                    ? 'انتهت الفترة التجريبية (3 أيام)'
                    : 'ترخيص نظام إدارة المطحنة'}
                </h2>
                {!licenseInfo.isLicensed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                    {licenseInfo.isExpired ? 'مطلوب تفعيل' : 'نسخة تجريبية'}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                {licenseInfo.isLicensed
                  ? 'برنامجك مرخص ويعمل بكامل وظائفه محلياً دون أي قيود'
                  : licenseInfo.isExpired
                  ? 'يرجى إدخال مفتاح الترخيص المعتمد للمتابعة واستخدام النظام'
                  : `متبقي ${licenseInfo.trialDaysLeft} يوم و ${licenseInfo.trialHoursLeft} ساعة من الفترة التجريبية`}
              </p>
            </div>
          </div>

          {!isBlocked && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-800 dark:text-slate-200">
          {/* Active License Details (if activated) */}
          {licenseInfo.isLicensed ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  حالة الترخيص: {licenseInfo.statusText}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                  صلاحية: {licenseInfo.expiresAt}
                </span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                <div className="flex justify-between">
                  <span>معرف الجهاز المقترن:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{licenseInfo.deviceId}</span>
                </div>
                {licenseInfo.activatedAt && (
                  <div className="flex justify-between">
                    <span>تاريخ التفعيل:</span>
                    <span>{licenseInfo.activatedAt}</span>
                  </div>
                )}
                {licenseInfo.clientName && (
                  <div className="flex justify-between">
                    <span>اسم العميل:</span>
                    <span className="font-bold">{licenseInfo.clientName}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Expired Warning Banner */}
              {licenseInfo.isExpired && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-4 flex items-start gap-3 text-rose-900 dark:text-rose-200">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="block font-bold mb-0.5">تم قفل النظام لانتهاء الفترة التجريبية (3 أيام):</strong>
                    بياناتك وعملياتك السابقة محفوظة بأمان في قاعدة بيانات التطبيق. لإلغاء القفل ومتابعة العمل، أرسل معرف جهازك للمطور للحصول على كود الترخيص.
                  </div>
                </div>
              )}

              {/* Device ID Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    معرف هذا الجهاز (Device ID):
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">فريد ومثبت لهذا التثبيت</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 font-mono text-sm sm:text-base font-bold text-center tracking-widest text-amber-800 dark:text-amber-400 select-all">
                    {licenseInfo.deviceId}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDeviceId}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                    title="نسخ المعرف"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>

                {/* WhatsApp button to contact developer */}
                <button
                  type="button"
                  onClick={handleSendToDevWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال المعرف للمطور عبر واتساب لطلب مفتاح التفعيل</span>
                </button>
              </div>

              {/* License Activation Form */}
              <form onSubmit={handleActivate} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    مفتاح الترخيص (License Key) المستلم من المطور:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                      placeholder="MILL-LFT-XXXX-XXXX-XXXX-XXXX-XXXX"
                      dir="ltr"
                      className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                      autoComplete="off"
                    />
                    <KeyRound className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المنشأة / العميل (اختياري):
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="مثال: مطحنة الوفاء"
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-amber-600 outline-none transition"
                  />
                </div>

                {/* Notifications */}
                {errorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold animate-in fade-in duration-200">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                    <Check className="w-4 h-4 text-emerald-600" />
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-900/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري التحقق والتفعيل...' : '⚡ تفعيل الترخيص والتحقق الفوري'}
                </button>
              </form>
            </>
          )}

          <div className="pt-2 border-t border-slate-150 dark:border-slate-800 text-center text-[11px] text-slate-400 dark:text-slate-500">
            <span>نظام الحماية والترخيص الآمن والمشفر Offline-First v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
