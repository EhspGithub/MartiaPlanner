import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FileCheck2,
  Award,
  Layers,
  Coffee,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trophy,
  Flame,
  Sparkles,
  Target,
  Info,
} from 'lucide-react';
import type { DashboardMetrics } from '../types.ts';
import { api } from '../services/api.ts';
import {
  toPersianDigits,
  formatMinutesPersian,
  formatJalaliWeekdaySlash,
  getTodayISO,
} from '../utils/jalali.ts';
import { WeeklyAnalyticalReport } from './WeeklyAnalyticalReport.tsx';
import { PerformanceAnalyticsView } from './PerformanceAnalyticsView.tsx';

interface DashboardViewProps {
  onNavigateToPlanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToPlanner }) => {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null);

  const todayIso = getTodayISO();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getDashboardMetrics(range, todayIso)
      .then((data) => {
        if (active) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'خطا در دریافت اطلاعات داشبورد');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [range, todayIso]);

  const totalXp = metrics
    ? metrics.completedActivitiesCount * 50 +
      metrics.partialActivitiesCount * 25 +
      metrics.totalExercisesSolved * 2
    : 0;

  const studentRankTitle =
    !metrics || metrics.adherencePercentage === 0
      ? range === 'today'
        ? 'آماده شروع مأموریت امروز 🚀'
        : range === 'week'
        ? 'آماده جهش در برنامه این هفته 🚀'
        : 'آماده ثبت رکورد در این ماه 🚀'
      : metrics.adherencePercentage >= 85
      ? range === 'today'
        ? 'قهرمان برنامه‌ریزی امروز 🏆'
        : range === 'week'
        ? 'قهرمان برنامه‌ریزی این هفته 🏆'
        : 'قهرمان برنامه‌ریزی این ماه 🏆'
      : metrics.adherencePercentage >= 60
      ? range === 'today'
        ? 'پیشگام پرانرژی و باانگیزه در برنامه امروز ⚡'
        : range === 'week'
        ? 'پیشگام پرانرژی و باانگیزه در این هفته ⚡'
        : 'پیشگام پرانرژی و باانگیزه در این ماه ⚡'
      : range === 'today'
      ? 'در مسیر پیشرفت و تلاش مستمر امروز 🌱'
      : range === 'week'
      ? 'در مسیر پیشرفت و تلاش مستمر هفتگی 🌱'
      : 'در مسیر پیشرفت و تلاش مستمر ماهانه 🌱';

  const englishRangeMotto =
    range === 'today'
      ? 'Focus on today’s goals — every focused minute builds your future!'
      : range === 'week'
      ? 'Weekly consistency turns smart planning into lasting mastery!'
      : 'Monthly momentum — steady daily progress creates extraordinary results!';

  const rangeLabelPersian =
    range === 'today' ? 'امروز' : range === 'week' ? 'این هفته' : 'این ماه';

  const varianceText = !metrics
    ? '—'
    : metrics.studyTimeVarianceMinutes === 0
    ? '۰ دقیقه (منطبق با هدف)'
    : metrics.studyTimeVarianceMinutes > 0
    ? `${toPersianDigits(metrics.studyTimeVarianceMinutes)} دقیقه بیشتر از هدف`
    : `${toPersianDigits(Math.abs(metrics.studyTimeVarianceMinutes))} دقیقه کمتر از هدف`;

  const qualityText = !metrics
    ? '—'
    : metrics.averageLearningQualityScore !== null
    ? `${metrics.averageLearningQualityLabel} (${toPersianDigits(metrics.averageLearningQualityScore)} از ۱۰)`
    : metrics.averageLearningQualityLabel;

  const detailCards = metrics
    ? [
        {
          id: 1,
          title: '۱. هدف پیش‌بینی مطالعه',
          value: formatMinutesPersian(metrics.totalPredictedStudyMinutes),
          tooltip: `مجموع زمان هدف‌گذاری‌شده برای فعالیت‌های درسی در بازه «${rangeLabelPersian}».`,
          icon: Clock,
          cardBorder: 'border-indigo-200/80 dark:border-indigo-900/50',
          cardBg:
            'bg-gradient-to-l from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20',
          iconWrap: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          valueColor: 'text-indigo-950 dark:text-white',
        },
        {
          id: 2,
          title: '۲. مطالعه واقعی ثبت‌شده',
          value: formatMinutesPersian(metrics.totalActualStudyMinutes),
          tooltip: `مجموع زمان واقعی صرف‌شده برای مطالعه دروس در بازه «${rangeLabelPersian}».`,
          icon: BookOpen,
          cardBorder: 'border-emerald-200/80 dark:border-emerald-900/50',
          cardBg:
            'bg-gradient-to-l from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20',
          iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          valueColor: 'text-emerald-700 dark:text-emerald-300',
        },
        {
          id: 3,
          title: '۳. تراز زمان مطالعه با هدف',
          value: varianceText,
          tooltip:
            'اختلاف بین ساعت مطالعه واقعی و زمان پیش‌بینی‌شده اولیه (بیشتر یا کمتر بودن مطالعه نسبت به هدف).',
          icon: metrics.studyTimeVarianceMinutes >= 0 ? ArrowUpRight : ArrowDownRight,
          cardBorder: 'border-amber-200/80 dark:border-amber-900/50',
          cardBg:
            'bg-gradient-to-l from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20',
          iconWrap:
            metrics.studyTimeVarianceMinutes >= 0
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          valueColor: 'text-slate-900 dark:text-white',
        },
        {
          id: 4,
          title: '۴. تست و تمرین حل‌شده',
          value: `${toPersianDigits(metrics.totalExercisesSolved)} مورد`,
          tooltip: `مجموع تمام تست‌ها و تمرین‌های حل‌شده در فعالیت‌های درسی بازه «${rangeLabelPersian}».`,
          icon: FileCheck2,
          cardBorder: 'border-blue-200/80 dark:border-blue-900/50',
          cardBg:
            'bg-gradient-to-l from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20',
          iconWrap: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
          valueColor: 'text-blue-700 dark:text-blue-300',
        },
        {
          id: 5,
          title: '۵. سطح کیفی یادگیری دروس',
          value: qualityText,
          tooltip:
            'میانگین وزنی کیفیت یادگیری (از ۰ تا ۱۰) بر اساس مدت زمان واقعی هر نوبت مطالعه.',
          icon: Award,
          cardBorder: 'border-purple-200/80 dark:border-purple-900/50',
          cardBg:
            'bg-gradient-to-l from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20',
          iconWrap: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
          valueColor: 'text-purple-700 dark:text-purple-300',
        },
        {
          id: 6,
          title: '۶. کل برنامه‌های تعریف‌شده',
          value: `${toPersianDigits(metrics.totalPlannedActivities)} برنامه`,
          tooltip: `تعداد کل فعالیت‌های ثبت‌شده (درسی و غیردرسی) در برنامه بازه «${rangeLabelPersian}».`,
          icon: Layers,
          cardBorder: 'border-slate-200/90 dark:border-slate-700/70',
          cardBg:
            'bg-gradient-to-l from-slate-100/85 via-white to-slate-50/40 dark:from-slate-800/60 dark:via-slate-900 dark:to-slate-800/30',
          iconWrap: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
          valueColor: 'text-slate-900 dark:text-white',
        },
        {
          id: 7,
          title: '۷. فعالیت‌های تکمیل‌شده کامل',
          value: `${toPersianDigits(metrics.completedActivitiesCount)} مورد`,
          tooltip: 'تعداد فعالیت‌هایی که گزارش اجرای آن‌ها به‌طور کامل (تکمیل‌شده) ثبت شده است.',
          icon: CheckCircle2,
          cardBorder: 'border-emerald-200/80 dark:border-emerald-900/50',
          cardBg:
            'bg-gradient-to-l from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20',
          iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          valueColor: 'text-emerald-700 dark:text-emerald-300',
        },
        {
          id: 8,
          title: '۸. فعالیت‌های ناقص یا در انتظار',
          value: `${toPersianDigits(metrics.incompleteOrPendingCount)} مورد (${toPersianDigits(
            metrics.partialActivitiesCount
          )} ناقص، ${toPersianDigits(metrics.pendingActivitiesCount)} مانده)`,
          tooltip:
            'مجموع فعالیت‌هایی که به‌صورت نیمه‌تمام انجام شده‌اند یا هنوز در انتظار ثبت عملکرد هستند.',
          icon: AlertCircle,
          cardBorder: 'border-amber-200/80 dark:border-amber-900/50',
          cardBg:
            'bg-gradient-to-l from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20',
          iconWrap: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          valueColor: 'text-amber-700 dark:text-amber-300',
        },
        {
          id: 9,
          title: '۹. نرخ پایبندی به اجرای برنامه',
          value: `${toPersianDigits(metrics.adherencePercentage)}٪`,
          tooltip:
            'درصد تحقق و تکمیل فعالیت‌های برنامه‌ریزی‌شده (کامل = ۱۰۰٪ و ناقص = ۵۰٪ وزن تکمیل).',
          icon: TrendingUp,
          cardBorder: 'border-indigo-200/80 dark:border-indigo-900/50',
          cardBg:
            'bg-gradient-to-l from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20',
          iconWrap: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
          valueColor: 'text-indigo-600 dark:text-indigo-300',
        },
        {
          id: 10,
          title: '۱۰. زمان فعالیت‌های غیردرسی',
          value: `${formatMinutesPersian(metrics.nonStudyActualMinutes)} (هدف: ${formatMinutesPersian(
            metrics.nonStudyPredictedMinutes
          )})`,
          tooltip:
            'مجموع زمان واقعی صرف‌شده برای استراحت، ورزش و سرگرمی در مقایسه با زمان پیش‌بینی‌شده غیردرسی.',
          icon: Coffee,
          cardBorder: 'border-teal-200/80 dark:border-teal-900/50',
          cardBg:
            'bg-gradient-to-l from-teal-50/85 via-white to-teal-50/40 dark:from-teal-950/35 dark:via-slate-900 dark:to-teal-950/20',
          iconWrap: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
          valueColor: 'text-teal-800 dark:text-teal-300',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* =====================================================================
          CENTERED DASHBOARD HEADER
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700 text-white p-5 sm:p-7 shadow-lg shadow-indigo-500/15">
        <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-3.5">
          {/* Single-line Title & Numeric Shamsi Date */}
          <div className="space-y-1.5 max-w-full overflow-hidden">
            <h1 className="text-sm sm:text-2xl lg:text-3xl font-black tracking-tight whitespace-nowrap truncate flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
              <span>کارنامه هوشمند و تحلیل پیشرفت تحصیلی</span>
            </h1>

            <div className="text-xs sm:text-sm font-extrabold text-amber-300 tabular-nums whitespace-nowrap">
              امروز، {formatJalaliWeekdaySlash(todayIso)}
            </div>

            {/* Single-line dynamic motivational sentences */}
            <div className="text-xs sm:text-base font-extrabold text-white/95 whitespace-nowrap truncate max-w-full px-1">
              {studentRankTitle}
            </div>
            <p
              dir="ltr"
              className="text-[10px] sm:text-xs font-semibold text-indigo-100/90 whitespace-nowrap truncate max-w-full px-2"
            >
              {englishRangeMotto}
            </p>
          </div>

          {/* Centered Compact XP Performance Card */}
          {metrics && (
            <div className="mx-auto flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 px-5 py-2.5 min-w-[190px] shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-400/25 flex items-center justify-center text-amber-300">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-bold text-indigo-100 whitespace-nowrap">
                امتیاز عملکرد (XP)
              </div>
              <div className="text-sm sm:text-base font-black text-amber-300 tabular-nums flex items-center justify-center gap-1 whitespace-nowrap">
                <Flame className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{toPersianDigits(totalXp)} امتیاز</span>
              </div>
            </div>
          )}

          {/* Centered Timeframe Segmented Selector */}
          <div className="mx-auto inline-flex items-center justify-center gap-1 p-1.5 bg-slate-950/30 backdrop-blur-md border border-white/15 rounded-2xl">
            <button
              type="button"
              onClick={() => setRange('today')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[34px] ${
                range === 'today'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => setRange('week')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[34px] ${
                range === 'week'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              این هفته
            </button>
            <button
              type="button"
              onClick={() => setRange('month')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[34px] ${
                range === 'month'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              این ماه
            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive Performance Evaluation & Analytics Section (includes all 7 charts) */}
      <PerformanceAnalyticsView />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="h-14 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-5 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {!loading && metrics && (
        <>
          {/* =================================================================
              SECTION 6: 10 COMPACT NUMBERED COMPLEMENTARY DETAIL CARDS WITH TOOLTIPS
          ================================================================= */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  جزئیات تکمیلی عملکرد برنامه ({rangeLabelPersian})
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                برای مشاهده توضیح هر شاخص، روی آیکون راهنما (i) کلیک کنید
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {detailCards.map((card) => {
                const IconComp = card.icon;
                const isTooltipOpen = activeTooltipId === card.id;
                return (
                  <div
                    key={card.id}
                    className={`relative rounded-2xl border ${card.cardBorder} ${card.cardBg} px-3.5 py-2.5 shadow-2xs flex flex-col justify-center gap-1.5 ${
                      card.id === 10 ? 'sm:col-span-2 lg:col-span-1' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg ${card.iconWrap} flex items-center justify-center shrink-0`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">
                          <span>{card.title}: </span>
                          <span className={`font-black ${card.valueColor} tabular-nums`}>
                            {card.value}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        title={card.tooltip}
                        onClick={() =>
                          setActiveTooltipId((prev) => (prev === card.id ? null : card.id))
                        }
                        className="w-6 h-6 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/70 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                        aria-label={`توضیح ${card.title}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isTooltipOpen && (
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 rounded-xl px-2.5 py-1.5 border border-slate-200/70 dark:border-slate-700/70 leading-relaxed">
                        {card.tooltip}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* =================================================================
              SECTION 9: WEEKLY ANALYTICAL REPORT (PRESERVED UNCHANGED)
          ================================================================= */}
          <WeeklyAnalyticalReport />

          {/* Subject-by-Subject Visual Progress & Comparison Table */}
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    مقایسه دیداری پیش‌بینی و عملکرد واقعی در هر درس
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    بررسی نسبت زمان واقعی به پیش‌بینی و تعداد تمرین‌های حل‌شده در هر درس
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToPlanner}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت برنامه جدید</span>
              </button>
            </div>

            {metrics.subjectBreakdown.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  در این بازه زمانی هنوز فعالیت درسی ثبت نشده است.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  اولین درس امروزت را برنامه‌ریزی کن تا پیشرفت هر کتاب اینجا فعال شود!
                </p>
                <button
                  type="button"
                  onClick={onNavigateToPlanner}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن اولین فعالیت درسی</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50/90 dark:bg-slate-800/50 text-xs font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-6">نام درس</th>
                      <th className="py-3.5 px-6">زمان پیش‌بینی‌شده</th>
                      <th className="py-3.5 px-6">زمان واقعی نسبت به پیش‌بینی</th>
                      <th className="py-3.5 px-6">اختلاف زمان</th>
                      <th className="py-3.5 px-6">تعداد تمرین / تست</th>
                      <th className="py-3.5 px-6">وضعیت تکمیل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {metrics.subjectBreakdown.map((item) => {
                      const diff = item.actualMinutes - item.predictedMinutes;
                      const ratioPct =
                        item.predictedMinutes > 0
                          ? Math.round((item.actualMinutes / item.predictedMinutes) * 100)
                          : 0;
                      const barWidthPct = Math.min(100, ratioPct);
                      return (
                        <tr
                          key={item.subjectName}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                            {item.subjectName}
                          </td>
                          <td className="py-4 px-6 text-slate-600 dark:text-slate-300 tabular-nums">
                            {formatMinutesPersian(item.predictedMinutes)}
                          </td>
                          <td className="py-4 px-6 min-w-[200px]">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white tabular-nums mb-1.5">
                              <span>{formatMinutesPersian(item.actualMinutes)}</span>
                              <span className="text-indigo-600 dark:text-indigo-400">
                                {toPersianDigits(ratioPct)}٪
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  ratioPct >= 100
                                    ? 'bg-emerald-500'
                                    : ratioPct >= 60
                                    ? 'bg-indigo-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${barWidthPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-4 px-6 tabular-nums">
                            {item.actualMinutes === 0 ? (
                              <span className="text-xs text-slate-400">ثبت‌نشده</span>
                            ) : diff === 0 ? (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                منطبق با پیش‌بینی
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {toPersianDigits(diff)}+ دقیقه بیشتر
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                {toPersianDigits(Math.abs(diff))} دقیقه کمتر
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                            {toPersianDigits(item.exercisesCount)} تمرین
                          </td>
                          <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                            {toPersianDigits(item.completedCount)} از {toPersianDigits(item.totalCount)} کامل
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
