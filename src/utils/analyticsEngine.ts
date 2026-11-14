/**
 * MartiaPlanner — Modular Performance Evaluation, Time Budget & Analytics Engine
 *
 * Implements Sections 3 through 12 of the specification:
 * - Section 3: Dedicated Gradient Header Themes per Subject & Activity Type
 * - Section 4: Actual-to-Predicted Time Ratio Indicator (can exceed 100%, never conflated with task completion)
 * - Section 5: Daily Educational Evaluation (T = Study Time, Q = Exercises, L = Weighted Learning Quality 0-10, E = Composite)
 * - Section 6 & 7: Three-Tier Activity Classification (educational, restricted, essential) & Restricted Control Index (C)
 * - Section 8: Final Daily Composite Score S = (E * 0.8) + (C * 0.2) with automatic weight normalization
 * - Section 9: Daily Time Budget (ظرف زمانی روزانه) & Study Share of Time Budget
 * - Section 10, 11 & 12: Period Aggregation, Period-to-Period Comparison, and Extensible Weight Configuration
 */

import type {
  ActivityCategory,
  ActivityGroupType,
  DailyPlanItem,
  DailyTimeBudgetConfig,
  DailyStudyGoalConfig,
} from '../types.ts';
import {
  formatJalaliCompact,
  formatJalaliFull,
  getPersianWeekdayName,
  addDaysISO,
  getDateRangeISOList,
  toPersianDigits,
} from './jalali.ts';

// ============================================================================
// 1. CONFIGURABLE SCORING WEIGHTS (Section 5.4, Section 8, Section 12)
// ============================================================================
export interface AnalyticsWeightsConfig {
  studyTimeWeight: number; // Default 0.40 (40%)
  exercisesWeight: number; // Default 0.30 (30%)
  learningQualityWeight: number; // Default 0.30 (30%)
  educationalCompositeWeight: number; // Default 0.80 (80%)
  restrictedControlWeight: number; // Default 0.20 (20%)
}

export const DEFAULT_ANALYTICS_WEIGHTS: AnalyticsWeightsConfig = {
  studyTimeWeight: 0.4,
  exercisesWeight: 0.3,
  learningQualityWeight: 0.3,
  educationalCompositeWeight: 0.8,
  restrictedControlWeight: 0.2,
};

// ============================================================================
// 2. THREE-TIER ACTIVITY CLASSIFICATION (Section 6)
// ============================================================================
const RESTRICTED_KEYWORDS = [
  'گوشی',
  'موبایل',
  'تلفن',
  'شبکه',
  'اینستاگرام',
  'تلگرام',
  'تلویزیون',
  'فیلم',
  'سریال',
  'بازی',
  'گیم',
  'سرگرمی',
  'تفریح دیجیتال',
  'یوتیوب',
  'کنسول',
];

const ESSENTIAL_KEYWORDS = [
  'استراحت',
  'خواب',
  'غذا',
  'ناهار',
  'شام',
  'صبحانه',
  'عصرانه',
  'تغذیه',
  'ورزش',
  'تحرک',
  'پیاده‌روی',
  'باشگاه',
  'شخصی',
  'نظافت',
  'خانواده',
  'عبادت',
  'نماز',
];

export function classifyCategoryActivityGroup(
  category: Pick<ActivityCategory, 'id' | 'title' | 'is_study' | 'activity_group'>
): ActivityGroupType {
  if (Number(category.is_study) === 1) {
    return 'educational';
  }
  if (
    category.activity_group === 'educational' ||
    category.activity_group === 'restricted' ||
    category.activity_group === 'essential'
  ) {
    return category.activity_group;
  }
  const id = (category.id || '').toLowerCase();
  const title = category.title || '';

  if (
    id === 'cat-phone' ||
    id === 'cat-tv' ||
    id === 'cat-game' ||
    RESTRICTED_KEYWORDS.some((kw) => title.includes(kw))
  ) {
    return 'restricted';
  }

  if (
    id === 'cat-rest' ||
    id === 'cat-sport' ||
    ESSENTIAL_KEYWORDS.some((kw) => title.includes(kw))
  ) {
    return 'essential';
  }

  return 'essential';
}

export function classifyPlanActivityGroup(
  plan: Pick<
    DailyPlanItem,
    'is_study' | 'category_id' | 'category_title_snapshot' | 'activity_group_snapshot'
  >,
  categoriesMap?: Map<string, ActivityCategory>
): ActivityGroupType {
  if (Number(plan.is_study) === 1) {
    return 'educational';
  }
  if (
    plan.activity_group_snapshot === 'educational' ||
    plan.activity_group_snapshot === 'restricted' ||
    plan.activity_group_snapshot === 'essential'
  ) {
    return plan.activity_group_snapshot;
  }
  const cat = categoriesMap?.get(plan.category_id);
  if (cat) {
    return classifyCategoryActivityGroup(cat);
  }
  return classifyCategoryActivityGroup({
    id: plan.category_id,
    title: plan.category_title_snapshot || '',
    is_study: plan.is_study,
  });
}

export function getActivityGroupLabel(group: ActivityGroupType): string {
  switch (group) {
    case 'educational':
      return 'فعالیت آموزشی';
    case 'restricted':
      return 'تفریحی و محدودشونده';
    case 'essential':
      return 'ضروری، بازیابی و سلامت';
  }
}

// ============================================================================
// 3. LEARNING QUALITY 0-10 PARSER & FORMATTER (Section 1.7 & Section 5.3)
// ============================================================================
const LEGACY_QUALITY_MAP_0_TO_10: Record<string, number> = {
  excellent: 9.5,
  good: 8,
  average: 6,
  weak: 3,
};

/**
 * Parses a stored learning_quality value into a number in [0, 10], or null if unrecorded.
 * Supports integer strings "0".."10" as well as legacy 'excellent'|'good'|'average'|'weak'.
 */
export function parseLearningQuality0To10(
  raw: string | number | null | undefined
): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') {
    if (isNaN(raw)) return null;
    return Math.max(0, Math.min(10, raw));
  }
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed in LEGACY_QUALITY_MAP_0_TO_10) {
    return LEGACY_QUALITY_MAP_0_TO_10[trimmed];
  }
  const num = Number(trimmed);
  if (!isNaN(num) && num >= 0 && num <= 10) {
    return Math.round(num * 10) / 10;
  }
  return null;
}

export function getLearningQualityDescriptor(score0To10: number | null): string {
  if (score0To10 === null) return 'ثبت‌نشده';
  if (score0To10 >= 9) return 'عالی';
  if (score0To10 >= 7) return 'خوب';
  if (score0To10 >= 5) return 'متوسط';
  if (score0To10 >= 3) return 'ضعیف';
  return 'بسیار ضعیف';
}

// ============================================================================
// 4. DEDICATED GRADIENT CARD HEADER PALETTE (Section 3)
// ============================================================================
export interface CardGradientTheme {
  headerGradient: string; // Tailwind gradient classes for card header only
  badgeBg: string; // Corner badge background on header
  accentText: string; // Accent text color inside card body
  softTintBg: string; // Subtle tint for description box inside card body
  borderHover: string; // Card hover border
  hexColor: string; // Chart color representation
}

