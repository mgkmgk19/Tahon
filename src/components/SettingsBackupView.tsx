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
} from 'lucide-react';
import { UserRole, AuditLog } from '../types';
import { millDb } from '../db/millDatabase';

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
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM suppliers;');
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; values: any[][] }[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const sqliteInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Export Binary SQLite file (.sqlite)
  const handleExportSqlite = () => {
    try {
      const bytes = millDb.exportSqliteBinary();
      const blob = new Blob([bytes], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mill_database_${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotice('success', 'تم تصدير ملف قاعدة بيانات SQLite (.sqlite) بنجاح.');
    } catch (err: any) {
      showNotice('error', err.message || 'فشل تصدير ملف SQLite');
    }
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

  // Export JSON backup
  const handleExportBackup = async () => {
    try {
      const jsonData = await millDb.exportFullDatabase();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grain-mill-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotice('success', 'تم تصدير النسخة الاحتياطية JSON بنجاح.');
    } catch (err: any) {
      showNotice('error', err.message || 'فشل تصدير النسخة الاحتياطية');
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
    if (!window.confirm('هل تريد إعادة تعيين البيانات إلى البيانات التجريبية الافتراضية؟ سيتم تحديث السجلات.')) return;
    try {
      await millDb.resetToDefaults(currentUserName);
      showNotice('success', 'تمت إعادة تهيئة بيانات SQLite النموذجية بنجاح.');
    } catch (err: any) {
      showNotice('error', 'فشل إعادة التعيين');
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

      {/* SQLite Management & Backup */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Database className="w-5 h-5 text-emerald-800" />
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">إدارة قاعدة بيانات SQLite والنسخ الاحتياطي</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              محرك SQLite مدمج
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          يعمل التطبيق الآن بواسطة محرك قاعدة بيانات <strong>SQLite</strong> محلي بالكامل وبأقصى سرعة ممكنة وبدون أي اعتماد على خوادم خارجية. يمكنك تحميل ملف قاعدة البيانات بصيغة <code>.sqlite</code> لفتحه في أي برنامج مثل DB Browser for SQLite أو أخذ نسخة JSON.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Export SQLite .sqlite */}
          <button
            type="button"
            onClick={handleExportSqlite}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>تصدير ملف SQLite (.sqlite)</span>
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-bold transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>{isRestoring ? 'جاري الاستيراد...' : 'استيراد ملف SQLite (.sqlite)'}</span>
              </button>
            </div>
          )}

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <FileCode className="w-4 h-4 text-amber-700" />
            <span>تصدير نسخة JSON</span>
          </button>

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
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>استيراد JSON</span>
              </button>
            </div>
          )}

          {/* Reset default data */}
          {currentRole === 'مدير' && (
            <button
              type="button"
              onClick={handleResetSampleData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-bold transition mr-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة تعيين البيانات الافتراضية</span>
            </button>
          )}
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
