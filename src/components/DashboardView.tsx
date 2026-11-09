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
} from 'lucide-react';
import type { DashboardMetrics } from '../types.ts';
import { api } from '../services/api.ts';
import {
  toPersianDigits,
  formatMinutesPersian,
  formatJalaliFull,
  getTodayISO,
} from '../utils/jalali.ts';

interface DashboardViewProps {
  onNavigateToPlanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToPlanner }) => {
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const rangeTitle =
    range === 'today'
      ? `امروز (${formatJalaliFull(todayIso)})`
      : range === 'week'
      ? 'این هفته (شنبه تا جمعه)'
      : 'این ماه شمسی';

  const totalXp = metrics
    ? metrics.completedActivitiesCount * 50 +
      metrics.partialActivitiesCount * 25 +
      metrics.totalExercisesSolved * 2
    : 0;

  const studentRankTitle =
    !metrics || metrics.adherencePercentage === 0
      ? 'آماده شروع مأموریت 🚀'
      : metrics.adherencePercentage >= 85
      ? 'قهرمان برنامه‌ریزی پایه هشتم 🏆'
      : metrics.adherencePercentage >= 60
      ? 'پیشگام پرانرژی و باانگیزه ⚡'
      : 'در مسیر پیشرفت و تلاش مستمر 🌱';

  return (
    <div className="space-y-7">
      {/* Vibrant Student Achievement & Timeframe Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700 text-white p-6 sm:p-7 shadow-lg shadow-indigo-500/15">
        <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>کارنامه هوشمند و تحلیل پیشرفت تحصیلی · {rangeTitle}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {studentRankTitle}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
              مقایسه دقیق برنامه پیش‌بینی‌شده با ساعت مطالعه واقعی، تعداد تست‌ها و کیفیت یادگیری در ۱۰ شاخص استاندارد
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* XP & Trophy Summary */}
            {metrics && (
              <div className="flex items-center gap-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/25 flex items-center justify-center text-amber-300">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-indigo-100">امتیاز کسب‌شده (XP)</div>
                  <div className="text-base font-black text-amber-300 tabular-nums flex items-center gap-1">
                    <Flame className="w-4 h-4 text-amber-300" />
                    <span>{toPersianDigits(totalXp)} امتیاز</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Segmented Control */}
            <div className="flex items-center gap-1 p-1.5 bg-slate-950/30 backdrop-blur-md border border-white/15 rounded-2xl">
              <button
                type="button"
                onClick={() => setRange('today')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[38px] ${
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
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[38px] ${
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
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[38px] ${
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
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
            >
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
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
          {/* 10 Mandatory Core Indicators (Section 10 of Mega Prompt) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. مجموع زمان پیش‌بینی‌شده مطالعه */}
            <div className="rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۱. زمان پیش‌بینی مطالعه
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {formatMinutesPersian(metrics.totalPredictedStudyMinutes)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                هدف‌گذاری اولیه دروس
              </div>
            </div>

            {/* 2. مجموع زمان واقعی مطالعه */}
            <div className="rounded-2xl border border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۲. زمان واقعی مطالعه
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatMinutesPersian(metrics.totalActualStudyMinutes)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                ثبت‌شده در گزارش عملکرد
              </div>
            </div>

            {/* 3. اختلاف زمان پیش‌بینی‌شده و واقعی */}
            <div className="rounded-2xl border border-amber-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۳. اختلاف زمان مطالعه
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    metrics.studyTimeVarianceMinutes >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                  }`}
                >
                  {metrics.studyTimeVarianceMinutes >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {metrics.studyTimeVarianceMinutes === 0
                  ? '۰ دقیقه (منطبق)'
                  : metrics.studyTimeVarianceMinutes > 0
                  ? `${toPersianDigits(metrics.studyTimeVarianceMinutes)}+ دقیقه بیشتر`
                  : `${toPersianDigits(Math.abs(metrics.studyTimeVarianceMinutes))} دقیقه کمتر`}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                مقایسه واقعی با پیش‌بینی
              </div>
            </div>

            {/* 4. مجموع تعداد تمرین‌ها و تست‌های حل‌شده */}
            <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۴. تمرین و تست حل‌شده
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-blue-700 dark:text-blue-400 tabular-nums">
                {toPersianDigits(metrics.totalExercisesSolved)} تمرین/تست
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                مجموع مسائل حل‌شده
              </div>
            </div>

            {/* 5. میانگین کیفیت یادگیری */}
            <div className="rounded-2xl border border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۵. میانگین کیفیت یادگیری
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-purple-700 dark:text-purple-400 tabular-nums">
                {metrics.averageLearningQualityLabel}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {metrics.averageLearningQualityScore !== null
                  ? `امتیاز ${toPersianDigits(metrics.averageLearningQualityScore)} از ۴`
                  : 'هنوز کیفیتی ثبت نشده'}
              </div>
            </div>

            {/* 6. تعداد فعالیت‌های برنامه‌ریزی‌شده */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۶. کل فعالیت‌های برنامه
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {toPersianDigits(metrics.totalPlannedActivities)} فعالیت
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                درسی و غیردرسی
              </div>
            </div>

            {/* 7. تعداد فعالیت‌های تکمیل‌شده */}
            <div className="rounded-2xl border border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۷. فعالیت‌های تکمیل‌شده
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {toPersianDigits(metrics.completedActivitiesCount)} مورد کامل
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                انجام‌شده طبق گزارش
              </div>
            </div>

            {/* 8. تعداد فعالیت‌های ناقص یا انجام‌نشده */}
            <div className="rounded-2xl border border-amber-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۸. ناقص یا در انتظار
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
                {toPersianDigits(metrics.incompleteOrPendingCount)} مورد
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {toPersianDigits(metrics.partialActivitiesCount)} ناقص ·{' '}
                {toPersianDigits(metrics.pendingActivitiesCount)} در انتظار
              </div>
            </div>

            {/* 9. میزان پایبندی به برنامه */}
            <div className="rounded-2xl border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۹. میزان پایبندی به برنامه
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                {toPersianDigits(metrics.adherencePercentage)}٪
              </div>
              <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-l from-indigo-600 to-violet-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, metrics.adherencePercentage)}%` }}
                />
              </div>
            </div>

            {/* 10. میزان زمان صرف‌شده برای فعالیت‌های غیردرسی */}
            <div className="rounded-2xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ۱۰. زمان فعالیت غیردرسی
                </span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-xl font-black text-slate-900 dark:text-white tabular-nums">
                {formatMinutesPersian(metrics.nonStudyActualMinutes)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                پیش‌بینی: {formatMinutesPersian(metrics.nonStudyPredictedMinutes)}
              </div>
            </div>
          </div>

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
                    بررسی تعادل مطالعه بین دروس مختلف پایه هشتم و تعداد تمرین‌های حل‌شده
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
                  اولین درس امروزت را برنامه‌ریزی کن تا نمودار پیشرفت هر کتاب اینجا فعال شود!
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
                      <th className="py-3.5 px-6">زمان واقعی و نمودار تحقق</th>
                      <th className="py-3.5 px-6">اختلاف زمان</th>
                      <th className="py-3.5 px-6">تعداد تمرین / تست</th>
                      <th className="py-3.5 px-6">وضعیت تکمیل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {metrics.subjectBreakdown.map((item) => {
                      const diff = item.actualMinutes - item.predictedMinutes;
                      const ratio =
                        item.predictedMinutes > 0
                          ? Math.min(100, Math.round((item.actualMinutes / item.predictedMinutes) * 100))
                          : 0;
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
                                {toPersianDigits(ratio)}٪
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  ratio >= 100
                                    ? 'bg-emerald-500'
                                    : ratio >= 60
                                    ? 'bg-indigo-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${ratio}%` }}
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
