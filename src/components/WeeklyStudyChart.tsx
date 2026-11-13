import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Flame,
  Clock,
  Award,
} from 'lucide-react';
import type { DailyPlanItem } from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  addDaysISO,
  getPersianWeekdayName,
  formatJalaliCompact,
  toPersianDigits,
  formatMinutesPersian,
} from '../utils/jalali.ts';

interface DayStudyChartPoint {
  isoDate: string;
  shortLabel: string;
  fullLabel: string;
  isToday: boolean;
  predictedMinutes: number;
  actualMinutes: number;
  predictedHours: number;
  actualHours: number;
  exercisesCount: number;
  completedTasks: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  unitMode: 'hours' | 'minutes';
}

const CustomStudyTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data: DayStudyChartPoint = payload[0].payload;
  const adherence =
    data.predictedMinutes > 0
      ? Math.round((data.actualMinutes / data.predictedMinutes) * 100)
      : 0;

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-xl text-right min-w-[210px] space-y-2.5"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-xs font-black text-slate-900 dark:text-white">
          {data.fullLabel} {data.isToday ? '(امروز)' : ''}
        </span>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          {toPersianDigits(adherence)}٪ تحقق
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>مطالعه واقعی:</span>
          </span>
          <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {toPersianDigits(data.actualHours.toFixed(1))} ساعت ({toPersianDigits(data.actualMinutes)} دقیقه)
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            <span>هدف پیش‌بینی:</span>
          </span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {toPersianDigits(data.predictedHours.toFixed(1))} ساعت ({toPersianDigits(data.predictedMinutes)} دقیقه)
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">تمرین و تست حل‌شده:</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            {toPersianDigits(data.exercisesCount)} تمرین
          </span>
        </div>
      </div>
    </div>
  );
};

