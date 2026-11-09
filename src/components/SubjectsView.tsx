import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  X,
  Calculator,
  Atom,
  Feather,
  Languages,
  Globe2,
  Cpu,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';
import type { Subject, SubjectUnit } from '../types.ts';
import { api } from '../services/api.ts';
import { toPersianDigits } from '../utils/jalali.ts';

interface SubjectsViewProps {
  subjects: Subject[];
  onRefreshBootstrap: () => Promise<void>;
}

const GRADE_OPTIONS = ['هفتم', 'هشتم', 'نهم'];
const UNIT_TYPE_OPTIONS = ['درس', 'فصل', 'پودمان', 'بخش'];

function getTextbookVisual(name: string) {
  if (name.includes('ریاضی')) {
    return {
      icon: Calculator,
      iconBg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
    };
  }
  if (name.includes('علوم')) {
    return {
      icon: Atom,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    };
  }
  if (name.includes('فارسی') || name.includes('نگارش')) {
    return {
      icon: Feather,
      iconBg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
    };
  }
  if (name.includes('زبان') || name.includes('عربی')) {
    return {
      icon: Languages,
      iconBg: 'bg-violet-100 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400',
    };
  }
  if (name.includes('مطالعات')) {
    return {
      icon: Globe2,
      iconBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
    };
  }
  if (name.includes('کار و فناوری')) {
    return {
      icon: Cpu,
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
    };
  }
  if (name.includes('پیام') || name.includes('قرآن')) {
    return {
      icon: HeartHandshake,
      iconBg: 'bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
    };
  }
  return {
    icon: BookOpen,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
  };
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  onRefreshBootstrap,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );

  // New Subject Form State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectGrade, setNewSubjectGrade] = useState('هشتم');
  const [newSubjectUnitType, setNewSubjectUnitType] = useState('درس');
  const [newSubjectInitialUnits, setNewSubjectInitialUnits] = useState(
    'درس اول\nدرس دوم\nدرس سوم\nدرس چهارم'
  );
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Subject Inline State
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectGrade, setEditSubjectGrade] = useState('هشتم');
  const [editSubjectUnitType, setEditSubjectUnitType] = useState('درس');

  // Delete Subject Confirmation
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);

  // Unit Management State
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitTitle, setEditUnitTitle] = useState('');
  const [deletingUnit, setDeletingUnit] = useState<SubjectUnit | null>(null);

  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0] || null;

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setSubjectError('نام درس نمی‌تواند خالی باشد.');
      return;
    }

    try {
      setSubmitting(true);
      setSubjectError(null);
      const initialUnits = newSubjectInitialUnits
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const created = await api.createSubject({
        name: newSubjectName.trim(),
        grade_level: newSubjectGrade,
        unit_type_label: newSubjectUnitType,
        color_code: 'indigo',
        initial_units: initialUnits,
      });

      await onRefreshBootstrap();
      setSelectedSubjectId(created.id);
      setShowAddSubjectModal(false);
      setNewSubjectName('');
    } catch (err: any) {
      setSubjectError(err.message || 'خطا در ایجاد درس جدید');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSubjectEdit = async (subjId: string) => {
    if (!editSubjectName.trim()) return;
    try {
      setSubmitting(true);
      await api.updateSubject(subjId, {
        name: editSubjectName.trim(),
        grade_level: editSubjectGrade,
        unit_type_label: editSubjectUnitType,
      });
      setEditingSubjectId(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteSubject = async () => {
    if (!deletingSubject) return;
    try {
      setSubmitting(true);
      await api.deleteSubject(deletingSubject.id);
      setDeletingSubject(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !newUnitTitle.trim()) return;
    try {
      setSubmitting(true);
      await api.createUnit(activeSubject.id, newUnitTitle.trim());
      setNewUnitTitle('');
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUnitEdit = async (unitId: string) => {
    if (!editUnitTitle.trim()) return;
    try {
      setSubmitting(true);
      await api.updateUnit(unitId, { title: editUnitTitle.trim() });
      setEditingUnitId(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteUnit = async () => {
    if (!deletingUnit) return;
    try {
      setSubmitting(true);
      await api.deleteUnit(deletingUnit.id);
      setDeletingUnit(null);
      await onRefreshBootstrap();
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveUnit = async (idx: number, direction: 'up' | 'down') => {
    if (!activeSubject) return;
    const units = [...activeSubject.units];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= units.length) return;

    const temp = units[idx];
    units[idx] = units[targetIdx];
    units[targetIdx] = temp;

    await api.reorderUnits(
      activeSubject.id,
      units.map((u) => u.id)
    );
    await onRefreshBootstrap();
  };

  return (
    <div className="space-y-6">
      {/* Vibrant Header Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-indigo-600 via-indigo-700 to-violet-700 text-white p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>قفسه کتاب‌های درسی متوسطه اول (هفتم، هشتم و نهم)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              تعریف درس‌ها و ساختار آموزشی کتاب‌ها
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90">
              هر کتاب درسی و فصل‌ها، درس‌ها یا پودمان‌های آن را مدیریت کن تا در فرم برنامه‌ریزی روزانه با یک کلیک انتخاب شوند.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewSubjectName('');
              setNewSubjectUnitType('درس');
              setNewSubjectInitialUnits('درس اول\nدرس دوم\nدرس سوم\nدرس چهارم');
              setSubjectError(null);
              setShowAddSubjectModal(true);
            }}
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-indigo-950 hover:bg-indigo-50 transition-colors cursor-pointer self-start sm:self-auto min-h-[42px] shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>افزودن کتاب درسی جدید</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Subjects List (Right) + Active Subject Units (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Subjects List */}
        <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>کتاب‌های درسی من ({toPersianDigits(subjects.length)})</span>
            </h2>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {subjects.map((subj) => {
              const isSelected = activeSubject?.id === subj.id;
              const isEditing = editingSubjectId === subj.id;
              const visual = getTextbookVisual(subj.name);
              const SubjIcon = visual.icon;

              return (
                <div
                  key={subj.id}
                  onClick={() => !isEditing && setSelectedSubjectId(subj.id)}
                  className={`p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editSubjectName}
                        onChange={(e) => setEditSubjectName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        placeholder="نام درس"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={editSubjectGrade}
                          onChange={(e) => setEditSubjectGrade(e.target.value)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>
                              پایه {g}
                            </option>
                          ))}
                        </select>
                        <select
                          value={editSubjectUnitType}
                          onChange={(e) => setEditSubjectUnitType(e.target.value)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          {UNIT_TYPE_OPTIONS.map((ut) => (
                            <option key={ut} value={ut}>
                              ساختار: {ut}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSubjectId(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
                        >
                          انصراف
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveSubjectEdit(subj.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white"
                        >
                          ذخیره
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${visual.iconBg}`}
                        >
                          <SubjIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {subj.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                            پایه {subj.grade_level} · ساختار بر اساس «{subj.unit_type_label}» ·{' '}
                            {toPersianDigits(subj.units.length)} {subj.unit_type_label}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubjectId(subj.id);
                            setEditSubjectName(subj.name);
                            setEditSubjectGrade(subj.grade_level);
                            setEditSubjectUnitType(subj.unit_type_label);
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          title="ویرایش درس"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSubject(subj)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                          title="حذف درس"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Left Column: Units (فصل‌ها / درس‌ها) of Selected Subject */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {activeSubject ? (
            <>
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      ساختار آموزشی کتاب «{activeSubject.name}» ({toPersianDigits(activeSubject.units.length)}{' '}
                      {activeSubject.unit_type_label})
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    عناوین این بخش مستقیماً در فیلد «فصل / درس» فرم برنامه‌ریزی نمایش داده می‌شوند.
                  </p>
                </div>
              </div>

              {/* Quick Add Unit Form */}
              <form
                onSubmit={handleAddUnit}
                className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  placeholder={`افزودن ${activeSubject.unit_type_label} جدید برای ${activeSubject.name} (مثلاً: ${activeSubject.unit_type_label} پنجم...)`}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting || !newUnitTitle.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن {activeSubject.unit_type_label}</span>
                </button>
              </form>

              {/* Units List */}
              {activeSubject.units.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  هنوز هیچ فصل یا درسی برای کتاب «{activeSubject.name}» ثبت نشده است. از کادر بالا اولین عنوان را اضافه کنید.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeSubject.units.map((unit, idx) => {
                    const isEditingUnit = editingUnitId === unit.id;
                    return (
                      <div
                        key={unit.id}
                        className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center tabular-nums shrink-0">
                            {toPersianDigits(idx + 1)}
                          </span>

                          {isEditingUnit ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editUnitTitle}
                                onChange={(e) => setEditUnitTitle(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveUnitEdit(unit.id)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                                title="ذخیره"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingUnitId(null)}
                                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                title="انصراف"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {unit.title}
                            </span>
                          )}
                        </div>

                        {!isEditingUnit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveUnit(idx, 'up')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                              title="انتقال به بالا"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeSubject.units.length - 1}
                              onClick={() => handleMoveUnit(idx, 'down')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                              title="انتقال به پایین"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUnitId(unit.id);
                                setEditUnitTitle(unit.title);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                              title="ویرایش عنوان فصل/درس"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingUnit(unit)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                              title="حذف فصل/درس"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">
              یک درس را از ستون سمت راست انتخاب کنید.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Define New Subject */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تعریف کتاب درسی جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSubjectModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              {subjectError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {subjectError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  نام کتاب درسی
                </label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="مثلاً: تفکر و سبک زندگی / نگارش..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    پایه تحصیلی
                  </label>
                  <select
                    value={newSubjectGrade}
                    onChange={(e) => setNewSubjectGrade(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        پایه {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    واحد تقسیم‌بندی کتاب
                  </label>
                  <select
                    value={newSubjectUnitType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSubjectUnitType(val);
                      setNewSubjectInitialUnits(
                        `${val} اول\n${val} دوم\n${val} سوم\n${val} چهارم`
                      );
                    }}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  >
                    {UNIT_TYPE_OPTIONS.map((ut) => (
                      <option key={ut} value={ut}>
                        بر اساس {ut} (مثلاً {ut} اول)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  عناوین اولیه فصل‌ها / درس‌ها (هر خط یک عنوان)
                </label>
                <textarea
                  rows={4}
                  value={newSubjectInitialUnits}
                  onChange={(e) => setNewSubjectInitialUnits(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  {submitting ? 'در حال ثبت...' : 'ثبت درس و فصل‌ها'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تأیید حذف درس «{deletingSubject.name}»
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف این درس مطمئن هستید؟ (توجه: سوابق و گزارش‌های قبلی شما در روزهای گذشته به دلیل معماری Snapshot دیتابیس بدون هیچ آسیبی حفظ خواهند شد.)
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingSubject(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                حذف درس
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Unit Confirmation Modal */}
      {deletingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تأیید حذف «{deletingUnit.title}»
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              آیا از حذف این عنوان از فهرست کتاب مطمئن هستید؟ (سوابق قبلی برنامه‌ریزی حفظ می‌شوند.)
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setDeletingUnit(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUnit}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                حذف عنوان
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
