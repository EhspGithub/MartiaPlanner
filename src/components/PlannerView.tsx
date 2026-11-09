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

interface PlannerViewProps {
  categories: ActivityCategory[];
  studyTypes: StudyActivityType[];
  priorities: PriorityLevel[];
  subjects: Subject[];
  onDataMutated: () => void;
}

const QUALITY_LABELS: Record<string, string> = {
  excellent: 'کیفیت عالی',
  good: 'کیفیت خوب',
  average: 'کیفیت متوسط',
  weak: 'نیازمند مرور',
};

function getPriorityColorText(code: string): string {
  if (code.startsWith('A')) return 'text-rose-600 dark:text-rose-400 font-bold';
  if (code.startsWith('B')) return 'text-amber-600 dark:text-amber-400 font-bold';
  return 'text-sky-600 dark:text-sky-400 font-bold';
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

  // Top-level mode: 'today' | 'tomorrow' | 'custom_day' | 'weekly'
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'weekly'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [weekRefDate, setWeekRefDate] = useState<string>(todayIso);

  // Sorting mode: 'priority' (A1..C3) or 'custom' (manual drag/up-down order)
  const [sortBy, setSortBy] = useState<'priority' | 'custom'>('priority');

  // Plans state
  const [dailyPlans, setDailyPlans] = useState<DailyPlanItem[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<DailyPlanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State (Create or Edit Plan)
  const [showPlanForm, setShowPlanForm] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<DailyPlanItem | null>(null);

  const defaultStudyCategory = categories.find((c) => Number(c.is_study) === 1) || categories[0];
  const [formCategoryId, setFormCategoryId] = useState<string>(defaultStudyCategory?.id || '');
  const [formSubjectId, setFormSubjectId] = useState<string>(subjects[0]?.id || '');
  const [formUnitId, setFormUnitId] = useState<string>(subjects[0]?.units[0]?.id || '');
  const [formStudyTypeId, setFormStudyTypeId] = useState<string>(studyTypes[0]?.id || '');
  const [formPriorityCode, setFormPriorityCode] = useState<string>('A1');
  const [formPredictedMinutes, setFormPredictedMinutes] = useState<string>('60');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Performance Modal State
  const [activePerformancePlan, setActivePerformancePlan] = useState<DailyPlanItem | null>(null);

  // Delete Confirmation Modal State
  const [deletingPlan, setDeletingPlan] = useState<DailyPlanItem | null>(null);

  // Sync selectedDate when switching between Today and Tomorrow tabs
  useEffect(() => {
    if (activeTab === 'today') {
      setSelectedDate(todayIso);
    } else if (activeTab === 'tomorrow') {
      setSelectedDate(tomorrowIso);
    }
  }, [activeTab, todayIso, tomorrowIso]);

  // Update available units whenever formSubjectId changes
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

  // Fetch daily plans
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

  // Fetch weekly plans
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

  // Summary metrics for the currently displayed day
  const daySummary = useMemo(() => {
    let predTotal = 0;
    let actualTotal = 0;
    let completedCount = 0;
    for (const p of dailyPlans) {
      predTotal += Number(p.initial_predicted_minutes || p.predicted_minutes || 0);
      if (p.performance) {
        actualTotal += Number(p.performance.actual_minutes || 0);
      }
      if (p.status === 'completed') completedCount++;
    }
    return { predTotal, actualTotal, completedCount, totalCount: dailyPlans.length };
  }, [dailyPlans]);

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Switcher (برنامه امروز | برنامه فردا | نمای هفتگی) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            برنامه‌ریزی و ثبت عملکرد واقعی
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'weekly'
              ? `نمای هفتگی از ${weekDays[0].fullLabel} تا ${weekDays[6].fullLabel}`
              : `نمایش و مدیریت برنامه روز: ${formatJalaliFull(selectedDate)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Tabs: برنامه امروز / برنامه فردا / برنامه هفتگی */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                activeTab === 'today' && selectedDate === todayIso
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              برنامه امروز ({formatJalaliCompact(todayIso)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tomorrow')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                activeTab === 'tomorrow' && selectedDate === tomorrowIso
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              برنامه فردا ({formatJalaliCompact(tomorrowIso)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                activeTab === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              نمای هفتگی
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateForm()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن فعالیت جدید</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          DAILY VIEW (برنامه امروز / برنامه فردا / روز انتخابی)
      ===================================================================== */}
      {activeTab !== 'weekly' && (
        <div className="space-y-5">
          {/* Day Navigation & Sorting Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="روز قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="px-3">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">
                  {formatJalaliFull(selectedDate)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {selectedDate === todayIso
                    ? 'امروز'
                    : selectedDate === tomorrowIso
                    ? 'فردا'
                    : selectedDate === addDaysISO(todayIso, -1)
                    ? 'دیروز'
                    : 'تاریخ انتخابی'}
                  {' · '}
                  پیش‌بینی کل: {formatMinutesPersian(daySummary.predTotal)}
                  {' · '}
                  واقعی کل: {formatMinutesPersian(daySummary.actualTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="روز بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5" />
                مرتب‌سازی:
              </span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSortBy('priority')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    sortBy === 'priority'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  بر اساس اولویت (A1 تا C3)
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('custom')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    sortBy === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ترتیب دستی دانش‌آموز
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
                />
              ))}
            </div>
          ) : sortedDailyPlans.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                هنوز فعالیتی برای {formatJalaliFull(selectedDate)} ثبت نشده است
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                می‌توانید درس‌های تدریس‌شده امروز در مدرسه، تکالیف، امتحانات و فعالیت‌های غیردرسی (استراحت، گوشی و...) را به همراه زمان پیش‌بینی‌شده ثبت کنید.
              </p>
              <button
                type="button"
                onClick={() => openCreateForm()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت اولین فعالیت این روز</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedDailyPlans.map((plan, index) => {
                const isStudy = Number(plan.is_study) === 1;
                const predMins = plan.initial_predicted_minutes || plan.predicted_minutes;
                const actualMins = plan.performance?.actual_minutes;
                const hasPerf = Boolean(plan.performance);
                const diff = hasPerf && actualMins !== undefined ? actualMins - predMins : null;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setActivePerformancePlan(plan)}
                    className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Title + Unboxed Metadata Line (Section 7.1: فارسی | درس دوم | A1 | 90 دقیقه) */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isStudy
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                            }`}
                          >
                            {isStudy ? (
                              <BookOpen className="w-5 h-5" />
                            ) : (
                              <Coffee className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                              {isStudy
                                ? `${plan.subject_name_snapshot}`
                                : plan.category_title_snapshot}
                            </h3>
                            {/* Clean unboxed metadata with typographic separators */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                              {isStudy && plan.unit_title_snapshot && (
                                <>
                                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                                    {plan.unit_title_snapshot}
                                  </span>
                                  <span aria-hidden="true">|</span>
                                </>
                              )}
                              {isStudy && plan.study_type_title_snapshot && (
                                <>
                                  <span>{plan.study_type_title_snapshot}</span>
                                  <span aria-hidden="true">|</span>
                                </>
                              )}
                              <span className={getPriorityColorText(plan.priority_code)}>
                                اولویت {plan.priority_code}
                              </span>
                              <span aria-hidden="true">|</span>
                              <span>پیش‌بینی: {formatMinutesPersian(predMins)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Edit / Delete / Reorder Controls (Stop propagation so card click opens Performance Modal) */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                            title="جابه‌جایی به بالا"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(index, 'down')}
                            disabled={index === sortedDailyPlans.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                            title="جابه‌جایی به پایین"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
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
                        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {/* Performance Status Footer on Card (Section 7.3) */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      {!hasPerf ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>انجام‌نشده (در انتظار ثبت عملکرد)</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                          {plan.status === 'completed' ? (
                            <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تکمیل‌شده
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              ناقص (نیمه‌تمام)
                            </span>
                          )}
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span className="text-slate-700 dark:text-slate-200 font-medium">
                            زمان واقعی: {formatMinutesPersian(actualMins || 0)}
                          </span>
                          {diff !== null && (
                            <>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                ·
                              </span>
                              <span
                                className={
                                  diff === 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : diff > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-indigo-600 dark:text-indigo-400'
                                }
                              >
                                {diff === 0
                                  ? 'منطبق با پیش‌بینی'
                                  : diff > 0
                                  ? `${toPersianDigits(diff)}+ دقیقه`
                                  : `${toPersianDigits(Math.abs(diff))}- دقیقه`}
                              </span>
                            </>
                          )}
                          {isStudy && plan.performance?.exercises_count !== null && (
                            <>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                ·
                              </span>
                              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <FileCheck2 className="w-3 h-3" />
                                {toPersianDigits(plan.performance?.exercises_count)} تمرین/تست
                              </span>
                            </>
                          )}
                          {isStudy && plan.performance?.learning_quality && (
                            <>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                ·
                              </span>
                              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {QUALITY_LABELS[plan.performance.learning_quality]}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline whitespace-nowrap">
                        {hasPerf ? 'ویرایش عملکرد ←' : 'ثبت عملکرد واقعی ←'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          WEEKLY VIEW (نمای هفتگی ۷ روزه - شنبه تا جمعه، سازگار با موبایل و لپ‌تاپ)
      ===================================================================== */}
      {activeTab === 'weekly' && (
        <div className="space-y-5">
          {/* Week Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, -7))}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                <ChevronRight className="w-4 h-4" />
                <span>هفته قبل</span>
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(todayIso)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer min-h-[40px]"
              >
                بازگشت به هفته جاری
              </button>
              <button
                type="button"
                onClick={() => setWeekRefDate(addDaysISO(weekRefDate, 7))}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                <span>هفته بعد</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              کل فعالیت‌های ثبت‌شده این هفته: {toPersianDigits(weeklyPlans.length)} مورد
            </div>
          </div>

          {/* 7-Day Vertical/Grid Cards (Mobile friendly vertical cards, Desktop 2-col or 3-col layout) */}
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
                  className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 flex flex-col justify-between ${
                    day.isToday
                      ? 'border-indigo-500 dark:border-indigo-500'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Day Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {day.weekdayName}
                          </h3>
                          {day.isToday && (
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
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
                        className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                        title={`افزودن فعالیت برای ${day.fullLabel}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Day Activities List */}
                    {dayPlans.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                        فعالیتی ثبت نشده است
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {dayPlans.map((plan) => {
                          const isStudy = Number(plan.is_study) === 1;
                          const pred = plan.initial_predicted_minutes || plan.predicted_minutes;
                          const act = plan.performance?.actual_minutes;
                          return (
                            <div
                              key={plan.id}
                              onClick={() => setActivePerformancePlan(plan)}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {isStudy
                                    ? plan.subject_name_snapshot
                                    : plan.category_title_snapshot}
                                </span>
                                <span
                                  className={`text-[11px] tabular-nums shrink-0 ${getPriorityColorText(
                                    plan.priority_code
                                  )}`}
                                >
                                  {plan.priority_code}
                                </span>
                              </div>
                              {isStudy && plan.unit_title_snapshot && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {plan.unit_title_snapshot}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50 tabular-nums">
                                <span>پیش‌بینی: {toPersianDigits(pred)} د</span>
                                <span>
                                  {act !== undefined
                                    ? `واقعی: ${toPersianDigits(act)} د (${
                                        plan.status === 'completed' ? 'کامل' : 'ناقص'
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

                  {/* Day Footer Totals */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>پیش‌بینی: {formatMinutesPersian(totalPred)}</span>
                    <span>واقعی: {formatMinutesPersian(totalActual)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SMART DYNAMIC PLAN FORM MODAL (Section 5.1 Field Visibility Logic)
      ===================================================================== */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingPlan ? 'ویرایش فعالیت برنامه‌ریزی‌شده' : 'ثبت فعالیت جدید در برنامه'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تاریخ: {formatJalaliFull(editingPlan ? editingPlan.plan_date : selectedDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanForm(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
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

              {/* 1. عنوان فعالیت (درس، استراحت، استفاده از گوشی، تماشای تلویزیون، بازی و...) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[42px] ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {cat.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC FIELDS: ONLY SHOWN WHEN ACTIVITY IS "درس" (is_study === 1) */}
              {isFormStudyActivity && (
                <div className="space-y-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4">
                  {/* 2. نام درس */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ۲. نام درس
                    </label>
                    <select
                      value={formSubjectId}
                      onChange={(e) => setFormSubjectId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                    >
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name} (پایه {subj.grade_level})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. فصل / درس (Single unified field dynamically populated from Subject's units) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ۳. فصل / درس ({selectedSubjectObj?.unit_type_label || 'بخش'} آموزشی کتاب{' '}
                      {selectedSubjectObj?.name || ''})
                    </label>
                    {selectedSubjectObj && selectedSubjectObj.units.length > 0 ? (
                      <select
                        value={formUnitId}
                        onChange={(e) => setFormUnitId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
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

                  {/* 4. نوع فعالیت درسی (تکلیف، امتحان، بدون فعالیت، پس‌خوانی) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                                ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="text-xs font-bold">{st.title}</div>
                            {st.description && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
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

              {/* 5. اولویت (A1 تا C3) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                        className={`py-2 rounded-xl border text-xs font-bold tabular-nums transition-all cursor-pointer min-h-[40px] ${
                          isSelected
                            ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {p.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. پیش‌بینی زمان انجام فعالیت (دقیقه) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFormStudyActivity
                    ? '۶. زمان پیش‌بینی‌شده (دقیقه)'
                    : '۳. زمان پیش‌بینی‌شده (دقیقه)'}
                </label>
                {editingPlan && editingPlan.performance ? (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                    برای این فعالیت قبلاً عملکرد واقعی ثبت شده است؛ بنابراین طبق قوانین تحلیلی سیستم، زمان پیش‌بینی‌شده اولیه ({formatMinutesPersian(editingPlan.initial_predicted_minutes)}) جهت حفظ صحت مقایسه‌ها قفل شده است.
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
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                      placeholder="مثلاً 90"
                    />
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {[15, 20, 30, 45, 60, 75, 90, 120].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormPredictedMinutes(String(m))}
                          className="px-2.5 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 transition-colors tabular-nums cursor-pointer"
                        >
                          {toPersianDigits(m)} دقیقه
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 7. توضیحات (اختیاری) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isFormStudyActivity ? '۷. توضیحات تکمیلی (اختیاری)' : '۴. توضیحات تکمیلی (اختیاری)'}
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
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer min-h-[44px]"
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

      {/* Performance Logging Modal */}
      <PerformanceModal
        plan={activePerformancePlan}
        onClose={() => setActivePerformancePlan(null)}
        onSave={handleSavePerformance}
        onResetPerformance={handleResetPerformance}
      />

      {/* Delete Confirmation Modal (Section 12 requirement: برای حذف اطلاعات مهم، تأییدیه نمایش داده شود) */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
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
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[40px]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer min-h-[40px]"
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
