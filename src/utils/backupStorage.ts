import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface SaveBackupResult {
  success: boolean;
  filePath: string;
  isNative: boolean;
  uri?: string;
  message: string;
}

export interface ShareBackupResult {
  success: boolean;
  shared: boolean;
  message: string;
}

/**
 * Converts Uint8Array to Base64 using native FileReader (safe for large SQLite binary files)
 */
export async function uint8ArrayToBase64(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes]);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves backup file directly to /storage/emulated/0/Documents/TAHON/ on Android
 * or triggers browser download if in web browser.
 */
export async function saveBackupToTahonaFolder(
  filename: string,
  data: Uint8Array | string,
  isBinary: boolean
): Promise<SaveBackupResult> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // 1. Request permissions if needed on Android
      await Filesystem.requestPermissions().catch(() => {});

      // 2. Ensure TAHON folder exists inside public Documents directory (/storage/emulated/0/Documents/TAHON)
      try {
        await Filesystem.mkdir({
          path: 'TAHON',
          directory: Directory.Documents,
          recursive: true,
        });
      } catch {
        // Folder already exists or mkdir handled recursively
      }

      const filePath = `TAHON/${filename}`;

      // 3. Write file
      if (isBinary && data instanceof Uint8Array) {
        const base64Data = await uint8ArrayToBase64(data);
        await Filesystem.writeFile({
          path: filePath,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
      } else {
        const textData = typeof data === 'string' ? data : new TextDecoder().decode(data);
        await Filesystem.writeFile({
          path: filePath,
          data: textData,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
      }

      // 4. Get file URI for confirmation
      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Documents,
      });

      const displayPath = `/storage/emulated/0/Documents/TAHON/${filename}`;

      return {
        success: true,
        filePath: displayPath,
        uri: uriResult.uri,
        isNative: true,
        message: `تم حفظ النسخة الاحتياطية بنجاح في المجلد العام:\n${displayPath}`,
      };
    } catch (err: any) {
      console.error('Error saving to native Documents/TAHON:', err);
      // Fallback to browser download if native fails
      fallbackDownload(filename, data, isBinary);
      return {
        success: true,
        filePath: filename,
        isNative: false,
        message: `تم تنزيل النسخة الاحتياطية (${filename}) في التنزيلات.`,
      };
    }
  } else {
    // Web / PWA browser environment
    fallbackDownload(filename, data, isBinary);
    return {
      success: true,
      filePath: filename,
      isNative: false,
      message: `تم حفظ وتنزيل النسخة الاحتياطية (${filename}) بنجاح. (على تطبيق الأندرويد APK سيتم حفظها تلقائياً في /storage/emulated/0/Documents/TAHON).`,
    };
  }
}

/**
 * Shares backup file directly using Android native Share dialog
 * (WhatsApp, Telegram, Drive, Email, etc.) with Web Share fallback
 */
export async function shareBackupFile(
  filename: string,
  data: Uint8Array | string,
  isBinary: boolean,
  mimeType: string = isBinary ? 'application/x-sqlite3' : 'application/json'
): Promise<ShareBackupResult> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      // 1. Ensure file is saved to Documents/TAHON first
      const saveRes = await saveBackupToTahonaFolder(filename, data, isBinary);
      const fileUri = saveRes.uri;

      // 2. Trigger native Android Share Sheet
      await Share.share({
        title: 'نسخة احتياطية - نظام إدارة الطاحونة',
        text: `نسخة احتياطية لقاعدة بيانات الطاحونة (${filename}) محفوظة في Documents/TAHON`,
        url: fileUri,
        files: fileUri ? [fileUri] : undefined,
        dialogTitle: 'مشاركة النسخة الاحتياطية (واتساب، تيليجرام، درايف...)',
      });

      return {
        success: true,
        shared: true,
        message: 'تم فتح نافذة المشاركة بنجاح.',
      };
    } catch (err: any) {
      // If user cancelled the share sheet, err.message may contain "Share canceled"
      if (err.message && (err.message.includes('canceled') || err.message.includes('cancelled'))) {
        return {
          success: true,
          shared: false,
          message: 'تم إلغاء المشاركة بواسطة المستخدم.',
        };
      }
      console.error('Native share error:', err);
      return {
        success: false,
        shared: false,
        message: `فشلت المشاركة: ${err.message || 'حدث خطأ غير متوقع'}`,
      };
    }
  } else {
    // Web Share API fallback (supports Chrome Android & modern browsers)
    try {
      const blob =
        data instanceof Uint8Array
          ? new Blob([data], { type: mimeType })
          : new Blob([data], { type: mimeType });

      const file = new File([blob], filename, { type: mimeType });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'نسخة احتياطية - نظام إدارة الطاحونة',
          text: `نسخة احتياطية لقاعدة بيانات الطاحونة: ${filename}`,
        });
        return {
          success: true,
          shared: true,
          message: 'تمت المشاركة بنجاح عبر التطبيقات.',
        };
      } else if (navigator.share) {
        // Share without file attachment if files not supported
        fallbackDownload(filename, data, isBinary);
        await navigator.share({
          title: 'نسخة احتياطية - نظام إدارة الطاحونة',
          text: `تم تنزيل النسخة الاحتياطية: ${filename}`,
        });
        return {
          success: true,
          shared: true,
          message: 'تم تنزيل النسخة ومشاركة الإشعار.',
        };
      } else {
        // Fallback to normal download
        fallbackDownload(filename, data, isBinary);
        return {
          success: true,
          shared: false,
          message:
            'المتصفح الحالي لا يدعم نافذة المشاركة المباشرة؛ تم تنزيل الملف ويمكنك إرساله يدوياً عبر واتساب أو أي تطبيق آخر.',
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: true,
          shared: false,
          message: 'تم إلغاء المشاركة.',
        };
      }
      fallbackDownload(filename, data, isBinary);
      return {
        success: true,
        shared: false,
        message: 'تم تنزيل الملف، يمكنك مشاركته يدوياً.',
      };
    }
  }
}

/**
 * Fallback browser download helper
 */
function fallbackDownload(filename: string, data: Uint8Array | string, isBinary: boolean) {
  const mime = isBinary ? 'application/x-sqlite3' : 'application/json';
  const blob =
    data instanceof Uint8Array ? new Blob([data], { type: mime }) : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
