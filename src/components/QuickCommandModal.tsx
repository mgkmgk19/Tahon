import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Search,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  X,
  Mic,
  Settings,
  Layers,
  CheckCircle2,
  FileText,
  Boxes,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Moon,
  Download,
  KeyRound,
  Calculator,
} from 'lucide-react';
import { CommandKeyword } from '../types';
import { millDb } from '../db/millDatabase';
import { matchCommands, CommandMatchResult, parseKeywords } from '../utils/commandMatcher';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { MicrophonePermissionModal } from './MicrophonePermissionModal';

interface QuickCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: CommandKeyword) => void;
  onOpenManagementView?: () => void;
}

export const QuickCommandModal: React.FC<QuickCommandModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
  onOpenManagementView,
}) => {
  const [query, setQuery] = useState('');
  const [commands, setCommands] = useState<CommandKeyword[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isPermError, setIsPermError] = useState(false);
  const [isMicPermissionModalOpen, setIsMicPermissionModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Active Speech Recognition hook for Arabic
  const { isListening, isSupported, stopListening, toggleListening, interimTranscript } = useSpeechRecognition({
    lang: 'ar-SA',
    continuous: false,
    interimResults: true,
    onResult: (spokenText, isFinal) => {
      setQuery(spokenText);
      if (isFinal) {
        setVoiceNotice(`تم التقاط الصوت: "${spokenText}"`);
        setIsPermError(false);
        setTimeout(() => setVoiceNotice(null), 3500);
      }
    },
    onError: (err) => {
      setVoiceNotice(err);
      const isDenied = err.includes('رفض الإذن') || err.includes('not-allowed');
      setIsPermError(isDenied);
      if (isDenied) {
        setIsMicPermissionModalOpen(true);
      }
      setTimeout(() => setVoiceNotice(null), 6000);
    },
  });

  // Load commands from database
  useEffect(() => {
    if (isOpen) {
      millDb.getCommandKeywords().then((list) => {
        setCommands(list);
      });
      setQuery('');
      setSelectedIndex(0);
      setVoiceNotice(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      if (isListening) {
        stopListening();
      }
    }
  }, [isOpen]);

  // Compute matches
  const matchResults: CommandMatchResult[] = React.useMemo(() => {
    return matchCommands(query, commands);
  }, [query, commands]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (matchResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % matchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (matchResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + matchResults.length) % matchResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matchResults.length > 0 && matchResults[selectedIndex]) {
        executeSelected(matchResults[selectedIndex].command);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isListening) {
        stopListening();
      }
      onClose();
    }
  };

  const executeSelected = (cmd: CommandKeyword) => {
    if (isListening) {
      stopListening();
    }
    onExecuteCommand(cmd);
    onClose();
  };

  if (!isOpen) return null;

  // Best predicted command when typing
  const topPrediction = query.trim().length > 0 && matchResults.length > 0 ? matchResults[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
        id="quick-command-dialog"
      >
        {/* Header and Search Input */}
        <div className="relative p-4 md:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Terminal className="w-5 h-5" />
            </div>

            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isListening
                    ? 'جارٍ الاستماع... تكلّم بالعربية الآن (مثال: "أمر طحن جديد"، "توريد قمح")'
                    : 'اكتب الأمر أو الكلمة المفتاحية (أو انقر زر الميكروفون للتحدث)...'
                }
                className={`w-full bg-transparent text-base md:text-lg font-bold placeholder-slate-400 outline-none pr-0 pl-10 ${
                  isListening ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'
                }`}
                id="input-quick-command"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Active Voice Command Button */}
            <button
              type="button"
              onClick={() => {
                if (!isSupported) {
                  setVoiceNotice('متصفحك لا يدعم التعرف الصوتي المباشر. يُنصح باستخدام Google Chrome أو Microsoft Edge.');
                  return;
                }
                toggleListening();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isListening
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400 ring-offset-1 animate-pulse scale-105'
                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60'
              }`}
              title={isListening ? 'جارٍ الاستماع... انقر للإيقاف' : 'بدء الأمر الصوتي باللغة العربية'}
              id="btn-voice-command-trigger"
            >
              {isListening ? (
                <>
                  <Mic className="w-4 h-4 animate-bounce text-white" />
                  <span>تكلّم الآن...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">أمر صوتي</span>
                </>
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                if (isListening) stopListening();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Voice Listening Banner */}
          {isListening && (
            <div className="mt-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in duration-100">
              <div className="flex items-center gap-2.5 font-bold">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping absolute opacity-75"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 relative"></span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">الميكروفون مفعّل (Web Speech API) - تكلّم بالعربية:</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 rounded font-mono font-semibold">
                      ar-SA
                    </span>
                  </div>
                  {interimTranscript ? (
                    <div className="text-sm font-black text-rose-700 dark:text-rose-300 font-mono">
                      "{interimTranscript}..."
                    </div>
                  ) : (
                    <div className="text-[11px] text-rose-600/90 dark:text-rose-300/90 font-normal">
                      مثال: "أمر صرف"، "كشف حساب"، "سجل الموردين"، "سند استلام"، "نسخ احتياطي"
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs whitespace-nowrap self-end sm:self-center cursor-pointer"
              >
                إيقاف الاستماع
              </button>
            </div>
          )}

          {/* Voice Notice Feedback */}
          {voiceNotice && !isListening && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-medium">
                <Mic className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{voiceNotice}</span>
              </div>
              <div className="flex items-center gap-2 mr-auto">
                {isPermError && (
                  <button
                    type="button"
                    onClick={() => setIsMicPermissionModalOpen(true)}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>فك الحظر وإعادة السماح</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setVoiceNotice(null)}
                  className="text-amber-600 dark:text-amber-400 font-bold px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Top Prediction Bar (Active Autocomplete feedback) */}
          {topPrediction && (
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  التنبؤ التلقائي:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {topPrediction.command.command_title}
                </span>
                {topPrediction.matchedKeyword && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                    مطابقة مع: «{topPrediction.matchedKeyword}»
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                اضغط <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">Enter ↵</kbd> للتنفيذ الفوري
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions Chips (when input is empty) */}
        {!query && (
          <div className="p-3 bg-slate-100/50 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-slate-400 font-bold whitespace-nowrap pl-1">مقترحات شائعة:</span>
            {[
              { label: 'أمر توريد قمح', query: 'توريد' },
              { label: 'أمر طحن جديد', query: 'طحن' },
              { label: 'أمر صرف وتسليم', query: 'صرف' },
              { label: 'كشف حساب تاجر', query: 'كشف حساب' },
              { label: 'المخزون والتجار', query: 'المخزون' },
              { label: 'نسخة احتياطية', query: 'نسخة' },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(chip.query)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium whitespace-nowrap transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Match Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[50vh] divide-y divide-slate-100 dark:divide-slate-800/60">
          {matchResults.map((result, idx) => {
            const { command, matchedKeyword } = result;
            const isSelected = idx === selectedIndex;
            const keywords = parseKeywords(command.keywords);

            return (
              <div
                key={command.id}
                data-index={idx}
                onClick={() => executeSelected(command)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`group p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-slate-900 dark:text-slate-100'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-amber-600'
                    }`}
                  >
                    <Terminal className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm md:text-base truncate">{command.command_title}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {command.category}
                      </span>
                      {matchedKeyword && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          مطابقة: {matchedKeyword}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {command.command_description}
                    </p>

                    {/* Available keywords preview */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 pt-0.5 overflow-hidden">
                      <span className="shrink-0 font-medium">الكلمات:</span>
                      <span className="truncate">{keywords.slice(0, 5).join(' • ')}</span>
                      {keywords.length > 5 && <span>+{keywords.length - 5}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm scale-105'
                        : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600'
                    }`}
                  >
                    <span>تنفيذ</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}

          {matchResults.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Terminal className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
              <p className="text-sm font-semibold">لم يتم العثور على أمر يطابق «{query}»</p>
              <p className="text-xs mt-1">
                يمكنك إضافة هذه الكلمة لأي أمر عبر صفحة "إدارة نصوص الأوامر"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">↑↓</kbd>
              للتنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">Enter</kbd>
              للتنفيذ
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">Esc</kbd>
              للإغلاق
            </span>
          </div>

          {onOpenManagementView && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenManagementView();
              }}
              className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-bold"
            >
              <Settings className="w-3.5 h-3.5" />
              إدارة وتخصيص نصوص الأوامر
            </button>
          )}
        </div>
      </div>

      {/* Microphone Permission Modal */}
      <MicrophonePermissionModal
        isOpen={isMicPermissionModalOpen}
        onClose={() => setIsMicPermissionModalOpen(false)}
        onPermissionGranted={() => {
          setVoiceNotice('تم تفعيل إذن الميكروفون بنجاح!');
          setIsPermError(false);
          setTimeout(() => setVoiceNotice(null), 3000);
        }}
      />
    </div>
  );
};