export function getCardGradientTheme(
  subjectName: string | null,
  categoryTitle: string,
  isStudy: boolean,
  activityGroup: ActivityGroupType
): CardGradientTheme {
  if (!isStudy) {
    if (categoryTitle.includes('گوشی') || categoryTitle.includes('شبکه')) {
      return {
        headerGradient: 'bg-gradient-to-l from-amber-600 via-orange-500 to-amber-500 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-amber-700 dark:text-amber-400',
        softTintBg: 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-100 dark:border-amber-900/40',
        borderHover: 'hover:border-amber-400 dark:hover:border-amber-600',
        hexColor: '#f59e0b',
      };
    }
    if (categoryTitle.includes('تلویزیون') || categoryTitle.includes('فیلم')) {
      return {
        headerGradient: 'bg-gradient-to-l from-sky-600 via-cyan-600 to-blue-500 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-sky-700 dark:text-sky-400',
        softTintBg: 'bg-sky-50/70 dark:bg-sky-950/25 border-sky-100 dark:border-sky-900/40',
        borderHover: 'hover:border-sky-400 dark:hover:border-sky-600',
        hexColor: '#0284c7',
      };
    }
    if (categoryTitle.includes('بازی') || activityGroup === 'restricted') {
      return {
        headerGradient: 'bg-gradient-to-l from-fuchsia-600 via-purple-600 to-pink-500 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-purple-700 dark:text-purple-400',
        softTintBg: 'bg-purple-50/70 dark:bg-purple-950/25 border-purple-100 dark:border-purple-900/40',
        borderHover: 'hover:border-purple-400 dark:hover:border-purple-600',
        hexColor: '#9333ea',
      };
    }
    if (categoryTitle.includes('ورزش') || categoryTitle.includes('تحرک')) {
      return {
        headerGradient: 'bg-gradient-to-l from-teal-600 via-emerald-600 to-cyan-600 text-white',
        badgeBg: 'bg-black/20 text-white border border-white/20',
        accentText: 'text-teal-700 dark:text-teal-400',
        softTintBg: 'bg-teal-50/70 dark:bg-teal-950/25 border-teal-100 dark:border-teal-900/40',
        borderHover: 'hover:border-teal-400 dark:hover:border-teal-600',
        hexColor: '#0d9488',
      };
    }
    // Rest / Food / Personal Essential
    return {
      headerGradient: 'bg-gradient-to-l from-emerald-600 via-teal-500 to-green-500 text-white',
      badgeBg: 'bg-black/20 text-white border border-white/20',
      accentText: 'text-emerald-700 dark:text-emerald-400',
      softTintBg: 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/40',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      hexColor: '#10b981',
    };
  }

  // Distinct Subject Gradients (Section 3.2)
  const name = subjectName || '';
  if (name.includes('فارسی') || name.includes('ادبیات') || name.includes('نگارش')) {
    return {
      headerGradient: 'bg-gradient-to-l from-indigo-700 via-indigo-600 to-violet-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-indigo-700 dark:text-indigo-300',
      softTintBg: 'bg-indigo-50/60 dark:bg-indigo-950/25 border-indigo-100 dark:border-indigo-900/40',
      borderHover: 'hover:border-indigo-400 dark:hover:border-indigo-500',
      hexColor: '#4f46e5',
    };
  }
  if (name.includes('ریاضی') || name.includes('هندسه') || name.includes('حسابان')) {
    return {
      headerGradient: 'bg-gradient-to-l from-blue-700 via-blue-600 to-cyan-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-blue-700 dark:text-blue-300',
      softTintBg: 'bg-blue-50/60 dark:bg-blue-950/25 border-blue-100 dark:border-blue-900/40',
      borderHover: 'hover:border-blue-400 dark:hover:border-blue-500',
      hexColor: '#2563eb',
    };
  }
  if (name.includes('زیست')) {
    return {
      headerGradient: 'bg-gradient-to-l from-emerald-700 via-green-600 to-teal-500 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-emerald-700 dark:text-emerald-300',
      softTintBg: 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/40',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-500',
      hexColor: '#059669',
    };
  }
  if (name.includes('شیمی')) {
    return {
      headerGradient: 'bg-gradient-to-l from-cyan-700 via-teal-600 to-sky-500 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-cyan-700 dark:text-cyan-300',
      softTintBg: 'bg-cyan-50/60 dark:bg-cyan-950/25 border-cyan-100 dark:border-cyan-900/40',
      borderHover: 'hover:border-cyan-400 dark:hover:border-cyan-500',
      hexColor: '#0891b2',
    };
  }
  if (name.includes('فیزیک')) {
    return {
      headerGradient: 'bg-gradient-to-l from-violet-700 via-purple-600 to-indigo-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-violet-700 dark:text-violet-300',
      softTintBg: 'bg-violet-50/60 dark:bg-violet-950/25 border-violet-100 dark:border-violet-900/40',
      borderHover: 'hover:border-violet-400 dark:hover:border-violet-500',
      hexColor: '#7c3aed',
    };
  }
  if (name.includes('علوم')) {
    return {
      headerGradient: 'bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-emerald-700 dark:text-emerald-300',
      softTintBg: 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-100 dark:border-emerald-900/40',
      borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-500',
      hexColor: '#10b981',
    };
  }
  if (name.includes('عربی')) {
    return {
      headerGradient: 'bg-gradient-to-l from-amber-600 via-orange-600 to-yellow-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-amber-700 dark:text-amber-300',
      softTintBg: 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-100 dark:border-amber-900/40',
      borderHover: 'hover:border-amber-400 dark:hover:border-amber-500',
      hexColor: '#d97706',
    };
  }
  if (name.includes('انگلیسی') || name.includes('زبان')) {
    return {
      headerGradient: 'bg-gradient-to-l from-purple-700 via-fuchsia-600 to-violet-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-purple-700 dark:text-purple-300',
      softTintBg: 'bg-purple-50/60 dark:bg-purple-950/25 border-purple-100 dark:border-purple-900/40',
      borderHover: 'hover:border-purple-400 dark:hover:border-purple-500',
      hexColor: '#9333ea',
    };
  }
  if (name.includes('اجتماعی') || name.includes('تاریخ') || name.includes('جغرافیا')) {
    return {
      headerGradient: 'bg-gradient-to-l from-teal-700 via-cyan-600 to-emerald-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-teal-700 dark:text-teal-300',
      softTintBg: 'bg-teal-50/60 dark:bg-teal-950/25 border-teal-100 dark:border-teal-900/40',
      borderHover: 'hover:border-teal-400 dark:hover:border-teal-500',
      hexColor: '#0d9488',
    };
  }
  if (name.includes('قرآن') || name.includes('آسمان') || name.includes('دینی')) {
    return {
      headerGradient: 'bg-gradient-to-l from-sky-700 via-sky-600 to-blue-600 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-sky-700 dark:text-sky-300',
      softTintBg: 'bg-sky-50/60 dark:bg-sky-950/25 border-sky-100 dark:border-sky-900/40',
      borderHover: 'hover:border-sky-400 dark:hover:border-sky-500',
      hexColor: '#0284c7',
    };
  }
  if (name.includes('فناوری') || name.includes('هنر') || name.includes('تفکر')) {
    return {
      headerGradient: 'bg-gradient-to-l from-slate-700 via-slate-600 to-zinc-700 text-white',
      badgeBg: 'bg-white/20 text-white border border-white/25',
      accentText: 'text-slate-700 dark:text-slate-300',
      softTintBg: 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
      borderHover: 'hover:border-slate-400 dark:hover:border-slate-500',
      hexColor: '#475569',
    };
  }

  return {
    headerGradient: 'bg-gradient-to-l from-indigo-700 via-violet-600 to-purple-600 text-white',
    badgeBg: 'bg-white/20 text-white border border-white/25',
    accentText: 'text-indigo-700 dark:text-indigo-300',
    softTintBg: 'bg-indigo-50/60 dark:bg-indigo-950/25 border-indigo-100 dark:border-indigo-900/40',
    borderHover: 'hover:border-indigo-400 dark:hover:border-indigo-500',
    hexColor: '#6366f1',
  };
}

// ============================================================================
// 5. CARD TIME RATIO INDICATOR (Section 4)
// ============================================================================
/**
 * Section 4:
 * درصد زمان واقعی نسبت به پیش‌بینی = (زمان واقعی ÷ زمان پیش‌بینی‌شده) × ۱۰۰
 * Can exceed 100% (e.g., 90 -> 120 = 133%). Never conflated with task completion.
 */
export function calculateActualToPredictedRatioPct(
  actualMinutes: number | null | undefined,
  predictedMinutes: number | null | undefined
): number | null {
  if (actualMinutes === null || actualMinutes === undefined) return null;
  const pred = Number(predictedMinutes || 0);
  if (pred <= 0) return null;
  const act = Math.max(0, Number(actualMinutes));
  return Math.round((act / pred) * 100);
}

// ============================================================================
// 6. INDEPENDENT COMPONENT CALCULATORS (Sections 5, 6, 7, 8, 12)
// ============================================================================

/**
 * Section 5.1: شاخص تحقق زمان مطالعه
 * T = min(100, (زمان واقعی مطالعه ÷ زمان هدف مطالعه) × 100)
 */
