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

  return (
    <div className="space-y-8">
      {/* Header & Timeframe Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            داشبورد تحلیل عملکرد و مطالعه
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            بررسی مقایسه‌ای برنامه پیش‌بینی‌شده و عملکرد واقعی در بازه: {rangeTitle}
          </p>
        </div>

        {/* Interactive Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRange('today')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
              range === 'today'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            امروز
          </button>
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
              range === 'week'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            این هفته
          </button>
          <button
            type="button"
            onClick={() => setRange('month')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
              range === 'month'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            این ماه
          </button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
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
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۱. زمان پیش‌بینی‌شده مطالعه</span>
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatMinutesPersian(metrics.totalPredictedStudyMinutes)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                هدف‌گذاری اولیه دروس
              </div>
            </div>

            {/* 2. مجموع زمان واقعی مطالعه */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۲. زمان واقعی مطالعه</span>
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatMinutesPersian(metrics.totalActualStudyMinutes)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                ثبت‌شده در گزارش عملکرد
              </div>
            </div>

            {/* 3. اختلاف زمان پیش‌بینی‌شده و واقعی */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۳. اختلاف زمان مطالعه</span>
                {metrics.studyTimeVarianceMinutes >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-amber-600 shrink-0" />
                )}
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
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
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۴. تمرین و تست حل‌شده</span>
                <FileCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {toPersianDigits(metrics.totalExercisesSolved)} تمرین/تست
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                مجموع مسائل حل‌شده
              </div>
            </div>

            {/* 5. میانگین کیفیت یادگیری */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۵. میانگین کیفیت یادگیری</span>
                <Award className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {metrics.averageLearningQualityLabel}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {metrics.averageLearningQualityScore !== null
                  ? `امتیاز ${toPersianDigits(metrics.averageLearningQualityScore)} از ۴`
                  : 'هنوز کیفیتی ثبت نشده'}
              </div>
            </div>

            {/* 6. تعداد فعالیت‌های برنامه‌ریزی‌شده */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۶. کل فعالیت‌های برنامه‌ریزی</span>
                <Layers className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {toPersianDigits(metrics.totalPlannedActivities)} فعالیت
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                درسی و غیردرسی
              </div>
            </div>

            {/* 7. تعداد فعالیت‌های تکمیل‌شده */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۷. فعالیت‌های تکمیل‌شده</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {toPersianDigits(metrics.completedActivitiesCount)} مورد کامل
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                انجام‌شده طبق گزارش
              </div>
            </div>

            {/* 8. تعداد فعالیت‌های ناقص یا انجام‌نشده */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۸. ناقص یا انجام‌نشده</span>
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {toPersianDigits(metrics.incompleteOrPendingCount)} مورد
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {toPersianDigits(metrics.partialActivitiesCount)} ناقص ·{' '}
                {toPersianDigits(metrics.pendingActivitiesCount)} در انتظار
              </div>
            </div>

            {/* 9. میزان پایبندی به برنامه */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۹. میزان پایبندی به برنامه</span>
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {toPersianDigits(metrics.adherencePercentage)}٪
              </div>
              <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, metrics.adherencePercentage)}%` }}
                />
              </div>
            </div>

            {/* 10. میزان زمان صرف‌شده برای فعالیت‌های غیردرسی */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>۱۰. زمان فعالیت‌های غیردرسی</span>
                <Coffee className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              </div>
              <div className="mt-3 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {formatMinutesPersian(metrics.nonStudyActualMinutes)}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                پیش‌بینی: {formatMinutesPersian(metrics.nonStudyPredictedMinutes)}
              </div>
            </div>
          </div>

          {/* Subject-by-Subject Comparison Table (Section 8 & 10) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  جدول تفکیکی مقایسه زمان پیش‌بینی‌شده و واقعی دروس
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تحلیل انحراف زمانی و تعداد تمرین‌های حل‌شده به تفکیک هر درس
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToPlanner}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت برنامه جدید</span>
              </button>
            </div>

            {metrics.subjectBreakdown.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  در این بازه زمانی هنوز فعالیت درسی ثبت نشده است.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToPlanner}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن اولین فعالیت درسی</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-6">نام درس</th>
                      <th className="py-3.5 px-6">زمان پیش‌بینی‌شده</th>
                      <th className="py-3.5 px-6">زمان واقعی</th>
                      <th className="py-3.5 px-6">اختلاف زمان</th>
                      <th className="py-3.5 px-6">تعداد تمرین / تست</th>
                      <th className="py-3.5 px-6">وضعیت تکمیل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {metrics.subjectBreakdown.map((item) => {
                      const diff = item.actualMinutes - item.predictedMinutes;
                      return (
                        <tr
                          key={item.subjectName}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white">
                            {item.subjectName}
                          </td>
                          <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 tabular-nums">
                            {formatMinutesPersian(item.predictedMinutes)}
                          </td>
                          <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-white tabular-nums">
                            {formatMinutesPersian(item.actualMinutes)}
                          </td>
                          <td className="py-3.5 px-6 tabular-nums">
                            {item.actualMinutes === 0 ? (
                              <span className="text-xs text-slate-400">ثبت‌نشده</span>
                            ) : diff === 0 ? (
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                منطبق با پیش‌بینی
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {toPersianDigits(diff)} دقیقه بیشتر از پیش‌بینی
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                {toPersianDigits(Math.abs(diff))} دقیقه کمتر از پیش‌بینی
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 tabular-nums">
                            {toPersianDigits(item.exercisesCount)} مورد
                          </td>
                          <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 tabular-nums">
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
