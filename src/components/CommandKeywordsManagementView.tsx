import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  Search,
  RotateCcw,
  Tag,
  CheckCircle2,
  AlertCircle,
  Edit3,
  ExternalLink,
  Mic,
  Lock,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CommandKeyword, UserRole } from '../types';
import { millDb } from '../db/millDatabase';
import { parseKeywords } from '../utils/commandMatcher';
import { VoiceInputButton } from './VoiceInputButton';

interface CommandKeywordsManagementViewProps {
  currentRole: UserRole;
  currentUserName: string;
  onExecuteCommand?: (command: CommandKeyword) => void;
}

// Popular suggested trigger phrases for quick one-click addition
const SUGGESTED_PHRASES = [
  'سجل سريع',
  'أمر جديد',
  'جيب لي',
  'ابغى اطبع',
  'فتح الشاشة',
  'كشف فوري',
  'حفظ نسخة',
  'تحديث البيانات',
  'فوري ومستعجل',
  'عرض التفاصيل',
];

export const CommandKeywordsManagementView: React.FC<CommandKeywordsManagementViewProps> = ({
  currentRole,
  currentUserName,
  onExecuteCommand,
}) => {
  const [commands, setCommands] = useState<CommandKeyword[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State for adding/appending keywords to a command
  const [isAddKeywordsOpen, setIsAddKeywordsOpen] = useState(false);
  const [targetCommandId, setTargetCommandId] = useState<number | null>(null);
  const [newKeywordsInput, setNewKeywordsInput] = useState('');

  // Modal State for editing all keywords of a specific command
  const [isEditKeywordsModalOpen, setIsEditKeywordsModalOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CommandKeyword | null>(null);
  const [editingKeywordsValue, setEditingKeywordsValue] = useState('');

  // Per-card inline quick add input
  const [inlineInputs, setInlineInputs] = useState<Record<number, string>>({});

  const isAdmin = currentRole === 'مدير';

  const loadCommands = async () => {
    try {
      const list = await millDb.getCommandKeywords();
      setCommands(list);
    } catch (err) {
      console.error('Failed to load commands', err);
    }
  };

  useEffect(() => {
    loadCommands();
    const unsub = millDb.subscribe(() => {
      loadCommands();
    });
    return () => unsub();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const categories = ['all', ...Array.from(new Set(commands.map((c) => c.category)))];

  const filteredCommands = commands.filter((cmd) => {
    const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesCategory;

    const matchesTitle = cmd.command_title.toLowerCase().includes(q);
    const matchesDesc = cmd.command_description.toLowerCase().includes(q);
    const matchesKeywords = cmd.keywords.toLowerCase().includes(q);
    const matchesCat = cmd.category.toLowerCase().includes(q);

    return matchesCategory && (matchesTitle || matchesDesc || matchesKeywords || matchesCat);
  });

  // Open Add Keywords Modal
  const handleOpenAddKeywords = (commandId?: number) => {
    const idToUse = commandId || (commands[0]?.id ?? null);
    setTargetCommandId(idToUse);
    setNewKeywordsInput('');
    setIsAddKeywordsOpen(true);
  };

  // Save Appended Keywords
  const handleSaveAppendedKeywords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCommandId) {
      showNotification('error', 'يرجى تحديد الأمر أولاً');
      return;
    }
    if (!newKeywordsInput.trim()) {
      showNotification('error', 'يرجى كتابة نص أو كلمة مفتاحية واحدة على الأقل');
      return;
    }

    try {
      await millDb.appendKeywordsToCommand(targetCommandId, newKeywordsInput.trim(), currentUserName);
      showNotification('success', 'تمت إضافة النصوص بنجاح إلى الأمر المحدد');
      setIsAddKeywordsOpen(false);
      setNewKeywordsInput('');
      await loadCommands();
    } catch (err: any) {
      showNotification('error', err.message || 'حدث خطأ أثناء حفظ النصوص');
    }
  };

  // Inline quick add on a card
  const handleInlineQuickAdd = async (cmdId: number) => {
    const val = (inlineInputs[cmdId] || '').trim();
    if (!val) return;

    try {
      await millDb.appendKeywordsToCommand(cmdId, val, currentUserName);
      showNotification('success', `تمت إضافة "${val}" إلى نصوص الأمر`);
      setInlineInputs((prev) => ({ ...prev, [cmdId]: '' }));
      await loadCommands();
    } catch (err: any) {
      showNotification('error', err.message || 'فشل حفظ الكلمة');
    }
  };

  // Remove a single keyword chip
  const handleRemoveSingleKeyword = async (cmd: CommandKeyword, keywordToRemove: string) => {
    const currentKws = parseKeywords(cmd.keywords);
    const updatedKws = currentKws.filter((k) => k !== keywordToRemove);
    if (updatedKws.length === 0) {
      showNotification('error', 'يجب أن يحتوي الأمر على نص مفتاحي واحد على الأقل للتعرف عليه');
      return;
    }

    try {
      await millDb.saveCommandKeyword(
        {
          id: cmd.id,
          keywords: updatedKws.join('، '),
        },
        currentUserName
      );
      showNotification('success', `تم حذف النص "${keywordToRemove}" بنجاح`);
      await loadCommands();
    } catch (err: any) {
      showNotification('error', err.message || 'فشل حذف النص');
    }
  };

  // Open Edit All Keywords for a specific command
  const handleOpenEditKeywordsModal = (cmd: CommandKeyword) => {
    setEditingCommand(cmd);
    setEditingKeywordsValue(cmd.keywords);
    setIsEditKeywordsModalOpen(true);
  };

  // Save All Keywords for a command
  const handleSaveAllKeywords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommand) return;
    if (!editingKeywordsValue.trim()) {
      showNotification('error', 'يرجى كتابة النصوص المفتاحية للأمر');
      return;
    }

    try {
      await millDb.updateCommandKeywords(editingCommand.id, editingKeywordsValue.trim(), currentUserName);
      showNotification('success', `تم تحديث نصوص الأمر: ${editingCommand.command_title}`);
      setIsEditKeywordsModalOpen(false);
      setEditingCommand(null);
      await loadCommands();
    } catch (err: any) {
      showNotification('error', err.message || 'فشل تحديث النصوص');
    }
  };

  // Reset a single command's keywords to default
  const handleResetSingleCommand = async (cmd: CommandKeyword) => {
    if (!window.confirm(`هل أنت متأكد من استعادة النصوص الافتراضية للأمر: "${cmd.command_title}"؟`)) {
      return;
    }
    try {
      await millDb.resetSingleCommandKeywords(cmd.id, currentUserName);
      showNotification('success', `تمت استعادة نصوص الأمر "${cmd.command_title}" للافتراضي`);
      await loadCommands();
    } catch (err: any) {
      showNotification('error', err.message || 'فشل استعادة نصوص الأمر');
    }
  };

  // Reset ALL commands' keywords to defaults
  const handleResetAllDefaults = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في استعادة كافة النصوص والكلمات المفتاحية الافتراضية لجميع أوامر النظام الـ 24؟')) {
      return;
    }
    try {
      await millDb.resetCommandKeywordsToDefault(currentUserName);
      showNotification('success', 'تمت استعادة كافة النصوص المفتاحية الافتراضية لجميع الأوامر بنجاح');
      await loadCommands();
    } catch (err: any) {
      showNotification('error', err.message || 'فشل استعادة الإعدادات');
    }
  };

  return (
    <div className="space-y-6 pb-12" id="command-keywords-management-view">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  جدول الأوامر والنصوص المفتاحية
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                  {commands.length} أمر نظام أساسي
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                أوامر النظام الـ 24 مدمجة وافتراضية دائماً، ويمكنك بحرية تامة تخصيص واختيار النصوص والكلمات المفتاحية التي تفتح كل أمر.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAddKeywords()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-all active:scale-95"
            id="btn-add-keywords-to-command"
          >
            <Plus className="w-4 h-4" />
            إدراج نصوص لأمر
          </button>

          <button
            type="button"
            onClick={handleResetAllDefaults}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-medium text-sm transition-all"
            title="استعادة النصوص المفتاحية الافتراضية لجميع الأوامر"
            id="btn-reset-command-keywords"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            استعادة الافتراضي للجميع
          </button>
        </div>
      </div>

      {/* System Immutability & Voice Readiness Notice */}
      <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                بيانات الأوامر افتراضية وثابتة (غير قابلة للإضافة أو الحذف):
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold">
                حماية النظام
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تم تثبيت الـ 24 أمراً لضمان ربطها البرمجي المباشر مع واجهات الطاحونة، بينما يُتاح لك بالكامل اختيار وتعديل الكلمات والنصوص والعبارات التي يستجيب لها كل أمر.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-semibold whitespace-nowrap shrink-0">
          <Mic className="w-3.5 h-3.5" />
          النصوص جاهزة للبحث السريع والأوامر الصوتية القادمة
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث برقم الأمر، الاسم، الوصف، أو بأي كلمة مفتاحية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
            id="input-search-commands"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <VoiceInputButton
              onTranscript={(txt) => setSearchQuery(txt)}
              currentValue={searchQuery}
              title="البحث الصوتي في الأوامر"
              id="btn-voice-search-commands"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {cat === 'all' ? `جميع الأوامر (${commands.length})` : `${cat} (${commands.filter((c) => c.category === cat).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Commands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCommands.map((cmd) => {
          const keywordList = parseKeywords(cmd.keywords);

          return (
            <div
              key={cmd.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:border-amber-500/40 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between"
              id={`command-card-${cmd.id}`}
            >
              <div>
                {/* Header of Card */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                      #{cmd.id}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {cmd.command_title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {cmd.category}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                          {cmd.command_key}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions on this command */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenAddKeywords(cmd.id)}
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                      title="إدراج نصوص جديدة لهذا الأمر"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditKeywordsModal(cmd)}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="تعديل كافة نصوص هذا الأمر"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetSingleCommand(cmd)}
                      className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="استعادة نصوص هذا الأمر للافتراضي"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    {onExecuteCommand && (
                      <button
                        type="button"
                        onClick={() => onExecuteCommand(cmd)}
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                        title="تجربة وتنفيذ الأمر الآن"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {cmd.command_description}
                </p>

                {/* Keywords Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      النصوص المفتاحية التي تفتح هذا الأمر ({keywordList.length}):
                    </span>
                    <span className="text-[10px] text-slate-400">انقر على × لحذف أي كلمة</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {keywordList.map((kw, idx) => (
                      <span
                        key={idx}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-750 hover:bg-amber-50 dark:hover:bg-amber-900/40 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 text-xs font-medium transition-all"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSingleKeyword(cmd, kw)}
                          className="text-slate-400 hover:text-rose-500 rounded-full transition-colors opacity-70 group-hover:opacity-100 font-bold"
                          title={`حذف الكلمة "${kw}"`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Inline Quick Add Input */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="+ إضافة نص مفتاحي سريع... (اضغط Enter)"
                      value={inlineInputs[cmd.id] || ''}
                      onChange={(e) => setInlineInputs({ ...inlineInputs, [cmd.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleInlineQuickAdd(cmd.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                    />
                    {inlineInputs[cmd.id]?.trim() && (
                      <button
                        type="button"
                        onClick={() => handleInlineQuickAdd(cmd.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all"
                      >
                        إضافة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  إجراء: {cmd.action_type === 'modal' ? 'نافذة منبثقة' : cmd.action_type === 'navigation' ? 'تنقل لشاشة' : 'إجراء نظام'}
                  {cmd.action_payload ? ` (${cmd.action_payload})` : ''}
                </span>
                <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                  <Lock className="w-3 h-3" />
                  أمر نظام افتراضي
                </span>
              </div>
            </div>
          );
        })}

        {filteredCommands.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <Terminal className="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-500" />
            <p className="text-base font-semibold">لم يتم العثور على أوامر مطابقة لبحثك</p>
            <p className="text-xs mt-1">جرب كلمات بحث أخرى أو اختر فئة مختلفة</p>
          </div>
        )}
      </div>

      {/* MODAL 1: Append / Add Keywords to a Command */}
      {isAddKeywordsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                <Plus className="w-5 h-5" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">إدراج نصوص جديدة لأمر</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddKeywordsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAppendedKeywords} className="mt-4 space-y-4">
              {/* Select Command */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختر الأمر المراد إدراج نصوص له:
                </label>
                <select
                  value={targetCommandId || ''}
                  onChange={(e) => setTargetCommandId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/40 outline-none"
                  required
                >
                  {commands.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} [{c.category}] - {c.command_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Show selected command current keywords */}
              {targetCommandId && (
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs">
                  <div className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                    النصوص الحالية المسجلة لهذا الأمر:
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {commands.find((c) => c.id === targetCommandId)?.keywords || 'لا توجد كلمات حالية'}
                  </p>
                </div>
              )}

              {/* Quick suggestions chips */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  مقترحات سريعة (انقر للإضافة الفورية):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PHRASES.map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const cur = newKeywordsInput.trim();
                        setNewKeywordsInput(cur ? `${cur}، ${phrase}` : phrase);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      + {phrase}
                    </button>
                  ))}
                </div>
              </div>

              {/* New Keywords Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    الكلمات أو النصوص المفتاحية الجديدة (افصل بينها بفاصلة أو سطر جديد):
                  </label>
                  <VoiceInputButton
                    onTranscript={(txt) => {
                      const cur = newKeywordsInput.trim();
                      setNewKeywordsInput(cur ? `${cur}، ${txt}` : txt);
                    }}
                    currentValue={newKeywordsInput}
                    appendMode
                    size="sm"
                    title="إملاء كلمات مفتاحية بالصوت"
                    id="btn-voice-add-keywords"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="مثال: توريد فوري، استلام سائق، توريد مستعجل، قمح بلدي (أو تكلّم بالصوت)..."
                  value={newKeywordsInput}
                  onChange={(e) => setNewKeywordsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/40 outline-none"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  يمكنك استخدام الفاصلة العربية (،) أو الإنجليزية (,) للفصل بين الكلمات والعبارات، أو التحدّث بالصوت لإضافتها تلقائياً
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddKeywordsOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-sm transition-all active:scale-95"
                >
                  حفظ النصوص للأمر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Edit Keywords for a Specific Command */}
      {isEditKeywordsModalOpen && editingCommand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  تعديل نصوص الأمر: {editingCommand.command_title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingCommand.command_description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditKeywordsModalOpen(false);
                  setEditingCommand(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAllKeywords} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    النصوص والكلمات المفتاحية (تفصل بينها فاصلة "،"):
                  </label>
                  <VoiceInputButton
                    onTranscript={(txt) => {
                      const cur = editingKeywordsValue.trim();
                      setEditingKeywordsValue(cur ? `${cur}، ${txt}` : txt);
                    }}
                    currentValue={editingKeywordsValue}
                    appendMode
                    size="sm"
                    title="إملاء كلمات مفتاحية بالصوت"
                    id="btn-voice-edit-all-keywords"
                  />
                </div>
                <textarea
                  rows={4}
                  value={editingKeywordsValue}
                  onChange={(e) => setEditingKeywordsValue(e.target.value)}
                  placeholder="أدخل الكلمات المفتاحية أو تكلّم لإضافتها بالصوت..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/40 outline-none leading-relaxed"
                  required
                />
              </div>

              {/* Live Preview Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  معاينة الكلمات المستخرجة ({parseKeywords(editingKeywordsValue).length}):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  {parseKeywords(editingKeywordsValue).map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditKeywordsModalOpen(false);
                    setEditingCommand(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-sm transition-all active:scale-95"
                >
                  حفظ النصوص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