export function calculateStudyTimeIndexT(
  actualStudyMinutes: number,
  targetStudyMinutes: number | null | undefined
): number | null {
  const target = Number(targetStudyMinutes || 0);
  if (target <= 0) return null;
  const actual = Math.max(0, Number(actualStudyMinutes || 0));
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * Section 5.2: شاخص تحقق تست و تمرین
 * Q = min(100, (تعداد واقعی تست ÷ تعداد هدف تست) × 100)
 * If no test target is defined (target <= 0 or null), returns null so it does not artificially score 0.
 */
export function calculateExercisesIndexQ(
  actualExercisesCount: number,
  targetExercisesCount: number | null | undefined
): number | null {
  const target = Number(targetExercisesCount || 0);
  if (target <= 0) return null;
  const actual = Math.max(0, Number(actualExercisesCount || 0));
  return Math.min(100, Math.round((actual / target) * 100));
}

/**
 * Section 5.3: شاخص کیفیت یادگیری (میانگین وزنی بر اساس زمان واقعی فعالیت‌های آموزشی)
 * Returns both 0..10 weighted average and 0..100 scaled score L.
 */
export function calculateWeightedLearningQualityL(
  educationalPlans: DailyPlanItem[]
): {
  weightedAverage0To10: number | null;
  scoreL0To100: number | null;
  evaluatedMinutes: number;
  evaluatedCount: number;
  weightedNumerator: number;
} {
  let weightedNumerator = 0;
  let evaluatedMinutes = 0;
  let fallbackSimpleSum = 0;
  let evaluatedCount = 0;

  for (const plan of educationalPlans) {
    if (Number(plan.is_study) !== 1 || !plan.performance) continue;
    const q = parseLearningQuality0To10(plan.performance.learning_quality);
    if (q === null) continue;

    const actMins = Math.max(0, Number(plan.performance.actual_minutes || 0));
    evaluatedCount += 1;
    fallbackSimpleSum += q;
    if (actMins > 0) {
      weightedNumerator += q * actMins;
      evaluatedMinutes += actMins;
    }
  }

  if (evaluatedCount === 0) {
    return {
      weightedAverage0To10: null,
      scoreL0To100: null,
      evaluatedMinutes: 0,
      evaluatedCount: 0,
      weightedNumerator: 0,
    };
  }

  const rawAvg =
    evaluatedMinutes > 0
      ? weightedNumerator / evaluatedMinutes
      : fallbackSimpleSum / evaluatedCount;

  const rounded0To10 = Math.round(rawAvg * 10) / 10;
  const scoreL0To100 = Math.min(100, Math.max(0, Math.round(rawAvg * 10)));

  return {
    weightedAverage0To10: rounded0To10,
    scoreL0To100,
    evaluatedMinutes,
    evaluatedCount,
    weightedNumerator,
  };
}

/**
 * Section 5.4: امتیاز ترکیبی عملکرد آموزشی
 * E = (T × 0.4) + (Q × 0.3) + (L × 0.3)
 * Dynamically normalizes weights if any component is not calculable (null).
 */
export function calculateEducationalCompositeScoreE(
  T: number | null,
  Q: number | null,
  L: number | null,
  hasLoggedEducationalActivity: boolean,
  weights: AnalyticsWeightsConfig = DEFAULT_ANALYTICS_WEIGHTS
): number | null {
  if (!hasLoggedEducationalActivity) return null;

  const components: Array<{ val: number; w: number }> = [];
  if (T !== null) components.push({ val: T, w: weights.studyTimeWeight });
  if (Q !== null) components.push({ val: Q, w: weights.exercisesWeight });
  if (L !== null) components.push({ val: L, w: weights.learningQualityWeight });

  if (components.length === 0) return null;

  const totalWeight = components.reduce((acc, c) => acc + c.w, 0);
  if (totalWeight <= 0) return null;

  const weightedSum = components.reduce((acc, c) => acc + c.val * c.w, 0);
  return Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));
}

/**
 * Section 6.2: امتیاز پایبندی برای هر فعالیت محدودشونده
 * C_i = min(100, (زمان مجاز ÷ زمان واقعی) × 100)
 */
export function calculateSingleRestrictedAdherenceCi(
  allowedMinutes: number,
  actualMinutes: number
): number | null {
  const allowed = Math.max(0, Number(allowedMinutes || 0));
  const actual = Math.max(0, Number(actualMinutes || 0));

  if (allowed === 0 && actual === 0) return null;
  if (allowed === 0 && actual > 0) return 0;
  if (allowed > 0 && actual === 0) return 100;

  return Math.min(100, Math.round((allowed / actual) * 100));
}

export interface RestrictedActivityEvaluationItem {
  planId: string;
  title: string;
  allowedMinutes: number;
  actualMinutes: number;
  overuseMinutes: number;
  adherenceScoreCi: number;
  impactWeight: number;
}

/**
 * Section 7: محاسبه شاخص کنترل فعالیت‌های محدودشونده (C)
 * Weighted average of C_i across all logged restricted activities for the day.
 */
export function calculateRestrictedControlIndexC(
  restrictedPlans: DailyPlanItem[],
  categoriesMap?: Map<string, ActivityCategory>
): {
  scoreC: number | null;
  items: RestrictedActivityEvaluationItem[];
  totalAllowedMinutes: number;
  totalActualMinutes: number;
  totalOveruseMinutes: number;
} {
  const items: RestrictedActivityEvaluationItem[] = [];
  let weightedSum = 0;
  let weightTotal = 0;
  let totalAllowedMinutes = 0;
  let totalActualMinutes = 0;
  let totalOveruseMinutes = 0;

  for (const plan of restrictedPlans) {
    const allowed = Math.max(
      0,
      Number(plan.initial_predicted_minutes || plan.predicted_minutes || 0)
    );
    // Only evaluate restricted activities that have logged performance
    if (!plan.performance) {
      continue;
    }
    const actual = Math.max(0, Number(plan.performance.actual_minutes || 0));
    const Ci = calculateSingleRestrictedAdherenceCi(allowed, actual);
    if (Ci === null) continue;

    const cat = categoriesMap?.get(plan.category_id);
    const impactWeight = Number(cat?.impact_weight || 1.0);
    // Weight proportional to allowed minutes (or actual if allowed is 0) * impactWeight
    const w = Math.max(1, allowed > 0 ? allowed : actual) * impactWeight;

    const overuse = Math.max(0, actual - allowed);
    totalAllowedMinutes += allowed;
    totalActualMinutes += actual;
    totalOveruseMinutes += overuse;

    weightedSum += Ci * w;
    weightTotal += w;

    items.push({
      planId: plan.id,
      title: plan.category_title_snapshot || 'سرگرمی',
      allowedMinutes: allowed,
      actualMinutes: actual,
      overuseMinutes: overuse,
      adherenceScoreCi: Ci,
      impactWeight,
    });
  }

  if (items.length === 0 || weightTotal <= 0) {
    return {
      scoreC: null,
      items: [],
      totalAllowedMinutes: 0,
      totalActualMinutes: 0,
      totalOveruseMinutes: 0,
    };
  }

  return {
    scoreC: Math.min(100, Math.max(0, Math.round(weightedSum / weightTotal))),
    items,
    totalAllowedMinutes,
    totalActualMinutes,
    totalOveruseMinutes,
  };
}

/**
 * Section 8: محاسبه امتیاز نهایی روزانه
 * D (یا S) = (E × 0.8) + (C × 0.2)
 * - If both E and C are null -> returns null («داده کافی وجود ندارد»).
 * - If C is null -> S = E (normalized automatically).
 * - If E is null -> S = C (normalized automatically).
 */
export function calculateFinalDailyScoreS(
  E: number | null,
  C: number | null,
  weights: AnalyticsWeightsConfig = DEFAULT_ANALYTICS_WEIGHTS
): number | null {
  if (E === null && C === null) return null;
  if (E !== null && C === null) return Math.round(E);
  if (E === null && C !== null) return Math.round(C);

  const wE = weights.educationalCompositeWeight;
  const wC = weights.restrictedControlWeight;
  const totalW = wE + wC;
  if (totalW <= 0) return Math.round(E!);

  return Math.min(100, Math.max(0, Math.round((E! * wE + C! * wC) / totalW)));
}

// ============================================================================
// 7. COMPREHENSIVE DAILY EVALUATION & TIME BUDGET ENGINE (Section 5-9)
// ============================================================================
export interface DailyPerformanceEvaluation {
  dateIso: string;
  jalaliCompact: string;
  jalaliFull: string;
  weekdayName: string;

  // Activity counts
  totalPlansCount: number;
  completedCount: number;
  partialCount: number;
  pendingCount: number;

  // Educational metrics
  educationalPlansCount: number;
  loggedEducationalCount: number;
  predictedStudyMinutes: number;
  targetStudyMinutes: number;
  actualStudyMinutes: number;
  studyVarianceMinutes: number;
  targetExercisesCount: number | null;
  actualExercisesCount: number;

  // Educational component scores
  studyTimeIndexT: number | null; // 0..100
  exercisesIndexQ: number | null; // 0..100
  learningQuality0To10: number | null; // 0..10
  learningQualityIndexL: number | null; // 0..100
  learningQualityEvaluatedMinutes: number;
  learningQualityWeightedNumerator: number;
  educationalCompositeE: number | null; // 0..100

  // Restricted activities metrics & control score
  restrictedPlannedMinutes: number;
  restrictedAllowedLoggedMinutes: number;
  restrictedActualMinutes: number;
  restrictedOveruseMinutes: number;
  restrictedControlIndexC: number | null; // 0..100
  restrictedItems: RestrictedActivityEvaluationItem[];

  // Essential / Recovery activities metrics
  essentialPlannedMinutes: number;
  essentialActualMinutes: number;

  // Final Daily Score S (0..100)
  finalDailyScoreS: number | null;
  hasSufficientEducationalData: boolean;

  // Section 9: Daily Time Budget (ظرف زمانی روز)
  budgetMinutes: number | null;
  totalPlannedAllMinutes: number;
  unallocatedPlannedMinutes: number | null;
  plannedOverBudgetMinutes: number | null;
  totalActualAllMinutes: number;
  remainingActualBudgetMinutes: number | null;
  actualOverBudgetMinutes: number | null;
  studyShareOfBudgetPct: number | null;
  restrictedShareOfBudgetPct: number | null;
  essentialShareOfBudgetPct: number | null;
}

