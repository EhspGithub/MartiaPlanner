import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  BookOpen,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ListOrdered,
  FileCheck2,
  Award,
  X,
  Trophy,
  Flame,
  Target,
  Sparkles,
  Calculator,
  Atom,
  Languages,
  Globe2,
  Compass,
  Cpu,
  Smartphone,
  Tv,
  Gamepad2,
  Dumbbell,
  Bell,
} from 'lucide-react';
import type {
  ActivityCategory,
  StudyActivityType,
  PriorityLevel,
  Subject,
  DailyPlanItem,
  LearningQuality,
} from '../types.ts';
import { api } from '../services/api.ts';
import {
  getTodayISO,
  getTomorrowISO,
  addDaysISO,
  formatJalaliFull,
  formatJalaliCompact,
  getPersianWeekDays,
  toPersianDigits,
  formatMinutesPersian,
} from '../utils/jalali.ts';
import { PerformanceModal } from './PerformanceModal.tsx';
import { StudyReminderManager } from './StudyReminderManager.tsx';

interface PlannerViewProps {
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  subjects: Subject[];
  onDataMutated: () => void;
}

const QUALITY_LABELS: Record<string, string> = {
  excellent: 'تسلط عالی',
  good: 'یادگیری خوب',
  average: 'متوسط',
  weak: 'نیازمند مرور',
};

