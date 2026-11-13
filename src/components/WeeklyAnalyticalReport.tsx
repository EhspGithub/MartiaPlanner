import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  FileCheck2,
} from 'lucide-react';
import type { DailyPlanItem, DailyStudyGoalConfig } from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekDays,
  toPersianDigits,
  formatMinutesPersian,
} from '../utils/jalali.ts';

export const WeeklyAnalyticalReport: React.FC = () => {
  const todayIso = getTodayISO();
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [plans, setPlans] = useState<DailyPlanItem[]>([]);
  const [goalsByDay, setGoalsByDay] = useState<DailyStudyGoalConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const weekDays = useMemo(() => getPersianWeekDays(weekRefDate), [weekRefDate]);
  const startDate = weekDays[0].isoDate;
  const endDate = weekDays[6].isoDate;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      api.getPlansByRange(startDate, endDate),
      Promise.all(weekDays.map((d) => api.getDailyGoal(d.isoDate))),
    ])
      .then(([plansData, goalsData]) => {
        if (mounted) {
          setPlans(plansData);
          setGoalsByDay(goalsData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [startDate, endDate, weekDays]);

  const analysis = useMemo(() => {
    const studyPlans = plans.filter((p) => Number(p.is_study) === 1);
    const totalPredictedMinutes = studyPlans.reduce(
      (sum, p) => sum + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
      0
    );
    const totalActualMinutes = studyPlans.reduce(
      (sum, p) => sum + Number(p.performance?.actual_minutes || 0),
      0
    );
    const totalExercises = studyPlans.reduce(
      (sum, p) => sum + Number(p.performance?.exercises_count || 0),
      0
    );
    const completedTasks = plans.filter((p) => p.status === 'completed').length;
    const partialTasks = plans.filter((p) => p.status === 'partial').length;
    const totalTasks = plans.length;

    const studyHoursAchievementPct =
      totalPredictedMinutes > 0
        ? Math.min(100, Math.round((totalActualMinutes / totalPredictedMinutes) * 100))
        : 0;

    const taskFulfillmentPct =
      totalTasks > 0
        ? Math.round(((completedTasks + partialTasks * 0.5) / totalTasks) * 100)
        : 0;

    // Evaluate Daily Numeric Goals fulfillment across the 7 days
    let goalsTotalCount = 0;
    let goalsAchievedCount = 0;
    let goalsWeightedProgressSum = 0;

    for (const dayGoal of goalsByDay) {
      const dayPlans = plans.filter((p) => p.plan_date === dayGoal.goal_date);
      const dayStudyPlans = dayPlans.filter((p) => Number(p.is_study) === 1);

      if (dayPlans.length === 0 && (!dayGoal.custom_goals || dayGoal.custom_goals.length === 0)) {
        continue;
      }

      const actualDayStudyMins = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.actual_minutes || 0),
        0
      );
      const actualDayExercises = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.exercises_count || 0),
        0
      );
      const actualDayCompleted = dayPlans.filter((p) => p.status === 'completed').length;

      // 1. Study minutes goal
      if (dayGoal.target_study_minutes > 0) {
        const pct = Math.min(
          100,
          Math.round((actualDayStudyMins / dayGoal.target_study_minutes) * 100)
        );
        goalsTotalCount += 1;
        if (pct >= 100) goalsAchievedCount += 1;
        goalsWeightedProgressSum += pct;
      }

      // 2. Exercises count goal
      if (dayGoal.target_exercises_count > 0) {
        const pct = Math.min(
          100,
          Math.round((actualDayExercises / dayGoal.target_exercises_count) * 100)
        );
        goalsTotalCount += 1;
        if (pct >= 100) goalsAchievedCount += 1;
        goalsWeightedProgressSum += pct;
      }

      // 3. Completed tasks goal
      if (dayGoal.target_completed_tasks > 0) {
        const pct = Math.min(
          100,
          Math.round((actualDayCompleted / dayGoal.target_completed_tasks) * 100)
        );
        goalsTotalCount += 1;
        if (pct >= 100) goalsAchievedCount += 1;
        goalsWeightedProgressSum += pct;
      }

      // 4. Custom numeric goals
      for (const cg of dayGoal.custom_goals || []) {
        if (cg.targetValue > 0) {
          const pct = Math.min(100, Math.round((cg.currentValue / cg.targetValue) * 100));
          goalsTotalCount += 1;
          if (pct >= 100) goalsAchievedCount += 1;
          goalsWeightedProgressSum += pct;
        }
      }
    }

    const goalsAverageFulfillmentPct =
      goalsTotalCount > 0
        ? Math.round(goalsWeightedProgressSum / goalsTotalCount)
        : studyHoursAchievementPct;

    // Overall composite weekly score
    const overallScorePct = Math.round(
      studyHoursAchievementPct * 0.45 +
        taskFulfillmentPct * 0.3 +
        goalsAverageFulfillmentPct * 0.25
    );

    // Per-day breakdown for best day and consistency
    const dayStats = weekDays.map((d) => {
      const dPlans = studyPlans.filter((p) => p.plan_date === d.isoDate);
      const pred = dPlans.reduce(
        (acc, p) => acc + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
        0
      );
      const actual = dPlans.reduce(
        (acc, p) => acc + Number(p.performance?.actual_minutes || 0),
        0
      );
      const tests = dPlans.reduce(
        (acc, p) => acc + Number(p.performance?.exercises_count || 0),
        0
      );
      return {
        ...d,
        pred,
        actual,
        tests,
        ratio: pred > 0 ? Math.min(100, Math.round((actual / pred) * 100)) : 0,
      };
    });

    const activeStudyDaysCount = dayStats.filter((d) => d.actual > 0).length;
    const bestDay = [...dayStats].sort((a, b) => b.actual - a.actual)[0] || null;

    // Subject analysis: strongest vs needing attention
    const subjectMap = new Map<
      string,
      { name: string; pred: number; actual: number; tests: number; completed: number; total: number }
    >();

    for (const p of studyPlans) {
      const name = p.subject_name_snapshot || 'درس عمومی';
      const entry = subjectMap.get(name) || {
        name,
        pred: 0,
        actual: 0,
        tests: 0,
        completed: 0,
        total: 0,
      };
      entry.pred += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
      entry.actual += Number(p.performance?.actual_minutes || 0);
      entry.tests += Number(p.performance?.exercises_count || 0);
      entry.total += 1;
      if (p.status === 'completed') entry.completed += 1;
      subjectMap.set(name, entry);
    }

    const subjectsList = Array.from(subjectMap.values());
    const topSubject = [...subjectsList].sort((a, b) => b.actual - a.actual)[0] || null;
    const attentionSubject =
      [...subjectsList]
        .filter((s) => s.pred > 0)
        .sort((a, b) => a.actual / a.pred - b.actual / b.pred)[0] || null;

    let statusBadge = 'عملکرد عالی و استاندارد';
    let recommendationText =
      'ریتم مطالعه و تحقق اهداف این هفته بسیار منظم بوده است. همین تعادل بین ساعت مطالعه و حل تست را حفظ کن!';

    if (totalPredictedMinutes === 0 && totalActualMinutes === 0) {
      statusBadge = 'آماده ثبت برنامه هفتگی';
      recommendationText =
        'برای این هفته هنوز فعالیت درسی ثبت نشده است. از بخش برنامه‌ریزی، دروس هفته را وارد کن تا تحلیل هوشمند فعال شود.';
    } else if (overallScorePct >= 85) {
      statusBadge = 'تراز اول و فوق‌العاده 🏆';
      recommendationText =
        'بیش از ۸۵٪ اهداف زمانی و برنامه‌های این هفته محقق شده‌اند! برای هفته آینده می‌توانی ۱۰٪ به هدف تست‌های روزانه اضافه کنی.';
    } else if (overallScorePct >= 60) {
      statusBadge = 'رو به رشد و باانگیزه ⚡';
      recommendationText =
        attentionSubject && attentionSubject.actual < attentionSubject.pred
          ? `پیشرفت کلی هفته خوب است، اما درس «${attentionSubject.name}» کمتر از زمان پیش‌بینی‌شده مطالعه شده؛ پیشنهاد می‌شود در روزهای پایانی هفته یک باکس جبرانی برای آن بگذاری.`
          : 'پیشرفت کلی هفته مناسب است. تلاش کن فعالیت‌های نیمه‌تمام را به وضعیت تکمیل‌شده برسانی.';
    } else {
      statusBadge = 'نیازمند بازنگری در زمان‌بندی 🎯';
      recommendationText =
        'فاصله بین زمان پیش‌بینی‌شده و مطالعه واقعی در این هفته زیاد است. پیشنهاد می‌شود زمان پیش‌بینی هر درس را در باکس‌های کوتاه‌تر (۳۰ تا ۴۵ دقیقه‌ای) تنظیم کنی تا راحت‌تر تکمیل شوند.';
    }

    return {
      totalPredictedMinutes,
      totalActualMinutes,
      varianceMinutes: totalActualMinutes - totalPredictedMinutes,
      dailyAvgActualMinutes: Math.round(totalActualMinutes / 7),
      totalExercises,
      completedTasks,
      totalTasks,
      studyHoursAchievementPct,
      taskFulfillmentPct,
      goalsTotalCount,
      goalsAchievedCount,
      goalsAverageFulfillmentPct,
      overallScorePct,
      activeStudyDaysCount,
      bestDay,
      topSubject,
      attentionSubject,
      dayStats,
      statusBadge,
      recommendationText,
    };
  }, [plans, goalsByDay, weekDays]);

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-l from-indigo-50/70 via-white to-violet-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/25">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                گزارش تحلیلی هفتگی عملکرد مطالعاتی
              </h2>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                · {analysis.statusBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              بازه تحلیلی هفته: {weekDays[0].fullLabel} تا {weekDays[6].fullLabel}
            </p>
          </div>
        </div>

        {/* Week Selector Controls */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setWeekRefDate(addDaysISO(weekRefDate, -7))}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px] whitespace-nowrap"
          >
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span>هفته قبل</span>
          </button>
          <button
            type="button"
            onClick={() => setWeekRefDate(todayIso)}
            className={`rounded-xl px-2.5 sm:px-3.5 py-2 text-[11px] sm:text-xs font-extrabold transition-colors cursor-pointer min-h-[38px] whitespace-nowrap text-center ${
              weekRefDate === todayIso
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
            }`}
          >
            هفته جاری
          </button>
          <button
            type="button"
            onClick={() => setWeekRefDate(addDaysISO(weekRefDate, 7))}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px] whitespace-nowrap"
          >
            <span>هفته بعد</span>
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Top Analytical Pillar Cards: 1) Study Hours Comparison, 2) Goal Fulfillment, 3) Weekly Consistency */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pillar 1: Study Hours Comparison */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>مقایسه ساعات مطالعه هفتگی</span>
                </span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {toPersianDigits(analysis.studyHoursAchievementPct)}٪ تحقق زمان
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 tabular-nums">
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    ساعت مطالعه واقعی
                  </div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatMinutesPersian(analysis.totalActualMinutes)}
                  </div>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    ساعت پیش‌بینی‌شده
                  </div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {formatMinutesPersian(analysis.totalPredictedMinutes)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${analysis.studyHoursAchievementPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    میانگین روزانه: {formatMinutesPersian(analysis.dailyAvgActualMinutes)}
                  </span>
                  <span
                    className={
                      analysis.varianceMinutes >= 0
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : 'font-bold text-amber-600 dark:text-amber-400'
                    }
                  >
                    {analysis.varianceMinutes === 0
                      ? 'دقیقاً منطبق با هدف'
                      : analysis.varianceMinutes > 0
                      ? `${toPersianDigits(analysis.varianceMinutes)}+ دقیقه بیشتر از هدف`
                      : `${toPersianDigits(Math.abs(analysis.varianceMinutes))} دقیقه کمتر از هدف`}
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 2: Goal Fulfillment Rate */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>میزان تحقق اهداف هفتگی</span>
                </span>
                <span className="text-sm font-black text-violet-600 dark:text-violet-400 tabular-nums">
                  امتیاز کل: {toPersianDigits(analysis.overallScorePct)}٪
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 tabular-nums">
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    مأموریت‌های تکمیل‌شده
                  </div>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {toPersianDigits(analysis.completedTasks)} از{' '}
                    {toPersianDigits(analysis.totalTasks)} مورد
                  </div>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    تحقق اهداف عددی روزانه
                  </div>
                  <div className="text-base font-black text-violet-600 dark:text-violet-400 mt-1">
                    {analysis.goalsTotalCount > 0
                      ? `${toPersianDigits(analysis.goalsAchievedCount)} از ${toPersianDigits(
                          analysis.goalsTotalCount
                        )} هدف (${toPersianDigits(analysis.goalsAverageFulfillmentPct)}٪)`
                      : `${toPersianDigits(analysis.taskFulfillmentPct)}٪ پیشرفت`}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-indigo-600 to-violet-500 transition-all duration-500"
                    style={{ width: `${analysis.overallScorePct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>
                    تکمیل مأموریت‌ها: {toPersianDigits(analysis.taskFulfillmentPct)}٪
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    {toPersianDigits(analysis.totalExercises)} تست/تمرین در هفته
                  </span>
                </div>
              </div>
            </div>

            {/* Pillar 3: Strengths, Weaknesses & Study Continuity */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>تداوم و نقاط قوت هفته</span>
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                  {toPersianDigits(analysis.activeStudyDaysCount)} از ۷ روز فعال
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 px-3.5 py-2.5 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>قوی‌ترین درس هفته:</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {analysis.topSubject && analysis.topSubject.actual > 0
                      ? `${analysis.topSubject.name} (${formatMinutesPersian(
                          analysis.topSubject.actual
                        )})`
                      : 'هنوز ثبت نشده'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 px-3.5 py-2.5 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>نیازمند توجه بیشتر:</span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {analysis.attentionSubject
                      ? `${analysis.attentionSubject.name} (${toPersianDigits(
                          Math.round(
                            (analysis.attentionSubject.actual /
                              Math.max(1, analysis.attentionSubject.pred)) *
                              100
                          )
                        )}٪ تحقق)`
                      : 'همه دروس متعادل'}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 px-3.5 py-2.5 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>پربازده‌ترین روز هفته:</span>
                  </span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {analysis.bestDay && analysis.bestDay.actual > 0
                      ? `${analysis.bestDay.weekdayName} (${formatMinutesPersian(
                          analysis.bestDay.actual
                        )})`
                      : 'ثبت نشده'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Mini Fulfillment Strip (Saturday to Friday) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>جدول تحقق روزبه‌روز اهداف زمانی هفته (شنبه تا جمعه)</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                مقایسه مطالعه واقعی هر روز با هدف پیش‌بینی‌شده
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {analysis.dayStats.map((day) => (
                <div
                  key={day.isoDate}
                  className={`rounded-2xl border p-3.5 space-y-2 transition-all tabular-nums ${
                    day.isToday
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {day.weekdayName}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {toPersianDigits(day.ratio)}٪
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {day.dayNumberPersian} {day.monthName}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        day.ratio >= 100
                          ? 'bg-emerald-500'
                          : day.ratio >= 60
                          ? 'bg-indigo-600'
                          : day.actual > 0
                          ? 'bg-amber-500'
                          : 'w-0'
                      }`}
                      style={{ width: `${day.ratio}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    واقعی: {formatMinutesPersian(day.actual)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    هدف: {formatMinutesPersian(day.pred)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Coaching Insight Footer */}
          <div className="rounded-2xl bg-gradient-to-l from-indigo-50 via-violet-50/70 to-amber-50/50 dark:from-indigo-950/40 dark:via-slate-800/60 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/50 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                جمع‌بندی و توصیه مشاوره‌ای این هفته:
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.recommendationText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