export function evaluateDayPerformance(params: {
  dateIso: string;
  plans: DailyPlanItem[];
  budgetConfig?: DailyTimeBudgetConfig | null;
  goalConfig?: DailyStudyGoalConfig | null;
  categoriesMap?: Map<string, ActivityCategory>;
  weights?: AnalyticsWeightsConfig;
}): DailyPerformanceEvaluation {
  const {
    dateIso,
    plans,
    budgetConfig,
    goalConfig,
    categoriesMap,
    weights = DEFAULT_ANALYTICS_WEIGHTS,
  } = params;

  const dayPlans = plans.filter((p) => p.plan_date === dateIso);

  const educationalPlans: DailyPlanItem[] = [];
  const restrictedPlans: DailyPlanItem[] = [];
  const essentialPlans: DailyPlanItem[] = [];

  let completedCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  for (const plan of dayPlans) {
    if (plan.status === 'completed') completedCount++;
    else if (plan.status === 'partial') partialCount++;
    else pendingCount++;

    const group = classifyPlanActivityGroup(plan, categoriesMap);
    if (group === 'educational') educationalPlans.push(plan);
    else if (group === 'restricted') restrictedPlans.push(plan);
    else essentialPlans.push(plan);
  }

  // Educational calculations
  const predictedStudyMinutes = educationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
    0
  );

  const loggedEducationalPlans = educationalPlans.filter((p) => Boolean(p.performance));
  const actualStudyMinutes = loggedEducationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.actual_minutes || 0)),
    0
  );

  // Target study minutes: use planned initial_predicted_minutes if > 0; otherwise fallback to goalConfig if educational plans exist
  const targetStudyMinutes =
    predictedStudyMinutes > 0
      ? predictedStudyMinutes
      : educationalPlans.length > 0 && goalConfig?.target_study_minutes
      ? goalConfig.target_study_minutes
      : 0;

  const actualExercisesCount = loggedEducationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.exercises_count || 0)),
    0
  );

  // Target exercises count:
  // Check if any educational plan has explicit target_exercises > 0, or if goalConfig has target_exercises_count when exercises were solved
  const planLevelTargetExercises = educationalPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.target_exercises || 0)),
    0
  );
  let targetExercisesCount: number | null = null;
  if (planLevelTargetExercises > 0) {
    targetExercisesCount = planLevelTargetExercises;
  } else if (
    loggedEducationalPlans.some((p) => (p.performance?.exercises_count ?? 0) > 0) &&
    goalConfig &&
    goalConfig.target_exercises_count > 0
  ) {
    targetExercisesCount = goalConfig.target_exercises_count;
  }

  const hasSufficientEducationalData = loggedEducationalPlans.length > 0;

  const studyTimeIndexT = hasSufficientEducationalData
    ? calculateStudyTimeIndexT(actualStudyMinutes, targetStudyMinutes)
    : null;

  const exercisesIndexQ = hasSufficientEducationalData
    ? calculateExercisesIndexQ(actualExercisesCount, targetExercisesCount)
    : null;

  const qualityResult = calculateWeightedLearningQualityL(educationalPlans);

  const educationalCompositeE = calculateEducationalCompositeScoreE(
    studyTimeIndexT,
    exercisesIndexQ,
    qualityResult.scoreL0To100,
    hasSufficientEducationalData,
    weights
  );

  // Restricted activities calculations
  const restrictedPlannedMinutes = restrictedPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
    0
  );
  const restrictedEval = calculateRestrictedControlIndexC(restrictedPlans, categoriesMap);

  // Essential activities calculations
  const essentialPlannedMinutes = essentialPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.initial_predicted_minutes || p.predicted_minutes || 0)),
    0
  );
  const essentialActualMinutes = essentialPlans.reduce(
    (sum, p) => sum + Math.max(0, Number(p.performance?.actual_minutes || 0)),
    0
  );

  // Final Daily Score S
  const finalDailyScoreS = calculateFinalDailyScoreS(
    educationalCompositeE,
    restrictedEval.scoreC,
    weights
  );

  // Daily Time Budget calculations (Section 9)
  const budgetMinutes =
    budgetConfig && budgetConfig.budget_minutes && budgetConfig.budget_minutes > 0
      ? Number(budgetConfig.budget_minutes)
      : null;

  const totalPlannedAllMinutes =
    predictedStudyMinutes + restrictedPlannedMinutes + essentialPlannedMinutes;

  const totalActualAllMinutes =
    actualStudyMinutes + restrictedEval.totalActualMinutes + essentialActualMinutes;

  const unallocatedPlannedMinutes =
    budgetMinutes !== null ? Math.max(0, budgetMinutes - totalPlannedAllMinutes) : null;
  const plannedOverBudgetMinutes =
    budgetMinutes !== null && totalPlannedAllMinutes > budgetMinutes
      ? totalPlannedAllMinutes - budgetMinutes
      : null;

  const remainingActualBudgetMinutes =
    budgetMinutes !== null ? Math.max(0, budgetMinutes - totalActualAllMinutes) : null;
  const actualOverBudgetMinutes =
    budgetMinutes !== null && totalActualAllMinutes > budgetMinutes
      ? totalActualAllMinutes - budgetMinutes
      : null;

  const studyShareOfBudgetPct =
    budgetMinutes !== null && budgetMinutes > 0
      ? Math.round((actualStudyMinutes / budgetMinutes) * 1000) / 10
      : null;

  const restrictedShareOfBudgetPct =
    budgetMinutes !== null && budgetMinutes > 0
      ? Math.round((restrictedEval.totalActualMinutes / budgetMinutes) * 1000) / 10
      : null;

  const essentialShareOfBudgetPct =
    budgetMinutes !== null && budgetMinutes > 0
      ? Math.round((essentialActualMinutes / budgetMinutes) * 1000) / 10
      : null;

  return {
    dateIso,
    jalaliCompact: formatJalaliCompact(dateIso),
    jalaliFull: formatJalaliFull(dateIso),
    weekdayName: getPersianWeekdayName(dateIso),

    totalPlansCount: dayPlans.length,
    completedCount,
    partialCount,
    pendingCount,

    educationalPlansCount: educationalPlans.length,
    loggedEducationalCount: loggedEducationalPlans.length,
    predictedStudyMinutes,
    targetStudyMinutes,
    actualStudyMinutes,
    studyVarianceMinutes: actualStudyMinutes - predictedStudyMinutes,
    targetExercisesCount,
    actualExercisesCount,

    studyTimeIndexT,
    exercisesIndexQ,
    learningQuality0To10: qualityResult.weightedAverage0To10,
    learningQualityIndexL: qualityResult.scoreL0To100,
    learningQualityEvaluatedMinutes: qualityResult.evaluatedMinutes,
    learningQualityWeightedNumerator: qualityResult.weightedNumerator,
    educationalCompositeE,

    restrictedPlannedMinutes,
    restrictedAllowedLoggedMinutes: restrictedEval.totalAllowedMinutes,
    restrictedActualMinutes: restrictedEval.totalActualMinutes,
    restrictedOveruseMinutes: restrictedEval.totalOveruseMinutes,
    restrictedControlIndexC: restrictedEval.scoreC,
    restrictedItems: restrictedEval.items,

    essentialPlannedMinutes,
    essentialActualMinutes,

    finalDailyScoreS,
    hasSufficientEducationalData,

    budgetMinutes,
    totalPlannedAllMinutes,
    unallocatedPlannedMinutes,
    plannedOverBudgetMinutes,
    totalActualAllMinutes,
    remainingActualBudgetMinutes,
    actualOverBudgetMinutes,
    studyShareOfBudgetPct,
    restrictedShareOfBudgetPct,
    essentialShareOfBudgetPct,
  };
}

// ============================================================================
// 8. PERIOD AGGREGATION & COMPARISON ENGINE (Section 10 & Section 11)
// ============================================================================
export interface PeriodPerformanceSummary {
  startDateIso: string;
  endDateIso: string;
  daysCount: number;
  dailyEvaluations: DailyPerformanceEvaluation[];

  // Totals & Averages (Section 10.8)
  totalStudyMinutes: number;
  totalPredictedStudyMinutes: number;
  avgDailyStudyMinutes: number;
  maxStudyDay: DailyPerformanceEvaluation | null;
  minStudyDay: DailyPerformanceEvaluation | null;

  totalExercisesCount: number;
  totalTargetExercisesCount: number;

  // True weighted average quality across the entire period (0..10)
  weightedLearningQuality0To10: number | null;

  // Average Final Daily Score S across valid days
  averageFinalScoreS: number | null;
  validScoreDaysCount: number;
  bestScoreDay: DailyPerformanceEvaluation | null;
  weakestScoreDay: DailyPerformanceEvaluation | null;

  // True ratio of study time to total budget on days with defined budget (Section 10.8)
  studyShareOfBudgetPct: number | null;
  validBudgetDaysCount: number;
  totalBudgetMinutesOnValidDays: number;
  totalStudyMinutesOnBudgetedDays: number;
  totalRestrictedMinutesOnBudgetedDays: number;
  totalEssentialMinutesOnBudgetedDays: number;
  totalUnallocatedMinutesOnBudgetedDays: number;

