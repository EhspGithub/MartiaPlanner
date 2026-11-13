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
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
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
  formatJalaliWeekdaySlash,
  isoToJalali,
  getJalaliMonthGrid,
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
type StudyChartDisplayMode = 'daily' | 'aggregate';

const SHORT_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function formatDeltaBadgeText(delta: MetricComparisonDelta): string {
  if (delta.baseValue === null || delta.targetValue === null) return 'بدون داده کافی';
  if (delta.isBaseZero) {
    return delta.targetValue === 0 ? '۰٪ تغییر' : 'افزایش از صفر';
  }
  if (delta.percentChange === null) return '—';
  const sign = delta.percentChange > 0 ? '+' : '';
  return `${sign}${toPersianDigits(delta.percentChange)}٪`;
}

interface CompactJalaliCalendarProps {
  selectedIso: string;
  onSelectIso: (iso: string) => void;
}

const CompactJalaliCalendar: React.FC<CompactJalaliCalendarProps> = ({
  selectedIso,
  onSelectIso,
}) => {
  const todayIso = getTodayISO();
  const initialJalali = useMemo(() => isoToJalali(selectedIso || todayIso), [selectedIso, todayIso]);
  const [viewJy, setViewJy] = useState<number>(initialJalali.jy);
  const [viewJm, setViewJm] = useState<number>(initialJalali.jm);

  useEffect(() => {
    const j = isoToJalali(selectedIso || todayIso);
    setViewJy(j.jy);
    setViewJm(j.jm);
  }, [selectedIso, todayIso]);

  const monthGrid = useMemo(() => getJalaliMonthGrid(viewJy, viewJm), [viewJy, viewJm]);

  const handlePrevMonth = () => {
    if (viewJm === 1) {
      setViewJy((y) => y - 1);
      setViewJm(12);
    } else {
      setViewJm((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewJm === 12) {
      setViewJy((y) => y + 1);
      setViewJm(1);
    } else {
      setViewJm((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = isoToJalali(todayIso);
    setViewJy(t.jy);
    setViewJm(t.jm);
    onSelectIso(todayIso);
  };

  return (
    <div className="w-full max-w-xs rounded-2xl border border-indigo-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-3 shadow-2xs space-y-2.5">
      {/* Calendar Header: Month/Year & Navigation */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            title="ماه قبل"
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-black text-slate-900 dark:text-white px-1.5 tabular-nums">
            {monthGrid.monthName} {toPersianDigits(monthGrid.jy)}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            title="ماه بعد"
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoToday}
          className="px-2 py-1 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/70 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200/70 transition-colors cursor-pointer"
        >
          امروز
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {SHORT_WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 py-0.5"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: monthGrid.firstDayWeekdayIndex }).map((_, emptyIdx) => (
          <div key={`empty-${emptyIdx}`} className="h-7" />
        ))}
        {monthGrid.days.map((d) => {
          const isSelected = d.isoDate === selectedIso;
          return (
            <button
              key={d.isoDate}
              type="button"
              onClick={() => onSelectIso(d.isoDate)}
              className={`h-7 rounded-lg text-[11px] font-extrabold tabular-nums flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30 scale-105'
                  : d.isToday
                  ? 'border border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700/70'
              }`}
            >
              {d.persianDay}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1 font-bold">
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>روز انتخابی:</span>
        </span>
        <span className="font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
          {formatJalaliWeekdaySlash(selectedIso)}
        </span>
      </div>
    </div>
  );
};

export const PerformanceAnalyticsView: React.FC = () => {
  const todayIso = getTodayISO();
  const currentWeekDays = useMemo(() => getPersianWeekDays(todayIso), [todayIso]);

  const [filterMode, setFilterMode] = useState<AnalyticsFilterMode>('weekly');
  const [singleDate, setSingleDate] = useState<string>(todayIso);
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [customStart, setCustomStart] = useState<string>(addDaysISO(todayIso, -6));
  const [customEnd, setCustomEnd] = useState<string>(todayIso);

  // Study Time Chart Mode: Daily vs Aggregate (Section 5)
  const [studyChartMode, setStudyChartMode] = useState<StudyChartDisplayMode>('daily');

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

  // Aggregate Study Time Chart Data (Section 5: only 2 bars for the whole selected period)
  const aggregateStudyChartData = useMemo(() => {
    if (!periodSummary) return [];
    return [
      {
        name: 'مجموع مطالعه واقعی',
        minutes: periodSummary.totalStudyMinutes,
        hoursLabel: formatHoursAndMinutesPersian(periodSummary.totalStudyMinutes),
        color: '#4f46e5',
      },
      {
        name: 'مجموع پیش‌بینی‌شده',
        minutes: periodSummary.totalPredictedStudyMinutes,
        hoursLabel: formatHoursAndMinutesPersian(periodSummary.totalPredictedStudyMinutes),
        color: '#94a3b8',
      },
    ];
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

  // Generate recent 45 days list for Custom/Comparison date dropdowns
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

  const isMultiDayPeriod = filterMode !== 'daily' && (periodSummary?.daysCount ?? 0) > 1;

  return (
    <div className="space-y-5">
      {/* =====================================================================
          SECTION 2 & 3: ANALYTICAL REPORTS HEADER, TIMEFRAME SELECTOR & SHAMSI CALENDAR
      ===================================================================== */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>سیستم جامع گزارش و تحلیل عملکرد</span>
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              تحلیل چندبعدی مطالعه، کیفیت یادگیری، ظرف زمانی و کنترل سرگرمی‌ها
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* 3-1: Balanced 4 Timeframe Mode Buttons */}
            <div className="grid grid-cols-4 sm:inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
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
                  className={`px-2.5 sm:px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap text-center ${
                    filterMode === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
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
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer whitespace-nowrap ${
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
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* 3-3: Compact Custom Shamsi Calendar in Daily Mode */}
          {filterMode === 'daily' && (
            <CompactJalaliCalendar selectedIso={singleDate} onSelectIso={setSingleDate} />
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

          {/* 3-2: Clean, Structured Custom Date Range Selector */}
          {filterMode === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  از تاریخ:
                </span>
                <select
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {selectableRecentDates.map((d) => (
                    <option key={d.iso} value={d.iso}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  تا تاریخ:
                </span>
                <select
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
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

          <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums self-end sm:self-center">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="font-bold whitespace-nowrap">از:</span>
                <select
                  value={compStartA}
                  onChange={(e) => setCompStartA(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {selectableRecentDates.map((d) => (
                    <option key={d.iso} value={d.iso}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold whitespace-nowrap">تا:</span>
                <select
                  value={compEndA}
                  onChange={(e) => setCompEndA(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {selectableRecentDates.map((d) => (
                    <option key={d.iso} value={d.iso}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading || !periodSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* =================================================================
              SECTION 4: 6 COMPACT STATISTICAL SUMMARY CARDS WITH TINTED GRADIENTS
          ================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Card 1: مجموع ساعت مطالعه در بازه انتخابی */}
            <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/85 via-white to-indigo-50/40 dark:from-indigo-950/35 dark:via-slate-900 dark:to-indigo-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۱. مجموع ساعت مطالعه در بازه
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-indigo-950 dark:text-white tabular-nums leading-tight">
                {formatHoursAndMinutesPersian(periodSummary.totalStudyMinutes)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                <span>
                  پیش‌بینی: {formatHoursAndMinutesPersian(periodSummary.totalPredictedStudyMinutes)}
                </span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  میانگین: {formatMinutesPersian(periodSummary.avgDailyStudyMinutes)}
                </span>
              </div>
            </div>

            {/* Card 2: مجموع تمرین‌ها و تست‌های حل‌شده */}
            <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/85 via-white to-blue-50/40 dark:from-blue-950/35 dark:via-slate-900 dark:to-blue-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۲. مجموع تمرین‌ها و تست‌های حل‌شده
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-300 tabular-nums leading-tight">
                {toPersianDigits(periodSummary.totalExercisesCount)} تست و تمرین
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                <span>
                  هدف:{' '}
                  {periodSummary.totalTargetExercisesCount > 0
                    ? `${toPersianDigits(periodSummary.totalTargetExercisesCount)} مورد`
                    : 'بدون هدف عددی'}
                </span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
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
            <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/85 via-white to-purple-50/40 dark:from-purple-950/35 dark:via-slate-900 dark:to-purple-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۳. میانگین کیفیت یادگیری (وزنی از ۱۰)
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-purple-800 dark:text-purple-300 tabular-nums leading-tight">
                {periodSummary.weightedLearningQuality0To10 !== null
                  ? `${toPersianDigits(periodSummary.weightedLearningQuality0To10)} از ۱۰`
                  : 'ثبت‌نشده'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                محاسبه‌شده با وزن مدت زمان واقعی هر مطالعه در دوره
              </div>
            </div>

            {/* Card 4: میانگین امتیاز نهایی عملکرد (از ۱۰۰) */}
            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/85 via-white to-emerald-50/40 dark:from-emerald-950/35 dark:via-slate-900 dark:to-emerald-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۴. میانگین امتیاز نهایی عملکرد (از ۱۰۰)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums leading-tight">
                {periodSummary.averageFinalScoreS !== null
                  ? `${toPersianDigits(periodSummary.averageFinalScoreS)} از ۱۰۰`
                  : 'بدون روز امتیازدار'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                بر اساس {toPersianDigits(periodSummary.validScoreDaysCount)} روز دارای عملکرد از{' '}
                {toPersianDigits(periodSummary.daysCount)} روز
              </div>
            </div>

            {/* Card 5: میانگین سهم مطالعه از ظرف زمانی */}
            <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/85 via-white to-sky-50/40 dark:from-sky-950/35 dark:via-slate-900 dark:to-sky-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۵. میانگین سهم مطالعه از ظرف زمانی
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-sky-800 dark:text-sky-300 tabular-nums leading-tight">
                {periodSummary.studyShareOfBudgetPct !== null
                  ? `${toPersianDigits(periodSummary.studyShareOfBudgetPct)}٪`
                  : 'ظرف زمانی ثبت‌نشده'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                بر اساس {toPersianDigits(periodSummary.validBudgetDaysCount)} روز دارای ظرف زمانی (
                {formatHoursAndMinutesPersian(periodSummary.totalBudgetMinutesOnValidDays)})
              </div>
            </div>

            {/* Card 6: میانگین زمان مصرفی برای فعالیت‌های تفریحی */}
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/85 via-white to-amber-50/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-amber-950/20 p-3.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  ۶. میانگین زمان فعالیت‌های تفریحی
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-800 dark:text-amber-300 tabular-nums leading-tight">
                {formatMinutesPersian(periodSummary.avgDailyRestrictedActualMinutes)} در روز
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums leading-tight pt-0.5">
                <span>
                  مجموع: {formatMinutesPersian(periodSummary.totalRestrictedActualMinutes)}
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
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
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
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
              CHARTS GRID (SECTIONS 5, 6, 7, 8)
          ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: زمان مطالعه (پیش‌بینی در برابر واقعی) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۱. زمان مطالعه (پیش‌بینی در برابر واقعی)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مجموع واقعی: {formatHoursAndMinutesPersian(periodSummary.totalStudyMinutes)} ·
                    پیش‌بینی: {formatHoursAndMinutesPersian(periodSummary.totalPredictedStudyMinutes)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Section 5: Segmented Control for Daily vs Aggregate in Multi-Day Modes */}
                  {isMultiDayPeriod && (
                    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => setStudyChartMode('daily')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                          studyChartMode === 'daily'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        نمایش روزانه
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudyChartMode('aggregate')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                          studyChartMode === 'aggregate'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        نمایش تجمیعی
                      </button>
                    </div>
                  )}

                  {periodSummary.maxStudyDay && (!isMultiDayPeriod || studyChartMode === 'daily') && (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      بیشترین: {periodSummary.maxStudyDay.jalaliCompact} (
                      {formatMinutesPersian(periodSummary.maxStudyDay.actualStudyMinutes)})
                    </div>
                  )}
                </div>
              </div>

              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {isMultiDayPeriod && studyChartMode === 'aggregate' ? (
                    <BarChart
                      data={aggregateStudyChartData}
                      margin={{ top: 12, right: 15, left: -10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        angle={-90}
                        textAnchor="end"
                        height={70}
                        tickMargin={6}
                        tick={{ fontSize: 11, fontWeight: 700 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any) => [
                          `${formatHoursAndMinutesPersian(Number(val))} (${toPersianDigits(
                            Number(val)
                          )} دقیقه)`,
                          'مجموع زمان در بازه',
                        ]}
                      />
                      <Bar dataKey="minutes" name="مجموع زمان (دقیقه)" radius={[8, 8, 0, 0]} maxBarSize={64}>
                        {aggregateStudyChartData.map((entry, index) => (
                          <Cell key={`agg-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        angle={-90}
                        textAnchor="end"
                        height={62}
                        tickMargin={6}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          `${toPersianDigits(Number(val))} دقیقه`,
                          String(name ?? ''),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
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
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: تعداد تمرین و تست حل‌شده */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۲. تعداد تمرین و تست حل‌شده
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مجموع تست‌ها: {toPersianDigits(periodSummary.totalExercisesCount)} · هدف تعیین‌شده:{' '}
                    {toPersianDigits(periodSummary.totalTargetExercisesCount)}
                  </p>
                </div>
              </div>

              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      angle={-90}
                      textAnchor="end"
                      height={62}
                      tickMargin={6}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        `${toPersianDigits(Number(val))} تست/تمرین`,
                        String(name ?? ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
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

            {/* Chart 3: روند کیفیت یادگیری وزنی (مقیاس ۰ تا ۱۰) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۳. روند کیفیت یادگیری وزنی (مقیاس ۰ تا ۱۰)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    میانگین وزنی کل دوره:{' '}
                    {periodSummary.weightedLearningQuality0To10 !== null
                      ? `${toPersianDigits(periodSummary.weightedLearningQuality0To10)} از ۱۰`
                      : 'بدون ثبت کیفیت'}
                  </p>
                </div>
              </div>

              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      angle={-90}
                      textAnchor="end"
                      height={62}
                      tickMargin={6}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [
                        `${toPersianDigits(Number(val))} از ۱۰`,
                        'کیفیت یادگیری وزنی',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
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

            {/* Chart 4: امتیاز نهایی روزانه (S از ۱۰۰) */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۴. امتیاز نهایی روزانه (S از ۱۰۰)
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

              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      angle={-90}
                      textAnchor="end"
                      height={62}
                      tickMargin={6}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        `${toPersianDigits(Number(val))} از ۱۰۰`,
                        String(name ?? ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
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

            {/* Chart 5: کنترل فعالیت‌های تفریحی و محدودشونده */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۵. کنترل فعالیت‌های تفریحی و محدودشونده
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    مقایسه زمان مجاز با زمان مصرفی واقعی و میزان تخطی از سقف مجاز (گوشی، بازی، تلویزیون)
                  </p>
                </div>
              </div>

              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      angle={-90}
                      textAnchor="end"
                      height={62}
                      tickMargin={6}
                      interval={0}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        `${toPersianDigits(Number(val))} دقیقه`,
                        String(name ?? ''),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
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

            {/* Chart 6: توزیع ظرف زمانی روز */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    ۶. توزیع ظرف زمانی روز (آموزشی، تفریحی، ضروری و باقی‌مانده)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    نحوه مصرف ظرفیت زمانی روز بین دسته‌های سه‌گانه فعالیت‌ها
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-7 h-68 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        angle={-90}
                        textAnchor="end"
                        height={62}
                        tickMargin={6}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
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
