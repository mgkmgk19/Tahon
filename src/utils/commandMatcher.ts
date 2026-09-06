import { CommandKeyword } from '../types';

/**
 * تطبيع وتبسيط النصوص العربية للبحث الذكي وتجاوز اختلافات الإملاء والهمزات
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // حذف حركات التشكيل والتنوين
    .replace(/[أإآٱ]/g, 'ا') // توحيد الألف
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة
    .replace(/ى/g, 'ي') // توحيد الألف المقصورة والياء
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ') // إزالة الرموز
    .replace(/\s+/g, ' '); // ضغط المسافات
}

/**
 * تقسيم الكلمات المفتاحية المفصولة بفواصل (عربية أو إنجليزية)
 */
export function parseKeywords(keywordsString: string): string[] {
  if (!keywordsString) return [];
  return keywordsString
    .split(/[,،\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

export interface CommandMatchResult {
  command: CommandKeyword;
  matchedKeyword?: string;
  matchType: 'keyword_exact' | 'keyword_prefix' | 'keyword_contains' | 'title' | 'description' | 'all';
  score: number;
}

/**
 * فحص وتنبؤ الأوامر المتطابقة بناءً على النص المدخل
 */
export function matchCommands(query: string, commands: CommandKeyword[]): CommandMatchResult[] {
  const normQuery = normalizeArabic(query);
  if (!normQuery) {
    // عند عدم وجود إدخال، إعادة جميع الأوامر مرتبة بالنظام
    return commands.map((command) => ({
      command,
      matchType: 'all',
      score: 0,
    }));
  }

  const queryWords = normQuery.split(' ').filter(Boolean);
  const results: CommandMatchResult[] = [];

  for (const command of commands) {
    const normTitle = normalizeArabic(command.command_title);
    const normDesc = normalizeArabic(command.command_description);
    const normCategory = normalizeArabic(command.category);
    const rawKeywords = parseKeywords(command.keywords);

    let bestScore = 0;
    let matchedKeyword: string | undefined;
    let matchType: CommandMatchResult['matchType'] = 'description';

    // 1. فحص الكلمات المفتاحية (الأعلى أولوية)
    for (const kw of rawKeywords) {
      const normKw = normalizeArabic(kw);
      if (!normKw) continue;

      if (normKw === normQuery) {
        // تطابق تام
        if (bestScore < 100) {
          bestScore = 100;
          matchedKeyword = kw;
          matchType = 'keyword_exact';
        }
      } else if (normKw.startsWith(normQuery)) {
        // بداية الكلمة المفتاحية
        if (bestScore < 85) {
          bestScore = 85;
          matchedKeyword = kw;
          matchType = 'keyword_prefix';
        }
      } else if (normKw.includes(normQuery) || normQuery.includes(normKw)) {
        // الكلمة المفتاحية تحتوي على النص أو العكس
        if (bestScore < 70) {
          bestScore = 70;
          matchedKeyword = kw;
          matchType = 'keyword_contains';
        }
      } else {
        // فحص بالكلمات الجزئية
        const allWordsMatch = queryWords.every((w) => normKw.includes(w));
        if (allWordsMatch && bestScore < 60) {
          bestScore = 60;
          matchedKeyword = kw;
          matchType = 'keyword_contains';
        }
      }
    }

    // 2. فحص عنوان الأمر
    if (normTitle === normQuery) {
      if (bestScore < 95) {
        bestScore = 95;
        matchedKeyword = command.command_title;
        matchType = 'title';
      }
    } else if (normTitle.includes(normQuery)) {
      if (bestScore < 65) {
        bestScore = 65;
        matchType = 'title';
      }
    } else if (queryWords.every((w) => normTitle.includes(w))) {
      if (bestScore < 55) {
        bestScore = 55;
        matchType = 'title';
      }
    }

    // 3. فحص الوصف والتصنيف
    if (normCategory.includes(normQuery) && bestScore < 40) {
      bestScore = 40;
      matchType = 'description';
    } else if (normDesc.includes(normQuery) && bestScore < 30) {
      bestScore = 30;
      matchType = 'description';
    } else if (queryWords.every((w) => normDesc.includes(w) || normTitle.includes(w)) && bestScore < 35) {
      bestScore = 35;
      matchType = 'description';
    }

    if (bestScore > 0) {
      results.push({
        command,
        matchedKeyword,
        matchType,
        score: bestScore,
      });
    }
  }

  // ترتيب النتائج حسب الأعلى ملاءمة
  return results.sort((a, b) => b.score - a.score);
}