  // Restricted Entertainment Totals & Averages
  totalRestrictedAllowedMinutes: number;
  totalRestrictedActualMinutes: number;
  totalRestrictedOveruseMinutes: number;
  avgDailyRestrictedActualMinutes: number;
  averageRestrictedControlIndexC: number | null;

  // Essential Activities Totals
  totalEssentialActualMinutes: number;
}

export function evaluatePeriodPerformance(params: {
  dateIsoList: string[];
  plans: DailyPlanItem[];
  budgetsMap: Map<string, DailyTimeBudgetConfig>;
  goalsMap?: Map<string, DailyStudyGoalConfig>;
  categoriesMap?: Map<string, ActivityCategory>;
  weights?: AnalyticsWeightsConfig;
}): PeriodPerformanceSummary {
  const {
    dateIsoList,
    plans,
    budgetsMap,
    goalsMap,
    categoriesMap,
    weights = DEFAULT_ANALYTICS_WEIGHTS,
  } = params;

  const plansByDateMap = new Map<string, DailyPlanItem[]>();
  for (const p of plans) {
    const bucket = plansByDateMap.get(p.plan_date);
    if (bucket) {
      bucket.push(p);
    } else {
      plansByDateMap.set(p.plan_date, [p]);
    }
  }

  const dailyEvaluations = dateIsoList.map((dateIso) =>
    evaluateDayPerformance({
      dateIso,
      plans: plansByDateMap.get(dateIso) || [],
      budgetConfig: budgetsMap.get(dateIso) || null,
      goalConfig: goalsMap?.get(dateIso) || null,
      categoriesMap,
      weights,
    })
  );

  let totalStudyMinutes = 0;
  let totalPredictedStudyMinutes = 0;
  let totalExercisesCount = 0;
  let totalTargetExercisesCount = 0;

  let qualityWeightedNum = 0;
  let qualityEvalMins = 0;
  let qualitySimpleSum = 0;
  let qualitySimpleDays = 0;

  let scoreSSum = 0;
  let validScoreDaysCount = 0;

  let validBudgetDaysCount = 0;
  let totalBudgetMinutesOnValidDays = 0;
  let totalStudyMinutesOnBudgetedDays = 0;
  let totalRestrictedMinutesOnBudgetedDays = 0;
  let totalEssentialMinutesOnBudgetedDays = 0;

  let totalRestrictedAllowedMinutes = 0;
  let totalRestrictedActualMinutes = 0;
  let totalRestrictedOveruseMinutes = 0;
  let restrictedCSum = 0;
  let restrictedCDays = 0;

  let totalEssentialActualMinutes = 0;

  for (const d of dailyEvaluations) {
    totalStudyMinutes += d.actualStudyMinutes;
    totalPredictedStudyMinutes += d.predictedStudyMinutes;
    totalExercisesCount += d.actualExercisesCount;
    if (d.targetExercisesCount !== null) {
      totalTargetExercisesCount += d.targetExercisesCount;
    }

    if (d.learningQuality0To10 !== null) {
      qualityWeightedNum += d.learningQualityWeightedNumerator;
      qualityEvalMins += d.learningQualityEvaluatedMinutes;
      qualitySimpleSum += d.learningQuality0To10;
      qualitySimpleDays += 1;
    }

    if (d.finalDailyScoreS !== null) {
      scoreSSum += d.finalDailyScoreS;
      validScoreDaysCount += 1;
    }

    if (d.budgetMinutes !== null && d.budgetMinutes > 0) {
      validBudgetDaysCount += 1;
      totalBudgetMinutesOnValidDays += d.budgetMinutes;
      totalStudyMinutesOnBudgetedDays += d.actualStudyMinutes;
      totalRestrictedMinutesOnBudgetedDays += d.restrictedActualMinutes;
      totalEssentialMinutesOnBudgetedDays += d.essentialActualMinutes;
    }

    totalRestrictedAllowedMinutes += d.restrictedAllowedLoggedMinutes || d.restrictedPlannedMinutes;
    totalRestrictedActualMinutes += d.restrictedActualMinutes;
    totalRestrictedOveruseMinutes += d.restrictedOveruseMinutes;
    if (d.restrictedControlIndexC !== null) {
      restrictedCSum += d.restrictedControlIndexC;
      restrictedCDays += 1;
    }

    totalEssentialActualMinutes += d.essentialActualMinutes;
  }

  const daysCount = Math.max(1, dailyEvaluations.length);
  const activeStudyDays = dailyEvaluations.filter(
    (d) => d.actualStudyMinutes > 0 || d.educationalPlansCount > 0
  );

  const maxStudyDay =
    activeStudyDays.length > 0
      ? [...activeStudyDays].sort((a, b) => b.actualStudyMinutes - a.actualStudyMinutes)[0]
      : null;
  const minStudyDay =
    activeStudyDays.length > 0
      ? [...activeStudyDays].sort((a, b) => a.actualStudyMinutes - b.actualStudyMinutes)[0]
      : null;

  const scoredDays = dailyEvaluations.filter((d) => d.finalDailyScoreS !== null);
  const bestScoreDay =
    scoredDays.length > 0
      ? [...scoredDays].sort((a, b) => (b.finalDailyScoreS ?? 0) - (a.finalDailyScoreS ?? 0))[0]
      : null;
  const weakestScoreDay =
    scoredDays.length > 0
      ? [...scoredDays].sort((a, b) => (a.finalDailyScoreS ?? 0) - (b.finalDailyScoreS ?? 0))[0]
      : null;

  const weightedLearningQuality0To10 =
    qualityEvalMins > 0
      ? Math.round((qualityWeightedNum / qualityEvalMins) * 10) / 10
      : qualitySimpleDays > 0
      ? Math.round((qualitySimpleSum / qualitySimpleDays) * 10) / 10
      : null;

  const averageFinalScoreS =
    validScoreDaysCount > 0 ? Math.round((scoreSSum / validScoreDaysCount) * 10) / 10 : null;

  const studyShareOfBudgetPct =
    totalBudgetMinutesOnValidDays > 0
      ? Math.round((totalStudyMinutesOnBudgetedDays / totalBudgetMinutesOnValidDays) * 1000) / 10
      : null;

  const totalAllocatedActualOnBudgetedDays =
    totalStudyMinutesOnBudgetedDays +
    totalRestrictedMinutesOnBudgetedDays +
    totalEssentialMinutesOnBudgetedDays;

  const totalUnallocatedMinutesOnBudgetedDays = Math.max(
    0,
    totalBudgetMinutesOnValidDays - totalAllocatedActualOnBudgetedDays
  );

  const averageRestrictedControlIndexC =
    restrictedCDays > 0 ? Math.round(restrictedCSum / restrictedCDays) : null;

  return {
    startDateIso: dateIsoList[0] || '',
    endDateIso: dateIsoList[dateIsoList.length - 1] || '',
    daysCount: dailyEvaluations.length,
    dailyEvaluations,

    totalStudyMinutes,
    totalPredictedStudyMinutes,
    avgDailyStudyMinutes: Math.round(totalStudyMinutes / daysCount),
    maxStudyDay,
    minStudyDay,

    totalExercisesCount,
    totalTargetExercisesCount,

    weightedLearningQuality0To10,

    averageFinalScoreS,
    validScoreDaysCount,
    bestScoreDay,
    weakestScoreDay,

    studyShareOfBudgetPct,
    validBudgetDaysCount,
    totalBudgetMinutesOnValidDays,
    totalStudyMinutesOnBudgetedDays,
    totalRestrictedMinutesOnBudgetedDays,
    totalEssentialMinutesOnBudgetedDays,
    totalUnallocatedMinutesOnBudgetedDays,

    totalRestrictedAllowedMinutes,
    totalRestrictedActualMinutes,
    totalRestrictedOveruseMinutes,
    avgDailyRestrictedActualMinutes: Math.round(totalRestrictedActualMinutes / daysCount),
    averageRestrictedControlIndexC,

    totalEssentialActualMinutes,
  };
}

export interface MetricComparisonDelta {
  baseValue: number | null;
  targetValue: number | null;
  absoluteChange: number | null;
  percentChange: number | null; // null if baseValue is 0 or null (prevents division by zero!)
  isBaseZero: boolean;
}

function computeSafeDelta(
  baseVal: number | null,
  currentVal: number | null
): MetricComparisonDelta {
  if (baseVal === null || currentVal === null) {
    return {
      baseValue: baseVal,
      targetValue: currentVal,
      absoluteChange: null,
      percentChange: null,
      isBaseZero: baseVal === 0,
    };
  }
  const abs = Math.round((currentVal - baseVal) * 10) / 10;
  if (baseVal === 0) {
    return {
      baseValue: 0,
      targetValue: currentVal,
      absoluteChange: abs,
      percentChange: null, // Safe guard against division by zero (Section 10.9)
      isBaseZero: true,
    };
  }
  const pct = Math.round(((currentVal - baseVal) / Math.abs(baseVal)) * 1000) / 10;
  return {
    baseValue: baseVal,
    targetValue: currentVal,
    absoluteChange: abs,
    percentChange: pct,
    isBaseZero: false,
  };
}

