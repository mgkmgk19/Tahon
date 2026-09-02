import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>مثبّت كتطبيق أندرويد</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    }
  };

  if (isInstallable) {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-2 rounded-lg bg-amber-700 hover:bg-amber-800 active:scale-95 text-white font-medium shadow-sm transition-all ${
            variant === 'full' ? 'w-full justify-center px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-xs'
          }`}
          title="تثبيت التطبيق على جهازك كـ تطبيق أندرويد محلي"
        >
          <Smartphone className="w-4 h-4" />
          <span>تثبيت التطبيق (Android APK / PWA)</span>
        </button>

        {justInstalled && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم تثبيت التطبيق بنجاح على جهازك!</span>
          </div>
        )}
      </>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 transition"
        >
          <Download className="w-3.5 h-3.5 text-amber-700" />
          <span>تثبيت على الهاتف</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">تثبيت التطبيق على الشاشة الرئيسية</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">1</span>
                  <span>اضغط على زر المشاركة (Share) في المتصفح بالأسفل أو بالأعلى.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">2</span>
                  <span>اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">3</span>
                  <span>سيتم فتح التطبيق بشكل مستقل تماماً وبدون إنترنت كأي تطبيق أندرويد/آيفون!</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-amber-700 hover:bg-amber-800 text-white py-2.5 text-sm font-semibold transition"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => alert('لتثبيت التطبيق على أندرويد، اضغط على زر خيارات المتصفح (⋮) ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية". التطبيق يعمل 100% بدون إنترنت!')}
      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
      title="كيفية التثبيت على الهاتف"
    >
      <Smartphone className="w-3.5 h-3.5 text-amber-700" />
      <span>تثبيت PWA</span>
    </button>
  );
};
