/**
 * نظام ترخيص وتفعيل تطبيق إدارة محل الطاحونة
 * Offline License & Trial Management Service
 * 
 * الميزات:
 * 1. فترة تجريبية مجانية لمدة 3 أيام من تاريخ أول استخدام
 * 2. ربط الترخيص بمعرف جهاز فريد (Device ID / Hardware Fingerprint)
 * 3. خوارزمية توقيع وتشفير متطابقة مع مولد تراخيص المطور (license-generator.html)
 * 4. أنواع التراخيص: دائم (مدى الحياة)، سنوي (1 سنة)، تمديد تجريبي
 * 5. حماية ضد التلاعب بساعة النظام (Clock Tamper Protection)
 */

export type LicenseType = 'lifetime' | 'annual' | 'trial_extension_30' | 'trial_extension_7';

export interface LicenseInfo {
  isLicensed: boolean;
  isTrial: boolean;
  isExpired: boolean;
  trialDaysLeft: number;
  trialHoursLeft: number;
  trialTotalDays: number;
  trialStartDate: string;
  trialEndDate: string;
  licenseType?: LicenseType;
  licenseKey?: string;
  clientName?: string;
  activatedAt?: string;
  expiresAt?: string;
  deviceId: string;
  statusText: string;
  clockTampered?: boolean;
}

const STORAGE_KEYS = {
  DEVICE_ID: 'mill_device_id',
  TRIAL_START: 'mill_trial_start_time',
  LAST_TICK: 'mill_last_recorded_tick',
  LICENSE_DATA: 'mill_active_license_payload',
};

// السر المشترك بين التطبيق ومولد التراخيص (Developer Secret Salt)
export const DEVELOPER_SALT = 'MILL_GRAIN_SECURE_SALT_v1_2026_PROD';
export const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 أيام بالمللي ثانية

/**
 * دالة تشفير ومطابقة SHA-256 نقية ومستقلة تماماً
 * تعمل في أي بيئة (متصفح، PWA، تطبيق محلي) دون أي مكتبات خارجية
 */