export interface PeriodComparisonResult {
  basePeriod: PeriodPerformanceSummary;
  currentPeriod: PeriodPerformanceSummary;
  studyMinutesDelta: MetricComparisonDelta;
  exercisesCountDelta: MetricComparisonDelta;
  learningQualityDelta: MetricComparisonDelta;
  finalScoreDelta: MetricComparisonDelta;
  studyBudgetShareDelta: MetricComparisonDelta;
  restrictedTimeDelta: MetricComparisonDelta;
}

export function compareTwoPeriods(
  basePeriod: PeriodPerformanceSummary,
  currentPeriod: PeriodPerformanceSummary
): PeriodComparisonResult {
  return {
    basePeriod,
    currentPeriod,
    studyMinutesDelta: computeSafeDelta(
      basePeriod.totalStudyMinutes,
      currentPeriod.totalStudyMinutes
    ),
    exercisesCountDelta: computeSafeDelta(
      basePeriod.totalExercisesCount,
      currentPeriod.totalExercisesCount
    ),
    learningQualityDelta: computeSafeDelta(
      basePeriod.weightedLearningQuality0To10,
      currentPeriod.weightedLearningQuality0To10
    ),
    finalScoreDelta: computeSafeDelta(
      basePeriod.averageFinalScoreS,
      currentPeriod.averageFinalScoreS
    ),
     studyBudgetShareDelta: computeSafeDelta(
      basePeriod.studyShareOfBudgetPct,
      currentPeriod.studyShareOfBudgetPct
    ),
    restrictedTimeDelta: computeSafeDelta(
      basePeriod.totalRestrictedActualMinutes,
      currentPeriod.totalRestrictedActualMinutes
    ),
  };
}

// ============================================================================
// 9. ENHANCED XP & PERMANENT LEVEL PROGRESSION ENGINE
// ============================================================================
export interface XpBreakdown {
  totalXp: number;
  completedActivitiesXp: number;
  partialActivitiesXp: number;
  studyMinutesXp: number;
  exercisesXp: number;
  qualityBonusXp: number;
  completedCount: number;
  partialCount: number;
  actualStudyMinutes: number;
  exercisesCount: number;
  qualityEvaluatedCount: number;
}

export interface UserLevelProgress {
  level: number;
  rankTitle: string;
  nextRankTitle: string;
  rankBadgeEmoji: string;
  allTimeXp: number;
  currentLevelStartXp: number;
  nextLevelTargetXp: number;
  xpInCurrentLevel: number;
  xpRequiredForCurrentStep: number;
  xpRemainingToNextLevel: number;
  progressPercentage: number;
}

const LEVEL_RANK_TITLES: Array<{ title: string; emoji: string }> = [
  { title: 'نوآموز هدفمند', emoji: '🌱' },
  { title: 'کاوشگر دانش', emoji: '🧭' },
  { title: 'برنامه‌ریز پرتلاش', emoji: '⚡' },
  { title: 'ستاره پیوستگی', emoji: '🌟' },
  { title: 'قهرمان تمرکز', emoji: '🔥' },
  { title: 'معمار موفقیت', emoji: '💎' },
  { title: 'استاد برنامه‌ریزی و نخبگی', emoji: '👑' },
];

export function getLevelRankMeta(level: number): { title: string; emoji: string } {
  const idx = Math.max(0, Math.min(LEVEL_RANK_TITLES.length - 1, level - 1));
  return LEVEL_RANK_TITLES[idx];
}

/**
 * Calculates the enhanced XP breakdown for a list of plans:
 * - Completed activity: +50 XP
 * - Partial activity: +25 XP
 * - Actual study time: +1 XP per 5 minutes of actual study (Math.floor(totalActualStudyMinutes / 5))
 * - Solved exercises/tests: +2 XP per exercise
 * - Learning quality bonus: +2 XP per quality score point (0..10) on each evaluated study session
 */
export function calculateXpFromPlans(plans: DailyPlanItem[]): XpBreakdown {
  let completedCount = 0;
  let partialCount = 0;
  let actualStudyMinutes = 0;
  let exercisesCount = 0;
  let qualityBonusXp = 0;
  let qualityEvaluatedCount = 0;

  for (const plan of plans) {
    if (plan.status === 'completed') {
      completedCount += 1;
    } else if (plan.status === 'partial') {
      partialCount += 1;
    }

    if (Number(plan.is_study) === 1 && plan.performance) {
      const mins = Math.max(0, Number(plan.performance.actual_minutes || 0));
      actualStudyMinutes += mins;

      const ex = Math.max(0, Number(plan.performance.exercises_count || 0));
      exercisesCount += ex;

      const q = parseLearningQuality0To10(plan.performance.learning_quality);
      if (q !== null && mins > 0) {
        qualityBonusXp += Math.round(q * 2);
        qualityEvaluatedCount += 1;
      }
    }
  }

  const completedActivitiesXp = completedCount * 50;
  const partialActivitiesXp = partialCount * 25;
  const studyMinutesXp = Math.floor(actualStudyMinutes / 5);
  const exercisesXp = exercisesCount * 2;

  const totalXp =
    completedActivitiesXp +
    partialActivitiesXp +
    studyMinutesXp +
    exercisesXp +
    qualityBonusXp;

  return {
    totalXp,
    completedActivitiesXp,
    partialActivitiesXp,
    studyMinutesXp,
    exercisesXp,
    qualityBonusXp,
    completedCount,
    partialCount,
    actualStudyMinutes,
    exercisesCount,
    qualityEvaluatedCount,
  };
}

/**
 * Progressive level step formula:
 * Required XP to advance from Level L to L+1 = 250 + (L - 1) * 150
 * L1 -> L2: 250 XP (0..250)
 * L2 -> L3: 400 XP (250..650)
 * L3 -> L4: 550 XP (650..1200)
 * L4 -> L5: 700 XP (1200..1900)
 * L5 -> L6: 850 XP (1900..2750)
 * L6 -> L7: 1000 XP (2750..3750)
 */
export function calculateUserLevelProgress(allTimeXpInput: number): UserLevelProgress {
  const allTimeXp = Math.max(0, Math.round(allTimeXpInput || 0));
  let level = 1;
  let currentLevelStartXp = 0;
  let stepRequired = 250;

  while (allTimeXp >= currentLevelStartXp + stepRequired) {
    currentLevelStartXp += stepRequired;
    level += 1;
    stepRequired = 250 + (level - 1) * 150;
  }

  const nextLevelTargetXp = currentLevelStartXp + stepRequired;
  const xpInCurrentLevel = allTimeXp - currentLevelStartXp;
  const xpRemainingToNextLevel = Math.max(0, nextLevelTargetXp - allTimeXp);
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((xpInCurrentLevel / stepRequired) * 100))
  );

  const currentRank = getLevelRankMeta(level);
  const nextRank = getLevelRankMeta(level + 1);

  return {
    level,
    rankTitle: currentRank.title,
    nextRankTitle: nextRank.title,
    rankBadgeEmoji: currentRank.emoji,
    allTimeXp,
    currentLevelStartXp,
    nextLevelTargetXp,
    xpInCurrentLevel,
    xpRequiredForCurrentStep: stepRequired,
    xpRemainingToNextLevel,
    progressPercentage,
  };
}

// ============================================================================
// 10. XP VELOCITY, TREND & REAL EDUCATIONAL PROGRESS ENGINE (Sections 11-18)
// ============================================================================
export type XpTrendDirection = 'ascending' | 'stable' | 'descending' | 'insufficient_data';

export type XpEducationalAlignment =
  | 'synergistic_growth' // رشد هماهنگ XP و پیشرفت واقعی تحصیلی
  | 'superficial_xp_warning' // افزایش XP صوری با کیفیت یا تحقق واقعی پایین
  | 'quality_steady_low_volume' // کیفیت یادگیری بالا اما حجم فعالیت کمتر از پتانسیل
  | 'simultaneous_drop' // افت هم‌زمان سرعت XP و شاخص آموزشی
  | 'building_baseline'; // در حال شکل‌گیری خط پایه تحلیلی

export interface DailyHistoricalXpRecord {
  dateIso: string;
  jalaliCompact: string;
  dayState: 'active' | 'missed_planned' | 'unrecorded';
  totalXp: number;
  educationalXp: number;
  studyMinutes: number;
  exercisesCount: number;
  learningQuality0To10: number | null;
  educationalScoreE: number | null;
  finalDailyScoreS: number | null;
}

export interface XpVelocityAndProgressAnalysis {
  // Today & Window Totals
  todayXp: number;
  xp7dTotal: number;
  xp14dTotal: number;
  xp30dTotal: number;
  prev7dTotal: number;

