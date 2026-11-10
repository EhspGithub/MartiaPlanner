import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Clock,
  FileCheck2,
  Award,
  Trophy,
  Timer,
  Gamepad2,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  Sparkles,
} from 'lucide-react';
import type { DailyTimeBudgetConfig } from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekDays,
  getDateRangeISOList,
  formatJalaliCompact,
  formatJalaliFull,
  toPersianDigits,
  formatMinutesPersian,
  formatHoursAndMinutesPersian,
} from '../utils/jalali.ts';
import {
  evaluatePeriodPerformance,
  compareTwoPeriods,
  type PeriodPerformanceSummary,
  type MetricComparisonDelta,
} from '../utils/analyticsEngine.ts';

type AnalyticsFilterMode = 'daily' | 'weekly' | 'monthly' | 'custom';

function formatDeltaBadgeText(delta: MetricComparisonDelta): string {
  if (delta.baseValue === null || delta.targetValue === null) return 'بدون داده کافی';
  if (delta.isBaseZero) {
    return delta.targetValue === 0 ? '۰٪ تغییر' : 'افزایش از صفر';
  }
  if (delta.percentChange === null) return '—';
  const sign = delta.percentChange > 0 ? '+' : '';
  return `${sign}${toPersianDigits(delta.percentChange)}٪`;
}

