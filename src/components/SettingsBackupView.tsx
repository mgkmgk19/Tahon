import React, { useState, useRef } from 'react';
import {
  Shield,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Database,
  History,
  Terminal,
  Play,
  FileCode,
  Share2,
  HardDrive,
  Smartphone,
  Copy,
  Check,
  FolderCheck,
} from 'lucide-react';
import { UserRole, AuditLog } from '../types';
import { millDb } from '../db/millDatabase';
import { saveBackupToTahonaFolder, shareBackupFile } from '../utils/backupStorage';

interface SettingsBackupViewProps {
  currentRole: UserRole;
  currentUserName: string;
  onChangeRole: (role: UserRole, name: string) => void;
  auditLogs: AuditLog[];
}

export const SettingsBackupView: React.FC<SettingsBackupViewProps> = ({
  currentRole,
  currentUserName,
  onChangeRole,
  auditLogs,
}) => {
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM suppliers;');
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; values: any[][] }[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const sqliteInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  const getTimestamp = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  };

  // 1. Save SQLite backup directly to /storage/emulated/0/Documents/TAHON
  const handleSaveSqliteToTahona = async () => {
    try {
      setIsSaving(true);
      const bytes = millDb.exportSqliteBinary();
      const filename = `mill_database_${getTimestamp()}.sqlite`;
      const result = await saveBackupToTahonaFolder(filename, bytes, true);
      setLastSavedPath(result.filePath);
      showNotice(
        'success',
        result.isNative
          ? `تم حفظ ملف قاعدة البيانات SQLite بنجاح في مجلد المستندات:\n${result.filePath}`
          : `تم تنزيل نسخة قاعدة بيانات SQLite (${filename}) بنجاح.`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'فشل حفظ النسخة الاحتياطية في مجلد TAHON');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Share SQLite backup directly via WhatsApp, Telegram, Drive, etc.
  const handleShareSqlite = async () => {
    try {
      setIsSharing(true);
      const bytes = millDb.exportSqliteBinary();
      const filename = `mill_backup_${getTimestamp()}.sqlite`;
      const result = await shareBackupFile(filename, bytes, true, 'application/x-sqlite3');
      if (result.success) {
        showNotice('success', result.message);
      } else {
        showNotice('error', result.message);
      }
    } catch (err: any) {
      showNotice('error', err.message || 'حدث خطأ أثناء محاولة المشاركة');
    } finally {
      setIsSharing(false);
    }
  };

  // 3. Save JSON backup to Documents/TAHON
  const handleSaveJsonToTahona = async () => {
    try {
      setIsSaving(true);
      const json = await millDb.exportFullDatabase();
      const filename = `mill_backup_${getTimestamp()}.json`;
      const result = await saveBackupToTahonaFolder(filename, json, false);
      setLastSavedPath(result.filePath);
      showNotice(
        'success',
        result.isNative
          ? `تم حفظ ملف JSON في مجلد المستندات:\n${result.filePath}`
          : `تم تنزيل نسخة JSON (${filename}) بنجاح.`
      );
    } catch (err: any) {
      showNotice('error', err.message || 'فشل حفظ نسخة JSON');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Share JSON backup
  const handleShareJson = async () => {
    try {
      setIsSharing(true);
      const json = await millDb.exportFullDatabase();
      const filename = `mill_backup_${getTimestamp()}.json`;
      const result = await shareBackupFile(filename, json, false, 'application/json');
      if (result.success) {
        showNotice('success', result.message);
      } else {
        showNotice('error', result.message);
      }
    } catch (err: any) {
      showNotice('error', err.message || 'حدث خطأ أثناء المشاركة');
    } finally {
      setIsSharing(false);
    }
  };

  // Copy folder or file path to clipboard
  const handleCopyPath = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2500);
    showNotice('success', 'تم نسخ مسار المجلد إلى الحافظة بنجاح.');
  };

  // Import Binary SQLite file (.sqlite / .db)
  const handleSqliteFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('تحذير: استيراد ملف SQLite سيستبدل قاعدة البيانات الحالية بالكامل. هل ترغب في المتابعة؟')) {
      if (sqliteInputRef.current) sqliteInputRef.current.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      await millDb.importSqliteBinary(uint8, currentUserName);
      showNotice('success', 'تمت استعادة واستبدال قاعدة بيانات SQLite بنجاح.');
    } catch (err: any) {
      showNotice('error', `فشل استيراد SQLite: ${err.message}`);
    } finally {
      setIsRestoring(false);
      if (sqliteInputRef.current) sqliteInputRef.current.value = '';
    }
  };

  // Import JSON backup
  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('تحذير: استعادة النسخة الاحتياطية ستستبدل البيانات الحالية. هل ترغب في المتابعة؟')) {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      const text = await file.text();
      await millDb.importDatabase(text, currentUserName);
      showNotice('success', 'تمت استعادة قاعدة البيانات المحلية بنجاح وبشكل كامل.');
    } catch (err: any) {
      showNotice('error', 'فشلت الاستعادة: الملف المحدد غير صالح أو تالف');
    } finally {
      setIsRestoring(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const handleResetSampleData = async () => {
    if (!window.confirm('هل تريد إعادة تعيين البيانات وتعبئة البيانات التجريبية الافتراضية؟ سيتم شحن سجلات تجريبية للعرض والتدريب.')) return;
    try {
      await millDb.resetToDefaults(currentUserName);
      showNotice('success', 'تمت تعبئة وتحديث البيانات التجريبية الافتراضية بنجاح.');
    } catch (err: any) {
      showNotice('error', 'فشل إعادة التعيين');
    }
  };

  const handleClearDatabase = async (keepProducts: boolean = true) => {
    const confirmMsg = keepProducts
      ? 'هل أنت تأكد من تفريغ كافة بيانات الموردين وأوامر التوريد والطحن والصرف والمخزون؟ سيتم الإبقاء على قائمة تصنيفات المنتجات الأساسية للبدء الفوري بالإنتاج الفعلي.'
      : 'تحذير هام جداً: سيتم تفريغ كافة قاعدة البيانات بما فيها الأصناف وجميع السجلات! هل تريد المتابعة؟';

    if (!window.confirm(confirmMsg)) return;

    try {
      await millDb.clearAllData(currentUserName, { keepDefaultProducts: keepProducts });
      showNotice(
        'success',
        keepProducts
          ? 'تم تفريغ العمليات والسجلات والمخزون بنجاح. أصبحت قاعدة البيانات فارغة وجاهزة للإنتاج الفعلي مع الحفاظ على أصناف المنتجات.'
          : 'تم مسح قاعدة البيانات بالكامل بنجاح. قاعدة البيانات الآن فارغة 100%.'
      );
    } catch (err: any) {
      showNotice('error', 'فشل تفريغ قاعدة البيانات');
    }
  };

  const handleExecuteSql = () => {
    setSqlError(null);
    try {
      const res = millDb.executeRawSql(sqlQuery);
      setSqlResult(res);
      showNotice('success', 'تم تنفيذ استعلام SQLite بنجاح.');
    } catch (err: any) {
      setSqlError(err.message || 'حدث خطأ أثناء تنفيذ استعلام SQLite');
      setSqlResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Role & Permissions Switcher */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Shield className="w-5 h-5 text-amber-800" />
          <h2 className="text-base font-bold text-slate-900">الصلاحيات والمستخدم الحالي (SRS Section 6.1)</h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          يتيح النظام التبديل بين الأدوار الوظيفية لاختبار الصلاحيات المختلفة ومحاكاة بيئة العمل المحلية:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => onChangeRole('مدير', 'صالح المشرف (المدير)')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition text-right ${
              currentRole === 'مدير'
                ? 'border-amber-800 bg-amber-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">مدير النظام (Admin)</span>
              {currentRole === 'مدير' && <CheckCircle2 className="w-4 h-4 text-amber-800" />}
            </div>
            <p className="text-xs text-slate-600">صلاحيات كاملة: إدارة التجار والأصناف، استخراج التقارير والنسخ الاحتياطي.</p>
          </div>

          <div
            onClick={() => onChangeRole('موظف', 'أحمد السعيد (موظف الاستقبال)')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition text-right ${
              currentRole === 'موظف'
                ? 'border-blue-700 bg-blue-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">موظف الاستقبال</span>
              {currentRole === 'موظف' && <CheckCircle2 className="w-4 h-4 text-blue-700" />}
            </div>
            <p className="text-xs text-slate-600">إنشاء أوامر التوريد، أوامر الطحن والتحويل، أوامر الصرف والتسليم، وطباعة السندات.</p>
          </div>

          <div
            onClick={() => onChangeRole('محاسب', 'خالد النعيمي (المحاسب)')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition text-right ${
              currentRole === 'محاسب'
                ? 'border-emerald-700 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">محاسب (Accountant)</span>
              {currentRole === 'محاسب' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
            </div>
            <p className="text-xs text-slate-600">صلاحية القراءة فقط: استعراض كافة التقارير الشاملة وطباعتها وتصديرها دون تعديل.</p>
          </div>
        </div>
      </div>

      {/* Android Documents/TAHON & Native Sharing Section */}
      <div className="bg-gradient-to-br from-white to-amber-50/40 rounded-2xl p-6 border-2 border-amber-300/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-200/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  النسخ الاحتياطي في مجلد أندرويد العام (Documents/TAHON) والمشاركة
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                  مسار متاح للمستخدم بدون روت
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تخزين ومشاركة ملفات قاعدة البيانات في المجلد العام لجهازك للوصول إليها عبر تطبيق ملفاتي (My Files) أو إرسالها عبر الواتساب.
              </p>
            </div>
          </div>
        </div>

        {/* Directory Info Box */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <FolderCheck className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <span className="font-bold block text-slate-800">مسار حفظ النسخ الاحتياطية على الهاتف:</span>
              <code className="font-mono text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 select-all font-bold">
                /storage/emulated/0/Documents/TAHON/
              </code>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopyPath('/storage/emulated/0/Documents/TAHON/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs self-end sm:self-auto"
            title="نسخ مسار المجلد"
          >
            {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedPath ? 'تم النسخ!' : 'نسخ المسار'}</span>
          </button>
        </div>

        {/* Last Saved Path Notification banner if available */}
        {lastSavedPath && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-bold block">آخر ملف تم حفظه بنجاح:</span>
              <code className="block font-mono text-[11px] bg-white/80 p-1.5 rounded border border-emerald-200 select-all font-bold text-emerald-950">
                {lastSavedPath}
              </code>
              <p className="text-[11px] text-emerald-800">
                يمكنك العثور على هذا الملف بالدخول إلى تطبيق <strong>ملفاتي (My Files) ➔ وحدة التخزين الداخلية ➔ Documents ➔ TAHON</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyPath(lastSavedPath)}
              className="px-2.5 py-1 rounded bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold shrink-0 transition"
            >
              نسخ اسم الملف
            </button>
          </div>
        )}

        {/* Primary Action Buttons (Save in Documents/TAHON + Share WhatsApp) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Button 1: Save directly to Documents/TAHON */}
          <button
            type="button"
            onClick={handleSaveSqliteToTahona}
            disabled={isSaving}
            className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition active:scale-[0.99] disabled:opacity-50"
          >
            <HardDrive className="w-4 h-4 text-amber-200" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ نسخة SQLite في Documents/TAHON'}</span>
          </button>

          {/* Button 2: Share via WhatsApp & installed apps */}
          <button
            type="button"
            onClick={handleShareSqlite}
            disabled={isSharing}
            className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition active:scale-[0.99] disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 text-emerald-100" />
            <span>{isSharing ? 'جاري تجهيز المشاركة...' : 'مشاركة النسخة الاحتياطية (واتساب / التطبيقات)'}</span>
          </button>
        </div>

        {/* Secondary Options: JSON Save & Share, Import SQLite */}
        <div className="pt-2 border-t border-amber-200/70 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold ml-1">خيارات إضافية:</span>

          {/* Save JSON to TAHON */}
          <button
            type="button"
            onClick={handleSaveJsonToTahona}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-700" />
            <span>حفظ نسخة JSON في TAHON</span>
          </button>

          {/* Share JSON */}
          <button
            type="button"
            onClick={handleShareJson}
            disabled={isSharing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>مشاركة JSON عبر التطبيقات</span>
          </button>

          {/* Import SQLite file */}
          {currentRole === 'مدير' && (
            <div>
              <input
                ref={sqliteInputRef}
                type="file"
                accept=".sqlite,.db,application/x-sqlite3,application/octet-stream"
                onChange={handleSqliteFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => sqliteInputRef.current?.click()}
                disabled={isRestoring}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold transition disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isRestoring ? 'جاري الاستيراد...' : 'استيراد واستعادة من ملف SQLite (.sqlite)'}</span>
              </button>
            </div>
          )}

          {/* Import JSON */}
          {currentRole === 'مدير' && (
            <div>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                disabled={isRestoring}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium transition disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>استيراد واستعادة من JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Database State Management: Production Clean Start vs Demo Data */}
      {currentRole === 'مدير' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <RotateCcw className="w-5 h-5 text-rose-700" />
            <h2 className="text-base font-bold text-slate-900">إدارة وضع قاعدة البيانات (الإنتاج الفعلي vs البيانات التجريبية)</h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            يمكنك إعداد حالة قاعدة البيانات حسب غرض استخدام التطبيق؛ سواء للبدء الفعلي بالإنتاج اليومي للمطحنة أو لاستعراض وظائف النظام بالبيانات التوضيحية:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Clean Start for Production */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">البدء بقاعدة بيانات فارغة (للإنتاج الفعلي)</h3>
                  <p className="text-[11px] text-slate-500">تفريغ كافة العمليات وتصفير المخزون لتسجيل الحركات الميدانية الحقيقية.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleClearDatabase(true)}
                  className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-2xs text-center cursor-pointer"
                >
                  تفريغ العمليات (الإبقاء على أصناف المنتجات)
                </button>
                <button
                  type="button"
                  onClick={() => handleClearDatabase(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-rose-200 rounded-lg text-xs font-semibold transition text-center cursor-pointer"
                >
                  تفريغ شامل (100% فارغة)
                </button>
              </div>
            </div>

            {/* Load Demo Data */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">تعبئة البيانات التجريبية (للتدريب والعرض)</h3>
                  <p className="text-[11px] text-slate-500">شحن بيانات تجريبية متكاملة للموردين وأوامر التوريد والطحن والصرف.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetSampleData}
                className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs text-center cursor-pointer mt-1"
              >
                تعبئة البيانات التجريبية الافتراضية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard SQLite Management & Query Console */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Database className="w-5 h-5 text-emerald-800" />
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">تصدير يدوي لملفات SQLite للمطورين</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              محرك SQLite 3 WASM
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          يمكنك أيضاً تنزيل نسخة مباشرة للكمبيوتر أو فتحها في برامج خارجية مثل DB Browser for SQLite:
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Export SQLite .sqlite direct download */}
          <button
            type="button"
            onClick={handleSaveSqliteToTahona}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold shadow-2xs transition"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>تنزيل ملف SQLite (.sqlite) مباشرة</span>
          </button>
        </div>
      </div>

      {/* Interactive SQLite Query Console */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">منصة استعلامات SQLite المباشرة (SQLite Console)</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">SQLite 3 WASM Engine</span>
        </div>

        <p className="text-xs text-slate-400">
          يمكنك تشغيل أي استعلام SQL مباشر على جداول قاعدة البيانات (مثل: <code>suppliers</code>, <code>products</code>, <code>grain_stock</code>, <code>flour_stock</code>, <code>purchase_orders</code>, <code>milling_orders</code>, <code>withdrawal_orders</code>):
        </p>

        {/* Quick query buttons */}
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {[
            'SELECT * FROM suppliers;',
            'SELECT * FROM products;',
            'SELECT * FROM grain_stock;',
            'SELECT * FROM flour_stock;',
            'SELECT * FROM purchase_orders;',
            'SELECT * FROM milling_orders;',
            'SELECT * FROM withdrawal_orders;',
            'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 5;',
          ].map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => {
                setSqlQuery(query);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition"
            >
              {query}
            </button>
          ))}
        </div>

        {/* Query Input Box */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecuteSql();
            }}
            placeholder="اكتب استعلام SQL هنا..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
            dir="ltr"
          />
          <button
            type="button"
            onClick={handleExecuteSql}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs"
          >
            <Play className="w-4 h-4" />
            <span>تنفيذ الاستعلام</span>
          </button>
        </div>

        {/* SQL Error */}
        {sqlError && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-3 rounded-xl text-xs font-mono" dir="ltr">
            Error: {sqlError}
          </div>
        )}

        {/* SQL Results Table */}
        {sqlResult && sqlResult.length > 0 && (
          <div className="space-y-3 pt-2">
            {sqlResult.map((res, idx) => (
              <div key={idx} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs font-mono text-left" dir="ltr">
                    <thead className="bg-slate-800 text-slate-300 sticky top-0">
                      <tr>
                        {res.columns.map((col) => (
                          <th key={col} className="p-2.5 border-b border-slate-700 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {res.values.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/80">
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="p-2.5 whitespace-nowrap text-slate-400">
                              {val !== null && val !== undefined ? String(val) : '<NULL>'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400 font-mono border-t border-slate-800 text-right" dir="rtl">
                  عدد الصفوف المسترجعة: {res.values.length}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-800 text-sm">سجل تدقيق العمليات (Audit Logs)</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">عدد السجلات: {auditLogs.length}</span>
        </div>

        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/80 font-bold text-slate-600 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3">التوقيت</th>
                <th className="p-3">المستخدم المسؤول</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">تفاصيل العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{log.created_at}</td>
                    <td className="p-3 font-bold text-slate-800">{log.user_name}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    لا توجد سجلات تدقيق حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