  // Daily Velocities (Calendar & Active/Planned-adjusted)
  dailyRate7dCalendar: number; // XP_7d / 7
  dailyRate7dEffective: number; // Outlier-stabilized effective daily XP rate
  dailyRate14dCalendar: number; // XP_14d / 14
  dailyRate30dCalendar: number; // XP_30d / 30
  prev7dDailyRate: number;

  // Day Classification in 7d & 14d windows
  activeDays7d: number;
  missedPlannedDays7d: number;
  unrecordedDays7d: number;
  activeDays14d: number;

  // Period-over-Period Trend (Last 7d vs Previous 7d)
  velocityDeltaAbsolute: number;
  velocityDeltaPercent: number | null; // null if prev7d is 0 or insufficient baseline
  trendDirection: XpTrendDirection;
  trendLabelPersian: string;
  trendBadgeTone: 'emerald' | 'indigo' | 'amber' | 'slate';

  // Real Educational Progress vs XP Alignment (Section 12.2 & Q7)
  avgEducationalScore7d: number | null; // Average E (0..100)
  prevAvgEducationalScore7d: number | null;
  avgFinalScore7d: number | null; // Average DS/S (0..100)
  avgLearningQuality7d: number | null; // 0..10
  alignmentStatus: XpEducationalAlignment;
  alignmentTitlePersian: string;
  alignmentDescriptionPersian: string;

  // Level-Up Pace Estimation (Section 14)
  estimatedDaysToNextLevel: number | null;
  estimatedNextLevelTextPersian: string;

  // Non-Punitive Constructive Feedback & Recovery Challenge (Sections 13 & 15)
  hasPerformanceDropWarning: boolean;
  warningHeadlinePersian: string | null;
  recoveryChallengeTextPersian: string;

  // 7-day sparkline series
  recent7DaysSeries: DailyHistoricalXpRecord[];
}

