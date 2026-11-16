import React, { useState } from 'react';
import {
  Clock,
  FileCheck2,
  Award,
  GraduationCap,
  Gamepad2,
  Trophy,
  Flame,
  ShieldAlert,
  Crown,
  BookOpen,
  Scale,
  TrendingUp,
  ArrowDown,
  ArrowLeft,
  Download,
  Printer,
  Eye,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { toPersianDigits } from '../utils/jalali.ts';

export const MetricsInfographicPoster: React.FC = () => {
  const [showSampleNumbers, setShowSampleNumbers] = useState<boolean>(true);

  const handlePrintPoster = () => {
    window.print();
  };

  const handleDownloadStandalonePoster = () => {
    const posterEl = document.getElementById('martia-metrics-infographic-poster');
    if (!posterEl) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>پوستر اینفوگرافیک جامع شاخص‌ها و فرمول‌های Martia Planner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
  <style>
    body { font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    @media print { body { background: #ffffff; color: #0f172a; padding: 0; } }
  </style>
</head>
<body>
  <div class="max-w-7xl mx-auto">
    ${posterEl.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MartiaPlanner-Metrics-Infographic-Poster.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Poster Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSampleNumbers((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              showSampleNumbers
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>
              {showSampleNumbers
                ? 'نمایش اعداد نمونه یک‌هفته‌ای روی پوستر: روشن'
                : 'نمایش اعداد نمونه یک‌هفته‌ای روی پوستر: خاموش'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadStandalonePoster}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>دانلود فایل پوستر (HTML)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPoster}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-extrabold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ / PDF</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MAIN INFOGRAPHIC POSTER CANVAS
         ===================================================================== */}
      <div
        id="martia-metrics-infographic-poster"
        className="rounded-3xl bg-slate-950 text-slate-100 p-5 sm:p-8 border border-slate-800 shadow-xl space-y-8"
      >
        {/* POSTER HEADER */}
        <div className="border-b border-slate-800 pb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-indigo-400 tracking-wide">
              نقشه معماری محاسبات، وزن‌ها، ضرایب و ارتباط شاخص‌ها در یک نگاه
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
              پوستر اینفوگرافیک جامع شاخص‌ها و فرمول‌های Martia Planner
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              از لحظه ثبت یک فعالیت روزانه تا محاسبه امتیاز نهایی روز (DS)، تراز XP، جریمه وقفه و سطح ۳۹ پله‌ای کل و دروس
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">مؤلفه‌های پایه</div>
              <div className="text-sm font-black text-indigo-400 tabular-nums" dir="ltr">
                T · Q · L · C
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">امتیازهای ترکیبی</div>
              <div className="text-sm font-black text-emerald-400 tabular-nums" dir="ltr">
                E (80%) + C (20%)
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">مقیاس XP</div>
              <div className="text-sm font-black text-amber-400 tabular-nums">
                ۵ منبع + جریمه وقفه
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[11px] text-slate-400">سیستم ارتقا</div>
              <div className="text-sm font-black text-purple-400 tabular-nums">
                ۱۳ سطح × ۳ پله = ۳۹
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            FLOW 1: DAILY & PERIOD SCORE PIPELINE (T, Q, L -> E -> + C -> DS)
           ===================================================================== */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                ۱
              </span>
              <span>مسیر اول: مهندسی امتیاز عملکرد روزانه (DS) و میانگین دوره</span>
            </h3>
            <span className="text-xs text-slate-400">
              ورودی‌های درسی چطور با وزن‌های ۴۰٪، ۳۰٪ و ۳۰٪ ترکیب شده و با ضریب کنترل سرگرمی (۲۰٪) امتیاز نهایی روز را می‌سازند؟
            </span>
          </div>

          {/* Step 1: 3 Educational Pillars + 1 Restricted Pillar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Pillar 1: Study Time T */}
            <div className="rounded-2xl bg-slate-900 border border-indigo-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-400">۱. تحقق زمان مطالعه (T)</span>
                  <span className="text-xs font-mono font-black text-indigo-300" dir="ltr">
                    وزن در E: 40%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  نسبت زمان واقعی مطالعه به پیش‌بینی اولیه (با سقف ۱۰۰٪)
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  T = min(100, round((t_actual / t_init_pred) × 100))
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-indigo-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">مثال شنبه ۱۶ آبان:</div>
                  <div>واقعی ۲۱۰ دقیقه ÷ پیش‌بینی ۲۱۰ دقیقه = ۱۰۰٪</div>
                </div>
              )}
            </div>

            {/* Pillar 2: Exercises Q */}
            <div className="rounded-2xl bg-slate-900 border border-sky-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-400">۲. تحقق تست و تمرین (Q)</span>
                  <span className="text-xs font-mono font-black text-sky-300" dir="ltr">
                    وزن در E: 30%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  نسبت تست حل‌شده به تست هدف (در روز بدون تست: حذف خودکار از مخرج)
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  Q = target &gt; 0 ? min(100, round((ex_act / ex_target) × 100)) : null
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-sky-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">مثال شنبه ۱۶ آبان:</div>
                  <div>۴۷ تست واقعی ÷ ۴۵ تست هدف = ۱۰۴٪ ← سقف ۱۰۰٪</div>
                </div>
              )}
            </div>

            {/* Pillar 3: Weighted Learning Quality L */}
            <div className="rounded-2xl bg-slate-900 border border-purple-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-400">۳. کیفیت یادگیری وزنی (L)</span>
                  <span className="text-xs font-mono font-black text-purple-300" dir="ltr">
                    وزن در E: 30%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  میانگین وزنی کیفیت (۰ تا ۱۰) بر اساس دقایق مطالعه واقعی هر درس × ۱۰
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  Q_w = Σ(q_i × t_i) / Σ(t_i) , L = round(Q_w × 10)
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-purple-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">مثال شنبه ۱۶ آبان:</div>
                  <div>۱۷۹۲.۵ ÷ ۲۱۰ دقیقه = ۸.۵ از ۱۰ ← شاخص L = ۸۵٪</div>
                </div>
              )}
            </div>

            {/* Pillar 4: Restricted Activities Control C */}
            <div className="rounded-2xl bg-slate-900 border border-amber-500/40 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400">۴. کنترل سرگرمی‌ها (C)</span>
                  <span className="text-xs font-mono font-black text-amber-300" dir="ltr">
                    وزن در DS: 20%
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  رعایت سقف مجاز فعالیت‌های محدودشونده (موبایل، بازی، وب‌گردی)
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800"
                >
                  C_i = min(100, round((allowed / actual) × 100))
                </div>
              </div>
              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-200 space-y-0.5 tabular-nums">
                  <div className="font-bold text-slate-400">شنبه ۱۶ آبان در برابر سه‌شنبه ۱۹ آبان:</div>
                  <div>شنبه (۴۵ از ۶۰ دقیقه) ← ۱۰۰٪ | سه‌شنبه (۱۲۰ از ۶۰ دقیقه) ← ۵۰٪</div>
                </div>
              )}
            </div>
          </div>

          {/* Downward Connectors */}
          <div className="flex justify-center py-1">
            <ArrowDown className="w-6 h-6 text-indigo-400" />
          </div>

          {/* Step 2: E -> DS -> Period Average */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            {/* Box A: Direct Educational Score E */}
            <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-indigo-300">
                  امتیاز مستقیم آموزشی روز (E)
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400" dir="ltr">
                  وزن در DS: 80%
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-emerald-300 border border-slate-800 space-y-1"
              >
                <div>با هدف تست: E = 0.40×T + 0.30×Q + 0.30×L</div>
                <div className="text-amber-300">
                  بدون هدف تست: E = (0.40×T + 0.30×L) ÷ 0.70
                </div>
                <div className="text-[11px] text-slate-400">
                  (معادل 57.1% وزن برای زمان T و 42.9% برای کیفیت L)
                </div>
              </div>
              {showSampleNumbers && (
                <div className="text-xs text-indigo-200 tabular-nums">
                  شنبه ۱۶ آبان: (۱۰۰×۰.۴) + (۱۰۰×۰.۳) + (۸۵×۰.۳) = <strong>۹۶٪</strong>
                </div>
              )}
            </div>

            {/* Box B: Final Daily Score DS */}
            <div className="rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-emerald-300">
                  امتیاز نهایی عملکرد روزانه (DS / S)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400" dir="ltr">
                  0 .. 100%
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-emerald-300 border border-slate-800 space-y-1"
              >
                <div>DS = round((E × 0.80) + (C × 0.20))</div>
                <div className="text-[11px] text-slate-400">
                  اگر سرگرمی ثبت نشود (C = null) ← DS = E
                </div>
              </div>
              {showSampleNumbers && (
                <div className="text-xs text-emerald-200 tabular-nums">
                  شنبه ۱۶ آبان: (۹۶ × ۰.۸۰) + (۱۰۰ × ۰.۲۰) = ۷۶.۸ + ۲۰ = <strong>۹۷٪</strong>
                </div>
              )}
            </div>

            {/* Box C: Period Aggregation */}
            <div className="rounded-2xl bg-purple-950/40 border border-purple-500/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-purple-300">
                  امتیاز عملکرد کلی دوره (هفتگی / ماهانه)
                </span>
                <span className="text-xs font-mono font-bold text-purple-400" dir="ltr">
                  Period Summary
                </span>
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-emerald-300 border border-slate-800 space-y-1"
              >
                <div>Period_DS = round(Σ(DS_i) / ValidDays)</div>
                <div>Period_Qw = Σ(q_i × t_i) / Σ(t_i) (کل دوره)</div>
              </div>
              {showSampleNumbers && (
                <div className="text-xs text-purple-200 tabular-nums">
                  میانگین ۷ روز هفته نمونه (۱۶ تا ۲۲ آبان): <strong>۸۳٪</strong> | کیفیت وزنی کل هفته: <strong>۸.۴ از ۱۰</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            FLOW 2: GLOBAL XP LEDGER (+XP, -XP PENALTY & 39-STAGE GLOBAL LEVEL)
           ===================================================================== */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-600 text-white text-xs font-black flex items-center justify-center">
                ۲
              </span>
              <span>مسیر دوم: موتور ترازنامه XP کل (+XP مثبت، جریمه -XP و سطح کل ۳۹ پله‌ای)</span>
            </h3>
            <span className="text-xs text-slate-400">
              ۵ منبع پاداش روزانه منهای جریمه روزهای وقفه درسی، جایگاه دانش‌آموز را در ۳۹ پله سراسری تعیین می‌کند
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 5 Positive XP Sources (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-emerald-500/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-emerald-400">
                  الف) ۵ منبع کسب XP مثبت روزانه (+XP Gross)
                </span>
                <span className="text-xs font-mono text-emerald-300" dir="ltr">
                  مقیاس ۱/۱۰
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <span>۱. هر فعالیت تکمیل‌شده (Completed)</span>
                  <span className="font-mono font-black text-emerald-400" dir="ltr">
                    count × 5.0 XP
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <span>۲. هر فعالیت ناقص (Partial)</span>
                  <span className="font-mono font-black text-emerald-400" dir="ltr">
                    count × 2.5 XP
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <span>۳. زمان مطالعه واقعی درسی</span>
                  <span className="font-mono font-black text-emerald-400" dir="ltr">
                    minutes ÷ 50 (0.02/min)
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <span>۴. هر تست / تمرین حل‌شده</span>
                  <span className="font-mono font-black text-emerald-400" dir="ltr">
                    exercises × 0.2 XP
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <span>۵. پاداش کیفیت هر جلسه مطالعه</span>
                  <span className="font-mono font-black text-emerald-400" dir="ltr">
                    Σ (quality_0_10 × 0.2)
                  </span>
                </div>
              </div>

              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-xs text-emerald-200 tabular-nums">
                  جمع کل XP مثبت هفته نمونه (۱۶ تا ۲۲ آبان): <strong>+۲۶۲.۴ XP</strong>
                </div>
              )}
            </div>

            {/* Negative XP Penalty Engine (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-rose-500/40 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-rose-400">
                    ب) فرمول جریمه عدم فعالیت (-XP Penalty)
                  </span>
                  <span className="text-xs font-mono text-rose-300" dir="ltr">
                    P_d = B × r_d × M_d
                  </span>
                </div>

                <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1.5 leading-6">
                  <div className="text-amber-300 font-bold">
                    شرط معافیت روزانه (روز فعال مؤثر):
                  </div>
                  <div>
                    اگر <code dir="ltr">Fulfillment = 0.6×TimeRatio + 0.4×TaskRatio ≥ 0.50</code>{' '}
                    <strong>یا</strong> حداقل ۳۰ دقیقه مطالعه با کیفیت ≥ ۴ ثبت شود ←{' '}
                    <span className="text-emerald-400 font-bold">جریمه = ۰</span>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1 leading-6">
                  <div>
                    <strong className="text-rose-300">B (پایه جریمه):</strong> ۱۰٪ میانگین XP روزهای فعال قبلی (حداقل ۱ و حداکثر ۱۰ XP)
                  </div>
                  <div>
                    <strong className="text-rose-300">r_d (ضریب تکرار وقفه):</strong> روز اول ۱.۰× | روز دوم ۱.۵× | روز سوم ۲.۰× ... تا سقف ۴.۰×
                  </div>
                  <div>
                    <strong className="text-rose-300">M_d (نسبت انجام‌نشده):</strong>{' '}
                    <code dir="ltr">1 - FulfillmentRatio</code>
                  </div>
                </div>
              </div>

              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-xs text-rose-200 tabular-nums">
                  سه‌شنبه ۱۹ آبان (تحقق ۱۵٪): ۴.۲۷ × ۱.۰ × ۰.۸۵ = <strong>-۳.۶۳ XP کسر شد</strong>
                </div>
              )}
            </div>

            {/* Net Global XP & 39-Stage Global Level (3 cols) */}
            <div className="lg:col-span-3 rounded-2xl bg-gradient-to-b from-amber-950/50 to-slate-900 border border-amber-500/50 p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="text-sm font-black text-amber-300">
                  ج) تراز خالص و سطح کل (۳۹ پله)
                </div>
                <div
                  dir="ltr"
                  className="bg-slate-950 rounded-xl p-2.5 font-mono text-xs text-amber-300 border border-slate-800"
                >
                  XP_net = max(0, XP_gross - Σ P_d)
                </div>

                <div className="text-[11px] text-slate-300 space-y-1.5 leading-5">
                  <div className="font-bold text-white">جدول آستانه‌های ۳۹ پله کل (۰ تا ۱۵,۰۰۰ XP):</div>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-slate-300" dir="ltr">
                    <div>#1 Stone: 0</div>
                    <div>#2 Stone+: 20</div>
                    <div>#3 Stone★: 45</div>
                    <div>#4 Iron: 80</div>
                    <div>#5 Iron+: 125</div>
                    <div>#6 Iron★: 180</div>
                    <div>#7 Bronze: 250</div>
                    <div>#8 Bronze+: 335</div>
                    <div>...</div>
                    <div>#39 BlackDia★: 15000</div>
                  </div>
                </div>
              </div>

              {showSampleNumbers && (
                <div className="pt-2 border-t border-slate-800 text-xs text-amber-200 tabular-nums space-y-1">
                  <div>
                    XP خالص هفته نمونه: ۲۶۲.۴ - ۳.۶۳ = <strong>۲۵۸.۷۷ XP</strong>
                  </div>
                  <div className="text-emerald-300 font-bold">
                    سطح فعلی: پله ۷ از ۳۹ (برنز — Bronze)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            FLOW 3: INDEPENDENT SUBJECT XP, MULTIPLIER & 39-STAGE SUBJECT LEVEL
           ===================================================================== */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                ۳
              </span>
              <span>مسیر سوم: فرمول مستقل XP، ضریب اثربخشی و سطح ۳۹ پله‌ای اختصاصی هر درس</span>
            </h3>
            <span className="text-xs text-slate-400">
              هر درس (ریاضی، علوم و...) یک حساب XP و سطح کاملاً ایزوله دارد که کیفیت مطالعه مستقیماً ضریب XP آن را تغییر می‌دهد
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {/* Step 1: Raw Effort XP */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
              <div className="text-xs font-black text-emerald-400">
                ۱. تلاش خام درس (Raw Effort XP)
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800 leading-5"
              >
                Raw = (Comp×5) + (Part×2.5) + (Mins÷50) + (Ex×0.2) + Σ(q×0.2) + (ActiveDays×1.0)
              </div>
              <p className="text-[11px] text-slate-400">
                علاوه بر ۵ منبع پایه، هر روز مطالعه مؤثر درس ۱ امتیاز استمرار به تلاش خام آن درس اضافه می‌کند.
              </p>
            </div>

            {/* Step 2: Mastery & Effectiveness Multiplier */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
              <div className="text-xs font-black text-cyan-400">
                ۲. ضریب اثربخشی درس (Effectiveness Multiplier)
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-cyan-300 border border-slate-800 leading-5"
              >
                Mastery = 0.45×(Qw/10) + 0.35×(E_s/100) + 0.10×TaskRatio + 0.10×min(1, Days/25)
                <br />
                Mult = 0.28 + (0.97 × Mastery)
              </div>
              <p className="text-[11px] text-slate-400">
                بازه ضریب: از <code dir="ltr">0.28x</code> تا <code dir="ltr">1.25x</code> (اگر کیفیت درس زیر ۴ باشد، ضریب ۳۵٪ کاهش می‌یابد: <code dir="ltr">×0.65</code>).
              </p>
            </div>

            {/* Step 3: Subject Net XP & Missed Session Penalty */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
              <div className="text-xs font-black text-rose-400">
                ۳. کسر جریمه نوبت معوقه و XP خالص درس
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-rose-300 border border-slate-800 leading-5"
              >
                Gross_s = Raw × Mult
                <br />
                Pen_s = B_s × r_s × M_s
                <br />
                Net_s = max(0, Gross_s - Pen_s)
              </div>
              <p className="text-[11px] text-slate-400">
                پایه جریمه درس <code dir="ltr">B_s = 12%</code> میانگین جلسات فعال درس (۰.۶ تا ۴.۵ XP) با ضریب تکرار <code dir="ltr">1.0x .. 2.5x</code>.
              </p>
            </div>

            {/* Step 4: Subject 39 Stages & 4 Continuity States */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
              <div className="text-xs font-black text-purple-400">
                ۴. جدول ۳۹ پله‌ای درس (۰ تا ۲,۰۰۰ XP) و ۴ وضعیت استمرار
              </div>
              <div
                dir="ltr"
                className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-purple-300 border border-slate-800 leading-5"
              >
                Thresholds: 0, 6, 13, 21, 30, 41, 54, 69, 86 ... 2000 XP
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                <span className="text-emerald-400 font-bold">● وضعیت عادی (۰ معوقه)</span>
                <span className="text-amber-400 font-bold">▲ نیازمند توجه (۱ معوقه)</span>
                <span className="text-orange-400 font-bold">▲ هشدار جدی (۲ معوقه)</span>
                <span className="text-rose-400 font-bold">■ استمرار ضعیف (≥۳ معوقه)</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            FLOW 4: DAILY TIME BUDGET, VELOCITY & ANTI-CHEAT RULES
           ===================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          {/* Card 1: Daily Time Budget B_day */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="text-xs sm:text-sm font-black text-teal-400">
              ۴-الف) ظرف زمانی روزانه (B_day) و سهم مطالعه
            </div>
            <div
              dir="ltr"
              className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-teal-300 border border-slate-800"
            >
              StudyShare% = round((actualStudy / B_day) × 100, 1)
              <br />
              FreeTime = max(0, B_day - (Study + Restricted + Essential))
            </div>
            <p className="text-xs text-slate-400 leading-6">
              فعالیت‌های روز به ۳ گروه <strong>آموزشی</strong>، <strong>محدودشونده (سرگرمی)</strong> و <strong>ضروری (ورزش/استراحت بدون نمره منفی)</strong> تقسیم شده و سهم هر یک از کل ظرف روز محاسبه می‌شود.
            </p>
          </div>

          {/* Card 2: XP Velocity & Alignment */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="text-xs sm:text-sm font-black text-cyan-400">
              ۴-ب) سرعت کسب XP و هم‌راستایی با رشد واقعی
            </div>
            <div
              dir="ltr"
              className="bg-slate-950 rounded-xl p-2.5 font-mono text-[11px] text-cyan-300 border border-slate-800"
            >
              Rate_7d = NetXP_7d ÷ 7
              <br />
              EstDaysToNextStage = ceil(XP_remaining ÷ Rate_7d)
            </div>
            <p className="text-xs text-slate-400 leading-6">
              اگر XP بالا برود اما میانگین امتیاز آموزشی هفتگی (<code dir="ltr">E_avg &lt; 60</code>) یا کیفیت (<code dir="ltr">Q_w &lt; 5.5</code>) پایین باشد، سیستم هشدار <strong>«XP صوری / سطحی»</strong> صادر می‌کند.
            </p>
          </div>

          {/* Card 3: Golden Rules & Anti-Cheat */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
            <div className="text-xs sm:text-sm font-black text-amber-400">
              ۴-ج) قوانین طلایی حفاظت از دقت محاسبات
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 leading-6 list-disc list-inside">
              <li>
                <strong>قفل پیش‌بینی اولیه (<code dir="ltr">initial_predicted_minutes</code>):</strong> ویرایش بعدی زمان پیش‌بینی، مخرج فرمول پایبندی را تغییر نمی‌دهد.
              </li>
              <li>
                <strong>جداسازی نسبت زمان کارت از تکمیل:</strong> نسبت زمان واقعی به پیش‌بینی روی هر کارت می‌تواند از ۱۰۰٪ عبور کند (مثلاً ۱۱۷٪)، اما شاخص <code dir="ltr">T</code> روزانه در ۱۰۰٪ سقف دارد.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