function getSubjectVisualTheme(subjectName: string | null, categoryTitle: string, isStudy: boolean) {
  if (!isStudy) {
    if (categoryTitle.includes('گوشی')) {
      return {
        icon: Smartphone,
        iconBg: 'bg-amber-500 text-white shadow-sm shadow-amber-500/30',
        tintBg: 'bg-amber-50/50 dark:bg-amber-950/20',
        accentText: 'text-amber-600 dark:text-amber-400',
      };
    }
    if (categoryTitle.includes('تلویزیون')) {
      return {
        icon: Tv,
        iconBg: 'bg-sky-500 text-white shadow-sm shadow-sky-500/30',
        tintBg: 'bg-sky-50/50 dark:bg-sky-950/20',
        accentText: 'text-sky-600 dark:text-sky-400',
      };
    }
    if (categoryTitle.includes('بازی')) {
      return {
        icon: Gamepad2,
        iconBg: 'bg-purple-500 text-white shadow-sm shadow-purple-500/30',
        tintBg: 'bg-purple-50/50 dark:bg-purple-950/20',
        accentText: 'text-purple-600 dark:text-purple-400',
      };
    }
    if (categoryTitle.includes('ورزش')) {
      return {
        icon: Dumbbell,
        iconBg: 'bg-teal-500 text-white shadow-sm shadow-teal-500/30',
        tintBg: 'bg-teal-50/50 dark:bg-teal-950/20',
        accentText: 'text-teal-600 dark:text-teal-400',
      };
    }
    return {
      icon: Coffee,
      iconBg: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30',
      tintBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  const name = subjectName || '';
  if (name.includes('ریاضی')) {
    return {
      icon: Calculator,
      iconBg: 'bg-blue-600 text-white shadow-sm shadow-blue-600/30',
      tintBg: 'bg-blue-50/40 dark:bg-blue-950/20',
      accentText: 'text-blue-600 dark:text-blue-400',
    };
  }
  if (name.includes('علوم')) {
    return {
      icon: Atom,
      iconBg: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30',
      tintBg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (name.includes('انگلیسی') || name.includes('عربی')) {
    return {
      icon: Languages,
      iconBg: 'bg-purple-600 text-white shadow-sm shadow-purple-600/30',
      tintBg: 'bg-purple-50/40 dark:bg-purple-950/20',
      accentText: 'text-purple-600 dark:text-purple-400',
    };
  }
  if (name.includes('اجتماعی')) {
    return {
      icon: Globe2,
      iconBg: 'bg-teal-600 text-white shadow-sm shadow-teal-600/30',
      tintBg: 'bg-teal-50/40 dark:bg-teal-950/20',
      accentText: 'text-teal-600 dark:text-teal-400',
    };
  }
  if (name.includes('فناوری')) {
    return {
      icon: Cpu,
      iconBg: 'bg-slate-700 text-white shadow-sm shadow-slate-700/30',
      tintBg: 'bg-slate-100/60 dark:bg-slate-800/40',
      accentText: 'text-slate-700 dark:text-slate-300',
    };
  }
  if (name.includes('قرآن') || name.includes('آسمان')) {
    return {
      icon: Compass,
      iconBg: 'bg-sky-600 text-white shadow-sm shadow-sky-600/30',
      tintBg: 'bg-sky-50/40 dark:bg-sky-950/20',
      accentText: 'text-sky-600 dark:text-sky-400',
    };
  }
  return {
    icon: BookOpen,
    iconBg: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30',
    tintBg: 'bg-indigo-50/40 dark:bg-indigo-950/20',
    accentText: 'text-indigo-600 dark:text-indigo-400',
  };
}

function getPriorityColorText(code: string): string {
  if (code.startsWith('A')) return 'text-rose-600 dark:text-rose-400 font-extrabold';
  if (code.startsWith('B')) return 'text-amber-600 dark:text-amber-400 font-bold';
  return 'text-sky-600 dark:text-sky-400 font-semibold';
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  categories,
  studyTypes,
  priorities,
  subjects,
  onDataMutated,
}) => {
  const todayIso = getTodayISO();
  const tomorrowIso = getTomorrowISO();

  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'weekly'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);
  const [sortBy, setSortBy] = useState<'priority' | 'custom'>('priority');

  const [dailyPlans, setDailyPlans] = useState<DailyPlanItem[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showPlanForm, setShowPlanForm] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<DailyPlanItem | null>(null);

  const defaultStudyCategory = categories.find((c) => Number(c.is_study) === 1) || categories[0];
  const [formCategoryId, setFormCategoryId] = useState<string>(defaultStudyCategory?.id || '');
  const [formSubjectId, setFormSubjectId] = useState<string>(subjects[0]?.id || '');
  const [formUnitId, setFormUnitId] = useState<string>(subjects[0]?.units[0]?.id || '');
  const [formStudyTypeId, setFormStudyTypeId] = useState<string>(studyTypes[0]?.id || '');
  const [formPriorityCode, setFormPriorityCode] = useState<string>('A1');
  const [formPredictedMinutes, setFormPredictedMinutes] = useState<string>('60');
  const [formReminderTime, setFormReminderTime] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const [activePerformancePlan, setActivePerformancePlan] = useState<DailyPlanItem | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<DailyPlanItem | null>(null);

  useEffect(() => {
    if (activeTab === 'today') {
      setSelectedDate(todayIso);
    } else if (activeTab === 'tomorrow') {
      setSelectedDate(tomorrowIso);
    }
  }, [activeTab, todayIso, tomorrowIso]);

  const selectedSubjectObj = useMemo(
    () => subjects.find((s) => s.id === formSubjectId) || null,
    [subjects, formSubjectId]
  );

  useEffect(() => {
    if (!editingPlan && selectedSubjectObj) {
      const firstUnit = selectedSubjectObj.units[0];
      setFormUnitId(firstUnit ? firstUnit.id : '');
    }
  }, [formSubjectId, selectedSubjectObj, editingPlan]);

  const loadDailyPlans = async (dateStr: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPlansByDate(dateStr);
      setDailyPlans(data);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری برنامه روزانه');
    } finally {
      setLoading(false);
    }
  };

  const weekDays = useMemo(() => getPersianWeekDays(weekRefDate), [weekRefDate]);

  const loadWeeklyPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const start = weekDays[0].isoDate;
      const end = weekDays[6].isoDate;
      const data = await api.getPlansByRange(start, end);
      setWeeklyPlans(data);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری برنامه هفتگی');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'weekly') {
      loadWeeklyPlans();
    } else {
      loadDailyPlans(selectedDate);
    }
  }, [activeTab, selectedDate, weekRefDate]);

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.id === formCategoryId) || null,
    [categories, formCategoryId]
  );
  const isFormStudyActivity = Number(selectedCategoryObj?.is_study) === 1;

  const openCreateForm = (targetDate?: string) => {
    if (targetDate && activeTab === 'weekly') {
      setSelectedDate(targetDate);
    }
    setEditingPlan(null);
    const studyCat = categories.find((c) => Number(c.is_study) === 1) || categories[0];
    setFormCategoryId(studyCat?.id || '');
    const firstSubj = subjects[0];
    setFormSubjectId(firstSubj?.id || '');
    setFormUnitId(firstSubj?.units[0]?.id || '');
    setFormStudyTypeId(studyTypes[0]?.id || '');
    setFormPriorityCode('A1');
    setFormPredictedMinutes('60');
    setFormReminderTime('17:30');
    setFormDescription('');
    setFormError(null);
    setShowPlanForm(true);
  };

  const openEditForm = (plan: DailyPlanItem) => {
    setEditingPlan(plan);
    setFormCategoryId(plan.category_id);
    if (Number(plan.is_study) === 1) {
      const subj = subjects.find((s) => s.id === plan.subject_id) || subjects[0];
      setFormSubjectId(subj?.id || '');
      setFormUnitId(plan.unit_id || subj?.units[0]?.id || '');
      setFormStudyTypeId(plan.study_type_id || studyTypes[0]?.id || '');
    }
    setFormPriorityCode(plan.priority_code);
    setFormPredictedMinutes(String(plan.predicted_minutes));
    setFormReminderTime(plan.reminder_time || '');
    setFormDescription(plan.description || '');
    setFormError(null);
    setShowPlanForm(true);
  };

  const handlePlanFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const mins = Number(formPredictedMinutes);
    if (!mins || mins <= 0 || mins > 720) {
      setFormError('زمان پیش‌بینی‌شده باید عددی بین ۱ تا ۷۲۰ دقیقه باشد.');
      return;
    }

    if (isFormStudyActivity && (!formSubjectId || !formUnitId || !formStudyTypeId)) {
      setFormError('لطفاً نام درس، فصل/درس و نوع فعالیت درسی را انتخاب کنید.');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, {
          category_id: formCategoryId,
          subject_id: isFormStudyActivity ? formSubjectId : null,
          unit_id: isFormStudyActivity ? formUnitId : null,
          study_type_id: isFormStudyActivity ? formStudyTypeId : null,
          priority_code: formPriorityCode,
          predicted_minutes: mins,
          reminder_time: formReminderTime.trim() || null,
          description: formDescription.trim(),
        });
      } else {
        await api.createPlan({
          plan_date: selectedDate,
          category_id: formCategoryId,
          subject_id: isFormStudyActivity ? formSubjectId : null,
          unit_id: isFormStudyActivity ? formUnitId : null,
          study_type_id: isFormStudyActivity ? formStudyTypeId : null,
          priority_code: formPriorityCode,
          predicted_minutes: mins,
          reminder_time: formReminderTime.trim() || null,
          description: formDescription.trim(),
        });
      }

      setShowPlanForm(false);
      setEditingPlan(null);
      if (activeTab === 'weekly') {
        await loadWeeklyPlans();
      } else {
        await loadDailyPlans(selectedDate);
      }
      onDataMutated();
    } catch (err: any) {
      setFormError(err.message || 'خطا در ذخیره فعالیت');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlan) return;
    try {
      await api.deletePlan(deletingPlan.id);
      setDeletingPlan(null);
      if (activeTab === 'weekly') {
        await loadWeeklyPlans();
      } else {
        await loadDailyPlans(selectedDate);
      }
      onDataMutated();
    } catch (err: any) {
      setError(err.message || 'خطا در حذف فعالیت');
    }
  };

  const handleSavePerformance = async (
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: LearningQuality | null;
      completion_status: 'completed' | 'partial';
      notes: string;
    }
  ) => {
    await api.savePerformance(planId, payload);
    if (activeTab === 'weekly') {
      await loadWeeklyPlans();
    } else {
      await loadDailyPlans(selectedDate);
    }
    onDataMutated();
  };

  const handleResetPerformance = async (planId: string) => {
    await api.deletePerformance(planId);
    if (activeTab === 'weekly') {
      await loadWeeklyPlans();
    } else {
      await loadDailyPlans(selectedDate);
    }
    onDataMutated();
  };

  const sortedDailyPlans = useMemo(() => {
    const copy = [...dailyPlans];
    if (sortBy === 'priority') {
      return copy.sort((a, b) => {
        const rankA = a.priority_rank ?? 99;
        const rankB = b.priority_rank ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.custom_sort_order - b.custom_sort_order;
      });
    }
    return copy.sort((a, b) => a.custom_sort_order - b.custom_sort_order);
  }, [dailyPlans, sortBy]);

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const list = [...sortedDailyPlans];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setSortBy('custom');
    setDailyPlans(list.map((item, idx) => ({ ...item, custom_sort_order: idx + 1 })));
    await api.reorderPlans(list.map((item) => item.id));
  };

  // Gamified student progress calculations for the selected day
  const daySummary = useMemo(() => {
    let predTotal = 0;
    let actualTotal = 0;
    let completedCount = 0;
    let partialCount = 0;
    let totalExercises = 0;
    for (const p of dailyPlans) {
      predTotal += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
      if (p.performance) {
        actualTotal += Number(p.performance.actual_minutes || 0);
        totalExercises += Number(p.performance.exercises_count || 0);
      }
      if (p.status === 'completed') completedCount++;
      else if (p.status === 'partial') partialCount++;
    }
    const totalCount = dailyPlans.length;
    const progressPercent =
      totalCount > 0 ? Math.round(((completedCount + partialCount * 0.5) / totalCount) * 100) : 0;
    const xpEarned = completedCount * 50 + partialCount * 25 + totalExercises * 2;
    return {
      predTotal,
      actualTotal,
      completedCount,
      partialCount,
      totalCount,
      totalExercises,
      progressPercent,
      xpEarned,
    };
  }, [dailyPlans]);

  // SVG Ring calculation
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset =
    ringCircumference - (daySummary.progressPercent / 100) * ringCircumference;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          ENERGETIC STUDENT MISSION HERO BANNER
      ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-7 shadow-lg shadow-indigo-950/15">
        {/* Subtle decorative geometric light circles */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 w-64 h-64 rounded-full bg-emerald-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Right Side: Greeting, Date & Motivational Status */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>ایستگاه برنامه‌ریزی هوشمند دانش‌آموز</span>
              <span aria-hidden="true">·</span>
              <span>{formatJalaliFull(selectedDate)}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {activeTab === 'today' && selectedDate === todayIso
                ? 'مأموریت‌های مطالعه امروزت رو با قدرت پیش ببر!'
                : activeTab === 'tomorrow' && selectedDate === tomorrowIso
                ? 'برنامه‌ریزی هوشمندانه برای موفقیت فردا'
                : activeTab === 'weekly'
                ? 'نمای کلی برنامه هفتگی (شنبه تا جمعه)'
                : `برنامه و گزارش عملکرد ${formatJalaliFull(selectedDate)}`}
            </h1>

            {/* Quick Student Achievement Metrics */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-indigo-100 tabular-nums">
              <span className="flex items-center gap-1.5 font-semibold">
                <Trophy className="w-4 h-4 text-amber-300" />
                امتیاز تلاش این روز: {toPersianDigits(daySummary.xpEarned)} XP
              </span>
              <span aria-hidden="true" className="text-indigo-400">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-300" />
                {toPersianDigits(daySummary.completedCount)} از {toPersianDigits(daySummary.totalCount)} مأموریت تکمیل‌شده
              </span>
              <span aria-hidden="true" className="text-indigo-400">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-300" />
                {toPersianDigits(daySummary.totalExercises)} تست و تمرین حل‌شده
              </span>
            </div>
          </div>

          {/* Left Side: Progress Ring + Primary Add CTA */}
          <div className="flex flex-wrap items-center gap-5 shrink-0">
            <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={ringRadius}
                    fill="transparent"
                    stroke="#34d399"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringStrokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute text-sm font-extrabold text-white tabular-nums">
                  {toPersianDigits(daySummary.progressPercent)}٪
                </span>
              </div>
              <div className="space-y-1 text-xs tabular-nums">
                <div className="font-bold text-white">پیشرفت برنامه روز</div>
                <div className="text-indigo-200">
                  هدف: {formatMinutesPersian(daySummary.predTotal)}
                </div>
                <div className="text-emerald-300 font-semibold">
                  انجام‌شده: {formatMinutesPersian(daySummary.actualTotal)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openCreateForm()}
              className="flex items-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-3.5 text-xs font-extrabold shadow-lg shadow-amber-400/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[48px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>ثبت فعالیت جدید</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs inside Hero Footer */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/35 backdrop-blur-md rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                activeTab === 'today' && selectedDate === todayIso
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              برنامه امروز ({formatJalaliCompact(todayIso)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tomorrow')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                activeTab === 'tomorrow' && selectedDate === tomorrowIso
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              برنامه فردا ({formatJalaliCompact(tomorrowIso)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                activeTab === 'weekly'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              نمای هفتگی (۷ روزه)
            </button>
          </div>

          {activeTab !== 'weekly' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[38px]"
              >
                <ChevronRight className="w-4 h-4" />
                <span>روز قبل</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[38px]"
              >
                <span>روز بعد</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          DAILY VIEW (برنامه امروز / برنامه فردا / روز انتخابی)
      ===================================================================== */}
      {activeTab !== 'weekly' && (
        <div className="space-y-5">
          {/* Smart Study Reminder Status & Instant Test Strip */}
          <StudyReminderManager
            plans={dailyPlans}
            selectedDate={selectedDate}
            onOpenPlan={(plan) => setActivePerformancePlan(plan)}
          />

          {/* Sorting & Filter Control Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">
                لیست کارت‌های فعالیت ({toPersianDigits(sortedDailyPlans.length)} مورد)
              </span>
              <span aria-hidden="true">·</span>
              <span>روی هر کارت کلیک کن تا عملکرد واقعی و تعداد تست‌هات رو ثبت کنی!</span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5" />
                چینش کارت‌ها:
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSortBy('priority')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    sortBy === 'priority'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  بر اساس اولویت (A1 ← C3)
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('custom')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    sortBy === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ترتیب دلخواه من
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse"
                />
              ))}
            </div>
          ) : sortedDailyPlans.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                هنوز مأموریتی برای {formatJalaliFull(selectedDate)} ثبت نکردی!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                درس‌هایی که امروز در مدرسه تدریس شدن، تکالیف، امتحانات یا حتی زمان استراحت و بازی خودت رو با دکمه زیر اضافه کن.
              </p>
              <button
                type="button"
                onClick={() => openCreateForm()}
                className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت اولین فعالیت این روز</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sortedDailyPlans.map((plan, index) => {
                const isStudy = Number(plan.is_study) === 1;
                const predMins = plan.initial_predicted_minutes || plan.predicted_minutes;
                const actualMins = plan.performance?.actual_minutes;
                const hasPerf = Boolean(plan.performance);
                const diff = hasPerf && actualMins !== undefined ? actualMins - predMins : null;

                const theme = getSubjectVisualTheme(
                  plan.subject_name_snapshot,
                  plan.category_title_snapshot,
                  isStudy
                );
                const ThemeIcon = theme.icon;

                const timeProgressRatio =
                  hasPerf && actualMins !== undefined && predMins > 0
                    ? Math.min(100, Math.round((actualMins / predMins) * 100))
                    : 0;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setActivePerformancePlan(plan)}
                    className="group rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 hover:border-indigo-400 dark:hover:border-indigo-600 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      {/* Card Top Row: Colorful Subject Icon + Title + Action Controls */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${theme.iconBg}`}
                          >
                            <ThemeIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                                {isStudy
                                  ? `${plan.subject_name_snapshot}`
                                  : plan.category_title_snapshot}
                              </h3>
                              <span
                                className={`text-xs tabular-nums ${getPriorityColorText(
                                  plan.priority_code
                                )}`}
                              >
                                · {plan.priority_code}
                              </span>
                            </div>

                            {/* Clean Unboxed Metadata Line (Section 7.1: فارسی | درس دوم | تکلیف | 90 دقیقه) */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                              {isStudy && plan.unit_title_snapshot && (
                                <>
                                  <span className={`font-bold ${theme.accentText}`}>
                                    {plan.unit_title_snapshot}
                                  </span>
                                  <span aria-hidden="true">|</span>
                                </>
                              )}
                              {isStudy && plan.study_type_title_snapshot && (
                                <>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {plan.study_type_title_snapshot}
                                  </span>
                                  <span aria-hidden="true">|</span>
                                </>
                              )}
                              <span>پیش‌بینی: {formatMinutesPersian(predMins)}</span>
                              {plan.reminder_time && (
                                <>
                                  <span aria-hidden="true">|</span>
                                  <span className="inline-flex items-center gap-1 font-extrabold text-indigo-600 dark:text-indigo-400">
                                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                                    یادآور: ساعت {toPersianDigits(plan.reminder_time)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Reorder / Edit / Delete Controls */}
                        <div
                          className="flex items-center gap-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 cursor-pointer"
                            title="جابه‌جایی به بالا"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, 'down')}
                            disabled={index === sortedDailyPlans.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 cursor-pointer"
                            title="جابه‌جایی به پایین"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(plan)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            title="ویرایش برنامه"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPlan(plan)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                            title="حذف فعالیت"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {plan.description && (
                        <div
                          className={`mt-3.5 rounded-2xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed ${theme.tintBg}`}
                        >
                          {plan.description}
                        </div>
                      )}
                    </div>

                    {/* Visual Dual Time Comparison Bar & Status Footer */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      {/* Visual Progress Bar comparing Actual vs Predicted */}
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            !hasPerf
                              ? 'w-0'
                              : plan.status === 'completed'
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${hasPerf ? Math.max(15, timeProgressRatio) : 0}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {!hasPerf ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span>آماده انجام (هنوز عملکردی ثبت نشده)</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                            {plan.status === 'completed' ? (
                              <span className="flex items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                تکمیل شد (+۵۰ XP)
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-extrabold text-amber-600 dark:text-amber-400">
                                <AlertCircle className="w-4 h-4" />
                                ناقص / نیمه‌تمام (+۲۵ XP)
                              </span>
                            )}
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                              ·
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-bold">
                              واقعی: {formatMinutesPersian(actualMins || 0)}
                            </span>
                            {diff !== null && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700"
                                >
                                  ·
                                </span>
                                <span
                                  className={
                                    diff === 0
                                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                      : diff > 0
                                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                      : 'text-indigo-600 dark:text-indigo-400 font-semibold'
                                  }
                                >
                                  {diff === 0
                                    ? 'دقیقاً طبق هدف'
                                    : diff > 0
                                    ? `${toPersianDigits(diff)}+ دقیقه بیشتر`
                                    : `${toPersianDigits(Math.abs(diff))}- دقیقه سریع‌تر`}
                                </span>
                              </>
                            )}
                            {isStudy && plan.performance?.exercises_count !== null && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700"
                                >
                                  ·
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                                  <FileCheck2 className="w-3.5 h-3.5 text-blue-500" />
                                  {toPersianDigits(plan.performance?.exercises_count)} تست/تمرین
                                </span>
                              </>
                            )}
                            {isStudy && plan.performance?.learning_quality && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700"
                                >
                                  ·
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                                  <Award className="w-3.5 h-3.5 text-purple-500" />
                                  {QUALITY_LABELS[plan.performance.learning_quality]}
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-[-2px] transition-transform whitespace-nowrap">
                          {hasPerf ? 'ویرایش گزارش ←' : 'ثبت عملکرد ←'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          WEEKLY VIEW (نمای هفتگی ۷ روزه - شنبه تا جمعه)
      ===================================================================== */}
      {activeTab === 'weekly' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, -7))}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                <ChevronRight className="w-4 h-4" />
                <span>هفته قبل</span>
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(todayIso)}
                className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer min-h-[40px]"
              >
                هفته جاری
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, 7))}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                <span>هفته بعد</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
              مجموع فعالیت‌های این هفته: {toPersianDigits(weeklyPlans.length)} فعالیت
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {weekDays.map((day) => {
              const dayPlans = weeklyPlans
                .filter((p) => p.plan_date === day.isoDate)
                .sort((a, b) => (a.priority_rank ?? 99) - (b.priority_rank ?? 99));

              const totalPred = dayPlans.reduce(
                (acc, p) => acc + Number(p.initial_predicted_minutes || p.predicted_minutes || 0),
                0
              );
              const totalActual = dayPlans.reduce(
                (acc, p) => acc + Number(p.performance?.actual_minutes || 0),
                0
              );

              return (
                <div
                  key={day.isoDate}
                  className={`rounded-3xl border bg-white dark:bg-slate-900 p-5 flex flex-col justify-between transition-all ${
                    day.isToday
                      ? 'border-indigo-500 dark:border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {day.weekdayName}
                          </h3>
                          {day.isToday && (
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                              · امروز
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {day.dayNumberPersian} {day.monthName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openCreateForm(day.isoDate)}
                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title={`افزودن فعالیت برای ${day.fullLabel}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {dayPlans.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
                        برنامه‌ای ثبت نشده
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {dayPlans.map((plan) => {
                          const isStudy = Number(plan.is_study) === 1;
                          const pred = plan.initial_predicted_minutes || plan.predicted_minutes;
                          const act = plan.performance?.actual_minutes;
                          const theme = getSubjectVisualTheme(
                            plan.subject_name_snapshot,
                            plan.category_title_snapshot,
                            isStudy
                          );
                          const MiniIcon = theme.icon;

                          return (
                            <div
                              key={plan.id}
                              onClick={() => setActivePerformancePlan(plan)}
                              className={`p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-colors cursor-pointer ${theme.tintBg}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}
                                  >
                                    <MiniIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                    {isStudy
                                      ? plan.subject_name_snapshot
                                      : plan.category_title_snapshot}
                                  </span>
                                </div>
                                <span
                                  className={`text-[11px] tabular-nums shrink-0 ${getPriorityColorText(
                                    plan.priority_code
                                  )}`}
                                >
                                  {plan.priority_code}
                                </span>
                              </div>
                              {isStudy && plan.unit_title_snapshot && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-1 pr-8">
                                  {plan.unit_title_snapshot}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 tabular-nums">
                                <span>هدف: {toPersianDigits(pred)} د</span>
                                <span className="font-semibold">
                                  {act !== undefined
                                    ? `واقعی: ${toPersianDigits(act)} د (${
                                        plan.status === 'completed' ? '✓' : 'ناقص'
                                      })`
                                    : 'در انتظار'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                    <span>پیش‌بینی: {formatMinutesPersian(totalPred)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      واقعی: {formatMinutesPersian(totalActual)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SMART DYNAMIC PLAN FORM MODAL
      ===================================================================== */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {editingPlan ? 'ویرایش مأموریت برنامه‌ریزی‌شده' : 'افزودن مأموریت جدید به برنامه'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تاریخ: {formatJalaliFull(editingPlan ? editingPlan.plan_date : selectedDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanForm(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePlanFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ۱. عنوان فعالیت
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isSelected = formCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormCategoryId(cat.id)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {cat.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isFormStudyActivity && (
                <div className="space-y-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/50 p-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ۲. نام درس
                    </label>
                    <select
                      value={formSubjectId}
                      onChange={(e) => setFormSubjectId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    >
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name} (پایه {subj.grade_level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ۳. فصل / درس ({selectedSubjectObj?.unit_type_label || 'بخش'} آموزشی کتاب{' '}
                      {selectedSubjectObj?.name || ''})
                    </label>
                    {selectedSubjectObj && selectedSubjectObj.units.length > 0 ? (
                      <select
                        value={formUnitId}
                        onChange={(e) => setFormUnitId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                      >
                        {selectedSubjectObj.units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        برای این درس هنوز فصل یا درسی تعریف نشده است. از منوی «تعریف درس‌ها» فصل‌های آن را اضافه کنید.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ۴. نوع فعالیت درسی
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {studyTypes.map((st) => {
                        const isSelected = formStudyTypeId === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setFormStudyTypeId(st.id)}
                            className={`text-right p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="text-xs font-bold">{st.title}</div>
                            {st.description && (
                              <div
                                className={`text-[10px] mt-0.5 line-clamp-1 ${
                                  isSelected
                                    ? 'text-indigo-100'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {st.description}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFormStudyActivity ? '۵. اولویت انجام فعالیت' : '۲. اولویت انجام فعالیت'} (A1 بالاترین ← C3 پایین‌ترین)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
                  {priorities.map((p) => {
                    const isSelected = formPriorityCode === p.code;
                    return (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setFormPriorityCode(p.code)}
                        title={p.label}
                        className={`py-2 rounded-xl border text-xs font-extrabold tabular-nums transition-all cursor-pointer min-h-[40px] ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {p.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFormStudyActivity
                    ? '۶. زمان پیش‌بینی‌شده (دقیقه)'
                    : '۳. زمان پیش‌بینی‌شده (دقیقه)'}
                </label>
                {editingPlan && editingPlan.performance ? (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                    برای این فعالیت قبلاً عملکرد واقعی ثبت شده است؛ بنابراین زمان پیش‌بینی‌شده اولیه ({formatMinutesPersian(editingPlan.initial_predicted_minutes)}) جهت حفظ صحت مقایسه‌ها قفل شده است.
                  </div>
                ) : (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      required
                      value={formPredictedMinutes}
                      onChange={(e) => setFormPredictedMinutes(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                      placeholder="مثلاً 90"
                    />
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {[15, 20, 30, 45, 60, 75, 90, 120].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormPredictedMinutes(String(m))}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 transition-colors tabular-nums cursor-pointer"
                        >
                          {toPersianDigits(m)} دقیقه
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Smart Study Time Reminder Input */}
              <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span>
                      {isFormStudyActivity
                        ? '۷. ساعت یادآوری شروع مطالعه (اعلان خودکار)'
                        : '۴. ساعت یادآوری فعالیت (اختیاری)'}
                    </span>
                  </label>
                  {formReminderTime && (
                    <button
                      type="button"
                      onClick={() => setFormReminderTime('')}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      حذف یادآور
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <input
                    type="time"
                    value={formReminderTime}
                    onChange={(e) => setFormReminderTime(e.target.value)}
                    className="w-full sm:w-44 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-extrabold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['15:30', '16:30', '17:30', '19:00', '20:30'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormReminderTime(t)}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-colors tabular-nums cursor-pointer ${
                          formReminderTime === t
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                        }`}
                      >
                        ساعت {toPersianDigits(t)}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  در ساعت تعیین‌شده، برنامه به‌صورت خودکار با زنگ هشدار و اعلان هوشمند زمان مطالعه را به شما یادآوری می‌کند.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFormStudyActivity ? '۸. توضیحات تکمیلی (اختیاری)' : '۵. توضیحات تکمیلی (اختیاری)'}
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={
                    isFormStudyActivity
                      ? 'مثلاً: حل تمرین‌های صفحه ۴۵ / مطالعه از کتاب کمک‌آموزشی گاج...'
                      : 'مثلاً: استراحت عصرگاهی / بررسی پیام‌ها...'
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlanForm(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer min-h-[44px]"
                >
                  {formSubmitting
                    ? 'در حال ذخیره...'
                    : editingPlan
                    ? 'ذخیره تغییرات'
                    : 'ثبت در برنامه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PerformanceModal
        plan={activePerformancePlan}
        onClose={() => setActivePerformancePlan(null)}
        onSave={handleSavePerformance}
        onResetPerformance={handleResetPerformance}
      />

      {deletingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              تأیید حذف فعالیت از برنامه
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف فعالیت «
              <strong>
                {Number(deletingPlan.is_study) === 1
                  ? `${deletingPlan.subject_name_snapshot} (${deletingPlan.unit_title_snapshot})`
                  : deletingPlan.category_title_snapshot}
              </strong>
              » مطمئن هستید؟
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingPlan(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer min-h-[40px]"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
