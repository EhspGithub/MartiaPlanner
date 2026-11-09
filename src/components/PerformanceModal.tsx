import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  FileCheck2,
  Award,
  X,
  RotateCcw,
  Smile,
  ThumbsUp,
  Meh,
  Frown,
} from 'lucide-react';
import type { DailyPlanItem, LearningQuality } from '../types.ts';
import { toPersianDigits, formatMinutesPersian } from '../utils/jalali.ts';

interface PerformanceModalProps {
  plan: DailyPlanItem | null;
  onClose: () => void;
  onSave: (
    planId: string,
    payload: {
      actual_minutes: number;
      exercises_count: number | null;
      learning_quality: LearningQuality | null;
      completion_status: 'completed' | 'partial';
      notes: string;
    }
  ) => Promise<void>;
  onResetPerformance: (planId: string) => Promise<void>;
}

const QUALITY_OPTIONS: Array<{
  value: LearningQuality;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  activeClass: string;
}> = [
  {
    value: 'excellent',
    label: 'عالی',
    desc: 'تسلط کامل بر مبحث',
    icon: Smile,
    activeClass:
      'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
  },
  {
    value: 'good',
    label: 'خوب',
    desc: 'یادگیری مناسب',
    icon: ThumbsUp,
    activeClass:
      'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300',
  },
  {
    value: 'average',
    label: 'متوسط',
    desc: 'نیاز به مرور مجدد',
    icon: Meh,
    activeClass:
      'border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
  },
  {
    value: 'weak',
    label: 'ضعیف',
    desc: 'نیاز به رفع اشکال',
    icon: Frown,
    activeClass:
      'border-rose-600 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300',
  },
];

export const PerformanceModal: React.FC<PerformanceModalProps> = ({
  plan,
  onClose,
  onSave,
  onResetPerformance,
}) => {
  const [actualMinutes, setActualMinutes] = useState<string>('');
  const [exercisesCount, setExercisesCount] = useState<string>('0');
  const [learningQuality, setLearningQuality] = useState<LearningQuality>('good');
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'partial'>('completed');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      if (plan.performance) {
        setActualMinutes(String(plan.performance.actual_minutes));
        setExercisesCount(
          plan.performance.exercises_count !== null && plan.performance.exercises_count !== undefined
            ? String(plan.performance.exercises_count)
            : '0'
        );
        setLearningQuality((plan.performance.learning_quality as LearningQuality) || 'good');
        setCompletionStatus(
          plan.performance.completion_status === 'partial' ? 'partial' : 'completed'
        );
        setNotes(plan.performance.notes || '');
      } else {
        setActualMinutes(String(plan.predicted_minutes));
        setExercisesCount('0');
        setLearningQuality('good');
        setCompletionStatus('completed');
        setNotes('');
      }
      setError(null);
    }
  }, [plan]);

  if (!plan) return null;

  const isStudy = Number(plan.is_study) === 1;
  const predictedMins = plan.initial_predicted_minutes || plan.predicted_minutes;
  const currentActualNum = Number(actualMinutes) || 0;
  const diffMins = currentActualNum - predictedMins;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(actualMinutes);
    if (isNaN(mins) || mins < 0 || mins > 720) {
      setError('مدت زمان واقعی باید بین ۰ تا ۷۲۰ دقیقه باشد.');
      return;
    }

    let exCount: number | null = null;
    if (isStudy) {
      exCount = exercisesCount === '' ? 0 : Math.max(0, Number(exercisesCount));
      if (isNaN(exCount)) {
        setError('تعداد تمرین یا تست باید عدد معتبر (۰ یا بیشتر) باشد.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave(plan.id, {
        actual_minutes: mins,
        exercises_count: isStudy ? exCount : null,
        learning_quality: isStudy ? learningQuality : null,
        completion_status: completionStatus,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت عملکرد واقعی');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      setSubmitting(true);
      await onResetPerformance(plan.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در بازنشانی وضعیت عملکرد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Mobile grab handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              ثبت عملکرد واقعی {isStudy ? 'مطالعه درس' : 'فعالیت'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isStudy
                ? `${plan.subject_name_snapshot} · ${plan.unit_title_snapshot} · اولویت ${plan.priority_code}`
                : `${plan.category_title_snapshot} · اولویت ${plan.priority_code}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Predicted vs Actual Comparison Banner */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                زمان پیش‌بینی‌شده اولیه (ثابت در تحلیل)
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
                {formatMinutesPersian(predictedMins, true)}
              </span>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                مقایسه با زمان واردشده
              </span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5 block">
                {diffMins === 0
                  ? 'دقیقاً مطابق پیش‌بینی'
                  : diffMins > 0
                  ? `${toPersianDigits(diffMins)} دقیقه بیشتر از پیش‌بینی`
                  : `${toPersianDigits(Math.abs(diffMins))} دقیقه کمتر از پیش‌بینی`}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* 1. Completion Status (تکمیل‌شده vs ناقص / نیمه‌تمام) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              وضعیت انجام فعالیت
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCompletionStatus('completed')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-4 text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                  completionStatus === 'completed'
                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>تکمیل‌شده (کامل)</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletionStatus('partial')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-4 text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                  completionStatus === 'partial'
                    ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>ناقص (بخشی باقی‌مانده)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              اگر بخشی از مبحث یا فعالیت باقی مانده است، گزینه «ناقص» را انتخاب کنید تا در گزارش‌ها دقیق لحاظ شود.
            </p>
          </div>

          {/* 2. Actual Duration & Exercises (if Study) */}
          <div className={`grid grid-cols-1 ${isStudy ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isStudy ? 'مدت زمان واقعی مطالعه (دقیقه)' : 'مدت زمان واقعی انجام فعالیت (دقیقه)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={720}
                  required
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                  placeholder="مثلاً 75"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[15, 30, 45, 60, 75, 90, 120].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setActualMinutes(String(preset))}
                    className="px-2 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 transition-colors tabular-nums cursor-pointer"
                  >
                    {toPersianDigits(preset)} دقیقه
                  </button>
                ))}
              </div>
            </div>

            {isStudy && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  تعداد تمرین یا تست حل‌شده (امکان ثبت ۰)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    required
                    value={exercisesCount}
                    onChange={(e) => setExercisesCount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none tabular-nums"
                    placeholder="مثلاً 20 یا 0"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[0, 5, 10, 15, 20, 30, 50].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setExercisesCount(String(cnt))}
                      className="px-2 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 transition-colors tabular-nums cursor-pointer"
                    >
                      {toPersianDigits(cnt)} تست/تمرین
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Learning Quality (Only for Study activities) */}
          {isStudy && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                کیفیت یادگیری خود را چگونه ارزیابی می‌کنید؟
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {QUALITY_OPTIONS.map((q) => {
                  const Icon = q.icon;
                  const isSelected = learningQuality === q.value;
                  return (
                    <button
                      key={q.value}
                      type="button"
                      onClick={() => setLearningQuality(q.value)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer min-h-[68px] ${
                        isSelected
                          ? q.activeClass
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-xs font-bold">{q.label}</span>
                      <span className="text-[10px] opacity-80 mt-0.5">{q.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              توضیحات تکمیلی عملکرد (اختیاری)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isStudy
                  ? 'مثلاً: مطالعه از کتاب کمک‌آموزشی گاج انجام شد / بخشی از مبحث باقی ماند...'
                  : 'توضیحات اختیاری درباره نحوه انجام فعالیت...'
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            {plan.performance ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>حذف گزارش عملکرد</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer min-h-[44px]"
              >
                {submitting ? 'در حال ذخیره...' : 'ثبت عملکرد واقعی'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