export const WeeklyStudyChart: React.FC = () => {
  const [plans, setPlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartType, setChartType] = useState<'composed' | 'area'>('composed');
  const [unitMode, setUnitMode] = useState<'hours' | 'minutes'>('hours');

  const todayIso = getTodayISO();
  const startIso = useMemo(() => addDaysISO(todayIso, -6), [todayIso]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getPlansByRange(startIso, todayIso)
      .then((rows) => {
        if (active) {
          setPlans(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [startIso, todayIso]);

  const chartData: DayStudyChartPoint[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const offset = -6 + idx;
      const isoDate = addDaysISO(todayIso, offset);
      const weekdayName = getPersianWeekdayName(isoDate);
      const compactDate = formatJalaliCompact(isoDate);

      const dayStudyPlans = plans.filter(
        (p) => p.plan_date === isoDate && Number(p.is_study) === 1
      );

      const predictedMinutes = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.predicted_minutes || 0),
        0
      );
      const actualMinutes = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.actual_minutes || 0),
        0
      );
      const exercisesCount = dayStudyPlans.reduce(
        (sum, p) => sum + Number(p.performance?.exercises_count || 0),
        0
      );
      const completedTasks = dayStudyPlans.filter((p) => p.status === 'completed').length;

      return {
        isoDate,
        shortLabel: isoDate === todayIso ? `امروز (${weekdayName})` : `${weekdayName} ${compactDate}`,
        fullLabel: `${weekdayName} ${compactDate}`,
        isToday: isoDate === todayIso,
        predictedMinutes,
        actualMinutes,
        predictedHours: Number((predictedMinutes / 60).toFixed(2)),
        actualHours: Number((actualMinutes / 60).toFixed(2)),
        exercisesCount,
        completedTasks,
      };
    });
  }, [plans, todayIso]);

  const summary = useMemo(() => {
    const totalActualMins = chartData.reduce((acc, d) => acc + d.actualMinutes, 0);
    const totalPredictedMins = chartData.reduce((acc, d) => acc + d.predictedMinutes, 0);
    const totalExercises = chartData.reduce((acc, d) => acc + d.exercisesCount, 0);
    const dailyAvgMins = Math.round(totalActualMins / 7);

    let bestDay = chartData[0];
    for (const d of chartData) {
      if (d.actualMinutes >= (bestDay?.actualMinutes || 0)) {
        bestDay = d;
      }
    }

    return {
      totalActualMins,
      totalActualHours: (totalActualMins / 60).toFixed(1),
      totalPredictedMins,
      totalExercises,
      dailyAvgMins,
      dailyAvgHours: (dailyAvgMins / 60).toFixed(1),
      bestDay,
    };
  }, [chartData]);

  const actualKey = unitMode === 'hours' ? 'actualHours' : 'actualMinutes';
  const predictedKey = unitMode === 'hours' ? 'predictedHours' : 'predictedMinutes';

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              روند ساعات مطالعه در ۷ روز گذشته
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مقایسه دیداری ساعت مطالعه واقعی روزانه با هدف پیش‌بینی‌شده در یک هفته اخیر
            </p>
          </div>
        </div>

        {/* Unit & Chart Type Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setUnitMode('hours')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                unitMode === 'hours'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              بر حسب ساعت
            </button>
            <button
              type="button"
              onClick={() => setUnitMode('minutes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                unitMode === 'minutes'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              بر حسب دقیقه
            </button>
          </div>

          {/* Chart Style Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setChartType('composed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                chartType === 'composed'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ستونی و مقایسه‌ای
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              موجی (روند پیشرفت)
            </button>
          </div>
        </div>
      </div>

      {/* 3 Quick Highlight Summary Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-800/80 dark:text-emerald-300/80">
              مجموع مطالعه ۷ روز اخیر
            </div>
            <div className="text-base font-black text-emerald-900 dark:text-emerald-300 tabular-nums mt-0.5">
              {toPersianDigits(summary.totalActualHours)} ساعت ({formatMinutesPersian(summary.totalActualMins)})
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-indigo-800/80 dark:text-indigo-300/80">
              میانگین مطالعه روزانه
            </div>
            <div className="text-base font-black text-indigo-900 dark:text-indigo-300 tabular-nums mt-0.5">
              {toPersianDigits(summary.dailyAvgHours)} ساعت در روز ({toPersianDigits(summary.dailyAvgMins)} دقیقه)
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-800/80 dark:text-amber-300/80">
              پرتلاش‌ترین روز هفته
            </div>
            <div className="text-base font-black text-amber-900 dark:text-amber-300 tabular-nums mt-0.5 flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {summary.bestDay ? summary.bestDay.fullLabel : '—'} (
                {toPersianDigits(summary.bestDay ? summary.bestDay.actualHours.toFixed(1) : 0)} ساعت)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Recharts Container */}
      {loading ? (
        <div className="h-72 w-full rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
      ) : (
        <div className="space-y-3">
          {/* Custom Legend */}
          <div className="flex flex-wrap items-center justify-end gap-5 text-xs font-bold px-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              <span>زمان مطالعه واقعی ({unitMode === 'hours' ? 'ساعت' : 'دقیقه'})</span>
            </div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
              <span>هدف پیش‌بینی‌شده ({unitMode === 'hours' ? 'ساعت' : 'دقیقه'})</span>
            </div>
          </div>

          <div dir="ltr" className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'composed' ? (
                <ComposedChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 16 }}
                >
                  <defs>
                    <linearGradient id="actualBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="predAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#94a3b8"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    angle={-90}
                    textAnchor="end"
                    height={68}
                    tickMargin={6}
                    interval={0}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      unitMode === 'hours'
                        ? `${toPersianDigits(val)}h`
                        : `${toPersianDigits(val)}m`
                    }
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip
                    content={<CustomStudyTooltip unitMode={unitMode} />}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={predictedKey}
                    name="هدف پیش‌بینی"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="5 4"
                    fill="url(#predAreaGrad)"
                  />
                  <Bar
                    dataKey={actualKey}
                    name="مطالعه واقعی"
                    fill="url(#actualBarGrad)"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={44}
                  />
                </ComposedChart>
              ) : (
                <AreaChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 16 }}
                >
                  <defs>
                    <linearGradient id="actualWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="predWaveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#94a3b8"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    angle={-90}
                    textAnchor="end"
                    height={68}
                    tickMargin={6}
                    interval={0}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      unitMode === 'hours'
                        ? `${toPersianDigits(val)}h`
                        : `${toPersianDigits(val)}m`
                    }
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <Tooltip content={<CustomStudyTooltip unitMode={unitMode} />} />
                  <Area
                    type="monotone"
                    dataKey={predictedKey}
                    name="هدف پیش‌بینی"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray="5 4"
                    fill="url(#predWaveGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey={actualKey}
                    name="مطالعه واقعی"
                    stroke="#10b981"
                    strokeWidth={3.5}
                    fill="url(#actualWaveGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
