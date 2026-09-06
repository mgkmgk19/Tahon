import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle, Settings } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { MicrophonePermissionModal } from './MicrophonePermissionModal';

export interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  appendMode?: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  lang?: string;
  disabled?: boolean;
  id?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  currentValue = '',
  appendMode = false,
  title = 'تكلّم للبحث أو الإدخال الصوتي',
  size = 'md',
  className = '',
  lang = 'ar-SA',
  disabled = false,
  id,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const showToast = (msg: string, isPerm = false) => {
    setToastMessage(msg);
    setIsPermissionError(isPerm);
    setTimeout(() => setToastMessage(null), 6000);
  };

  const { isListening, isSupported, toggleListening } = useSpeechRecognition({
    lang,
    continuous: false,
    interimResults: true,
    onResult: (text) => {
      if (text) {
        if (appendMode && currentValue) {
          onTranscript(`${currentValue} ${text}`.trim());
        } else {
          onTranscript(text);
        }
      }
    },
    onError: (errMsg) => {
      const isPerm = errMsg.includes('رفض الإذن') || errMsg.includes('not-allowed');
      showToast(errMsg, isPerm);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (!isSupported) {
      showToast('المتصفح الحالي لا يدعم التعرف الصوتي المباشر. يُنصح باستخدام Google Chrome أو Edge.');
      return;
    }

    toggleListening();
  };

  const sizeClasses = {
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-sm',
    lg: 'p-2 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        id={id}
        onClick={handleClick}
        disabled={disabled}
        title={isListening ? 'جارٍ الاستماع... انقر للإيقاف' : title}
        className={`relative inline-flex items-center justify-center rounded-lg transition-all select-none ${sizeClasses} ${
          isListening
            ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30 scale-105 ring-2 ring-rose-400 ring-offset-1 dark:ring-offset-slate-900 animate-pulse'
            : 'text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        {isListening ? (
          <>
            <Mic className={`${iconSizes} animate-bounce`} />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </>
        ) : isSupported ? (
          <Mic className={iconSizes} />
        ) : (
          <MicOff className={`${iconSizes} opacity-40`} />
        )}
      </button>

      {/* Listening Floating Tooltip */}
      {isListening && (
        <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 z-50 whitespace-nowrap px-2.5 py-1 rounded-md bg-slate-900/95 text-white text-[11px] font-bold shadow-lg border border-slate-700 flex items-center gap-1.5 animate-in fade-in zoom-in-95 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>تكلّم الآن بالعربية...</span>
        </div>
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw] sm:w-auto px-4 py-3 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isPermissionError && (
              <button
                type="button"
                onClick={() => {
                  setToastMessage(null);
                  setIsPermissionModalOpen(true);
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>كيفية فك الحظر والسماح</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Permission helper modal */}
      <MicrophonePermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
      />
    </div>
  );
};