export function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let i: number;
  let j: number;

  for (i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      let w15 = w[j - 15];
      let w2 = w[j - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);

      w[j] = j < 16 ? (w[j] | 0) : ((w[j - 16] + s0 + w[j - 7] + s1) | 0);

      const s1_maj = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1_maj + ch + k[j] + w[j]) | 0;

      const s0_maj = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0_maj + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export class LicenseService {
  /**
   * استرجاع أو إنشاء معرف فريد للجهاز (Device ID)
   * مثال: MILL-9A4F-82D1-C73E
   */
  public static getDeviceId(): string {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      // توليد معرف عشوائي فريد ومميز
      const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randomPart3 = Math.random().toString(36).substring(2, 6).toUpperCase();
      deviceId = `MILL-${randomPart1}-${randomPart2}-${randomPart3}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }

  /**
   * استرجاع وقت بدء الفترة التجريبية أو تهيئته عند أول فتح للتطبيق
   */
  public static getTrialStartTime(): number {
    let startStr = localStorage.getItem(STORAGE_KEYS.TRIAL_START);
    if (!startStr) {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEYS.TRIAL_START, now.toString());
      localStorage.setItem(STORAGE_KEYS.LAST_TICK, now.toString());
      return now;
    }
    return parseInt(startStr, 10);
  }

  /**
   * فحص التلاعب بساعة النظام (Clock rollback detection)
   */
  private static checkClockTamper(): boolean {
    const now = Date.now();
    const lastTickStr = localStorage.getItem(STORAGE_KEYS.LAST_TICK);
    if (lastTickStr) {
      const lastTick = parseInt(lastTickStr, 10);
      // إذا كانت الساعة الحالية أقدم بأكثر من 20 دقيقة من آخر تسجيل
      if (now < lastTick - 20 * 60 * 1000) {
        return true;
      }
    }
    // تحديث آخر نبضة
    localStorage.setItem(STORAGE_KEYS.LAST_TICK, now.toString());
    return false;
  }

  /**
   * توليد توقيع التشفير لمفتاح الترخيص
   */
  public static generateSignature(deviceId: string, type: LicenseType, expiryTimestamp: number): string {
    const cleanId = deviceId.trim().toUpperCase();
    const raw = `${cleanId}|${type}|${expiryTimestamp}|${DEVELOPER_SALT}`;
    const hash = sha256Pure(raw).toUpperCase();
    // نأخذ مقاطع محددة من الهاش لتكوين توقيع مدمج وأنيق
    const part1 = hash.substring(0, 4);
    const part2 = hash.substring(8, 12);
    const part3 = hash.substring(16, 20);
    return `${part1}-${part2}-${part3}`;
  }

  /**
   * توليد مفتاح ترخيص متكامل (يستخدم من قبل المطور في المولد)
   */
  public static generateLicenseKey(
    deviceId: string,
    type: LicenseType,
    clientName?: string,
    customExpiryTimestamp?: number
  ): { key: string; expiresAt: string; typeText: string } {
    const cleanId = deviceId.trim().toUpperCase();
    let expiry = 0;
    let typeCode = 'LFT';
    let typeText = 'ترخيص دائم مدى الحياة';

    if (type === 'annual') {
      typeCode = 'YR1';
      typeText = 'ترخيص سنوي (1 سنة)';
      expiry = customExpiryTimestamp || Date.now() + 365 * 24 * 60 * 60 * 1000;
    } else if (type === 'trial_extension_30') {
      typeCode = 'T30';
      typeText = 'تمديد تجريبي (30 يوم)';
      expiry = customExpiryTimestamp || Date.now() + 30 * 24 * 60 * 60 * 1000;
    } else if (type === 'trial_extension_7') {
      typeCode = 'T07';
      typeText = 'تمديد تجريبي (7 أيام)';
      expiry = customExpiryTimestamp || Date.now() + 7 * 24 * 60 * 60 * 1000;
    } else {
      typeCode = 'LFT';
      typeText = 'ترخيص دائم مدى الحياة';
      expiry = 0; // 0 يعني بدون انتهاء
    }

    // استخراج أجزاء من معرف الجهاز
    const idParts = cleanId.split('-');
    const idSnippet = idParts.length >= 2 ? `${idParts[1]}` : 'DEV';

    // توقيع البيانات
    const signature = this.generateSignature(cleanId, type, expiry);

    // كود الانتهاء المشفر (hex أو 000000)
    const expCode = expiry === 0 ? 'PERM' : expiry.toString(36).toUpperCase();

    // تركيب المفتاح: MILL-[TYPE]-[ID_SNIPPET]-[EXP_CODE]-[SIGNATURE]
    const key = `MILL-${typeCode}-${idSnippet}-${expCode}-${signature}`;

    const expiresAt = expiry === 0 ? 'مدى الحياة (بدون تاريخ انتهاء)' : new Date(expiry).toLocaleDateString('ar-SA');

    return { key, expiresAt, typeText };
  }

  /**
   * التحقق من صحة مفتاح الترخيص مع معرف الجهاز
   */
  public static verifyLicenseKey(
    key: string,
    deviceId: string
  ): { valid: boolean; type?: LicenseType; expiry?: number; error?: string } {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'الرجاء إدخال مفتاح الترخيص' };
    }

    const cleanKey = key.trim().toUpperCase();
    const cleanId = deviceId.trim().toUpperCase();

    const parts = cleanKey.split('-');
    // المتوقع: MILL - TYPE - ID_SNIPPET - EXP_CODE - SIG1 - SIG2 - SIG3 (إجمالي 7 مقاطع)
    if (parts.length !== 7 || parts[0] !== 'MILL') {
      return { valid: false, error: 'صيغة كود الترخيص غير صحيحة، تأكد من نسخه بالكامل' };
    }

    const typeCode = parts[1];
    const expCode = parts[3];
    const signature = `${parts[4]}-${parts[5]}-${parts[6]}`;

    let type: LicenseType;
    if (typeCode === 'LFT') type = 'lifetime';
    else if (typeCode === 'YR1') type = 'annual';
    else if (typeCode === 'T30') type = 'trial_extension_30';
    else if (typeCode === 'T07') type = 'trial_extension_7';
    else {
      return { valid: false, error: 'نوع الترخيص غير معتمد' };
    }

    let expiry = 0;
    if (expCode !== 'PERM') {
      try {
        expiry = parseInt(expCode, 36);
        if (isNaN(expiry) || expiry <= 0) {
          return { valid: false, error: 'تاريخ صلاحية الترخيص غير صالح' };
        }
      } catch {
        return { valid: false, error: 'خطأ في معالجة صلاحية الترخيص' };
      }
    }

    // التحقق من التوقيع الرياضي المشفر
    const expectedSignature = this.generateSignature(cleanId, type, expiry);
    if (signature !== expectedSignature) {
      return {
        valid: false,
        error: 'كود الترخيص غير مخصص لهذا الجهاز، أو تم التعديل عليه.',
      };
    }

    // فحص انتهاء الصلاحية
    if (expiry > 0 && Date.now() > expiry) {
      const expiredDateStr = new Date(expiry).toLocaleDateString('ar-SA');
      return {
        valid: false,
        type,
        expiry,
        error: `هذا الترخيص منتهي الصلاحية منذ تاريخ ${expiredDateStr}`,
      };
    }

    return { valid: true, type, expiry };
  }

  /**
   * تفعيل ترخيص وحفظه محلياً في التطبيق
   */
  public static activateLicense(
    key: string,
    clientName?: string
  ): { success: boolean; message: string; info?: LicenseInfo } {
    const deviceId = this.getDeviceId();
    const verification = this.verifyLicenseKey(key, deviceId);

    if (!verification.valid || !verification.type) {
      return { success: false, message: verification.error || 'فشل التحقق من الترخيص' };
    }

    const payload = {
      key: key.trim().toUpperCase(),
      type: verification.type,
      expiry: verification.expiry || 0,
      clientName: clientName || '',
      activatedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEYS.LICENSE_DATA, JSON.stringify(payload));

    const updatedInfo = this.checkStatus();
    return {
      success: true,
      message: 'تم تفعيل ترخيص النظام بنجاح! شكراً لاختيارك نظامنا.',
      info: updatedInfo,
    };
  }

  /**
   * إلغاء التفعيل والعودة للوضع الافتراضي (للمطور فقط أثناء الاختبار)
   */
  public static deactivateLicense(): void {
    localStorage.removeItem(STORAGE_KEYS.LICENSE_DATA);
  }

  /**
   * تصفير الفترة التجريبية (للمطور فقط لاختبار انتهاء الفترة التجريبية)
   */
  public static simulateTrialExpired(): void {
    const expiredTime = Date.now() - (TRIAL_DURATION_MS + 1000 * 60);
    localStorage.setItem(STORAGE_KEYS.TRIAL_START, expiredTime.toString());
  }

  public static resetTrial(): void {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEYS.TRIAL_START, now.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_TICK, now.toString());
    localStorage.removeItem(STORAGE_KEYS.LICENSE_DATA);
  }

  /**
   * استرجاع الحالة الحالية الكاملة للترخيص والفترة التجريبية
   */
  public static checkStatus(): LicenseInfo {
    const deviceId = this.getDeviceId();
    const clockTampered = this.checkClockTamper();

    // 1. فحص وجود ترخيص نشط محفوظ
    const savedLicenseStr = localStorage.getItem(STORAGE_KEYS.LICENSE_DATA);
    if (savedLicenseStr) {
      try {
        const payload = JSON.parse(savedLicenseStr);
        if (payload && payload.key) {
          const verification = this.verifyLicenseKey(payload.key, deviceId);
          if (verification.valid && verification.type) {
            const isLifetime = payload.expiry === 0;
            const expiresAt = isLifetime
              ? 'مدى الحياة'
              : new Date(payload.expiry).toLocaleDateString('ar-SA');

            let typeName = 'ترخيص دائم مدى الحياة';
            if (payload.type === 'annual') typeName = 'ترخيص سنوي';
            else if (payload.type === 'trial_extension_30') typeName = 'ترخيص تجريبي ممتد (30 يوم)';
            else if (payload.type === 'trial_extension_7') typeName = 'ترخيص تجريبي ممتد (7 أيام)';

            return {
              isLicensed: true,
              isTrial: false,
              isExpired: false,
              trialDaysLeft: 0,
              trialHoursLeft: 0,
              trialTotalDays: 3,
              trialStartDate: '',
              trialEndDate: '',
              licenseType: payload.type,
              licenseKey: payload.key,
              clientName: payload.clientName,
              activatedAt: new Date(payload.activatedAt).toLocaleDateString('ar-SA'),
              expiresAt,
              deviceId,
              statusText: `مرخص (${typeName})`,
              clockTampered,
            };
          } else {
            // الترخيص المحفوظ انتهى أو تم التلاعب به
            if (verification.expiry && Date.now() > verification.expiry) {
              return {
                isLicensed: false,
                isTrial: false,
                isExpired: true,
                trialDaysLeft: 0,
                trialHoursLeft: 0,
                trialTotalDays: 3,
                trialStartDate: '',
                trialEndDate: '',
                licenseType: payload.type,
                licenseKey: payload.key,
                deviceId,
                statusText: 'انتهت صلاحية الترخيص السنوي',
                clockTampered,
              };
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse license payload', e);
      }
    }

    // 2. إذا لم يكن هناك ترخيص نشط: فحص الفترة التجريبية (3 أيام)
    const trialStart = this.getTrialStartTime();
    const trialEnd = trialStart + TRIAL_DURATION_MS;
    const now = Date.now();

    const isTrialExpired = now >= trialEnd || clockTampered;
    const remainingMs = Math.max(0, trialEnd - now);
    const trialDaysLeft = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const trialHoursLeft = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    const startDateStr = new Date(trialStart).toLocaleDateString('ar-SA');
    const endDateStr = new Date(trialEnd).toLocaleDateString('ar-SA');

    if (isTrialExpired) {
      return {
        isLicensed: false,
        isTrial: false,
        isExpired: true,
        trialDaysLeft: 0,
        trialHoursLeft: 0,
        trialTotalDays: 3,
        trialStartDate: startDateStr,
        trialEndDate: endDateStr,
        deviceId,
        statusText: clockTampered
          ? 'تم اكتشاف تلاعب في ساعة النظام - يلزم التفعيل للمتابعة'
          : 'انتهت الفترة التجريبية (3 أيام) - يلزم تفعيل الترخيص',
        clockTampered,
      };
    }

    return {
      isLicensed: false,
      isTrial: true,
      isExpired: false,
      trialDaysLeft,
      trialHoursLeft,
      trialTotalDays: 3,
      trialStartDate: startDateStr,
      trialEndDate: endDateStr,
      deviceId,
      statusText: `فترة تجريبية (متبقي ${trialDaysLeft} يوم و ${trialHoursLeft} ساعة)`,
      clockTampered,
    };
  }
}