export function analyzeXpVelocityAndProgress(params: {
  allTimePlans: DailyPlanItem[];
  todayIso: string;
  levelProgress: UserLevelProgress;
}): XpVelocityAndProgressAnalysis {
  const { allTimePlans, todayIso, levelProgress } = params;

  // Group plans by date for O(1) lookup
  const plansByDate = new Map<string, DailyPlanItem[]>();
  for (const plan of allTimePlans) {
    const list = plansByDate.get(plan.plan_date);
    if (list) list.push(plan);
    else plansByDate.set(plan.plan_date, [plan]);
  }

  const buildDayRecord = (dateIso: string): DailyHistoricalXpRecord => {
    const dayPlans = plansByDate.get(dateIso) || [];
    const xp = calculateXpFromPlans(dayPlans);
    const evalDay = evaluateDayPerformance({ dateIso, plans: dayPlans });

    const hasLoggedAny =
      xp.completedCount > 0 ||
      xp.partialCount > 0 ||
      xp.actualStudyMinutes > 0 ||
      xp.exercisesCount > 0;

    let dayState: 'active' | 'missed_planned' | 'unrecorded' = 'unrecorded';
    if (hasLoggedAny) {
      dayState = 'active';
    } else if (dayPlans.length > 0 && dateIso < todayIso) {
      dayState = 'missed_planned';
    }

    // Educational-only XP (study minutes + exercises + quality + completed study tasks)
    const studyPlans = dayPlans.filter((p) => Number(p.is_study) === 1);
    const educationalXp = calculateXpFromPlans(studyPlans).totalXp;

    return {
      dateIso,
      jalaliCompact: formatJalaliCompact(dateIso),
      dayState,
      totalXp: xp.totalXp,
      educationalXp,
      studyMinutes: xp.actualStudyMinutes,
      exercisesCount: xp.exercisesCount,
      learningQuality0To10: evalDay.learningQuality0To10,
      educationalScoreE: evalDay.educationalCompositeE,
      finalDailyScoreS: evalDay.finalDailyScoreS,
    };
  };

  const dates30d = getDateRangeISOList(addDaysISO(todayIso, -29), todayIso);
  const records30d = dates30d.map(buildDayRecord);
  const records14d = records30d.slice(-14);
  const records7d = records30d.slice(-7);
  const prev7dRecords = records14d.slice(0, 7);

  const todayRecord = records7d[records7d.length - 1] || buildDayRecord(todayIso);
  const todayXp = todayRecord.totalXp;

  const xp7dTotal = records7d.reduce((s, r) => s + r.totalXp, 0);
  const xp14dTotal = records14d.reduce((s, r) => s + r.totalXp, 0);
  const xp30dTotal = records30d.reduce((s, r) => s + r.totalXp, 0);
  const prev7dTotal = prev7dRecords.reduce((s, r) => s + r.totalXp, 0);

  const activeDays7d = records7d.filter((r) => r.dayState === 'active').length;
  const missedPlannedDays7d = records7d.filter((r) => r.dayState === 'missed_planned').length;
  const unrecordedDays7d = records7d.filter((r) => r.dayState === 'unrecorded').length;
  const activeDays14d = records14d.filter((r) => r.dayState === 'active').length;
  const prevActiveDays7d = prev7dRecords.filter((r) => r.dayState === 'active').length;

  // Denominator that respects unrecorded days vs active/missed planned days
  const accountableDays7d = Math.max(1, activeDays7d + missedPlannedDays7d);
  const prevAccountableDays7d = Math.max(1, prevActiveDays7d + prev7dRecords.filter((r) => r.dayState === 'missed_planned').length);

  const dailyRate7dCalendar = Math.round(xp7dTotal / 7);
  const dailyRate14dCalendar = Math.round(xp14dTotal / 14);
  const dailyRate30dCalendar = Math.round(xp30dTotal / 30);

  // Outlier-stabilized effective daily rate (winsorized blend of calendar 7d and accountable-day rate)
  const accountableRate7d = xp7dTotal / accountableDays7d;
  const sorted7dXp = [...records7d.map((r) => r.totalXp)].sort((a, b) => a - b);
  const trimmedSum7d =
    sorted7dXp.length >= 7
      ? sorted7dXp.slice(1, 6).reduce((s, v) => s + v, 0) / 5
      : dailyRate7dCalendar;
  const dailyRate7dEffective = Math.max(
    1,
    Math.round(dailyRate7dCalendar * 0.45 + accountableRate7d * 0.35 + trimmedSum7d * 0.2)
  );

  const prev7dDailyRate =
    prevActiveDays7d > 0 ? Math.round(prev7dTotal / Math.max(3, prevAccountableDays7d)) : 0;

  // Velocity comparison (Last 7d vs Previous 7d)
  const currentComparableRate =
    activeDays7d > 0 ? Math.round(xp7dTotal / Math.max(3, accountableDays7d)) : 0;
  const velocityDeltaAbsolute = currentComparableRate - prev7dDailyRate;

  let velocityDeltaPercent: number | null = null;
  let trendDirection: XpTrendDirection = 'insufficient_data';
  let trendLabelPersian = 'در حال ثبت خط پایه';
  let trendBadgeTone: 'emerald' | 'indigo' | 'amber' | 'slate' = 'slate';

  if (activeDays7d === 0 && prevActiveDays7d === 0) {
    trendDirection = 'insufficient_data';
    trendLabelPersian = 'در انتظار ثبت فعالیت';
    trendBadgeTone = 'slate';
  } else if (prevActiveDays7d === 0 || prev7dTotal < 50) {
    // New user or first active week — avoid division by zero or 999% spikes
    trendDirection = activeDays7d >= 2 || xp7dTotal >= 120 ? 'ascending' : 'stable';
    trendLabelPersian =
      trendDirection === 'ascending' ? 'شروع پرقدرت و صعودی 🚀' : 'پایدار (هفته اول ثبت)';
    trendBadgeTone = trendDirection === 'ascending' ? 'emerald' : 'indigo';
  } else {
    velocityDeltaPercent = Math.max(
      -100,
      Math.min(250, Math.round(((currentComparableRate - prev7dDailyRate) / prev7dDailyRate) * 100))
    );
    if (velocityDeltaPercent >= 12) {
      trendDirection = 'ascending';
      trendLabelPersian = `صعودی (+${toPersianDigits(velocityDeltaPercent)}٪ نسبت به هفته قبل)`;
      trendBadgeTone = 'emerald';
    } else if (velocityDeltaPercent <= -15) {
      trendDirection = 'descending';
      trendLabelPersian = `کاهش ریتم (${toPersianDigits(Math.abs(velocityDeltaPercent))}٪ کمتر از هفته قبل)`;
      trendBadgeTone = 'amber';
    } else {
      trendDirection = 'stable';
      const sign = velocityDeltaPercent > 0 ? '+' : '';
      trendLabelPersian = `پایدار و متعادل (${sign}${toPersianDigits(velocityDeltaPercent)}٪)`;
      trendBadgeTone = 'indigo';
    }
  }

  // Real Educational Progress averages in 7d
  const validEDays7d = records7d
    .map((r) => r.educationalScoreE)
    .filter((v): v is number => v !== null);
  const avgEducationalScore7d =
    validEDays7d.length > 0
      ? Math.round(validEDays7d.reduce((a, b) => a + b, 0) / validEDays7d.length)
      : null;

  const prevValidEDays7d = prev7dRecords
    .map((r) => r.educationalScoreE)
    .filter((v): v is number => v !== null);
  const prevAvgEducationalScore7d =
    prevValidEDays7d.length > 0
      ? Math.round(prevValidEDays7d.reduce((a, b) => a + b, 0) / prevValidEDays7d.length)
      : null;

  const validSDays7d = records7d
    .map((r) => r.finalDailyScoreS)
    .filter((v): v is number => v !== null);
  const avgFinalScore7d =
    validSDays7d.length > 0
      ? Math.round(validSDays7d.reduce((a, b) => a + b, 0) / validSDays7d.length)
      : null;

  const validQDays7d = records7d
    .map((r) => r.learningQuality0To10)
    .filter((v): v is number => v !== null);
  const avgLearningQuality7d =
    validQDays7d.length > 0
      ? Math.round((validQDays7d.reduce((a, b) => a + b, 0) / validQDays7d.length) * 10) / 10
      : null;

  // Alignment between XP Growth and Real Educational Progress (Section 12.2 & Q7)
  const educationalXpSharePct =
    xp7dTotal > 0
      ? Math.round(
          (records7d.reduce((s, r) => s + r.educationalXp, 0) / Math.max(1, xp7dTotal)) * 100
        )
      : 100;

  let alignmentStatus: XpEducationalAlignment = 'building_baseline';
  let alignmentTitlePersian = 'در حال تکمیل داده‌های هم‌سنجی رشد';
  let alignmentDescriptionPersian =
    'با ثبت مستمر زمان مطالعه، تمرین و نمره کیفیت یادگیری، هم‌راستایی سرعت کسب XP با پیشرفت واقعی تحصیلی تحلیل می‌شود.';

  if (activeDays7d >= 1 && avgEducationalScore7d !== null) {
    const isQualityLow = avgLearningQuality7d !== null && avgLearningQuality7d < 6.5;
    const isScoreELow = avgEducationalScore7d < 68;
    const isNonStudyHeavy = educationalXpSharePct < 55;

    if ((isQualityLow || isScoreELow || isNonStudyHeavy) && xp7dTotal >= 150) {
      alignmentStatus = 'superficial_xp_warning';
      alignmentTitlePersian = 'هشدار رشد ظاهری XP بدون عمق کافی یادگیری';
      alignmentDescriptionPersian = `با وجود کسب ${toPersianDigits(
        xp7dTotal
      )} XP در ۷ روز اخیر، شاخص عملکرد آموزشی واقعی (${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰)${
        avgLearningQuality7d !== null
          ? ` و کیفیت یادگیری (${toPersianDigits(avgLearningQuality7d)} از ۱۰)`
          : ''
      } نشان می‌دهد بخشی از امتیازها از تیک‌زدن فعالیت‌ها بدون ساعت مطالعه عمیق یا حل تست کافی حاصل شده است.`;
    } else if (trendDirection === 'descending' && avgEducationalScore7d < 75) {
      alignmentStatus = 'simultaneous_drop';
      alignmentTitlePersian = 'کاهش هم‌زمان سرعت XP و ریتم مطالعه';
      alignmentDescriptionPersian = `در ۷ روز اخیر هم سرعت کسب XP و هم امتیاز عملکرد آموزشی (${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰) نسبت به ظرفیت شما کاهش یافته است؛ بازگشت به یک باکس مطالعه متمرکز ۴۵ دقیقه‌ای این روند را به سرعت احیا می‌کند.`;
    } else if (
      avgEducationalScore7d >= 78 &&
      (avgLearningQuality7d === null || avgLearningQuality7d >= 7.5) &&
      activeDays7d < 4
    ) {
      alignmentStatus = 'quality_steady_low_volume';
      alignmentTitlePersian = 'کیفیت یادگیری عالی، نیازمند پیوستگی روزانه بیشتر';
      alignmentDescriptionPersian = `کیفیت مطالعه شما در روزهای فعال بسیار مطلوب است (شاخص آموزشی ${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰)، اما افزایش تعداد روزهای فعال هفته، سرعت صعود شما به سطح بعدی را دوچندان می‌کند.`;
    } else {
      alignmentStatus = 'synergistic_growth';
      alignmentTitlePersian = 'رشد اصیل و هم‌راستای XP با پیشرفت واقعی تحصیلی';
      alignmentDescriptionPersian = `سرعت کسب XP شما کاملاً متکی بر مطالعه باکیفیت (شاخص آموزشی ${toPersianDigits(
        avgEducationalScore7d
      )} از ۱۰۰${
        avgLearningQuality7d !== null
          ? ` و کیفیت ${toPersianDigits(avgLearningQuality7d)} از ۱۰`
          : ''
      }) است و رشد واقعی علمی شما را بازتاب می‌دهد.`;
    }
  }

  // Estimated days to next permanent level based on effective recent pace
  const effectivePaceForPrediction = Math.max(
    dailyRate7dEffective,
    dailyRate14dCalendar,
    todayXp > 0 ? Math.round(todayXp * 0.75) : 0
  );

  let estimatedDaysToNextLevel: number | null = null;
  let estimatedNextLevelTextPersian = 'با ثبت اولین فعالیت امروز، زمان رسیدن به سطح بعد محاسبه می‌شود';

  if (effectivePaceForPrediction >= 15) {
    estimatedDaysToNextLevel = Math.max(
      1,
      Math.ceil(levelProgress.xpRemainingToNextLevel / effectivePaceForPrediction)
    );
    estimatedNextLevelTextPersian = `با ریتم فعلی: حدود ${toPersianDigits(
      estimatedDaysToNextLevel
    )} روز تا سطح ${toPersianDigits(levelProgress.level + 1)} (${levelProgress.nextRankTitle})`;
  }

  // Non-Punitive Constructive Diagnostic & Recovery Challenge (Sections 13 & 15)
  const hasPerformanceDropWarning =
    trendDirection === 'descending' ||
    alignmentStatus === 'superficial_xp_warning' ||
    alignmentStatus === 'simultaneous_drop' ||
    missedPlannedDays7d >= 2;

  let warningHeadlinePersian: string | null = null;
  if (alignmentStatus === 'superficial_xp_warning') {
    warningHeadlinePersian =
      'امتیاز سطح دائمی شما محفوظ است؛ اما برای تبدیل XP به پیشرفت واقعی، کیفیت مطالعه و تست‌زنی را اولویت دهید.';
  } else if (trendDirection === 'descending' || missedPlannedDays7d >= 2) {
    warningHeadlinePersian = `سطح دائمی شما بدون هیچ کسر امتیازی حفظ شده است، اما سرعت پیشرفت هفتگی شما کاهش یافته است (${toPersianDigits(
      activeDays7d
    )} روز فعال در ۷ روز اخیر).`;
  }

  const targetRecoveryStudyMins = 60;
  const targetRecoveryTests = 15;
  const recoveryChallengeXp =
    50 + Math.floor(targetRecoveryStudyMins / 5) + targetRecoveryTests * 2 + 16; // ~108 XP
  const recoveryChallengeTextPersian = hasPerformanceDropWarning
    ? `چالش احیای ریتم (بدون جریمه): با تکمیل ۱ باکس مطالعه ${toPersianDigits(
        targetRecoveryStudyMins
      )} دقیقه‌ای با کیفیت +۸ و حل ${toPersianDigits(
        targetRecoveryTests
      )} تست، حدود +${toPersianDigits(
        recoveryChallengeXp
      )} XP کسب کرده و منحنی پیشرفت خود را دوباره صعودی کنید.`
    : `گام طلایی ادامه مسیر: حفظ پیوستگی روزانه و ثبت حداقل ۱ باکس مطالعه عمیق برای صعود سریع‌تر به «${levelProgress.nextRankTitle}».`;

  return {
    todayXp,
    xp7dTotal,
    xp14dTotal,
    xp30dTotal,
    prev7dTotal,
    dailyRate7dCalendar,
    dailyRate7dEffective,
    dailyRate14dCalendar,
    dailyRate30dCalendar,
    prev7dDailyRate,
    activeDays7d,
    missedPlannedDays7d,
    unrecordedDays7d,
    activeDays14d,
    velocityDeltaAbsolute,
    velocityDeltaPercent,
    trendDirection,
    trendLabelPersian,
    trendBadgeTone,
    avgEducationalScore7d,
    prevAvgEducationalScore7d,
    avgFinalScore7d,
    avgLearningQuality7d,
    alignmentStatus,
    alignmentTitlePersian,
    alignmentDescriptionPersian,
    estimatedDaysToNextLevel,
    estimatedNextLevelTextPersian,
    hasPerformanceDropWarning,
    warningHeadlinePersian,
    recoveryChallengeTextPersian,
    recent7DaysSeries: records7d,
  };
}


