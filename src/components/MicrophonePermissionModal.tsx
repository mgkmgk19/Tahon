import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Lock,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Volume2,
  Smartphone,
  Laptop,
  HelpCircle,
} from 'lucide-react';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [testingMic, setTestingMic] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGuideTab, setSelectedGuideTab] = useState<'desktop' | 'mobile'>('desktop');

  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check current permission state if API available
  const checkCurrentPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as any });
        setStatus(result.state);
        result.onchange = () => {
          setStatus(result.state);
          if (result.state === 'granted') {
            onPermissionGranted?.();
          }
        };
      }
    } catch {
      // Query not supported for microphone on all browsers
      setStatus('unknown');
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkCurrentPermission();
      setErrorMessage(null);
    } else {
      stopAudioTest();
    }
    return () => {
      stopAudioTest();
    };
  }, [isOpen]);

  const stopAudioTest = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore
      }
      audioContextRef.current = null;
    }
    setTestingMic(false);
    setAudioLevel(0);
  };

  // Explicitly trigger getUserMedia to prompt or verify permission
  const requestPermission = async () => {
    stopAudioTest();
    setErrorMessage(null);
    setTestingMic(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم واجهة الوصول إلى الميكروفون.');
      }

      // Request stream - this triggers the browser permission dialog if not permanently blocked
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setStatus('granted');
      onPermissionGranted?.();

      // Setup audio analyzer for visual feedback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(level);
          animationFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      }
    } catch (err: any) {
      stopAudioTest();
      setStatus('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('المتصفح يمنع الميكروفون حالياً لأن الإذن تم رفضه مسبقاً. يرجى اتباع خطوات إلغاء الحظر الموضحة بالأسفل.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('لم يتم العثور على ميكروفون موصول بجهازك.');
      } else {
        setErrorMessage(`تعذر الوصول للميكروفون: ${err.message || 'خطأ غير معروف'}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden transition-all text-slate-800 dark:text-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-amber-600 to-amber-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Mic className="w-5 h-5 text-amber-100 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                إعادة تفعيل إذن الميكروفون (الصوت)
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                خطوات السماح للمتصفح بالتقاط صوتك للأوامر والبحث والإملاء
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Alert Banner */}
          {status === 'granted' ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم منح إذن الميكروفون بنجاح! يعمل الآن بكفاءة.</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                يمكنك التحدث الآن للتأكد من التقاط الصوت عبر المؤشر التفاعلي بالأسفل:
              </p>

              {/* Visual audio live meter */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>مستوى التقاط الصوت الحي:</span>
                  </span>
                  <span>{audioLevel}%</span>
                </div>
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 rounded-full transition-all duration-75"
                    style={{ width: `${Math.max(5, audioLevel)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">لماذا لا يظهر طلب الإذن مرة أخرى تلقائياً؟</span>
                <p className="mt-0.5 opacity-90 text-[11px]">
                  سياسات الأمان في جميع المتصفحات (Chrome, Safari, Edge) تقوم بحفظ قرار «الرفض» لمنع تكرار النوافذ المنبثقة، وتتطلب منك إلغاء الحظر يدوياً من شريط العنوان في أعلى المتصفح كما هو مشروح بالأسفل.
                </p>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <button
              type="button"
              onClick={requestPermission}
              disabled={testingMic && status === 'granted'}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              id="btn-request-mic-permission"
            >
              <RefreshCw className={`w-4 h-4 ${testingMic ? 'animate-spin' : ''}`} />
              <span>إعادة طلب وفحص إذن الميكروفون الآن</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              title="تحديث الصفحة لإعادة تطبيق الإذن"
            >
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
              <MicOff className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Guide Selector: Desktop vs Mobile */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                طريقة فك الحظر والسماح حسب جهازك:
              </h3>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedGuideTab('desktop')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                    selectedGuideTab === 'desktop'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>كمبيوتر / لابتوب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGuideTab('mobile')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                    selectedGuideTab === 'mobile'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>هاتف / أندرويد / آيفون</span>
                </button>
              </div>
            </div>

            {/* Desktop Guide (Chrome / Edge / Safari) */}
            {selectedGuideTab === 'desktop' ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      انقر على أيقونة «القفل 🔒» أو «إعدادات الموقع» في شريط العنوان
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      ستجد أيقونة القفل أو الشرائح الصغيرة في أقصى يسار شريط كتابة الرابط (URL) في أعلى المتصفح بجانب الرابط مباشرة.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-amber-600" />
                      قم بتغيير خيار «الميكروفون (Microphone)» إلى «سماح (Allow)»
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      في القائمة المنبثقة، حوّل المفتاح بجوار "الميكروفون" للتشغيل، أو انقر "إعادة ضبط الأذونات (Reset permissions)".
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                      اضغط زر «إعادة طلب وفحص إذن الميكروفون الآن» أعلاه
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      بمجرد فك الحظر، اضغط الزر الأصفر بالأعلى وسيقوم المتصفح بقبول الميكروفون فوراً وإظهار مؤشر الصوت الأخضر.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Mobile Guide */
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-amber-600" />
                      في متصفح الهاتف (Chrome أو Safari):
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      انقر على رمز القفل 🔒 أو خيارات الموقع (رمز 'ع ع' أو 'aA' في Safari) في شريط الرابط.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-amber-600" />
                      اختر «أذونات الموقع» ثم «الميكروفون» واختر «سماح»
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      تأكد أيضاً من تفعيل إذن الميكروفون لتطبيق المتصفح نفسه في إعدادات الهاتف الرئيسية.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                      قم بتحديث الصفحة أو العودة للتطبيق
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      سيعمل الميكروفون المباشر للإملاء والبحث الصوتي على الفور.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
          >
            {status === 'granted' ? 'تم ومتابعة العمل' : 'إغلاق النافذة'}
          </button>
        </div>
      </div>
    </div>
  );
};