export const PerformanceAnalyticsView: React.FC = () => {
  const todayIso = getTodayISO();
  const currentWeekDays = useMemo(() => getPersianWeekDays(todayIso), [todayIso]);

  const [filterMode, setFilterMode] = useState<AnalyticsFilterMode>('weekly');
  const [singleDate, setSingleDate] = useState<string>(todayIso);
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [customStart, setCustomStart] = useState<string>(addDaysISO(todayIso, -6));
  const [customEnd, setCustomEnd] = useState<string>(todayIso);

  // Period Comparison state (Section 10.9)
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [compStartA, setCompStartA] = useState<string>(addDaysISO(todayIso, -13));
  const [compEndA, setCompEndA] = useState<string>(addDaysISO(todayIso, -7));

  const [periodSummary, setPeriodSummary] = useState<PeriodPerformanceSummary | null>(null);
  const [comparisonSummaryA, setComparisonSummaryA] = useState<PeriodPerformanceSummary | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Compute active date range for primary period (Period B)
  const activeDateRange = useMemo(() => {
    if (filterMode === 'daily') {
      return {
        start: singleDate,
        end: singleDate,
        label: `روزانه (${formatJalaliFull(singleDate)})`,
      };
    }
    if (filterMode === 'weekly') {
      const wDays = getPersianWeekDays(weekRefDate);
      return {
        start: wDays[0].isoDate,
        end: wDays[6].isoDate,
        label: `هفتگی (${formatJalaliCompact(wDays[0].isoDate)} تا ${formatJalaliCompact(
          wDays[6].isoDate
        )})`,
      };
    }
    if (filterMode === 'monthly') {
      const start = addDaysISO(todayIso, -29);
      return {
        start,
        end: todayIso,
        label: `ماهانه ۳۰ روزه (${formatJalaliCompact(start)} تا ${formatJalaliCompact(todayIso)})`,
      };
    }
    const s = customStart <= customEnd ? customStart : customEnd;
    const e = customStart <= customEnd ? customEnd : customStart;
    return {
      start: s,
      end: e,
      label: `بازه دلخواه (${formatJalaliCompact(s)} تا ${formatJalaliCompact(e)})`,
    };
  }, [filterMode, singleDate, weekRefDate, customStart, customEnd, todayIso]);

  // Automatically sync default comparison period A when primary range changes
  useEffect(() => {
    const dates = getDateRangeISOList(activeDateRange.start, activeDateRange.end);
    const len = Math.max(1, dates.length);
    setCompEndA(addDaysISO(activeDateRange.start, -1));
    setCompStartA(addDaysISO(activeDateRange.start, -len));
  }, [activeDateRange.start, activeDateRange.end]);

  // Load primary period data (and comparison period if enabled)
  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const datesB = getDateRangeISOList(activeDateRange.start, activeDateRange.end);
        const [plansB, budgetsListB] = await Promise.all([
          api.getPlansByRange(activeDateRange.start, activeDateRange.end),
          api.getTimeBudgetsByRange(activeDateRange.start, activeDateRange.end),
        ]);

        if (!active) return;
        const budgetsMapB = new Map<string, DailyTimeBudgetConfig>();
        for (const b of budgetsListB) {
          budgetsMapB.set(b.plan_date, b);
        }

        const summaryB = evaluatePeriodPerformance({
          dateIsoList: datesB,
          plans: plansB,
          budgetsMap: budgetsMapB,
        });
        setPeriodSummary(summaryB);

        if (showComparison) {
          const sA = compStartA <= compEndA ? compStartA : compEndA;
          const eA = compStartA <= compEndA ? compEndA : compStartA;
          const datesA = getDateRangeISOList(sA, eA);
          const [plansA, budgetsListA] = await Promise.all([
            api.getPlansByRange(sA, eA),
            api.getTimeBudgetsByRange(sA, eA),
          ]);
          if (!active) return;
          const budgetsMapA = new Map<string, DailyTimeBudgetConfig>();
          for (const b of budgetsListA) {
            budgetsMapA.set(b.plan_date, b);
          }
          const summaryA = evaluatePeriodPerformance({
            dateIsoList: datesA,
            plans: plansA,
            budgetsMap: budgetsMapA,
          });
          setComparisonSummaryA(summaryA);
        } else {
          setComparisonSummaryA(null);
        }
      } catch {
        // Handled gracefully
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      active = false;
    };
  }, [activeDateRange.start, activeDateRange.end, showComparison, compStartA, compEndA]);

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!periodSummary) return [];
    return periodSummary.dailyEvaluations.map((d) => ({
      date: d.dateIso,
      label: d.jalaliCompact,
      fullLabel: d.jalaliFull,
      plannedStudyMins: d.predictedStudyMinutes,
      actualStudyMins: d.actualStudyMinutes,
      targetExercises: d.targetExercisesCount ?? 0,
      actualExercises: d.actualExercisesCount,
      quality0To10: d.learningQuality0To10 ?? 0,
      hasQuality: d.learningQuality0To10 !== null,
      scoreS: d.finalDailyScoreS ?? 0,
      hasScoreS: d.finalDailyScoreS !== null,
      scoreE: d.educationalCompositeE ?? 0,
      scoreC: d.restrictedControlIndexC ?? 0,
      allowedRestrictedMins: d.restrictedAllowedLoggedMinutes || d.restrictedPlannedMinutes,
      actualRestrictedMins: d.restrictedActualMinutes,
      overuseRestrictedMins: d.restrictedOveruseMinutes,
      budgetMins: d.budgetMinutes ?? 0,
      essentialActualMins: d.essentialActualMinutes,
      unallocatedBudgetMins: d.remainingActualBudgetMinutes ?? 0,
    }));
  }, [periodSummary]);

  // Budget Pie Distribution data (10.7)
  const budgetDistributionPie = useMemo(() => {
    if (!periodSummary) return [];
    return [
      {
        name: 'مطالعه و آموزش',
        value: periodSummary.totalStudyMinutes,
        color: '#4f46e5',
      },
      {
        name: 'سرگرمی محدودشونده',
        value: periodSummary.totalRestrictedActualMinutes,
        color: '#f59e0b',
      },
      {
        name: 'استراحت و ضروری',
        value: periodSummary.totalEssentialActualMinutes,
        color: '#10b981',
      },
      {
        name: 'باقی‌مانده ظرفیت',
        value: periodSummary.totalUnallocatedMinutesOnBudgetedDays,
        color: '#94a3b8',
      },
    ].filter((item) => item.value > 0);
  }, [periodSummary]);

  // Period Comparison Metrics (10.9)
  const comparisonRows = useMemo(() => {
    if (!showComparison || !comparisonSummaryA || !periodSummary) return [];
    const comp = compareTwoPeriods(comparisonSummaryA, periodSummary);
    return [
      {
        key: 'studyTime',
        label: 'مجموع ساعت مطالعه',
        unit: 'دقیقه',
        delta: comp.studyMinutesDelta,
        higherIsBetter: true,
      },
      {
        key: 'exercises',
        label: 'تعداد تست و تمرین حل‌شده',
        unit: 'تست',
        delta: comp.exercisesCountDelta,
        higherIsBetter: true,
      },
      {
        key: 'quality',
        label: 'میانگین کیفیت یادگیری (۰ تا ۱۰)',
        unit: 'از ۱۰',
        delta: comp.learningQualityDelta,
        higherIsBetter: true,
      },
      {
        key: 'finalScore',
        label: 'میانگین امتیاز نهایی (۰ تا ۱۰۰)',
        unit: 'امتیاز',
        delta: comp.finalScoreDelta,
        higherIsBetter: true,
      },
      {
        key: 'budgetShare',
        label: 'سهم مطالعه از ظرف زمانی',
        unit: 'درصد',
        delta: comp.studyBudgetShareDelta,
        higherIsBetter: true,
      },
      {
        key: 'restricted',
        label: 'زمان مصرفی سرگرمی‌های محدودشونده',
        unit: 'دقیقه',
        delta: comp.restrictedTimeDelta,
        higherIsBetter: false,
      },
    ];
  }, [showComparison, comparisonSummaryA, periodSummary]);

  // Generate recent 45 days list for easy Jalali dropdown selection in Custom/Daily modes
  const selectableRecentDates = useMemo(() => {
    const list: Array<{ iso: string; label: string }> = [];
    for (let i = -35; i <= 7; i++) {
      const iso = addDaysISO(todayIso, i);
      list.push({
        iso,
        label: `${formatJalaliFull(iso)}${iso === todayIso ? ' (امروز)' : ''}`,
      });
    }
    return list.reverse();
  }, [todayIso]);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          SECTION 10.1: FILTER BAR & PERIOD COMPARISON TOGGLE
      ===================================================================== */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span>سیستم جامع گزارش و تحلیل عملکرد (مبتنی بر منطق وزنی ۰ تا ۱۰۰)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              تحلیل چندبعدی مطالعه، کیفیت یادگیری، ظرف زمانی و کنترل سرگرمی‌ها
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 4 Timeframe Mode Buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              {(
                [
                  { id: 'daily', label: 'روزانه' },
                  { id: 'weekly', label: 'هفتگی' },
                  { id: 'monthly', label: 'ماهانه' },
                  { id: 'custom', label: 'بازه دلخواه' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    filterMode === tab.id
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Toggle Period Comparison (10.9) */}
            <button
              type="button"
              onClick={() => setShowComparison((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer ${
                showComparison
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>مقایسه دو بازه زمانی</span>
            </button>
          </div>
        </div>

        {/* Sub-controls for Selected Filter Mode */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {filterMode === 'daily' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">انتخاب روز:</span>
              <select
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
              >
                {selectableRecentDates.map((d) => (
                  <option key={d.iso} value={d.iso}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filterMode === 'weekly' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, -7))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                هفته قبل
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(todayIso)}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 font-extrabold text-indigo-700 dark:text-indigo-300 cursor-pointer"
              >
                هفته جاری ({formatJalaliCompact(currentWeekDays[0].isoDate)} تا{' '}
                {formatJalaliCompact(currentWeekDays[6].isoDate)})
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, 7))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                هفته بعد
              </button>
            </div>
          )}

          {filterMode === 'monthly' && (
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
              بازه تحلیلی ۳۰ روز اخیر: {activeDateRange.label}
            </div>
          )}

          {filterMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-300">از تاریخ:</span>
              <select
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                {selectableRecentDates.map((d) => (
                  <option key={d.iso} value={d.iso}>
                    {d.label}
                  </option>
                ))}
              </select>
              <span className="font-bold text-slate-600 dark:text-slate-300">تا تاریخ:</span>
              <select
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                {selectableRecentDates.map((d) => (
                  <option key={d.iso} value={d.iso}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {activeDateRange.label} ({toPersianDigits(periodSummary?.daysCount || 0)} روز)
          </div>
        </div>

        {/* Comparison Period A Selector when showComparison is active */}
        {showComparison && (
          <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-indigo-900 dark:text-indigo-200">
              <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>انتخاب بازه اول (دوره پایه جهت مقایسه با بازه فعلی):</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>از:</span>
              <select
                value={compStartA}
                onChange={(e) => setCompStartA(e.target.value)}
                className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                {selectableRecentDates.map((d) => (
                  <option key={d.iso} value={d.iso}>
                    {d.label}
                  </option>
                ))}
              </select>
              <span>تا:</span>
              <select
                value={compEndA}
                onChange={(e) => setCompEndA(e.target.value)}
                className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
              >
                {selectableRecentDates.map((d) => (
                  <option key={d.iso} value={d.iso}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {loading || !periodSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* =================================================================
              SECTION 10.8: 6 STATISTICAL SUMMARY CARDS (کارت‌های خلاصه آماری)
          ================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: مجموع ساعت مطالعه در بازه انتخابی */}
            <div className="rounded-3xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  ۱. مجموع ساعت مطالعه در بازه
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {formatHoursAndMinutesPersian(periodSummary.totalStudyMinutes)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  پیش‌بینی: {formatHoursAndMinutesPersian(periodSummary.totalPredictedStudyMinutes)}
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  میانگین روزانه: {formatMinutesPersian(periodSummary.avgDailyStudyMinutes)}
                </span>
              </div>
            </div>

            {/* Card 2: مجموع تمرین‌ها و تست‌های حل‌شده */}
            <div className="rounded-3xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  ۲. مجموع تمرین‌ها و تست‌های حل‌شده
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-blue-700 dark:text-blue-400 tabular-nums">
                {toPersianDigits(periodSummary.totalExercisesCount)} تست و تمرین
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  هدف تعیین‌شده:{' '}
                  {periodSummary.totalTargetExercisesCount > 0
                    ? `${toPersianDigits(periodSummary.totalTargetExercisesCount)} مورد`
                    : 'بدون هدف عددی'}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  میانگین روزانه:{' '}
                  {toPersianDigits(
                    Math.round(
                      periodSummary.totalExercisesCount / Math.max(1, periodSummary.daysCount)
                    )
                  )}{' '}
                  تست
                </span>
              </div>
            </div>

            {/* Card 3: میانگین کیفیت یادگیری (وزنی از ۱۰) */}
            <div className="rounded-3xl border border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  ۳. میانگین کیفیت یادگیری (وزنی از ۱۰)
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-purple-700 dark:text-purple-400 tabular-nums">
                {periodSummary.weightedLearningQuality0To10 !== null
                  ? `${toPersianDigits(periodSummary.weightedLearningQuality0To10)} از ۱۰`
                  : 'ثبت‌نشده'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                محاسبه‌شده با وزن مدت زمان واقعی هر مطالعه در کل دوره
              </div>
            </div>

            {/* Card 4: میانگین امتیاز نهایی عملکرد (از ۱۰۰) */}
            <div className="rounded-3xl border border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  ۴. میانگین امتیاز نهایی عملکرد (از ۱۰۰)
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {periodSummary.averageFinalScoreS !== null
                  ? `${toPersianDigits(periodSummary.averageFinalScoreS)} از ۱۰۰`
                  : 'بدون روز امتیازدار'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                بر اساس {toPersianDigits(periodSummary.validScoreDaysCount)} روز دارای عملکرد آموزشی از{' '}
                {toPersianDigits(periodSummary.daysCount)} روز بازه
              </div>
            </div>

            {/* Card 5: میانگین سهم مطالعه از ظرف زمانی */}
            <div className="rounded-3xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  ۵. میانگین سهم مطالعه از ظرف زمانی
                </span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-sky-700 dark:text-sky-400 tabular-nums">
                {periodSummary.studyShareOfBudgetPct !== null
                  ? `${toPersianDigits(periodSummary.studyShareOfBudgetPct)}٪`
                  : 'ظرف زمانی ثبت‌نشده'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                بر اساس {toPersianDigits(periodSummary.validBudgetDaysCount)} روز دارای ظرف زمانی (مجموع{' '}
                {formatHoursAndMinutesPersian(periodSummary.totalBudgetMinutesOnValidDays)})
              </div>
            </div>

            {/* Card 6: میانگین زمان مصرفی برای فعالیت‌های تفریحی */}
            <div className="rounded-3xl border border-amber-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  ۶. میانگین زمان فعالیت‌های تفریحی
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                {formatMinutesPersian(periodSummary.avgDailyRestrictedActualMinutes)} در روز
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  مجموع مصرفی: {formatMinutesPersian(periodSummary.totalRestrictedActualMinutes)}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  کنترل (C):{' '}
                  {periodSummary.averageRestrictedControlIndexC !== null
                    ? `${toPersianDigits(periodSummary.averageRestrictedControlIndexC)}٪`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================
              SECTION 10.9: PERIOD-TO-PERIOD COMPARISON PANEL
          ================================================================= */}
          {showComparison && comparisonRows.length > 0 && (
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>مقایسه تحلیلی دو بازه زمانی (تغییر مطلق و تغییر درصدی)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مقایسه بازه فعلی ({activeDateRange.label}) با بازه قبلی (
                    {formatJalaliCompact(compStartA)} تا {formatJalaliCompact(compEndA)})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparisonRows.map((row) => {
                  const d = row.delta;
                  const abs = d.absoluteChange ?? 0;
                  const isGood = row.higherIsBetter ? abs >= 0 : abs <= 0;
                  return (
                    <div
                      key={row.key}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-2.5 tabular-nums"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {row.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${
                            isGood
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {abs >= 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {formatDeltaBadgeText(d)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="rounded-xl bg-white dark:bg-slate-900 p-2 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">بازه قبلی (اول)</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {d.baseValue !== null
                              ? `${toPersianDigits(d.baseValue)} ${row.unit}`
                              : 'بدون داده'}
                          </span>
                        </div>
                        <div className="rounded-xl bg-white dark:bg-slate-900 p-2 border border-indigo-200/60 dark:border-indigo-900/50">
                          <span className="text-[10px] text-indigo-500 block">بازه فعلی (دوم)</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {d.targetValue !== null
                              ? `${toPersianDigits(d.targetValue)} ${row.unit}`
                              : 'بدون داده'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        تغییر مطلق:{' '}
                        {d.absoluteChange !== null
                          ? `${d.absoluteChange > 0 ? '+' : ''}${toPersianDigits(
                              d.absoluteChange
                            )} ${row.unit}`
                          : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              CHARTS GRID (SECTIONS 10.2, 10.3, 10.4, 10.5, 10.6, 10.7)
          ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 10.2: نمودار زمان مطالعه */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۱. نمودار زمان مطالعه (پیش‌بینی در برابر واقعی)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مجموع: {formatHoursAndMinutesPersian(periodSummary.totalStudyMinutes)} · میانگین:{' '}
                    {formatMinutesPersian(periodSummary.avgDailyStudyMinutes)}
                  </p>
                </div>
                {periodSummary.maxStudyDay && (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    بیشترین: {periodSummary.maxStudyDay.jalaliCompact} (
                    {formatMinutesPersian(periodSummary.maxStudyDay.actualStudyMinutes)})
                  </div>
                )}
              </div>

              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        `${toPersianDigits(Number(val))} دقیقه`,
                        String(name ?? ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="plannedStudyMins"
                      name="زمان پیش‌بینی (دقیقه)"
                      fill="#94a3b8"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="actualStudyMins"
                      name="زمان واقعی مطالعه (دقیقه)"
                      fill="#4f46e5"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 10.3: نمودار تعداد تمرین / تست */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۲. نمودار تعداد تمرین و تست حل‌شده
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مجموع تست‌ها: {toPersianDigits(periodSummary.totalExercisesCount)} · هدف تعیین‌شده:{' '}
                    {toPersianDigits(periodSummary.totalTargetExercisesCount)}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        `${toPersianDigits(Number(val))} تست/تمرین`,
                        String(name ?? ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="targetExercises"
                      name="تست هدف"
                      fill="#cbd5e1"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="actualExercises"
                      name="تست حل‌شده واقعی"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 10.4: نمودار کیفیت یادگیری (۰ تا ۱۰) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۳. نمودار روند کیفیت یادگیری وزنی (مقیاس ۰ تا ۱۰)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    میانگین وزنی کل دوره:{' '}
                    {periodSummary.weightedLearningQuality0To10 !== null
                      ? `${toPersianDigits(periodSummary.weightedLearningQuality0To10)} از ۱۰`
                      : 'بدون ثبت کیفیت'}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [
                        `${toPersianDigits(Number(val))} از ۱۰`,
                        'کیفیت یادگیری وزنی',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="quality0To10"
                      name="کیفیت یادگیری روزانه (۰ تا ۱۰)"
                      stroke="#9333ea"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#9333ea' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 10.5: نمودار امتیاز نهایی روزانه (۰ تا ۱۰۰) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۴. نمودار امتیاز نهایی روزانه (S از ۱۰۰)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    ترکیب ۸۰٪ عملکرد آموزشی (E) و ۲۰٪ کنترل سرگرمی‌ها (C)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums">
                  {periodSummary.bestScoreDay &&
                    periodSummary.bestScoreDay.finalDailyScoreS !== null && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                        بهترین: {periodSummary.bestScoreDay.jalaliCompact} (
                        {toPersianDigits(periodSummary.bestScoreDay.finalDailyScoreS)})
                      </span>
                    )}
                  {periodSummary.weakestScoreDay &&
                    periodSummary.weakestScoreDay.finalDailyScoreS !== null &&
                    periodSummary.weakestScoreDay.dateIso !==
                      periodSummary.bestScoreDay?.dateIso && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                        ضعیف‌ترین: {periodSummary.weakestScoreDay.jalaliCompact} (
                        {toPersianDigits(periodSummary.weakestScoreDay.finalDailyScoreS)})
                      </span>
                    )}
                </div>
              </div>

              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        `${toPersianDigits(Number(val))} از ۱۰۰`,
                        String(name ?? ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="scoreS"
                      name="امتیاز نهایی روز (S)"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="scoreE"
                      name="امتیاز آموزشی (E)"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 10.6: نمودار کنترل فعالیت‌های تفریحی و محدودشونده */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۵. نمودار کنترل فعالیت‌های تفریحی و محدودشونده
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مقایسه زمان مجاز با زمان مصرفی واقعی و میزان تخطی از سقف مجاز (گوشی، بازی، تلویزیون)
                  </p>
                </div>
              </div>

              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        `${toPersianDigits(Number(val))} دقیقه`,
                        String(name ?? ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="allowedRestrictedMins"
                      name="سقف مجاز (پیش‌بینی)"
                      fill="#38bdf8"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="actualRestrictedMins"
                      name="مصرف واقعی سرگرمی"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="overuseRestrictedMins"
                      name="تخطی بیش از حد مجاز"
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 10.7: نمودار توزیع ظرف زمانی روز */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۶. نمودار توزیع ظرف زمانی روز (آموزشی، تفریحی، ضروری و باقی‌مانده)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    نحوه مصرف ظرفیت زمانی روز بین دسته‌های سه‌گانه فعالیت‌ها
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-7 h-60 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          `${toPersianDigits(Number(val))} دقیقه`,
                          String(name ?? ''),
                        ]}
                      />
                      <Bar
                        dataKey="actualStudyMins"
                        stackId="budget"
                        name="آموزشی و مطالعه"
                        fill="#4f46e5"
                      />
                      <Bar
                        dataKey="actualRestrictedMins"
                        stackId="budget"
                        name="تفریحی محدودشونده"
                        fill="#f59e0b"
                      />
                      <Bar
                        dataKey="essentialActualMins"
                        stackId="budget"
                        name="ضروری و استراحت"
                        fill="#10b981"
                      />
                      <Bar
                        dataKey="unallocatedBudgetMins"
                        stackId="budget"
                        name="باقی‌مانده ظرفیت"
                        fill="#cbd5e1"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="sm:col-span-5 space-y-2">
                  {budgetDistributionPie.length > 0 ? (
                    <>
                      <div className="h-36 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={budgetDistributionPie}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={32}
                              outerRadius={56}
                              paddingAngle={3}
                            >
                              {budgetDistributionPie.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val: any, name?: any) => [
                                formatHoursAndMinutesPersian(Number(val)),
                                String(name ?? ''),
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-1 text-[11px] tabular-nums">
                        {budgetDistributionPie.map((item) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: item.color }}
                              />
                              {item.name}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatHoursAndMinutesPersian(item.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-8">
                      هنوز فعالیتی در این بازه ثبت نشده است.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
