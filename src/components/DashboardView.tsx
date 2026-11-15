import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Trophy,
  Sparkles,
  Info,
  Crown,
  Zap,
  ChevronDown,
  Activity,
  ShieldAlert,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import type { DailyPlanItem } from '../types.ts';
import { api } from '../services/api.ts';
import {
  toPersianDigits,
  formatJalaliWeekdaySlash,
  getTodayISO,
  getDailyMotivationalQuoteObject,
  QUOTES_UPDATED_EVENT,
} from '../utils/jalali.ts';
import {
  calculateXpFromPlans,
  calculateUserLevelProgress,
  analyzeXpVelocityAndProgress,
} from '../utils/analyticsEngine.ts';
import {
  WeeklyAnalyticalReport,
  SmartAdvisoryAccordionCard,
} from './WeeklyAnalyticalReport.tsx';
import { PerformanceAnalyticsView } from './PerformanceAnalyticsView.tsx';
import { XpCoinBadge } from './XpCoinBadge.tsx';
import { LevelEmblemBadge, StepSegmentDots } from './LevelIdentityCard.tsx';

export const DashboardView: React.FC = () => {
  const [range] = useState<'today' | 'week' | 'month'>('today');
  const [allTimePlans, setAllTimePlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showXpFormulaGuide, setShowXpFormulaGuide] = useState<boolean>(false);
  const [isXpVelocityOpen, setIsXpVelocityOpen] = useState<boolean>(false);
  const [quoteRevision, setQuoteRevision] = useState<number>(0);

  const todayIso = getTodayISO();

  useEffect(() => {
    const onQuotesUpdated = () => setQuoteRevision((r) => r + 1);
    window.addEventListener(QUOTES_UPDATED_EVENT, onQuotesUpdated);
    return () => window.removeEventListener(QUOTES_UPDATED_EVENT, onQuotesUpdated);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getPlansByRange('2020-01-01', '2099-12-31')
      .then((allPlans) => {
        if (active) {
          setAllTimePlans(allPlans);
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

  const allTimeXpBreakdown = useMemo(
    () => calculateXpFromPlans(allTimePlans),
    [allTimePlans]
  );

  const rangeXpBreakdown = useMemo(() => {
    const filtered = allTimePlans.filter((p) => p.plan_date === todayIso);
    return calculateXpFromPlans(filtered);
  }, [allTimePlans, todayIso]);

  const levelProgress = useMemo(
    () => calculateUserLevelProgress(allTimeXpBreakdown.totalXp),
    [allTimeXpBreakdown.totalXp]
  );

  const xpVelocityAnalysis = useMemo(
    () =>
      analyzeXpVelocityAndProgress({
        allTimePlans,
        todayIso,
        levelProgress,
      }),
    [allTimePlans, todayIso, levelProgress]
  );

  const totalXp = rangeXpBreakdown.totalXp;

  // Deterministic Daily Persian Motivational Sentence (Section 2)
  const dailyQuoteObj = useMemo(
    () => getDailyMotivationalQuoteObject(todayIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayIso, quoteRevision]
  );

  const rangeLabelPersian =
    range === 'today' ? 'امروز' : range === 'week' ? 'این هفته' : 'این ماه';

  return (
    <div className="space-y-6">
      {/* =====================================================================
          CENTERED DASHBOARD HEADER
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700 text-white p-5 sm:p-7 shadow-lg shadow-indigo-500/15">
        <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          {/* Single-line Title & Standard Numeric Shamsi Date (YYYY/MM/DD) */}
          <div className="space-y-2 max-w-full overflow-hidden">
            <h1 className="text-sm sm:text-2xl lg:text-3xl font-black tracking-tight whitespace-nowrap truncate flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
              <span>کارنامه هوشمند و تحلیل پیشرفت تحصیلی</span>
            </h1>

            <div className="text-xs sm:text-sm font-extrabold text-amber-300 tabular-nums whitespace-nowrap">
              امروز، {formatJalaliWeekdaySlash(todayIso)}
            </div>

            {/* Daily Persian Motivational Sentence */}
            <p className="text-[11px] sm:text-sm md:text-base font-extrabold text-white/95 leading-relaxed max-w-3xl mx-auto px-2">
              «{dailyQuoteObj.text}»
            </p>
          </div>

          {/* Compact Single-Line Today XP Row with Coin-Shaped XP Badge */}
          {!loading && (
            <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 px-4 py-2 shadow-xs">
              <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-indigo-50 whitespace-nowrap">
                امتیاز عملکرد {rangeLabelPersian}:
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300 tabular-nums whitespace-nowrap">
                {toPersianDigits(totalXp)}
              </span>
              <XpCoinBadge size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          DEDICATED FULL-WIDTH USER LEVEL (1..13 × 3 STEPS = 39 STAGES),
          XP PROGRESSION & VELOCITY CARD
      ===================================================================== */}
      {(() => {
        const { palette } = levelProgress;
        const isDarkLux = Boolean(palette.isDarkLuxury);

        return (
          <div
            className={`rounded-3xl border bg-gradient-to-l ${palette.cardBgClass} ${palette.cardBorderClass} p-5 sm:p-6 shadow-xs space-y-4 transition-all`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* Right Column: Level Crest (1..13 + Step Badge) & Identity Summary */}
              <div
                className={`lg:col-span-4 flex items-center gap-4 border-b lg:border-b-0 lg:border-l pb-4 lg:pb-0 lg:pl-5 ${
                  isDarkLux
                    ? 'border-white/15'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <LevelEmblemBadge
                  level={levelProgress.level}
                  stepNumber={levelProgress.stepNumber}
                  palette={palette}
                  size="lg"
                />

                <div className="min-w-0 flex flex-col justify-center space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                    <span className={`text-[11px] font-extrabold ${palette.accentTextClass}`}>
                      سطح کل ({toPersianDigits(levelProgress.stageNumber)} از ۳۹)
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${palette.pillBgClass}`}>
                      {levelProgress.stepOrdinalFa}
                    </span>
                  </div>

                  <div
                    className={`flex flex-wrap items-center gap-1.5 text-sm sm:text-base font-black leading-snug ${
                      isDarkLux ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    <span>
                      Level {toPersianDigits(levelProgress.level)} — {levelProgress.stageNameFa}
                    </span>
                    <span
                      dir="ltr"
                      className={`text-xs font-black px-2 py-0.5 rounded-lg ${palette.pillBgClass}`}
                    >
                      {levelProgress.stageNameEn}
                    </span>
                  </div>

                  <div
                    className={`flex flex-wrap items-center gap-2 text-xs font-bold leading-tight ${
                      isDarkLux ? 'text-slate-200' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>
                      عنوان افتخاری:{' '}
                      <strong className={palette.accentTextClass}>
                        {levelProgress.honoraryTitle}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>{levelProgress.stepLabelFa}</span>
                  </div>
                </div>
              </div>

              {/* Center Column: Step Segment Indicator, Progress Bar & Cumulative XP */}
              <div
                className={`lg:col-span-5 space-y-2.5 border-b lg:border-b-0 lg:border-l pb-4 lg:pb-0 lg:pl-5 ${
                  isDarkLux
                    ? 'border-white/15'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div
                    className={`font-extrabold flex items-center gap-1.5 ${
                      isDarkLux ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {levelProgress.isMaxStage ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>بالاترین مرحله سیستم (Black Diamond Star) تکمیل شد</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>
                          پیشرفت تا{' '}
                          <strong dir="ltr" className="inline-block">
                            {levelProgress.nextStageNameEn}
                          </strong>{' '}
                          ({levelProgress.nextStageNameFa})
                        </span>
                      </>
                    )}
                  </div>

                  <StepSegmentDots
                    stepNumber={levelProgress.stepNumber}
                    palette={palette}
                    isDarkSurface={isDarkLux}
                  />
                </div>

                {/* Rich Progress Bar */}
                <div
                  className={`relative h-4 w-full rounded-2xl p-0.5 overflow-hidden shadow-inner ${
                    isDarkLux ? 'bg-white/15' : 'bg-slate-200/90 dark:bg-slate-800'
                  }`}
                >
                  <div
                    className={`h-full rounded-xl bg-gradient-to-l ${palette.barGradientClass} transition-all duration-500 relative overflow-hidden`}
                    style={{
                      width: `${
                        levelProgress.isMaxStage
                          ? 100
                          : Math.max(4, levelProgress.progressPercentage)
                      }%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.28)_50%,rgba(255,255,255,0)_100%)]" />
                  </div>
                </div>

                <div
                  className={`flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold tabular-nums ${
                    isDarkLux ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span>XP کل فعلی:</span>
                    <strong
                      className={`font-black ${
                        isDarkLux ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {toPersianDigits(levelProgress.allTimeXp)}
                    </strong>
                    <XpCoinBadge size="xs" />
                    {!levelProgress.isMaxStage && (
                      <span className="opacity-85">
                        ({toPersianDigits(levelProgress.xpInCurrentLevel)} از{' '}
                        {toPersianDigits(levelProgress.xpRequiredForCurrentStep)} این پله •{' '}
                        {toPersianDigits(levelProgress.progressPercentage)}٪)
                      </span>
                    )}
                  </span>

                  {levelProgress.isMaxStage ? (
                    <span className="inline-flex items-center gap-1 font-black text-emerald-400">
                      <Crown className="w-3.5 h-3.5" />
                      <span>تکمیل ۱۰۰٪ تمام ۳۹ مرحله</span>
                    </span>
                  ) : (
                    <span className={`font-extrabold inline-flex items-center gap-1 ${palette.accentTextClass}`}>
                      <span>{toPersianDigits(levelProgress.xpRemainingToNextLevel)}</span>
                      <XpCoinBadge size="xs" />
                      <span>
                        نیاز تا {levelProgress.nextStageNameEn} (آستانه{' '}
                        {toPersianDigits(levelProgress.nextLevelTargetXp)})
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Left Column: Today's Earned XP & Accordion Toggle */}
              <div className="lg:col-span-3 flex flex-col justify-center">
                <div
                  className={`rounded-2xl border px-3.5 py-3 space-y-2 ${
                    isDarkLux
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-indigo-600/8 dark:bg-indigo-500/10 border-indigo-200/70 dark:border-indigo-800/60'
                  }`}
                >
                  <div
                    className={`text-xs font-extrabold text-center whitespace-nowrap truncate ${
                      isDarkLux ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    XPهای کسب‌شده در {rangeLabelPersian}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div
                      className={`text-base sm:text-lg font-black tabular-nums flex items-center gap-1 shrink-0 ${
                        isDarkLux ? 'text-amber-300' : 'text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      <span>{toPersianDigits(rangeXpBreakdown.totalXp)}</span>
                      <XpCoinBadge size="sm" />
                      <span className="text-xs font-extrabold">امتیاز</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowXpFormulaGuide((prev) => !prev);
                      }}
                      aria-expanded={showXpFormulaGuide}
                      className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition-all cursor-pointer shrink-0 shadow-2xs ${
                        showXpFormulaGuide
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : isDarkLux
                          ? 'bg-slate-900 border-white/20 text-white hover:border-violet-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 hover:border-indigo-400'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">ریز محاسبات XP</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                          showXpFormulaGuide ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable 1/10th Scale XP Formula Guide */}
            {showXpFormulaGuide && (
              <div
                className={`pt-3 border-t text-xs animate-in fade-in duration-150 ${
                  isDarkLux ? 'border-white/15' : 'border-indigo-200/70 dark:border-slate-800'
                }`}
              >
                <div className="rounded-2xl bg-slate-50/95 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-indigo-200/80 dark:border-slate-700/80 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>ریز محاسبه امتیاز عملکرد (XP) در بازه «{rangeLabelPersian}»</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-300 tabular-nums">
                      مجموع: {toPersianDigits(rangeXpBreakdown.totalXp)} XP
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 tabular-nums">
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۱. فعالیت کامل ({toPersianDigits(rangeXpBreakdown.completedCount)} × ۵):
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                        <span>{toPersianDigits(rangeXpBreakdown.completedActivitiesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۲. فعالیت ناقص ({toPersianDigits(rangeXpBreakdown.partialCount)} × ۲٫۵):
                      </span>
                      <span className="font-black text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                        <span>{toPersianDigits(rangeXpBreakdown.partialActivitiesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۳. زمان مطالعه ({toPersianDigits(rangeXpBreakdown.actualStudyMinutes)} دقیقه ÷ ۵۰):
                      </span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                        <span>{toPersianDigits(rangeXpBreakdown.studyMinutesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۴. حل تمرین ({toPersianDigits(rangeXpBreakdown.exercisesCount)} × ۰٫۲):
                      </span>
                      <span className="font-black text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                        <span>{toPersianDigits(rangeXpBreakdown.exercisesXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                    <div className="sm:col-span-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        ۵. پاداش کیفیت یادگیری (نمره کیفیت ۰ تا ۱۰ هر نوبت مطالعه × ۰٫۲):
                      </span>
                      <span className="font-black text-purple-600 dark:text-purple-400 inline-flex items-center gap-1">
                        <span>{toPersianDigits(rangeXpBreakdown.qualityBonusXp)}</span>
                        <XpCoinBadge size="xs" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================
                MASTER COLLAPSIBLE ACCORDION FOR THE 5 XP ANALYSIS CARDS
                («تحلیل روند پیشرفت و رشد تحصیلی»)
            =================================================================== */}
            <div
              className={`pt-3 border-t ${
                isDarkLux ? 'border-white/15' : 'border-slate-200/80 dark:border-slate-800/90'
              }`}
            >
              <div className="rounded-2xl border border-indigo-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white overflow-hidden">
            <button
              type="button"
              onClick={() => setIsXpVelocityOpen((prev) => !prev)}
              aria-expanded={isXpVelocityOpen}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  تحلیل روند پیشرفت و رشد تحصیلی
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  ({xpVelocityAnalysis.trendLabelPersian} •{' '}
                  {xpVelocityAnalysis.estimatedNextLevelTextPersian})
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                  {isXpVelocityOpen ? 'بستن تحلیل' : 'مشاهده ۵ شاخص تحلیلی'}
                </span>
                <div
                  className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ${
                    isXpVelocityOpen ? 'rotate-180' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {isXpVelocityOpen && (
              <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  {/* Card 1: سرعت روزانه کسب XP */}
                  <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>سرعت روزانه کسب XP (۷ روز اخیر)</span>
                      </div>
                      <div className="font-black text-slate-900 dark:text-white tabular-nums flex flex-wrap items-center gap-1">
                        <span>{toPersianDigits(xpVelocityAnalysis.dailyRate7dEffective)}</span>
                        <XpCoinBadge size="xs" />
                        <span>در روز</span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          (۱۴روزه: {toPersianDigits(xpVelocityAnalysis.dailyRate14dCalendar)} | ۳۰روزه:{' '}
                          {toPersianDigits(xpVelocityAnalysis.dailyRate30dCalendar)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: روند سرعت پیشرفت هفتگی */}
                  <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>روند سرعت پیشرفت هفتگی</span>
                      </div>
                      <div
                        className={`font-black tabular-nums truncate ${
                          xpVelocityAnalysis.trendBadgeTone === 'emerald'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : xpVelocityAnalysis.trendBadgeTone === 'amber'
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {xpVelocityAnalysis.trendLabelPersian}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: هم‌سنجی XP با رشد واقعی تحصیلی (E) */}
                  <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                        <span>هم‌سنجی XP با رشد واقعی تحصیلی (E)</span>
                      </div>
                      <div className="font-black text-slate-900 dark:text-white truncate">
                        {xpVelocityAnalysis.avgEducationalScore7d !== null
                          ? `شاخص آموزشی: ${toPersianDigits(xpVelocityAnalysis.avgEducationalScore7d)} از ۱۰۰`
                          : 'در انتظار ثبت مطالعه'}{' '}
                        <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-300">
                          ({xpVelocityAnalysis.activeDays7d > 0
                            ? `${toPersianDigits(xpVelocityAnalysis.activeDays7d)} روز فعال در هفته`
                            : 'بدون روز فعال'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: پیش‌بینی زمان صعود به سطح بعد */}
                  <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>پیش‌بینی زمان صعود به سطح بعد</span>
                      </div>
                      <div className="font-black text-amber-700 dark:text-amber-300 tabular-nums truncate">
                        {xpVelocityAnalysis.estimatedNextLevelTextPersian}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 5: رشد اصیل و هم‌راستای XP با پیشرفت واقعی تحصیلی (و چالش احیای ریتم) */}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 border text-[11px] sm:text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    xpVelocityAnalysis.hasPerformanceDropWarning
                      ? 'bg-amber-50/85 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
                      : 'bg-emerald-50/75 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2 min-w-0">
                    <ShieldAlert
                      className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                        xpVelocityAnalysis.hasPerformanceDropWarning
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    />
                    <div className="leading-relaxed">
                      <strong className="font-black">{xpVelocityAnalysis.alignmentTitlePersian}: </strong>
                      <span className="font-semibold">
                        {xpVelocityAnalysis.warningHeadlinePersian ||
                          xpVelocityAnalysis.alignmentDescriptionPersian}
                      </span>
                    </div>
                  </div>
                  <div className="font-extrabold text-indigo-700 dark:text-indigo-300 sm:text-left shrink-0">
                    {xpVelocityAnalysis.recoveryChallengeTextPersian}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
          </div>
        );
      })()}

      {/* Comprehensive Performance Evaluation & Analytics Section (includes all 7 charts) */}
      <PerformanceAnalyticsView />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, idx) => (
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

      {!loading && !error && (
        <>
          {/* =================================================================
              SMART MULTI-TIMEFRAME ADVISORY ACCORDION CARD (Section 10)
              (Note: The 10-card «جزئیات تکمیلی عملکرد برنامه (امروز)» container
               has been removed per Section 1 while preserving all data & metrics)
          ================================================================= */}
          <SmartAdvisoryAccordionCard allTimePlans={allTimePlans} />

          {/* =================================================================
              WEEKLY ANALYTICAL REPORT (Section 9)
          ================================================================= */}
          <WeeklyAnalyticalReport />
        </>
      )}
    </div>
  );
};
